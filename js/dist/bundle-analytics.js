/* ============================================================
 * WebGIS Corporativo ANTAQ — Estúdio Analítico, Inteligência & I/O
 * Arquivo: js/dist/bundle-analytics.js
 * Descrição: Gráficos Chart.js, matriz VEN, TKU, importador/exportador, AIS e Copiloto IA
 * Gerado em: 11/10/2026 20:23:36
 * Módulos inclusos:
 *   - js/analytics/analytics.js
 *   - js/analytics/matriz-ven-manager.js
 *   - js/analytics/analytics-tku.js
 *   - js/io/export-manager.js
 *   - js/io/import-manager.js
 *   - js/io/ais-loader.js
 *   - js/domain/ais-manager.js
 *   - js/domain/controle-ais.js
 *   - js/ai/intent-parser.js
 *   - js/ai/copiloto-ia.js
 * ============================================================ */


/* --- INÍCIO: js/analytics/analytics.js --- */
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
        const cExistHist = typeof Chart !== "undefined" && Chart.getChart(ctxHist);
        if (cExistHist) cExistHist.destroy();
        if (this.chartVenHist) { try { this.chartVenHist.destroy(); } catch(e){} this.chartVenHist = null; }
        this.chartVenHist = new Chart(ctxHist, {
          type: 'line',
          data: {
            labels: ['VEN 2013', 'VEN 2018', 'VEN 2020', 'VEN 2022', 'VEN 2024'],
            datasets: [{
              label: 'Extensão Total Navegada (km)',
              data: (() => {
              // Calcula soma alinhada à Matriz VEN ou usa fallback oficial
              const calcExt = (id, fallback) => {
                const g = window.DADOS_GEOJSON_BRUTOS && window.DADOS_GEOJSON_BRUTOS[id];
                if (g && g.features && g.features.length) {
                  return Math.round(g.features.reduce((s, f) => s + Number(f.properties?.extensao || f.properties?.EXTENSAO || 0), 0));
                }
                return fallback;
              };
              return [
                calcExt('ven_2013', 22036),
                calcExt('ven_2018', 18612),
                calcExt('ven_2020', 20196),
                calcExt('ven_2022', 20125),
                calcExt('ven_2024', 20404)
              ];
            })(),
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
              y: { min: 17000, max: 23500, ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
              x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } }
            }
          }
        });
      }

      const ctxBacias = document.getElementById('canvas-ven-bacias');
      if (ctxBacias) {
        const cExistBacias = typeof Chart !== "undefined" && Chart.getChart(ctxBacias);
        if (cExistBacias) cExistBacias.destroy();
        if (this.chartVenBacias) { try { this.chartVenBacias.destroy(); } catch(e){} this.chartVenBacias = null; }
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
        const cExistTempos = typeof Chart !== "undefined" && Chart.getChart(ctxTempos);
        if (cExistTempos) cExistTempos.destroy();
        if (this.chartVenTempos) { try { this.chartVenTempos.destroy(); } catch(e){} this.chartVenTempos = null; }
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
        const cExistRegimes = typeof Chart !== "undefined" && Chart.getChart(ctxRegimes);
        if (cExistRegimes) cExistRegimes.destroy();
        if (this.chartPortosRegimes) { try { this.chartPortosRegimes.destroy(); } catch(e){} this.chartPortosRegimes = null; }
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
        const cExistUfs = typeof Chart !== "undefined" && Chart.getChart(ctxUfs);
        if (cExistUfs) cExistUfs.destroy();
        if (this.chartPortosUfs) { try { this.chartPortosUfs.destroy(); } catch(e){} this.chartPortosUfs = null; }
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
        const cExistReg = typeof Chart !== "undefined" && Chart.getChart(ctxReg);
        if (cExistReg) cExistReg.destroy();
        if (this.chartTravessiasRegioes) { try { this.chartTravessiasRegioes.destroy(); } catch(e){} this.chartTravessiasRegioes = null; }
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
        const cExistEst = typeof Chart !== "undefined" && Chart.getChart(ctxEst);
        if (cExistEst) cExistEst.destroy();
        if (this.chartTravessiasEstados) { try { this.chartTravessiasEstados.destroy(); } catch(e){} this.chartTravessiasEstados = null; }
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
/* --- FIM: js/analytics/analytics.js --- */

/* --- INÍCIO: js/analytics/matriz-ven-manager.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: MatrizVENManager
   Escopo: modal da matriz operacional do VEN (tempos, extensões, OD)
   Dependências: window.DADOS_GEOJSON_BRUTOS, window.PopupRenderer,
                 window.Security, window.UI, window.DataManager, window.mapa
   Referências "lazy": window.toggleCamada (definida inline)
   Expõe: window.MatrizVENManager
   ============================================================ */
(function () {
  'use strict';

  const MatrizVENManager = {
    anoAtual: 'ven_2024',
    dadosCompletos: [],
    dadosFiltrados: [],

    abrirModal: async function () {
      const modal = document.getElementById('modal-matriz-ven');
      if (!modal) return;
      modal.classList.add('aberto');

      if (!DADOS_GEOJSON_BRUTOS[this.anoAtual]) {
        try { await window.DataManager.carregarCamada(this.anoAtual); }
        catch (e) {
          this.anoAtual = 'ven_2024';
          if (!DADOS_GEOJSON_BRUTOS[this.anoAtual]) {
            try { await window.DataManager.carregarCamada(this.anoAtual); } catch (err) {}
          }
        }
      }
      this.popularFiltrosAno();
      this.atualizarDados();
    },

    fecharModal: function () {
      const modal = document.getElementById('modal-matriz-ven');
      if (modal) modal.classList.remove('aberto');
    },

    popularFiltrosAno: function () {
      const selAno = document.getElementById('matriz-filtro-ano');
      if (selAno) selAno.value = this.anoAtual;
    },

    mudarAno: async function (novoAno) {
      this.anoAtual = novoAno;
      const lblAno = document.getElementById('kpi-matriz-ano');
      if (lblAno) lblAno.innerText = novoAno.replace('ven_', '');

      if (!DADOS_GEOJSON_BRUTOS[novoAno]) {
        if (window.UI) window.UI.toast(`Carregando malha ${novoAno}...`);
        try { await window.DataManager.carregarCamada(novoAno); }
        catch (e) { if (window.UI) window.UI.toast(`⚠️ Malha ${novoAno} não disponível.`); return; }
      }
      this.atualizarDados();
    },

    atualizarDados: function () {
      const dadosGeo = DADOS_GEOJSON_BRUTOS[this.anoAtual];
      if (!dadosGeo || !dadosGeo.features) {
        const corpo = document.getElementById('tabela-matriz-corpo');
        if (corpo) corpo.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#ef4444;">Nenhuma feição para esta safra.</td></tr>';
        return;
      }

      this.dadosCompletos = dadosGeo.features.map((f, idx) => {
        const p = f.properties || {};
        return {
          index: idx, feature: f,
          idhidrovia: Security.getProp(p, 'idhidrovia', 'gid', 'id') || idx,
          nome: Security.getProp(p, 'nome', 'NOME') || 'Hidrovia Sem Denominação',
          rio: Security.getProp(p, 'nome_rio', 'NOME_RIO', 'rio') || '-',
          mun_orig: Security.getProp(p, 'mun_origem', 'MUN_ORIGEM', 'municipio_origem') || '-',
          est_orig: Security.getProp(p, 'est_origem', 'EST_ORIGEM', 'uf_origem') || '',
          mun_dest: Security.getProp(p, 'mun_estino', 'mun_destino', 'MUN_DESTINO', 'municipio_destino') || '-',
          est_dest: Security.getProp(p, 'est_estino', 'est_destino', 'EST_DESTINO', 'uf_destino') || '',
          extensao: Number(Security.getProp(p, 'extensao', 'EXTENSAO') || 0),
          velocidade: Number(Security.getProp(p, 'vel_cional', 'VELOCIDADE') || 0),
          tempo: Security.getProp(p, 'tempo', 'TEMPO') || '-',
          tipo: Security.getProp(p, 'tipo', 'TIPO') || 'Trecho',
          eclusa: Security.getProp(p, 'nom_eclusa', 'NOM_ECLUSA', 'eclusa') || ''
        };
      });

      this.popularDropdownsFiltro();
      this.aplicarFiltros();
    },

    popularDropdownsFiltro: function () {
      const selHidro = document.getElementById('matriz-filtro-hidrovia');
      const selRio = document.getElementById('matriz-filtro-rio');

      if (selHidro) {
        const hidrovias = [...new Set(this.dadosCompletos.map(d => d.nome).filter(Boolean))].sort();
        selHidro.innerHTML = '<option value="">Todas as Hidrovias</option>' + hidrovias.map(h => `<option value="${window.Security.escapeHTML(h)}">${window.Security.escapeHTML(h)}</option>`).join('');
      }
      if (selRio) {
        const rios = [...new Set(this.dadosCompletos.map(d => d.rio).filter(r => r && r !== '-'))].sort();
        selRio.innerHTML = '<option value="">Todos os Rios</option>' + rios.map(r => `<option value="${window.Security.escapeHTML(r)}">${window.Security.escapeHTML(r)}</option>`).join('');
      }
    },

    aplicarFiltros: function () {
      const selHidro = document.getElementById('matriz-filtro-hidrovia');
      const selRio = document.getElementById('matriz-filtro-rio');
      const inputBusca = document.getElementById('matriz-busca-texto');

      const fHidro = selHidro ? selHidro.value.trim().toLowerCase() : '';
      const fRio = selRio ? selRio.value.trim().toLowerCase() : '';
      const fBusca = inputBusca ? inputBusca.value.trim().toLowerCase() : '';

      this.dadosFiltrados = this.dadosCompletos.filter(d => {
        if (fHidro && d.nome.toLowerCase() !== fHidro) return false;
        if (fRio && d.rio.toLowerCase() !== fRio) return false;
        if (fBusca) {
          const matchBusca = d.nome.toLowerCase().includes(fBusca) || d.rio.toLowerCase().includes(fBusca) ||
                             d.mun_orig.toLowerCase().includes(fBusca) || d.mun_dest.toLowerCase().includes(fBusca) ||
                             d.tipo.toLowerCase().includes(fBusca);
          if (!matchBusca) return false;
        }
        return true;
      });

      this.atualizarKPIs();
      this.renderizarTabela();
    },

    atualizarKPIs: function () {
      const elTrechos = document.getElementById('kpi-matriz-trechos');
      const elExt = document.getElementById('kpi-matriz-extensao');
      const elVel = document.getElementById('kpi-matriz-vel');

      const totalTrechos = this.dadosFiltrados.length;
      const totalExt = this.dadosFiltrados.reduce((acc, d) => acc + (d.extensao || 0), 0);
      const velMedia = totalTrechos > 0 ? (this.dadosFiltrados.reduce((acc, d) => acc + (d.velocidade || 0), 0) / totalTrechos) : 0;

      if (elTrechos) elTrechos.innerText = totalTrechos.toLocaleString('pt-BR');
      if (elExt) elExt.innerText = totalExt.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' km';
      if (elVel) elVel.innerText = velMedia.toFixed(1) + ' km/h';
    },

    renderizarTabela: function () {
      const corpo = document.getElementById('tabela-matriz-corpo');
      if (!corpo) return;

      if (!this.dadosFiltrados.length) {
        corpo.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#94a3b8;">Nenhum trecho atende aos filtros.</td></tr>';
        return;
      }

      let html = '';
      const maxLinhas = Math.min(this.dadosFiltrados.length, 300);
      for (let i = 0; i < maxLinhas; i++) {
        const d = this.dadosFiltrados[i];
        const orig = d.mun_orig + (d.est_orig ? `/${d.est_orig}` : '');
        const dest = d.mun_dest + (d.est_dest ? `/${d.est_dest}` : '');

        let classeBadge = 'badge-tempo-medio';
        if (d.tempo.includes('0d 0h') || d.tempo.includes('0d 1h') || d.tempo.includes('0d 2h') || d.tempo.includes('0d 3h') || d.tempo.includes('0d 4h')) classeBadge = 'badge-tempo-rapido';
        else if (d.tempo.includes('1d') || d.tempo.includes('2d') || d.tempo.includes('3d')) classeBadge = 'badge-tempo-longo';

        html += `
          <tr>
            <td style="font-weight:600; color:#f8fafc;">${window.Security.escapeHTML(d.nome)}</td>
            <td style="color:#38bdf8;">${window.Security.escapeHTML(d.rio)}</td>
            <td>${window.Security.escapeHTML(orig)}</td>
            <td>${window.Security.escapeHTML(dest)}</td>
            <td>${d.extensao ? d.extensao.toFixed(1) + ' km' : '-'}</td>
            <td>${d.velocidade ? d.velocidade + ' km/h' : '-'}</td>
            <td><span class="badge-tempo-destaque ${classeBadge}">${window.Security.escapeHTML(d.tempo)}</span></td>
            <td>${window.Security.escapeHTML(d.eclusa || d.tipo)}</td>
            <td style="text-align:center;"><button class="btn-acao-localizar" onclick="MatrizVENManager.localizarNoMapa(${d.index})">📍 Localizar</button></td>
          </tr>`;
      }
      if (this.dadosFiltrados.length > maxLinhas) {
        html += `<tr><td colspan="9" style="text-align:center; padding:10px; color:#f59e0b; background:#081728;">Exibindo primeiros 300 de ${this.dadosFiltrados.length}.</td></tr>`;
      }
      corpo.innerHTML = html;
    },

    localizarNoMapa: function (index) {
      const item = this.dadosCompletos.find(d => d.index === index);
      if (!item || !item.feature) return;

      this.fecharModal();
      const idCamada = this.anoAtual;
      const chkEl = document.getElementById(`chk-${idCamada}`);
      if (chkEl && !chkEl.checked) {
        chkEl.checked = true;
        if (typeof window.toggleCamada === 'function') window.toggleCamada(idCamada, true);
      }

      try {
        // 1. Limpa destaque anterior de trecho O/D
        if (window._matrizODLayer && window.mapa.hasLayer(window._matrizODLayer)) {
          window.mapa.removeLayer(window._matrizODLayer);
        }
        window._matrizODLayer = L.layerGroup().addTo(mapa);

        const geom = item.feature.geometry;
        const coords = geom.coordinates;
        let startPt, endPt;

        if (geom.type === 'MultiLineString') {
          startPt = coords[0][0];
          endPt = coords[coords.length - 1][coords[coords.length - 1].length - 1];
        } else if (geom.type === 'LineString') {
          startPt = coords[0];
          endPt = coords[coords.length - 1];
        } else {
          startPt = coords;
          endPt = coords;
        }

        let latlngOrig = [startPt[1], startPt[0]];
        let latlngDest = [endPt[1], endPt[0]];

        // Validação e correção geográfica das pontas O/D para evitar inversões
        if (window.Security && typeof window.Security.obterCoordPorto === 'function') {
          const cOrig = window.Security.obterCoordPorto(item.mun_orig);
          if (cOrig) {
            const dStart = Math.hypot(latlngOrig[0] - cOrig[0], latlngOrig[1] - cOrig[1]);
            const dEnd = Math.hypot(latlngDest[0] - cOrig[0], latlngDest[1] - cOrig[1]);
            if (dEnd < dStart) {
              const tmp = latlngOrig;
              latlngOrig = latlngDest;
              latlngDest = tmp;
            }
          }
        }

        // 2. Traçado com destaque em ciano de alto contraste
        const linhaDestaque = L.geoJSON(item.feature, {
          style: {
            color: '#00e5ff',
            weight: 6,
            opacity: 0.95
          }
        }).addTo(window._matrizODLayer);

        // 3. Marcador de Origem (DE) - Verde
        const nomeOrig = (item.mun_orig || 'Origem') + (item.est_orig ? `/${item.est_orig}` : '');
        const iconeOrig = L.divIcon({
          className: 'od-marker-origem',
          html: `<div style="background:#10b981; color:#fff; border:2px solid #fff; border-radius:12px; padding:3px 8px; font-size:10px; font-weight:800; box-shadow:0 3px 8px rgba(0,0,0,0.5); white-space:nowrap; display:flex; align-items:center; gap:4px;">
            <span>🟢 DE:</span> <span>${window.Security ? window.Security.escapeHTML(nomeOrig) : nomeOrig}</span>
          </div>`,
          iconSize: [130, 24],
          iconAnchor: [12, 12]
        });
        L.marker(latlngOrig, { icon: iconeOrig, zIndexOffset: 1200 })
          .bindPopup(`<strong>🟢 Ponto de Origem (Partida):</strong><br>${nomeOrig}`)
          .addTo(window._matrizODLayer);

        // 4. Marcador de Destino (PARA) - Vermelho
        const nomeDest = (item.mun_dest || 'Destino') + (item.est_dest ? `/${item.est_dest}` : '');
        const iconeDest = L.divIcon({
          className: 'od-marker-destino',
          html: `<div style="background:#ef4444; color:#fff; border:2px solid #fff; border-radius:12px; padding:3px 8px; font-size:10px; font-weight:800; box-shadow:0 3px 8px rgba(0,0,0,0.5); white-space:nowrap; display:flex; align-items:center; gap:4px;">
            <span>🏁 PARA:</span> <span>${window.Security ? window.Security.escapeHTML(nomeDest) : nomeDest}</span>
          </div>`,
          iconSize: [130, 24],
          iconAnchor: [12, 12]
        });
        L.marker(latlngDest, { icon: iconeDest, zIndexOffset: 1200 })
          .bindPopup(`<strong>🏁 Ponto de Destino (Chegada):</strong><br>${nomeDest}`)
          .addTo(window._matrizODLayer);

        // 5. Ajusta enquadramento do mapa
        const bounds = linhaDestaque.getBounds();
        if (bounds && bounds.isValid()) {
          mapa.fitBounds(bounds, { padding: [80, 80], maxZoom: 13 });
          setTimeout(() => {
            const popupContent = window.PopupRenderer.gerar(idCamada, item.feature.properties);
            L.popup().setLatLng(bounds.getCenter()).setContent(popupContent).openOn(mapa);
            if (window.UI) {
              window.UI.toast(`📍 Trecho: ${nomeOrig} ➔ ${nomeDest} (${item.extensao ? item.extensao.toFixed(1) + ' km' : ''} · ${item.tempo})`);
            }
          }, 350);
        }
      } catch (e) { console.error("Erro ao localizar:", e); }
    },

    exportarCSV: function () {
      if (!this.dadosFiltrados.length) { if (window.UI) window.UI.toast("⚠️ Nenhum trecho filtrado."); return; }

      let csv = "Hidrovia;Rio;Municipio_Origem;UF_Origem;Municipio_Destino;UF_Destino;Extensao_km;Velocidade_kmh;Tempo_Percurso;Tipo;Eclusa\n";
      this.dadosFiltrados.forEach(d => {
        csv += `"${d.nome}";"${d.rio}";"${d.mun_orig}";"${d.est_orig}";"${d.mun_dest}";"${d.est_dest}";"${d.extensao}";"${d.velocidade}";"${d.tempo}";"${d.tipo}";"${d.eclusa}"\n`;
      });

      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Matriz_VEN_Tempos_${this.anoAtual}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (window.UI) window.UI.toast("💾 Matriz exportada em CSV!");
    }
  };

  window.MatrizVENManager = MatrizVENManager;
  console.info('[js] MatrizVENManager carregado');
})();
/* --- FIM: js/analytics/matriz-ven-manager.js --- */

/* --- INÍCIO: js/analytics/analytics-tku.js --- */
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
/* --- FIM: js/analytics/analytics-tku.js --- */

/* --- INÍCIO: js/io/export-manager.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: ExportManager
   Escopo: exportação GeoJSON e CSV (com respeito a filtros ativos)
   Dependências: window.DADOS_GEOJSON_BRUTOS, window.CONFIG_CAMADAS,
                 window.PortClassification, window.Security,
                 window.UI, window.FilterManager
   Referências "lazy": window.TabelaManager, window.classificarEsfera
   Expõe: window.ExportManager
   ============================================================ */
(function () {
  'use strict';

  const ExportManager = {
    /**
     * Exporta as feições VISÍVEIS de uma camada (respeitando filtros ativos)
     * como um arquivo .geojson para download.
     */
    exportarGeoJSON: async function (idCamada) {
      if (!idCamada) {
        if (window.UI) window.UI.toast('⚠️ Camada inválida para exportação.');
        return;
      }

      // ✅ Carrega sob demanda
      if (!DADOS_GEOJSON_BRUTOS[idCamada]?.features?.length) {
        if (window.UI) window.UI.toast(`⏳ Carregando ${CONFIG_CAMADAS[idCamada]?.nome || idCamada}...`);
        try {
          await window.DataManager.carregarCamada(idCamada);
        } catch (e) {
          if (window.UI) window.UI.toast(`⚠️ Falha ao carregar: ${e.message || e}`);
          return;
        }
      }

      const dados = DADOS_GEOJSON_BRUTOS[idCamada];
      if (!dados || !dados.features || !dados.features.length) {
        if (window.UI) window.UI.toast(`⚠️ Camada "${idCamada}" não tem feições.`);
        return;
      }

      let featuresFiltradas = dados.features;

      // Filtro de portos (por regime)
      if (idCamada === 'instalacoes_portuarias') {
        const filtroPorto = window.FILTRO_PORTO_ATUAL || 'TODOS';
        if (filtroPorto !== 'TODOS') {
          featuresFiltradas = featuresFiltradas.filter(f =>
            window.PortClassification.classificar(f.properties || {}).id === filtroPorto
          );
        }
      }

      // Filtro de UCs (por esfera)
      if (idCamada === 'ucs_todas_mma' && typeof window.classificarEsfera === 'function') {
        const filtroUC = window.FILTRO_UC_ATUAL || 'TODOS';
        if (filtroUC !== 'TODOS') {
          featuresFiltradas = featuresFiltradas.filter(f =>
            window.classificarEsfera(f.properties).id === filtroUC
          );
        }
      }

      // Filtro genérico de esfera (outras camadas com dropdown dinâmico)
      const selSub = document.getElementById('filtro-subtipo-dinamico');
      if (selSub && selSub.value && selSub.value !== 'TODOS' &&
          idCamada !== 'instalacoes_portuarias' && idCamada !== 'ucs_todas_mma' &&
          !idCamada.startsWith('ven_') && !idCamada.startsWith('imp_')) {
        const colunaFiltro = window.FilterManager ? window.FilterManager.colunaEsferaAtiva : null;
        if (colunaFiltro) {
          featuresFiltradas = featuresFiltradas.filter(f =>
            String(f.properties?.[colunaFiltro] || '').trim() === selSub.value
          );
        }
      }

      if (!featuresFiltradas.length) {
        if (window.UI) window.UI.toast(`⚠️ Nenhuma feição corresponde ao filtro ativo.`);
        return;
      }

      const fc = { type: 'FeatureCollection', features: featuresFiltradas };
      const json = JSON.stringify(fc, null, 2);
      const blob = new Blob([json], { type: 'application/geo+json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${idCamada}_${featuresFiltradas.length}_feicoes_${new Date().toISOString().slice(0,10)}.geojson`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const nomeCamada = CONFIG_CAMADAS[idCamada]?.nome || idCamada;
      if (window.UI) window.UI.toast(`💾 GeoJSON exportado: ${featuresFiltradas.length} feições de "${nomeCamada}".`);
    },

    /**
     * Exporta a tabela de atributos aberta (TabelaManager) em CSV.
     */
    exportarCSV: function () {
      const T = window.TabelaManager;
      if (!T || !T.camadaAtualId || !T.filtradas || !T.filtradas.length) {
        if (window.UI) window.UI.toast("⚠️ Nenhum dado na tabela para exportar.");
        return;
      }

      const cols = T.colunas;
      const linhas = [];
      linhas.push(cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'));

      T.filtradas.forEach(f => {
        const p = f.properties || {};
        const row = cols.map(c => {
          const v = p[c] !== undefined && p[c] !== null ? p[c] : '';
          return `"${String(v).replace(/"/g, '""')}"`;
        });
        linhas.push(row.join(';'));
      });

      const csvContent = '\uFEFF' + linhas.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const slug = String(T.camadaAtualId).toLowerCase().replace(/[^a-z0-9]+/g, '_');
      a.href = url;
      a.download = `tabela_${slug}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (window.UI) window.UI.toast(`📥 CSV exportado com ${T.filtradas.length} linhas.`);
    },

    /**
     * Placeholder — planilha Excel oficial do VEN (chamada no card VEN e matriz).
     * TODO: implementar geração .xlsx com SheetJS ou similar.
     */
    baixarPlanilhaExcel: function () {
      if (window.UI) {
        window.UI.toast('📊 Exportação para Excel em desenvolvimento. Use "CSV" como alternativa.');
      }
      console.warn('[ExportManager] baixarPlanilhaExcel() ainda não implementado.');
    }
  };

  window.ExportManager = ExportManager;
  console.info('[js] ExportManager carregado');
})();
/* --- FIM: js/io/export-manager.js --- */

/* --- INÍCIO: js/io/import-manager.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: ImportManager
   Escopo: importação multiformato (GeoJSON, SHP, KML, KMZ, GPKG)
   Dependências: window.Security, window.UI, window.LayerRegistry,
                 window.GeomTypeDetector, window.Styler,
                 window.CONFIG_CAMADAS, window.CAMADAS_MAPA,
                 window.DADOS_GEOJSON_BRUTOS, window.mapa,
                 window.NotificationManager, window.FilterManager,
                 window.GeoJSONValidator
   Referências "lazy": window.ImportManager (auto-referência),
                       window.CopilotoIA, window.SelectionManager
   Expõe: window.ImportManager
   ============================================================ */
(function () {
  'use strict';

  const ImportManager = {
    contador: 0,

    abrirSeletor: function () {
      const inp = document.getElementById('input-import');
      if (inp) inp.click();
    },

    processar: async function (files) {
      if (!files || !files.length) return;

      const fnShp = window.shp || (typeof shp !== 'undefined' ? shp : null);
      const listaArquivos = Array.from(files);
      const gruposShp = {};
      const outrosArquivos = [];

      listaArquivos.forEach(f => {
        const nomeSemExt = f.name.replace(/\.[^.]+$/, '');
        const ext = f.name.toLowerCase().split('.').pop();
        if (['shp', 'dbf', 'shx', 'prj', 'cpg'].includes(ext)) {
          if (!gruposShp[nomeSemExt]) gruposShp[nomeSemExt] = {};
          gruposShp[nomeSemExt][ext] = f;
        } else {
          outrosArquivos.push(f);
        }
      });

      // Shapefiles soltos (.shp + .dbf + .shx + .prj)
      for (const [nomeBase, partes] of Object.entries(gruposShp)) {
        try {
          if (!partes.shp) throw new Error(`Falta .shp para "${nomeBase}"`);
          if (!fnShp) throw new Error("Biblioteca shpjs indisponível.");
          if (window.UI) window.UI.toast(`Decodificando Shapefile: ${nomeBase}...`);

          const shpBuf = await partes.shp.arrayBuffer();
          const dbfBuf = partes.dbf ? await partes.dbf.arrayBuffer() : null;
          const prjTxt = partes.prj ? await partes.prj.text() : null;

          let geojson;
          if (dbfBuf) {
            geojson = await fnShp({ shp: shpBuf, dbf: dbfBuf, prj: prjTxt });
          } else {
            geojson = await fnShp({ shp: shpBuf, prj: prjTxt });
          }

          if (Array.isArray(geojson)) {
            geojson.forEach((g, i) => this._adicionar(`${nomeBase}_${i + 1}`, g));
          } else {
            this._adicionar(nomeBase, geojson);
          }
        } catch (e) {
          console.error(e);
          if (window.UI) window.UI.toast(`⚠️ Falha ao importar "${nomeBase}": ` + e.message);
        }
      }

      // Arquivos únicos
      for (const f of outrosArquivos) {
        try {
          await this.importar(f);
        } catch (e) {
          console.error(e);
          if (window.UI) window.UI.toast('⚠️ Erro na importação: ' + e.message);
        }
      }

      const inp = document.getElementById('input-import');
      if (inp) inp.value = '';
    },

    importar: async function (file) {
      const nome = file.name;
      const ext = nome.toLowerCase().split('.').pop();
      if (window.UI) window.UI.toast(`Processando ${nome}...`);

      let geojson = null;
      const fnShp = window.shp || (typeof shp !== 'undefined' ? shp : null);

      if (ext === 'geojson' || ext === 'json') {
        geojson = JSON.parse(await file.text());
      } else if (ext === 'zip') {
        if (!fnShp) throw new Error('Biblioteca shpjs indisponível.');
        let zipBuffer;
        try { zipBuffer = await file.arrayBuffer(); }
        catch (e) { throw new Error('Não foi possível ler o ZIP.'); }
        if (!zipBuffer || zipBuffer.byteLength === 0) throw new Error('O arquivo ZIP está vazio (0 bytes).');
        const view = new Uint8Array(zipBuffer);
        if (view.length < 4 || view[0] !== 0x50 || view[1] !== 0x4B) {
          throw new Error('O arquivo não é um ZIP válido (assinatura "PK" ausente).');
        }
        geojson = await fnShp(zipBuffer);
      } else if (ext === 'kml') {
        geojson = this._kmlDeTexto(await file.text());
      } else if (ext === 'kmz') {
        geojson = await this._lerKMZ(file);
      } else if (ext === 'gpkg' || ext === 'geopackage') {
        geojson = await this._lerGPKG(file);
      } else {
        throw new Error('Formato não suportado: .' + ext);
      }

      if (Array.isArray(geojson)) {
        for (let i = 0; i < geojson.length; i++) {
          this._adicionar(`${nome.replace(/\.[^.]+$/, '')}_${i + 1}`, geojson[i]);
        }
        return;
      }
      this._adicionar(nome.replace(/\.[^.]+$/, ''), geojson);
    },

    _kmlDeTexto: function (texto) {
      if (typeof toGeoJSON === 'undefined') throw new Error('toGeoJSON indisponível.');
      const dom = new DOMParser().parseFromString(texto, 'text/xml');
      return toGeoJSON.kml(dom);
    },

    _lerKMZ: async function (file) {
      if (typeof JSZip === 'undefined') throw new Error('JSZip indisponível.');
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const alvo = Object.keys(zip.files).find(n => n.toLowerCase().endsWith('.kml'));
      if (!alvo) throw new Error('Nenhum .kml no .kmz');
      return this._kmlDeTexto(await zip.files[alvo].async('string'));
    },

    _lerGPKG: async function (file) {
      const gp = window.GeoPackage || (typeof GeoPackage !== 'undefined' ? GeoPackage : null);
      if (!gp || !gp.GeoPackageAPI) throw new Error('GeoPackage indisponível.');
      try {
        if (typeof gp.setSqljsWasmLocateFile === 'function') {
          gp.setSqljsWasmLocateFile(f => `https://cdn.jsdelivr.net/npm/@ngageoint/geopackage@4.2.3/dist/${f}`);
        }
        const buf = await file.arrayBuffer();
        const gpkg = await gp.GeoPackageAPI.open(new Uint8Array(buf));
        const tabelas = gpkg.getFeatureTables();
        const features = [];
        for (const t of tabelas) {
          const fs = gpkg.queryForGeoJSONFeaturesInTable(t);
          if (fs && fs.length) fs.forEach(f => { f._gpkgTable = t; features.push(f); });
        }
        return { type: 'FeatureCollection', features: features };
      } catch (err) {
        throw new Error('Falha no GeoPackage: ' + (err.message || err));
      }
    },

    _adicionar: function (nome, geojson) {
      let relatorio = null;
      let geojsonValidado = null;

      try {
        const resultado = window.GeoJSONValidator.validar(geojson, nome);
        relatorio = resultado.relatorio;
        geojsonValidado = resultado.geojson;
      } catch (e) {
        console.error('[R2] Falha na validação:', e);
        if (window.UI) window.UI.toast('⚠️ Erro inesperado ao validar. Importação cancelada.');
        return;
      }

      if (!relatorio || !geojsonValidado || relatorio.validas === 0) {
        window.GeoJSONValidator.mostrarRelatorio(relatorio);
        return;
      }

      if (relatorio.invalidas === 0 && relatorio.corrigidas === 0) {
        this._adicionarValidado(nome, geojsonValidado, relatorio);
        return;
      }

      const self = this;
      window.GeoJSONValidator.mostrarRelatorio(relatorio, {
        onProsseguir: function () {
          self._adicionarValidado(nome, geojsonValidado, relatorio);
        }
      });
    },

    _adicionarValidado: function (nome, geojson, relatorio) {
      if (!geojson || !geojson.features || !geojson.features.length) {
        if (window.UI) window.UI.toast('⚠️ Nenhuma feição encontrada em ' + nome);
        return;
      }

      this.contador++;
      const id = `imp_${this.contador}_${window.LayerRegistry.gerarId(nome)}`;

      geojson.features.forEach(f => {
        if (f.properties) {
          for (const [k, v] of Object.entries(f.properties)) {
            if (typeof v === 'string') f.properties[k] = window.Security.repararTexto(v);
          }
        }
      });

      const tipoGeo = window.GeomTypeDetector.detectar(geojson);
      const cor = window.LayerRegistry.corAleatoria();
      const cfg = {
        nome: nome, grupo: 'importadas', arquivos: [], cor: cor,
        opacidade: tipoGeo === 'poligono' ? 0.4 : (tipoGeo === 'linha' ? 0.9 : 0.95),
        peso: tipoGeo === 'ponto' ? 5 : (tipoGeo === 'linha' ? 2.5 : 1.5),
        tipoGeo: tipoGeo, ativa: true, camposVisiveis: []
      };

      CONFIG_CAMADAS[id] = cfg;
      DADOS_GEOJSON_BRUTOS[id] = geojson;
      CAMADAS_MAPA[id] = L.geoJSON(geojson, window.Styler.obterOpcoes(id));
      CAMADAS_MAPA[id].addTo(mapa);

      const grupoEl = document.getElementById('grupo-importadas');
      const msgVazio = document.getElementById('msg-sem-importadas');
      if (msgVazio) msgVazio.style.display = 'none';

      if (grupoEl) {
        grupoEl.classList.remove('fechado');
        if (typeof window.construirItemCamada === 'function') {
          window.construirItemCamada(id, cfg, grupoEl);
        } else if (typeof construirItemCamada === 'function') {
          construirItemCamada(id, cfg, grupoEl);
        }

        const cntBadge = document.getElementById(`cnt-${id}`);
        if (cntBadge) cntBadge.innerText = `(${geojson.features.length})`;

        setTimeout(() => {
          const item = document.getElementById(`item-camada-${id}`);
          if (item) {
            item.style.display = 'flex';
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 50);
      }

      if (window.Styler) window.Styler.atualizarLegenda();
      if (window.FilterManager) window.FilterManager.atualizarSeletorCamadas();

      if (relatorio && (relatorio.invalidas > 0 || relatorio.corrigidas > 0)) {
        window.NotificationManager.show({
          tipo: 'alerta',
          titulo: 'Importação com avisos',
          mensagem: `"${window.Security.escapeHTML(nome)}": <strong>${geojson.features.length}</strong> feições importadas` +
                    (relatorio.invalidas > 0 ? ` · ${relatorio.invalidas} descartada(s)` : '') +
                    (relatorio.corrigidas > 0 ? ` · ${relatorio.corrigidas} corrigida(s)` : ''),
          duracao: 8000,
          acoes: [{ texto: '📋 Ver relatório', fn: () => window.GeoJSONValidator.mostrarRelatorio(relatorio) }]
        });
      } else {
        if (window.UI) window.UI.toast(`✓ ${geojson.features.length} feições (${tipoGeo}) importadas de "${nome}"`);
      }

      try {
        const b = CAMADAS_MAPA[id].getBounds();
        if (b.isValid()) mapa.fitBounds(b, { padding: [40, 40], maxZoom: 14 });
      } catch (e) {}
    }
  };

  window.ImportManager = ImportManager;

  // Drag & drop global
  (function () {
    const dz = document.getElementById('dropzone');
    let dragDepth = 0;
    window.addEventListener('dragenter', e => {
      if (!e.dataTransfer) return;
      dragDepth++; if (dz) dz.classList.add('ativo');
    });
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('dragleave', e => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0 && dz) dz.classList.remove('ativo');
    });
    window.addEventListener('drop', e => {
      e.preventDefault();
      dragDepth = 0;
      if (dz) dz.classList.remove('ativo');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        ImportManager.processar(e.dataTransfer.files);
      }
    });
  })();

  console.info('[js] ImportManager carregado');
})();
/* --- FIM: js/io/import-manager.js --- */

/* --- INÍCIO: js/io/ais-loader.js --- */
/* ============================================================
   M15+M16 — AIS Loader
   Carrega cadastro + posições + programação + viagens + alertas + cruzamento VEN
   ============================================================ */
(function () {
  'use strict';

  const BASE = 'dados/ais/';

  function parseCSV(texto) {
    const linhas = texto.replace(/\r/g, '').split('\n').filter(l => l.trim());
    if (!linhas.length) return [];
    const header = linhas[0].split(',').map(h => h.trim());
    const out = [];
    for (let i = 1; i < linhas.length; i++) {
      const cols = linhas[i].split(',');
      const obj = {};
      header.forEach((h, j) => { obj[h] = (cols[j] ?? '').trim(); });
      out.push(obj);
    }
    return out;
  }

  async function fetchTexto(url) {
    const res = await fetch(url + '?t=' + Date.now());
    if (!res.ok) throw new Error('Falha ao buscar ' + url + ' (' + res.status + ')');
    return res.text();
  }

  const AISLoader = {
    async carregarCadastro() {
      const txt = await fetchTexto(BASE + 'embarcacoes_cadastro.csv');
      const rows = parseCSV(txt);
      const map = new Map();
      rows.forEach(r => {
        const mmsi = parseInt(r.mmsi, 10);
        if (!mmsi) return;
        map.set(mmsi, {
          mmsi,
          imo: r.imo || '',
          nome: r.nome || '',
          tipo_codigo: parseInt(r.tipo_codigo, 10) || 0,
          tipo: r.tipo || 'Desconhecido',
          operador: r.operador || '',
          bandeira: r.bandeira || '',
          comprimento_m: parseFloat(r.comprimento_m) || 0,
          calado_m: parseFloat(r.calado_m) || 0,
          ano_construcao: parseInt(r.ano_construcao, 10) || 0,
          perfil: r.perfil || ''
        });
      });
      return map;
    },

    async carregarPosicoes() {
      const txt = await fetchTexto(BASE + 'posicoes_sinteticas.csv');
      const rows = parseCSV(txt);
      return rows.map(r => ({
        mmsi: parseInt(r.mmsi, 10),
        timestamp: r.timestamp,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        sog: parseFloat(r.sog),
        cog: parseFloat(r.cog),
        heading: parseFloat(r.heading),
        nav_status: parseInt(r.nav_status, 10) || 0,
        porto_origem: r.porto_origem || '',
        porto_destino: r.porto_destino || '',
        porto_proximo: r.porto_proximo || '',
        atraso_h: parseFloat(r.atraso_h) || 0,
        status: r.status || 'no_prazo'
      })).filter(p => !isNaN(p.lat) && !isNaN(p.lon));
    },

    async carregarProgramacao() {
      const txt = await fetchTexto(BASE + 'programacao.csv');
      const rows = parseCSV(txt);
      return rows.map(r => ({
        mmsi: parseInt(r.mmsi, 10),
        nome: r.nome || '',
        ordem: parseInt(r.ordem, 10) || 0,
        porto: r.porto || '',
        eta_programada: r.eta_programada || '',
        etd_programada: r.etd_programada || '',
        duracao_trecho_h: parseFloat(r.duracao_trecho_h) || 0,
        km: parseFloat(r.km) || 0,
        velocidade: parseFloat(r.velocidade) || 0,
        hidrovia: r.hidrovia || ''
      }));
    },

    async carregarViagens() {
      const txt = await fetchTexto(BASE + 'viagens.csv');
      const rows = parseCSV(txt);
      return rows.map(r => ({
        mmsi: parseInt(r.mmsi, 10),
        nome: r.nome || '',
        ordem: parseInt(r.ordem, 10) || 0,
        porto: r.porto || '',
        eta_programada: r.eta_programada || '',
        etd_programada: r.etd_programada || '',
        eta_real: r.eta_real || '',
        etd_real: r.etd_real || '',
        atraso_h: parseFloat(r.atraso_h) || 0,
        atraso_leg_h: parseFloat(r.atraso_leg_h) || 0,
        incidente: r.incidente === '1',
        status: r.status || 'no_prazo',
        km: parseFloat(r.km) || 0,
        hidrovia: r.hidrovia || ''
      }));
    },

    async carregarAlertas() {
      const txt = await fetchTexto(BASE + 'alertas.csv');
      const rows = parseCSV(txt);
      return rows.map(r => ({
        mmsi: parseInt(r.mmsi, 10),
        nome: r.nome || '',
        tipo: r.tipo || '',
        severidade: r.severidade || 'atencao',
        porto: r.porto || '',
        descricao: r.descricao || '',
        timestamp: r.timestamp || '',
        atraso_h: parseFloat(r.atraso_h) || 0
      }));
    },

    /* ============================================================
       M16 — Cruzamento AIS × VEN
       ============================================================ */
    async carregarCruzamento() {
      const txt = await fetchTexto(BASE + 'cruzamento_ven.csv');
      const rows = parseCSV(txt);
      return rows.map(r => ({
        mmsi: parseInt(r.mmsi, 10),
        timestamp: r.timestamp,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        trecho_ven: this._limparNome(r.trecho_ven),
        dist_ven_km: parseFloat(r.distancia_km) || 0,
        classificacao: r.classificacao || 'dentro'
      })).filter(r => !isNaN(r.lat) && !isNaN(r.lon));
    },

    _limparNome(s) {
      if (!s) return '';
      // Corrige U+FFFD (encoding quebrado) nos nomes de hidrovias
      return String(s)
        .replace(/Solim\uFFFDes/g, 'Solimões')
        .replace(/Tapaj\uFFFDFs/g, 'Tapajós')
        .replace(/Tocantins-Araguaia/g, 'Tocantins-Araguaia')
        .replace(/\uFFFD/g, '')
        .trim();
    },

    async carregarManifest() {
      const res = await fetch(BASE + 'manifest_ais.json?t=' + Date.now());
      if (!res.ok) throw new Error('Falha ao ler manifest_ais.json');
      return res.json();
    }
  };

  window.AISLoader = AISLoader;
})();
/* --- FIM: js/io/ais-loader.js --- */

/* --- INÍCIO: js/io/ais-api-connector.js --- */
/* ============================================================
   WebGIS Corporativo ANTAQ — Módulo: AISAPIConnector
   Escopo: Conector Universal de Telemetria AIS Multi-Fornecedor
           Preparado para acordos de cooperação técnica ou fornecimento direto:
             1. ANTAQ / PostGIS Interno (REST / GeoJSON)
             2. Marinha do Brasil / SISTRAM (Intercâmbio Governamental)
             3. MarineTraffic API (PS07 / ExportVessels)
             4. Spire Maritime / Orbcomm / VesselFinder (REST / GraphQL / GeoJSON)
             5. WebSocket Stream em Tempo Real (AISStream / Broker Corporativo)
   Dependências: window.AISManager, window.AISLayer, window.DADOS_GEOJSON_BRUTOS, turf (opcional)
   Expõe: window.AISAPIConnector
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY_AIS = 'antaq_webgis_ais_api_config_v1';

  // Mapeamento oficial ITU-R M.1371 (Ship Type Code) para categorias ANTAQ
  function mapearTipoEmbarcacaoITU(codigoOuTexto) {
    if (!codigoOuTexto) return { codigo: 70, nome: 'Carga Geral' };
    const str = String(codigoOuTexto).trim().toUpperCase();
    const num = parseInt(str, 10);

    if (!isNaN(num)) {
      if (num === 31 || num === 32 || num === 52) return { codigo: num, nome: 'Empurrador / Rebocador' };
      if (num >= 60 && num <= 69) return { codigo: num, nome: 'Passageiros / Travessia' };
      if (num >= 70 && num <= 79) return { codigo: num, nome: 'Cargueiro / Graneleiro' };
      if (num >= 80 && num <= 89) return { codigo: num, nome: 'Petroleiro / Tanque' };
      if (num === 30) return { codigo: num, nome: 'Pesqueiro' };
      if (num >= 50 && num <= 59) return { codigo: num, nome: 'Apoio Portuário / Serviço' };
    }

    if (str.includes('EMPURRADOR') || str.includes('COMBOIO') || str.includes('TUG') || str.includes('PUSHER') || str.includes('BARCA')) {
      return { codigo: 31, nome: 'Empurrador / Comboio' };
    }
    if (str.includes('GRANEL') || str.includes('BULK') || str.includes('SOJA') || str.includes('MINER')) {
      return { codigo: 70, nome: 'Graneleiro' };
    }
    if (str.includes('TANQUE') || str.includes('TANKER') || str.includes('PETROL') || str.includes('OIL') || str.includes('QUIM')) {
      return { codigo: 80, nome: 'Petroleiro / Tanque' };
    }
    if (str.includes('CONT') || str.includes('CONTAINER')) {
      return { codigo: 71, nome: 'Porta-Contêineres' };
    }
    if (str.includes('PASSAG') || str.includes('FERRY') || str.includes('LANCHA') || str.includes('MISTO')) {
      return { codigo: 60, nome: 'Passageiros / Misto' };
    }
    return { codigo: 70, nome: String(codigoOuTexto) };
  }

  const AISAPIConnector = {
    // Configuração ativa
    config: {
      ativo: false,
      provedor: 'LOCAL_CSV', // 'LOCAL_CSV' | 'ANTAQ_REST' | 'SISTRAM_MARINHA' | 'MARINETRAFFIC' | 'SPIRE_MARITIME' | 'WEBSOCKET_STREAM'
      urlPosicoes: '',
      urlCadastro: '',
      wsUrl: '',
      apiKey: '',
      authHeader: 'Authorization', // ou 'X-API-Key'
      intervaloSegundos: 60,
      bboxFiltro: [-74.5, -34.0, -32.0, 6.0], // Bbox padrão Brasil + Águas Jurisdicionais
      calcularCruzamentoVEN: true
    },

    _timerPolling: null,
    _ws: null,
    _estatisticas: {
      ultimaSincronizacao: null,
      mensagensRecebidas: 0,
      embarcacoesAtivas: 0,
      errosConsecutivos: 0,
      statusConexao: 'standby_local'
    },

    init: function () {
      try {
        const salvo = localStorage.getItem(STORAGE_KEY_AIS);
        if (salvo) {
          const parsed = JSON.parse(salvo);
          Object.assign(this.config, parsed);
        }
      } catch (e) {}

      if (this.config.ativo && (this.config.urlPosicoes || this.config.wsUrl)) {
        this.iniciarMonitoramento();
      }
      console.info(`[AISAPIConnector] Pronto (Provedor: ${this.config.provedor})`);
    },

    /**
     * Configura o conector para uma API AIS externa ou institucional da ANTAQ.
     * @param {object} novaConfig
     */
    configurar: function (novaConfig) {
      if (!novaConfig) return this.config;
      Object.assign(this.config, novaConfig);
      try {
        localStorage.setItem(STORAGE_KEY_AIS, JSON.stringify(this.config));
      } catch (e) {}

      this.pararMonitoramento();
      if (this.config.ativo && (this.config.urlPosicoes || this.config.wsUrl)) {
        this.iniciarMonitoramento();
      }
      return this.config;
    },

    /**
     * Normalizador universal: aceita JSON de qualquer fornecedor (ANTAQ, SISTRAM,
     * MarineTraffic, Spire, VesselFinder, GeoJSON ou AISStream) e converte para o
     * esquema canônico do WebGIS ANTAQ.
     */
    normalizarMensagemAIS: function (raw) {
      if (!raw) return null;

      // Suporte a Feature GeoJSON
      const props = (raw.type === 'Feature' && raw.properties) ? raw.properties : raw;
      const geomCoords = (raw.type === 'Feature' && raw.geometry && Array.isArray(raw.geometry.coordinates))
        ? raw.geometry.coordinates
        : null;

      // Suporte a envelope AISStream.io (Message.PositionReport + MetaData)
      const meta = raw.MetaData || raw.metadata || {};
      const posReport = (raw.Message && (raw.Message.PositionReport || raw.Message.StandardClassBPositionReport)) || {};

      const mmsi = parseInt(
        props.mmsi ?? props.MMSI ?? props.userid ?? props.vessel_mmsi ?? meta.MMSI ?? posReport.UserID,
        10
      );
      if (!mmsi || isNaN(mmsi)) return null;

      const lat = parseFloat(
        props.lat ?? props.LAT ?? props.latitude ?? props.LATITUDE ??
        meta.latitude ?? posReport.Latitude ?? (geomCoords ? geomCoords[1] : NaN)
      );
      const lon = parseFloat(
        props.lon ?? props.LON ?? props.lng ?? props.longitude ?? props.LONGITUDE ??
        meta.longitude ?? posReport.Longitude ?? (geomCoords ? geomCoords[0] : NaN)
      );
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

      const sog = parseFloat(props.sog ?? props.SOG ?? props.speed ?? props.SPEED ?? posReport.Sog ?? 0) || 0;
      const cog = parseFloat(props.cog ?? props.COG ?? props.course ?? props.COURSE ?? posReport.Cog ?? 0) || 0;
      const heading = parseFloat(props.heading ?? props.HEADING ?? props.true_heading ?? posReport.TrueHeading ?? cog) || 0;
      const navStatus = parseInt(props.nav_status ?? props.NAVSTAT ?? props.navstat ?? posReport.NavigationalStatus ?? 0, 10) || 0;

      const nome = String(
        props.nome ?? props.shipname ?? props.SHIPNAME ?? props.vessel_name ?? props.name ?? meta.ShipName ?? `MMSI ${mmsi}`
      ).trim();

      const infoTipo = mapearTipoEmbarcacaoITU(
        props.tipo ?? props.shiptype ?? props.SHIPTYPE ?? props.vessel_type ?? props.tipo_codigo
      );

      const timestamp = String(
        props.timestamp ?? props.TIMESTAMP ?? props.last_pos_utc ?? props.time_utc ?? meta.time_utc ?? new Date().toISOString()
      );

      return {
        mmsi,
        imo: String(props.imo ?? props.IMO ?? props.imo_number ?? ''),
        nome,
        tipo_codigo: infoTipo.codigo,
        tipo: infoTipo.nome,
        operador: String(props.operador ?? props.operator ?? props.owner ?? ''),
        bandeira: String(props.bandeira ?? props.flag ?? props.FLAG ?? props.country ?? 'BR'),
        comprimento_m: parseFloat(props.comprimento_m ?? props.length ?? props.LENGTH ?? 0) || 0,
        calado_m: parseFloat(props.calado_m ?? props.draught ?? props.DRAUGHT ?? props.draft ?? 0) || 0,
        timestamp,
        lat,
        lon,
        sog,
        cog,
        heading: heading === 511 ? cog : heading, // 511 = não disponível no padrão NMEA AIS
        nav_status: navStatus,
        porto_origem: String(props.porto_origem ?? props.origin ?? props.last_port ?? ''),
        porto_destino: String(props.porto_destino ?? props.destination ?? props.DESTINATION ?? ''),
        porto_proximo: String(props.porto_proximo ?? props.next_port ?? props.porto_destino ?? ''),
        eta: String(props.eta ?? props.ETA ?? props.eta_programada ?? ''),
        atraso_h: parseFloat(props.atraso_h ?? 0) || 0,
        status: String(props.status ?? 'no_prazo'),
        trecho_ven: String(props.trecho_ven ?? ''),
        dist_ven_km: parseFloat(props.dist_ven_km ?? 0) || 0,
        classificacao: String(props.classificacao ?? 'dentro')
      };
    },

    /**
     * Calcula aderência da posição AIS à malha hidroviária oficial do VEN em tempo real.
     */
    enriquecerComCruzamentoVEN: function (pos) {
      if (!this.config.calcularCruzamentoVEN || typeof turf === 'undefined') return pos;
      if (pos.trecho_ven && pos.dist_ven_km > 0) return pos;

      const brutos = window.DADOS_GEOJSON_BRUTOS || {};
      const venGeojson = brutos['ven_2024'] || brutos['ven_2022'];
      if (!venGeojson || !Array.isArray(venGeojson.features) || !venGeojson.features.length) return pos;

      try {
        const pt = turf.point([pos.lon, pos.lat]);
        let menorDist = Infinity;
        let trechoMaisProximo = '';

        for (let i = 0; i < venGeojson.features.length; i++) {
          const f = venGeojson.features[i];
          if (!f.geometry) continue;
          // Filtro rápido por bbox aproximado (2 graus ~ 220km)
          const coords = f.geometry.coordinates;
          if (Array.isArray(coords) && coords.length > 0) {
            const c0 = Array.isArray(coords[0][0]) ? coords[0][0] : coords[0];
            if (Array.isArray(c0) && (Math.abs(c0[0] - pos.lon) > 3 || Math.abs(c0[1] - pos.lat) > 3)) {
              continue;
            }
          }
          const d = turf.pointToLineDistance(pt, f, { units: 'kilometers' });
          if (d < menorDist) {
            menorDist = d;
            const p = f.properties || {};
            trechoMaisProximo = p.nome_rio || p.NOME_RIO || p.hidrovia || p.mun_origem || 'Trecho VEN';
          }
        }

        if (isFinite(menorDist)) {
          pos.dist_ven_km = Number(menorDist.toFixed(2));
          pos.trecho_ven = trechoMaisProximo;
          pos.classificacao = menorDist <= 2.0 ? 'dentro' : (menorDist <= 5.0 ? 'atencao' : 'fora');
        }
      } catch (e) {}
      return pos;
    },

    /**
     * Busca um lote de posições via HTTP REST (ANTAQ, SISTRAM, MarineTraffic, Spire, etc.)
     */
    buscarLoteREST: async function () {
      if (!this.config.urlPosicoes) {
        throw new Error('URL da API AIS não configurada');
      }

      const headers = { 'Accept': 'application/json' };
      if (this.config.apiKey) {
        if (this.config.authHeader.toLowerCase() === 'authorization') {
          headers['Authorization'] = this.config.apiKey.startsWith('Bearer ')
            ? this.config.apiKey
            : `Bearer ${this.config.apiKey}`;
        } else {
          headers[this.config.authHeader] = this.config.apiKey;
        }
      }

      let url = this.config.urlPosicoes;
      if (this.config.bboxFiltro && Array.isArray(this.config.bboxFiltro) && !url.includes('bbox=')) {
        const sep = url.includes('?') ? '&' : '?';
        url = `${url}${sep}bbox=${this.config.bboxFiltro.join(',')}`;
      }

      const res = await fetch(url, { headers, cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} ao consultar API AIS`);

      const payload = await res.json();

      // Extrai lista de registros independente do envelope do fornecedor
      let listaBruta = [];
      if (Array.isArray(payload)) {
        listaBruta = payload;
      } else if (payload.type === 'FeatureCollection' && Array.isArray(payload.features)) {
        listaBruta = payload.features;
      } else if (Array.isArray(payload.data)) {
        listaBruta = payload.data;
      } else if (Array.isArray(payload.vessels)) {
        listaBruta = payload.vessels;
      } else if (Array.isArray(payload.records)) {
        listaBruta = payload.records;
      }

      const normalizados = [];
      for (let i = 0; i < listaBruta.length; i++) {
        const item = this.normalizarMensagemAIS(listaBruta[i]);
        if (item) {
          this.enriquecerComCruzamentoVEN(item);
          normalizados.push(item);
        }
      }

      this._estatisticas.ultimaSincronizacao = new Date().toISOString();
      this._estatisticas.mensagensRecebidas += normalizados.length;
      this._estatisticas.embarcacoesAtivas = new Set(normalizados.map(n => n.mmsi)).size;
      this._estatisticas.errosConsecutivos = 0;
      this._estatisticas.statusConexao = 'conectado_rest';

      this._injetarNoAISManager(normalizados);
      return normalizados;
    },

    /**
     * Injeta posições recebidas em tempo real dentro do AISManager e atualiza o mapa.
     */
    _injetarNoAISManager: function (registros) {
      if (!window.AISManager || !Array.isArray(registros) || !registros.length) return;

      registros.forEach(reg => {
        // Atualiza cadastro se a embarcação for nova
        if (!window.AISManager._cadastro.has(reg.mmsi)) {
          window.AISManager._cadastro.set(reg.mmsi, {
            mmsi: reg.mmsi,
            imo: reg.imo,
            nome: reg.nome,
            tipo_codigo: reg.tipo_codigo,
            tipo: reg.tipo,
            operador: reg.operador,
            bandeira: reg.bandeira,
            comprimento_m: reg.comprimento_m,
            calado_m: reg.calado_m,
            ano_construcao: 0,
            perfil: reg.tipo
          });
          window.AISManager._tipos[reg.mmsi] = reg.tipo;
        }

        // Adiciona ao histórico de posições e atualiza última posição conhecida
        window.AISManager._posicoes.push(reg);
        const atual = window.AISManager._ultimaPorMmsi.get(reg.mmsi);
        if (!atual || reg.timestamp >= atual.timestamp) {
          window.AISManager._ultimaPorMmsi.set(reg.mmsi, reg);
        }
      });

      window.AISManager._pronto = true;
      if (window.AISManager._visivel && typeof window.AISManager._renderizar === 'function') {
        window.AISManager._renderizar();
      }
      window.dispatchEvent(new CustomEvent('ais:telemetria-atualizada', {
        detail: { recebidos: registros.length, totalBarcos: window.AISManager._cadastro.size }
      }));
    },

    /**
     * Inicia o monitoramento contínuo (via Polling REST ou WebSocket Stream).
     */
    iniciarMonitoramento: function () {
      this.pararMonitoramento();

      if (this.config.provedor === 'WEBSOCKET_STREAM' && this.config.wsUrl) {
        try {
          this._ws = new WebSocket(this.config.wsUrl);
          this._estatisticas.statusConexao = 'conectando_ws';

          this._ws.onopen = () => {
            this._estatisticas.statusConexao = 'conectado_ws';
            console.info('[AISAPIConnector] WebSocket AIS conectado:', this.config.wsUrl);
            if (this.config.apiKey) {
              this._ws.send(JSON.stringify({
                APIKey: this.config.apiKey,
                BoundingBoxes: [[
                  [this.config.bboxFiltro[1], this.config.bboxFiltro[0]],
                  [this.config.bboxFiltro[3], this.config.bboxFiltro[2]]
                ]]
              }));
            }
          };

          this._ws.onmessage = (evt) => {
            try {
              const raw = JSON.parse(evt.data);
              const norm = this.normalizarMensagemAIS(raw);
              if (norm) {
                this.enriquecerComCruzamentoVEN(norm);
                this._estatisticas.mensagensRecebidas++;
                this._estatisticas.ultimaSincronizacao = new Date().toISOString();
                this._injetarNoAISManager([norm]);
              }
            } catch (e) {}
          };

          this._ws.onerror = () => {
            this._estatisticas.statusConexao = 'erro_ws';
          };
        } catch (errWs) {
          console.warn('[AISAPIConnector] Falha ao iniciar WebSocket:', errWs);
        }
        return;
      }

      if (this.config.urlPosicoes) {
        const ms = Math.max(10, Number(this.config.intervaloSegundos) || 60) * 1000;
        this.buscarLoteREST().catch(err => {
          this._estatisticas.errosConsecutivos++;
          this._estatisticas.statusConexao = 'fallback_local';
          console.warn('[AISAPIConnector] Polling inicial falhou (mantendo base local):', err.message);
        });

        this._timerPolling = setInterval(() => {
          this.buscarLoteREST().catch(() => {
            this._estatisticas.errosConsecutivos++;
          });
        }, ms);
      }
    },

    pararMonitoramento: function () {
      if (this._timerPolling) {
        clearInterval(this._timerPolling);
        this._timerPolling = null;
      }
      if (this._ws) {
        try { this._ws.close(); } catch (e) {}
        this._ws = null;
      }
      this._estatisticas.statusConexao = 'standby_local';
    },

    obterStatus: function () {
      return {
        config: this.config,
        estatisticas: this._estatisticas
      };
    }
  };

  AISAPIConnector.init();
  window.AISAPIConnector = AISAPIConnector;
})();
/* --- FIM: js/io/ais-api-connector.js --- */


/* --- INÍCIO: js/domain/ais-manager.js --- */
/* ============================================================
   M15+M16 — AIS Manager
   Cadastro + posições + programação + viagens + alertas + cruzamento VEN
   ============================================================ */
(function () {
  'use strict';

  const AISManager = {
    _pronto: false,
    _carregando: false,
    _cadastro: new Map(),
    _posicoes: [],
    _programacao: [],
    _viagens: [],
    _alertas: [],
    _cruzamento: [],
    _cruzIndex: new Map(),
    _ultimaPorMmsi: new Map(),
    _tipos: {},
    _filtros: {
      tipos: new Set(),
      sogMin: 0,
      sogMax: 100,
      rota: ''
    },
    _visivel: false,
    _modoTrilha: false,

    /* -------------------- Abertura de Aba -------------------- */
    clicarAba() {
      if (window.TabManager && typeof window.TabManager.trocar === 'function') {
        window.TabManager.trocar('ais');
      } else if (window.ControleAIS && typeof window.ControleAIS.abrir === 'function') {
        window.ControleAIS.abrir();
      } else {
        this.toggle();
      }
    },

    /* -------------------- Carregamento -------------------- */
    async carregar() {
      if (this._pronto || this._carregando) return;
      this._carregando = true;

      try {
        if (window.UI) window.UI.toast('📡 Carregando dados AIS...');

        const [cadastro, posicoes, programacao, viagens, alertas, cruzamento, manifest] = await Promise.all([
          window.AISLoader.carregarCadastro(),
          window.AISLoader.carregarPosicoes(),
          window.AISLoader.carregarProgramacao().catch(() => []),
          window.AISLoader.carregarViagens().catch(() => []),
          window.AISLoader.carregarAlertas().catch(() => []),
          window.AISLoader.carregarCruzamento().catch(() => []),
          window.AISLoader.carregarManifest().catch(() => null)
        ]);

        this._cadastro = cadastro;
        this._posicoes = posicoes;
        this._programacao = programacao;
        this._viagens = viagens;
        this._alertas = alertas;
        this._cruzamento = cruzamento;
        this._manifest = manifest;

        // Index do cruzamento: chave = mmsi|timestamp
        this._cruzIndex = new Map();
        cruzamento.forEach(c => {
          const key = c.mmsi + '|' + c.timestamp;
          this._cruzIndex.set(key, c);
        });

        // Enriquece as posições com dados do cruzamento
        this._posicoes.forEach(p => {
          const key = p.mmsi + '|' + p.timestamp;
          const c = this._cruzIndex.get(key);
          if (c) {
            p.trecho_ven = c.trecho_ven;
            p.dist_ven_km = c.dist_ven_km;
            p.classificacao = c.classificacao;
          }
        });

        // Índice: última posição de cada MMSI
        this._ultimaPorMmsi.clear();
        posicoes.forEach(p => {
          const atual = this._ultimaPorMmsi.get(p.mmsi);
          if (!atual || p.timestamp > atual.timestamp) {
            this._ultimaPorMmsi.set(p.mmsi, p);
          }
        });

        // Mapa de tipos para filtros rápidos
        this._tipos = {};
        this._cadastro.forEach((v, k) => { this._tipos[k] = v.tipo; });

        this._pronto = true;
        this._carregando = false;

        if (window.UI) {
          window.UI.toast(
            '✅ AIS: ' + this._cadastro.size + ' barcos · ' +
            this._posicoes.length + ' pts · ' +
            this._viagens.length + ' legs · ' +
            this._alertas.length + ' alertas'
          );
        }
        return true;
      } catch (err) {
        this._carregando = false;
        console.error('[AIS] erro:', err);
        if (window.UI) window.UI.toast('❌ Falha ao carregar AIS: ' + err.message);
        return false;
      }
    },

    /* -------------------- Status geral -------------------- */
    getStatus() {
      return {
        pronto: this._pronto,
        embarcacoes: this._cadastro.size,
        pontos: this._posicoes.length,
        viagens: this._viagens.length,
        alertas: this._alertas.length,
        cruzamento: this._cruzamento.length,
        visivel: this._visivel
      };
    },

    /* -------------------- Cadastro -------------------- */
    getCadastro(mmsi) { return this._cadastro.get(mmsi) || null; },

    /* -------------------- Posições -------------------- */
    getUltimasPosicoes() {
      const out = [];
      this._ultimaPorMmsi.forEach(pos => {
        if (this._passaFiltro(pos)) {
          const cad = this._cadastro.get(pos.mmsi) || {};
          out.push({ ...pos, cadastro: cad });
        }
      });
      return out;
    },

    getTodasPosicoes() { return this._posicoes; },

    getTrilha(mmsi) {
      return this._posicoes
        .filter(p => p.mmsi === mmsi)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    },

    getRotas() {
      const set = new Set();
      this._posicoes.forEach(p => { if (p.rota) set.add(p.rota); });
      return Array.from(set).sort();
    },

    /* -------------------- Viagens / Programação / Alertas -------------------- */
    getViagensPorMmsi(mmsi) {
      return this._viagens
        .filter(v => v.mmsi === mmsi)
        .sort((a, b) => a.ordem - b.ordem);
    },
    getProgramacaoPorMmsi(mmsi) {
      return this._programacao
        .filter(p => p.mmsi === mmsi)
        .sort((a, b) => a.ordem - b.ordem);
    },
    getAlertasPorMmsi(mmsi) {
      return this._alertas
        .filter(a => a.mmsi === mmsi)
        .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    },
    getTodosAlertas() {
      return this._alertas.slice().sort((a, b) => {
        const peso = { critico: 0, atencao: 1, info: 2 };
        const pA = peso[a.severidade] ?? 3;
        const pB = peso[b.severidade] ?? 3;
        if (pA !== pB) return pA - pB;
        return (b.timestamp || '').localeCompare(a.timestamp || '');
      });
    },

    /* ============================================================
       M16 — Cruzamento VEN
       ============================================================ */
    getCorredorStats(mmsi) {
      const pos = this._posicoes.filter(p => p.mmsi === mmsi);
      let dentro = 0, atencao = 0, fora = 0;
      pos.forEach(p => {
        if (p.classificacao === 'dentro') dentro++;
        else if (p.classificacao === 'atencao') atencao++;
        else if (p.classificacao === 'fora') fora++;
      });
      const total = pos.length || 1;
      return {
        total: pos.length,
        dentro, atencao, fora,
        pct_dentro: Math.round((dentro / total) * 100),
        pct_atencao: Math.round((atencao / total) * 100),
        pct_fora: Math.round((fora / total) * 100)
      };
    },

    /** Retorna os trechos VEN que a embarcação usou. */
    getTrechosUsados(mmsi) {
      const set = new Map();
      this._posicoes
        .filter(p => p.mmsi === mmsi && p.trecho_ven)
        .forEach(p => {
          const k = p.trecho_ven;
          set.set(k, (set.get(k) || 0) + 1);
        });
      return [...set.entries()]
        .map(([trecho, pontos]) => ({ trecho, pontos }))
        .sort((a, b) => b.pontos - a.pontos);
    },

    /** Situação atual no corredor (última posição). */
    getCorredorAtual(mmsi) {
      const ultima = this._ultimaPorMmsi.get(mmsi);
      if (!ultima) return null;
      return {
        classificacao: ultima.classificacao || 'dentro',
        trecho_ven: ultima.trecho_ven || '',
        dist_ven_km: ultima.dist_ven_km || 0
      };
    },

    /* -------------------- Status por embarcação -------------------- */
    getStatusPorEmbarcacao() {
      const out = new Map();
      this._cadastro.forEach((cad, mmsi) => {
        const viagens = this.getViagensPorMmsi(mmsi);
        const prog = this.getProgramacaoPorMmsi(mmsi);
        const ultimaViagem = viagens[viagens.length - 1];
        const proxima = prog[viagens.length];

        const atrasoAtual = ultimaViagem?.atraso_h ?? 0;
        const status = ultimaViagem?.status ?? 'no_prazo';

        const corredor = this.getCorredorStats(mmsi);
        const corredorAtual = this.getCorredorAtual(mmsi);

        out.set(mmsi, {
          mmsi,
          nome: cad.nome,
          tipo: cad.tipo,
          perfil: cad.perfil || '',
          status,
          atraso_h: atrasoAtual,
          ultimaViagem,
          proximaParada: proxima ? {
            porto: proxima.porto,
            eta_programada: proxima.eta_programada,
          } : null,
          totalViagens: viagens.length,
          totalAlertas: this._alertas.filter(a => a.mmsi === mmsi).length,
          corredor: corredorAtual,
          corredor_stats: corredor
        });
      });
      return out;
    },

    getResumo() {
      const statusMap = this.getStatusPorEmbarcacao();
      const resumo = {
        total: statusMap.size,
        no_prazo: 0,
        atencao: 0,
        atrasado: 0,
        atraso_medio_h: 0,
        alertas_criticos: 0,
        alertas_atencao: 0,
        total_viagens: this._viagens.length
      };
      let somaAtraso = 0;
      statusMap.forEach(s => {
        resumo[s.status] = (resumo[s.status] || 0) + 1;
        somaAtraso += s.atraso_h;
      });
      resumo.atraso_medio_h = statusMap.size ? (somaAtraso / statusMap.size) : 0;
      this._alertas.forEach(a => {
        if (a.severidade === 'critico') resumo.alertas_criticos++;
        else if (a.severidade === 'atencao') resumo.alertas_atencao++;
      });
      return resumo;
    },

    getKpisPorEmbarcacao(mmsi) {
      const viagens = this.getViagensPorMmsi(mmsi);
      const total = viagens.length || 1;
      let noPrazo = 0, atencao = 0, atrasado = 0;
      let somaAtraso = 0, maxAtraso = 0;
      viagens.forEach(v => {
        if (v.status === 'no_prazo') noPrazo++;
        else if (v.status === 'atencao') atencao++;
        else atrasado++;
        somaAtraso += v.atraso_h;
        maxAtraso = Math.max(maxAtraso, v.atraso_h);
      });
      return {
        total: viagens.length,
        no_prazo: noPrazo,
        atencao,
        atrasado,
        pct_no_prazo: Math.round((noPrazo / total) * 100),
        pct_atencao: Math.round((atencao / total) * 100),
        pct_atrasado: Math.round((atrasado / total) * 100),
        atraso_medio_h: somaAtraso / total,
        atraso_max_h: maxAtraso
      };
    },

    /* -------------------- Filtros -------------------- */
    _passaFiltro(pos) {
      const f = this._filtros;
      if (f.tipos.size > 0) {
        const cad = this._cadastro.get(pos.mmsi);
        if (!cad || !f.tipos.has(cad.tipo)) return false;
      }
      if (pos.sog < f.sogMin || pos.sog > f.sogMax) return false;
      if (f.rota && pos.rota !== f.rota) return false;
      return true;
    },

    setFiltroTipo(tipo, ativo) {
      if (ativo) this._filtros.tipos.add(tipo);
      else this._filtros.tipos.delete(tipo);
      this._renderizar();
    },
    setFiltroSog(min, max) {
      this._filtros.sogMin = Math.max(0, Number(min) || 0);
      this._filtros.sogMax = Math.min(100, Number(max) || 100);
      this._renderizar();
    },
    setFiltroRota(rota) {
      this._filtros.rota = rota || '';
      this._renderizar();
    },
    limparFiltros() {
      this._filtros = { tipos: new Set(), sogMin: 0, sogMax: 100, rota: '' };
      this._renderizar();
    },

    /* -------------------- Visibilidade / modos -------------------- */
    async toggle() {
      if (!this._pronto) {
        const ok = await this.carregar();
        if (!ok) return;
      }
      this._visivel = !this._visivel;
      if (window.AISLayer) {
        this._visivel ? window.AISLayer.mostrar() : window.AISLayer.esconder();
      }
      if (window.UI) {
        window.UI.toast(this._visivel ? '🚢 AIS visível' : '🚢 AIS oculto');
      }
    },

    /* -------------------- Renderização -------------------- */
    _renderizar() {
      if (!this._visivel || !window.AISLayer) return;
      if (this._modoTrilha) {
        window.AISLayer.renderizarTrilhas(this.getTodasPosicoes());
      } else {
        window.AISLayer.renderizar(this.getUltimasPosicoes());
      }
    },

    toggleModoTrilha() {
      this._modoTrilha = !this._modoTrilha;
      if (window.AISLayer) window.AISLayer.limparTrilha();
      this._renderizar();
      if (window.UI) {
        window.UI.toast(this._modoTrilha
          ? '🛤️ Modo trilha'
          : '📍 Modo ponto');
      }
    }
  };

  window.AISManager = AISManager;
})();
/* --- FIM: js/domain/ais-manager.js --- */

/* --- INÍCIO: js/domain/controle-ais.js --- */
/* ============================================================
   M15 — AIS Workspace (3 modos: Monitor · Simulador · Dashboard)
   Substitui controle-ais.js e painel-ais.js
   ============================================================ */
(function () {
  'use strict';

  const CSS_ID = 'ais-workspace-css';

  /* ============================================================
     CSS
     ============================================================ */
  function injetarCSS() {
    ['controle-ais-css', 'controle-ais-css-v2', 'controle-ais-css-v3', 'ais-workspace-css-v1', 'painel-ais-css'].forEach(id => {
      const el = document.getElementById(id);
      if (el && id !== CSS_ID) el.remove();
    });
    if (document.getElementById(CSS_ID)) return;

    const s = document.createElement('style');
    s.id = CSS_ID;
    s.textContent = `
      /* ---------- Painel ---------- */
      .aw-painel {
        position: fixed; top: 88px; right: 10px; bottom: 10px;
        width: 470px; background: rgba(11,25,44,0.97);
        backdrop-filter: blur(10px);
        border: 1px solid #0284c7; border-radius: 12px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.65);
        display: none; flex-direction: column;
        z-index: 1500; color: #f1f5f9;
        font-family: 'Segoe UI', system-ui, sans-serif;
        overflow: hidden;
      }
      .aw-painel.aberto { display: flex; }
      .aw-painel.fullscreen { width: calc(100vw - 20px); left: 10px; }

      /* Header */
      .aw-header {
        padding: 11px 14px; flex-shrink: 0;
        background: linear-gradient(135deg, #061426 0%, #0a2540 100%);
        border-bottom: 1px solid rgba(2,132,199,0.3);
        display: flex; align-items: center; gap: 10px;
      }
      .aw-header-ico { font-size: 18px; }
      .aw-header-txt { flex: 1; min-width: 0; }
      .aw-header-txt strong {
        display: block; font-size: 12.5px; color: #38bdf8;
        font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase;
      }
      .aw-header-txt small { display: block; font-size: 10px; color: #94a3b8; margin-top: 1px; }
      .aw-btn-h {
        background: transparent; border: 1px solid #334155;
        color: #cbd5e1; border-radius: 5px;
        padding: 5px 10px; font-size: 10.5px; font-weight: 700;
        cursor: pointer; font-family: inherit; white-space: nowrap;
        transition: all 0.15s;
      }
      .aw-btn-h:hover { background: #1e293b; color: #f1f5f9; }
      .aw-btn-x {
        background: transparent; border: none; color: #94a3b8;
        font-size: 22px; cursor: pointer; padding: 0 4px; line-height: 1;
      }
      .aw-btn-x:hover { color: #f1f5f9; }

      /* Tabs */
      .aw-tabs { display: flex; background: #061426; border-bottom: 1px solid #1e293b; flex-shrink: 0; }
      .aw-tab {
        flex: 1; padding: 9px 6px; background: transparent; border: none;
        color: #94a3b8; font-family: inherit; font-size: 10.5px;
        font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
        cursor: pointer; transition: all 0.15s; border-bottom: 2px solid transparent;
      }
      .aw-tab:hover { color: #cbd5e1; background: rgba(2,132,199,0.08); }
      .aw-tab.on { color: #38bdf8; border-bottom-color: #38bdf8; background: rgba(2,132,199,0.12); }

      /* Corpo */
      .aw-body { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
      .aw-modo { flex: 1; min-height: 0; display: none; flex-direction: column; overflow: hidden; }
      .aw-modo.on { display: flex; }

      /* ---------- KPIs ---------- */
      .aw-kpis {
        display: grid; grid-template-columns: repeat(4, 1fr);
        gap: 6px; padding: 10px; background: #061426;
        border-bottom: 1px solid #1e293b; flex-shrink: 0;
      }
      .aw-kpi {
        background: linear-gradient(135deg, #0b192c 0%, #0a2540 100%);
        border-radius: 6px; padding: 8px 4px; text-align: center;
        border-left: 3px solid #64748b;
      }
      .aw-kpi.v { border-left-color: #10b981; }
      .aw-kpi.a { border-left-color: #f59e0b; }
      .aw-kpi.r { border-left-color: #ef4444; }
      .aw-kpi-valor { font-size: 20px; font-weight: 800; line-height: 1; margin-bottom: 3px; letter-spacing: -0.5px; }
      .aw-kpi-label { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; font-weight: 700; }

      /* ---------- Filtros ---------- */
      .aw-filtros {
        display: grid; grid-template-columns: 1fr 1fr 1fr 1fr auto;
        gap: 6px; padding: 8px 10px; background: #061426;
        border-bottom: 1px solid #1e293b; flex-shrink: 0;
      }
      .aw-fg { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
      .aw-fg label { font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; font-weight: 700; }
      .aw-fg select, .aw-fg input {
        background: #0b192c; color: #f1f5f9;
        border: 1px solid #1e4976; border-radius: 4px;
        padding: 4px 6px; font-size: 10.5px;
        font-family: inherit; width: 100%; min-width: 0;
      }
      .aw-btn-limpar {
        align-self: end; background: transparent; color: #94a3b8;
        border: 1px solid #334155; border-radius: 4px;
        padding: 4px 9px; font-size: 10.5px; cursor: pointer;
        height: 25px; font-family: inherit;
      }
      .aw-btn-limpar:hover { background: #1e293b; color: #f1f5f9; }

      /* ---------- Listas ---------- */
      .aw-scroll { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
      .aw-secao { display: flex; flex-direction: column; min-height: 0; border-bottom: 1px solid #1e293b; }
      .aw-secao.emb { flex: 0 0 auto; max-height: 32%; }
      .aw-secao.alt { flex: 1 1 auto; }
      .aw-sec-tit {
        padding: 7px 12px; font-size: 10px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.5px;
        color: #cbd5e1; background: #061426;
        display: flex; justify-content: space-between; align-items: center;
        gap: 8px; flex-shrink: 0;
      }
      .aw-badge { background: #1e4976; color: #38bdf8; font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 700; }
      .aw-lista { overflow-y: auto; flex: 1; min-height: 0; }
      .aw-lista::-webkit-scrollbar { width: 6px; }
      .aw-lista::-webkit-scrollbar-thumb { background: #1e4976; border-radius: 3px; }
      .aw-lista.vazio { display: flex; align-items: center; justify-content: center; padding: 20px; color: #64748b; font-size: 11px; text-align: center; }

      /* Item emb */
      .aw-emb { padding: 8px 12px; border-bottom: 1px solid #1e293b; cursor: pointer; transition: background 0.15s; border-left: 3px solid transparent; }
      .aw-emb:hover { background: #0a2540; }
      .aw-emb.sel { background: rgba(2,132,199,0.2); border-left-color: #38bdf8; }
      .aw-emb-nome { font-size: 11.5px; font-weight: 700; color: #f1f5f9; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .aw-tag { font-size: 8.5px; padding: 2px 7px; border-radius: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; }
      .aw-tag.no_prazo { background: rgba(16,185,129,0.2); color: #34d399; }
      .aw-tag.atencao { background: rgba(245,158,11,0.2); color: #fbbf24; }
      .aw-tag.atrasado { background: rgba(239,68,68,0.2); color: #f87171; }
      .aw-emb-info { font-size: 10px; color: #94a3b8; margin-top: 3px; display: flex; gap: 8px; flex-wrap: wrap; }
      .aw-emb-info b { color: #cbd5e1; }

      /* Item alerta */
      .aw-alerta { padding: 8px 12px; border-bottom: 1px solid #1e293b; cursor: pointer; transition: background 0.15s; border-left: 3px solid #64748b; }
      .aw-alerta:hover { background: #0a2540; }
      .aw-alerta.critico { border-left-color: #ef4444; }
      .aw-alerta.atencao { border-left-color: #f59e0b; }
      .aw-alerta-titulo { font-size: 11px; font-weight: 700; color: #f1f5f9; display: flex; justify-content: space-between; gap: 6px; }
      .aw-alerta-tag { font-size: 8.5px; padding: 1px 6px; border-radius: 8px; font-weight: 700; text-transform: uppercase; }
      .aw-alerta.critico .aw-alerta-tag { background: rgba(239,68,68,0.2); color: #f87171; }
      .aw-alerta.atencao .aw-alerta-tag { background: rgba(245,158,11,0.2); color: #fbbf24; }
      .aw-alerta-desc { font-size: 10px; color: #94a3b8; margin-top: 3px; line-height: 1.4; }
      .aw-alerta-data { font-size: 9px; color: #64748b; margin-top: 2px; }

      /* Timeline */
      .aw-timeline { background: #061426; border-top: 1px solid #1e293b; padding: 8px 12px 10px; flex-shrink: 0; }
      .aw-tl-controles { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
      .aw-btn-play { background: #0284c7; color: #fff; border: none; border-radius: 5px; padding: 5px 12px; font-size: 10.5px; font-weight: 700; cursor: pointer; font-family: inherit; }
      .aw-btn-play:hover { background: #0369a1; }
      .aw-btn-play.pausado { background: #f59e0b; }
      .aw-tempo { flex: 1; font-size: 10px; color: #94a3b8; text-align: center; font-variant-numeric: tabular-nums; }
      .aw-vel { background: #0b192c; color: #f1f5f9; border: 1px solid #1e4976; border-radius: 5px; padding: 3px 6px; font-size: 10px; font-family: inherit; cursor: pointer; }
      .aw-slider { width: 100%; accent-color: #38bdf8; }

      /* Detalhe */
      .aw-det-header { padding: 10px 14px; background: #061426; border-bottom: 1px solid #1e293b; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
      .aw-btn-voltar { background: transparent; border: 1px solid #334155; color: #94a3b8; border-radius: 5px; padding: 4px 10px; font-size: 10.5px; cursor: pointer; font-family: inherit; }
      .aw-btn-voltar:hover { background: #1e293b; color: #f1f5f9; }
      .aw-det-nome { flex: 1; font-size: 12.5px; font-weight: 700; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .aw-det-body { flex: 1; overflow-y: auto; padding: 12px; min-height: 0; }
      .aw-det-body::-webkit-scrollbar { width: 6px; }
      .aw-det-body::-webkit-scrollbar-thumb { background: #1e4976; border-radius: 3px; }
      .aw-bloco { background: #061426; border: 1px solid #1e293b; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; }
      .aw-bloco-tit { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; font-weight: 700; margin-bottom: 8px; }
      .aw-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .aw-mini { background: #0b192c; border-radius: 5px; padding: 7px 4px; text-align: center; }
      .aw-mini-v { font-size: 15px; font-weight: 800; }
      .aw-mini-l { font-size: 8.5px; color: #94a3b8; text-transform: uppercase; margin-top: 3px; }
      .aw-linha { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #1e293b; font-size: 11px; }
      .aw-linha:last-child { border-bottom: none; }
      .aw-linha-l { color: #94a3b8; }
      .aw-linha-v { color: #f1f5f9; font-weight: 600; }
      .aw-trecho { padding: 7px 0; border-bottom: 1px solid #1e293b; font-size: 10px; }
      .aw-trecho:last-child { border-bottom: none; }
      .aw-trecho-topo { display: flex; justify-content: space-between; gap: 6px; }
      .aw-trecho-porto { color: #f1f5f9; font-weight: 700; }
      .aw-trecho-dados { display: flex; gap: 10px; margin-top: 3px; color: #94a3b8; font-size: 9.5px; flex-wrap: wrap; }

      /* ---------- Simulador ---------- */
      .aw-sim-body { flex: 1; overflow-y: auto; padding: 12px; min-height: 0; }
      .aw-sim-body::-webkit-scrollbar { width: 6px; }
      .aw-sim-body::-webkit-scrollbar-thumb { background: #1e4976; border-radius: 3px; }
      .aw-sim-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
      .aw-sim-form label { font-size: 9.5px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; font-weight: 700; margin-bottom: 4px; display: block; }
      .aw-sim-form select {
        width: 100%; background: #0b192c; color: #f1f5f9;
        border: 1px solid #1e4976; border-radius: 5px;
        padding: 8px 10px; font-size: 12px; font-family: inherit;
      }
      .aw-btn-rodar {
        width: 100%; background: linear-gradient(135deg, #0284c7, #0369a1);
        color: #fff; border: none; border-radius: 6px;
        padding: 11px 16px; font-size: 12.5px; font-weight: 800;
        cursor: pointer; font-family: inherit;
        letter-spacing: 0.4px; text-transform: uppercase;
        box-shadow: 0 4px 12px rgba(2,132,199,0.4);
        transition: transform 0.1s;
      }
      .aw-btn-rodar:hover { transform: translateY(-1px); }
      .aw-sim-status { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 6px; font-size: 11px; margin-bottom: 10px; }
      .aw-sim-status.ok { background: rgba(16,185,129,0.15); color: #34d399; }
      .aw-sim-status.warn { background: rgba(245,158,11,0.15); color: #fbbf24; }
      .aw-sim-status.err { background: rgba(239,68,68,0.15); color: #f87171; }
      .aw-sim-parada { display: flex; align-items: center; gap: 10px; padding: 9px 12px; background: #061426; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #64748b; }
      .aw-sim-parada.bom { border-left-color: #10b981; }
      .aw-sim-parada.atencao { border-left-color: #f59e0b; }
      .aw-sim-parada.ruim { border-left-color: #ef4444; }
      .aw-sim-idx { width: 26px; height: 26px; border-radius: 50%; background: #1e4976; color: #38bdf8; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0; }
      .aw-sim-parada-info { flex: 1; min-width: 0; }
      .aw-sim-parada-nome { font-size: 11.5px; font-weight: 700; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .aw-sim-parada-horas { font-size: 10px; color: #94a3b8; margin-top: 2px; }
      .aw-sim-parada-tag { font-size: 9px; padding: 2px 8px; border-radius: 10px; font-weight: 700; text-transform: uppercase; flex-shrink: 0; }
      .aw-sim-parada-tag.ok { background: rgba(16,185,129,0.2); color: #34d399; }
      .aw-sim-parada-tag.warn { background: rgba(245,158,11,0.2); color: #fbbf24; }
      .aw-sim-parada-tag.err { background: rgba(239,68,68,0.2); color: #f87171; }

      /* ---------- Dashboard (executivo) ---------- */
      .aw-dash-body { flex: 1; overflow-y: auto; padding: 16px; min-height: 0; }
      .aw-dash-body::-webkit-scrollbar { width: 6px; }
      .aw-dash-body::-webkit-scrollbar-thumb { background: #1e4976; border-radius: 3px; }
      .aw-dash-titulo {
        font-size: 13px; font-weight: 800; color: #38bdf8;
        letter-spacing: 0.3px; text-transform: uppercase; margin-bottom: 4px;
      }
      .aw-dash-sub {
        font-size: 11px; color: #94a3b8; margin-bottom: 14px;
      }
      .aw-dash-kpis {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
        margin-bottom: 16px;
      }
      .aw-dash-kpi {
        background: linear-gradient(135deg, #0b192c 0%, #0a2540 100%);
        border: 1px solid #1e4976; border-radius: 10px;
        padding: 14px; position: relative; overflow: hidden;
      }
      .aw-dash-kpi::before {
        content: ''; position: absolute; left: 0; top: 0; bottom: 0;
        width: 4px; background: #38bdf8;
      }
      .aw-dash-kpi.v::before { background: #10b981; }
      .aw-dash-kpi.a::before { background: #f59e0b; }
      .aw-dash-kpi.r::before { background: #ef4444; }
      .aw-dash-kpi-ico { font-size: 16px; margin-bottom: 4px; }
      .aw-dash-kpi-v {
        font-size: 32px; font-weight: 800; line-height: 1;
        letter-spacing: -1px; margin-bottom: 4px;
      }
      .aw-dash-kpi-l {
        font-size: 10px; text-transform: uppercase;
        letter-spacing: 0.6px; color: #94a3b8; font-weight: 700;
      }
      .aw-dash-kpi-s { font-size: 10px; color: #64748b; margin-top: 4px; }
      .aw-dash-secao {
        background: rgba(6,20,38,0.5);
        border: 1px solid #1e293b; border-radius: 10px;
        padding: 14px; margin-bottom: 12px;
      }
      .aw-dash-sec-tit {
        font-size: 11px; text-transform: uppercase;
        letter-spacing: 0.6px; color: #cbd5e1;
        font-weight: 800; margin-bottom: 10px;
        display: flex; justify-content: space-between; align-items: center;
      }
      .aw-dash-alerta {
        padding: 8px 10px; background: #0b192c;
        border-radius: 6px; margin-bottom: 6px;
        border-left: 3px solid #64748b;
      }
      .aw-dash-alerta.critico { border-left-color: #ef4444; }
      .aw-dash-alerta.atencao { border-left-color: #f59e0b; }
      .aw-dash-alerta-tit {
        font-size: 11px; font-weight: 700; color: #f1f5f9;
        display: flex; justify-content: space-between; gap: 8px;
      }
      .aw-dash-alerta-desc { font-size: 10px; color: #94a3b8; margin-top: 3px; }
      .aw-dash-cards {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 8px;
      }
      .aw-dash-card {
        background: #0b192c; border: 1px solid #1e4976;
        border-radius: 8px; padding: 10px;
        cursor: pointer; transition: all 0.15s;
      }
      .aw-dash-card:hover { transform: translateY(-2px); border-color: #38bdf8; }
      .aw-dash-card-nome {
        font-size: 11px; font-weight: 700; color: #f1f5f9;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        margin-bottom: 5px;
      }
      .aw-dash-card-linha {
        display: flex; justify-content: space-between;
        font-size: 10px; color: #94a3b8; margin-bottom: 2px;
      }
      .aw-dash-card-linha b { color: #cbd5e1; }
    `;
    document.head.appendChild(s);
  }

  /* ============================================================
     OBJETO
     ============================================================ */
  const ControleAIS = {
    _aberto: false,
    _isolarAIS: true,        // ← nova linha
    _camadasSalvas: null,    // ← nova linha
    _modo: 'monitor',         // 'monitor' | 'simulador' | 'dashboard'
    _emb: null,
    _fullscreen: false,
    _filtros: { status: '', tipo: '', perfil: '', corredor: '' },
    _sim: { mmsi: null, rodando: false },
    _tl: {
      playing: false, tAtual: 0, tInicio: 0, tFim: 0,
      vel: 6, _timer: null, _passo: 200, _janela: 24,
      _contexto: 'global'     // 'global' | 'vessel'
    },

    /* ------------------------------------------------------------
       ABRIR / FECHAR
       ------------------------------------------------------------ */
    async abrir() {
      this._camadasSalvas = null;   // ← ADICIONA ESSA LINHA
      if (window.PainelAIS && window.PainelAIS._aberto) {
        window.PainelAIS.fechar();
      }
      injetarCSS();
      this._garantirHTML();

      const p = document.getElementById('aw-painel');
      if (p) { p.classList.add('aberto'); p.style.display = 'flex'; }
      this._aberto = true;
      this._emb = null;
      this._fullscreen = false;

      const pc = document.getElementById('painel-camadas-lateral');
      if (pc) pc.style.display = 'none';
      this._desligarCamadas();
      if (!window.AISManager || !window.AISManager._pronto) {
        if (!window.AISManager) return;
        const ok = await window.AISManager.carregar();
        if (!ok) { if (window.UI) window.UI.toast('❌ Falha ao carregar AIS'); return; }
      }
      if (!window.AISManager._visivel) {
        window.AISManager._visivel = true;
        if (window.AISLayer) window.AISLayer.mostrar();
      }

      this._garantirRangeGlobal();
      this.trocarModo('monitor');

      document.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('ativo', 'ativa', 'active'));
      const btn = document.querySelector('.aba-btn[data-aba="ais"]');
      if (btn) btn.classList.add('ativo');
    },
    _desligarCamadas() {
      if (!this._isolarAIS) return;
      if (!window.CAMADAS_MAPA || !window.mapa) return;

      // Sempre coleta o que está REALMENTE visível agora
      const salvas = [];
      Object.entries(window.CAMADAS_MAPA).forEach(([id, layer]) => {
        if (!layer) return;
        if (window.mapa.hasLayer(layer)) {
          salvas.push(id);
          window.mapa.removeLayer(layer);
        }
      });

      // Faz merge com o que já tinha salvo (nunca perde referência)
      if (this._camadasSalvas && this._camadasSalvas.length) {
        const merged = new Set([...this._camadasSalvas, ...salvas]);
        this._camadasSalvas = [...merged];
      } else {
        this._camadasSalvas = salvas;
      }

      console.log('[AIS] camadas isoladas:', this._camadasSalvas);
    },
    _restaurarCamadas() {
      if (!this._camadasSalvas || !this._camadasSalvas.length) {
        console.log('[AIS] nada para restaurar');
        return;
      }
      if (!window.CAMADAS_MAPA || !window.mapa) return;

      let restauradas = 0;
      this._camadasSalvas.forEach(id => {
        const layer = window.CAMADAS_MAPA[id];
        if (!layer) {
          console.warn('[AIS] layer não existe mais:', id);
          return;
        }
        if (!window.mapa.hasLayer(layer)) {
          layer.addTo(window.mapa);
          restauradas++;
        }
      });

      console.log('[AIS] camadas restauradas:', restauradas, 'de', this._camadasSalvas.length);
      this._camadasSalvas = null;  // limpa SEMPRE, mesmo se restaurou 0
    },

    toggleIsolarAIS() {
      this._isolarAIS = !this._isolarAIS;
      const btn = document.getElementById('aw-btn-isolar');
      if (btn) {
        btn.style.background = this._isolarAIS ? '#0284c7' : 'transparent';
        btn.style.color = this._isolarAIS ? '#fff' : '#cbd5e1';
        btn.title = this._isolarAIS ? 'Camadas isoladas — clique pra manter todas visíveis' : 'Manter todas camadas visíveis';
      }
      if (window.UI) {
        window.UI.toast(this._isolarAIS
          ? '🔒 Camadas isoladas ao abrir AIS'
          : '🔓 Camadas mantidas');
      }
      // Se desligou, restaura as camadas que estavam salvas
      if (!this._isolarAIS && this._camadasSalvas) {
        this._restaurarCamadas();
      }
      // Se ligou e o painel está aberto, isola agora
      if (this._isolarAIS && this._aberto) {
        this._desligarCamadas();
      }
    },
    forcarRestauracao() {
      if (!this._camadasSalvas || !this._camadasSalvas.length) {
        if (window.UI) window.UI.toast('ℹ️ Nenhuma camada para restaurar');
        return;
      }
      this._restaurarCamadas();
      if (window.UI) window.UI.toast('🔄 Camadas restauradas');
    },
    limparVisualizacao() {
      if (window.AISLayer) window.AISLayer.limparTrilha();
      if (this._emb) {
        this._emb = null;
        this._mostrarPrincipal();
        this.renderMonitor();
        this._contextoGlobal();
        this._atualizarFrame();
      }
      if (window.UI) window.UI.toast('🧹 Visualização limpa');
    },
    fechar() {
      this._pausar();
      this._restaurarCamadas();
      const p = document.getElementById('aw-painel');
      if (p) { p.classList.remove('aberto', 'fullscreen'); p.style.display = 'none'; }
      const pc = document.getElementById('painel-camadas-lateral');
      if (pc) pc.style.display = '';

      if (window.AISManager && window.AISManager._visivel) {
        window.AISManager._visivel = false;
        if (window.AISLayer) window.AISLayer.esconder();
      }
      this._garantirRangeGlobal();
      this.trocarModo('monitor');

      this._aberto = false;
      this._emb = null;
      this._fullscreen = false;
    },

    /* ------------------------------------------------------------
       MODO
       ------------------------------------------------------------ */
    trocarModo(modo) {
      this._modo = modo;
      document.querySelectorAll('.aw-tab').forEach(t => t.classList.toggle('on', t.dataset.modo === modo));
      document.querySelectorAll('.aw-modo').forEach(m => m.classList.toggle('on', m.dataset.modo === modo));

      const tl = document.getElementById('aw-timeline');
      if (tl) tl.style.display = (modo === 'dashboard') ? 'none' : '';

      const p = document.getElementById('aw-painel');
      if (p) p.classList.toggle('fullscreen', modo === 'dashboard' && this._fullscreen);

      if (modo === 'monitor') {
        this._contextoGlobal();
        this.renderMonitor();
        this._atualizarFrame();
      } else if (modo === 'simulador') {
        this._renderSimuladorForm();
        const selEmb = document.getElementById('aw-sim-emb');
        if (selEmb && selEmb.value) {
          this._simMudarEmb();
        }
      } else if (modo === 'dashboard') {
        this._renderDashboard();
      }
    },

    toggleFullscreen() {
      this._fullscreen = !this._fullscreen;
      const p = document.getElementById('aw-painel');
      if (p) p.classList.toggle('fullscreen', this._fullscreen);
      if (window.mapa && window.mapa.invalidateSize) {
        setTimeout(() => window.mapa.invalidateSize(), 150);
      }
    },

    _contextoGlobal() {
      this._tl._contexto = 'global';
      this._emb = null;
      this._sim.rodando = false;
      this._tl._passo = 200;
      this._garantirRangeGlobal();
    },

    /* ------------------------------------------------------------
       HTML
       ------------------------------------------------------------ */
    _garantirHTML() {
      if (document.getElementById('aw-painel')) return;
      const el = document.createElement('div');
      el.id = 'aw-painel';
      el.className = 'aw-painel';
      el.innerHTML = `
        <div class="aw-header">
          <span class="aw-header-ico">🎛️</span>
          <div class="aw-header-txt">
            <strong>AIS · Monitoramento</strong>
            <small>Embarcações · Amazônia Legal</small>
          </div>
          <button class="aw-btn-h" id="aw-btn-isolar" onclick="ControleAIS.toggleIsolarAIS()" title="Camadas isoladas ao abrir AIS" style="background:#0284c7;color:#fff;">🔒</button>
          <button class="aw-btn-h" onclick="ControleAIS.limparVisualizacao()" title="Limpar trilhas do mapa">🧹</button>
          <button class="aw-btn-h" onclick="ControleAIS.forcarRestauracao()" title="Forçar restauração de camadas">🔄</button>
          <button class="aw-btn-h" onclick="ControleAIS.toggleFullscreen()" id="aw-btn-full" title="Alternar tela cheia">⛶</button>
          <button class="aw-btn-h" onclick="ControleAIS.exportarCSV()" title="Exportar CSV">⬇ CSV</button>
          <button class="aw-btn-x" onclick="ControleAIS.fechar(); if(window.TabManager) TabManager.trocar('mapa');" title="Fechar">&times;</button>
        </div>

        <div class="aw-tabs">
          <button class="aw-tab on" data-modo="monitor" onclick="ControleAIS.trocarModo('monitor')">📋 Monitor</button>
          <button class="aw-tab" data-modo="simulador" onclick="ControleAIS.trocarModo('simulador')">🚢 Simulador</button>
          <button class="aw-tab" data-modo="dashboard" onclick="ControleAIS.trocarModo('dashboard')">📊 Dashboard</button>
        </div>

        <div class="aw-body">
          <!-- MODO MONITOR -->
          <div class="aw-modo on" data-modo="monitor">
            <div id="aw-principal" style="display:flex;flex-direction:column;flex:1;min-height:0;">
              <div class="aw-kpis" id="aw-kpis"></div>
<div class="aw-filtros">
  <div class="aw-fg"><label>Status</label>
    <select id="aw-filtro-status" onchange="ControleAIS.aplicarFiltros()">
      <option value="">Todos</option>
      <option value="no_prazo">🟢 No prazo</option>
      <option value="atencao">🟡 Atenção</option>
      <option value="atrasado">🔴 Atrasado</option>
    </select>
  </div>
  <div class="aw-fg"><label>Tipo</label>
    <select id="aw-filtro-tipo" onchange="ControleAIS.aplicarFiltros()">
      <option value="">Todos</option>
      <option value="Carga Geral">Carga Geral</option>
      <option value="Passageiros">Passageiros</option>
      <option value="Tanque">Tanque</option>
    </select>
  </div>
  <div class="aw-fg"><label>Perfil</label>
    <select id="aw-filtro-perfil" onchange="ControleAIS.aplicarFiltros()">
      <option value="">Todos</option>
      <option value="pontual">Pontual</option>
      <option value="regular">Regular</option>
      <option value="irregular">Irregular</option>
      <option value="problematica">Problemática</option>
    </select>
  </div>
<div class="aw-fg">
  <label title="Filtra pela distância até os trechos VEN (onde houve movimentação de carga nas safras 2022/2024)">
    Vias Navegadas (VEN) <span style="cursor:help;color:#38bdf8;">ⓘ</span>
  </label>
  <select id="aw-filtro-corredor" onchange="ControleAIS.aplicarFiltros()"
          title="🟢 Em trecho VEN: até 2 km de trecho com navegação de carga comprovada&#10;🟡 Próximo: 2 a 5 km — nas margens do trecho VEN&#10;🔴 Fora: mais de 5 km — sem histórico de carga no local">
    <option value="">Todos</option>
    <option value="dentro">🟢 Em trecho VEN</option>
    <option value="atencao">🟡 Próximo ao trecho</option>
    <option value="fora">🔴 Fora do trecho</option>
  </select>
</div>
  <button class="aw-btn-limpar" onclick="ControleAIS.limparFiltros()">Limpar</button>
    <button class="aw-btn-limpar" onclick="ControleAIS.limparFiltros()">Limpar</button>
</div>
<div class="aw-legenda-corredor" style="display:flex;gap:14px;align-items:center;
     padding:6px 12px;background:#0a1424;border-bottom:1px solid #1e293b;
     font-size:9.5px;color:#94a3b8;flex-shrink:0;">
  <span style="color:#64748b;font-weight:700;letter-spacing:0.4px;">VIAS NAVEGADAS (VEN):</span>
  <span><span style="color:#10b981;">●</span> Em trecho &lt; 2 km</span>
  <span><span style="color:#f59e0b;">●</span> Próximo 2–5 km</span>
  <span><span style="color:#ef4444;">●</span> Fora &gt; 5 km</span>
  <span style="margin-left:auto;font-style:italic;color:#64748b;">
    Trechos com movimentação de carga registrada nas safras VEN (2022 · 2024)
  </span>
</div>
</div>
              <div class="aw-scroll">
                <div class="aw-secao emb">
                  <div class="aw-sec-tit"><span>🚢 Embarcações</span><span class="aw-badge" id="aw-total-emb">0</span></div>
                  <div class="aw-lista" id="aw-lista-emb"></div>
                </div>
                <div class="aw-secao alt">
                  <div class="aw-sec-tit"><span>⚠️ Alertas</span><span class="aw-badge" id="aw-total-alt">0</span></div>
                  <div class="aw-lista" id="aw-lista-alt"></div>
                </div>
              </div>
            </div>
            <div id="aw-detalhe" style="display:none;flex-direction:column;flex:1;min-height:0;"></div>
          </div>

          <!-- MODO SIMULADOR -->
          <div class="aw-modo" data-modo="simulador">
            <div class="aw-sim-body" id="aw-sim-body"></div>
          </div>

          <!-- MODO DASHBOARD -->
          <div class="aw-modo" data-modo="dashboard">
            <div class="aw-dash-body" id="aw-dash-body"></div>
          </div>
        </div>

        <!-- TIMELINE -->
        <div class="aw-timeline" id="aw-timeline">
          <div class="aw-tl-controles">
            <button id="aw-btn-play" class="aw-btn-play" onclick="ControleAIS.togglePlay()">▶ Play</button>
            <span id="aw-tempo" class="aw-tempo">—</span>
            <select id="aw-vel" class="aw-vel" onchange="ControleAIS.setVel(this.value)">
              <option value="1">1h/s</option>
              <option value="6" selected>6h/s</option>
              <option value="24">1 dia/s</option>
              <option value="84">3,5 dias/s</option>
            </select>
          </div>
          <input type="range" id="aw-slider" min="0" max="1000" value="0"
                 oninput="ControleAIS.seek(this.value)" class="aw-slider">
        </div>
      `;
      document.body.appendChild(el);
    },

    /* ============================================================
       MODO MONITOR
       ============================================================ */
    renderMonitor() {
      if (!this._aberto || this._modo !== 'monitor') return;
      if (this._emb) {
        this._renderDetalhe(this._emb);
      } else {
        this._mostrarPrincipal();
        this._renderKpis();
        this._renderEmb();
        this._renderAlertas();
      }
    },

    _mostrarPrincipal() {
      const p = document.getElementById('aw-principal');
      const d = document.getElementById('aw-detalhe');
      if (p) p.style.display = 'flex';
      if (d) d.style.display = 'none';
    },
    _mostrarDetalhe() {
      const p = document.getElementById('aw-principal');
      const d = document.getElementById('aw-detalhe');
      if (p) p.style.display = 'none';
      if (d) d.style.display = 'flex';
    },

    _renderKpis() {
      const el = document.getElementById('aw-kpis');
      if (!el) return;
      const sm = window.AISManager.getStatusPorEmbarcacao();
      const ok = this._mmsisFiltrados();
      let total = 0, v = 0, a = 0, r = 0;
      sm.forEach(s => {
        if (!ok.has(s.mmsi)) return;
        total++;
        if (s.status === 'no_prazo') v++;
        else if (s.status === 'atencao') a++;
        else r++;
      });
      el.innerHTML = `
        <div class="aw-kpi"><div class="aw-kpi-valor" style="color:#38bdf8;">${total}</div><div class="aw-kpi-label">Total</div></div>
        <div class="aw-kpi v"><div class="aw-kpi-valor" style="color:#34d399;">${v}</div><div class="aw-kpi-label">No prazo</div></div>
        <div class="aw-kpi a"><div class="aw-kpi-valor" style="color:#fbbf24;">${a}</div><div class="aw-kpi-label">Atenção</div></div>
        <div class="aw-kpi r"><div class="aw-kpi-valor" style="color:#f87171;">${r}</div><div class="aw-kpi-label">Atrasado</div></div>
      `;
    },

    _renderEmb() {
      const el = document.getElementById('aw-lista-emb');
      const badge = document.getElementById('aw-total-emb');
      if (!el) return;
      const sm = window.AISManager.getStatusPorEmbarcacao();
      const ok = this._mmsisFiltrados();
      const list = [...sm.values()].filter(s => ok.has(s.mmsi)).sort((a, b) => b.atraso_h - a.atraso_h);
      if (badge) badge.innerText = list.length;
      if (!list.length) { el.className = 'aw-lista vazio'; el.innerHTML = 'Nenhuma embarcação'; return; }
      el.className = 'aw-lista';
      const L = { no_prazo: 'No prazo', atencao: 'Atenção', atrasado: 'Atrasado' };
      el.innerHTML = list.map(s => {
        const at = s.atraso_h > 0
          ? `<span style="color:${s.atraso_h > 2 ? '#f87171' : '#fbbf24'};">+${s.atraso_h.toFixed(1)}h</span>`
          : '<span style="color:#34d399;">0h</span>';
        const sel = this._emb === s.mmsi ? 'sel' : '';
        const cls = s.corredor?.classificacao || 'dentro';
        const clsIco = cls === 'dentro' ? '🟢' : cls === 'atencao' ? '🟡' : '🔴';
        const clsLabel = cls === 'dentro' ? 'Em trecho VEN' : cls === 'atencao' ? 'Próximo' : 'Fora do VEN';
        return `<div class="aw-emb ${sel}" onclick="ControleAIS.selecionar(${s.mmsi})">
  <div class="aw-emb-nome">
    <span>${this._esc(s.nome)}</span>
    <span class="aw-tag ${s.status}">${L[s.status]}</span>
  </div>
  <div class="aw-emb-info">
    <span>Atraso: ${at}</span>
    <span>Alertas: <b>${s.totalAlertas}</b></span>
    <span>Pernas: <b>${s.totalViagens}</b></span>
  </div>
  <div class="aw-emb-info" style="margin-top:3px;">
    <span title="${clsLabel}">${clsIco} <b>${this._esc(s.corredor?.trecho_ven || '—')}</b></span>
  </div>
</div>`;
      }).join('');
    },

    _renderAlertas() {
      const el = document.getElementById('aw-lista-alt');
      const badge = document.getElementById('aw-total-alt');
      if (!el) return;
      const ok = this._mmsisFiltrados();
      const alt = window.AISManager.getTodosAlertas().filter(a => ok.has(a.mmsi));
      if (badge) badge.innerText = alt.length;
      if (!alt.length) { el.className = 'aw-lista vazio'; el.innerHTML = 'Nenhum alerta'; return; }
      el.className = 'aw-lista';
      const L = { atraso: 'Atraso', parada_nao_prevista: 'Parada', desempenho_baixo: 'Desempenho' };
      el.innerHTML = alt.slice(0, 40).map(a => `
        <div class="aw-alerta ${a.severidade}" onclick="ControleAIS.selecionar(${a.mmsi})">
          <div class="aw-alerta-titulo"><span>${this._esc(a.nome)}</span><span class="aw-alerta-tag">${L[a.tipo] || a.tipo}</span></div>
          <div class="aw-alerta-desc">${this._esc(a.descricao)}</div>
          <div class="aw-alerta-data">🕒 ${this._fmt(a.timestamp)}</div>
        </div>`).join('');
    },

    selecionar(mmsi) {
      if (this._emb === mmsi) {
        this._emb = null;
        this._mostrarPrincipal();
        this.renderMonitor();
        this._atualizarMapa();
        this._contextoGlobal();
        this._atualizarFrame();
        if (window.AISLayer) window.AISLayer.limparTrilha();
        return;
      }
      this._emb = mmsi;
      this._mostrarDetalhe();
      this._renderDetalhe(mmsi);
      this._atualizarMapa();
      this._rangeVessel(mmsi);
      this._atualizarFrame();
      if (window.AISLayer) window.AISLayer._destacarTrilha(mmsi);
    },

    _renderDetalhe(mmsi) {
      const el = document.getElementById('aw-detalhe');
      if (!el) return;
      const cad = window.AISManager.getCadastro(mmsi) || {};
      const s = window.AISManager.getStatusPorEmbarcacao().get(mmsi) || {};
      const k = window.AISManager.getKpisPorEmbarcacao(mmsi);
      const vg = window.AISManager.getViagensPorMmsi(mmsi);
      const al = window.AISManager.getAlertasPorMmsi(mmsi);
      const L = { no_prazo: 'No prazo', atencao: 'Atenção', atrasado: 'Atrasado' };

      const trechos = vg.slice(0, 40).map(v => `
        <div class="aw-trecho">
          <div class="aw-trecho-topo">
            <span class="aw-trecho-porto">${this._esc(v.porto)}</span>
            <span class="aw-tag ${v.status}">${L[v.status] || v.status}</span>
          </div>
          <div class="aw-trecho-dados">
            <span>Prev: ${this._fmt(v.eta_programada)}</span>
            <span>Real: ${this._fmt(v.eta_real)}</span>
            <span>Atraso: +${(v.atraso_h || 0).toFixed(1)}h</span>
          </div>
        </div>`).join('');

      const alertasHTML = al.length
        ? al.map(a => `<div class="aw-alerta ${a.severidade}" style="cursor:default;">
            <div class="aw-alerta-titulo"><span>${this._esc(a.tipo)}</span><span class="aw-alerta-tag">${a.severidade}</span></div>
            <div class="aw-alerta-desc">${this._esc(a.descricao)}</div>
            <div class="aw-alerta-data">🕒 ${this._fmt(a.timestamp)}</div>
          </div>`).join('')
        : '<div style="color:#64748b;font-size:11px;padding:8px 0;">Nenhum alerta</div>';

      el.innerHTML = `
        <div class="aw-det-header">
          <button class="aw-btn-voltar" onclick="ControleAIS.selecionar(${mmsi})">← Voltar</button>
          <div class="aw-det-nome">${this._esc(cad.nome || 'MMSI ' + mmsi)}</div>
        </div>
        <div class="aw-det-body">
          <div class="aw-bloco">
            <div class="aw-bloco-tit">Identificação</div>
            <div class="aw-linha"><span class="aw-linha-l">MMSI</span><span class="aw-linha-v">${mmsi}</span></div>
            <div class="aw-linha"><span class="aw-linha-l">Tipo</span><span class="aw-linha-v">${this._esc(cad.tipo || '-')}</span></div>
            <div class="aw-linha"><span class="aw-linha-l">Perfil</span><span class="aw-linha-v">${this._esc(cad.perfil || '-')}</span></div>
            <div class="aw-linha"><span class="aw-linha-l">Status</span><span class="aw-tag ${s.status || ''}">${L[s.status] || '-'}</span></div>
          </div>
          <div class="aw-bloco">
            <div class="aw-bloco-tit">Desempenho</div>
            <div class="aw-grid3">
              <div class="aw-mini"><div class="aw-mini-v" style="color:#34d399;">${k.pct_no_prazo}%</div><div class="aw-mini-l">No prazo</div></div>
              <div class="aw-mini"><div class="aw-mini-v" style="color:#fbbf24;">${k.pct_atencao}%</div><div class="aw-mini-l">Atenção</div></div>
              <div class="aw-mini"><div class="aw-mini-v" style="color:#f87171;">${k.pct_atrasado}%</div><div class="aw-mini-l">Atrasado</div></div>
            </div>
            <div class="aw-linha" style="margin-top:8px;"><span class="aw-linha-l">Atraso médio</span><span class="aw-linha-v">${k.atraso_medio_h.toFixed(1)}h</span></div>
            <div class="aw-linha"><span class="aw-linha-l">Atraso máximo</span><span class="aw-linha-v">${k.atraso_max_h.toFixed(1)}h</span></div>
            <div class="aw-linha"><span class="aw-linha-l">Total de pernas</span><span class="aw-linha-v">${k.total}</span></div>
          </div>
          <div class="aw-bloco">
            <div class="aw-bloco-tit">Pernas da viagem</div>
            ${trechos || '<div style="color:#64748b;font-size:11px;">Sem pernas</div>'}
          </div>
          <div class="aw-bloco">
          ${this._blocoCorredorHTML(mmsi)}
          <div class="aw-bloco">
            <div class="aw-bloco-tit">Alertas (${al.length})</div>
            ${alertasHTML}
          </div>
        </div>`;
    },

    _blocoCorredorHTML(mmsi) {
      const stats = window.AISManager.getCorredorStats(mmsi);
      const atual = window.AISManager.getCorredorAtual(mmsi);
      const trechos = window.AISManager.getTrechosUsados(mmsi);

      if (!atual) {
        return `<div class="aw-bloco">
      <div class="aw-bloco-tit">Vias Economicamente Navegadas (VEN)</div>
      <div style="color:#64748b;font-size:11px;">Sem dados de VEN</div>
    </div>`;
      }

      const cls = atual.classificacao;
      const clsLabel = cls === 'dentro' ? 'EM TRECHO COM CARGA REGISTRADA'
        : cls === 'atencao' ? 'PRÓXIMO À MARGEM DO TRECHO'
          : 'FORA DOS TRECHOS VEN';
      const clsCor = cls === 'dentro' ? '#34d399'
        : cls === 'atencao' ? '#fbbf24' : '#f87171';

      const trechosHTML = trechos.length
        ? trechos.map(t => `
        <div class="aw-linha">
          <span class="aw-linha-l">${this._esc(t.trecho)}</span>
          <span class="aw-linha-v">${t.pontos} pts</span>
        </div>`).join('')
        : '<div style="color:#64748b;font-size:11px;">Sem trechos identificados</div>';

      return `
    <div class="aw-bloco">
      <div class="aw-bloco-tit">📍 Onde esta embarcação está navegando?</div>

      <div style="background:rgba(30,73,118,0.4); border-left:3px solid #38bdf8;
                  padding:10px 12px; border-radius:6px; margin-bottom:12px;
                  font-size:11px; color:#cbd5e1; line-height:1.6;">
        <b style="color:#38bdf8;">O que é VEN?</b><br>
        Vias Economicamente Navegadas são os <b>trechos de rio por onde
        efetivamente circularam cargas</b> nas safras oficiais da ANTAQ
        (nesta base: <b>2022 e 2024</b>). Não é uma classificação oficial
        de hidrovia — é o <b>registro histórico de onde houve movimentação
        comercial</b>.
      </div>

      <div style="font-size:10.5px; color:#94a3b8; margin-bottom:8px;
                  text-transform:uppercase; letter-spacing:0.4px; font-weight:700;">
        Situação atual
      </div>
      <div style="background:${clsCor}; color:#0f172a; font-size:10.5px;
                  font-weight:800; letter-spacing:0.4px;
                  padding:7px 10px; border-radius:6px;
                  margin-bottom:12px; text-align:center;">
        ${clsLabel}
      </div>

      <div class="aw-linha">
        <span class="aw-linha-l">Trecho com carga mais próximo</span>
        <span class="aw-linha-v">${this._esc(atual.trecho_ven || '—')}</span>
      </div>
      <div class="aw-linha">
        <span class="aw-linha-l">Distância até esse trecho</span>
        <span class="aw-linha-v">${(atual.dist_ven_km || 0).toFixed(2)} km</span>
      </div>

      <div style="background:#0b192c; border:1px solid #1e293b;
                  border-radius:6px; padding:8px 10px; margin-top:10px;
                  font-size:10px; color:#94a3b8; line-height:1.5;">
        <b style="color:#cbd5e1;">Como ler a distância:</b><br>
        <span style="color:#34d399;">●</span> Até 2 km &nbsp;→&nbsp; <b style="color:#cbd5e1;">Em trecho VEN</b> (navegando onde há carga registrada)<br>
        <span style="color:#fbbf24;">●</span> 2 a 5 km &nbsp;→&nbsp; <b style="color:#cbd5e1;">Próximo</b> (na margem do trecho VEN)<br>
        <span style="color:#f87171;">●</span> Acima de 5 km &nbsp;→&nbsp; <b style="color:#cbd5e1;">Fora do VEN</b> (sem registro de carga no local)
      </div>

      <div class="aw-bloco-tit" style="margin-top:14px;">Histórico de uso das vias</div>
      <div class="aw-grid3">
        <div class="aw-mini"><div class="aw-mini-v" style="color:#34d399;">${stats.pct_dentro}%</div><div class="aw-mini-l">Em trecho</div></div>
        <div class="aw-mini"><div class="aw-mini-v" style="color:#fbbf24;">${stats.pct_atencao}%</div><div class="aw-mini-l">Próx. margem</div></div>
        <div class="aw-mini"><div class="aw-mini-v" style="color:#f87171;">${stats.pct_fora}%</div><div class="aw-mini-l">Fora</div></div>
      </div>

      <div class="aw-bloco-tit" style="margin-top:14px;">Trechos navegados</div>
      ${trechosHTML}
    </div>`;
    },

    /* ============================================================
       MODO SIMULADOR
       ============================================================ */
    _renderSimuladorForm() {
      const body = document.getElementById('aw-sim-body');
      if (!body) return;
      const sm = window.AISManager.getStatusPorEmbarcacao();
      const lista = [...sm.values()].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

      body.innerHTML = `
    <div class="aw-bloco">
      <div class="aw-bloco-tit">Configurar viagem</div>
      <div class="aw-sim-form">
        <div>
          <label>Embarcação</label>
          <select id="aw-sim-emb" onchange="ControleAIS._simMudarEmb()">
            <option value="">— Selecione —</option>
            ${lista.map(s => `<option value="${s.mmsi}">${this._esc(s.nome)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Porto de origem</label>
          <select id="aw-sim-origem" onchange="ControleAIS._simAtualizarDestinos()">
            <option value="">— Selecione a embarcação primeiro —</option>
          </select>
        </div>
        <div>
          <label>Porto de destino</label>
          <select id="aw-sim-destino">
            <option value="">— Selecione a origem primeiro —</option>
          </select>
        </div>
        <button class="aw-btn-rodar" onclick="ControleAIS.rodarSimulacao()">
          ▶ Simular viagem
        </button>
      </div>
    </div>
    <div id="aw-sim-resultado"></div>
  `;
    },

    _simMudarEmb() {
      const sel = document.getElementById('aw-sim-emb');
      const selO = document.getElementById('aw-sim-origem');
      const selD = document.getElementById('aw-sim-destino');
      const r = document.getElementById('aw-sim-resultado');
      if (r) r.innerHTML = '';
      if (!sel || !selO || !selD) return;

      const mmsi = parseInt(sel.value, 10);
      selO.innerHTML = '<option value="">— Selecione —</option>';
      selD.innerHTML = '<option value="">— Selecione a origem primeiro —</option>';
      if (!mmsi) {
        selO.innerHTML = '<option value="">— Selecione a embarcação primeiro —</option>';
        this._emb = null;
        this._sim.mmsi = null;
        this._sim.rodando = false;
        if (window.AISLayer) window.AISLayer.limparTrilha();
        this._atualizarFrame();
        return;
      }

      this._emb = mmsi;
      this._sim.mmsi = mmsi;
      this._sim.rodando = false;

      const viagens = window.AISManager.getViagensPorMmsi(mmsi);
      const portos = [];
      const vistos = new Set();
      viagens.forEach(v => {
        if (v.porto && !vistos.has(v.porto)) {
          vistos.add(v.porto);
          portos.push(v.porto);
        }
      });

      selO.innerHTML = '<option value="">— Selecione —</option>' +
        portos.map(p => `<option value="${this._esc(p)}">${this._esc(p)}</option>`).join('');

      // ✅ Isola a embarcação no mapa imediatamente ao selecionar no dropdown
      if (window.AISLayer) {
        window.AISLayer.destacar(mmsi);
        window.AISLayer._destacarTrilha(mmsi);
        const m = window.AISLayer._markers.get(mmsi);
        if (m && window.mapa) {
          window.mapa.setView(m.getLatLng(), 8);
        }
      }
      this._atualizarFrame();
    },
    _simAtualizarDestinos() {
      const selO = document.getElementById('aw-sim-origem');
      const selD = document.getElementById('aw-sim-destino');
      if (!selO || !selD) return;
      const origem = selO.value;
      const mmsi = parseInt(document.getElementById('aw-sim-emb').value, 10);
      if (!origem || !mmsi) {
        selD.innerHTML = '<option value="">— Selecione a origem primeiro —</option>';
        return;
      }

      const viagens = window.AISManager.getViagensPorMmsi(mmsi);
      const portos = [];
      const vistos = new Set();
      viagens.forEach(v => {
        if (v.porto && v.porto !== origem && !vistos.has(v.porto)) {
          vistos.add(v.porto);
          portos.push(v.porto);
        }
      });

      selD.innerHTML = '<option value="">— Selecione —</option>' +
        portos.map(p => `<option value="${this._esc(p)}">${this._esc(p)}</option>`).join('');
    },

    _rangeVesselTrecho(mmsi, legs) {
      if (!legs || !legs.length) return;
      const tIni = new Date(legs[0].eta_real || legs[0].eta_programada).getTime();
      const tFim = new Date(legs[legs.length - 1].eta_real || legs[legs.length - 1].eta_programada).getTime();
      if (!tIni || !tFim) return;
      this._tl.tInicio = Math.min(tIni, tFim);
      this._tl.tFim = Math.max(tIni, tFim);
      this._tl.tAtual = this._tl.tInicio;
      this._tl._contexto = 'vessel';
    },
        _obterCoordPorto(nome) {
      if (!nome) return null;
      const PORTOS_COORD = {
        'JURUTI': [-2.1523, -56.0951],
        'ÓBIDOS': [-1.9027, -55.5312],
        'OBIDOS': [-1.9027, -55.5312],
        'SANTARÉM': [-2.4150, -54.7375],
        'SANTAREM': [-2.4150, -54.7375],
        'PARINTINS': [-2.6241, -56.7341],
        'ITACOATIARA': [-3.1518, -58.4404],
        'MANAUS': [-3.1375, -60.0261],
        'MONTE ALEGRE': [-2.0095, -54.0703],
        'PRAINHA': [-1.8080, -53.4785],
        'ALMEIRIM': [-1.5325, -52.5769],
        'GURUPÁ': [-1.4050, -51.6400],
        'GURUPA': [-1.4050, -51.6400],
        'BREVES': [-1.6733, -50.4989],
        'BELÉM': [-1.4453, -48.4978],
        'BELEM': [-1.4453, -48.4978],
        'PORTO VELHO': [-8.7489, -63.9153],
        'HUMAITÁ': [-7.5043, -63.0198],
        'HUMAITA': [-7.5043, -63.0198],
        'TABATINGA': [-4.2314, -69.9439],
        'BENJAMIN CONSTANT': [-4.3732, -70.0284],
        'SÃO PAULO DE OLIVENÇA': [-3.4643, -68.9511],
        'SAO PAULO DE OLIVENCA': [-3.4643, -68.9511],
        'AMATURÁ': [-3.3596, -68.1957],
        'AMATURA': [-3.3596, -68.1957],
        'SANTO ANTÔNIO DO IÇÁ': [-3.1076, -67.9461],
        'SANTO ANTONIO DO ICA': [-3.1076, -67.9461],
        'TONANTINS': [-2.8737, -67.8000],
        'FONTE BOA': [-2.5114, -66.0921],
        'JUTAÍ': [-2.7400, -66.7600],
        'JUTAI': [-2.7400, -66.7600]
      };

      const chave = nome.split('/')[0].split('-')[0].trim().toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      for (const [k, v] of Object.entries(PORTOS_COORD)) {
        const kNorm = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (chave === kNorm || chave.includes(kNorm) || kNorm.includes(chave)) {
          return v;
        }
      }

      if (window.DADOS_GEOJSON_BRUTOS && window.DADOS_GEOJSON_BRUTOS['instalacoes_portuarias']) {
        const feats = window.DADOS_GEOJSON_BRUTOS['instalacoes_portuarias'].features || [];
        for (const f of feats) {
          const p = f.properties || {};
          const c = String(p.cidade || p.municipio || p.nome || '').toUpperCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (c.includes(chave) && f.geometry && f.geometry.coordinates) {
            return [f.geometry.coordinates[1], f.geometry.coordinates[0]];
          }
        }
      }
      return null;
    },

    _obterRotaPeloVEN(origem, destino) {
      const safraAtiva = (window.VENUnifiedManager && window.VENUnifiedManager.anoAtivo) || 'ven_2024';
      const dadosVEN = (window.DADOS_GEOJSON_BRUTOS && (window.DADOS_GEOJSON_BRUTOS[safraAtiva] || window.DADOS_GEOJSON_BRUTOS['ven_2024'] || window.DADOS_GEOJSON_BRUTOS['ven_2022']));
      if (!dadosVEN || !dadosVEN.features || !dadosVEN.features.length) return null;

      const pOrig = this._obterCoordPorto(origem);
      const pDest = this._obterCoordPorto(destino);
      if (!pOrig || !pDest) return null;

      const lines = [];
      dadosVEN.features.forEach(f => {
        if (!f.geometry || !f.geometry.coordinates) return;
        const g = f.geometry;
        if (g.type === 'MultiLineString') {
          g.coordinates.forEach(c => { if (c && c.length >= 2) lines.push(c); });
        } else if (g.type === 'LineString') {
          if (g.coordinates && g.coordinates.length >= 2) lines.push(g.coordinates);
        }
      });
      if (!lines.length) return null;

      // Grade com arredondamento a ~1.1km para garantir conectividade entre trechos
      const ptKey = (p) => (Math.round(p[0] * 100) / 100) + ',' + (Math.round(p[1] * 100) / 100);

      const adj = new Map();
      lines.forEach((l, idx) => {
        const k0 = ptKey(l[0]);
        const k1 = ptKey(l[l.length - 1]);
        if (!adj.has(k0)) adj.set(k0, []);
        if (!adj.has(k1)) adj.set(k1, []);
        adj.get(k0).push({ viz: k1, idx, rev: false });
        adj.get(k1).push({ viz: k0, idx, rev: true });
      });

      const acharNoMaisProximo = (lat, lon) => {
        let melhorK = null, menorDist = Infinity;
        for (const k of adj.keys()) {
          const parts = k.split(',').map(Number);
          const nLon = parts[0], nLat = parts[1];
          const d = Math.hypot(nLat - lat, nLon - lon);
          if (d < menorDist) {
            menorDist = d;
            melhorK = k;
          }
        }
        return melhorK;
      };

      const kOrig = acharNoMaisProximo(pOrig[0], pOrig[1]);
      const kDest = acharNoMaisProximo(pDest[0], pDest[1]);
      if (!kOrig || !kDest || kOrig === kDest) return null;

      const queue = [[kOrig, []]];
      const visited = new Set([kOrig]);
      let edgesCaminho = null;

      while (queue.length > 0) {
        const [curr, path] = queue.shift();
        if (curr === kDest) {
          edgesCaminho = path;
          break;
        }
        const vizinhos = adj.get(curr) || [];
        for (const e of vizinhos) {
          if (!visited.has(e.viz)) {
            visited.add(e.viz);
            queue.push([e.viz, [...path, e]]);
          }
        }
      }

      if (!edgesCaminho || !edgesCaminho.length) return null;

      const coordsFinais = [[pOrig[0], pOrig[1]]];
      edgesCaminho.forEach(e => {
        const l = lines[e.idx];
        const pts = e.rev ? l.slice().reverse() : l;
        pts.forEach(p => {
          coordsFinais.push([p[1], p[0]]);
        });
      });
      coordsFinais.push([pDest[0], pDest[1]]);

      const rotaLimpa = [];
      coordsFinais.forEach((pt, i) => {
        if (i === 0) { rotaLimpa.push(pt); return; }
        const ult = rotaLimpa[rotaLimpa.length - 1];
        if (Math.hypot(pt[0] - ult[0], pt[1] - ult[1]) > 0.0001) {
          rotaLimpa.push(pt);
        }
      });

      return rotaLimpa.map(pt => ({ lat: pt[0], lon: pt[1] }));
    },
_extrairPontosRota(mmsi, orig, dest) {
      if (!window.AISManager) return null;
      const todas = window.AISManager.getTodasPosicoes().filter(p => p.mmsi === mmsi);
      if (!todas.length) return null;

      const edges = new Map();
      const adjacency = new Map();

      todas.forEach(p => {
        const o = p.porto_origem;
        const d = p.porto_destino;
        if (o && d) {
          const k = o + '|' + d;
          if (!edges.has(k)) edges.set(k, []);
          edges.get(k).push(p);

          if (!adjacency.has(o)) adjacency.set(o, new Set());
          if (!adjacency.has(d)) adjacency.set(d, new Set());
          adjacency.get(o).add(d);
          adjacency.get(d).add(o);
        }
      });

      const queue = [[orig]];
      const visited = new Set([orig]);
      let path = null;

      while (queue.length > 0) {
        const curPath = queue.shift();
        const node = curPath[curPath.length - 1];
        if (node === dest) {
          path = curPath;
          break;
        }
        const vizinhos = adjacency.get(node) || [];
        for (const nbr of vizinhos) {
          if (!visited.has(nbr)) {
            visited.add(nbr);
            queue.push([...curPath, nbr]);
          }
        }
      }

      if (!path || path.length < 2) return null;

      const finalPts = [];
      for (let i = 0; i < path.length - 1; i++) {
        const pA = path[i];
        const pB = path[i + 1];
        const kDirect = pA + '|' + pB;
        const kRev = pB + '|' + pA;

        if (edges.has(kDirect)) {
          const pts = edges.get(kDirect).slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          finalPts.push(...pts);
        } else if (edges.has(kRev)) {
          const pts = edges.get(kRev).slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          finalPts.push(...pts.reverse());
        }
      }

      return finalPts.length ? finalPts : null;
    },

    rodarSimulacao() {
      const embSel = document.getElementById('aw-sim-emb');
      const origSel = document.getElementById('aw-sim-origem');
      const destSel = document.getElementById('aw-sim-destino');
      if (!embSel || !origSel || !destSel) return;

      const mmsi = parseInt(embSel.value, 10);
      const origem = origSel.value;
      const destino = destSel.value;

      if (!mmsi) { if (window.UI) window.UI.toast('⚠️ Escolha a embarcação'); return; }
      if (!origem) { if (window.UI) window.UI.toast('⚠️ Escolha a origem'); return; }
      if (!destino) { if (window.UI) window.UI.toast('⚠️ Escolha o destino'); return; }
      if (origem === destino) { if (window.UI) window.UI.toast('⚠️ Origem e destino iguais'); return; }

      const todasViagens = window.AISManager.getViagensPorMmsi(mmsi);
      const idxOrig = todasViagens.findIndex(v => v.porto === origem);
      const idxDest = todasViagens.findIndex(v => v.porto === destino);
      if (idxOrig < 0 || idxDest < 0) {
        if (window.UI) window.UI.toast('❌ Rota não encontrada'); return;
      }

      // Pega o trecho origem → destino (com reverso se necessário)
      let legs;
      if (idxOrig <= idxDest) {
        legs = todasViagens.slice(idxOrig, idxDest + 1);
      } else {
        legs = todasViagens.slice(idxDest, idxOrig + 1).reverse();
      }

      const totalKm = legs.reduce((s, v) => s + (v.km || 0), 0);
      const somaAtraso = legs.reduce((s, v) => s + (v.atraso_h || 0), 0);
      const atrasoMedio = legs.length ? somaAtraso / legs.length : 0;
      const atrasoMax = Math.max(...legs.map(v => v.atraso_h || 0));

      const nPrazo = legs.filter(v => v.status === 'no_prazo').length;
      const nAtencao = legs.filter(v => v.status === 'atencao').length;
      const nAtrasado = legs.filter(v => v.status === 'atrasado').length;
      const pctPrazo = Math.round((nPrazo / legs.length) * 100);

      let statusClass = 'ok', statusMsg = 'Viagem dentro do planejado';
      if (nAtrasado / legs.length > 0.5) {
        statusClass = 'err';
        statusMsg = `${nAtrasado} de ${legs.length} pernas em atraso`;
      } else if (nAtrasado + nAtencao > legs.length * 0.3) {
        statusClass = 'warn';
        statusMsg = `${nAtrasado + nAtencao} de ${legs.length} pernas com desvio`;
      }

      const paradasHTML = legs.map((v, i) => {
        const tag = v.status === 'no_prazo' ? 'ok' : v.status === 'atencao' ? 'warn' : 'err';
        const ico = { no_prazo: '✓', atencao: '⚠️', atrasado: '✕' }[v.status];
        return `
      <div class="aw-sim-parada ${tag}">
        <div class="aw-sim-idx">${i + 1}</div>
        <div class="aw-sim-parada-info">
          <div class="aw-sim-parada-nome">${this._esc(v.porto)}</div>
          <div class="aw-sim-parada-horas">
            Prev: ${this._fmt(v.eta_programada)} · Real: ${this._fmt(v.eta_real)}
          </div>
        </div>
        <span class="aw-sim-parada-tag ${tag}">${ico} +${(v.atraso_h || 0).toFixed(1)}h</span>
      </div>`;
      }).join('');

      // 1. Tenta extrair a rota oficial diretamente sobre o eixo geométrico contínuo do VEN (ANTAQ)
      let posTrecho = this._obterRotaPeloVEN(origem, destino);

      // 2. Se não encontrar pelo VEN, usa fallback pelo grafo do AIS
      if (!posTrecho || posTrecho.length < 2) {
        posTrecho = this._extrairPontosRota(mmsi, origem, destino);
      }

      // 2. Se não encontrar pelo grafo direto, usa filtragem por nomes de portos ou trilha
      if (!posTrecho || posTrecho.length < 2) {
        const nomesPortos = new Set(legs.map(l => (l.porto || '').toLowerCase()));
        posTrecho = window.AISManager.getTodasPosicoes().filter(p => {
          if (p.mmsi !== mmsi) return false;
          return nomesPortos.has((p.porto_origem || '').toLowerCase()) ||
                 nomesPortos.has((p.porto_destino || '').toLowerCase());
        });
      }
      if (!posTrecho || posTrecho.length < 2) {
        posTrecho = window.AISManager.getTrilha(mmsi);
      }

      // 3. Garante orientação geográfica dos pontos (do porto de origem para o destino)
      const refOrig = (window.Security && typeof window.Security.obterCoordPorto === 'function')
        ? window.Security.obterCoordPorto(origem) : null;
      if (refOrig && posTrecho.length >= 2) {
        const dInicio = Math.hypot(posTrecho[0].lat - refOrig[0], posTrecho[0].lon - refOrig[1]);
        const dFim = Math.hypot(posTrecho[posTrecho.length - 1].lat - refOrig[0], posTrecho[posTrecho.length - 1].lon - refOrig[1]);
        if (dFim < dInicio) {
          posTrecho.reverse();
        }
      }

      // 4. Constrói pontos com linha do tempo proporcional à distância percorrida
      const distancias = [0];
      let distAcumulada = 0;
      for (let i = 1; i < posTrecho.length; i++) {
        const d = Math.hypot(posTrecho[i].lat - posTrecho[i - 1].lat, posTrecho[i].lon - posTrecho[i - 1].lon) * 111.32;
        distAcumulada += d;
        distancias.push(distAcumulada);
      }
      const distTotalTrecho = distAcumulada > 0 ? distAcumulada : (totalKm || 50);

      const baseTempo = new Date('2026-09-28T08:00:00Z').getTime();
      const duracaoTotalHoras = Math.max(2, (totalKm || 50) / 22); // velocidade comercial de ~22 km/h
      const duracaoTotalMs = duracaoTotalHoras * 3600 * 1000;

      // Calibragem precisa do tempo real da simulação (solicitada pelo usuário):
      // ~5s para trechos curtos/médios até 10-12s para viagens longas/distantes
      const tempoAnimacaoSegundos = Math.max(5.0, Math.min(12.0, 5.0 + (distTotalTrecho / 120.0)));

      const body = document.getElementById('aw-sim-resultado');
      if (!body) return;

      body.innerHTML = `
    <div class="aw-bloco">
      <div class="aw-bloco-tit">Resumo da viagem</div>
      <div class="aw-sim-status ${statusClass}">
        <span>${statusClass === 'ok' ? '✅' : statusClass === 'warn' ? '⚠️' : '🚨'}</span>
        <span>${statusMsg}</span>
      </div>
      <div class="aw-grid3">
        <div class="aw-mini"><div class="aw-mini-v" style="color:#38bdf8;">${legs.length}</div><div class="aw-mini-l">Paradas</div></div>
        <div class="aw-mini"><div class="aw-mini-v" style="color:#fbbf24;">${atrasoMedio.toFixed(1)}h</div><div class="aw-mini-l">Atraso médio</div></div>
        <div class="aw-mini"><div class="aw-mini-v" style="color:#f87171;">${atrasoMax.toFixed(1)}h</div><div class="aw-mini-l">Atraso máx</div></div>
      </div>
      <div class="aw-linha" style="margin-top:8px;"><span class="aw-linha-l">Origem</span><span class="aw-linha-v">${this._esc(origem)}</span></div>
      <div class="aw-linha"><span class="aw-linha-l">Destino</span><span class="aw-linha-v">${this._esc(destino)}</span></div>
      <div class="aw-linha"><span class="aw-linha-l">Distância</span><span class="aw-linha-v">${totalKm.toFixed(0)} km</span></div>
      <div class="aw-linha"><span class="aw-linha-l">% no prazo</span><span class="aw-linha-v" style="color:#34d399;">${pctPrazo}%</span></div>
    </div>

    <div class="aw-bloco">
      <div class="aw-bloco-tit">Rota · ${legs.length} paradas</div>
      ${paradasHTML}
    </div>

    <div class="aw-bloco">
      <div class="aw-bloco-tit">Animação cadenciada</div>
      <div style="font-size:11px;color:#94a3b8;line-height:1.5;">
        Duração calibrada: <b style="color:#38bdf8;">5s a 12s</b> (~${tempoAnimacaoSegundos.toFixed(0)}s para este trecho de ${totalKm.toFixed(0)} km).<br>
        Controle o barco com <b style="color:#cbd5e1;">⏸ Pausar</b> / <b style="color:#cbd5e1;">▶ Play</b> ou mova o controle deslizante.
      </div>
    </div>
  `;

      const pontosAnimados = posTrecho.map((p, i) => {
        const progressoDist = distancias[i] / (distAcumulada || 1);
        const tPonto = baseTempo + progressoDist * duracaoTotalMs;
        let cog = p.cog || 0;
        if (i < posTrecho.length - 1) {
          const prox = posTrecho[i + 1];
          const rad = Math.PI / 180;
          const dLon = (prox.lon - p.lon) * rad;
          const y = Math.sin(dLon) * Math.cos(prox.lat * rad);
          const x = Math.cos(p.lat * rad) * Math.sin(prox.lat * rad) -
                    Math.sin(p.lat * rad) * Math.cos(prox.lat * rad) * Math.cos(dLon);
          cog = Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360);
        } else if (i > 0) {
          cog = posTrecho[i - 1].cog || 0;
        }

        return {
          mmsi: mmsi,
          lat: Number(p.lat),
          lon: Number(p.lon),
          timestamp: new Date(tPonto).toISOString(),
          sog: 12.0,
          cog: cog,
          heading: cog,
          status: 'no_prazo',
          porto_origem: origem,
          porto_destino: destino
        };
      });

      this._pausar();
      this._emb = mmsi;
      this._sim.mmsi = mmsi;
      this._sim.rodando = true;
      this._sim.legs = legs;
      this._sim.posicoes = pontosAnimados;
      this._sim.duracaoTotalHoras = duracaoTotalHoras;
      this._sim.tempoAnimacaoSegundos = tempoAnimacaoSegundos;

      // Configura a timeline para durar exatamente tempoAnimacaoSegundos segundos reais
      this._tl.tInicio = baseTempo;
      this._tl.tFim = baseTempo + duracaoTotalMs;
      this._tl.tAtual = baseTempo;
      this._tl.vel = duracaoTotalHoras / tempoAnimacaoSegundos; // horas simuladas por segundo real
      this._tl._passo = 50; // 50ms por quadro = 20 fps fluido e contínuo
      this._tl._contexto = 'vessel';

      const selVel = document.getElementById('aw-vel');
      if (selVel) {
        let optSim = selVel.querySelector('option[value="sim_calibrada"]');
        if (!optSim) {
          optSim = document.createElement('option');
          optSim.value = 'sim_calibrada';
          selVel.prepend(optSim);
        }
        optSim.innerText = 'Cadenciado (~' + Math.round(tempoAnimacaoSegundos) + 's)';
        optSim.selected = true;
      }

      if (window.AISLayer && typeof window.AISLayer.destacarRotaSimulada === 'function') {
        window.AISLayer.destacarRotaSimulada(mmsi, pontosAnimados, origem, destino);
      } else if (window.AISLayer) {
        window.AISLayer._destacarTrilha(mmsi);
      }

      // Renderiza primeiro frame com o barco exatamente no porto de origem
      this._atualizarFrame();

      // Inicia imediatamente a animação de deslocamento do navio no mapa
      this._play();

      if (window.UI) window.UI.toast(`▶ Simulando viagem: ${origem} ➔ ${destino}`);
    },

    /* ============================================================
       MODO DASHBOARD (executivo)
       ============================================================ */
    _renderDashboard() {
      const el = document.getElementById('aw-dash-body');
      if (!el) return;
      const r = window.AISManager.getResumo();
      const alertas = window.AISManager.getTodosAlertas();
      const statusMap = window.AISManager.getStatusPorEmbarcacao();
      const lista = [...statusMap.values()].sort((a, b) => b.atraso_h - a.atraso_h);

      const pctPrazo = r.total ? Math.round((r.no_prazo / r.total) * 100) : 0;
      const atrasoMedio = (r.atraso_medio_h || 0).toFixed(1);

      const alertasTop = alertas.slice(0, 6).map(a => `
        <div class="aw-dash-alerta ${a.severidade}">
          <div class="aw-dash-alerta-tit">
            <span>${this._esc(a.nome)}</span>
            <span style="font-size:9px;color:${a.severidade === 'critico' ? '#f87171' : '#fbbf24'};">
              ${a.tipo}
            </span>
          </div>
          <div class="aw-dash-alerta-desc">${this._esc(a.descricao)}</div>
        </div>
      `).join('');

      const cardsEmb = lista.map(s => `
        <div class="aw-dash-card" onclick="ControleAIS._irParaMonitor(${s.mmsi})">
          <div class="aw-dash-card-nome" title="${this._esc(s.nome)}">${this._esc(s.nome)}</div>
          <span class="aw-tag ${s.status}">${s.status === 'no_prazo' ? 'No prazo' : s.status === 'atencao' ? 'Atenção' : 'Atrasado'}</span>
          <div style="margin-top:6px;">
            <div class="aw-dash-card-linha"><span>Atraso</span><b>+${s.atraso_h.toFixed(1)}h</b></div>
            <div class="aw-dash-card-linha"><span>Alertas</span><b>${s.totalAlertas}</b></div>
          </div>
        </div>
      `).join('');

      el.innerHTML = `
        <div class="aw-dash-titulo">📊 Sala de Situação · AIS</div>
        <div class="aw-dash-sub">Monitoramento de embarcações na Amazônia Legal · Gerência de Estudos e Projetos Hidroviários</div>

        <div class="aw-dash-kpis">
          <div class="aw-dash-kpi">
            <div class="aw-dash-kpi-ico">🚢</div>
            <div class="aw-dash-kpi-v" style="color:#38bdf8;">${r.total}</div>
            <div class="aw-dash-kpi-l">Embarcações</div>
            <div class="aw-dash-kpi-s">em monitoramento</div>
          </div>
          <div class="aw-dash-kpi v">
            <div class="aw-dash-kpi-ico">🟢</div>
            <div class="aw-dash-kpi-v" style="color:#34d399;">${r.no_prazo}</div>
            <div class="aw-dash-kpi-l">No prazo</div>
            <div class="aw-dash-kpi-s">${pctPrazo}% da frota</div>
          </div>
          <div class="aw-dash-kpi a">
            <div class="aw-dash-kpi-ico">🟡</div>
            <div class="aw-dash-kpi-v" style="color:#fbbf24;">${r.atencao}</div>
            <div class="aw-dash-kpi-l">Atenção</div>
            <div class="aw-dash-kpi-s">desvio de 0,5–2h</div>
          </div>
          <div class="aw-dash-kpi r">
            <div class="aw-dash-kpi-ico">🔴</div>
            <div class="aw-dash-kpi-v" style="color:#f87171;">${r.atrasado}</div>
            <div class="aw-dash-kpi-l">Atrasado</div>
            <div class="aw-dash-kpi-s">+2h do previsto</div>
          </div>
          <div class="aw-dash-kpi a">
            <div class="aw-dash-kpi-ico">⏱️</div>
            <div class="aw-dash-kpi-v">${atrasoMedio}<span style="font-size:16px;color:#94a3b8;">h</span></div>
            <div class="aw-dash-kpi-l">Atraso médio</div>
            <div class="aw-dash-kpi-s">por embarcação</div>
          </div>
          <div class="aw-dash-kpi r">
            <div class="aw-dash-kpi-ico">🚨</div>
            <div class="aw-dash-kpi-v" style="color:#f87171;">${r.alertas_criticos}</div>
            <div class="aw-dash-kpi-l">Alertas críticos</div>
            <div class="aw-dash-kpi-s">${r.alertas_atencao} de atenção</div>
          </div>
        </div>

        <div class="aw-dash-secao">
          <div class="aw-dash-sec-tit">
            <span>⚠️ O que exige ação agora</span>
            <span style="color:#38bdf8;font-size:10px;">${alertas.length} alertas</span>
          </div>
          ${alertasTop || '<div style="color:#64748b;font-size:11px;">Nenhum alerta ativo</div>'}
        </div>

        <div class="aw-dash-secao">
          <div class="aw-dash-sec-tit">
            <span>🚢 Embarcações monitoradas</span>
            <span style="color:#38bdf8;font-size:10px;">${lista.length} embarcações</span>
          </div>
          <div class="aw-dash-cards">
            ${cardsEmb || '<div style="color:#64748b;font-size:11px;">Nenhuma embarcação</div>'}
          </div>
        </div>
      `;
    },

    _irParaMonitor(mmsi) {
      this.trocarModo('monitor');
      setTimeout(() => this.selecionar(mmsi), 100);
    },

    /* ============================================================
       FILTROS
       ============================================================ */
    aplicarFiltros() {
      this._filtros.status = document.getElementById('aw-filtro-status')?.value || '';
      this._filtros.tipo = document.getElementById('aw-filtro-tipo')?.value || '';
      this._filtros.perfil = document.getElementById('aw-filtro-perfil')?.value || '';
      this._filtros.corredor = document.getElementById('aw-filtro-corredor')?.value || '';
      this.renderMonitor();
      this._atualizarMapa();
    },

    limparFiltros() {
      ['aw-filtro-status', 'aw-filtro-tipo', 'aw-filtro-perfil', 'aw-filtro-corredor'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      this._filtros = { status: '', tipo: '', perfil: '', corredor: '' };
      this.aplicarFiltros();
    },

    _mmsisFiltrados() {
      const sm = window.AISManager.getStatusPorEmbarcacao();
      const set = new Set();
      sm.forEach((s, mmsi) => {
        if (this._filtros.status && s.status !== this._filtros.status) return;
        if (this._filtros.tipo && s.tipo !== this._filtros.tipo) return;
        if (this._filtros.perfil && s.perfil !== this._filtros.perfil) return;
        if (this._filtros.corredor) {
          const cls = s.corredor?.classificacao || 'dentro';
          if (cls !== this._filtros.corredor) return;
        }
        set.add(mmsi);
      });
      return set;
    },

    _atualizarMapa() {
      if (!window.AISLayer) return;
      if (this._emb) {
        const so = window.AISManager.getTodasPosicoes().filter(p => p.mmsi === this._emb);
        window.AISLayer.renderizarTrilhas(so);
        return;
      }
      const mmsis = this._mmsisFiltrados();
      const todas = window.AISManager.getTodasPosicoes().filter(p => mmsis.has(p.mmsi));
      window.AISLayer.renderizarTrilhas(todas);
    },

    /* ============================================================
       TIMELINE
       ============================================================ */
    _garantirRangeGlobal() {
      const pos = window.AISManager.getTodasPosicoes();
      if (!pos.length) return;
      let tMin = Infinity, tMax = -Infinity;
      pos.forEach(p => {
        const t = new Date(p.timestamp).getTime();
        if (t < tMin) tMin = t;
        if (t > tMax) tMax = t;
      });
      this._tl.tInicio = tMin;
      this._tl.tFim = tMax;
      this._tl.tAtual = tMin;
      this._tl._contexto = 'global';
    },

    _rangeVessel(mmsi) {
      const pos = window.AISManager.getTodasPosicoes().filter(p => p.mmsi === mmsi);
      if (!pos.length) return;
      let tMin = Infinity, tMax = -Infinity;
      pos.forEach(p => {
        const t = new Date(p.timestamp).getTime();
        if (t < tMin) tMin = t;
        if (t > tMax) tMax = t;
      });
      this._tl.tInicio = tMin;
      this._tl.tFim = tMax;
      this._tl.tAtual = tMin;
      this._tl._contexto = 'vessel';
    },

    togglePlay() { this._tl.playing ? this._pausar() : this._play(); },

    _play() {
      const tl = this._tl;
      if (tl.tAtual >= tl.tFim) {
        tl.tAtual = tl.tInicio;
        this._atualizarFrame();
      }
      tl.playing = true;
      const b = document.getElementById('aw-btn-play');
      if (b) { b.innerText = '⏸ Pausar'; b.classList.add('pausado'); }

      // Limpa qualquer timer anterior para evitar múltiplos loops concorrentes (causa dos milissegundos)
      if (tl._timer) clearInterval(tl._timer);

      tl._timer = setInterval(() => {
        tl.tAtual += tl.vel * 3600 * 1000 * (tl._passo / 1000);
        if (tl.tAtual >= tl.tFim) {
          tl.tAtual = tl.tFim;
          this._pausar();
          this._atualizarFrame();
          if (this._sim.rodando && window.UI && this._sim.legs && this._sim.legs.length) {
            const dest = this._sim.legs[this._sim.legs.length - 1].porto;
            window.UI.toast(`🏁 Chegada em ${dest}! Simulação concluída.`);
          }
          return;
        }
        this._atualizarFrame();
      }, tl._passo);
    },

    _pausar() {
      const tl = this._tl;
      tl.playing = false;
      if (tl._timer) {
        clearInterval(tl._timer);
        tl._timer = null;
      }
      const b = document.getElementById('aw-btn-play');
      if (b) { b.innerText = '▶ Play'; b.classList.remove('pausado'); }
    },

    setVel(v) {
      if (this._sim.rodando && this._sim.duracaoTotalHoras && this._sim.tempoAnimacaoSegundos) {
        const baseVel = this._sim.duracaoTotalHoras / this._sim.tempoAnimacaoSegundos;
        if (v === 'sim_calibrada') {
          this._tl.vel = baseVel;
        } else {
          const num = Number(v) || 6;
          this._tl.vel = baseVel * (num / 6.0);
        }
      } else {
        this._tl.vel = Number(v) || 6;
      }
    },

    seek(val) {
      const tl = this._tl;
      tl.tAtual = tl.tInicio + (tl.tFim - tl.tInicio) * (Number(val) / 1000);
      this._atualizarFrame();
    },

    _atualizarFrame() {
      const tl = this._tl;
      let pos = window.AISManager.getTodasPosicoes();
      if (!pos.length) return;
      if (this._sim.rodando && this._sim.posicoes && this._sim.posicoes.length) {
        pos = this._sim.posicoes;
      } else if (this._emb) {
        pos = pos.filter(p => p.mmsi === this._emb);
      }
      if (window.AISLayer) window.AISLayer.renderizarProgressivo(pos, tl.tAtual, tl._janela);

      const label = document.getElementById('aw-tempo');
      if (label) {
        label.innerText = new Date(tl.tAtual).toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
      }
      const s = document.getElementById('aw-slider');
      if (s && tl.tFim > tl.tInicio) {
        s.value = Math.round(((tl.tAtual - tl.tInicio) / (tl.tFim - tl.tInicio)) * 1000);
      }
    },

    /* ============================================================
       EXPORT
       ============================================================ */
    exportarCSV() {
      try {
        const sm = window.AISManager.getStatusPorEmbarcacao();
        const mmsis = this._mmsisFiltrados();
        const linhas = [['mmsi', 'nome', 'tipo', 'perfil', 'status', 'atraso_h', 'total_viagens', 'total_alertas']];
        sm.forEach((s, mmsi) => {
          if (!mmsis.has(mmsi)) return;
          linhas.push([mmsi, '"' + (s.nome || '').replace(/"/g, '""') + '"',
            s.tipo || '', s.perfil || '', s.status || '',
            (s.atraso_h || 0).toFixed(2), s.totalViagens || 0, s.totalAlertas || 0]);
        });
        const csv = linhas.map(l => l.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `embarcacoes-ais-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (window.UI) window.UI.toast('✅ CSV exportado');
      } catch (e) {
        console.error('[AIS] export:', e);
        if (window.UI) window.UI.toast('❌ Falha ao exportar');
      }
    },

    /* ============================================================
       HELPERS
       ============================================================ */
    _esc(s) {
      if (window.Security && window.Security.escapeHTML) return window.Security.escapeHTML(s || '');
      return String(s || '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    },
    _fmt(iso) {
      if (!iso) return '—';
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      } catch (e) { return iso; }
    }
  };
  // ✅ Fecha o painel AIS automaticamente quando o usuário troca para outra aba
  window.addEventListener('tabmudou', function (e) {
    if (e.detail.aba !== 'ais' && ControleAIS._aberto) {
      ControleAIS.fechar();
    }
  });

  window.ControleAIS = ControleAIS;
})();
/* --- FIM: js/domain/controle-ais.js --- */

/* --- INÍCIO: js/ai/intent-parser.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: IntentParser (Copiloto IA · etapa 1a)
   Escopo: classifica perguntas do usuário e extrai parâmetros.
           Não responde — só entende.
   Dependências: window.Security
   Expõe: window.IntentParser
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Dicionários ---------- */

  // Sinônimos de camadas (o que o usuário digita → id interno)
  const CAMADAS_SINONIMOS = {
    instalacoes_portuarias: [
      'porto', 'portos', 'instalação', 'instalações', 'instalacao', 'instalacoes',
      'terminal', 'terminais', 'tup', 'tups', 'ip4', 'etc', 'atracadouro',
      'instalações portuárias', 'instalacoes portuarias'
    ],
    ven: [
      'via', 'vias', 'ven', 'hidrovia', 'hidrovias', 'rio navegável',
      'trecho', 'trechos', 'vias navegáveis', 'vias navegaveis'
    ],
    linhas_travessias: [
      'travessia', 'travessias', 'linha', 'linhas', 'balsa', 'balsas',
      'ferry', 'ferries'
    ],
    tis_poligonais: [
      'ti', 'tis', 'terra indígena', 'terras indígenas', 'terra indigena',
      'terras indigenas', 'território indígena'
    ],
    ucs_federais: [
      'uc', 'ucs', 'unidade de conservação', 'unidades de conservação',
      'unidade de conservacao', 'unidades de conservacao', 'conservação',
      'conservacao', 'icmbio'
    ],
    uf: ['uf', 'ufs', 'estado', 'estados', 'unidade da federação'],
    rodovias: ['rodovia', 'rodovias', 'estrada', 'estradas'],
    ferrovias: ['ferrovia', 'ferrovias', 'trem', 'trens', 'malha ferroviária']
  };

  // Siglas de UF e nomes por extenso
  const UFS = {
    'ac': 'AC', 'acre': 'AC',
    'al': 'AL', 'alagoas': 'AL',
    'ap': 'AP', 'amapá': 'AP', 'amapa': 'AP',
    'am': 'AM', 'amazonas': 'AM',
    'ba': 'BA', 'bahia': 'BA',
    'ce': 'CE', 'ceará': 'CE', 'ceara': 'CE',
    'df': 'DF', 'distrito federal': 'DF',
    'es': 'ES', 'espírito santo': 'ES', 'espirito santo': 'ES',
    'go': 'GO', 'goiás': 'GO', 'goias': 'GO',
    'ma': 'MA', 'maranhão': 'MA', 'maranhao': 'MA',
    'mt': 'MT', 'mato grosso': 'MT',
    'ms': 'MS', 'mato grosso do sul': 'MS',
    'mg': 'MG', 'minas gerais': 'MG',
    'pa': 'PA', 'pará': 'PA', 'para': 'PA',
    'pb': 'PB', 'paraíba': 'PB', 'paraiba': 'PB',
    'pr': 'PR', 'paraná': 'PR', 'parana': 'PR',
    'pe': 'PE', 'pernambuco': 'PE',
    'pi': 'PI', 'piauí': 'PI', 'piaui': 'PI',
    'rj': 'RJ', 'rio de janeiro': 'RJ',
    'rn': 'RN', 'rio grande do norte': 'RN',
    'rs': 'RS', 'rio grande do sul': 'RS',
    'ro': 'RO', 'rondônia': 'RO', 'rondonia': 'RO',
    'rr': 'RR', 'roraima': 'RR',
    'sc': 'SC', 'santa catarina': 'SC',
    'sp': 'SP', 'são paulo': 'SP', 'sao paulo': 'SP',
    'se': 'SE', 'sergipe': 'SE',
    'to': 'TO', 'tocantins': 'TO'
  };

  // Sub-regiões (agrupamentos de UF)
  const REGIOES = {
    'norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
    'nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
    'centro-oeste': ['DF', 'GO', 'MT', 'MS'],
    'sudeste': ['ES', 'MG', 'RJ', 'SP'],
    'sul': ['PR', 'RS', 'SC'],
    'amazônia legal': ['AC', 'AP', 'AM', 'MA', 'MT', 'PA', 'RO', 'RR', 'TO'],
    'amazonia legal': ['AC', 'AP', 'AM', 'MA', 'MT', 'PA', 'RO', 'RR', 'TO']
  };

  /* ---------- Utilitários ---------- */

  function normalizar(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function acharCamada(textoNorm) {
    // Busca por sinônimos mais longos primeiro (evita "porto" casar antes de "instalações portuárias")
    const todosSinonimos = [];
    for (const [id, lista] of Object.entries(CAMADAS_SINONIMOS)) {
      for (const s of lista) {
        todosSinonimos.push({ id, sin: normalizar(s), len: s.length });
      }
    }
    todosSinonimos.sort((a, b) => b.len - a.len);

    for (const { id, sin } of todosSinonimos) {
      if (textoNorm.includes(sin)) return id;
    }
    return null;
  }

  function acharUF(textoNorm) {
    // UFs por sigla (2 letras) — busca com word boundary
    for (const [chave, sigla] of Object.entries(UFS)) {
      if (chave.length <= 3) {
        const re = new RegExp(`\\b${chave}\\b`);
        if (re.test(textoNorm)) return sigla;
      }
    }
    // UFs por nome por extenso
    for (const [nome, sigla] of Object.entries(UFS)) {
      if (nome.length > 3 && textoNorm.includes(nome)) return sigla;
    }
    return null;
  }

  function acharRegiao(textoNorm) {
    for (const regiao of Object.keys(REGIOES)) {
      if (textoNorm.includes(regiao)) return regiao;
    }
    return null;
  }

  function acharNumero(textoNorm) {
    // Captura "50", "100", "1.5" — pega o primeiro número encontrado
    const m = textoNorm.match(/\b(\d+(?:[.,]\d+)?)\b/);
    return m ? parseFloat(m[1].replace(',', '.')) : null;
  }

  /* ---------- Classificação principal ---------- */

  const IntentParser = {
    /**
     * Interpreta uma pergunta e retorna um objeto de intenção.
     * @param {string} pergunta
     * @returns {Object} { tipo, camada?, filtro?, n?, raio?, alvo?, ... }
     */
    interpretar: function (pergunta) {
      const texto = normalizar(pergunta);

      if (!texto) return { tipo: 'vazio' };

      // ---------- 1. Comparação de safras VEN ----------
      if (
        (texto.includes('mudou') || texto.includes('mudanca') || texto.includes('mudança') ||
         texto.includes('adicionad') || texto.includes('removid') ||
         texto.includes('compar') || texto.includes('diferenca') || texto.includes('diferença')) &&
        (texto.includes('ven') || texto.includes('hidrovia') || texto.includes('trecho') ||
         texto.includes('2022') || texto.includes('2024'))
      ) {
        const safras = this._extrairSafras(texto);
        return {
          tipo: 'comparacao',
          safraA: safras[0] || 'ven_2022',
          safraB: safras[1] || 'ven_2024'
        };
      }

      // ---------- 2. Ficha de ativo específico ----------
      const matchFicha = texto.match(/(?:sobre|fale|informac|detalh|ficha|dados)\s+(?:do|da|de|sobre\s+)?(.{3,60})$/);
      if (matchFicha && !texto.includes('quantos') && !texto.includes('quantas')) {
        return {
          tipo: 'ficha',
          alvo: matchFicha[1].trim()
        };
      }

      // ---------- 3. Ranking (top N) ----------
      const matchTop = texto.match(/\b(?:top|maiores|menores|melhores|piores|ranking)\s*(\d+)?/);
      if (matchTop) {
        const camada = acharCamada(texto);
        return {
          tipo: 'ranking',
          camada: camada || 'instalacoes_portuarias',
          n: matchTop[1] ? parseInt(matchTop[1], 10) : 10,
          criterio: texto.includes('menor') ? 'asc' : 'desc'
        };
      }

            // ---------- 3.9. Contenção Territorial Espacial ("em terras indígenas", "em UCs", etc.) ----------
      const alvoPoligono = this._acharCamadaPoligonal(texto);
      if (alvoPoligono && (/(?:\bem\b|\bnas?\b|\bnos?\b|\bdentro\b|\bcontid|\binserid|\bintercept|\bsobrepost)/i).test(texto)) {
        const camadaFonte = acharCamada(texto) || 'instalacoes_portuarias';
        const nomesBonitos = {
          'tis_poligonais': 'Terras Indígenas (FUNAI)',
          'ucs_federais': 'Unidades de Conservação Federais (ICMBio)',
          'estados_amazonia_legal': 'Amazônia Legal'
        };
        return {
          tipo: 'contido',
          camada: camadaFonte,
          alvo: alvoPoligono,
          alvoNome: nomesBonitos[alvoPoligono] || alvoPoligono
        };
      }

// ---------- 4. Contagem ----------
      const matchDentro = texto.match(/\b(dentro d[ao]|dentro de|contid[oa]s? (?:em|na|no)|inserid[oa]s? (?:em|na|no))\s+(.+?)(?:\?|$)/);
      if (matchDentro) {
        const alvoNome = matchDentro[2].trim();
        const alvo = this._acharCamadaPoligonal(alvoNome);
        if (alvo) {
          const camada = acharCamada(texto);
          return {
            tipo: 'contido',
            camada: camada || 'instalacoes_portuarias',
            alvo: alvo,
            alvoNome: alvoNome
          };
        }
      }      
      // ---------- 4. Contagem ----------
      // ✅ Não casa se a pergunta tiver padrão de contenção ("dentro de", "na região", etc.)
      //    Nesses casos, o bloco "contido" (7.6) trata com lookup geográfico
      const temPadraoContencao = /\b(dentro d[ao]|na regi[ãa]o|no regi[ãa]o|na amaz[ôo]nia|no pantanal|no cerrado|na caatinga|na mata atl[âa]ntica|na amaz[ôo]nia legal)\b/.test(texto);
      const matchContagem = !temPadraoContencao && texto.match(/\b(quant[oa]s?|numero de|total de|contar|contagem)\b/);
      if (matchContagem) {
        const camada = acharCamada(texto);
        const uf = acharUF(texto);
        const regiao = acharRegiao(texto);
        const filtro = {};

        if (uf) filtro.uf = uf;
        else if (regiao) filtro.regiao = regiao;

        // Filtra por regime de porto (tup, organizado, etc.)
        if (texto.includes('tup')) filtro.regime = 'TUP';
        else if (texto.includes('organizado')) filtro.regime = 'ORGANIZADO';
        else if (texto.includes('ip4') || texto.includes('pequeno porte')) filtro.regime = 'IP4';
        else if (texto.includes('etc') && camada === 'instalacoes_portuarias') filtro.regime = 'ETC';
        else if (texto.includes('publico') || texto.includes('público')) filtro.regime = 'PUBLICO';

        return {
          tipo: 'contagem',
          camada: camada || 'instalacoes_portuarias',
          filtro: Object.keys(filtro).length > 0 ? filtro : null
        };
      }

      // ---------- 5. Geoespacial (buffer / proximidade) ----------
      const matchGeo = texto.match(/(?:a menos de|ate|até|dentro de|proxim[oa]s? de|num raio de)\s*(\d+)\s*(?:km|quilometros?)/);
      if (matchGeo) {
        const camada = acharCamada(texto);
        const alvo = this._acharCamadaAlvo(texto);

        // Se o alvo não foi identificado como camada (TI, UC, etc.),
        // trata como "buffer em torno de um ponto nomeado"
        if (!alvo) {
          const depois = texto.slice(texto.indexOf(matchGeo[0]) + matchGeo[0].length).trim();
          const matchCidade = depois.match(/^(?:d[eo]|d[ao]|perto d[eo])\s+(.+?)(?:\?|$)/);
          if (matchCidade) {
            return {
              tipo: 'buffer_ponto',
              camada: camada || 'instalacoes_portuarias',
              raio: parseInt(matchGeo[1], 10),
              pontoNome: matchCidade[1].trim()
            };
          }
        }

        return {
          tipo: 'geo',
          camada: camada || 'instalacoes_portuarias',
          raio: parseInt(matchGeo[1], 10),
          alvo: alvo
        };
      }

      // ---------- 6. Zoom / localizar ----------
      if (texto.startsWith('zoom') || texto.startsWith('ir para') || texto.startsWith('localizar') || texto.startsWith('mostrar')) {
        const termo = pergunta.replace(/^(zoom|ir para|localizar|mostrar)\s+(em\s+)?/i, '').trim();
        return { tipo: 'zoom', termo };
      }

      // ---------- 7. Nota técnica ----------
      if (texto.includes('nota tecnica') || texto.includes('nota técnica') ||
          texto.includes('parecer') || texto.includes('minuta')) {
        return { tipo: 'nota_tecnica' };
      }

      // ---------- 7.5. Perguntas pré-definidas (botões rápidos) ----------
      if (texto.includes('regulados por tipo') || texto.includes('ativos portuários regulados')) {
        return { tipo: 'agrupamento', camada: 'instalacoes_portuarias', agruparPor: 'regime' };
      }
      if (texto.includes('extensão total do ven') || (texto.includes('ven 2024') && texto.includes('amazônia'))) {
        return { tipo: 'resumo_ven' };
      }
      if (texto.includes('metodologia') || texto.includes('matriz de tempos') || texto.includes('caminhos mínimos')) {
        return { tipo: 'metodologia_ven' };
      }
      // Atalho: "amazônia legal" como região
      if ((texto.includes('amazônia legal') || texto.includes('amazonia legal')) &&
          !texto.includes('travessia')) {
        const camada = acharCamada(texto);
        return {
          tipo: 'contido',
          camada: camada || 'instalacoes_portuarias',
          alvo: 'estados_amazonia_legal',
          alvoNome: 'Amazônia Legal'
        };
      }

      // ---------- 7.7. Cruzam UFs (travessias) ----------
      // Detecção de cruza UF (mais tolerante)
      const palavrasTravessia = ['travessia', 'travessias', 'balsa', 'balsas', 'ferry', 'ferries'];
      const palavrasCruza = ['cruzam', 'cruza', 'cruzando', 'interestadual', 'interestaduais',
                             'entre estados', 'entre ufs', 'entre unidades', 'fronteira',
                             'intermunicipal', 'intermunicipais'];
      const temTravessia = palavrasTravessia.some(p => texto.includes(p));
      const temCruza = palavrasCruza.some(p => texto.includes(p));
      if (temTravessia && temCruza) {
        return { tipo: 'cruza_uf', camada: 'linhas_travessias' };
      }
      // Atalho: só "interestadual" + travessia implícita
      if ((texto.includes('interestadual') || texto.includes('interestaduais')) && !texto.includes('porto')) {
        return { tipo: 'cruza_uf', camada: 'linhas_travessias' };
      }

      // ---------- 7.8. Buffer de ponto específico ----------
      // "Portos a menos de 100km de Macapá", "Travessias a 50km de Belém"
            // Aceita: "a menos de 100km de X", "a 50km de X", "50km de X", "num raio de 30km de X"
      const matchBufferCidade = texto.match(/(?:a menos de|até|ate|dentro de|num raio de|a)?\s*(\d+)\s*km\s+(?:d[eo]|d[ao]|perto d[eo]|em torno d[eo]|próximo a|proximo a)\s+(.+?)(?:\?|$)/);
      if (matchBufferCidade && !matchGeo) {
        const camada = acharCamada(texto);
        const cidade = matchBufferCidade[2].trim();
        return {
          tipo: 'buffer_ponto',
          camada: camada || 'instalacoes_portuarias',
          raio: parseInt(matchBufferCidade[1], 10),
          pontoNome: cidade
        };
      }

      // ---------- 8. Perguntas pré-definidas (botões rápidos) ----------
      if (texto.includes('ativos portu') && texto.includes('regulado')) {
        return { tipo: 'agrupamento', camada: 'instalacoes_portuarias', agruparPor: 'regime' };
      }
      if (texto.includes('extens') && texto.includes('ven 2024')) {
        return { tipo: 'resumo_ven' };
      }
      if (texto.includes('metodologia') || texto.includes('matriz de tempos')) {
        return { tipo: 'metodologia_ven' };
      }

      // ---------- 9. Desconhecido ----------
      return { tipo: 'desconhecido', textoOriginal: pergunta };
    },

    /* ---------- Helpers internos ---------- */

    _extrairSafras: function (textoNorm) {
      const safras = [];
      const anos = textoNorm.match(/\b(2013|2018|2020|2022|2024)\b/g);
      if (anos) {
        for (const ano of anos) {
          const id = 'ven_' + ano;
          if (!safras.includes(id)) safras.push(id);
        }
      }
      return safras;
    },

    _acharCamadaAlvo: function (textoNorm) {
      // Usa word boundaries (\b) pra pegar "ti"/"tis"/"uc"/"ucs" em qualquer posição
      if (textoNorm.includes('terra ind') || /\btis?\b/.test(textoNorm)) return 'tis_poligonais';
      if (textoNorm.includes('unidade de conserv') || /\bucs?\b/.test(textoNorm)) return 'ucs_federais';
      if (textoNorm.includes('hidrovia') || /\bven\b/.test(textoNorm)) return 'ven';
      if (textoNorm.includes('travessia')) return 'linhas_travessias';
      if (textoNorm.includes('rodovia')) return 'rodovias';
      if (textoNorm.includes('ferrovia')) return 'ferrovias';
      if (textoNorm.includes('municipio') || textoNorm.includes('município')) return 'br_municipios_2025';
      return null;
    },
    _acharCamadaPoligonal: function (textoNorm) {
      const n = normalizar(textoNorm);
      if (n.includes('amazonia legal') || (n.includes('amazoni') && n.includes('legal'))) return 'estados_amazonia_legal';
      if (n.includes('indigen') || /\b(ti|tis)\b/i.test(n)) return 'tis_poligonais';
      if (n.includes('conserva') || n.includes('icmbio') || /\b(uc|ucs)\b/i.test(n)) return 'ucs_federais';
      return null;
    },
    /* ---------- Debug ---------- */
    explicar: function (intencao) {
      const linhas = [`**Tipo:** \`${intencao.tipo}\``];
      for (const [k, v] of Object.entries(intencao)) {
        if (k === 'tipo') continue;
        if (typeof v === 'object' && v !== null) {
          linhas.push(`**${k}:** \`${JSON.stringify(v)}\``);
        } else {
          linhas.push(`**${k}:** \`${v}\``);
        }
      }
      return linhas.join('  \n');
    }
  };

  window.IntentParser = IntentParser;
  console.info('[js] IntentParser carregado (Copiloto 1a)');
})();
/* --- FIM: js/ai/intent-parser.js --- */

/* --- INÍCIO: js/ai/copiloto-ia.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: CopilotoIA
   Escopo: assistente virtual regulatório + IA (local/nuvem)
   Dependências: window.Security, window.UI, window.DADOS_GEOJSON_BRUTOS,
                 window.PortClassification, window.mapa
   Referências "lazy": window.Analytics, window.SearchEngine
   Expõe: window.CopilotoIA
   ============================================================ */
(function () {
  'use strict';

  const CopilotoIA = {
    aberto: false,
    provedor: localStorage.getItem('antaq_ia_provedor') || 'heuristico',
    apiKey: localStorage.getItem('antaq_ia_key') || '',
    urlLocal: localStorage.getItem('antaq_ia_url') || 'http://localhost:11434/v1',
    ultimoAtivoInspecionado: null,

    /* 1e-1: histórico e última resposta */
    _historico: [],
    _maxHistorico: 15,
    _ultimaResposta: null,   // { pergunta, html, textoPlano, features, camadaId, tipo }

    toggle: function () {
      const p = document.getElementById('painel-copiloto');
      if (!p) return;
      this.aberto = !this.aberto;
      p.classList.toggle('aberto', this.aberto);

      if (this.aberto) {
        const inp = document.getElementById('copiloto-input');
        if (inp) inp.focus();
        const sel = document.getElementById('ia-provedor');
        if (sel) sel.value = this.provedor;
        this.onMudarProvedor(this.provedor);
      }
    },

    toggleConfig: function () {
      const b = document.getElementById('copiloto-config-box');
      if (b) b.style.display = (b.style.display === 'none') ? 'block' : 'none';
    },

    onMudarProvedor: function (val) {
      this.provedor = val;
      const boxKey = document.getElementById('box-api-key');
      const boxUrl = document.getElementById('box-url-local');
      if (boxKey) boxKey.style.display = (val === 'gemini' || val === 'openai') ? 'block' : 'none';
      if (boxUrl) boxUrl.style.display = (val === 'local') ? 'block' : 'none';
    },

    salvarConfig: function () {
      const selProv = document.getElementById('ia-provedor');
      this.provedor = selProv ? selProv.value : 'heuristico';
      const inpKey = document.getElementById('ia-api-key');
      this.apiKey = inpKey ? inpKey.value : '';
      const inpUrl = document.getElementById('ia-url-local');
      this.urlLocal = inpUrl ? inpUrl.value : 'http://localhost:11434/v1';

      localStorage.setItem('antaq_ia_provedor', this.provedor);
      localStorage.setItem('antaq_ia_key', this.apiKey);
      localStorage.setItem('antaq_ia_url', this.urlLocal);

      this.toggleConfig();
      if (window.UI) window.UI.toast(`Configurações de IA salvas: [${this.provedor.toUpperCase()}]`);
      this.adicionarMensagem('ia', `Configuração atualizada. Modo ativo: <strong>${this.provedor.toUpperCase()}</strong>.`);
    },

    adicionarMensagem: function (tipo, html) {
      const c = document.getElementById('copiloto-mensagens');
      if (!c) return;
      const div = document.createElement('div');
      div.className = (tipo === 'usuario') ? 'msg-usuario' : 'msg-ia';
      div.innerHTML = html;
      c.appendChild(div);
      c.scrollTop = c.scrollHeight;
    },

    enviarComandoPredefinido: function (texto) {
      const inp = document.getElementById('copiloto-input');
      if (inp) inp.value = texto;
      this.enviar();
    },
    perguntarSeguro: function (texto, botao) {
      // ✅ Dupla proteção: botão E processamento
      if (botao) {
        if (botao.disabled) {
          console.log('[Copiloto] Botão já desabilitado, ignorando.');
          return;
        }
        botao.disabled = true;
        botao.style.opacity = '0.5';
        botao.style.cursor = 'not-allowed';
        setTimeout(() => {
          botao.disabled = false;
          botao.style.opacity = '';
          botao.style.cursor = '';
        }, 2000);   // ← aumenta pra 2s
      }

      if (this._processando) {
        console.log('[Copiloto] Já processando, ignorando clique.');
        return;
      }

      return this.enviarComandoPredefinido(texto);
    },
    perguntar: function (texto) { return this.enviarComandoPredefinido(texto); },
    enviarMensagem: function () { return this.enviar(); },

    enviar: async function () {
      const inp = document.getElementById('copiloto-input');
      if (!inp) return;

      const texto = inp.value.trim();
      if (!texto) return;

      // Normaliza pra comparação (remove espaços múltiplos, tabs)
      const normalizar = (s) => String(s).trim().replace(/\s+/g, ' ');
      const textoNorm = normalizar(texto);
      const container = document.getElementById('copiloto-mensagens');

      // BLOQUEIO 1: mesma pergunta já está no chat?
      if (container) {
        const ultimasUser = container.querySelectorAll('.msg-usuario');
        if (ultimasUser.length > 0) {
          const ultimaPergunta = normalizar(ultimasUser[ultimasUser.length - 1].textContent);
          if (ultimaPergunta === textoNorm) {
            console.log('[Copiloto] Pergunta idêntica já no chat, bloqueando.');
            inp.value = '';
            return;
          }
        }
      }

      // BLOQUEIO 2: já está processando?
      if (this._processando) {
        console.log('[Copiloto] Processando consulta anterior, ignorando.');
        inp.value = '';
        return;
      }

      this._processando = true;
      this._limparBarrasAntigas();

      // Limpa estado
      this._ultimaContagem = null;
      this._ultimoRanking = null;
      this._ultimaFicha = null;
      this._ultimoResultadoGeo = null;
      this._ultimaResposta = null;

      this.adicionarMensagem('usuario', window.Security.escapeHTML(textoNorm));
      inp.value = '';

      const idWait = 'msg-wait-' + Date.now();
      this.adicionarMensagem('ia', '<span id="' + idWait + '">⏳ Processando consulta espacial e regulatória...</span>');

      try {
        let respostaHTML = '';
        if (this.provedor === 'heuristico' || !this.apiKey) respostaHTML = await this.executarMotorHeuristico(texto);
        else if (this.provedor === 'gemini') respostaHTML = await this.chamarGemini(texto);
        else if (this.provedor === 'openai') respostaHTML = await this.chamarOpenAI(texto);
        else if (this.provedor === 'local') respostaHTML = await this.chamarOllamaLocal(texto);

        const waitEl = document.getElementById(idWait);
        if (waitEl && waitEl.parentElement) {
          const msgDiv = waitEl.parentElement;

          // Remove TODAS as barras de ação (inclusive as que chegaram em paralelo)
          document.querySelectorAll('#copiloto-mensagens .copiloto-acoes-resposta')
            .forEach(b => b.remove());

          const acoesHTML = this._montarBarraAcoes(texto, respostaHTML);
          msgDiv.innerHTML = respostaHTML + acoesHTML;
        }

        this._registrarNoHistorico(texto, respostaHTML);
      } catch (err) {
        console.error(err);
        const waitEl = document.getElementById(idWait);
        if (waitEl && waitEl.parentElement) {
          waitEl.parentElement.innerHTML = '⚠️ <strong>Falha na consulta:</strong> ' +
            window.Security.escapeHTML(err.message || 'Erro inesperado');
        }
      } finally {
        this._processando = false;
      }
    },

    executarMotorHeuristico: async function (comando) {
      // 1. Parser classifica a intenção
      const intencao = window.IntentParser.interpretar(comando);
      console.log('[CopilotoIA] Intenção:', intencao);

      // 2. Dispatch por tipo
      try {
        switch (intencao.tipo) {
          case 'contagem':
            
            return await this._responderContagem(intencao);
          case 'agrupamento':
            return await this._responderAgrupamento(intencao);
          case 'contido':
            return await this._responderContido(intencao);

          case 'cruza_uf':
            return await this._responderCruzaUF(intencao);

          case 'buffer_ponto':
            return await this._responderBufferPonto(intencao);
          case 'resumo_ven':
            return this._responderResumoVEN();

          case 'metodologia_ven':
            return this._responderMetodologiaVEN();
          case 'ranking':
            return await this._responderRanking(intencao);

          case 'ficha':
            return await this._responderFicha(intencao);

          case 'geo':
            return await this._responderGeo(intencao);

          case 'comparacao':
            return await this._responderComparacao(intencao);

          case 'zoom':
            document.getElementById('input-busca').value = intencao.termo;
            if (window.SearchEngine) window.SearchEngine.executar();
            return `🔍 Buscando: <em>"${window.Security.escapeHTML(intencao.termo)}"</em>.`;

          case 'nota_tecnica': {
            const ativo = this.ultimoAtivoInspecionado ||
              (DADOS_GEOJSON_BRUTOS['instalacoes_portuarias']?.features?.[0]);
            if (!ativo) return "Clique primeiro em uma instalação portuária no mapa.";
            return this.gerarMinutaNotaTecnica(ativo.properties || {});
          }

          case 'vazio':
            return 'Faça uma pergunta. Ex.: "Quantos portos no Pará?"';

          default:
            return this._respostaGenerica(comando);
        }
      } catch (err) {
        console.error('[CopilotoIA] Erro ao processar intenção:', err);
        return `⚠️ <strong>Erro ao processar:</strong> ${window.Security.escapeHTML(err.message || 'desconhecido')}`;
      }
    },

    _respostaGenerica: function (comando) {
      return `Não consegui classificar sua pergunta: <em>"${window.Security.escapeHTML(comando)}"</em>.<br><br>
              💡 <strong>Tente algo assim:</strong><br>
              • <code>"Quantos portos no Pará?"</code><br>
              • <code>"Top 10 maiores portos"</code><br>
              • <code>"Me fale sobre Santos"</code><br>
              • <code>"Portos a menos de 50km de TIs"</code><br>
              • <code>"O que mudou entre VEN 2022 e 2024?"</code>`;
    },

    /* ============================================================
       HANDLERS ESPECIAIS (perguntas pré-definidas)
       ============================================================ */

    _responderAgrupamento: async function (intencao) {
      const dados = await this._obterDados(intencao.camada);
      if (!dados?.features?.length) return 'Sem dados carregados.';

      if (intencao.agruparPor === 'regime') {
        const contagem = {};
        for (const f of dados.features) {
          const cat = window.PortClassification.classificar(f.properties || {});
          contagem[cat.id] = (contagem[cat.id] || 0) + 1;
        }

        const linhas = Object.entries(contagem)
          .sort((a, b) => b[1] - a[1])
          .map(([id, qtd]) => {
            const cat = window.PortClassification.tipos[id] || { nome: id, cor: '#64748b' };
            return `
              <tr>
                <td style="padding:5px 8px;">
                  <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${cat.cor};border:2px solid #fff;vertical-align:middle;margin-right:6px;"></span>
                  <span style="font-size:11px;color:#e2e8f0;">${window.Security.escapeHTML(cat.nome)}</span>
                </td>
                <td style="padding:5px 8px;color:#38bdf8;font-family:Consolas,monospace;font-size:12px;font-weight:700;text-align:right;">${qtd}</td>
                <td style="padding:5px 8px;color:#94a3b8;font-size:10px;text-align:right;">${((qtd / dados.features.length) * 100).toFixed(1)}%</td>
              </tr>`;
          }).join('');

        this._ultimaContagem = { camadaId: intencao.camada, features: dados.features };

        return `
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
            ⚓ ${dados.features.length.toLocaleString('pt-BR')} ativos por regime
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="border-bottom:1px solid #334155;">
              <th style="text-align:left;padding:4px 8px;color:#94a3b8;font-size:9.5px;">Regime</th>
              <th style="text-align:right;padding:4px 8px;color:#94a3b8;font-size:9.5px;">Qtd</th>
              <th style="text-align:right;padding:4px 8px;color:#94a3b8;font-size:9.5px;">%</th>
            </tr></thead>
            <tbody>${linhas}</tbody>
          </table>
        `;
      }

      return 'Tipo de agrupamento não implementado.';
    },

    _responderResumoVEN: function () {
      return `
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
          🌊 Resumo VEN 2024 & Amazônia
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div style="background:rgba(2,132,199,0.15);border-left:3px solid #38bdf8;padding:8px 10px;border-radius:5px;">
            <div style="font-size:9.5px;color:#94a3b8;text-transform:uppercase;">Extensão total</div>
            <div style="font-size:18px;color:#38bdf8;font-weight:800;font-family:Consolas,monospace;">20.404 km</div>
          </div>
          <div style="background:rgba(16,185,129,0.15);border-left:3px solid #10b981;padding:8px 10px;border-radius:5px;">
            <div style="font-size:9.5px;color:#94a3b8;text-transform:uppercase;">Amazônia</div>
            <div style="font-size:18px;color:#34d399;font-weight:800;font-family:Consolas,monospace;">16.837 km</div>
          </div>
        </div>
        <div style="font-size:11px;color:#cbd5e1;line-height:1.5;">
          📈 <strong>Crescimento vs 2022:</strong> +213 km (+1.06%)<br>
          🌳 <strong>Concentração amazônica:</strong> 82.52% da malha navegável nacional<br>
          ⚙️ <strong>Aderência ao PNV planejado:</strong> 48.91% (41.720 km previstos)
        </div>
        <div style="margin-top:10px;">
          <button onclick="MatrizVENManager.abrirModal()"
                  style="background:#0284c7;color:#fff;border:none;padding:6px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            ⏱️ Abrir Matriz VEN
          </button>
        </div>
      `;
    },

    _responderMetodologiaVEN: function () {
      return `
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
          📚 Metodologia · Matriz VEN
        </div>
        <div style="font-size:11px;color:#cbd5e1;line-height:1.6;">
          A <strong>Matriz de Navegação VEN</strong> é calculada pelo SIGTAQ/SEPH a partir de:<br><br>
          <strong>1. Bases de dados federais:</strong><br>
          &bull; SDP/ANTAQ · atracações e movimentações<br>
          &bull; Sistema Mercante · manifestos de transporte<br>
          &bull; DNIT · calados e dragagens<br><br>
          <strong>2. Modelagem espacial:</strong><br>
          &bull; Caminhos mínimos O/D com eliminação de sobreposições<br>
          &bull; Datum: SIRGAS 2000 (CONCAR)<br>
          &bull; Escalas: 1:1.000.000 e 1:250.000<br><br>
          <strong>3. Indicadores:</strong><br>
          &bull; Extensão por trecho (km)<br>
          &bull; Velocidade comercial média (km/h)<br>
          &bull; Tempo de percurso estimado (dias/horas)<br>
          &bull; Eclusas e restrições físicas
        </div>
        <div style="margin-top:10px;">
          <button onclick="MatrizVENManager.abrirModal()"
                  style="background:#0284c7;color:#fff;border:none;padding:6px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            ⏱️ Ver Matriz Completa
          </button>
        </div>
      `;
    },    
    /* ============================================================
       HANDLERS DE RESPOSTA (Copiloto 1b)
       ============================================================ */

    _responderContagem: async function (intencao) {
      const camadaId = intencao.camada;
      const dados = await this._obterDados(camadaId);

      if (!dados || !dados.features || !dados.features.length) {
        return `Sem dados carregados para <strong>${camadaId}</strong>.`;
      }

      // Aplica filtros
      let features = dados.features;
      const filtroAplicado = [];

      if (intencao.filtro?.uf) {
        features = features.filter(f => {
          const uf = this._extrairUF(f);
          return uf === intencao.filtro.uf;
        });
        filtroAplicado.push(`UF = <strong>${intencao.filtro.uf}</strong>`);
      }

      if (intencao.filtro?.regime && camadaId === 'instalacoes_portuarias') {
        features = features.filter(f => {
          const cat = window.PortClassification.classificar(f.properties || {});
          return cat.id === intencao.filtro.regime;
        });
        const cat = window.PortClassification.tipos[intencao.filtro.regime];
        filtroAplicado.push(`Regime = <strong>${cat?.nome || intencao.filtro.regime}</strong>`);
      }

      if (intencao.filtro?.regiao) {
        const ufsRegiao = {
          'norte': ['AC','AP','AM','PA','RO','RR','TO'],
          'nordeste': ['AL','BA','CE','MA','PB','PE','PI','RN','SE'],
          'centro-oeste': ['DF','GO','MT','MS'],
          'sudeste': ['ES','MG','RJ','SP'],
          'sul': ['PR','RS','SC'],
          'amazonia legal': ['AC','AP','AM','MA','MT','PA','RO','RR','TO']
        }[intencao.filtro.regiao] || [];
        features = features.filter(f => ufsRegiao.includes(this._extrairUF(f)));
        filtroAplicado.push(`Região = <strong>${intencao.filtro.regiao}</strong>`);
      }

      const nomeCamada = window.CONFIG_CAMADAS[camadaId]?.nome || camadaId;
      const total = features.length;
      const totalGeral = dados.features.length;
      const pct = totalGeral > 0 ? ((total / totalGeral) * 100).toFixed(1) : '0';

      const filtrosTexto = filtroAplicado.length > 0
        ? `<br><small style="color:#94a3b8;">Filtros: ${filtroAplicado.join(' · ')}</small>`
        : '';
      // ✅ Guarda as features filtradas pra destacar depois
      this._ultimaContagem = { camadaId, features };
      return `
        <div style="background:rgba(2,132,199,0.15);border-left:3px solid #38bdf8;padding:10px 12px;border-radius:6px;">
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Contagem</div>
          <div style="font-size:22px;color:#38bdf8;font-weight:800;font-family:Consolas,monospace;margin:4px 0;">${total.toLocaleString('pt-BR')}</div>
          <div style="font-size:11.5px;color:#e2e8f0;">${nomeCamada}</div>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:4px;">${pct}% do total (${totalGeral.toLocaleString('pt-BR')} feições)${filtrosTexto}</div>
        </div>
        ${total > 0 ? `<div style="margin-top:8px;font-size:10.5px;">
          <button onclick="CopilotoIA._destacarContagem()"
                  style="background:#0284c7;color:#fff;border:none;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            🗺️ Destacar no mapa
          </button>
        </div>` : ''}
      `;
    },

    _responderRanking: async function (intencao) {
      const camadaId = intencao.camada;
      const dados = await this._obterDados(camadaId);

      if (!dados || !dados.features || !dados.features.length) {
        return `Sem dados carregados para <strong>${camadaId}</strong>.`;
      }

      // ✅ Lista de campos numéricos candidatos (por prioridade)
      const CAMPOS_EXTENSAO = ['extensao', 'EXTENSAO', 'extensao_km', 'comprimento', 'length', 'length_km'];
      const CAMPOS_AREA = ['area_m2', 'AREA_M2', 'area', 'AREA', 'area_km2', 'shape_area', 'Shape_Area', 'area_total'];
      const CAMPOS_OUTROS = ['volume', 'VOLUME', 'carga', 'movimentacao', 'tonelagem'];

      // Inspeciona várias amostras (não só a primeira) pra achar um campo que tenha valor numérico
      const amostraTamanho = Math.min(10, dados.features.length);
      const chavesComuns = {};

      for (let i = 0; i < amostraTamanho; i++) {
        const p = dados.features[i].properties || {};
        for (const [k, v] of Object.entries(p)) {
          const num = parseFloat(v);
          if (Number.isFinite(num) && num > 0 && !chavesComuns[k]) {
            chavesComuns[k] = num;
          }
        }
      }

      const camposNumericos = Object.keys(chavesComuns);
      console.log('[Copiloto] Campos numéricos disponíveis:', camposNumericos);

      // Detecta o melhor campo
      let campo = null;
      let rotulo = '';
      let formatarValor = null;

      for (const c of CAMPOS_EXTENSAO) {
        if (camposNumericos.includes(c)) {
          campo = c;
          rotulo = 'Extensão (km)';
          formatarValor = (v) => `${v.toFixed(2)} km`;
          break;
        }
      }

      if (!campo) {
        for (const c of CAMPOS_AREA) {
          if (camposNumericos.includes(c)) {
            campo = c;
            rotulo = 'Área';
            formatarValor = (v) => v >= 1_000_000
              ? `${(v / 1_000_000).toFixed(2)} km²`
              : `${(v / 10_000).toFixed(2)} ha`;
            break;
          }
        }
      }

      if (!campo) {
        for (const c of CAMPOS_OUTROS) {
          if (camposNumericos.includes(c)) {
            campo = c;
            rotulo = c;
            formatarValor = (v) => v.toLocaleString('pt-BR');
            break;
          }
        }
      }

      // Fallback: usa o primeiro campo numérico achado (exceto IDs/códigos)
      if (!campo) {
        const IGNORAR = [
          'id', 'codigo', 'cep', 'cnpj', 'cdi', 'gid', 'objectid', 'idhidrovia', 'idseq',
          'numero', 'num', 'n_', 'seq', 'cod', 'matricula', 'registro', 'processo'
        ];
        const candidatoFallback = camposNumericos.find(c => {
          const cl = c.toLowerCase();
          return !IGNORAR.some(ig => cl.includes(ig));
        });
        if (candidatoFallback) {
          campo = candidatoFallback;
          rotulo = campo;
          formatarValor = (v) => v.toLocaleString('pt-BR');
        }
      }

      // ✅ Se NÃO há campo numérico útil, agrupa por UF (mais útil que alfabético)
      if (!campo) {
        const porUF = {};
        for (const f of dados.features) {
          const uf = this._extrairUF(f);
          if (!uf) continue;
          porUF[uf] = (porUF[uf] || 0) + 1;
        }

        const rankingUF = Object.entries(porUF)
          .sort((a, b) => intencao.criterio === 'asc' ? a[1] - b[1] : b[1] - a[1])
          .slice(0, intencao.n);

        const nomeCamada2 = window.CONFIG_CAMADAS[camadaId]?.nome || camadaId;
        let linhasUF = '';
        rankingUF.forEach(([uf, qtd], i) => {
          linhasUF += `<tr>
            <td style="text-align:right;color:#64748b;font-family:Consolas,monospace;padding:3px 6px;">${i + 1}º</td>
            <td style="padding:3px 6px;color:#e2e8f0;font-size:11px;font-weight:700;">${uf}</td>
            <td style="padding:3px 6px;color:#38bdf8;font-family:Consolas,monospace;font-size:11px;text-align:right;">${qtd.toLocaleString('pt-BR')}</td>
          </tr>`;
        });

        // ✅ Guarda os dados agrupados pra exportar CSV de UFs
        this._ultimoRanking = {
          camadaId,
          tipo: 'agrupamento_uf',
          agrupamento: rankingUF,
          features: []  // ← vazio: não tem features individuais
        };

        return `
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
            🏆 Top ${intencao.n} UFs · ${nomeCamada2}
          </div>
          <div style="font-size:10px;color:#64748b;margin-bottom:8px;font-style:italic;">
            ℹ️ Os dados de portos não possuem métrica numérica de tamanho. Mostrando ranking por <strong>quantidade de instalações por UF</strong>.
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead><tr style="border-bottom:1px solid #334155;">
              <th style="text-align:right;padding:3px 6px;color:#94a3b8;font-size:9.5px;">#</th>
              <th style="text-align:left;padding:3px 6px;color:#94a3b8;font-size:9.5px;">UF</th>
              <th style="text-align:right;padding:3px 6px;color:#94a3b8;font-size:9.5px;">Instalações</th>
            </tr></thead>
            <tbody>${linhasUF}</tbody>
          </table>
          <div style="margin-top:8px;">
            <button onclick="CopilotoIA._exportarUltimaResposta(this)"
                    style="background:rgba(2,132,199,0.15);border:1px solid rgba(56,189,248,0.35);color:#7dd3fc;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;">
              💾 CSV (UFs)
            </button>
          </div>
        `;
      }

      // Se achou métrica, ordena normalmente
      const ordenado = [...dados.features].sort((a, b) => {
        const va = parseFloat(a.properties?.[campo]) || 0;
        const vb = parseFloat(b.properties?.[campo]) || 0;
        return intencao.criterio === 'asc' ? va - vb : vb - va;
      });

      const topN = ordenado.slice(0, intencao.n);
      const nomeCamada = window.CONFIG_CAMADAS[camadaId]?.nome || camadaId;

      let linhas = '';
      topN.forEach((f, i) => {
        const p = f.properties || {};
        const nome = p.nome || p.NOME_INSTALACAO || p.nome_rio || p.NOME_RIO || p.SIGLA_UF || '—';
        const valor = campo ? parseFloat(p[campo] || 0) : 0;
        const valorFmt = formatarValor ? formatarValor(valor) : '—';
        const uf = this._extrairUF(f) || '—';

        linhas += `<tr>
          <td style="text-align:right;color:#64748b;font-family:Consolas,monospace;padding:3px 6px;">${i + 1}º</td>
          <td style="padding:3px 6px;color:#e2e8f0;font-size:10.5px;">${window.Security.escapeHTML(nome)}</td>
          <td style="padding:3px 6px;color:#38bdf8;font-family:Consolas,monospace;font-size:10.5px;text-align:right;">${valorFmt}</td>
          <td style="padding:3px 6px;color:#94a3b8;font-size:10px;">${uf}</td>
        </tr>`;
      });

      // Salva o ranking pra destacar no mapa
      this._ultimoRanking = { camadaId, features: topN };

      return `
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
          🏆 Top ${intencao.n} · ${nomeCamada} · <span style="color:#38bdf8;">${rotulo}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead><tr style="border-bottom:1px solid #334155;">
            <th style="text-align:right;padding:3px 6px;color:#94a3b8;font-size:9.5px;">#</th>
            <th style="text-align:left;padding:3px 6px;color:#94a3b8;font-size:9.5px;">Nome</th>
            <th style="text-align:right;padding:3px 6px;color:#94a3b8;font-size:9.5px;">${rotulo}</th>
            <th style="text-align:left;padding:3px 6px;color:#94a3b8;font-size:9.5px;">UF</th>
          </tr></thead>
          <tbody>${linhas}</tbody>
        </table>
        <div style="margin-top:8px;">
          <button onclick="CopilotoIA._destacarRanking()"
                  style="background:#0284c7;color:#fff;border:none;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            🗺️ Destacar ${topN.length} no mapa
          </button>
        </div>
      `;
    },

    _responderFicha: async function (intencao) {
      const alvo = intencao.alvo;
      const buscaNorm = alvo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Busca em todas as camadas
      let achado = null;
      for (const [id, dados] of Object.entries(DADOS_GEOJSON_BRUTOS)) {
        if (!dados || !dados.features) continue;
        for (const f of dados.features) {
          const p = f.properties || {};
          const nome = String(p.nome || p.NOME_INSTALACAO || p.nome_rio || p.NOME_RIO || p.terrai_nom || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (nome.includes(buscaNorm)) {
            achado = { feature: f, camadaId: id };
            break;
          }
        }
        if (achado) break;
      }

      if (!achado) {
        return `Não encontrei nada com "<strong>${window.Security.escapeHTML(alvo)}</strong>".<br><br>
                Tente o nome exato de um porto, rio ou travessia.`;
      }

      const p = achado.feature.properties || {};
      const nomeCamada = window.CONFIG_CAMADAS[achado.camadaId]?.nome || achado.camadaId;

      // ✅ Prioriza campos informativos (não corta na 12ª chave)
      const PRIORITARIOS = ['nome', 'tipo', 'modalidade', 'situacao', 'estado', 'cidade', 'endereco', 'bairro', 'companhia', 'cnpj', 'legislacao', 'observacao', 'fonte', 'gestao'];
      const todos = Object.keys(p).filter(k =>
        !['geom', 'geometry', 'id', 'gid', 'objectid'].includes(k.toLowerCase())
      );

      // Ordena: prioritários primeiro (na ordem da lista), depois os outros
      const ordenadas = [
        ...PRIORITARIOS.filter(k => todos.includes(k)),
        ...todos.filter(k => !PRIORITARIOS.includes(k))
      ];

      let linhas = '';
      for (const k of ordenadas.slice(0, 15)) {
        const v = p[k];
        if (v === null || v === undefined || v === '') continue;
        linhas += `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed rgba(148,163,184,0.15);gap:8px;">
          <span style="color:#94a3b8;font-size:10px;font-weight:600;flex-shrink:0;">${window.Security.escapeHTML(k)}</span>
          <span style="color:#e2e8f0;font-size:10.5px;text-align:right;word-break:break-word;">${window.Security.escapeHTML(v)}</span>
        </div>`;
      }
      // ✅ Guarda a feature encontrada pra destacar
      this._ultimaFicha = achado;

      return `
        <div style="font-size:12px;color:#38bdf8;font-weight:800;margin-bottom:6px;">${window.Security.escapeHTML(p.nome || p.NOME_INSTALACAO || p.nome_rio || alvo)}</div>
        <div style="font-size:9.5px;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${nomeCamada}</div>
        ${linhas}
        <div style="margin-top:8px;">
          <button onclick="CopilotoIA._destacarFicha()"
                  style="background:#0284c7;color:#fff;border:none;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            🗺️ Ver no mapa
          </button>
        </div>
      `;
    },

    _responderGeo: async function (intencao) {
      if (!intencao.alvo) {
        return `Preciso saber <strong>perto do quê</strong>. Tente:<br>
                • <code>"Portos a menos de 50km de TIs"</code><br>
                • <code>"Portos a menos de 100km de UCs"</code>`;
      }

      const dadosOrigem = await this._obterDados(intencao.camada);
      const dadosAlvo = await this._obterDados(intencao.alvo);

      if (!dadosOrigem?.features?.length) return `Sem dados em <strong>${intencao.camada}</strong>.`;
      if (!dadosAlvo?.features?.length) return `Sem dados em <strong>${intencao.alvo}</strong>.`;

      if (typeof turf === 'undefined') return 'Biblioteca Turf.js indisponível.';

      const raioKm = intencao.raio;
      const resultados = [];

      for (const f of dadosOrigem.features) {
        const ponto = this._pontoDe(f);
        if (!ponto) continue;

        let achouPerto = false;
        for (const alvo of dadosAlvo.features) {
          const dist = this._distanciaAproximada(ponto, alvo);
          if (dist !== null && dist <= raioKm) {
            achouPerto = true;
            break;
          }
        }
        if (achouPerto) resultados.push(f);
      }

      const nomeOrigem = window.CONFIG_CAMADAS[intencao.camada]?.nome || intencao.camada;
      const nomeAlvo = window.CONFIG_CAMADAS[intencao.alvo]?.nome || intencao.alvo;

      // Guarda resultado pro botão "ver no mapa"
      this._ultimoResultadoGeo = resultados;

      return `
        <div style="background:rgba(16,185,129,0.12);border-left:3px solid #10b981;padding:10px 12px;border-radius:6px;">
          <div style="font-size:11px;color:#a7f3d0;text-transform:uppercase;letter-spacing:0.5px;">Análise geoespacial</div>
          <div style="font-size:22px;color:#34d399;font-weight:800;font-family:Consolas,monospace;margin:4px 0;">${resultados.length.toLocaleString('pt-BR')}</div>
          <div style="font-size:11.5px;color:#e2e8f0;">${nomeOrigem}</div>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:4px;">
            Dentro de <strong>${raioKm} km</strong> de ${nomeAlvo}
          </div>
        </div>
        ${resultados.length > 0 ? `<div style="margin-top:8px;">
          <button onclick="CopilotoIA._destacarGeo()"
                  style="background:#10b981;color:#fff;border:none;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            🗺️ Destacar no mapa
          </button>
        </div>` : ''}
      `;
    },
    /* ============================================================
       1c — HANDLERS GEOGRÁFICOS AVANÇADOS
       ============================================================ */

    _responderContido: async function (intencao) {
      const dadosOrigem = await this._obterDados(intencao.camada);
      if (!dadosOrigem?.features?.length) return `Sem dados em <strong>${intencao.camada}</strong>.`;

      // ✅ Verifica se a camada alvo existe nos dados
      const dadosAlvo = await this._obterDados(intencao.alvo);

      // Se NÃO existe, tenta fallback por região conhecida (ex: Amazônia Legal = lista de UFs)
      if (!dadosAlvo?.features?.length) {
        const regioes = {
          'estados_amazonia_legal': {
            nome: 'Amazônia Legal',
            ufs: ['AC','AP','AM','MA','MT','PA','RO','RR','TO']
          }
        };
        const regiao = regioes[intencao.alvo];
        if (regiao) {
          return this._responderContidoPorUF(intencao, dadosOrigem, regiao);
        }
        return `Camada <strong>${intencao.alvoNome || intencao.alvo}</strong> indisponível.`;
      }

      if (typeof turf === 'undefined') return 'Turf.js indisponível.';

      // Filtra só polígonos do alvo
      const poligonos = dadosAlvo.features.filter(f =>
        f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
      );
      if (!poligonos.length) {
        return `A camada <strong>${intencao.alvoNome || intencao.alvo}</strong> não tem polígonos.`;
      }

      // Testa ponto-em-polígono OU linha-intercepta-polígono
      const dentro = [];
      for (const f of dadosOrigem.features) {
        if (!f || !f.geometry) continue;
        const tipoGeom = f.geometry.type;

        if (tipoGeom === 'Point' || tipoGeom === 'MultiPoint') {
          const ponto = this._pontoDe(f);
          if (!ponto) continue;
          const ptGeoJSON = { type: 'Point', coordinates: [ponto[1], ponto[0]] };
          for (const poly of poligonos) {
            try {
              if (turf.booleanPointInPolygon(ptGeoJSON, poly)) {
                dentro.push(f);
                break;
              }
            } catch (e) { /* ignora */ }
          }
        } else if (tipoGeom.includes('LineString')) {
          for (const poly of poligonos) {
            try {
              if (turf.booleanIntersects(f, poly)) {
                dentro.push(f);
                break;
              }
            } catch (e) { /* ignora */ }
          }
        }
      }

      const nomeOrigem = window.CONFIG_CAMADAS[intencao.camada]?.nome || intencao.camada;
      const nomeAlvo = intencao.alvoNome || window.CONFIG_CAMADAS[intencao.alvo]?.nome || intencao.alvo;

      this._ultimaContagem = { camadaId: intencao.camada, features: dentro };

      const pct = dadosOrigem.features.length > 0
        ? ((dentro.length / dadosOrigem.features.length) * 100).toFixed(1)
        : '0';

      return `
        <div style="background:rgba(139,92,246,0.15);border-left:3px solid #8b5cf6;padding:10px 12px;border-radius:6px;">
          <div style="font-size:11px;color:#c4b5fd;text-transform:uppercase;letter-spacing:0.5px;">Análise espacial · contenção</div>
          <div style="font-size:22px;color:#a78bfa;font-weight:800;font-family:Consolas,monospace;margin:4px 0;">${dentro.length.toLocaleString('pt-BR')}</div>
          <div style="font-size:11.5px;color:#e2e8f0;">${nomeOrigem}</div>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:4px;">
            Dentro de <strong>${nomeAlvo}</strong> · ${pct}% do total (${dadosOrigem.features.length.toLocaleString('pt-BR')})
          </div>
        </div>
        ${dentro.length > 0 ? `<div style="margin-top:8px;">
          <button onclick="CopilotoIA._destacarContagem()"
                  style="background:#8b5cf6;color:#fff;border:none;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            🗺️ Destacar no mapa
          </button>
        </div>` : ''}
      `;
    },

    /**
     * Fallback: contenção por lista de UFs (quando camada poligonal não existe).
     */
    /**
     * Fallback: contenção por lista de UFs (quando camada poligonal não existe).
     * Se a feição não tem UF nos atributos, faz lookup geográfico pelo centroide.
     */
    _responderContidoPorUF: async function (intencao, dadosOrigem, regiao) {
      // ✅ Carrega a camada de UFs pra lookup geográfico (fallback)
      const dadosUF = await this._obterDados('uf');
      const poligonosUF = dadosUF?.features?.filter(f =>
        f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
      ) || [];

      // Cache: memoiza UF por feição pra não recalcular
      const cacheUF = new Map();

      const descobrirUF = (f) => {
        // 1) Tenta pelos atributos
        let uf = this._extrairUF(f);
        if (uf) return uf;

        // 2) Fallback geográfico: testa o centroide contra os polígonos de UF
        if (!poligonosUF.length || typeof turf === 'undefined') return '';

        const ponto = this._pontoDe(f);
        if (!ponto) return '';

        const ptGeoJSON = { type: 'Point', coordinates: [ponto[1], ponto[0]] };

        for (const ufFeature of poligonosUF) {
          try {
            if (turf.booleanPointInPolygon(ptGeoJSON, ufFeature)) {
              const p = ufFeature.properties || {};
              const sigla = String(p.SIGLA_UF || p.sigla_uf || p.UF || p.uf || p.CD_UF || '').trim().toUpperCase();
              if (sigla) return sigla;
            }
          } catch (e) { /* ignora */ }
        }
        return '';
      };

      const dentro = [];
      const semUF = [];

      for (const f of dadosOrigem.features) {
        const chave = f.id || JSON.stringify(f.properties || {}).slice(0, 100);
        let uf = cacheUF.get(chave);
        if (uf === undefined) {
          uf = descobrirUF(f);
          cacheUF.set(chave, uf);
        }

        if (uf && regiao.ufs.includes(uf)) {
          dentro.push(f);
        } else if (!uf) {
          semUF.push(f);
        }
      }

      const nomeOrigem = window.CONFIG_CAMADAS[intencao.camada]?.nome || intencao.camada;
      this._ultimaContagem = { camadaId: intencao.camada, features: dentro };

      const pct = dadosOrigem.features.length > 0
        ? ((dentro.length / dadosOrigem.features.length) * 100).toFixed(1)
        : '0';

      // Conta por UF dentro da região
      const porUF = {};
      dentro.forEach(f => {
        const chave = f.id || JSON.stringify(f.properties || {}).slice(0, 100);
        const uf = cacheUF.get(chave);
        if (uf) porUF[uf] = (porUF[uf] || 0) + 1;
      });
      const topUF = Object.entries(porUF).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const linhasUF = topUF.map(([uf, qtd]) =>
        `<tr>
          <td style="padding:2px 6px;color:#e2e8f0;font-size:10.5px;font-weight:700;">${uf}</td>
          <td style="padding:2px 6px;color:#a78bfa;font-family:Consolas,monospace;font-size:10.5px;text-align:right;">${qtd}</td>
        </tr>`
      ).join('');

      const avisoSemUF = semUF.length > 0
        ? `<div style="margin-top:6px;font-size:9.5px;color:#64748b;font-style:italic;">
             ℹ️ ${semUF.length} feição(ões) não puderam ser localizadas geograficamente.
           </div>`
        : '';

      return `
        <div style="background:rgba(139,92,246,0.15);border-left:3px solid #8b5cf6;padding:10px 12px;border-radius:6px;">
          <div style="font-size:11px;color:#c4b5fd;text-transform:uppercase;letter-spacing:0.5px;">Análise por UF</div>
          <div style="font-size:22px;color:#a78bfa;font-weight:800;font-family:Consolas,monospace;margin:4px 0;">${dentro.length.toLocaleString('pt-BR')}</div>
          <div style="font-size:11.5px;color:#e2e8f0;">${nomeOrigem}</div>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:4px;">
            Na <strong>${regiao.nome}</strong> · ${pct}% do total (${dadosOrigem.features.length.toLocaleString('pt-BR')})
          </div>
          ${avisoSemUF}
        </div>
        ${topUF.length > 0 ? `
          <div style="margin-top:10px;font-size:10.5px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
            📍 Top 5 UFs (da região)
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <tbody>${linhasUF}</tbody>
          </table>
        ` : ''}
        ${dentro.length > 0 ? `<div style="margin-top:8px;">
          <button onclick="CopilotoIA._destacarContagem()"
                  style="background:#8b5cf6;color:#fff;border:none;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            🗺️ Destacar no mapa
          </button>
        </div>` : ''}
      `;
    },

    _responderCruzaUF: async function (intencao) {
      const dados = await this._obterDados(intencao.camada);
      if (!dados?.features?.length) return `Sem dados em <strong>${intencao.camada}</strong>.`;

      const cruzam = dados.features.filter(f => {
        const p = f.properties || {};
        const orig = (p.est_origem || p.EST_ORIGEM || p.estado_origem || '').toString().trim().toUpperCase();
        const dest = (p.est_estino || p.EST_DESTINO || p.estado_destino || '').toString().trim().toUpperCase();
        return orig && dest && orig.length === 2 && dest.length === 2 && orig !== dest;
      });

      const nomeCamada = window.CONFIG_CAMADAS[intencao.camada]?.nome || intencao.camada;
      const pct = dados.features.length > 0
        ? ((cruzam.length / dados.features.length) * 100).toFixed(1)
        : '0';

      this._ultimaContagem = { camadaId: intencao.camada, features: cruzam };

      // Monta lista de pares UF (ex: PA-AP, MA-TO)
      const paresUF = {};
      cruzam.forEach(f => {
        const p = f.properties || {};
        const orig = (p.est_origem || p.EST_ORIGEM || '').trim().toUpperCase();
        const dest = (p.est_estino || p.EST_DESTINO || '').trim().toUpperCase();
        if (orig && dest) {
          const par = [orig, dest].sort().join('-');
          paresUF[par] = (paresUF[par] || 0) + 1;
        }
      });

      const topPares = Object.entries(paresUF)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

      let linhasPares = '';
      topPares.forEach(([par, qtd]) => {
        linhasPares += `<tr>
          <td style="padding:3px 8px;color:#e2e8f0;font-size:11px;font-weight:700;">${par}</td>
          <td style="padding:3px 8px;color:#38bdf8;font-family:Consolas,monospace;font-size:11px;text-align:right;">${qtd}</td>
        </tr>`;
      });

      return `
        <div style="background:rgba(236,72,153,0.15);border-left:3px solid #ec4899;padding:10px 12px;border-radius:6px;">
          <div style="font-size:11px;color:#f9a8d4;text-transform:uppercase;letter-spacing:0.5px;">Travessias interestaduais</div>
          <div style="font-size:22px;color:#f472b6;font-weight:800;font-family:Consolas,monospace;margin:4px 0;">${cruzam.length.toLocaleString('pt-BR')}</div>
          <div style="font-size:11.5px;color:#e2e8f0;">${nomeCamada}</div>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:4px;">
            ${pct}% do total (${dados.features.length.toLocaleString('pt-BR')})
          </div>
        </div>
        ${topPares.length > 0 ? `
          <div style="margin-top:10px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
            🔗 Principais conexões entre UFs
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <tbody>${linhasPares}</tbody>
          </table>
        ` : ''}
        ${cruzam.length > 0 ? `<div style="margin-top:8px;">
          <button onclick="CopilotoIA._destacarContagem()"
                  style="background:#ec4899;color:#fff;border:none;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            🗺️ Destacar no mapa
          </button>
        </div>` : ''}
      `;
    },

    _responderBufferPonto: async function (intencao) {
      const ponto = await this._localizarPonto(intencao.pontoNome);
      if (!ponto) {
        return `Não encontrei o local "<strong>${window.Security.escapeHTML(intencao.pontoNome)}</strong>".<br>
                Tente o nome de uma cidade ou porto conhecido.`;
      }

      const dados = await this._obterDados(intencao.camada);
      if (!dados?.features?.length) return `Sem dados em <strong>${intencao.camada}</strong>.`;
      if (typeof turf === 'undefined') return 'Turf.js indisponível.';

      const raioKm = intencao.raio;
      const dentro = [];

      for (const f of dados.features) {
        const p = this._pontoDe(f);
        if (!p) continue;
        try {
          const dist = turf.distance(
            [ponto.lng, ponto.lat],
            [p[1], p[0]],
            { units: 'kilometers' }
          );
          if (dist <= raioKm) dentro.push(f);
        } catch (e) { /* ignora */ }
      }

      const nomeCamada = window.CONFIG_CAMADAS[intencao.camada]?.nome || intencao.camada;

      // Guarda pro botão "Destacar"
      this._ultimaContagem = { camadaId: intencao.camada, features: dentro };
      this._ultimoBufferPonto = { lat: ponto.lat, lng: ponto.lng, raioKm };

      return `
        <div style="background:rgba(245,158,11,0.15);border-left:3px solid #f59e0b;padding:10px 12px;border-radius:6px;">
          <div style="font-size:11px;color:#fcd34d;text-transform:uppercase;letter-spacing:0.5px;">Raio de proximidade</div>
          <div style="font-size:22px;color:#fbbf24;font-weight:800;font-family:Consolas,monospace;margin:4px 0;">${dentro.length.toLocaleString('pt-BR')}</div>
          <div style="font-size:11.5px;color:#e2e8f0;">${nomeCamada}</div>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:4px;">
            Até <strong>${raioKm} km</strong> de <strong>${window.Security.escapeHTML(intencao.pontoNome)}</strong>
          </div>
        </div>
        ${dentro.length > 0 ? `<div style="margin-top:8px;display:flex;gap:6px;">
          <button onclick="CopilotoIA._destacarContagem()"
                  style="background:#f59e0b;color:#000;border:none;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            🗺️ Destacar no mapa
          </button>
          <button onclick="CopilotoIA._desenharCirculoBuffer()"
                  style="background:transparent;color:#fbbf24;border:1px solid #f59e0b;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            ⭕ Mostrar círculo ${raioKm} km
          </button>
        </div>` : ''}
      `;
    },

    /* ---------- Helpers geográficos ---------- */

    /**
     * Localiza um ponto (cidade/porto) nas camadas carregadas.
     * Retorna { lat, lng } ou null.
     */
    _localizarPonto: async function (nome) {
      const alvo = String(nome).trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // 1. Busca nas Instalações Portuárias (mais preciso)
      const portos = DADOS_GEOJSON_BRUTOS['instalacoes_portuarias'];
      if (portos?.features) {
        for (const f of portos.features) {
          const p = f.properties || {};
          const nomeFeicao = String(p.nome || p.NOME_INSTALACAO || p.cidade || p.municipio || '').toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (nomeFeicao.includes(alvo)) {
            const pt = this._pontoDe(f);
            if (pt) return { lat: pt[0], lng: pt[1] };
          }
        }
      }

      // 2. Busca em todas as camadas
      for (const [id, dados] of Object.entries(DADOS_GEOJSON_BRUTOS)) {
        if (id === 'instalacoes_portuarias' || !dados?.features) continue;
        for (const f of dados.features) {
          const p = f.properties || {};
          const nomeFeicao = String(p.nome || p.NOME || p.cidade || p.municipio || '').toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (nomeFeicao.includes(alvo)) {
            const pt = this._pontoDe(f);
            if (pt) return { lat: pt[0], lng: pt[1] };
          }
        }
      }

      // 3. Fallback: geocoding simples (não implementado)
      return null;
    },

    /**
     * Desenha círculo visual do buffer no mapa.
     */
    _desenharCirculoBuffer: function () {
      const buf = this._ultimoBufferPonto;
      if (!buf) return;

      // Remove círculo anterior
      if (this._bufferCircle) {
        try { window.mapa.removeLayer(this._bufferCircle); } catch (e) {}
      }

      this._bufferCircle = L.circle([buf.lat, buf.lng], {
        radius: buf.raioKm * 1000,
        color: '#f59e0b',
        weight: 3,
        fillColor: '#f59e0b',
        fillOpacity: 0.1,
        dashArray: '6, 6',
        pane: 'paneLinhas'
      }).addTo(window.mapa);

      window.mapa.fitBounds(this._bufferCircle.getBounds(), { padding: [40, 40] });
      if (window.UI) window.UI.toast(`⭕ Círculo de ${buf.raioKm} km desenhado no mapa.`);
    },
    _responderComparacao: async function (intencao) {
      if (!window.SafraDiffManager) return 'Módulo de comparação indisponível.';

      return `
        Vou abrir o <strong>comparador de safras VEN</strong>.<br><br>
        Base: <strong>${intencao.safraA.replace('ven_','')}</strong> ·
        Comparada: <strong>${intencao.safraB.replace('ven_','')}</strong>
        <div style="margin-top:8px;">
          <button onclick="SafraDiffManager.abrir(); setTimeout(() => { document.getElementById('diff-safra-a').value='${intencao.safraA}'; document.getElementById('diff-safra-b').value='${intencao.safraB}'; document.getElementById('btn-diff-comparar').click(); }, 500);"
                  style="background:#0369a1;color:#fff;border:none;padding:6px 14px;border-radius:4px;font-weight:700;cursor:pointer;font-size:11px;">
            🔀 Comparar agora
          </button>
        </div>
      `;
    },

    /* ============================================================
       HELPERS
       ============================================================ */

    _obterDados: async function (camadaId) {
      // Resolve VEN virtual → safra ativa
      if (camadaId === 'ven') {
        const ano = window.VENUnifiedManager?.anoAtivo || 'ven_2022';
        camadaId = ano;
      }

      // Já carregado?
      if (DADOS_GEOJSON_BRUTOS[camadaId]) return DADOS_GEOJSON_BRUTOS[camadaId];

      // Carrega sob demanda
      try {
        await window.DataManager.carregarCamada(camadaId);
        return DADOS_GEOJSON_BRUTOS[camadaId];
      } catch (e) {
        return null;
      }
    },

    _extrairUF: function (f) {
      const p = f.properties || {};

      // 1) Sigla direta (2 letras)
      for (const k of ['SIGLA_UF','sigla_uf','uf','UF','est_uf','sg_uf','est_origem','EST_ORIGEM','est_destino','EST_DESTINO']) {
        const v = p[k];
        if (v && String(v).trim().length === 2) return String(v).trim().toUpperCase();
      }

      // 2) Município no formato "Cidade/UF"
      for (const k of ['municipio','MUNICIPIO','nome_municipio']) {
        const v = p[k];
        if (v && String(v).includes('/')) {
          const partes = String(v).split('/');
          if (partes.length > 1) {
            const uf = partes[1].trim().toUpperCase();
            if (uf.length === 2) return uf;
          }
        }
      }

      // 3) ✅ Estado por extenso ("PARÁ", "Amazonas"...) → sigla
      const mapaEstados = {
        'acre':'AC','alagoas':'AL','amapa':'AP','amazonas':'AM','bahia':'BA',
        'ceara':'CE','distrito federal':'DF','espirito santo':'ES','goias':'GO',
        'maranhao':'MA','mato grosso':'MT','mato grosso do sul':'MS',
        'minas gerais':'MG','para':'PA','paraiba':'PB','parana':'PR',
        'pernambuco':'PE','piaui':'PI','rio de janeiro':'RJ',
        'rio grande do norte':'RN','rio grande do sul':'RS','rondonia':'RO',
        'roraima':'RR','santa catarina':'SC','sao paulo':'SP','sergipe':'SE','tocantins':'TO'
      };
      for (const k of ['estado','ESTADO','Estado','uf_nome']) {
        const v = p[k];
        if (!v) continue;
        const norm = String(v).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (mapaEstados[norm]) return mapaEstados[norm];
        if (norm.length === 2) return norm.toUpperCase();
      }

      return '';
    },

    _pontoDe: function (f) {
      // Point
      if (f.geometry?.type === 'Point') {
        const [lng, lat] = f.geometry.coordinates;
        return [lat, lng];
      }
      // LineString → ponto médio
      if (f.geometry?.type === 'LineString' && f.geometry.coordinates.length > 0) {
        const c = f.geometry.coordinates;
        const meio = c[Math.floor(c.length / 2)];
        return [meio[1], meio[0]];
      }
      // Polygon → centroide do primeiro anel
      if (f.geometry?.type === 'Polygon' && f.geometry.coordinates[0]?.length > 0) {
        const anel = f.geometry.coordinates[0];
        const lng = anel.reduce((s, c) => s + c[0], 0) / anel.length;
        const lat = anel.reduce((s, c) => s + c[1], 0) / anel.length;
        return [lat, lng];
      }
      return null;
    },

    _distanciaAproximada: function (ponto, alvoFeature) {
      if (typeof turf === 'undefined') return null;
      const pontoAlvo = this._pontoDe(alvoFeature);
      if (!pontoAlvo) return null;
      try {
        return turf.distance(
          [ponto[1], ponto[0]],
          [pontoAlvo[1], pontoAlvo[0]],
          { units: 'kilometers' }
        );
      } catch (e) {
        return null;
      }
    },

     /* ---------- Ações dos botões ---------- */

    _limparDestaque: function () {
      if (window.CAMADA_DESTAQUE) {
        try { window.mapa.removeLayer(window.CAMADA_DESTAQUE); } catch (e) {}
        window.CAMADA_DESTAQUE = null;
      }
    },

    _desenharDestaque: function (features, cor) {
      cor = cor || '#0284c7';
      if (!features || !features.length) return;

      this._limparDestaque();

      try {
        window.CAMADA_DESTAQUE = L.geoJSON(
          { type: 'FeatureCollection', features },
          {
            pane: 'paneSelecao',
            style: { color: cor, weight: 4, fillOpacity: 0.35, fillColor: cor },
            pointToLayer: (f, latlng) => L.circleMarker(latlng, {
              pane: 'panePontos',
              radius: 9, fillColor: cor, color: '#ffffff', weight: 2.5, fillOpacity: 0.95
            })
          }
        ).addTo(window.mapa);

        const bounds = window.CAMADA_DESTAQUE.getBounds();
        if (bounds.isValid()) {
          window.mapa.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }
        if (window.UI) window.UI.toast(`✓ ${features.length} feições destacadas no mapa.`);
      } catch (e) {
        console.warn('[Copiloto] Erro ao desenhar destaque:', e);
        if (window.UI) window.UI.toast('⚠️ Erro ao destacar no mapa.');
      }
    },

    _destacarContagem: function () {
      const dados = this._ultimaContagem;
      if (!dados || !dados.features || !dados.features.length) {
        if (window.UI) window.UI.toast('Nada para destacar.');
        return;
      }
      this._desenharDestaque(dados.features, '#0284c7');
    },

    _destacarRanking: function () {
      const dados = this._ultimoRanking;
      if (!dados || !dados.features || !dados.features.length) {
        if (window.UI) window.UI.toast('Nada para destacar.');
        return;
      }
      this._desenharDestaque(dados.features, '#38bdf8');
    },

    _destacarFicha: function () {
      const dados = this._ultimaFicha;
      if (!dados || !dados.feature) {
        if (window.UI) window.UI.toast('Nada para destacar.');
        return;
      }
      this._desenharDestaque([dados.feature], '#f59e0b');
    },

    _destacarGeo: function () {
      const features = this._ultimoResultadoGeo;
      if (!features || !features.length) {
        if (window.UI) window.UI.toast('Nada para destacar.');
        return;
      }
      this._desenharDestaque(features, '#10b981');
    },
    /* ============================================================
       1e-1 — HISTÓRICO E AÇÕES DE RESPOSTA
       ============================================================ */
    _limparBarrasAntigas: function () {
      try {
        const container = document.getElementById('copiloto-mensagens');
        if (!container) return;
        const barras = container.querySelectorAll('.copiloto-acoes-resposta');
        barras.forEach(b => b.remove());
        console.log(`[Copiloto] ${barras.length} barra(s) antiga(s) removida(s).`);
      } catch (e) {
        console.warn('[Copiloto] Erro ao limpar barras:', e);
      }
    },
    _montarBarraAcoes: function (pergunta, respostaHTML) {
      // ✅ Se a resposta já trouxe sua própria barra (ex: Top 10 UFs), não adiciona outra
      if (respostaHTML && respostaHTML.includes('copiloto-acoes-resposta')) {
        return '';
      }

      const perguntaEsc = window.Security.escapeHTML(pergunta);

      return `
        <div class="copiloto-acoes-resposta" data-pergunta="${perguntaEsc}">
          <button onclick="CopilotoIA._copiarUltimaResposta(this)" title="Copiar resposta como texto">
            📋 Copiar
          </button>
          <button onclick="CopilotoIA._exportarUltimaResposta(this)" title="Exportar features em CSV">
            💾 CSV
          </button>
          <button onclick="CopilotoIA._compartilharConsulta(this)" title="Copiar link que reabre esta consulta">
            🔗 Compartilhar
          </button>
        </div>
      `;
    },

    _registrarNoHistorico: function (pergunta, respostaHTML) {
      // Salva a resposta como texto plano (remove HTML)
      const textoPlano = String(respostaHTML)
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

      // Guarda a "última resposta" pra ações de CSV
      this._ultimaResposta = {
        pergunta: pergunta,
        html: respostaHTML,
        textoPlano: textoPlano,
        features: (this._ultimaContagem?.features && this._ultimaContagem.features.length > 0) ? this._ultimaContagem.features
               : (this._ultimoRanking?.features && this._ultimoRanking.features.length > 0) ? this._ultimoRanking.features
               : (this._ultimoResultadoGeo && this._ultimoResultadoGeo.length > 0) ? this._ultimoResultadoGeo
               : (this._ultimaFicha?.feature ? [this._ultimaFicha.feature] : null),
        agrupamento: this._ultimoRanking?.agrupamento || null,   // ✅ NOVO
        camadaId: this._ultimaContagem?.camadaId
               || this._ultimoRanking?.camadaId
               || null,
        timestamp: new Date()
      };

      // Adiciona ao histórico (não duplica perguntas idênticas recentes)
      const ultima = this._historico[0];
      if (ultima && ultima.pergunta === pergunta) {
        this._historico[0] = this._ultimaResposta;
      } else {
        this._historico.unshift(this._ultimaResposta);
        if (this._historico.length > this._maxHistorico) {
          this._historico = this._historico.slice(0, this._maxHistorico);
        }
      }

      this._atualizarBotaoHistoricoCopiloto();
    },

    _atualizarBotaoHistoricoCopiloto: function () {
      const btn = document.getElementById('btn-copiloto-historico');
      if (!btn) return;
      if (this._historico.length > 0) {
        btn.classList.add('visivel');
        btn.title = `Histórico (${this._historico.length})`;
      } else {
        btn.classList.remove('visivel');
      }
    },

    _copiarUltimaResposta: function (botao) {
      if (!this._ultimaResposta) {
        if (window.UI) window.UI.toast('⚠️ Nada para copiar.');
        return;
      }

      // Se o botão passado foi de uma resposta antiga, pega a pergunta do data attribute
      const pergunta = botao ? botao.closest('.copiloto-acoes-resposta')?.dataset.pergunta : null;
      const entrada = pergunta
        ? this._historico.find(h => h.pergunta === pergunta) || this._ultimaResposta
        : this._ultimaResposta;

      const texto = `# ${entrada.pergunta}\n\n${entrada.textoPlano}`;

      navigator.clipboard.writeText(texto).then(() => {
        if (window.UI) window.UI.toast('📋 Resposta copiada para a área de transferência.');
      }).catch(() => {
        if (window.UI) window.UI.toast('⚠️ Não foi possível copiar.');
      });
    },

    _exportarUltimaResposta: function (botao) {
      const pergunta = botao ? botao.closest('.copiloto-acoes-resposta')?.dataset.pergunta : null;
      const entrada = pergunta
        ? this._historico.find(h => h.pergunta === pergunta) || this._ultimaResposta
        : this._ultimaResposta;

      // ✅ Caso especial: ranking agrupado por UF → exporta CSV de agrupamento
      if (entrada && entrada.agrupamento && entrada.agrupamento.length > 0) {
        const linhas = ['"UF";"Quantidade"'];
        entrada.agrupamento.forEach(([uf, qtd]) => {
          linhas.push(`"${uf}";"${qtd}"`);
        });
        const csv = '\uFEFF' + linhas.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const slug = String(entrada.pergunta).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
        a.href = url;
        a.download = `copiloto_${slug}_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (window.UI) window.UI.toast(`💾 CSV de agrupamento exportado (${entrada.agrupamento.length} UFs).`);
        return;
      }

      if (!entrada || !entrada.features || !entrada.features.length) {
        if (window.UI) window.UI.toast('⚠️ Esta resposta não tem dados para exportar.');
        return;
      }

      // Coleta todas as chaves únicas
      const chaves = new Set();
      entrada.features.forEach(f => {
        Object.keys(f.properties || {}).forEach(k => {
          if (!['geom', 'geometry'].includes(k.toLowerCase())) chaves.add(k);
        });
      });
      const colunas = [...chaves];

      const linhas = [colunas.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')];
      entrada.features.forEach(f => {
        const p = f.properties || {};
        const row = colunas.map(c => {
          const v = p[c] !== undefined && p[c] !== null ? p[c] : '';
          return `"${String(v).replace(/"/g, '""')}"`;
        });
        linhas.push(row.join(';'));
      });

      const csv = '\uFEFF' + linhas.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const slug = String(entrada.pergunta).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
      a.href = url;
      a.download = `copiloto_${slug}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (window.UI) window.UI.toast(`💾 CSV exportado com ${entrada.features.length} linhas.`);
    },
    /* ============================================================
       1e-2 — URL COMPARTILHÁVEL
       ============================================================ */

    /**
     * Gera URL com `?copiloto=<pergunta>` que reabre a consulta.
     */
    _gerarUrlConsulta: function (pergunta) {
      const url = new URL(location.href);
      // Limpa parâmetros antigos
      url.searchParams.delete('copiloto');
      // Adiciona o novo (URLSearchParams faz o encode automaticamente)
      url.searchParams.set('copiloto', pergunta);
      return url.toString();
    },

    /**
     * Botão "🔗 Compartilhar": copia o link com a consulta.
     */
    _compartilharConsulta: function (botao) {
      const pergunta = botao ? botao.closest('.copiloto-acoes-resposta')?.dataset.pergunta : null;
      if (!pergunta) {
        if (window.UI) window.UI.toast('⚠️ Não foi possível identificar a pergunta.');
        return;
      }

      const url = this._gerarUrlConsulta(pergunta);

      navigator.clipboard.writeText(url).then(() => {
        if (window.UI) {
          window.UI.toast(`🔗 Link copiado! Cole em outra aba ou envie por e-mail.<br><small style="color:#94a3b8;font-size:9px;">${window.Security.escapeHTML(url.slice(0, 80))}${url.length > 80 ? '…' : ''}</small>`);
        }
      }).catch(() => {
        // Fallback: abre prompt pra copiar manualmente
        window.prompt('Copie o link abaixo:', url);
      });
    },

    /**
     * Verifica se a URL tem `?copiloto=...` e executa a consulta automaticamente.
     * Chamado no boot da aplicação.
     */
    verificarConsultaNaUrl: async function () {
      const params = new URLSearchParams(location.search);
      const pergunta = params.get('copiloto');
      if (!pergunta) return;

      console.info('[Copiloto] Consulta detectada na URL:', pergunta);

      // Abre o painel
      if (!this.aberto) this.toggle();

      // Espera o painel estar visível
      await new Promise(r => setTimeout(r, 600));

      // Preenche o input e dispara
      const inp = document.getElementById('copiloto-input');
      if (inp) inp.value = pergunta;

      // Pequeno atraso pro DOM estabilizar
      await new Promise(r => setTimeout(r, 300));

      // Executa a consulta
      this.enviarComandoPredefinido(pergunta);

      // Remove o parâmetro da URL após executar (evita re-rodar ao dar F5)
      try {
        const url = new URL(location.href);
        url.searchParams.delete('copiloto');
        history.replaceState(null, '', url.toString());
      } catch (e) { /* ignora */ }
    },
    /**
     * Executa uma consulta capturada previamente (antes do URLState apagar a URL).
     * Usado pelo boot do app.js.
     */
    _executarConsultaPendente: async function (pergunta) {
      if (!pergunta) return;

      console.info('[Copiloto] Executando consulta pendente:', pergunta);

      // Limpa a flag imediatamente (evita dupla execução)
      window._copilotoConsultaPendente = null;

      // Abre o painel do copiloto
      if (!this.aberto) this.toggle();

      // Espera o painel renderizar
      await new Promise(r => setTimeout(r, 600));

      // Preenche o input
      const inp = document.getElementById('copiloto-input');
      if (inp) inp.value = pergunta;

      // Pequeno atraso pro DOM estabilizar
      await new Promise(r => setTimeout(r, 300));

      // Executa a consulta
      this.enviarComandoPredefinido(pergunta);
    },    
    abrirHistoricoCopiloto: function () {
      const modal = document.getElementById('modal-copiloto-historico');
      if (!modal) return;

      const corpo = document.getElementById('copiloto-historico-corpo');
      if (!corpo) return;

      if (this._historico.length === 0) {
        corpo.innerHTML = '<div class="copiloto-historico-vazio">Nenhuma consulta ainda.</div>';
      } else {
        corpo.innerHTML = this._historico.map((item, idx) => {
          const hora = item.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const data = item.timestamp.toLocaleDateString('pt-BR');
          return `
            <div class="copiloto-historico-item" onclick="CopilotoIA._reabrirConsulta(${idx})">
              <div class="chist-header">
                <span class="chist-hora">${data} · ${hora}</span>
                <span class="chist-badge">${item.features ? item.features.length + ' feições' : 'sem dados'}</span>
              </div>
              <div class="chist-pergunta">${window.Security.escapeHTML(item.pergunta)}</div>
              <div class="chist-preview">${window.Security.escapeHTML(item.textoPlano.slice(0, 120))}${item.textoPlano.length > 120 ? '…' : ''}</div>
            </div>
          `;
        }).join('');
      }

      modal.classList.add('aberto');
    },

    fecharHistoricoCopiloto: function () {
      const modal = document.getElementById('modal-copiloto-historico');
      if (modal) modal.classList.remove('aberto');
    },

    _reabrirConsulta: function (idx) {
      const item = this._historico[idx];
      if (!item) return;

      this.fecharHistoricoCopiloto();

      // ✅ Limpeza agressiva antes de reinjetar
      this._limparBarrasAntigas();

      // Injeta pergunta + resposta no painel
      this.adicionarMensagem('usuario', window.Security.escapeHTML(item.pergunta));
      const div = document.createElement('div');
      div.className = 'msg-ia';
      div.innerHTML = item.html + this._montarBarraAcoes(item.pergunta, item.html);

      const container = document.getElementById('copiloto-mensagens');
      if (container) {
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
      }
    

      // Restaura estado pra ações seguintes
      this._ultimaResposta = item;
    },    
    gerarMinutaNotaTecnica: function (p) {
      const nome = p.nome || p.NOME_INSTALACAO || 'Instalação Portuária';
      const tipo = p.tipo || p.TIPO_INSTALACAO || 'Terminal Portuário';
      const uf = p.SIGLA_UF || p.uf || 'BR';
      const mun = p.municipio || p.MUNICIPIO || 'Não especificado';
      const hoje = new Date().toLocaleDateString('pt-BR');

      return `
        <div style="background:#ffffff; border-left:3px solid #0284c7; padding:8px 10px; margin-top:4px;">
          <div style="font-weight:800; color:#0a2540; font-size:11px; text-transform:uppercase;">MINUTA PRELIMINAR DE NOTA TÉCNICA</div>
          <div style="font-size:9px; color:#64748b; margin-bottom:8px;">ANTAQ • GEE • Data: ${hoje}</div>
          <p><strong>1. OBJETO</strong><br>Instalação <strong>${window.Security.escapeHTML(nome)}</strong>, regime <strong>${window.Security.escapeHTML(tipo)}</strong>, em ${window.Security.escapeHTML(mun)}/${window.Security.escapeHTML(uf)}.</p>
          <p><strong>2. ENQUADRAMENTO (Lei nº 12.815/2013)</strong><br>Sujeita às diretrizes da Lei dos Portos e resoluções ANTAQ.</p>
          <p><strong>3. SOCIOAMBIENTAL</strong><br>Verificar zonas de amortecimento de UCs e Terras Indígenas no RID.</p>
          <p style="color:#0369a1; font-weight:700;">✓ Parecer: Registro regular.</p>
        </div>`;
    },

    chamarGemini: async function (prompt) {
      if (!this.apiKey) throw new Error("Chave Gemini não configurada.");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
      const payload = { contents: [{ parts: [{ text: `Você é o Copiloto Geoespacial da ANTAQ. Responda tecnicamente. Pergunta: ${prompt}` }] }] };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Status ${res.status}: Falha na API Gemini.`);
      const data = await res.json();
      const textoResp = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta.";
      return window.Security.escapeHTML(textoResp).replace(/\n/g, '<br>');
    },

    chamarOpenAI: async function (prompt) {
      if (!this.apiKey) throw new Error("Chave OpenAI não configurada.");
      const url = "https://api.openai.com/v1/chat/completions";
      const payload = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é o Copiloto da ANTAQ. Seja formal e especializado." },
          { role: "user", content: prompt }
        ]
      };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Status ${res.status}: Falha na API OpenAI.`);
      const data = await res.json();
      return window.Security.escapeHTML(data.choices?.[0]?.message?.content || "Sem resposta.").replace(/\n/g, '<br>');
    },

    chamarOllamaLocal: async function (prompt) {
      const url = `${this.urlLocal}/chat/completions`;
      const payload = { model: "llama3", messages: [{ role: "system", content: "Assistente ANTAQ." }, { role: "user", content: prompt }] };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Falha ao conectar no servidor local (${url}).`);
      const data = await res.json();
      return window.Security.escapeHTML(data.choices?.[0]?.message?.content || "Sem resposta.").replace(/\n/g, '<br>');
    }
  };

  window.CopilotoIA = CopilotoIA;
  console.info('[js] CopilotoIA carregado');
})();
/* --- FIM: js/ai/copiloto-ia.js --- */
