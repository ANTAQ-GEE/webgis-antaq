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

            const criarClusterDaCategoria = (tKey, cat) => {
              if (typeof L.markerClusterGroup !== 'function') {
                console.warn('[Cluster] Biblioteca indisponível. Fallback para featureGroup.');
                return L.featureGroup();
              }
              return L.markerClusterGroup({
                maxClusterRadius: 55,
                disableClusteringAtZoom: 12,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                chunkedLoading: true,
                chunkInterval: 100,
                chunkDelay: 50,
                iconCreateFunction: (cluster) => {
                  const count = cluster.getChildCount();
                  let dim = 40;
                  if (count >= 100) dim = 56;
                  else if (count >= 10) dim = 46;
                  else dim = 36;

                  return L.divIcon({
                    html: window.MapSymbols.clusterHtml('ancora', cat.cor, count, dim),
                    className: 'marker-cluster-custom',
                    iconSize: L.point(dim, dim)
                  });
                }
              });
            };

            for (const tKey of Object.keys(window.PortClassification.tipos)) {
              if (window.SUBGRUPOS_PORTOS[tKey]) mapa.removeLayer(window.SUBGRUPOS_PORTOS[tKey]);
              window.SUBGRUPOS_PORTOS[tKey] = criarClusterDaCategoria(tKey, window.PortClassification.tipos[tKey]);
            }

            dados.features.forEach(f => {
              if (!f.geometry || !f.geometry.coordinates) return;
              const cat = window.PortClassification.classificar(f.properties);
              const lat = f.geometry.coordinates[1];
              const lng = f.geometry.coordinates[0];
              if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                // ✅ Híbrido: circleMarker (canvas) por padrão, âncora SVG só em zoom alto
                const usarIcone = false;

                let m;
                if (usarIcone) {
                  m = L.marker([lat, lng], {
                    pane: 'panePontos',
                    icon: window.MapSymbols.ancora(cat.cor, 26)
                    // ✅ riseOnHover removido — causa recálculo de z-index em todo mousemove
                  });
                  m._isIcone = true;
                } else {
                  m = L.circleMarker([lat, lng], {
                    pane: 'panePontos',
                    radius: cat.raio || 5,
                    fillColor: cat.cor,
                    color: '#ffffff',
                    weight: 2,
                    fillOpacity: 0.95
                  });
                  m._isIcone = false;
                }
                m.feature = f;
                m._portoCatId = cat.id;
                m._portoProps = f.properties;   // guarda props pra redesenhar
                m.on("click", (e) => {
                  if (window.CopilotoIA) window.CopilotoIA.ultimoAtivoInspecionado = f;

                  if (e.originalEvent && (e.originalEvent.ctrlKey || e.originalEvent.metaKey)) {
                    L.DomEvent.stopPropagation(e);
                    if (window.SelectionManager) window.SelectionManager.toggle(f, 'instalacoes_portuarias');
                    return;
                  }
                  if (window.SelectionManager && window.SelectionManager.temSelecao()) {
                    window.SelectionManager.limpar(true);
                  }
                });
                m.bindPopup(window.PopupRenderer.gerar('instalacoes_portuarias', f.properties));
                if (window.SUBGRUPOS_PORTOS[cat.id]) window.SUBGRUPOS_PORTOS[cat.id].addLayer(m);
              }
            });

              // ✅ Remove o FG antigo do mapa (evita leak em atualizações)
              if (CAMADAS_MAPA[id] && mapa.hasLayer(CAMADAS_MAPA[id])) {
                mapa.removeLayer(CAMADAS_MAPA[id]);
              }

              CAMADAS_MAPA[id] = L.featureGroup();
              for (const [tKey, fg] of Object.entries(window.SUBGRUPOS_PORTOS)) {
                CAMADAS_MAPA[id].addLayer(fg);
              const cntBadge = document.getElementById(`subcnt-${tKey}`);
              if (cntBadge) cntBadge.innerText = `(${fg.getLayers().length})`;
            }
            if (chkEl && chkEl.checked) CAMADAS_MAPA[id].addTo(mapa);
            if (cntEl) cntEl.innerText = `(${dados.features.length})`;

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
    /**
     * Redesenha os portos trocando entre circleMarker (canvas) e âncora SVG
     * conforme o zoom atual. Chamado quando o zoom cruza o limiar 11.
     */
    redesenharPortos: function () {
      const dados = DADOS_GEOJSON_BRUTOS['instalacoes_portuarias'];
      if (!dados?.features?.length) return;

      const usarIcone = window.mapa.getZoom() >= 11;

      // Reutiliza os clusters já existentes
      if (!window.SUBGRUPOS_PORTOS) return;

      // Limpa todos os clusters
      for (const tKey of Object.keys(window.SUBGRUPOS_PORTOS)) {
        window.SUBGRUPOS_PORTOS[tKey].clearLayers();
      }

      // Re-adiciona com o tipo correto
      for (const f of dados.features) {
        if (!f.geometry?.coordinates) continue;
        const cat = window.PortClassification.classificar(f.properties);
        const [lng, lat] = f.geometry.coordinates;
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) continue;

        let m;
        if (usarIcone) {
          m = L.marker([lat, lng], {
            pane: 'panePontos',
            icon: window.MapSymbols.ancora(cat.cor, 26),
            riseOnHover: true
          });
        } else {
          m = L.circleMarker([lat, lng], {
            pane: 'panePontos',
            radius: cat.raio || 5,
            fillColor: cat.cor,
            color: '#ffffff',
            weight: 2,
            fillOpacity: 0.95
          });
        }

        m.feature = f;
        m._portoCatId = cat.id;
        m._portoProps = f.properties;

        // Popup
        m.bindPopup(window.PopupRenderer.gerar('instalacoes_portuarias', f.properties));

        // Click handlers
        m.on('click', (e) => {
          if (window.MeasurementTool && window.MeasurementTool.modo) return;
          if (window.CopilotoIA) window.CopilotoIA.ultimoAtivoInspecionado = f;
          if (e.originalEvent && (e.originalEvent.ctrlKey || e.originalEvent.metaKey)) {
            L.DomEvent.stopPropagation(e);
            if (window.SelectionManager) window.SelectionManager.toggle(f, 'instalacoes_portuarias');
            return;
          }
          if (window.SelectionManager && window.SelectionManager.temSelecao()) {
            window.SelectionManager.limpar(true);
          }
        });

        if (window.SUBGRUPOS_PORTOS[cat.id]) {
          window.SUBGRUPOS_PORTOS[cat.id].addLayer(m);
        }
      }

      console.info(`[DataManager] Portos redesenhados: ${usarIcone ? 'âncoras SVG' : 'circleMarker'}`);
    },
    atualizarTodasCamadas: async function (apenasAtivas = true, opcoes) {
      opcoes = opcoes || {};
      // ✅ Padrão é SILENCIOSO (evita toasts duplicados no boot)
      //    Só mostra toast se `mostrarToasts: true` for passado
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