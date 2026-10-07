/* ============================================================
   WebGIS ANTAQ — Módulo: MeasurementTool (M1)
   Escopo: medição de distância, área e raio (Turf.js)
           + snap em vértices (grid espacial)
           + overlay ao vivo seguindo o cursor
   Dependências: window.UI, window.mapa, turf (global)
   Expõe: window.MeasurementTool
   ============================================================ */
(function () {
  'use strict';

  const MeasurementTool = {
    modo: null,
    pontos: [],
    marcadoresTemp: [],
    linhaTemp: null,
    poligonoTemp: null,
    circuloTemp: null,
    labelsTemp: [],
    medicoesSalvas: [],
    _ultimoClickTempo: 0,
    _ultimoClickScreen: null,
    _ultimoMove: 0,

    /* ---------- Snap ---------- */
    _snapAtivo: false,
    _snapGrid: {},          // { "lat_cell|lng_cell": [{lat,lng,camada}, ...] }
    _snapTotal: 0,
    _snapIndicator: null,   // marker visual atual
    _snapPoint: null,       // { lat, lng, camada } ou null
    _snapCtrlInvertido: false,

    /* ---------- Overlay ao vivo ---------- */
    _overlayEl: null,

    /* ============================================================
       CICLO DE VIDA
       ============================================================ */
    ativar: function (modo) {
      if (this.modo === modo) { this.desativar(); return; }

      this.limparTemporarios();
      this.modo = modo;
      // ✅ Mostra painel de raio só no modo raio
      const painelRaio = document.getElementById('painel-raio-config');
      if (painelRaio) {
        painelRaio.style.display = (modo === 'raio') ? 'block' : 'none';
      }      
      // ✅ Bloqueia popups de atributos durante a medição
      document.body.classList.add('modo-medicao-ativo');

      // ✅ Impede que o duplo-clique dispare zoom em vez de finalizar
      if (window.mapa && window.mapa.doubleClickZoom) window.mapa.doubleClickZoom.disable();
      if (window.mapa && window.mapa.boxZoom) window.mapa.boxZoom.disable();
      this.pontos = [];

      document.querySelectorAll('.btn-medicao').forEach(b => b.classList.remove('ativo'));
      const btn = document.getElementById(`btn-medir-${modo}`);
      if (btn) btn.classList.add('ativo');

      const painel = document.getElementById('painel-medicao-resultados');
      if (painel) painel.classList.add('aberto');

      // Carrega preferência de snap do localStorage
      this._snapAtivo = localStorage.getItem('antaq_medicao_snap') === 'true';
      this._atualizarBotaoSnap();
      if (this._snapAtivo) this._construirGridSnap();

      const totalSalvas = this.medicoesSalvas.length;
      let dicaInicial = totalSalvas > 0
        ? `Clique para nova medição. ${totalSalvas} medição(ões) no mapa.`
        : 'Clique no mapa para começar. Duplo-clique para finalizar.';
      if (this._snapAtivo) dicaInicial = `🔗 Snap ativo (${this._snapTotal.toLocaleString('pt-BR')} vértices) · ` + dicaInicial;
      this._atualizarPainel(modo, 0, dicaInicial);

      document.getElementById('mapa').style.cursor = 'crosshair';
      this._bindListeners();
      this._configurarOverlay();
    },

    desativar: function () {
      // ✅ Esconde painel de raio
      const painelRaio = document.getElementById('painel-raio-config');
      if (painelRaio) painelRaio.style.display = 'none';      
      this.modo = null;
      // ✅ Restaura popups ao sair da medição
      document.body.classList.remove('modo-medicao-ativo');
      this._esconderBotaoFinalizarRaio();
      // ✅ Reabilita zoom no duplo-clique
      if (window.mapa && window.mapa.doubleClickZoom) window.mapa.doubleClickZoom.enable();
      this._ultimoClickTempo = 0;
      this._ultimoClickScreen = null;
      document.querySelectorAll('.btn-medicao').forEach(b => b.classList.remove('ativo'));
      document.getElementById('mapa').style.cursor = '';
      const painel = document.getElementById('painel-medicao-resultados');
      if (painel) painel.classList.remove('aberto');
      this._unbindListeners();
      this.limparTemporarios();
      this._ocultarOverlay();
      this._removerIndicadorSnap();
    },

    /* ============================================================
       SNAP — CONFIGURAÇÃO E GRID
       ============================================================ */
    toggleSnap: function () {
      this._snapAtivo = !this._snapAtivo;
      localStorage.setItem('antaq_medicao_snap', String(this._snapAtivo));
      this._atualizarBotaoSnap();

      if (this._snapAtivo) {
        this._construirGridSnap();
        if (window.UI) window.UI.toast(`🔗 Snap ativo — ${this._snapTotal.toLocaleString('pt-BR')} vértices indexados.`);
      } else {
        this._removerIndicadorSnap();
        if (window.UI) window.UI.toast('🔗 Snap desativado.');
      }
    },

    _atualizarBotaoSnap: function () {
      const btn = document.getElementById('btn-medicao-snap');
      if (!btn) return;
      if (this._snapAtivo) btn.classList.add('ativo-snap');
      else btn.classList.remove('ativo-snap');
    },

    _construirGridSnap: function () {
      this._snapGrid = {};
      this._snapTotal = 0;

      const inicio = performance.now();

      for (const [id, layer] of Object.entries(window.CAMADAS_MAPA)) {
        if (!window.mapa.hasLayer(layer)) continue;
        try {
          if (typeof layer.eachLayer === 'function') {
            layer.eachLayer(sub => this._extrairVerticesDe(sub, id));
          }
        } catch (e) { /* camada sem eachLayer */ }
      }

      const duracao = (performance.now() - inicio).toFixed(0);
      const celulas = Object.keys(this._snapGrid).length;
      console.info(`[M1] Snap: ${this._snapTotal} vértices em ${celulas} células (${duracao}ms)`);
    },

    _extrairVerticesDe: function (sub, camadaId, profundidade) {
      if (!sub) return;
      profundidade = profundidade || 0;
      if (profundidade > 5) return; // proteção anti-loop

      // 1) Marker ou CircleMarker com posição única
      if (typeof sub.getLatLng === 'function' && typeof sub.getLatLngs !== 'function') {
        try { this._adicionarVertice(sub.getLatLng(), camadaId); } catch (e) {}
        return;
      }

      // 2) Polyline / Polygon
      if (typeof sub.getLatLngs === 'function') {
        try { this._percorrerLatLngs(sub.getLatLngs(), camadaId); } catch (e) {}
        return;
      }

      // 3) ✅ LayerGroup / FeatureGroup / MarkerClusterGroup — recursão
      if (typeof sub.eachLayer === 'function') {
        try {
          sub.eachLayer(inner => this._extrairVerticesDe(inner, camadaId, profundidade + 1));
        } catch (e) { /* ignora */ }
      }
    },
    _percorrerLatLngs: function (arr, camadaId) {
      if (!Array.isArray(arr)) return;
      for (const item of arr) {
        if (Array.isArray(item)) {
          this._percorrerLatLngs(item, camadaId);
        } else if (item && typeof item.lat === 'number' && typeof item.lng === 'number') {
          this._adicionarVertice(item, camadaId);
        }
      }
    },

    _adicionarVertice: function (ll, camadaId) {
      const key = this._chaveGrid(ll.lat, ll.lng);
      if (!this._snapGrid[key]) this._snapGrid[key] = [];
      this._snapGrid[key].push({ lat: ll.lat, lng: ll.lng, camada: camadaId });
      this._snapTotal++;
    },

    _chaveGrid: function (lat, lng) {
      // Grid de 0.1° (~11 km) — equilíbrio entre resolução e overhead
      return `${Math.floor(lat * 10)}|${Math.floor(lng * 10)}`;
    },

    _encontrarSnap: function (latlng, screenPoint, raioPx) {
      if (!this._snapTotal) return null;

      const cellLat = Math.floor(latlng.lat * 10);
      const cellLng = Math.floor(latlng.lng * 10);

      let melhor = null;
      let menorDist = raioPx;

      for (let dLat = -1; dLat <= 1; dLat++) {
        for (let dLng = -1; dLng <= 1; dLng++) {
          const key = `${cellLat + dLat}|${cellLng + dLng}`;
          const verts = this._snapGrid[key];
          if (!verts) continue;
          for (const v of verts) {
            const sp = window.mapa.latLngToContainerPoint([v.lat, v.lng]);
            const d = sp.distanceTo(screenPoint);
            if (d < menorDist) {
              menorDist = d;
              melhor = v;
            }
          }
        }
      }
      return melhor;
    },
    /**
     * Verifica se o clique caiu "dentro" de algum marker visível no mapa.
     * Retorna o L.LatLng do centro do marker se sim, ou null se não.
     * Marcadores têm prioridade sobre snap de vértices genéricos.
     */
    _detectarMarkerNoClique: function (screenPoint, toleranciaPx) {
      toleranciaPx = toleranciaPx || 15;
      let melhor = null;
      let menorDist = toleranciaPx;

      const verificar = (layer) => {
        if (!layer || typeof layer.getLatLng !== 'function') return;
        // Só considera markers — polylines/polygons têm getLatLngs
        if (typeof layer.getLatLngs === 'function') return;

        try {
          const ll = layer.getLatLng();
          const sp = window.mapa.latLngToContainerPoint(ll);
          const d = sp.distanceTo(screenPoint);
          // Considera o raio visual do próprio marker (CircleMarker)
          const raioMarker = (layer.getRadius && layer.getRadius()) || 6;
          const toleranciaReal = Math.max(toleranciaPx, raioMarker + 3);
          if (d < toleranciaReal && d < menorDist + raioMarker) {
            menorDist = d;
            melhor = ll;
          }
        } catch (e) { /* ignora */ }
      };

      // Percorre todas as camadas visíveis
      for (const [id, camada] of Object.entries(window.CAMADAS_MAPA)) {
        if (!window.mapa.hasLayer(camada)) continue;
        try {
          if (typeof camada.eachLayer === 'function') {
            camada.eachLayer(sub => {
              // Desce um nível pra pegar clusters
              if (sub && typeof sub.eachLayer === 'function' && typeof sub.getLatLng !== 'function') {
                sub.eachLayer(inner => verificar(inner));
              } else {
                verificar(sub);
              }
            });
          }
        } catch (e) { /* ignora */ }
      }

      return melhor;
    },
    _mostrarIndicadorSnap: function (vertice) {
      this._removerIndicadorSnap();
      if (!vertice) return;

      this._snapIndicator = L.marker([vertice.lat, vertice.lng], {
        icon: L.divIcon({
          className: '',
          html: '<div class="snap-indicator"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        }),
        interactive: false,
        pane: 'panePontos'
      }).addTo(window.mapa);
    },

    _removerIndicadorSnap: function () {
      if (this._snapIndicator && window.mapa.hasLayer(this._snapIndicator)) {
        window.mapa.removeLayer(this._snapIndicator);
      }
      this._snapIndicator = null;
      this._snapPoint = null;
    },

    /* ============================================================
       OVERLAY AO VIVO
       ============================================================ */
    _configurarOverlay: function () {
      this._overlayEl = document.getElementById('medicao-live-overlay');
    },

    _atualizarOverlay: function (parcial, total, hint) {
      if (!this._overlayEl) return;

      const parcialEl = document.getElementById('live-parcial');
      const totalEl = document.getElementById('live-total');
      const hintEl = document.getElementById('live-hint');

      if (parcialEl) parcialEl.textContent = this._fmtDist(parcial);
      if (totalEl) totalEl.textContent = this._fmtDist(total);
      if (hintEl) {
        if (hint) {
          hintEl.textContent = hint;
          hintEl.classList.add('visivel');
        } else {
          hintEl.classList.remove('visivel');
        }
      }

      this._overlayEl.style.display = 'block';
    },

    _posicionarOverlay: function (e) {
      if (!this._overlayEl) return;
      // Offset de 15px pra não cobrir o cursor
      const x = e.originalEvent ? e.originalEvent.clientX : e.clientX;
      const y = e.originalEvent ? e.originalEvent.clientY : e.clientY;
      if (typeof x !== 'number' || typeof y !== 'number') return;
      this._overlayEl.style.left = (x + 15) + 'px';
      this._overlayEl.style.top = (y + 15) + 'px';
    },

    _ocultarOverlay: function () {
      if (this._overlayEl) this._overlayEl.style.display = 'none';
    },

    _fmtDist: function (km) {
      if (!km && km !== 0) return '—';
      if (km < 1) return `${(km * 1000).toFixed(0)} m`;
      if (km < 10) return `${km.toFixed(3)} km`;
      return `${km.toFixed(2)} km`;
    },

    /* ============================================================
       LISTENERS
       ============================================================ */
    _bindListeners: function () {
      this._unbindListeners();
      const self = this;

      // ✅ Handler em CAPTURE PHASE registrado no document — pega ANTES de tudo
      this._handlers = {
        clickDom: function (domEvent) {
          if (!self.modo) return;

          // Só processa se o clique foi DENTRO do container do mapa
          const container = window.mapa.getContainer();
          if (!container.contains(domEvent.target)) return;

          // Ignora cliques em controles do Leaflet
          if (domEvent.target.closest && domEvent.target.closest('.leaflet-control')) return;
          if (domEvent.target.closest && domEvent.target.closest('.leaflet-popup')) return;

          // Ignora botão direito / modificadores de navegação
          if (domEvent.button !== 0) return;

          // Converte coordenadas de tela → latlng
          const rect = container.getBoundingClientRect();
          const point = L.point(domEvent.clientX - rect.left, domEvent.clientY - rect.top);

          // ✅ PRIORIDADE 1: clique dentro de um marker (porto, embarcação, etc.)
          // Se o clique caiu "dentro" de um CircleMarker, usa o centro exato dele
          const markerExato = self._detectarMarkerNoClique(point, 15);

          // ✅ PRIORIDADE 2: snap em vértices
          const latlngBase = markerExato || window.mapa.containerPointToLatLng(point);
          const snapVertice = self._snapPoint
            ? L.latLng(self._snapPoint.lat, self._snapPoint.lng)
            : null;

          // Se marcador + snap estiverem perto, marcador vence
          let latlng = latlngBase;
          if (snapVertice && markerExato) {
            const dMarker = window.mapa.latLngToContainerPoint(markerExato).distanceTo(point);
            const dSnap = window.mapa.latLngToContainerPoint(snapVertice).distanceTo(point);
            latlng = dMarker <= dSnap ? markerExato : snapVertice;
          } else if (markerExato) {
            latlng = markerExato;
          } else if (snapVertice) {
            latlng = snapVertice;
          }

          // Se achou marcador, também atualiza o snapPoint pra ficar consistente
          if (markerExato) {
            self._snapPoint = { lat: markerExato.lat, lng: markerExato.lng, camada: 'marker' };
          }

          domEvent.stopPropagation();
          domEvent.preventDefault();

          self._onMapClick({ latlng: latlng, originalEvent: domEvent });
        },
        dblclickDom: function (domEvent) {
          if (!self.modo) return;
          const container = window.mapa.getContainer();
          if (!container.contains(domEvent.target)) return;
          if (domEvent.target.closest && domEvent.target.closest('.leaflet-control')) return;

          domEvent.stopPropagation();
          domEvent.preventDefault();
          self._finalizar();
        },
        mousemove: (e) => self._onMouseMove(e),
        mouseout: () => { self._ocultarOverlay(); self._removerIndicadorSnap(); },
        keydown: (ev) => {
          if (ev.key === 'Escape') self.desativar();
          if (ev.key === 'Control' && self._snapAtivo) self._snapCtrlInvertido = true;
          if (ev.key === 'Alt' && !self._snapAtivo && self._snapTotal > 0) self._snapCtrlInvertido = true;
        },
        keyup: (ev) => {
          if (ev.key === 'Control' || ev.key === 'Alt') self._snapCtrlInvertido = false;
        }
      };

      // ✅ Registra no document, capture phase
      document.addEventListener('click', this._handlers.clickDom, true);
      document.addEventListener('dblclick', this._handlers.dblclickDom, true);

      // Mousemove continua no Leaflet
      window.mapa.on('mousemove', this._handlers.mousemove);
      window.mapa.on('mouseout', this._handlers.mouseout);

      document.addEventListener('keydown', this._handlers.keydown);
      document.addEventListener('keyup', this._handlers.keyup);

      console.log('[M1] Listeners registrados. Modo:', self.modo);
    },

    _unbindListeners: function () {
      if (!this._handlers) return;

      document.removeEventListener('click', this._handlers.clickDom, true);
      document.removeEventListener('dblclick', this._handlers.dblclickDom, true);

      window.mapa.off('mousemove', this._handlers.mousemove);
      window.mapa.off('mouseout', this._handlers.mouseout);

      document.removeEventListener('keydown', this._handlers.keydown);
      document.removeEventListener('keyup', this._handlers.keyup);

      this._handlers = null;
      console.log('[M1] Listeners removidos.');
    },

    /* ============================================================
       EVENTOS DO MAPA
       ============================================================ */
    _onMapClick: function (e) {
      if (!this.modo) return;

      // ✅ Garante que nenhum popup roube a interação
      if (window.mapa && window.mapa.closePopup) window.mapa.closePopup();

      // Usa ponto de snap se disponível, senão o clique cru
      const latlng = this._snapPoint
        ? L.latLng(this._snapPoint.lat, this._snapPoint.lng)
        : e.latlng;

      const screenPoint = window.mapa.latLngToContainerPoint(latlng);
      const agora = Date.now();

      if (this._ultimoClickTempo &&
          (agora - this._ultimoClickTempo) < 320 &&
          this._ultimoClickScreen &&
          this._ultimoClickScreen.distanceTo(screenPoint) < 10) {
        this._ultimoClickTempo = 0;
        this._ultimoClickScreen = null;
        return;
      }
      this._ultimoClickTempo = agora;
      this._ultimoClickScreen = screenPoint;

      if (this.modo === 'raio') {
        if (this.pontos.length === 0) {
          this.pontos.push(latlng);
          this._desenharCirculo(latlng, 0);
          this._atualizarPainel('raio', 0, 'Mova o mouse para ajustar o raio. Clique para finalizar.');
        } else {
          this._finalizar();
        }
        return;
      }

      this.pontos.push(latlng);
      this._desenharPontoTemp(latlng);
      this._atualizarFormaTemporaria();

      if (this.pontos.length === 1) {
        this._atualizarPainel(this.modo, 0, 'Clique em mais pontos. Duplo-clique ou ESC para finalizar.');
      }
    },

    _onMouseMove: function (e) {
      if (!this.modo) return;

      const agora = Date.now();
      if (this._ultimoMove && (agora - this._ultimoMove) < 33) return;
      this._ultimoMove = agora;

      const screenPoint = window.mapa.latLngToContainerPoint(e.latlng);

      /* ---------- 1. Resolve snap ---------- */
      const snapAtivoAgora = this._snapAtivo !== this._snapCtrlInvertido;
      let pontoEfetivo = e.latlng;

      if (snapAtivoAgora && this._snapTotal > 0) {
        const snap = this._encontrarSnap(e.latlng, screenPoint, 12);
        if (snap) {
          this._snapPoint = snap;
          pontoEfetivo = L.latLng(snap.lat, snap.lng);
          this._mostrarIndicadorSnap(snap);
        } else {
          this._snapPoint = null;
          this._removerIndicadorSnap();
        }
      } else {
        this._snapPoint = null;
        this._removerIndicadorSnap();
      }

      /* ---------- 2. Overlay + preview ---------- */
      this._posicionarOverlay(e);

      // Hint contextual (snap on/off/ctrl)
      let hint = '';
      if (snapAtivoAgora && this._snapPoint) hint = `🔗 vértice (${this._snapPoint.camada})`;
      else if (this._snapAtivo && this._snapCtrlInvertido) hint = 'snap suspenso (Ctrl)';
      else if (!this._snapAtivo && this._snapCtrlInvertido && this._snapTotal > 0) hint = 'snap forçado (Alt)';

      // Se não tem pontos ainda, só mostra o overlay básico
      if (this.pontos.length === 0) {
        this._atualizarOverlay(0, 0, hint || 'clique para iniciar');
        return;
      }

      /* ---------- 3. Preview do próximo segmento ---------- */
      if (this.modo === 'raio') {
        const centro = this.pontos[0];
        const dist = this._distanciaKm(centro, pontoEfetivo);
        this._desenharCirculo(centro, dist);
        const areaKm2 = Math.PI * dist * dist;
        this._atualizarOverlay(dist, dist, hint || `área ≈ ${areaKm2.toFixed(2)} km²`);
        this._atualizarPainel('raio', dist * 1000, `Área ≈ ${areaKm2.toFixed(2)} km²`);
        return;
      }

      const pontosPreview = [...this.pontos, pontoEfetivo];
      const totalAcumulado = this._calcularDistanciaTotal(this.pontos);
      const ultimoPonto = this.pontos[this.pontos.length - 1];
      const distParcial = this._distanciaKm(ultimoPonto, pontoEfetivo);

      if (this.modo === 'distancia') {
        this._desenharLinha(pontosPreview, false);
      } else {
        this._desenharPoligono(pontosPreview, false);
      }

      this._atualizarOverlay(distParcial, totalAcumulado + distParcial, hint);
    },

    _finalizar: function () {
      if (!this.modo) return;

      this._ultimoClickTempo = 0;
      this._ultimoClickScreen = null;
      this._removerIndicadorSnap();

      if (this.modo === 'raio') {
        if (this.pontos.length < 1 || !this.circuloTemp) { this.desativar(); return; }
        const centro = this.pontos[0];
        const raio = this.circuloTemp.getRadius() / 1000;
        const areaKm2 = Math.PI * raio * raio;

        this._atualizarPainel('raio', raio * 1000, `Área total ≈ ${areaKm2.toFixed(2)} km²`);
        this.medicoesSalvas.push(this.circuloTemp);
        this.circuloTemp = null;

        // ✅ Label 1: raio (acima do centro)
        const labelRaio = L.marker(centro, {
          icon: L.divIcon({
            className: 'label-medicao',
            html: `⭕ ${raio.toFixed(2)} km`,
            iconSize: [120, 20],
            iconAnchor: [60, -12]
          }),
          interactive: false,
          pane: 'panePontos'
        }).addTo(window.mapa);
        this.medicoesSalvas.push(labelRaio);

        // ✅ Label 2: área (abaixo do centro)
        const labelArea = L.marker(centro, {
          icon: L.divIcon({
            className: 'label-medicao label-area',
            html: `▦ ${areaKm2 >= 1000 ? (areaKm2 / 1000).toFixed(2) + ' mil km²' : areaKm2.toFixed(2) + ' km²'}`,
            iconSize: [140, 20],
            iconAnchor: [70, 30]
          }),
          interactive: false,
          pane: 'panePontos'
        }).addTo(window.mapa);
        this.medicoesSalvas.push(labelArea);

      } else if (this.modo === 'distancia') {
        if (this.pontos.length < 2) { this.desativar(); return; }
        if (this.linhaTemp) {
          try { this.linhaTemp.setStyle({ dashArray: null }); } catch (e) {}
          this.medicoesSalvas.push(this.linhaTemp);
        }
        this.linhaTemp = null;

      } else if (this.modo === 'area') {
        if (this.pontos.length < 3) { this.desativar(); return; }

        // ✅ Calcula a área final ANTES de limpar os pontos
        let areaM2 = 0, perimKm = 0;
        try {
          const coords = this.pontos.map(p => [p.lng, p.lat]);
          coords.push(coords[0]);
          const poly = turf.polygon([coords]);
          areaM2 = turf.area(poly);
          perimKm = this._calcularDistanciaTotal(this.pontos);
        } catch (e) { /* ignora */ }

        if (this.poligonoTemp) this.medicoesSalvas.push(this.poligonoTemp);
        this.poligonoTemp = null;

        // ✅ Label permanente da área no centroide
        if (areaM2 > 0) {
          try {
            // Centroide real via Turf
            const coords = this.pontos.map(p => [p.lng, p.lat]);
            coords.push(coords[0]);
            const poly = turf.polygon([coords]);
            const centroide = turf.centroid(poly);
            const [lngC, latC] = centroide.geometry.coordinates;

            const areaKm2 = areaM2 / 1_000_000;
            const textoArea = areaKm2 >= 1000
              ? `▦ ${(areaKm2 / 1000).toFixed(2)} mil km²`
              : `▦ ${areaKm2.toFixed(2)} km²`;

            const labelArea = L.marker([latC, lngC], {
              icon: L.divIcon({
                className: 'label-medicao label-area',
                html: textoArea,
                iconSize: [160, 22],
                iconAnchor: [80, 11]
              }),
              interactive: false,
              pane: 'panePontos'
            }).addTo(window.mapa);
            this.medicoesSalvas.push(labelArea);

            // ✅ Label secundária: perímetro (abaixo do centroide)
            const labelPerim = L.marker([latC, lngC], {
              icon: L.divIcon({
                className: 'label-medicao label-perimetro',
                html: `⟲ ${perimKm.toFixed(2)} km`,
                iconSize: [140, 18],
                iconAnchor: [70, -14]
              }),
              interactive: false,
              pane: 'panePontos'
            }).addTo(window.mapa);
            this.medicoesSalvas.push(labelPerim);
          } catch (e) { /* ignora */ }
        }
      }
      // ✅ Esconde o botão de fixar raio depois de finalizar
      this._esconderBotaoFinalizarRaio();
      this.labelsTemp.forEach(l => {
        l._permanente = true;
        this.medicoesSalvas.push(l);
      });

      this.pontos = [];
      this.marcadoresTemp.forEach(m => window.mapa.removeLayer(m));
      this.marcadoresTemp = [];
      this.labelsTemp = [];

      const totalSalvas = this.medicoesSalvas.length;
      this._atualizarPainel(this.modo, 0,
        `Clique para iniciar nova medição. ${totalSalvas} medição(ões) no mapa.`);
    },

    /* ============================================================
       DESENHO
       ============================================================ */
    _desenharPontoTemp: function (latlng) {
      const m = L.circleMarker(latlng, {
        radius: 5, fillColor: '#f59e0b', color: '#ffffff',
        weight: 2, fillOpacity: 1, pane: 'panePontos'
      }).addTo(window.mapa);
      this.marcadoresTemp.push(m);
    },

    _desenharLinha: function (pontos, permanente) {
      if (this.linhaTemp) window.mapa.removeLayer(this.linhaTemp);
      this.linhaTemp = L.polyline(pontos, {
        color: '#f59e0b', weight: 3, opacity: 0.95,
        dashArray: permanente ? null : '6, 4', pane: 'paneLinhas'
      }).addTo(window.mapa);
      this._calcularEExibirDistancia(pontos);
    },

    _desenharPoligono: function (pontos, permanente) {
      if (this.poligonoTemp) window.mapa.removeLayer(this.poligonoTemp);
      this.poligonoTemp = L.polygon(pontos, {
        color: '#f59e0b', weight: 3, fillColor: '#f59e0b',
        fillOpacity: 0.15, pane: 'paneLinhas'
      }).addTo(window.mapa);
      this._calcularEExibirArea(pontos);
    },

    _desenharCirculo: function (centro, raioKm) {
      if (this.circuloTemp) window.mapa.removeLayer(this.circuloTemp);
      this.circuloTemp = L.circle(centro, {
        radius: raioKm * 1000, color: '#f59e0b', weight: 3,
        fillColor: '#f59e0b', fillOpacity: 0.12, pane: 'paneLinhas'
      }).addTo(window.mapa);
    },
    /**
     * Aplica um raio exato digitado no input (em vez de arrastar o mouse).
     * Usa o primeiro ponto já clicado como centro, ou o centro do mapa se nenhum.
     */
    aplicarRaioExato: function () {
      const input = document.getElementById('raio-input-km');
      if (!input) return;

      const valorKm = parseFloat(input.value);
      if (!Number.isFinite(valorKm) || valorKm <= 0) {
        if (window.UI) window.UI.toast('⚠️ Informe um raio válido em km.');
        return;
      }

      // Se não tem centro definido, usa o centro do mapa
      let centro = this.pontos[0];
      if (!centro) {
        const c = window.mapa.getCenter();
        centro = L.latLng(c.lat, c.lng);
        this.pontos.push(centro);
      }

      // Desenha o círculo no raio exato
      this._desenharCirculo(centro, valorKm);

      // Atualiza o painel
      const areaKm2 = Math.PI * valorKm * valorKm;
      this._atualizarPainel('raio', valorKm * 1000,
        `Área ≈ ${areaKm2.toFixed(2)} km² · Clique em "Finalizar" ou no 2º ponto pra fixar`);

      // Cria o botão de finalizar se não existir
      this._mostrarBotaoFinalizarRaio();
    },

    _mostrarBotaoFinalizarRaio: function () {
      let btn = document.getElementById('btn-finalizar-raio');
      if (!btn) {
        btn = document.createElement('button');
        btn.id = 'btn-finalizar-raio';
        btn.textContent = '✓ Fixar raio';
        btn.style.cssText = `
          position: absolute; bottom: 90px; left: 50%;
          transform: translateX(-50%); z-index: 1501;
          background: #10b981; color: #fff; border: 1px solid #34d399;
          padding: 8px 20px; border-radius: 6px; font-size: 12px;
          font-weight: 800; cursor: pointer;
          box-shadow: 0 4px 14px rgba(16,185,129,0.4);
          font-family: 'Segoe UI', sans-serif;
        `;
        btn.onclick = () => this._finalizar();
        document.body.appendChild(btn);
      }
      btn.style.display = 'block';
    },

    _esconderBotaoFinalizarRaio: function () {
      const btn = document.getElementById('btn-finalizar-raio');
      if (btn) btn.style.display = 'none';
    },    

    _atualizarFormaTemporaria: function () {
      if (this.modo === 'distancia' && this.pontos.length >= 2) {
        this._desenharLinha(this.pontos, false);
      } else if (this.modo === 'area' && this.pontos.length >= 3) {
        this._desenharPoligono(this.pontos, false);
      }
    },

    /* ============================================================
       CÁLCULOS
       ============================================================ */
    _calcularEExibirDistancia: function (pontos) {
      if (pontos.length < 2) {
        this._atualizarPainel('distancia', 0, 'Adicione mais pontos.');
        return;
      }
      let totalKm = 0;
      const coords = pontos.map(p => [p.lng, p.lat]);

      this.labelsTemp.forEach(l => { if (l._tipo === 'segmento') window.mapa.removeLayer(l); });
      this.labelsTemp = this.labelsTemp.filter(l => l._tipo !== 'segmento');

      for (let i = 0; i < coords.length - 1; i++) {
        try {
          const seg = turf.lineString([coords[i], coords[i + 1]]);
          const distKm = turf.length(seg, { units: 'kilometers' });
          totalKm += distKm;
          const meio = [(pontos[i].lat + pontos[i + 1].lat) / 2, (pontos[i].lng + pontos[i + 1].lng) / 2];
          const label = L.marker(meio, {
            icon: L.divIcon({
              className: 'label-medicao',
              html: distKm < 1 ? `${(distKm * 1000).toFixed(0)} m` : `${distKm.toFixed(2)} km`,
              iconSize: [60, 20],
              iconAnchor: [30, 10]
            }),
            interactive: false,
            pane: 'panePontos'
          }).addTo(window.mapa);
          label._tipo = 'segmento';
          this.labelsTemp.push(label);
        } catch (err) {}
      }

      const dica = pontos.length >= 2 ? 'Duplo-clique para finalizar.' : 'Adicione mais pontos.';
      this._atualizarPainel('distancia', totalKm * 1000, dica);
    },

    _calcularEExibirArea: function (pontos) {
      if (pontos.length < 3) {
        const parcial = this._calcularDistanciaTotal(pontos);
        this._atualizarPainel('area', parcial * 1000, 'Adicione pelo menos 3 pontos para calcular a área.');
        return;
      }
      try {
        const coords = pontos.map(p => [p.lng, p.lat]);
        coords.push(coords[0]);
        const poly = turf.polygon([coords]);
        const areaM2 = turf.area(poly);
        const areaKm2 = areaM2 / 1_000_000;
        const perimKm = this._calcularDistanciaTotal(pontos);
        this._atualizarPainel('area', areaKm2 * 1_000_000, `Perímetro: ${perimKm.toFixed(2)} km • Duplo-clique para finalizar.`);
      } catch (err) {}
    },

    _calcularDistanciaTotal: function (pontos) {
      let total = 0;
      for (let i = 0; i < pontos.length - 1; i++) {
        total += this._distanciaKm(pontos[i], pontos[i + 1]);
      }
      return total;
    },

    _distanciaKm: function (a, b) {
      try {
        return turf.distance([a.lng, a.lat], [b.lng, b.lat], { units: 'kilometers' });
      } catch (e) {
        return a.distanceTo(b) / 1000;
      }
    },

    /* ============================================================
       PAINEL / LIMPEZA
       ============================================================ */
    _atualizarPainel: function (modo, valor, dica) {
      const rotulo = document.getElementById('medicao-rotulo');
      const valorEl = document.getElementById('medicao-valor');
      const dicaEl = document.getElementById('medicao-dica');
      if (!rotulo) return;

      const nomes = { distancia: '📏 Distância total', area: '⬛ Área total', raio: '⭕ Raio' };
      rotulo.textContent = nomes[modo] || 'Medição';

      if (modo === 'area') {
        valorEl.textContent = valor >= 1_000_000 ? `${(valor / 1_000_000).toFixed(3)} km²`
                           : valor >= 1000 ? `${(valor / 1000).toFixed(2)} km²`
                           : `${valor.toFixed(2)} m²`;
      } else {
        valorEl.textContent = valor >= 1000 ? `${(valor / 1000).toFixed(3)} km`
                           : `${valor.toFixed(1)} m`;
      }
      dicaEl.textContent = dica || '';
    },

    limparTemporarios: function () {
      if (this.linhaTemp) window.mapa.removeLayer(this.linhaTemp);
      if (this.poligonoTemp) window.mapa.removeLayer(this.poligonoTemp);
      if (this.circuloTemp) window.mapa.removeLayer(this.circuloTemp);
      this.linhaTemp = this.poligonoTemp = this.circuloTemp = null;
      this.marcadoresTemp.forEach(m => window.mapa.removeLayer(m));
      this.marcadoresTemp = [];
      this.labelsTemp.forEach(l => window.mapa.removeLayer(l));
      this.labelsTemp = [];
      this.pontos = [];
      this._removerIndicadorSnap();
    },

    limparTudo: function () {
      this.limparTemporarios();

      this.medicoesSalvas.forEach(m => { if (window.mapa.hasLayer(m)) window.mapa.removeLayer(m); });
      this.medicoesSalvas = [];

      const orfaos = [];
      window.mapa.eachLayer(layer => {
        try {
          if (layer instanceof L.Marker &&
              layer.options &&
              layer.options.icon &&
              layer.options.icon.options &&
              (layer.options.icon.options.className === 'label-medicao' ||
               (layer.options.icon.options.html || '').indexOf('snap-indicator') !== -1)) {
            orfaos.push(layer);
          }
        } catch (e) {}
      });
      orfaos.forEach(l => window.mapa.removeLayer(l));

      if (window.UI) window.UI.toast(`🧹 Medições removidas (${this.medicoesSalvas.length + orfaos.length} elementos).`);
    }
  };

  window.MeasurementTool = MeasurementTool;
  console.info('[js] MeasurementTool carregado (com snap + overlay)');
})();