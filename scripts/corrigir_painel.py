#!/usr/bin/env python3
"""
============================================================
WebGIS Corporativo ANTAQ — Script de Correção do Painel Analítico
============================================================
Corrige automaticamente:
1. Posicionamento dos 5 cards explicativos contextuais em cada aba.
2. Remoção dos blocos soltos no rodapé (Top 10 duplicado e metodologia genérica).
3. Remoção da declaração duplicada inline do Analytics no index.html.
4. Blindagem do js/analytics/analytics.js com Chart.getChart() para evitar
   o erro "Canvas is already in use".
5. Configuração do playwright.config.js com outputDir no temp local (evita EINVAL).
6. Regeneração dos bundles de produção em js/dist/.
============================================================
"""

import os
import re
import sys
import subprocess

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_PATH = os.path.join(BASE_DIR, 'index.html')
ANALYTICS_PATH = os.path.join(BASE_DIR, 'js', 'analytics', 'analytics.js')
PLAYWRIGHT_PATH = os.path.join(BASE_DIR, 'playwright.config.js')
BUNDLES_SCRIPT = os.path.join(BASE_DIR, 'scripts', 'gerar_bundles.py')

def corrigir_index():
    if not os.path.exists(INDEX_PATH):
        print(f"[ERRO] index.html não encontrado em {INDEX_PATH}")
        return False

    with open(INDEX_PATH, 'r', encoding='utf-8') as f:
        html = f.read()

    # Backup
    with open(INDEX_PATH + '.bak', 'w', encoding='utf-8') as f:
        f.write(html)

    # 1. Limpa cards inseridos em locais incorretos
    html = re.sub(r'\s*<!-- 📖 CARD EXPLICATIVO CONTEXTUAL: VEN -->.*?(?=</div>\s*<div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:14px;")', '', html, flags=re.DOTALL)
    html = re.sub(r'\s*<!-- 📖 CARD EXPLICATIVO CONTEXTUAL: PORTOS -->.*?(?=</div>\s*<div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:14px;")', '', html, flags=re.DOTALL)
    html = re.sub(r'\s*<!-- 📖 CARD EXPLICATIVO CONTEXTUAL: TRAVESSIAS -->.*?(?=</div>\s*<div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:14px;")', '', html, flags=re.DOTALL)
    html = re.sub(r'\s*<!-- 📖 CARD EXPLICATIVO CONTEXTUAL: TKU -->.*?(?=</div>\s*<div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:10px; margin-bottom:10px;")', '', html, flags=re.DOTALL)
    html = re.sub(r'\s*<!-- 📖 CARD EXPLICATIVO CONTEXTUAL: ESTUDOS -->.*?(?=</div>\s*<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; align-items:center;")', '', html, flags=re.DOTALL)

    card_ven = '''
        <!-- 📖 CARD EXPLICATIVO CONTEXTUAL: VEN -->
        <div style="background:rgba(2,132,199,0.08); border-left:3px solid #0284c7; border-radius:6px; padding:12px 14px; font-size:10.5px; color:#cbd5e1; line-height:1.5; margin-top:12px;">
          <div style="font-weight:700; color:#38bdf8; margin-bottom:6px; display:flex; align-items:center; gap:6px; font-size:11px;">
            <span>📖</span> Como Interpretar os Dados de Vias Navegadas (VEN)
          </div>
          <p style="margin:0 0 6px 0;">
            <strong>Série Histórica (2013–2024):</strong> Mapeia trechos hidroviários com transporte comercial consolidado de cargas e passageiros. A evolução temporal reflete a expansão das safras do agronegócio e a dinâmica das autorizações regulatórias da ANTAQ.
          </p>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06); font-size:10px; color:#94a3b8;">
            <div>
              <strong style="color:#e2e8f0;">Modelagem Espacial:</strong><br>
              &bull; Algoritmo de caminhos mínimos Origem-Destino via SIGTAQ.<br>
              &bull; Eliminação de trechos sobrepostos e consolidação de nós hidroviários.<br>
              &bull; Datum Geodésico SIRGAS 2000 (IBGE / CONCAR).
            </div>
            <div>
              <strong style="color:#e2e8f0;">Fontes & Referências:</strong><br>
              &bull; Relatórios Oficiais de Desempenho Hidroviário (SEPH/GEE).<br>
              &bull; Plano Nacional de Viação (PNV &mdash; Portaria Minfra 1.429).<br>
              &bull; Cartas Náuticas CHM e batimetrias da Marinha do Brasil e DNIT.
            </div>
          </div>
        </div>
      </div>'''

    old_ven_end = '''            <div
              style="font-size:9px; color:#64748b; margin-top:8px; border-top:1px solid rgba(255,255,255,0.08); padding-top:6px;">
              Superintendência de Estudos e Projetos Hidroviários &bull; SEPH/ANTAQ
            </div>
          </div>
        </div>
      </div>'''

    if old_ven_end in html:
        html = html.replace(old_ven_end, '''            <div
              style="font-size:9px; color:#64748b; margin-top:8px; border-top:1px solid rgba(255,255,255,0.08); padding-top:6px;">
              Superintendência de Estudos e Projetos Hidroviários &bull; SEPH/ANTAQ
            </div>
          </div>
        </div>
''' + card_ven)

    card_portos = '''
        <!-- 📖 CARD EXPLICATIVO CONTEXTUAL: PORTOS -->
        <div style="background:rgba(16,185,129,0.08); border-left:3px solid #10b981; border-radius:6px; padding:12px 14px; font-size:10.5px; color:#cbd5e1; line-height:1.5; margin-top:12px;">
          <div style="font-weight:700; color:#34d399; margin-bottom:6px; display:flex; align-items:center; gap:6px; font-size:11px;">
            <span>📖</span> Como Interpretar a Infraestrutura Portuária & Regimes Regulatórios
          </div>
          <p style="margin:0 0 6px 0;">
            <strong>Universo Regulatório (1.179 instalações):</strong> Contempla o cadastro integral de instalações portuárias brasileiras reguladas ou registradas pela ANTAQ, classificadas conforme os regimes jurídicos da Lei Federal nº 12.815/2013.
          </p>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06); font-size:10px; color:#94a3b8;">
            <div>
              <strong style="color:#e2e8f0;">Tipologia de Outorga:</strong><br>
              &bull; <strong>TUP:</strong> Terminais de Uso Privado autorizados fora da área do porto organizado.<br>
              &bull; <strong>IP4:</strong> Instalações Portuárias Públicas de Pequeno Porte para integração ribeirinha.<br>
              &bull; <strong>ETC:</strong> Estações de Transbordo de Cargas intermodais.<br>
              &bull; <strong>Porto Público / Arrendamentos:</strong> Áreas sob concessão nos portos organizados.
            </div>
            <div>
              <strong style="color:#e2e8f0;">Fontes & Governança:</strong><br>
              &bull; Sistema de Desempenho Portuário (SDP/ANTAQ).<br>
              &bull; Contratos de Adesão e Resoluções de Outorga (SOG/ANTAQ).<br>
              &bull; Acompanhamento contínuo de fiscalização portuária (SFC/ANTAQ).
            </div>
          </div>
        </div>
      </div>'''

    old_portos_end = '''            <canvas id="canvas-portos-ufs"></canvas>
          </div>
        </div>
      </div>'''

    if old_portos_end in html:
        html = html.replace(old_portos_end, '''            <canvas id="canvas-portos-ufs"></canvas>
          </div>
        </div>
''' + card_portos)

    card_travessias = '''
        <!-- 📖 CARD EXPLICATIVO CONTEXTUAL: TRAVESSIAS -->
        <div style="background:rgba(245,158,11,0.08); border-left:3px solid #f59e0b; border-radius:6px; padding:12px 14px; font-size:10.5px; color:#cbd5e1; line-height:1.5; margin-top:12px;">
          <div style="font-weight:700; color:#fbbf24; margin-bottom:6px; display:flex; align-items:center; gap:6px; font-size:11px;">
            <span>📖</span> Como Interpretar as Linhas de Travessia Interestaduais e Internacionais
          </div>
          <p style="margin:0 0 6px 0;">
            <strong>Continuidade Viária & Integração Regional:</strong> As 93 linhas outorgadas realizam a transposição hidroviária de corpos d'água onde não há pontes rodoviárias, viabilizando o transporte regular de passageiros, veículos e cargas.
          </p>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06); font-size:10px; color:#94a3b8;">
            <div>
              <strong style="color:#e2e8f0;">Competência & Regulação:</strong><br>
              &bull; Regulação privativa da ANTAQ nas travessias interestaduais e internacionais.<br>
              &bull; Regime de autorização focado em segurança, regularidade e modicidade tarifária.<br>
              &bull; Fiscalização de embarcações, pontões e terminais de atracação.
            </div>
            <div>
              <strong style="color:#e2e8f0;">Fontes & Cooperação:</strong><br>
              &bull; Cadastro Oficial de Outorgas de Linhas de Travessia (ANTAQ).<br>
              &bull; Acordos de cooperação técnica com órgãos estaduais (ex: ARCON-PA).<br>
              &bull; Articulação com a malha rodoviária federal (DNIT).
            </div>
          </div>
        </div>
      </div>'''

    old_trav_end = '''            <canvas id="canvas-travessias-estados"></canvas>
          </div>
        </div>
      </div>'''

    if old_trav_end in html:
        html = html.replace(old_trav_end, '''            <canvas id="canvas-travessias-estados"></canvas>
          </div>
        </div>
''' + card_travessias)

    card_tku = '''
        <!-- 📖 CARD EXPLICATIVO CONTEXTUAL: TKU -->
        <div style="background:rgba(251,191,36,0.08); border-left:3px solid #fbbf24; border-radius:6px; padding:12px 14px; font-size:10.5px; color:#cbd5e1; line-height:1.5; margin-top:10px;">
          <div style="font-weight:700; color:#fbbf24; margin-bottom:6px; display:flex; align-items:center; gap:6px; font-size:11px;">
            <span>📖</span> Como Interpretar o Modelo de Tonelada-Quilômetro Útil (TKU)
          </div>
          <p style="margin:0 0 6px 0;">
            <strong>Métrica de Esforço de Transporte:</strong> O <code>TKU = Volume (t) &times; Extensão Navegada (km)</code> calcula a intensidade do trabalho logístico nas hidrovias. Trechos com fluxo muito alto indicam os corredores estruturantes da logística nacional (ex: grãos no Arco Norte, minério no Rio Paraguai).
          </p>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06); font-size:10px; color:#94a3b8;">
            <div>
              <strong style="color:#e2e8f0;">Série Histórica & Abrangência:</strong><br>
              &bull; Séries consolidadas de 2021, 2023 e 2025 para navegação interior e cabotagem.<br>
              &bull; <em>Nota técnica:</em> A ausência de dados de Longo Curso em 2023 reflete a delimitação da série oficial disponível.
            </div>
            <div>
              <strong style="color:#e2e8f0;">Bases Integradas:</strong><br>
              &bull; Sistema Mercante (Secretaria da Receita Federal / Ministério dos Transportes).<br>
              &bull; Sistema de Desempenho Portuário (SDP/ANTAQ).<br>
              &bull; Matriz de caminhos mínimos calculada pelo SIGTAQ.
            </div>
          </div>
        </div>
      </div>'''

    old_tku_como_ler = '''        <div
          style="background:rgba(245,158,11,0.08); border-left:3px solid #f59e0b; border-radius:6px; padding:10px 14px; font-size:10.5px; color:#fde68a; line-height:1.5;">
          <strong>📖 Como ler:</strong> cada barra representa <strong>toneladas × km navegados</strong> em todos os
          trechos da safra. Trechos com <strong>fluxo muito alto</strong> indicam corredores logísticos de grande
          volume. A ausência de <strong>Longo Curso 2023</strong> reflete a série oficial.
        </div>
      </div>'''

    if old_tku_como_ler in html:
        html = html.replace(old_tku_como_ler, card_tku)

    card_relatorios = '''
        <!-- 📖 CARD EXPLICATIVO CONTEXTUAL: ESTUDOS -->
        <div style="background:rgba(56,189,248,0.08); border-left:3px solid #38bdf8; border-radius:6px; padding:12px 14px; font-size:10.5px; color:#cbd5e1; line-height:1.5; margin-top:12px;">
          <div style="font-weight:700; color:#38bdf8; margin-bottom:6px; display:flex; align-items:center; gap:6px; font-size:11px;">
            <span>📖</span> Governança Técnica & Documentação Metodológica da ANTAQ
          </div>
          <p style="margin:0 0 6px 0;">
            <strong>Acervo Digital & Repositório SEPH/GEE:</strong> Centraliza relatórios oficiais de safras hidroviárias, notas técnicas do modelo TKU e publicações setoriais para consulta em PDF ou download, assegurando rastreabilidade às decisões regulatórias.
          </p>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06); font-size:10px; color:#94a3b8;">
            <div>
              <strong style="color:#e2e8f0;">Uso do Acervo:</strong><br>
              &bull; Filtros rápidos por tema (TKU, VEN, Geral) e busca textual instantânea.<br>
              &bull; Visualização integrada de PDFs e download de arquivos.<br>
              &bull; Gestão de novos estudos técnicos pela equipe técnica da ANTAQ.
            </div>
            <div>
              <strong style="color:#e2e8f0;">Portais & Sistemas Conectados:</strong><br>
              &bull; Central de Publicações e Pesquisas no Portal Gov.br.<br>
              &bull; Plataforma Aquarela (Business Intelligence da ANTAQ).<br>
              &bull; Processos regulatórios no SEI/ANTAQ.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>'''

    # Substitui do fim dos links externos até o fechamento correto do painel
    idx_links = html.find('SEÇÃO: LINKS EXTERNOS')
    idx_legenda = html.find('<!-- LEGENDA DINÂMICA -->')

    if idx_links != -1 and idx_legenda != -1:
        links_externos = '''SEÇÃO: LINKS EXTERNOS ═══ -->
        <div style="background:#061426; border:1px solid #1e3a5f; border-radius:8px; padding:12px 16px;">
          <strong style="font-size:12px; color:#38bdf8; display:flex; align-items:center; gap:6px; margin-bottom:8px;">
            <span>🔗</span> Publicações Oficiais ANTAQ
          </strong>
          <div
            style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:8px; font-size:10.5px;">
            <a href="https://www.gov.br/antaq/pt-br/central-de-conteudos/estudos-e-pesquisas-da-antaq-1" target="_blank"
              rel="noopener"
              style="display:block; background:#0a2540; padding:8px 10px; border-radius:6px; color:#7dd3fc; text-decoration:none; border:1px solid #0284c7;">📄
              Central de Publicações</a>
            <a href="https://aquarela.antaq.gov.br/single/?appid=56c32604-37bd-4993-9904-1b2c87706808&sheet=NnpdyU&bookmark=6ac0a531-792e-470a-8056-dbbfbc36d93e&opt=currsel%2Cctxmenu"
              target="_blank" rel="noopener"
              style="display:block; background:#0a2540; padding:8px 10px; border-radius:6px; color:#7dd3fc; text-decoration:none; border:1px solid #0284c7;">📊
              Estatísticas</a>
            <a href="https://www.gov.br/antaq/pt-br/central-de-conteudos/estudos-e-pesquisas-da-antaq-1" target="_blank"
              rel="noopener"
              style="display:block; background:#0a2540; padding:8px 10px; border-radius:6px; color:#7dd3fc; text-decoration:none; border:1px solid #0284c7;">🔬
              Estudos SEPH/GEE</a>
          </div>
        </div>
'''
        new_rel_and_trailer = links_externos + card_relatorios + '\n\n  '
        html = html[:idx_links] + new_rel_and_trailer + html[idx_legenda:]

    # Remove declaração inline duplicada de Analytics no final do HTML
    idx_inline_script = html.find('<script>\n    /* ============================================================\n       WebGIS ANTAQ — Módulo: Analytics (Estúdio Analítico)')
    if idx_inline_script != -1:
        idx_script_end = html.find('</script>\n  <!-- Fallback opcional caso o arquivo exista no disco -->', idx_inline_script)
        if idx_script_end != -1:
            html = html[:idx_inline_script] + html[idx_script_end + len('</script>\n  <!-- Fallback opcional caso o arquivo exista no disco -->'):]
            print('✓ Removida duplicata inline do Analytics de index.html!')

    with open(INDEX_PATH, 'w', encoding='utf-8') as f:
        f.write(html)
    print('✓ index.html atualizado e formatado com sucesso!')
    return True

def corrigir_analytics():
    if not os.path.exists(ANALYTICS_PATH):
        print(f"[AVISO] {ANALYTICS_PATH} não encontrado. Pulando.")
        return False

    with open(ANALYTICS_PATH, 'r', encoding='utf-8') as f:
        code = f.read()

    # Blindagem de destruição de gráficos com Chart.getChart
    reps = [
        ('if (this.chartVenHist) this.chartVenHist.destroy();',
         'const cExistHist = typeof Chart !== "undefined" && Chart.getChart(ctxHist);\n        if (cExistHist) cExistHist.destroy();\n        if (this.chartVenHist) { try { this.chartVenHist.destroy(); } catch(e){} this.chartVenHist = null; }'),
        ('if (this.chartVenBacias) this.chartVenBacias.destroy();',
         'const cExistBacias = typeof Chart !== "undefined" && Chart.getChart(ctxBacias);\n        if (cExistBacias) cExistBacias.destroy();\n        if (this.chartVenBacias) { try { this.chartVenBacias.destroy(); } catch(e){} this.chartVenBacias = null; }'),
        ('if (this.chartVenTempos) this.chartVenTempos.destroy();',
         'const cExistTempos = typeof Chart !== "undefined" && Chart.getChart(ctxTempos);\n        if (cExistTempos) cExistTempos.destroy();\n        if (this.chartVenTempos) { try { this.chartVenTempos.destroy(); } catch(e){} this.chartVenTempos = null; }'),
        ('if (this.chartPortosRegimes) this.chartPortosRegimes.destroy();',
         'const cExistRegimes = typeof Chart !== "undefined" && Chart.getChart(ctxRegimes);\n        if (cExistRegimes) cExistRegimes.destroy();\n        if (this.chartPortosRegimes) { try { this.chartPortosRegimes.destroy(); } catch(e){} this.chartPortosRegimes = null; }'),
        ('if (this.chartPortosUfs) this.chartPortosUfs.destroy();',
         'const cExistUfs = typeof Chart !== "undefined" && Chart.getChart(ctxUfs);\n        if (cExistUfs) cExistUfs.destroy();\n        if (this.chartPortosUfs) { try { this.chartPortosUfs.destroy(); } catch(e){} this.chartPortosUfs = null; }'),
        ('if (this.chartTravessiasRegioes) this.chartTravessiasRegioes.destroy();',
         'const cExistReg = typeof Chart !== "undefined" && Chart.getChart(ctxReg);\n        if (cExistReg) cExistReg.destroy();\n        if (this.chartTravessiasRegioes) { try { this.chartTravessiasRegioes.destroy(); } catch(e){} this.chartTravessiasRegioes = null; }'),
        ('if (this.chartTravessiasEstados) this.chartTravessiasEstados.destroy();',
         'const cExistEst = typeof Chart !== "undefined" && Chart.getChart(ctxEst);\n        if (cExistEst) cExistEst.destroy();\n        if (this.chartTravessiasEstados) { try { this.chartTravessiasEstados.destroy(); } catch(e){} this.chartTravessiasEstados = null; }'),
    ]

    for old, new in reps:
        if old in code:
            code = code.replace(old, new)

    with open(ANALYTICS_PATH, 'w', encoding='utf-8') as f:
        f.write(code)
    print('✓ js/analytics/analytics.js blindado com Chart.getChart()!')
    return True

def corrigir_playwright():
    if not os.path.exists(PLAYWRIGHT_PATH):
        return False
    with open(PLAYWRIGHT_PATH, 'r', encoding='utf-8') as f:
        cfg = f.read()
    if 'outputDir' not in cfg:
        cfg = cfg.replace("testDir: './tests',", "testDir: './tests',\n  outputDir: require('path').join(require('os').tmpdir(), 'playwright-antaq-results'),")
        with open(PLAYWRIGHT_PATH, 'w', encoding='utf-8') as f:
            f.write(cfg)
        print('✓ playwright.config.js configurado com outputDir no TEMP local!')
    return True

if __name__ == '__main__':
    print("=" * 60)
    print("WebGIS ANTAQ — Aplicando correções automáticas...")
    print("=" * 60)
    corrigir_index()
    corrigir_analytics()
    corrigir_playwright()
    if os.path.exists(BUNDLES_SCRIPT):
        print("\nRegenerando bundles...")
        subprocess.run([sys.executable, BUNDLES_SCRIPT])
    print("=" * 60)
    print("✓ Concluído com sucesso!")
