/* ============================================================
   WebGIS ANTAQ — Módulo: AnalyticsTKU (M12)
   Escopo: estende o Analytics com aba TKU (KPIs + gráficos)
   Dependências: window.Analytics, window.DADOS_GEOJSON_BRUTOS,
                 window.Security, Chart (CDN)
   Expõe: window.AnalyticsTKU
   ============================================================ */
(function () {
  'use strict';

  const AnalyticsTKU = {
    _charts: {},

    /* ============================================================
       RENDERIZAÇÃO PRINCIPAL
       ============================================================ */
    renderizar: function () {
      const dados = window.DADOS_GEOJSON_BRUTOS['tku'];
      if (!dados?.features?.length) {
        console.warn('[M12] TKU não carregada');
        this._mostrarVazio();
        return;
      }

      this._renderizarKPIs(dados.features);
      this._renderizarEvolucao(dados.features);
      this._renderizarPorNavegacao(dados.features);
      this.renderizarTop();
    },

    _mostrarVazio: function () {
      const el = document.getElementById('tku-kpis');
      if (el) el.innerHTML = '<div style="padding:20px;color:#64748b;text-align:center;">Ative a camada TKU no painel lateral para ver os dados.</div>';
    },

    /* ============================================================
       KPIs
       ============================================================ */
    _renderizarKPIs: function (features) {
      const porAno = {};
      for (const f of features) {
        const p = f.properties || {};
        const ano = Number(p.ano);
        const fluxo = Number(p.fluxo) || 0;
        if (!porAno[ano]) porAno[ano] = { soma: 0, n: 0, maior: 0, maiorNome: '' };
        porAno[ano].soma += fluxo;
        porAno[ano].n += 1;
        if (fluxo > porAno[ano].maior) {
          porAno[ano].maior = fluxo;
          porAno[ano].maiorNome = p.nome || '—';
        }
      }

      const fmt = (v) => {
        if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} bi`;
        if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mi`;
        if (v >= 1_000) return `${(v / 1_000).toFixed(0)} mil`;
        return v.toFixed(0);
      };

      // KPIs de cada ano
      [2021, 2023, 2025].forEach(ano => {
        const el = document.getElementById(`tku-kpi-${ano}`);
        const elSub = document.getElementById(`tku-kpi-${ano}-sub`);
        if (!el) return;
        const dados = porAno[ano];
        if (!dados) {
          el.textContent = '—';
          if (elSub) elSub.textContent = 'sem dados';
          return;
        }
        el.textContent = `${fmt(dados.soma)} t·km`;
        if (elSub) elSub.textContent = `${dados.n} trechos · maior: ${fmt(dados.maior)}`;
      });

      // Crescimento 2021 → 2025
      const elCresc = document.getElementById('tku-kpi-cresc');
      const elCrescSub = document.getElementById('tku-kpi-cresc-sub');
      if (porAno[2021] && porAno[2025]) {
        const delta = ((porAno[2025].soma - porAno[2021].soma) / porAno[2021].soma) * 100;
        const sinal = delta >= 0 ? '+' : '';
        if (elCresc) elCresc.textContent = `${sinal}${delta.toFixed(1)}%`;
        if (elCrescSub) elCrescSub.textContent = `${fmt(porAno[2025].soma - porAno[2021].soma)} t·km`;
      }
    },

    /* ============================================================
       GRÁFICO 1: Evolução por ano
       ============================================================ */
    _renderizarEvolucao: function (features) {
      const ctx = document.getElementById('canvas-tku-evolucao');
      if (!ctx) return;

      const porAno = { 2021: 0, 2023: 0, 2025: 0 };
      for (const f of features) {
        const ano = Number(f.properties?.ano);
        const fluxo = Number(f.properties?.fluxo) || 0;
        if (ano in porAno) porAno[ano] += fluxo;
      }

      if (this._charts.evolucao) this._charts.evolucao.destroy();

      this._charts.evolucao = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['2021', '2023', '2025'],
          datasets: [{
            label: 'Fluxo Total (t·km)',
            data: [porAno[2021], porAno[2023], porAno[2025]],
            borderColor: '#fbbf24',
            backgroundColor: 'rgba(251, 191, 36, 0.15)',
            borderWidth: 3,
            fill: true,
            tension: 0.25,
            pointBackgroundColor: ['#3b82f6', '#f59e0b', '#dc2626'],
            pointBorderColor: '#fff',
            pointRadius: 8,
            pointHoverRadius: 10
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#e2e8f0', font: { size: 10 } } },
            tooltip: {
              callbacks: {
                label: (c) => {
                  const v = c.parsed.y;
                  if (v >= 1_000_000) return ` ${(v / 1_000_000).toFixed(2)} mi t·km`;
                  if (v >= 1_000) return ` ${(v / 1_000).toFixed(1)} mil t·km`;
                  return ` ${v.toFixed(0)} t·km`;
                }
              }
            }
          },
          scales: {
            y: {
              ticks: {
                color: '#94a3b8',
                font: { size: 9 },
                callback: (v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : `${(v / 1000).toFixed(0)}k`
              },
              grid: { color: 'rgba(255,255,255,0.06)' }
            },
            x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } }
          }
        }
      });
    },

    /* ============================================================
       GRÁFICO 2: Por navegação (safra mais recente)
       ============================================================ */
    _renderizarPorNavegacao: function (features) {
      const ctx = document.getElementById('canvas-tku-nav');
      if (!ctx) return;

      // Pega a safra mais recente com dados
      const anos = [2025, 2023, 2021];
      let anoAlvo = 2025;
      for (const a of anos) {
        if (features.some(f => Number(f.properties?.ano) === a)) { anoAlvo = a; break; }
      }

      const porNav = {};
      for (const f of features) {
        const p = f.properties || {};
        if (Number(p.ano) !== anoAlvo) continue;
        const nav = p.navegacao || 'Outros';
        porNav[nav] = (porNav[nav] || 0) + (Number(p.fluxo) || 0);
      }

      const labels = Object.keys(porNav);
      const valores = Object.values(porNav);
      const cores = { 'Cabotagem': '#dc2626', 'Interior': '#10b981', 'Longo Curso': '#3b82f6' };

      if (this._charts.nav) this._charts.nav.destroy();

      this._charts.nav = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: valores,
            backgroundColor: labels.map(l => cores[l] || '#64748b'),
            borderWidth: 2,
            borderColor: '#0f172a'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: '#cbd5e1', font: { size: 10 }, padding: 8 }
            },
            title: {
              display: true,
              text: `Safra ${anoAlvo}`,
              color: '#94a3b8',
              font: { size: 10, weight: 'normal' }
            },
            tooltip: {
              callbacks: {
                label: (c) => {
                  const total = valores.reduce((a, b) => a + b, 0);
                  const pct = ((c.parsed / total) * 100).toFixed(1);
                  const v = c.parsed >= 1_000_000 ? `${(c.parsed / 1_000_000).toFixed(2)} mi` : `${(c.parsed / 1000).toFixed(0)} mil`;
                  return ` ${c.label}: ${v} t·km (${pct}%)`;
                }
              }
            }
          }
        }
      });
    },

    /* ============================================================
       TOP 10 TRECHOS
       ============================================================ */
    renderizarTop: function () {
      const sel = document.getElementById('tku-top-ano');
      const ano = sel ? Number(sel.value) : 2025;

      const el = document.getElementById('tku-top-lista');
      if (!el) return;

      const dados = window.DADOS_GEOJSON_BRUTOS['tku'];
      if (!dados?.features?.length) {
        el.innerHTML = '<em style="color:#64748b;">Ative a camada TKU primeiro.</em>';
        return;
      }

      const filtrados = dados.features
        .filter(f => Number(f.properties?.ano) === ano)
        .map(f => ({
          nome: f.properties?.nome || '—',
          navegacao: f.properties?.navegacao || '—',
          fluxo: Number(f.properties?.fluxo) || 0,
          extensao: Number(f.properties?.extensao) || 0,
          ufOrig: f.properties?.uf_origem || '?',
          ufDest: f.properties?.uf_destino || '?',
          munOrig: f.properties?.municipio_origem || '?',
          munDest: f.properties?.municipio_destino || '—'
        }))
        .sort((a, b) => b.fluxo - a.fluxo)
        .slice(0, 10);

      if (filtrados.length === 0) {
        el.innerHTML = `<em style="color:#64748b;">Sem dados para ${ano}.</em>`;
        return;
      }

      const maxFluxo = filtrados[0].fluxo;

      el.innerHTML = filtrados.map((item, idx) => {
        const pctBarra = (item.fluxo / maxFluxo) * 100;
        const fluxoFmt = item.fluxo >= 1_000_000
          ? `${(item.fluxo / 1_000_000).toFixed(2)} mi`
          : `${(item.fluxo / 1000).toFixed(0)} mil`;

        const corNav = item.navegacao === 'Cabotagem' ? '#dc2626'
                     : item.navegacao === 'Interior' ? '#10b981'
                     : '#3b82f6';

        return `
          <div style="display:grid; grid-template-columns: 24px 1fr 110px; gap:8px; align-items:center; padding:5px 0; border-bottom:1px dashed rgba(148,163,184,0.15);">
            <div style="font-family:Consolas,monospace; font-size:11px; color:${idx < 3 ? '#fbbf24' : '#64748b'}; font-weight:800; text-align:center;">
              ${idx + 1}º
            </div>
            <div style="min-width:0;">
              <div style="font-weight:700; color:#f1f5f9; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.2;">
                ${window.Security.escapeHTML(item.nome)}
              </div>
              <div style="font-size:9.5px; color:#94a3b8; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${corNav}; margin-right:4px;"></span>
                ${window.Security.escapeHTML(item.navegacao)} · ${item.extensao.toFixed(1)} km
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-family:Consolas,monospace; font-size:11px; font-weight:800; color:#fbbf24; line-height:1.2;">
                ${fluxoFmt} <span style="font-size:8.5px; opacity:0.6;">t·km</span>
              </div>
              <div style="height:3px; background:rgba(148,163,184,0.15); border-radius:2px; margin-top:3px; overflow:hidden;">
                <div style="height:100%; width:${pctBarra}%; background:linear-gradient(90deg, ${corNav} 0%, #fbbf24 100%);"></div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  };
  /* ============================================================
     ESTENDE Analytics.trocarAba pra reconhecer 'tku'
     ============================================================ */
  if (window.Analytics) {
    const trocarAbaOriginal = window.Analytics.trocarAba;
    window.Analytics.trocarAba = function (aba) {
      // Se for 'tku', trata manualmente
      if (aba === 'tku') {
        this.abaAtiva = 'tku';

        // Marca abas
        ['ven', 'portos', 'travessias', 'tku', 'relatorios'].forEach(a => {
          const elBtn = document.getElementById(`tab-btn-${a}`);
          const elAba = document.getElementById(`aba-${a}`);
          if (elBtn) elBtn.classList.toggle('ativo', a === 'tku');
          if (elAba) elAba.style.display = (a === 'tku') ? 'block' : 'none';
        });

        // Garante que a camada TKU está carregada
        if (!window.DADOS_GEOJSON_BRUTOS['tku']?.features?.length) {
          if (window.DataManager && window.UI) {
            window.UI.toast('⏳ Carregando dados do TKU...');
            window.DataManager.carregarCamada('tku').then(() => {
              AnalyticsTKU.renderizar();
            }).catch(() => {
              AnalyticsTKU._mostrarVazio();
            });
          }
        } else {
          AnalyticsTKU.renderizar();
        }
        return;
      }

      // Senão, delega pro original
      return trocarAbaOriginal.apply(this, arguments);
    };
  }
  /* ============================================================
     GARANTE que a aba 'relatorios' funciona (não só 'tku')
     ============================================================ */
  if (window.Analytics) {
    const _trocarAbaFinal = window.Analytics.trocarAba;
    window.Analytics.trocarAba = function (aba) {
      // Todas as abas válidas
      const abasValidas = ['ven', 'portos', 'travessias', 'tku', 'relatorios'];
      if (!abasValidas.includes(aba)) {
        console.warn('[Analytics] Aba inválida:', aba);
        return;
      }

      this.abaAtiva = aba;

      // Marca as abas
      abasValidas.forEach(a => {
        const elBtn = document.getElementById(`tab-btn-${a}`);
        const elAba = document.getElementById(`aba-${a}`);
        if (elBtn) elBtn.classList.toggle('ativo', a === aba);
        if (elAba) elAba.style.display = (a === aba) ? 'block' : 'none';
      });

      // Gera o conteúdo específico
      if (aba === 'ven' && typeof this.gerarGraficosVEN === 'function') this.gerarGraficosVEN();
      else if (aba === 'portos' && typeof this.gerarGraficosPortos === 'function') this.gerarGraficosPortos();
      else if (aba === 'travessias' && typeof this.gerarGraficosTravessias === 'function') this.gerarGraficosTravessias();
      else if (aba === 'tku' && window.AnalyticsTKU) {
        // Carrega dados se necessário
        if (!window.DADOS_GEOJSON_BRUTOS['tku']?.features?.length) {
          if (window.DataManager && window.UI) {
            window.UI.toast('⏳ Carregando dados do TKU...');
            window.DataManager.carregarCamada('tku').then(() => {
              window.AnalyticsTKU.renderizar();
            }).catch(() => {
              window.AnalyticsTKU._mostrarVazio();
            });
          }
        } else {
          window.AnalyticsTKU.renderizar();
        }
      }
      // relatorios = estático, não gera nada
    };
  }  
  window.AnalyticsTKU = AnalyticsTKU;
  console.info('[js] AnalyticsTKU carregado (M12)');
})();