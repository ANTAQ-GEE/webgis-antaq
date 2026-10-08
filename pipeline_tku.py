# ============================================================
# WebGIS ANTAQ — Pipeline TKU
# ------------------------------------------------------------
# Consolida os 8 arquivos TKU (2021, 2023, 2025) em 1 arquivo único
# com campos normalizados.
#
# Uso: python pipeline_tku.py
# ============================================================

import json
import glob
import os
import re

PASTA_DADOS = r'C:\dev\webgis-antaq\dados'
ARQUIVO_SAIDA = os.path.join(PASTA_DADOS, 'tku.geojson')

# ────────────────────────────────────────────────────────────
# MAPEAMENTO DE CAMPOS
# ────────────────────────────────────────────────────────────
# Converte qualquer variação pra nome único normalizado
MAPA_CAMPOS = {
    'idhidrovia': 'idhidrovia',
    'nome': 'nome',
    'navegacao': 'navegacao',
    'tipo': 'tipo',
    'vel_cional': 'velocidade',
    'velocidade': 'velocidade',
    'extensao': 'extensao',
    'tempo': 'tempo',
    'cla_icacao': 'classificacao',
    'fluxo': 'fluxo',
    'nome_rio': 'nome_rio',
    'nom_eclusa': 'nom_eclusa',
    'jurisdicao': 'jurisdicao',
    'reg_rafica': 'regiao_hidrografica',
    'pro_de_min': 'profundidade_min',
    'pro_de_max': 'profundidade_max',
    'dominio': 'dominio',
    'observacao': 'observacao',
    'snv': 'snv',
    'fonte': 'fonte',
    'idm_origem': 'municipio_origem_id',
    'mun_origem': 'municipio_origem',
    'est_origem': 'uf_origem',
    'idm_estino': 'municipio_destino_id',
    'mun_estino': 'municipio_destino',
    'est_estino': 'uf_destino',
    'idantaq': 'id_antaq',
    # Metadados de geração
    'camada_sim': '_gerado_por_sim',
    'camada sim': '_gerado_por_sim',
    'id': '_id_origem',
}

# Campos extras que devem ser IGNORADOS
CAMPOS_IGNORAR = {'_gerado_por_sim', '_id_origem'}

# Normaliza navegação
MAPA_NAVEGACAO = {
    'cabotagem': 'Cabotagem',
    'interior': 'Interior',
    'longo curso': 'Longo Curso',
}

# ────────────────────────────────────────────────────────────
# EXTRAI ANO E NAVEGAÇÃO DO NOME DO ARQUIVO
# ────────────────────────────────────────────────────────────
def extrair_ano_nav(nome_arquivo):
    # Ano
    if '2021' in nome_arquivo: ano = 2021
    elif '2023' in nome_arquivo: ano = 2023
    elif '2025' in nome_arquivo: ano = 2025
    else: return None, None

    # Navegação
    nl = nome_arquivo.lower()
    if 'cabotagem' in nl: nav = 'Cabotagem'
    elif 'longo' in nl:   nav = 'Longo Curso'
    elif 'interior' in nl: nav = 'Interior'
    else: return None, None

    return ano, nav

# ────────────────────────────────────────────────────────────
# NORMALIZA PROPS
# ────────────────────────────────────────────────────────────
def normalizar_props(props):
    nova = {}
    for k, v in props.items():
        kl = k.lower().strip()
        if kl in MAPA_CAMPOS:
            campo_norm = MAPA_CAMPOS[kl]
            if campo_norm in CAMPOS_IGNORAR:
                continue
            # Trata valores NULL/vazios
            if v is None or v == '' or v == 'NULL':
                nova[campo_norm] = None
            else:
                nova[campo_norm] = v
    return nova

# ────────────────────────────────────────────────────────────
# PIPELINE PRINCIPAL
# ────────────────────────────────────────────────────────────
def main():
    print('=' * 70)
    print('PIPELINE TKU — Consolidação 2021/2023/2025')
    print('=' * 70)

    # Localiza todos os arquivos TKU
    padroes = [
        os.path.join(PASTA_DADOS, 'TKU-*.geojson'),
        os.path.join(PASTA_DADOS, 'TKU_*.geojson'),
        os.path.join(PASTA_DADOS, 'TKU*.geojson'),
    ]

    arquivos = set()
    for p in padroes:
        for f in glob.glob(p):
            # Exclui arquivos que NÃO são fluxo (portos auxiliares, etc)
            nome = os.path.basename(f).lower()
            if any(x in nome for x in ['porto', 'destino', 'origem', 'cabotagem2', 'interior portos', 'interior-2023.']):
                continue
            # Só arquivos com "fluxo" ou "interior" ou "longo" ou "cabotagem" puros
            arquivos.add(f)

    # ⚠️ Filtra só os que são REALMENTE de fluxo
    arquivos = sorted([f for f in arquivos if re.search(r'fluxo|interior|longo|cabotagem', os.path.basename(f).lower())
                       and not re.search(r'porto|destino|origem|cabotagem2', os.path.basename(f).lower())])

    print(f'\nArquivos encontrados: {len(arquivos)}\n')

    todos = []

    for arq in arquivos:
        nome = os.path.basename(arq)
        ano, nav = extrair_ano_nav(nome)

        if not ano:
            print(f'  [SKIP] {nome} — não consegui extrair ano/navegação')
            continue

        try:
            with open(arq, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f'  [ERRO] {nome}: {e}')
            continue

        feats = data.get('features', [])
        if not feats:
            print(f'  [VAZIO] {nome}')
            continue

        # Normaliza cada feição
        for feat in feats:
            props = feat.get('properties', {})
            nova_props = normalizar_props(props)
            nova_props['ano'] = ano
            nova_props['navegacao'] = nav  # força valor padronizado
            feat['properties'] = nova_props
            todos.append(feat)

        print(f'  [OK] {nome:<50} {len(feats):>5} feições (ano={ano}, nav={nav})')

    # Salva
    output = {
        'type': 'FeatureCollection',
        'features': todos
    }

    with open(ARQUIVO_SAIDA, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f'\n{"=" * 70}')
    print(f'✅ Consolidado salvo em: {ARQUIVO_SAIDA}')
    print(f'   Total: {len(todos)} feições')
    print(f'   Tamanho: {os.path.getsize(ARQUIVO_SAIDA) / 1024:.0f} KB')
    print(f'{"=" * 70}')

    # Resumo por ano/navegação
    print('\nResumo:')
    from collections import Counter
    contagem = Counter((f['properties']['ano'], f['properties']['navegacao']) for f in todos)
    for (ano, nav), qtd in sorted(contagem.items()):
        print(f'  {ano} · {nav:<15} {qtd:>4} feições')


if __name__ == '__main__':
    main()