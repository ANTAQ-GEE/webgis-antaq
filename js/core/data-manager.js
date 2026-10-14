/* ============================================================
   WebGIS ANTAQ — Módulo: DataManager
   Escopo: carregamento de GeoJSON, clusters de portos, sincronização
   Dependências: window.CONFIG_CAMADAS, window.DADOS_GEOJSON_BRUTOS,
                 window.CAMADAS_MAPA, window.FetchManager, window.Security,
                 window.GeomTypeDetector, window.Styler,
                 window.PortClassification, window.PopupRenderer,
                 window.ActionHistory, window.mapa, window.NotificationManager
   Referências "lazy": window.UI, window.CopilotoIA, window.SelectionManager,
                       window.LayerRegistry, window.VENUnifiedManager
   Expõe: window.DataManager
   ============================================================ */
(function () {
  'use strict';

  const DataManager = {
    carregando: {},

    carregarCamada: async function (id) {
      if (DADOS_GEOJSON_BRUTOS[id] && CAMADAS_MAPA[id]) return DADOS_GEOJSON_BRUTOS[id];
      if (this.carregando[id]) return this.carregando[id];

      const cfg = CONFIG_CAMADAS[id];
      if (!cfg || !cfg.arquivos || !cfg.arquivos.length) return null;

      const cntEl = document.getElementById(`cnt-${id}`);
      const errEl = document.getElementById(`err-${id}`);
      const chkEl = document.getElementById(`chk-${id}`);
      if (cntEl) cntEl.innerText = '(carregando...)';

      const carregarGeoJson = async () => {
        if (window.DataAdapter && typeof window.DataAdapter.carregarCamada === 'function') {
          return window.DataAdapter.carregarCamada(id, cfg.arquivos, {
            onTentativa: (n, total) => {
              if (n === 1) return;
              if (cntEl) cntEl.innerText = `(retry ${n}/${total}…)`;
            }
          });
        }

        const falhas = [];

        for (let i = 0; i < cfg.arquivos.length; i++) {
          const url = cfg.arquivos[i];

          try {
            const j = await window.FetchManager.fetchJSON(url, {
              onTentativa: (n, total) => {
                if (n === 1) return;
                if (cntEl) cntEl.innerText = `(retry ${n}/${total}…)`;
              }
            });

            if (j && j.features) return j;
            falhas.push(`${url}: sem features`);
          } catch (err) {
            const msg = (err && err.message) || 'erro desconhecido';
            falhas.push(`${url}: ${msg}`);
            console.warn(`[R3] ${id} → falha em "${url}" após retries:`, msg);
          }
        }

        const detalhe = falhas.join(' · ');
        throw new Error(`Camada "${id}" indisponível. ${detalhe}`);
      };

      this.carregando[id] = carregarGeoJson()
        .then(dados => {
          if (!dados.features) throw new Error("Sem feições válidas");

          dados.features.forEach(f => {
            if (f.properties) {
              for (const [k, v] of Object.entries(f.properties)) {
                if (typeof v === 'string') f.properties[k] = window.Security.repararTexto(v);
              }
            }
          });

          DADOS_GEOJSON_BRUTOS[id] = dados;

          if (!cfg.tipoGeo || cfg.tipoGeo === 'auto') {
            cfg.tipoGeo = window.GeomTypeDetector.detectar(dados);
            if (cfg.tipoGeo === 'poligono' && cfg.peso > 3) cfg.peso = 1.5;
            if (cfg.tipoGeo === 'linha' && cfg.peso > 5) cfg.peso = 2.5;
            if (cfg.tipoGeo === 'ponto' && cfg.peso < 3) cfg.peso = 5;
          }

          const opcoes = window.Styler.obterOpcoes(id);

          if (id === 'instalacoes_portuarias') {
            if (!window.SUBGRUPOS_PORTOS) window.SUBGRUPOS_PORTOS = {};

            // ✅ Cluster Master Unificado: elimina sobreposição e aplica raio dinâmico adaptativo
            const criarClusterMasterPortos = () => {
              if (typeof L.markerClusterGroup !== 'function') {
                console.warn('[Cluster] Biblioteca indisponível. Fallback para featureGroup.');
                return L.featureGroup();
              }
              return L.markerClusterGroup({
                maxClusterRadius: (zoom) => {
                  if (zoom <= 5) return 85;   // Zoom continental/nacional: consolida em polos regionais
                  if (zoom <= 8) return 65;   // Zoom estadual/corredores logísticos
                  return 45;                  // Aproximação portuária
                },
                disableClusteringAtZoom: 12,  // Terminais individuais no nível do porto (zoom >= 12)
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                chunkedLoading: true,
                chunkInterval: 100,
                chunkDelay: 50,
                iconCreateFunction: (cluster) => {
                  const count = cluster.getChildCount();
                  let dim = 38;
                  if (count >= 100) dim = 52;
                  else if (count >= 20) dim = 44;
                  else if (count >= 5) dim = 38;

                  return L.divIcon({
                    html: `<div style="width:${dim}px; height:${dim}px; background:radial-gradient(circle at 35% 35%, #0284c7 0%, #0a2540 100%); border:2.5px solid #38bdf8; border-radius:50%; box-shadow:0 3px 10px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.4); display:flex; flex-direction:column; align-items:center; justify-content:center; color:#ffffff; font-family:'Segoe UI',system-ui,sans-serif; font-weight:700; font-size:${count >= 100 ? 12 : 11}px; cursor:pointer; text-shadow:0 1px 2px rgba(0,0,0,0.8);">` +
                          `<span style="line-height:1;">${count}</span>` +
                          `<span style="font-size:8px; opacity:0.85; line-height:1; margin-top:1px;">⚓</span>` +
                          `</div>`,
                    className: 'marker-cluster-custom',
                    iconSize: L.point(dim, dim)
                  });
                }
              });
            };

            // Remove cluster antigo se existir
            if (CAMADAS_MAPA[id] && mapa.hasLayer(CAMADAS_MAPA[id])) {
              mapa.removeLayer(CAMADAS_MAPA[id]);
            }

            const masterCluster = criarClusterMasterPortos();
            CAMADAS_MAPA[id] = masterCluster;

            // Cada subgrupo guarda seus marcadores em um FeatureGroup próprio
            for (const tKey of Object.keys(window.PortClassification.tipos)) {
              if (window.SUBGRUPOS_PORTOS[tKey]) {
                window.SUBGRUPOS_PORTOS[tKey].clearLayers();
              } else {
                window.SUBGRUPOS_PORTOS[tKey] = L.featureGroup();
              }
            }

            // Gerador de ícone de âncora nítido com contraste para qualquer zoom
            const criarIconePorto = (cat) => {
              const sz = (cat.id === 'ORGANIZADO') ? 22 : 18;
              const half = sz / 2;
              return L.divIcon({
                className: 'port-anchor-marker',
                html: `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" xmlns="http://www.w3.org/2000/svg" style="display:block; pointer-events:none; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">` +
                      `<circle cx="12" cy="12" r="11" fill="#ffffff" stroke="${cat.cor}" stroke-width="2"/>` +
                      `<circle cx="12" cy="4" r="2.2" fill="${cat.cor}"/>` +
                      `<line x1="12" y1="6.2" x2="12" y2="19" stroke="${cat.cor}" stroke-width="2" stroke-linecap="round"/>` +
                      `<line x1="7" y1="10" x2="17" y2="10" stroke="${cat.cor}" stroke-width="2" stroke-linecap="round"/>` +
                      `<path d="M5 13 Q5 19 12 19 Q19 19 19 13" fill="none" stroke="${cat.cor}" stroke-width="2" stroke-linecap="round"/>` +
                      `</svg>`,
                iconSize: [sz, sz],
                iconAnchor: [half, half],
                popupAnchor: [0, -half]
              });
            };

            const markersParaAdicionar = [];

            dados.features.forEach(f => {
              if (!f.geometry || !f.geometry.coordinates) return;
              if (f.properties && window.Security && typeof window.Security.extrairUF === 'function') {
                const ufRes = window.Security.extrairUF(f.properties);
                if (ufRes) {
                  if (!f.properties.uf) f.properties.uf = ufRes;
                  if (!f.properties.estado) f.properties.estado = ufRes;
                }
              }
              const cat = window.PortClassification.classificar(f.properties);
              const lat = f.geometry.coordinates[1];
              const lng = f.geometry.coordinates[0];
              if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                const m = L.marker([lat, lng], {
                  pane: 'panePontos',
                  icon: criarIconePorto(cat),
                  interactive: true
                });
                m.feature = f;
                m._portoCatId = cat.id;
                m._portoProps = f.properties;
                m.bindPopup(window.PopupRenderer.gerar('instalacoes_portuarias', f.properties), {
                  maxWidth: 360,
                  autoPan: true,
                  closeButton: true
                });
                m.on("click", (e) => {
                  if (window.MeasurementTool && window.MeasurementTool.modo) return;
                  if (window.CopilotoIA) window.CopilotoIA.ultimoAtivoInspecionado = f;

                  const isMulti = e.originalEvent && (e.originalEvent.ctrlKey || e.originalEvent.metaKey);
                  if (isMulti) {
                    if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
                    try { m.closePopup(); } catch (_) {}
                    if (window.SelectionManager) {
                      window.SelectionManager.toggle(f, 'instalacoes_portuarias', false);
                    }
                    return;
                  }

                  try {
                    if (!m.isPopupOpen()) m.openPopup();
                  } catch (_) {}

                  if (window.SelectionManager && typeof window.SelectionManager.selecionarUnica === 'function') {
                    window.SelectionManager.selecionarUnica(f, 'instalacoes_portuarias');
                  }
                });

                if (window.SUBGRUPOS_PORTOS[cat.id]) {
                  window.SUBGRUPOS_PORTOS[cat.id].addLayer(m);
                }

                const chkSub = document.getElementById(`chk-sub-${cat.id}`);
                const deveLigar = chkSub ? chkSub.checked : (cat.padraoAtivo !== false);
                if (deveLigar) {
                  markersParaAdicionar.push(m);
                }
              }
            });

            if (typeof masterCluster.addLayers === 'function') {
              masterCluster.addLayers(markersParaAdicionar);
            } else {
              markersParaAdicionar.forEach(m => masterCluster.addLayer(m));
            }

            for (const [tKey, fg] of Object.entries(window.SUBGRUPOS_PORTOS)) {
              const cntBadge = document.getElementById(`subcnt-${tKey}`);
              if (cntBadge) cntBadge.innerText = `(${fg.getLayers().length})`;
            }
            if (chkEl && chkEl.checked) CAMADAS_MAPA[id].addTo(mapa);
            if (cntEl) {
              const nAtivos = markersParaAdicionar.length;
              const nTotal = dados.features.length;
              cntEl.innerText = (nAtivos === nTotal) ? `(${nTotal})` : `(${nAtivos}/${nTotal})`;
            }

          } else {
            if (CAMADAS_MAPA[id]) {
              // ✅ Também remove do mapa antes de recriar (evita leak)
              if (mapa.hasLayer(CAMADAS_MAPA[id])) mapa.removeLayer(CAMADAS_MAPA[id]);
              CAMADAS_MAPA[id].clearLayers();
              CAMADAS_MAPA[id].addData(dados);
              if (chkEl && chkEl.checked) CAMADAS_MAPA[id].addTo(mapa);
            } else {
              CAMADAS_MAPA[id] = L.geoJSON(dados, opcoes);
              if (chkEl && chkEl.checked) CAMADAS_MAPA[id].addTo(mapa);
            }
            if (cntEl) cntEl.innerText = `(${dados.features.length})`;

            // ✅ Travessias: anexa os markers de ponte ao featureGroup
            if (id === 'linhas_travessias') {
              CAMADAS_MAPA[id].eachLayer(layer => {
                if (layer._ponteMarker) {
                  CAMADAS_MAPA[id].addLayer(layer._ponteMarker);
                }
              });
            }
          }

          if (errEl) errEl.innerText = '';
          delete this.carregando[id];

          // ✅ Debounce: 14 camadas carregando = 14 re-renders → 1 render final
          if (!this._renderDebounce) {
            this._renderDebounce = setTimeout(() => {
              window.Styler.atualizarLegenda();
              if (window.FilterManager) {
                try { window.FilterManager.atualizarSeletorCamadas(); } catch (e) {}
              }
              this._renderDebounce = null;
            }, 250);
          }

          return dados;
        })
        .catch(err => {
          console.error(`[DataManager] Falha definitiva em "${id}":`, err);
          if (errEl) errEl.innerText = '⚠️ ausente';
          if (cntEl) cntEl.innerText = '(erro)';
          delete this.carregando[id];

          if (window.NotificationManager) {
            const idCamada = id;
            const nomeCamada = (CONFIG_CAMADAS[id] && CONFIG_CAMADAS[id].nome) || id;
            window.NotificationManager.show({
              tipo: 'erro',
              titulo: 'Falha ao carregar camada',
              mensagem:
                `"<strong>${window.Security.escapeHTML(nomeCamada)}</strong>" ` +
                `não pôde ser carregada após ${window.FetchManager._config.tentativas} tentativas por arquivo.`,
              duracao: 0,
              acoes: [{
                texto: '🔄 Tentar novamente',
                fn: () => {
                  delete DataManager.carregando[idCamada];
                  delete DADOS_GEOJSON_BRUTOS[idCamada];
                  if (CAMADAS_MAPA[idCamada]) {
                    try { mapa.removeLayer(CAMADAS_MAPA[idCamada]); } catch (e) {}
                    delete CAMADAS_MAPA[idCamada];
                  }
                  if (cntEl) cntEl.innerText = '(carregando...)';
                  if (errEl) errEl.innerText = '';
                  DataManager.carregarCamada(idCamada);
                }
              }]
            });
          }
          throw err;
        });

      return this.carregando[id];
    },

    redesenharPortos: function () {
      const dados = DADOS_GEOJSON_BRUTOS['instalacoes_portuarias'];
      if (!dados?.features?.length) return;

      const masterCluster = window.CAMADAS_MAPA['instalacoes_portuarias'];
      if (!window.SUBGRUPOS_PORTOS) return;

      for (const tKey of Object.keys(window.SUBGRUPOS_PORTOS)) {
        window.SUBGRUPOS_PORTOS[tKey].clearLayers();
      }
      if (masterCluster) masterCluster.clearLayers();

      const markersParaAdicionar = [];

      for (const f of dados.features) {
        if (!f.geometry?.coordinates) continue;
        const cat = window.PortClassification.classificar(f.properties);
        const [lng, lat] = f.geometry.coordinates;
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) continue;

        const sz = (cat.id === 'ORGANIZADO') ? 22 : 18;
        const half = sz / 2;
        const icone = L.divIcon({
          className: 'port-anchor-marker',
          html: `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" xmlns="http://www.w3.org/2000/svg" style="display:block; pointer-events:none; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">` +
                `<circle cx="12" cy="12" r="11" fill="#ffffff" stroke="${cat.cor}" stroke-width="2"/>` +
                `<circle cx="12" cy="4" r="2.2" fill="${cat.cor}"/>` +
                `<line x1="12" y1="6.2" x2="12" y2="19" stroke="${cat.cor}" stroke-width="2" stroke-linecap="round"/>` +
                `<line x1="7" y1="10" x2="17" y2="10" stroke="${cat.cor}" stroke-width="2" stroke-linecap="round"/>` +
                `<path d="M5 13 Q5 19 12 19 Q19 19 19 13" fill="none" stroke="${cat.cor}" stroke-width="2" stroke-linecap="round"/>` +
                `</svg>`,
          iconSize: [sz, sz],
          iconAnchor: [half, half],
          popupAnchor: [0, -half]
        });

        const m = L.marker([lat, lng], {
          pane: 'panePontos',
          icon: icone,
          interactive: true
        });

        m.feature = f;
        m._portoCatId = cat.id;
        m._portoProps = f.properties;

        m.bindPopup(window.PopupRenderer.gerar('instalacoes_portuarias', f.properties), {
          maxWidth: 360,
          autoPan: true,
          closeButton: true
        });

        m.on('click', (e) => {
          if (window.MeasurementTool && window.MeasurementTool.modo) return;
          if (window.CopilotoIA) window.CopilotoIA.ultimoAtivoInspecionado = f;

          const isMulti = e.originalEvent && (e.originalEvent.ctrlKey || e.originalEvent.metaKey);
          if (isMulti) {
            if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
            try { m.closePopup(); } catch (_) {}
            if (window.SelectionManager) {
              window.SelectionManager.toggle(f, 'instalacoes_portuarias', false);
            }
            return;
          }

          try {
            if (!m.isPopupOpen()) m.openPopup();
          } catch (_) {}

          if (window.SelectionManager && typeof window.SelectionManager.selecionarUnica === 'function') {
            window.SelectionManager.selecionarUnica(f, 'instalacoes_portuarias');
          }
        });

        if (window.SUBGRUPOS_PORTOS[cat.id]) {
          window.SUBGRUPOS_PORTOS[cat.id].addLayer(m);
        }

        const chk = document.getElementById(`chk-sub-${cat.id}`);
        const deveLigar = chk ? chk.checked : (cat.padraoAtivo !== false);
        if (deveLigar) {
          markersParaAdicionar.push(m);
        }
      }

      if (masterCluster && markersParaAdicionar.length > 0) {
        if (typeof masterCluster.addLayers === 'function') {
          masterCluster.addLayers(markersParaAdicionar);
        } else {
          markersParaAdicionar.forEach(m => masterCluster.addLayer(m));
        }
      }

      console.info('[DataManager] Portos atualizados no Cluster Master com âncoras de alta visibilidade');
    },

    atualizarTodasCamadas: async function (apenasAtivas = true, opcoes) {
      opcoes = opcoes || {};
      const mostrarToasts = opcoes.mostrarToasts === true;

      const btn = document.getElementById('btn-sync');
      const ico = document.getElementById('ico-sync');
      if (btn) btn.disabled = true;
      if (ico) ico.classList.add('girando');

      if (mostrarToasts && window.UI && UI.toast) {
        UI.toast("🔄 Sincronizando catálogo e atualizando camadas...");
      }

      try { await window.LayerRegistry.carregarManifest(); } catch (e) {}

      const promessas = Object.entries(CONFIG_CAMADAS).map(([id, cfg]) => {
        const chkEl = document.getElementById(`chk-${id}`);
        const deveCarregar = !apenasAtivas || (chkEl ? chkEl.checked : cfg.ativa);
        if (deveCarregar && !id.startsWith('ven_')) {
          delete this.carregando[id];
          delete DADOS_GEOJSON_BRUTOS[id];
          return this.carregarCamada(id);
        }
        return Promise.resolve();
      });
      await Promise.allSettled(promessas);

      if (btn) btn.disabled = false;
      if (ico) ico.classList.remove('girando');
      window.Styler.atualizarLegenda();

      const anoAtivo = (window.VENUnifiedManager && window.VENUnifiedManager.anoAtivo) || 'ven_2022';
      const qtdVen = DADOS_GEOJSON_BRUTOS[anoAtivo]?.features?.length || 0;
      const cntVen = document.getElementById('cnt-ven-unificado');
      if (cntVen) cntVen.innerText = qtdVen > 0 ? `(${qtdVen})` : '';

      if (mostrarToasts && window.UI && UI.toast) {
        UI.toast(`✓ WebGIS atualizado com sucesso às ${new Date().toLocaleTimeString('pt-BR')}`);
      }
    }
  };

  window.DataManager = DataManager;
  console.info('[js] DataManager carregado');
})();
