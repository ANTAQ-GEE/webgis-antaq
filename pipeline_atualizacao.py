# -*- coding: utf-8 -*-
"""
Pipeline Integrado de Extração e Atualização de Camadas - WebGIS ANTAQ
Fontes: IBGE, ANA, FUNAI, Marinha e ANTAQ.
Compatível com execução local (Windows) e remota (GitHub Actions em Linux).
"""

import os
import json
import time
import requests

# ------------------------------------------------------------------------------
# 1. CONFIGURAÇÃO DE DIRETÓRIOS E CABEÇALHOS
# ------------------------------------------------------------------------------
PASTA_PROJETO = os.path.dirname(os.path.abspath(__file__))
PASTA_DADOS = os.path.join(PASTA_PROJETO, "dados")
PASTA_ESTILOS = os.path.join(PASTA_PROJETO, "estilos")

os.makedirs(PASTA_DADOS, exist_ok=True)
os.makedirs(PASTA_ESTILOS, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def gravar_geojson_seguro(nome_arquivo, dados):
    """
    Grava o arquivo GeoJSON com validação prévia de integridade.
    Evita que respostas de erro (ex.: HTML 500) sobrescrevam dados existentes.
    """
    if not isinstance(dados, dict) or "features" not in dados:
        print(f"    [ERRO] Conteúdo retornado para {nome_arquivo} não é um FeatureCollection GeoJSON válido.")
        return False

    caminho = os.path.join(PASTA_DADOS, nome_arquivo)
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False)
        
    tamanho_kb = os.path.getsize(caminho) / 1024
    qtd_feicoes = len(dados.get("features", []))
    print(f" -> [OK] {nome_arquivo}: {qtd_feicoes} feições gravadas ({tamanho_kb:.1f} KB)")
    return True

# ------------------------------------------------------------------------------
# 2. INGESTÃO DE APIS: LIMITES POLÍTICO-ADMINISTRATIVOS (IBGE)
# ------------------------------------------------------------------------------

def extrair_ibge_ufs():
    """Baixa a malha de todas as 27 UFs do Brasil (Qualidade otimizada para web)."""
    print("\n[IBGE] Atualizando Unidades da Federação...")
    url = "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&intrarregiao=UF&qualidade=minima"
    try:
        r = requests.get(url, headers=HEADERS, timeout=30)
        if r.status_code == 200:
            gravar_geojson_seguro("ufs_brasil.geojson", r.json())
        else:
            print(f"    [Aviso IBGE] Status HTTP {r.status_code}")
    except Exception as e:
        print(f"    [Aviso IBGE UFs]: {e}")

def extrair_ibge_municipios(codigo_uf="15"):
    """
    Baixa malha de municípios de uma UF estratégica (ex.: 15 = Pará / Arco Norte, 35 = São Paulo).
    """
    print(f"\n[IBGE] Atualizando Municípios da UF {codigo_uf}...")
    url = f"https://servicodados.ibge.gov.br/api/v3/malhas/estados/{codigo_uf}?formato=application/vnd.geo+json&intrarregiao=municipio&qualidade=minima"
    try:
        r = requests.get(url, headers=HEADERS, timeout=35)
        if r.status_code == 200:
            gravar_geojson_seguro(f"municipios_uf_{codigo_uf}.geojson", r.json())
        else:
            print(f"    [Aviso IBGE Municípios] Status HTTP {r.status_code}")
    except Exception as e:
        print(f"    [Aviso IBGE Municípios]: {e}")

# ------------------------------------------------------------------------------
# 3. INGESTÃO DE APIS: RESTRIÇÕES SOCIOAMBIENTAIS (FUNAI)
# ------------------------------------------------------------------------------

def extrair_funai_terras_indigenas():
    """Consulta o WFS oficial da FUNAI (INDE) com feições em EPSG:4326."""
    print("\n[FUNAI] Atualizando Terras Indígenas via WFS...")
    url = (
        "https://geoserver.funai.gov.br/geoserver/wfs?"
        "service=WFS&version=1.0.0&request=GetFeature&"
        "typeName=funai:tis_poligonais&outputFormat=application/json&"
        "srsName=EPSG:4326&maxFeatures=150"
    )
    try:
        r = requests.get(url, headers=HEADERS, timeout=40)
        if r.status_code == 200:
            gravar_geojson_seguro("terras_indigenas.geojson", r.json())
        else:
            print(f"    [Aviso FUNAI] Status HTTP {r.status_code}")
    except Exception as e:
        print(f"    [Aviso FUNAI]: {e}")

# ------------------------------------------------------------------------------
# 4. INGESTÃO DE APIS: RECURSOS HÍDRICOS E ESTAÇÕES (ANA)
# ------------------------------------------------------------------------------

def extrair_ana_estacoes():
    """
    Consulta a API de Dados Abertos da ANA para extrair estações fluviométricas
    com medição de vazão e cota para apoio hidroviário.
    """
    print("\n[ANA] Consultando dados de estações telemétricas...")
    # Endpoint de consulta com saída em GeoJSON (WGS 84)
    url_ana = (
        "https://dadosabertos.ana.gov.br/api/search/v1/rest/services/collections/"
        "dvh_estacoes_telemetricas/geoservice/FeatureServer/0/query?"
        "where=1%3D1&outFields=*&outSR=4326&f=geojson&resultRecordCount=100"
    )
    try:
        r = requests.get(url_ana, headers=HEADERS, timeout=30)
        if r.status_code == 200:
            gravar_geojson_seguro("estacoes_ana.geojson", r.json())
        else:
            # Fallback transparente se o FeatureServer estiver em manutenção
            print(f"    [Aviso ANA] Servidor em manutenção (Status {r.status_code}). Mantendo cache local.")
    except Exception as e:
        print(f"    [Aviso ANA]: {e}")

# ------------------------------------------------------------------------------
# 5. INGESTÃO DE APIS: INFRAESTRUTURA AQUAVIÁRIA (ANTAQ E MARINHA)
# ------------------------------------------------------------------------------

def verificar_camadas_antaq():
    """
    Garante que os dados regulatórios da ANTAQ estejam presentes.
    Se você já exportou do QGIS, ele preserva. Caso contrário, gera uma base inicial estruturada.
    """
    print("\n[ANTAQ] Validando bases de portos e hidrovias...")
    
    caminho_portos = os.path.join(PASTA_DADOS, "portos_antaq.geojson")
    if not os.path.exists(caminho_portos):
        print(" -> Gerando estrutura base oficial de Instalações Portuárias...")
        portos_base = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [-46.312, -23.955]},
                    "properties": {
                        "nome": "Porto de Santos",
                        "tipo": "Porto Organizado",
                        "companhia": "Autoridade Portuária de Santos (APS)",
                        "cnpj": "44837524000107",
                        "endereco": "Av. Conselheiro Rodrigues Alves, s/n",
                        "fonte": "ANTAQ"
                    }
                },
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [-48.502, -25.501]},
                    "properties": {
                        "nome": "Porto de Paranaguá",
                        "tipo": "Porto Organizado",
                        "companhia": "Portos do Paraná (APPA)",
                        "cnpj": "79621439000191",
                        "endereco": "Rua Antônio Pereira, 161",
                        "fonte": "ANTAQ"
                    }
                },
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [-52.095, -32.035]},
                    "properties": {
                        "nome": "Porto de Rio Grande",
                        "tipo": "Porto Organizado",
                        "companhia": "Portos RS",
                        "cnpj": "01034440000125",
                        "endereco": "Av. Honório Bicalho, s/n",
                        "fonte": "ANTAQ"
                    }
                },
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [-54.718, -2.417]},
                    "properties": {
                        "nome": "TUP Cargill Santarém",
                        "tipo": "TUP",
                        "companhia": "Cargill Agrícola S.A.",
                        "cnpj": "60494709000140",
                        "Rio": "Rio Tapajós / Rio Amazonas",
                        "fonte": "ANTAQ"
                    }
                }
            ]
        }
        gravar_geojson_seguro("portos_antaq.geojson", portos_base)

    caminho_ven = os.path.join(PASTA_DADOS, "hidrovias_ven.geojson")
    if not os.path.exists(caminho_ven):
        print(" -> Gerando estrutura base de Vias Economicamente Navegadas (VEN)...")
        ven_base = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [
                            [-58.44, -3.13], [-55.00, -2.10], [-52.00, -1.50], [-48.50, -1.25]
                        ]
                    },
                    "properties": {
                        "nome": "Hidrovia do Solimões / Amazonas",
                        "Rio": "Rio Amazonas",
                        "TRECHO": "Tabatinga a Belém",
                        "fonte": "ANTAQ / DNIT"
                    }
                },
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [
                            [-50.50, -21.80], [-51.20, -22.50], [-52.00, -24.00], [-54.50, -25.50]
                        ]
                    },
                    "properties": {
                        "nome": "Hidrovia Tietê-Paraná",
                        "Rio": "Rio Tietê / Paraná",
                        "TRECHO": "Conchas a Itaipu",
                        "fonte": "ANTAQ / DNIT"
                    }
                }
            ]
        }
        gravar_geojson_seguro("hidrovias_ven.geojson", ven_base)

# ------------------------------------------------------------------------------
# 6. SINCRONIZAÇÃO DO CATÁLOGO DE METADADOS (manifesto_camadas.json)
# ------------------------------------------------------------------------------

def gerar_manifesto_dinamico():
    """
    Lê a pasta dados/ e monta o catálogo somente com os arquivos
    efetivamente existentes e íntegros, organizados por grupo temático.
    """
    print("\n[MANIFESTO] Sincronizando catálogo de camadas...")
    
    # Ordem e categorização padronizada internacional
    regras_camadas = [
        {"arquivo": "portos_antaq.geojson", "id": "portos_antaq", "nome": "Instalações Portuárias (ANTAQ)", "categoria": "aquaviaria"},
        {"arquivo": "hidrovias_ven.geojson", "id": "hidrovias_ven", "nome": "Vias Navegadas - VEN (ANTAQ)", "categoria": "aquaviaria"},
        {"arquivo": "ufs_brasil.geojson", "id": "ufs_brasil", "nome": "Unidades da Federação (IBGE)", "categoria": "limites"},
        {"arquivo": "municipios_uf_15.geojson", "id": "mun_pa", "nome": "Municípios do Pará (IBGE)", "categoria": "limites"},
        {"arquivo": "terras_indigenas.geojson", "id": "terras_indigenas", "nome": "Terras Indígenas (FUNAI)", "categoria": "ambiental"},
        {"arquivo": "estacoes_ana.geojson", "id": "estacoes_ana", "nome": "Estações Telemétricas (ANA)", "categoria": "aquaviaria"}
    ]

    manifesto = []
    for regra in regras_camadas:
        caminho = os.path.join(PASTA_DADOS, regra["arquivo"])
        if os.path.exists(caminho):
            manifesto.append(regra)

    # Adiciona quaisquer outras camadas .geojson que o usuário tenha exportado do QGIS
    arquivos_registrados = [r["arquivo"] for r in regras_camadas]
    for arquivo in os.listdir(PASTA_DADOS):
        if arquivo.endswith(".geojson") and arquivo not in arquivos_registrados:
            nome_amigavel = arquivo.replace(".geojson", "").replace("_", " ").title()
            manifesto.append({
                "arquivo": arquivo,
                "id": arquivo.replace(".geojson", ""),
                "nome": nome_amigavel,
                "categoria": "aquaviaria"
            })

    caminho_manifesto = os.path.join(PASTA_DADOS, "manifesto_camadas.json")
    with open(caminho_manifesto, "w", encoding="utf-8") as f:
        json.dump(manifesto, f, ensure_ascii=False, indent=2)
        
    print(f" -> [OK] Catálogo sincronizado com {len(manifesto)} camadas disponíveis.")

# ------------------------------------------------------------------------------
# 7. EXECUÇÃO DO PIPELINE
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    inicio = time.time()
    print("==================================================================")
    print("INICIANDO ATUALIZAÇÃO VIA API - WEBGIS ANTAQ")
    print(f"Diretório de trabalho: {PASTA_PROJETO}")
    print("==================================================================")

    # Executa a coleta em todas as frentes
    extrair_ibge_ufs()
    extrair_ibge_municipios(codigo_uf="15")  # Pará / Arco Norte
    extrair_funai_terras_indigenas()
    extrair_ana_estacoes()
    verificar_camadas_antaq()
    gerar_manifesto_dinamico()

    duracao = time.time() - inicio
    print("\n==================================================================")
    print(f"PIPELINE CONCLUÍDO EM {duracao:.2f} SEGUNDOS.")
    print("Arquivos prontos para visualização no navegador e deploy no GitHub.")
    print("==================================================================")