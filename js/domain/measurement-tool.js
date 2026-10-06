/* ============================================================
   WebGIS ANTAQ — Módulo: MeasurementTool (M1)
   Escopo: medição de distância, área e raio (Turf.js)
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

    ativar: function (modo) {
      if (this.modo === modo) { this.desativar(); return; }

      this.limparTemporarios();
      this.modo = modo;
      this.pontos = [];

      document.querySelectorAll('.btn-medicao').forEach(b => b.classList.remove('ativo'));
      const btn = document.getElementById(`btn-medir-${modo}`);
      if (btn) btn.classList.add('ativo');

      const painel = document.getElementById('painel-medicao-resultados');
      if (painel) painel.classList.add('aberto');

      const totalSalvas = this.medicoesSalvas.length;
      const dicaInicial = totalSalvas > 0
        ? `Clique para nova medição. ${totalSalvas} medição(ões) finalizada(s) no mapa.`
        : 'Clique no mapa para começar. Duplo-clique para finalizar.';
      this._atualizarPainel(modo, 0, dicaInicial);

      document.getElementById('mapa').style.cursor = 'crosshair';
      this._bindListeners();
    },

    desativar: function () {
      this.modo = null;
      this._ultimoClickTempo = 0;
      this._ultimoClickScreen = null;
      document.querySelectorAll('.btn-medicao').forEach(b => b.classList.remove('ativo'));
      document.getElementById('mapa').style.cursor = '';
      const painel = document.getElementById('painel-medicao-resultados');
      if (painel) painel.classList.remove('aberto');
      this._unbindListeners();
      this.limparTemporarios();
    },

    _bindListeners: function () {
      this._unbindListeners();
      this._handlers = {
        click: (e) => this._onMapClick(e),
        dblclick: (e) => { L.DomEvent.stop(e); this._finalizar(); },
        mousemove: (e) => this._onMouseMove(e),
        keydown: (ev) => { if (ev.key === 'Escape') this.desativar(); }
      };
      mapa.on('click', this._handlers.click);
      mapa.on('dblclick', this._handlers.dblclick);
      mapa.on('mousemove', this._handlers.mousemove);
      document.addEventListener('keydown', this._handlers.keydown);
    },

    _unbindListeners: function () {
      if (!this._handlers) return;
      mapa.off('click', this._handlers.click);
      mapa.off('dblclick', this._handlers.dblclick);
      mapa.off('mousemove', this._handlers.mousemove);
      document.removeEventListener('keydown', this._handlers.keydown);
      this._handlers = null;
    },

    _onMapClick: function (e) {
      if (!this.modo) return;
      const latlng = e.latlng;
      const screenPoint = mapa.latLngToContainerPoint(latlng);
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
      if (!this.modo || this.pontos.length === 0) return;

      const agora = Date.now();
      if (this._ultimoMove && (agora - this._ultimoMove) < 33) return;
      this._ultimoMove = agora;

      const ponto = e.latlng;

      if (this.modo === 'raio') {
        const centro = this.pontos[0];
        const dist = this._distanciaKm(centro, ponto);
        this._desenharCirculo(centro, dist);
        this._atualizarPainel('raio', dist * 1000, `Área ≈ ${(Math.PI * dist * dist).toFixed(2)} km²`);
        return;
      }

      const pontosPreview = [...this.pontos, ponto];
      if (this.modo === 'distancia') {
        this._desenharLinha(pontosPreview, false);
      } else {
        this._desenharPoligono(pontosPreview, false);
      }
    },

    _finalizar: function () {
      if (!this.modo) return;

      this._ultimoClickTempo = 0;
      this._ultimoClickScreen = null;

      if (this.modo === 'raio') {
        if (this.pontos.length < 1 || !this.circuloTemp) { this.desativar(); return; }
        const centro = this.pontos[0];
        const raio = this.circuloTemp.getRadius() / 1000;
        const areaKm2 = Math.PI * raio * raio;
        this._atualizarPainel('raio', raio * 1000, `Área total ≈ ${areaKm2.toFixed(2)} km²`);
        this.medicoesSalvas.push(this.circuloTemp);
        this.circuloTemp = null;

        const labelRaio = L.marker(centro, {
          icon: L.divIcon({
            className: 'label-medicao',
            html: `⭕ ${raio.toFixed(2)} km`,
            iconSize: [100, 20],
            iconAnchor: [50, -12]
          }),
          interactive: false,
          pane: 'panePontos'
        }).addTo(mapa);
        this.medicoesSalvas.push(labelRaio);

      } else if (this.modo === 'distancia') {
        if (this.pontos.length < 2) { this.desativar(); return; }
        if (this.linhaTemp) {
          try { this.linhaTemp.setStyle({ dashArray: null }); } catch (e) {}
          this.medicoesSalvas.push(this.linhaTemp);
        }
        this.linhaTemp = null;

      } else if (this.modo === 'area') {
        if (this.pontos.length < 3) { this.desativar(); return; }
        if (this.poligonoTemp) this.medicoesSalvas.push(this.poligonoTemp);
        this.poligonoTemp = null;
      }

      this.labelsTemp.forEach(l => {
        l._permanente = true;
        this.medicoesSalvas.push(l);
      });

      this.pontos = [];
      this.marcadoresTemp.forEach(m => mapa.removeLayer(m));
      this.marcadoresTemp = [];
      this.labelsTemp = [];

      const totalSalvas = this.medicoesSalvas.length;
      this._atualizarPainel(this.modo, 0,
        `Clique para iniciar nova medição. ${totalSalvas} medição(ões) finalizada(s) no mapa.`);
    },

    _desenharPontoTemp: function (latlng) {
      const m = L.circleMarker(latlng, {
        radius: 5, fillColor: '#f59e0b', color: '#ffffff',
        weight: 2, fillOpacity: 1, pane: 'panePontos'
      }).addTo(mapa);
      this.marcadoresTemp.push(m);
    },

    _desenharLinha: function (pontos, permanente) {
      if (this.linhaTemp) mapa.removeLayer(this.linhaTemp);
      this.linhaTemp = L.polyline(pontos, {
        color: '#f59e0b', weight: 3, opacity: 0.95,
        dashArray: permanente ? null : '6, 4', pane: 'paneLinhas'
      }).addTo(mapa);
      this._calcularEExibirDistancia(pontos);
    },

    _desenharPoligono: function (pontos, permanente) {
      if (this.poligonoTemp) mapa.removeLayer(this.poligonoTemp);
      this.poligonoTemp = L.polygon(pontos, {
        color: '#f59e0b', weight: 3, fillColor: '#f59e0b',
        fillOpacity: 0.15, pane: 'paneLinhas'
      }).addTo(mapa);
      this._calcularEExibirArea(pontos);
    },

    _desenharCirculo: function (centro, raioKm) {
      if (this.circuloTemp) mapa.removeLayer(this.circuloTemp);
      this.circuloTemp = L.circle(centro, {
        radius: raioKm * 1000, color: '#f59e0b', weight: 3,
        fillColor: '#f59e0b', fillOpacity: 0.12, pane: 'paneLinhas'
      }).addTo(mapa);
    },

    _atualizarFormaTemporaria: function () {
      if (this.modo === 'distancia' && this.pontos.length >= 2) {
        this._desenharLinha(this.pontos, false);
      } else if (this.modo === 'area' && this.pontos.length >= 3) {
        this._desenharPoligono(this.pontos, false);
      }
    },

    _calcularEExibirDistancia: function (pontos) {
      if (pontos.length < 2) {
        this._atualizarPainel('distancia', 0, 'Adicione mais pontos.');
        return;
      }
      let totalKm = 0;
      const coords = pontos.map(p => [p.lng, p.lat]);

      this.labelsTemp.forEach(l => { if (l._tipo === 'segmento') mapa.removeLayer(l); });
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
          }).addTo(mapa);
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
      if (this.linhaTemp) mapa.removeLayer(this.linhaTemp);
      if (this.poligonoTemp) mapa.removeLayer(this.poligonoTemp);
      if (this.circuloTemp) mapa.removeLayer(this.circuloTemp);
      this.linhaTemp = this.poligonoTemp = this.circuloTemp = null;
      this.marcadoresTemp.forEach(m => mapa.removeLayer(m));
      this.marcadoresTemp = [];
      this.labelsTemp.forEach(l => mapa.removeLayer(l));
      this.labelsTemp = [];
      this.pontos = [];
    },

    limparTudo: function () {
      this.limparTemporarios();

      this.medicoesSalvas.forEach(m => { if (mapa.hasLayer(m)) mapa.removeLayer(m); });
      this.medicoesSalvas = [];

      const orfaos = [];
      mapa.eachLayer(layer => {
        try {
          if (layer instanceof L.Marker &&
              layer.options &&
              layer.options.icon &&
              layer.options.icon.options &&
              layer.options.icon.options.className === 'label-medicao') {
            orfaos.push(layer);
          }
        } catch (e) {}
      });
      orfaos.forEach(l => mapa.removeLayer(l));

      if (window.UI) window.UI.toast(`🧹 Medições removidas (${this.medicoesSalvas.length + orfaos.length} elementos).`);
    }
  };

  window.MeasurementTool = MeasurementTool;
  console.info('[js] MeasurementTool carregado');
})();