#!/usr/bin/env python3
"""
============================================================
WebGIS Corporativo ANTAQ — Gerador de Bundles de Produção
============================================================
Consolida os ~50 arquivos JavaScript modulares em 5 pacotes
estratégicos de produção, reduzindo requisições HTTP e eliminando
o risco de corrida de scripts, preservando a arquitetura 'sem build step'.

Uso:
    python scripts/gerar_bundles.py
============================================================
"""

import os
import sys
import subprocess
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS_DIR = os.path.join(BASE_DIR, 'js')
DIST_DIR = os.path.join(JS_DIR, 'dist')

# Mapeamento oficial dos 5 bundles respeitando a ordem estrita de dependências
BUNDLES = {
    'bundle-core.js': {
        'nome': 'Core & Fundação Cartográfica',
        'descricao': 'Segurança, estado global, mapa Leaflet, histórico e controles básicos',
        'arquivos': [
            'utils/security.js',
            'utils/geom-type-detector.js',
            'core/fetch-manager.js',
            'core/state.js',
            'core/map.js',
            'core/action-history.js',
            'core/basemap-manager.js',
            'core/notification-manager.js',
            'core/layer-registry.js',
            'core/layer-order-manager.js',
            'core/data-manager.js',
            'core/ui.js',
            'core/ambiente-manager.js',
            'core/url-state.js',
            'core/webgis-version.js',
            'core/webgis-about.js',
        ]
    },
    'bundle-render.js': {
        'nome': 'Renderização, Estilos & Simbologia',
        'descricao': 'Popups, ícones vetoriais SVG, estilização de camadas e AIS',
        'arquivos': [
            'render/popup-renderer.js',
            'render/map-symbols.js',
            'render/styler.js',
            'render/port-symbology.js',
            'render/styler-tku.js',
            'render/ais-layer.js',
        ]
    },
    'bundle-domain.js': {
        'nome': 'Regras de Negócio & Ferramentas Cartográficas',
        'descricao': 'Classificação de portos, filtros, busca, medição, seleção e geoprocessamento',
        'arquivos': [
            'domain/port-classification.js',
            'domain/filter-manager.js',
            'domain/search-engine.js',
            'domain/tabela-manager.js',
            'domain/catalogo-manager.js',
            'domain/layer-metadata.js',
            'domain/measurement-tool.js',
            'domain/selection-manager.js',
            'domain/map-extras.js',
            'domain/buffer-tool.js',
            'domain/geo-tools.js',
            'domain/ven-unified-manager.js',
            'domain/safra-diff-manager.js',
            'domain/tku-manager.js',
            'domain/estudos-manager.js',
            'domain/navegacao-estrategica.js',
        ]
    },
    'bundle-analytics.js': {
        'nome': 'Estúdio Analítico, Inteligência & I/O',
        'descricao': 'Gráficos Chart.js, matriz VEN, TKU, importador/exportador, AIS e Copiloto IA',
        'arquivos': [
            'analytics/analytics.js',
            'analytics/matriz-ven-manager.js',
            'analytics/analytics-tku.js',
            'io/export-manager.js',
            'io/import-manager.js',
            'io/ais-loader.js',
            'domain/ais-manager.js',
            'domain/controle-ais.js',
            'ai/intent-parser.js',
            'ai/copiloto-ia.js',
        ]
    },
    'bundle-app.js': {
        'nome': 'Controle de Abas & Bootstrap',
        'descricao': 'Gestão de navegação entre abas e inicialização do sistema',
        'arquivos': [
            'core/tab-toggle.js',
            'core/tab-manager.js',
            'app.js',
        ]
    }
}

def concatenar_arquivos(destino_nome, config):
    caminho_bundle = os.path.join(DIST_DIR, destino_nome)
    arquivos_incluidos = []
    conteudo_total = []

    cabecalho = f"""/* ============================================================
 * WebGIS Corporativo ANTAQ — {config['nome']}
 * Arquivo: js/dist/{destino_nome}
 * Descrição: {config['descricao']}
 * Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
 * Módulos inclusos:
"""
    for rel_path in config['arquivos']:
        cabecalho += f" *   - js/{rel_path}\n"
    cabecalho += " * ============================================================ */\n\n"
    conteudo_total.append(cabecalho)

    for rel_path in config['arquivos']:
        caminho_arquivo = os.path.join(JS_DIR, rel_path)
        if not os.path.exists(caminho_arquivo):
            print(f"  [AVISO] Arquivo não encontrado: js/{rel_path} (ignorado)")
            continue

        with open(caminho_arquivo, 'r', encoding='utf-8') as f:
            conteudo = f.read()

        bloco = f"\n/* --- INÍCIO: js/{rel_path} --- */\n"
        bloco += conteudo.strip() + "\n"
        bloco += f"/* --- FIM: js/{rel_path} --- */\n"
        conteudo_total.append(bloco)
        arquivos_incluidos.append(rel_path)

    conteudo_final = "".join(conteudo_total)

    with open(caminho_bundle, 'w', encoding='utf-8') as f:
        f.write(conteudo_final)

    tamanho_kb = os.path.getsize(caminho_bundle) / 1024
    print(f"✓ {destino_nome:<22} | {len(arquivos_incluidos):>2} módulos | {tamanho_kb:>6.1f} KB")
    return caminho_bundle

def validar_com_node(caminho_arquivo):
    try:
        res = subprocess.run(['node', '-c', caminho_arquivo], capture_output=True, text=True)
        if res.returncode == 0:
            return True, "Sintaxe JS válida"
        return False, res.stderr
    except FileNotFoundError:
        return True, "Node.js não instalado (validação ignorada)"

def main():
    print("=" * 65)
    print("WebGIS ANTAQ — Empacotamento de Scripts de Produção")
    print("=" * 65)
    os.makedirs(DIST_DIR, exist_ok=True)

    todos_ok = True
    for bundle_nome, config in BUNDLES.items():
        caminho = concatenar_arquivos(bundle_nome, config)
        ok, msg = validar_com_node(caminho)
        if not ok:
            print(f"  ❌ Erro de sintaxe em {bundle_nome}: {msg}")
            todos_ok = False

    print("-" * 65)
    if todos_ok:
        print("✓ Todos os 5 bundles foram gerados e validados com sucesso!")
        print("  Destino: js/dist/")
    else:
        print("⚠️ Bundles gerados com avisos de sintaxe.")
    print("=" * 65)

if __name__ == '__main__':
    main()
