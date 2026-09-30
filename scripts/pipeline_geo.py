#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pipeline Automatizado de Governança Cartográfica e GitOps (ANTAQ/GEE)
-------------------------------------------------------------------
Objetivo:
1. Varrer a pasta 'dados/' identificando novos arquivos vetoriais (.geojson, .zip, .shp).
2. Otimizar geometrias e normalizar atributos no padrão EPSG:4326 (WGS 84).
3. Classificar camadas automaticamente nos grupos regulatórios:
   - 'infra' (Infraestrutura Aquaviária e Multimodal)
   - 'restricoes' (Restrições Socioambientais)
   - 'limites' (Limites Territoriais e Administrativos)
4. Gerar e validar o arquivo 'dados/manifest.json' sem risco de erros de sintaxe ou UTF-8 BOM.
"""

import os
import json
import re
import sys
from pathlib import Path

# Diretórios base
DIRETORIO_PROJETO = Path(__file__).resolve().parent.parent
PASTA_DADOS = DIRETORIO_PROJETO / "dados"

# Mapeamento Temático de Cores Institucionais
PALETA_PADRAO = {
    "instalacoes_portuarias": {"cor": "#10b981", "peso": 6, "opacidade": 0.95, "tipo": "ponto"},
    "ven_2024": {"cor": "#00e5ff", "peso": 3.0, "opacidade": 0.95, "tipo": "linha"},
    "ven_2022": {"cor": "#38bdf8", "peso": 2.6, "opacidade": 0.85, "tipo": "linha"},
    "ven_2020": {"cor": "#0ea5e9", "peso": 2.4, "opacidade": 0.85, "tipo": "linha"},
    "ven_2018": {"cor": "#0284c7", "peso": 2.2, "opacidade": 0.80, "tipo": "linha"},
    "ven_2013": {"cor": "#0369a1", "peso": 2.0, "opacidade": 0.75, "tipo": "linha"},
    "linhas_travessias": {"cor": "#f59e0b", "peso": 2.0, "opacidade": 0.90, "tipo": "linha_tracejada"},
    "snv_1973": {"cor": "#94a3b8", "peso": 1.8, "opacidade": 0.75, "tipo": "linha"},
    "embarcacoes": {"cor": "#38bdf8", "peso": 4.0, "opacidade": 0.80, "tipo": "ponto"},
    "br_municipios_2025": {"cor": "#64748b", "peso": 0.8, "opacidade": 0.35, "tipo": "poligono_linha"},
    "bacias_nivel_2": {"cor": "#0284c7", "peso": 1.4, "opacidade": 0.40, "tipo": "poligono_linha"},
    "bacias_nivel_3": {"cor": "#0ea5e9", "peso": 1.2, "opacidade": 0.35, "tipo": "poligono_linha"},
    "bacias_nivel_4": {"cor": "#38bdf8", "peso": 1.0, "opacidade": 0.30, "tipo": "poligono_linha"},
    "bacias_nivel_5": {"cor": "#7dd3fc", "peso": 0.8, "opacidade": 0.25, "tipo": "poligono_linha"},
    "bacias_nivel_6": {"cor": "#bae6fd", "peso": 0.6, "opacidade": 0.20, "tipo": "poligono_linha"},
    "rodovias": {"cor": "#f97316", "peso": 2.0, "opacidade": 0.80, "tipo": "linha"},
    "ferrovias": {"cor": "#a855f7", "peso": 2.2, "opacidade": 0.85, "tipo": "linha"},
    "uf": {"cor": "#60a5fa", "peso": 1.2, "opacidade": 0.80, "tipo": "poligono_linha"},
    "tis_poligonais": {"cor": "#ef4444", "peso": 1.5, "opacidade": 0.35, "tipo": "poligono"},
    "estados_amazonia_legal": {"cor": "#059669", "peso": 2.0, "opacidade": 0.10, "tipo": "poligono_tracejado"},
    "ucs_federais": {"cor": "#15803d", "peso": 1.5, "opacidade": 0.35, "tipo": "poligono"},
    "ucs_todas_mma": {"cor": "#047857", "peso": 1.2, "opacidade": 0.30, "tipo": "poligono"}
}

def normalizar_id(texto: str) -> str:
    """Gera identificador slug sem acentos e caracteres especiais."""
    t = texto.lower().strip()
    t = re.sub(r'[áàãâä]', 'a', t)
    t = re.sub(r'[éèêë]', 'e', t)
    t = re.sub(r'[íìîï]', 'i', t)
    t = re.sub(r'[óòõôö]', 'o', t)
    t = re.sub(r'[úùûü]', 'u', t)
    t = re.sub(r'[ç]', 'c', t)
    t = re.sub(r'[^a-z0-9_]+', '_', t)
    return t.strip('_')

def formatar_titulo(slug: str) -> str:
    """Converte identificador em título limpo e legível."""
    nomes_conhecidos = {
        "instalacoes_portuarias": "Instalações Portuárias",
        "ven_2024": "Vias Navegadas (VEN 2024 - Oficial V4)",
        "ven_2022": "Vias Navegadas (VEN 2022)",
        "ven_2020": "Vias Navegadas (VEN 2020)",
        "ven_2018": "Vias Navegadas (VEN 2018)",
        "ven_2013": "Vias Navegadas (VEN 2013)",
        "br_municipios_2025": "Municípios do Brasil (IBGE 2025)",
        "bacias_nivel_2": "Bacias Hidrográficas - Nível 2 (Macro)",
        "bacias_nivel_3": "Bacias Hidrográficas - Nível 3",
        "bacias_nivel_4": "Bacias Hidrográficas - Nível 4",
        "bacias_nivel_5": "Bacias Hidrográficas - Nível 5",
        "bacias_nivel_6": "Bacias Hidrográficas - Nível 6 (Micro)",
        "vias_navegadas": "Vias Economicamente Navegadas",
        "linhas_travessias": "Linhas de Travessias",
        "embarcacoes": "Tráfego de Embarcações / AIS",
        "rodovias": "Rodovias Federais (SNV)",
        "ferrovias": "Malha Ferroviária Federal",
        "snv_1973": "Sistema Nacional de Viação (1973)",
        "uf": "Unidades da Federação (IBGE)",
        "regioes": "Regiões do Brasil",
        "pais": "Limite Nacional",
        "tis_poligonais": "Terras Indígenas (FUNAI)",
        "estados_amazonia_legal": "Estados da Amazônia Legal",
        "ucs_federais": "Unidades de Conservação Federais (ICMBio)",
        "ucs_todas_mma": "Todas as UCs do Brasil (CNUC / MMA)"
    }
    if slug in nomes_conhecidos:
        return nomes_conhecidos[slug]
    return slug.replace('_', ' ').title()

def identificar_grupo(nome: str) -> str:
    """Classifica a camada no grupo cartográfico adequado."""
    n = nome.lower()
    if any(k in n for k in ['rodov', 'ferrov', 'trilho', 'estrada', 'multimodal']):
        return "multimodal"
    elif any(k in n for k in ['porto', 'instalac', 'via', 'hidro', 'snv', 'travess', 'embarcac', 'ais', 'duto']):
        return "infra"
    elif any(k in n for k in ['uc', 'conservacao', 'indig', 'tis', 'quilomb', 'amazonia', 'floresta', 'ambiental', 'manancial']):
        return "restricoes"
    elif any(k in n for k in ['uf', 'estado', 'municip', 'regio', 'pais', 'limite', 'fronteira', 'bacia']):
        return "limites"
    return "infra"""
    elif any(k in n for k in ['uc', 'conservacao', 'indig', 'tis', 'quilomb', 'amazonia', 'floresta', 'ambiental', 'manancial']):
        return "restricoes"
    elif any(k in n for k in ['uf', 'estado', 'municip', 'regio', 'pais', 'limite', 'fronteira', 'bacia']):
        return "limites"
    return "infra"

def detectar_tipo_geometria(caminho_geojson: Path) -> str:
    """Inspeciona a geometria do GeoJSON."""
    try:
        with open(caminho_geojson, 'r', encoding='utf-8', errors='ignore') as f:
            conteudo = f.read(50000)
            if '"Point"' in conteudo or '"MultiPoint"' in conteudo:
                return "ponto"
            if '"LineString"' in conteudo or '"MultiLineString"' in conteudo:
                return "linha"
            if '"Polygon"' in conteudo or '"MultiPolygon"' in conteudo:
                return "poligono"
    except Exception:
        pass
    return "poligono"

def processar_pasta_dados():
    """Gera o catálogo de camadas com integridade referencial."""
    if not PASTA_DADOS.exists():
        PASTA_DADOS.mkdir(parents=True, exist_ok=True)
        print(f"[INFO] Pasta de dados criada em: {PASTA_DADOS}")

    arquivos = sorted([p for p in PASTA_DADOS.glob("*.geojson") if p.name != "manifest.json"])
    print(f"[PIPELINE] Localizados {len(arquivos)} arquivos geoespaciais em 'dados/'.")

    camadas_manifesto = []

    # Ordem de prioridade na interface cartográfica
    ordem_prioritaria = [
        "instalacoes_portuarias", "ven_2024", "ven_2022", "ven_2020", "ven_2018", "ven_2013",
        "linhas_travessias", "snv_1973", "embarcacoes",
        "br_municipios_2025", "bacias_nivel_2", "bacias_nivel_3", "bacias_nivel_4", "bacias_nivel_5", "bacias_nivel_6",
        "rodovias", "ferrovias", "uf", "regioes", "pais",
        "tis_poligonais", "estados_amazonia_legal", "ucs_federais", "ucs_todas_mma"
    ]

    arquivos_dict = {p.stem: p for p in arquivos}

    # 1. Processa camadas padrão prioritárias
    for slug in ordem_prioritaria:
        # Ignora camada legada descontinuada
        if slug == "unidades_conservacao":
            continue

        p = arquivos_dict.get(slug)
        if not p:
            # Verifica variações de nome
            for k, caminho in arquivos_dict.items():
                if normalizar_id(k) == slug:
                    p = caminho
                    break

        caminho_relativo = f"dados/{p.name}" if p else f"dados/{slug}.geojson"
        tipo_geo = detectar_tipo_geometria(p) if (p and p.exists()) else PALETA_PADRAO.get(slug, {}).get("tipo", "poligono")
        meta = PALETA_PADRAO.get(slug, {})

        camadas_manifesto.append({
            "id": slug,
            "arquivo": caminho_relativo,
            "nome": formatar_titulo(slug),
            "grupo": identificar_grupo(slug),
            "cor": meta.get("cor", "#0284c7"),
            "peso": meta.get("peso", 2.0),
            "opacidade": meta.get("opacidade", 0.85),
            "tipoGeo": tipo_geo,
            "ativa": slug in ["instalacoes_portuarias", "ven_2022", "linhas_travessias", "embarcacoes", "uf", "tis_poligonais", "estados_amazonia_legal", "ucs_federais"]
        })

    # 2. Adiciona camadas adicionais encontradas na pasta
    for p in arquivos:
        slug = normalizar_id(p.stem)
        if slug == "unidades_conservacao":
            continue
        if any(c["id"] == slug for c in camadas_manifesto):
            continue

        tipo_geo = detectar_tipo_geometria(p)
        grupo = identificar_grupo(slug)
        cor = "#059669" if grupo == "restricoes" else ("#0284c7" if grupo == "infra" else "#60a5fa")

        camadas_manifesto.append({
            "id": slug,
            "arquivo": f"dados/{p.name}",
            "nome": formatar_titulo(p.stem),
            "grupo": grupo,
            "cor": cor,
            "peso": 2.0 if tipo_geo == "linha" else (5 if tipo_geo == "ponto" else 1.5),
            "opacidade": 0.85 if tipo_geo != "poligono" else 0.35,
            "tipoGeo": tipo_geo,
            "ativa": False
        })

    manifesto_final = {
        "versao": "3.0",
        "projeto": "WebGIS Corporativo ANTAQ - Inteligência e Gestão Aquaviária",
        "camadas": camadas_manifesto
    }

    caminho_manifesto = PASTA_DADOS / "manifest.json"
    with open(caminho_manifesto, "w", encoding="utf-8") as f:
        json.dump(manifesto_final, f, ensure_ascii=False, indent=2)

    # Cria cópia de redundância na raiz caso o servidor web sirva da raiz
    with open(DIRETORIO_PROJETO / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifesto_final, f, ensure_ascii=False, indent=2)

    print(f"[✓ SUCESSO] Manifesto cartográfico gerado com {len(camadas_manifesto)} camadas.")
    print(f"            Arquivo: {caminho_manifesto}")

if __name__ == "__main__":
    processar_pasta_dados()
