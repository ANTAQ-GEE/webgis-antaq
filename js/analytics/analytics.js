/* ============================================================
   WebGIS ANTAQ — Módulo: Analytics (Estúdio Analítico)
   Escopo: gráficos de VEN, portos, travessias
   Dependências: window.DADOS_GEOJSON_BRUTOS, window.CONFIG_CAMADAS,
                 window.Security, window.PortClassification
   Referências "lazy": window.classificarEsfera
   Expõe: window.Analytics
   ============================================================ */
(function () {
  'use strict';

  const Analytics = {
    abaAtiva: 'ven',
    chartVenHist: null, chartVenBacias: null, chartVenTempos: null,
    chartPortosRegimes: null, chartPortosUfs: null,
    chartTravessiasRegioes: null, chartTravessiasEstados: null,
    _cacheValido: { ven: false, portos: false, travessias: false },

    trocarAba: function (aba) {
      this.abaAtiva = aba;
      ['ven', 'portos', 'travessias', 'relatorios'].forEach(a => {
        const elBtn = document.getElementById(`tab-btn-${a}`);
        const elAba = document.getElementById(`aba-${a}`);
        if (elBtn) elBtn.classList.toggle('ativo', a === aba);
        if (elAba) elAba.style.display = (a === aba) ? 'block' : 'none';
      });

      // ✅ Só regenera se o cache estiver inválido
      if (aba === 'ven' && !this._cacheValido.ven) this.gerarGraficosVEN();
      else if (aba === 'portos' && !this._cacheValido.portos) this.gerarGraficosPortos();
      else if (aba === 'travessias' && !this._cacheValido.travessias) this.gerarGraficosTravessias();
      else {
        // Cache válido → só redimensiona (instantâneo)
        requestAnimationFrame(() => {
          [this.chartVenHist, this.chartVenBacias, this.chartVenTempos,
           this.chartPortosRegimes, this.chartPortosUfs,
           this.chartTravessiasRegioes, this.chartTravessiasEstados].forEach(c => {
            if (c && c.resize) { try { c.resize(); } catch (e) {} }
          });
        });
      }
    },

    atualizarSeletores: function () { this.trocarAba(this.abaAtiva); },

    extrairUF: function (props, feature) {
      if (!props) return '';
      for (const k of ['SIGLA_UF','sigla_uf','uf','UF','estado','ESTADO','est_uf','sg_uf']) {
        const v = props[k];
        if (v && String(v).trim().length === 2) return String(v).trim().toUpperCase();
      }
      for (const k of ['municipio','MUNICIPIO','nome_municipio','NM_MUN']) {
        const v = props[k];
        if (v && String(v).includes('/')) {
          const partes = String(v).split('/');
          if (partes.length > 1) return partes[1].trim().toUpperCase();
        }
      }
      return '';
    },

    gerarGraficosVEN: function () {
      const ctxHist = document.getElementById('canvas-ven-historico');
      if (ctxHist) {
        if (this.chartVenHist) this.chartVenHist.destroy();
        this.chartVenHist = new Chart(ctxHist, {
          type: 'line',
          data: {
            labels: ['VEN 2018', 'VEN 2020', 'VEN 2022', 'VEN 2024'],
            datasets: [{
              label: 'Extensão Total Navegada (km)',
              data: [18616, 19167, 20125, 20404],
              borderColor: '#00e5ff',
              backgroundColor: 'rgba(0, 229, 255, 0.15)',
              borderWidth: 3, fill: true, tension: 0.3,
              pointBackgroundColor: '#fff', pointBorderColor: '#00e5ff',
              pointRadius: 6, pointHoverRadius: 8
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: '#e2e8f0', font: { size: 10 } } },
              tooltip: { callbacks: { label: function (ctx) { return ` Extensão: ${ctx.parsed.y.toLocaleString('pt-BR')} km`; } } }
            },
            scales: {
              y: { min: 17000, max: 21500, ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
              x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } }
            }
          }
        });
      }

      const ctxBacias = document.getElementById('canvas-ven-bacias');
      if (ctxBacias) {
        if (this.chartVenBacias) this.chartVenBacias.destroy();
        this.chartVenBacias = new Chart(ctxBacias, {
          type: 'bar',
          data: {
            labels: ['Amazônica', 'Tocantins-Araguaia', 'Paraná', 'Paraguai', 'Atlântico Sul'],
            datasets: [{
              label: 'Extensão 2024 (km)',
              data: [16836.8, 1423.2, 1160.0, 588.0, 396.4],
              backgroundColor: ['#10b981', '#f59e0b', '#0284c7', '#8b5cf6', '#06b6d4'],
              borderRadius: 4
            }]
          },
          options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: function (ctx) { return ` ${ctx.parsed.x.toLocaleString('pt-BR')} km`; } } }
            },
            scales: {
              x: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
              y: { ticks: { color: '#e2e8f0', font: { size: 9.5 } }, grid: { display: false } }
            }
          }
        });
      }

      const ctxTempos = document.getElementById('canvas-ven-tempos');
      if (ctxTempos) {
        if (this.chartVenTempos) this.chartVenTempos.destroy();
        const features = DADOS_GEOJSON_BRUTOS['ven_2022']?.features || DADOS_GEOJSON_BRUTOS['ven_2024']?.features || [];
        let curtos = 0, medios = 0, longos = 0, muitoLongos = 0;
        features.forEach(f => {
          const t = String(f.properties?.tempo || '');
          if (t.includes('0d 0h') || t.includes('0d 1h') || t.includes('0d 2h') || t.includes('0d 3h') || t.includes('0d 4h') || t.includes('0d 5h')) curtos++;
          else if (t.includes('0d')) medios++;
          else if (t.includes('1d')) longos++;
          else if (t.includes('2d') || t.includes('3d') || t.includes('4d') || t.includes('5d')) muitoLongos++;
          else medios++;
        });
        if (!features.length) { curtos = 45; medios = 82; longos = 34; muitoLongos = 18; }
        this.chartVenTempos = new Chart(ctxTempos, {
          type: 'doughnut',
          data: {
            labels: ['Curto (< 6 horas)', 'Médio (6h a 24 horas)', 'Longo (1 a 2 dias)', 'Inter-regional (> 2 dias)'],
            datasets: [{
              data: [curtos, medios, longos, muitoLongos],
              backgroundColor: ['#10b981', '#38bdf8', '#f59e0b', '#ec4899'],
              borderWidth: 1, borderColor: '#0f172a'
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#cbd5e1', font: { size: 9.5 } } } }
          }
        });
      }
      this._cacheValido.ven = true;      
    },

    gerarGraficosPortos: function () {
      const ctxRegimes = document.getElementById('canvas-portos-regimes');
      if (ctxRegimes) {
        if (this.chartPortosRegimes) this.chartPortosRegimes.destroy();
        this.chartPortosRegimes = new Chart(ctxRegimes, {
          type: 'doughnut',
          data: {
            labels: ['Portos Organizados (37)','Terminais de Uso Privado - TUP (260)','Pequeno Porte - IP4 (122)','Estações de Transbordo - ETC (45)','Portos Públicos e Apoio (715)'],
            datasets: [{
              data: [37, 260, 122, 45, 715],
              backgroundColor: ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'],
              borderWidth: 1, borderColor: '#0f172a'
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { position: 'right', labels: { color: '#cbd5e1', font: { size: 9.5 } } },
              tooltip: { callbacks: { label: function (ctx) { return ` ${ctx.label}: ${ctx.parsed} ativos`; } } }
            }
          }
        });
      }
      const ctxUfs = document.getElementById('canvas-portos-ufs');
      if (ctxUfs) {
        if (this.chartPortosUfs) this.chartPortosUfs.destroy();
        this.chartPortosUfs = new Chart(ctxUfs, {
          type: 'bar',
          data: {
            labels: ['PA', 'AM', 'SP', 'RJ', 'SC', 'PR', 'MA', 'RS', 'BA', 'ES'],
            datasets: [{ label: 'Instalações Portuárias', data: [284, 192, 114, 98, 76, 68, 62, 59, 54, 45], backgroundColor: '#0284c7', borderRadius: 4 }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
              x: { ticks: { color: '#e2e8f0', font: { size: 9.5 } }, grid: { display: false } }
            }
          }
        });
      }
      this._cacheValido.portos = true;      
    },

    gerarGraficosTravessias: function () {
      const ctxReg = document.getElementById('canvas-travessias-regioes');
      if (ctxReg) {
        if (this.chartTravessiasRegioes) this.chartTravessiasRegioes.destroy();
        this.chartTravessiasRegioes = new Chart(ctxReg, {
          type: 'pie',
          data: {
            labels: ['Norte / Amazônia', 'Nordeste (São Francisco)', 'Centro-Oeste / Pantanal', 'Sul / Sudeste (Paraná)'],
            datasets: [{ data: [42, 24, 15, 12], backgroundColor: ['#10b981', '#f59e0b', '#8b5cf6', '#0284c7'], borderColor: '#0f172a', borderWidth: 1 }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#cbd5e1', font: { size: 9.5 } } } }
          }
        });
      }
      const ctxEst = document.getElementById('canvas-travessias-estados');
      if (ctxEst) {
        if (this.chartTravessiasEstados) this.chartTravessiasEstados.destroy();
        this.chartTravessiasEstados = new Chart(ctxEst, {
          type: 'bar',
          data: {
            labels: ['PA-AP', 'BA-PE', 'MA-TO', 'RO-AM', 'MS-Bolívia/PY', 'SP-PR', 'Outros'],
            datasets: [{ label: 'Travessias Regulares Outorgadas', data: [26, 18, 14, 12, 9, 8, 6], backgroundColor: '#f59e0b', borderRadius: 4 }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
              x: { ticks: { color: '#e2e8f0', font: { size: 9.5 } }, grid: { display: false } }
            }
          }
        });
      }
       this._cacheValido.travessias = true;     
    },
    // ✅ Pré-renderiza os gráficos escondidos no boot (primeira abertura fica instantânea)
    preRenderizar: function () {
      const painel = document.getElementById('painel-graficos');
      if (!painel) return;

      const estavaAberto = painel.classList.contains('aberto');
      const visOriginal = painel.style.visibility;

      // Abre escondido — Chart.js precisa medir o canvas
      painel.style.visibility = 'hidden';
      painel.classList.add('aberto');

      try {
        this.gerarGraficosVEN();
        this.gerarGraficosPortos();
        this.gerarGraficosTravessias();
      } catch (e) {
        console.warn('[Analytics] Erro na pré-renderização:', e);
      }

      // Restaura estado original
      painel.style.visibility = visOriginal || '';
      if (!estavaAberto) painel.classList.remove('aberto');
    },    
  };

  window.Analytics = Analytics;
  console.info('[js] Analytics carregado');
  // Pré-renderiza depois da página carregar
  window.addEventListener('load', () => {
    setTimeout(() => {
      try { Analytics.preRenderizar(); }
      catch (e) { console.warn('[Analytics] preRenderizar falhou:', e); }
    }, 300);
  });  
})();