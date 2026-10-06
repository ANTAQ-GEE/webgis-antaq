/* ============================================================
   WebGIS ANTAQ — Módulo: SelectionManager (M2)
   Escopo: seleção múltipla de feições (Ctrl+Clique, Shift+Arrastar)
   Dependências: window.PortClassification, window.Security,
                 window.UI, window.TabelaManager, window.mapa,
                 turf (global)
   Referências "lazy": window.classificarEsfera, window.FilterManager,
                       window.DataManager, window.VENUnifiedManager
   Expõe: window.SelectionManager
   ============================================================ */
(function () {
  'use strict';

  const SelectionManager = {
    _selecionadas: [],
    _highlightLayer: null,
    _paneCriado: false,
    _rectAtivo: false,
    _startPoint: null,

    init: function () {
      if (!this._paneCriado) {
        mapa.createPane('paneSelecao');
        mapa.getPane('paneSelecao').style.zIndex = 700;
        mapa.getPane('paneSelecao').style.pointerEvents = 'none';
        this._paneCriado = true;
      }

      if (mapa.boxZoom) mapa.boxZoom.disable();
      this._configurarRectSelection();
      this._configurarTeclado();
      console.info('[M2] Seleção múltipla pronta. Ctrl+Clique ou Shift+Arrastar.');
    },

    toggle: function (feature, camadaId) {
      // Fecha o popup do Leaflet (senão ele fica "grudado" na tela)
      if (window.mapa && window.mapa.closePopup) window.mapa.closePopup();

      const chave = this._chaveDe(feature, camadaId);
      const idx = this._selecionadas.findIndex(s => s.chaveUnica === chave);

      if (idx >= 0) {
        this._selecionadas.splice(idx, 1);
        if (window.UI) window.UI.toast(`➖ Feição removida da seleção (${this._selecionadas.length} restantes).`);
      } else {
        this._selecionadas.push({ feature, camadaId, chaveUnica: chave });
        if (window.UI) window.UI.toast(`➕ Feição adicionada à seleção (${this._selecionadas.length} no total).`);
      }

      this._atualizarUI();
    },

    adicionarMultiplas: function (features, camadaId) {
      let adicionadas = 0;
      for (const f of features) {
        const chave = this._chaveDe(f, camadaId);
        if (!this._selecionadas.find(s => s.chaveUnica === chave)) {
          this._selecionadas.push({ feature: f, camadaId, chaveUnica: chave });
          adicionadas++;
        }
      }
      if (adicionadas > 0) {
        this._atualizarUI();
        if (window.UI) window.UI.toast(`➕ ${adicionadas} feições adicionadas (${this._selecionadas.length} no total).`);
      } else {
        if (window.UI) window.UI.toast('Nenhuma feição nova na área selecionada.');
      }
    },

    temSelecao: function () { return this._selecionadas.length > 0; },
    obterSelecionadas: function () { return this._selecionadas.slice(); },

    selecionarTudo: async function () {
      const selCamada = document.getElementById('sel-camada-busca');
      if (!selCamada) return;

      const idVirtual = selCamada.value;
      let idCamada = idVirtual;

      if (idVirtual === 'ven') {
        const selPainel = document.getElementById('sel-safra-ven-painel');
        const selSub = document.getElementById('filtro-subtipo-dinamico');
        const safraPainel = selPainel ? selPainel.value : null;
        const safraSub = selSub ? selSub.value : null;
        const safraInterna = window.VENUnifiedManager ? window.VENUnifiedManager.anoAtivo : null;
        idCamada = safraPainel || safraSub || safraInterna || 'ven_2022';
      }

      if (!DADOS_GEOJSON_BRUTOS[idCamada]) {
        if (window.UI) window.UI.toast(`⏳ Carregando ${idCamada}...`);
        try {
          await window.DataManager.carregarCamada(idCamada);
        } catch (e) {
          if (window.UI) window.UI.toast(`⚠️ Falha ao carregar ${idCamada}: ${e.message}`);
          return;
        }
      }

      const dados = DADOS_GEOJSON_BRUTOS[idCamada];
      if (!dados || !dados.features || !dados.features.length) {
        if (window.UI) window.UI.toast(`⚠️ Camada ${idCamada} sem feições.`);
        return;
      }

      let featuresParaSelecionar = dados.features;
      let nomeFiltro = '';

      const selSub = document.getElementById('filtro-subtipo-dinamico');
      const filtroAtivo = selSub ? selSub.value : null;

      if (filtroAtivo && filtroAtivo !== 'TODOS' && filtroAtivo !== '' && !filtroAtivo.startsWith('ven_')) {
        if (idCamada === 'instalacoes_portuarias') {
          featuresParaSelecionar = dados.features.filter(f => {
            const cat = window.PortClassification.classificar(f.properties || {});
            return cat.id === filtroAtivo;
          });
          nomeFiltro = window.PortClassification.tipos[filtroAtivo]?.nome || filtroAtivo;
        } else if (idCamada === 'ucs_todas_mma' && typeof window.classificarEsfera === 'function') {
          featuresParaSelecionar = dados.features.filter(f => {
            return window.classificarEsfera(f.properties).id === filtroAtivo;
          });
          nomeFiltro = filtroAtivo;
        } else if (window.FilterManager && window.FilterManager.colunaEsferaAtiva) {
          const col = window.FilterManager.colunaEsferaAtiva;
          featuresParaSelecionar = dados.features.filter(f => {
            const v = String(f.properties ? f.properties[col] : '').trim();
            return v === filtroAtivo;
          });
          nomeFiltro = `${col}: ${filtroAtivo}`;
        }
      }

      const anteriores = this._selecionadas.length;
      this._selecionadas = [];
      if (this._highlightLayer && mapa.hasLayer(this._highlightLayer)) {
        mapa.removeLayer(this._highlightLayer);
        this._highlightLayer = null;
      }

      for (const f of featuresParaSelecionar) {
        const chave = this._chaveDe(f, idCamada);
        this._selecionadas.push({ feature: f, camadaId: idCamada, chaveUnica: chave });
      }

      this._atualizarUI();

      const nomeCamada = CONFIG_CAMADAS[idCamada]?.nome || idCamada;
      const msgFiltro = nomeFiltro ? ` [${nomeFiltro}]` : '';
      const msgAnt = anteriores > 0 ? ` (${anteriores} anteriores removidas)` : '';
      if (window.UI) window.UI.toast(`🎯 ${this._selecionadas.length} feições de "${nomeCamada}"${msgFiltro} selecionadas${msgAnt}.`);
    },

    zoomParaSelecao: function () {
      if (!this._selecionadas.length) return;
      try {
        const grupo = L.featureGroup(this._selecionadas.map(s => L.geoJSON(s.feature)));
        const bounds = grupo.getBounds();
        if (bounds.isValid()) {
          mapa.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
        }
      } catch (e) { console.warn('[M2] Erro ao fazer zoom:', e); }
    },

    abrirTabelaFiltrada: function () {
      if (!this._selecionadas.length) return;
      const camadaId = this._selecionadas[0].camadaId;
      const todasMesma = this._selecionadas.every(s => s.camadaId === camadaId);
      if (!todasMesma) {
        if (window.UI) window.UI.toast('⚠️ A seleção abrange múltiplas camadas. Selecione apenas uma.');
        return;
      }
      const features = this._selecionadas.map(s => s.feature);
      if (window.TabelaManager) window.TabelaManager.abrirFiltrado(camadaId, features);
    },

    exportarCSV: function () {
      if (!this._selecionadas.length) {
        if (window.UI) window.UI.toast('⚠️ Nenhuma feição selecionada.');
        return;
      }

      const chaves = new Set();
      this._selecionadas.forEach(s => {
        Object.keys(s.feature.properties || {}).forEach(k => {
          if (!['geom', 'geometry'].includes(k.toLowerCase())) chaves.add(k);
        });
      });
      const colunas = [...chaves];

      const linhas = [colunas.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')];
      this._selecionadas.forEach(s => {
        const p = s.feature.properties || {};
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
      a.href = url;
      a.download = `selecao_${this._selecionadas.length}_feicoes_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (window.UI) window.UI.toast(`📥 CSV com ${this._selecionadas.length} feições exportado.`);
    },

    exportarGeoJSON: function () {
      if (!this._selecionadas.length) {
        if (window.UI) window.UI.toast('⚠️ Nenhuma feição selecionada.');
        return;
      }
      const fc = {
        type: 'FeatureCollection',
        features: this._selecionadas.map(s => s.feature)
      };
      const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `selecao_${this._selecionadas.length}_feicoes_${new Date().toISOString().slice(0,10)}.geojson`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (window.UI) window.UI.toast(`💾 GeoJSON com ${this._selecionadas.length} feições exportado.`);
    },

    _atualizarUI: function () {
      const painel = document.getElementById('painel-selecao');
      const countEl = document.getElementById('selecao-count');

      if (this._selecionadas.length === 0) {
        if (painel) painel.classList.remove('aberto');
      } else {
        if (countEl) countEl.textContent = this._selecionadas.length;
        if (painel) painel.classList.add('aberto');
      }

      this._atualizarHighlight();
    },

    _atualizarHighlight: function () {
      if (this._highlightLayer) {
        try {
          if (mapa.hasLayer(this._highlightLayer)) mapa.removeLayer(this._highlightLayer);
        } catch (e) { console.warn('[M2] Erro ao remover highlight:', e); }
        this._highlightLayer = null;
      }

      if (!this._selecionadas.length) return;

      if (!mapa.getPane('paneSelecao')) {
        mapa.createPane('paneSelecao');
        mapa.getPane('paneSelecao').style.zIndex = 650;
        mapa.getPane('paneSelecao').style.pointerEvents = 'none';
      }

      try {
        const fc = {
          type: 'FeatureCollection',
          features: this._selecionadas.map(s => s.feature)
        };
        this._highlightLayer = L.geoJSON(fc, {
          pane: 'paneSelecao',
          interactive: false,
          style: {
            color: '#f59e0b',
            weight: 3,
            opacity: 0.95,
            fillColor: '#f59e0b',
            fillOpacity: 0,
            dashArray: null
          },
          pointToLayer: (f, latlng) => L.circleMarker(latlng, {
            pane: 'paneSelecao',
            radius: 8,
            color: '#f59e0b',
            weight: 3,
            fillColor: '#fbbf24',
            fillOpacity: 0.85
          })
        }).addTo(mapa);

        const pane = mapa.getPane('paneSelecao');
        if (pane) {
          pane.style.zIndex = 700;
          pane.style.pointerEvents = 'none';
        }

        this._highlightLayer.eachLayer(sub => {
          if (sub.bringToFront) sub.bringToFront();
        });

        console.log(`[M2] Highlight criado com ${this._highlightLayer.getLayers().length} features`);
      } catch (e) { console.warn('[M2] Erro ao criar highlight:', e); }
    },

    limpar: function (silencioso) {
      this._selecionadas = [];

      if (this._highlightLayer) {
        try {
          if (mapa.hasLayer(this._highlightLayer)) mapa.removeLayer(this._highlightLayer);
        } catch (e) { console.warn('[M2] Erro ao remover highlight:', e); }
        this._highlightLayer = null;
      }

      const painel = document.getElementById('painel-selecao');
      if (painel) painel.classList.remove('aberto');
      const countEl = document.getElementById('selecao-count');
      if (countEl) countEl.textContent = '0';

      if (!silencioso && window.UI) window.UI.toast('🗑️ Seleção limpa.');
    },

    _chaveDe: function (feature, camadaId) {
      const p = feature.properties || {};

      let id = p.idhidrovia || p.idseq || p.id || p.ID ||
               p.gid || p.GID || p.objectid || p.codigo || p.CODIGO ||
               p.idm_origem || p.terrai_cod || p.cd_uc || p.codigo_uc;

      if (!id) {
        const nome = p.nome || p.NOME || p.NOME_INSTALACAO ||
                     p.nome_rio || p.NOME_RIO || p.terrai_nom || '';
        const geoHash = JSON.stringify(feature.geometry || '').substring(0, 200);
        id = `${nome}::${geoHash}`;
      }

      return `${camadaId}::${id}`;
    },

    _configurarRectSelection: function () {
      const container = mapa.getContainer();
      const rectEl = document.getElementById('retangulo-selecao');
      const self = this;

      container.addEventListener('mousedown', (e) => {
        if (!e.shiftKey) return;
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        self._rectAtivo = true;
        self._startPoint = { x: e.clientX, y: e.clientY };
        document.body.classList.add('modo-selecao-retangulo');

        if (rectEl) {
          rectEl.style.left = e.clientX + 'px';
          rectEl.style.top = e.clientY + 'px';
          rectEl.style.width = '0px';
          rectEl.style.height = '0px';
          rectEl.classList.add('ativo');
        }
      }, true);

      window.addEventListener('mousemove', (e) => {
        if (!self._rectAtivo || !self._startPoint) return;
        if (!rectEl) return;

        const x = Math.min(self._startPoint.x, e.clientX);
        const y = Math.min(self._startPoint.y, e.clientY);
        const w = Math.abs(e.clientX - self._startPoint.x);
        const h = Math.abs(e.clientY - self._startPoint.y);

        rectEl.style.left = x + 'px';
        rectEl.style.top = y + 'px';
        rectEl.style.width = w + 'px';
        rectEl.style.height = h + 'px';
      });

      window.addEventListener('mouseup', (e) => {
        if (!self._rectAtivo) return;
        self._rectAtivo = false;
        document.body.classList.remove('modo-selecao-retangulo');
        if (rectEl) rectEl.classList.remove('ativo');

        if (!self._startPoint) return;

        const x1 = self._startPoint.x;
        const y1 = self._startPoint.y;
        const x2 = e.clientX;
        const y2 = e.clientY;
        self._startPoint = null;

        if (Math.abs(x2 - x1) < 6 && Math.abs(y2 - y1) < 6) return;

        const containerRect = container.getBoundingClientRect();
        const p1 = L.point(x1 - containerRect.left, y1 - containerRect.top);
        const p2 = L.point(x2 - containerRect.left, y2 - containerRect.top);
        const bounds = L.latLngBounds(
          mapa.containerPointToLatLng(p1),
          mapa.containerPointToLatLng(p2)
        );

        self._selecionarPorBounds(bounds);
      });
    },

    _selecionarPorBounds: function (bounds) {
      const selCamada = document.getElementById('sel-camada-busca');
      const camadaIdVirtual = selCamada ? selCamada.value : null;

      if (!camadaIdVirtual) {
        if (window.UI) window.UI.toast('⚠️ Selecione uma camada para usar seleção por retângulo.');
        return;
      }

      let camadaId = camadaIdVirtual;
      if (camadaIdVirtual === 'ven') {
        camadaId = (window.VENUnifiedManager && window.VENUnifiedManager.anoAtivo)
          ? window.VENUnifiedManager.anoAtivo
          : 'ven_2022';
      }

      const dados = DADOS_GEOJSON_BRUTOS[camadaId];
      if (!dados || !dados.features) {
        if (window.UI) window.UI.toast(`⚠️ Camada "${camadaId}" não carregada.`);
        return;
      }

      let featuresBase = dados.features;

      if (camadaId === 'instalacoes_portuarias') {
        const filtroPorto = window.FILTRO_PORTO_ATUAL || 'TODOS';
        if (filtroPorto !== 'TODOS') {
          featuresBase = featuresBase.filter(f =>
            window.PortClassification.classificar(f.properties || {}).id === filtroPorto
          );
        }
      }

      if (camadaId === 'ucs_todas_mma' && typeof window.classificarEsfera === 'function') {
        const filtroUC = window.FILTRO_UC_ATUAL || 'TODOS';
        if (filtroUC !== 'TODOS') {
          featuresBase = featuresBase.filter(f =>
            window.classificarEsfera(f.properties).id === filtroUC
          );
        }
      }

      const selSub = document.getElementById('filtro-subtipo-dinamico');
      if (selSub && selSub.value && selSub.value !== 'TODOS' &&
          camadaId !== 'instalacoes_portuarias' && camadaId !== 'ucs_todas_mma' &&
          !camadaId.startsWith('ven_')) {
        const colunaFiltro = window.FilterManager ? window.FilterManager.colunaEsferaAtiva : null;
        if (colunaFiltro) {
          featuresBase = featuresBase.filter(f =>
            String(f.properties?.[colunaFiltro] || '').trim() === selSub.value
          );
        }
      }

      if (typeof turf === 'undefined') {
        if (window.UI) window.UI.toast('⚠️ Turf.js indisponível. Recarregue a página.');
        return;
      }

      const tol = 0.03;
      const boundsGeoJSON = {
        type: 'Polygon',
        coordinates: [[
          [bounds.getWest()  - tol, bounds.getSouth() - tol],
          [bounds.getEast()  + tol, bounds.getSouth() - tol],
          [bounds.getEast()  + tol, bounds.getNorth() + tol],
          [bounds.getWest()  - tol, bounds.getNorth() + tol],
          [bounds.getWest()  - tol, bounds.getSouth() - tol]
        ]]
      };

      const dentro = [];
      for (const f of featuresBase) {
        try {
          const tempLayer = L.geoJSON(f);
          const b = tempLayer.getBounds();
          if (!b.isValid() || !bounds.intersects(b)) continue;

          try {
            if (turf.booleanIntersects(f, boundsGeoJSON)) {
              dentro.push(f);
            }
          } catch (eTurf) {
            dentro.push(f);
          }
        } catch (e) { /* ignora */ }
      }

      if (dentro.length === 0) {
        if (window.UI) window.UI.toast('Nenhuma feição na área selecionada.');
        return;
      }
      this.adicionarMultiplas(dentro, camadaId);
    },

    _configurarTeclado: function () {
      const self = this;
      document.addEventListener('keydown', (ev) => {
        const tag = (ev.target && ev.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

        if (ev.key === 'Escape') {
          if (self._selecionadas && self._selecionadas.length > 0) {
            console.log('[M2] ESC detectado — limpando', self._selecionadas.length, 'feições');
            self.limpar();
            ev.preventDefault();
            ev.stopPropagation();
            return;
          }
        }

        if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && ev.key.toLowerCase() === 'a') {
          ev.preventDefault();
          self.selecionarTudo();
        }
      }, true);
    }
  };

  window.SelectionManager = SelectionManager;
  console.info('[js] SelectionManager carregado');
})();
