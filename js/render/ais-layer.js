/* ============================================================
   M14 — AIS Layer (Leaflet)
   Renderiza embarcações + popup com de-para
   ============================================================ */
(function () {
  'use strict';

  const CORES_TIPO = {
    'Carga Geral': '#3b82f6',
    'Carga Perigosa (Hazmat)': '#ef4444',
    'Tanque': '#f59e0b',
    'Passageiros': '#8b5cf6',
    'Rebocador': '#10b981',
    'Empurrador': '#06b6d4',
    'Balsa': '#64748b',
    'Pesca': '#22c55e'
  };

  function corDoTipo(tipo) {
    return CORES_TIPO[tipo] || '#94a3b8';
  }

  function popupHTML(pos) {
    const c = pos.cadastro || {};
    return `
      <div style="font-family:'Segoe UI',sans-serif; min-width:220px;">
        <div style="font-weight:700; font-size:13px; color:#0f172a; margin-bottom:4px;">
          ${window.Security?.escapeHTML?.(c.nome || 'MMSI ' + pos.mmsi) || c.nome || pos.mmsi}
        </div>
        <div style="font-size:11px; color:#475569; line-height:1.5;">
          <div><b>MMSI:</b> ${pos.mmsi}</div>
          ${c.imo ? `<div><b>IMO:</b> ${c.imo}</div>` : ''}
          <div><b>Tipo:</b> ${c.tipo || '-'}</div>
          ${c.operador ? `<div><b>Operador:</b> ${c.operador}</div>` : ''}
          ${c.comprimento_m ? `<div><b>Comprimento:</b> ${c.comprimento_m} m</div>` : ''}
          ${c.calado_m ? `<div><b>Calado:</b> ${c.calado_m} m</div>` : ''}
          <hr style="border:none; border-top:1px solid #e2e8f0; margin:6px 0;">
          <div><b>SOG:</b> ${pos.sog} nós</div>
          <div><b>COG:</b> ${pos.cog}°</div>
          <div><b>Rota:</b> ${pos.rota || '-'}</div>
          <div style="color:#64748b; font-size:10px; margin-top:4px;">
            ${new Date(pos.timestamp).toLocaleString('pt-BR')}
          </div>
        </div>
      </div>
    `;
  }

  const AISLayer = {
    _layer: null,
    _mapa: null,

    init(mapa) {
      this._mapa = mapa;
      this._layer = L.layerGroup();
      console.log('[AISLayer] pronto');
    },

    mostrar() {
      if (!this._layer || !this._mapa) return;
      if (!this._mapa.hasLayer(this._layer)) this._layer.addTo(this._mapa);
      this.renderizar(window.AISManager.getUltimasPosicoes());
    },

    esconder() {
      if (this._layer && this._mapa && this._mapa.hasLayer(this._layer)) {
        this._mapa.removeLayer(this._layer);
      }
    },

    renderizar(posicoes) {
      if (!this._layer) return;
      this._layer.clearLayers();

      posicoes.forEach(pos => {
        const cor = corDoTipo(pos.cadastro?.tipo);
        const raio = 4 + Math.min(4, (pos.sog || 0) / 4);

        const marker = L.circleMarker([pos.lat, pos.lon], {
          radius: raio,
          color: '#0f172a',
          weight: 1,
          fillColor: cor,
          fillOpacity: 0.85
        });

        marker.bindPopup(popupHTML(pos), { maxWidth: 320 });
        marker.bindTooltip(
          (pos.cadastro?.nome || 'MMSI ' + pos.mmsi) +
          ' · ' + pos.sog + ' kn',
          { direction: 'top', offset: [0, -4] }
        );

        // Clique → trilha
        marker.on('click', () => {
          if (window.AISLayer) window.AISLayer._destacarTrilha(pos.mmsi);
        });

        this._layer.addLayer(marker);
      });

      console.log('[AISLayer] renderizados', posicoes.length, 'pontos');
    },

    _destacarTrilha(mmsi) {
      const pontos = window.AISManager.getTrilha(mmsi);
      if (pontos.length < 2) return;

      // Remove trilha anterior
      if (this._trilhaLayer && this._mapa.hasLayer(this._trilhaLayer)) {
        this._mapa.removeLayer(this._trilhaLayer);
      }

      const coords = pontos.map(p => [p.lat, p.lon]);
      this._trilhaLayer = L.polyline(coords, {
        color: '#38bdf8',
        weight: 2,
        opacity: 0.7,
        dashArray: '4 4'
      }).addTo(this._mapa);

      this._mapa.fitBounds(this._trilhaLayer.getBounds(), { padding: [40, 40] });
    },

    limparTrilha() {
      if (this._trilhaLayer && this._mapa.hasLayer(this._trilhaLayer)) {
        this._mapa.removeLayer(this._trilhaLayer);
        this._trilhaLayer = null;
      }
    }
  };

  window.AISLayer = AISLayer;
})();