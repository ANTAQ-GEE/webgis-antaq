/* ============================================================
   WebGIS ANTAQ — Módulo: MapExtras (M4)
   Escopo: minimap, escala gráfica, coordenadas do mouse
   Dependências: window.UI, window.mapa
   Expõe: window.MapExtras
   ============================================================ */
(function () {
  'use strict';

  const MapExtras = {
    minimap: null,
    scale: null,
    coords: null,

    init: function () {
      try { this._criarMinimap(); } catch (e) { console.warn('[M4] Falha no minimap:', e); }
      try { this._criarEscala(); } catch (e) { console.warn('[M4] Falha na escala:', e); }
      try { this._criarCoordenadas(); } catch (e) { console.warn('[M4] Falha nas coordenadas:', e); }
    },

    _criarMinimap: function () {
      if (typeof L.Control.MiniMap !== 'function') {
        console.warn('[M4] Plugin MiniMap não carregado.');
        return;
      }

      const baseMinimap = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
          subdomains: 'abc',
          maxZoom: 19,
          minZoom: 0,
          errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        }
      );

      this.minimap = new L.Control.MiniMap(baseMinimap, {
        position: 'topleft',
        width: 180,
        height: 180,
        collapsedWidth: 24,
        collapsedHeight: 24,
        zoomLevelOffset: -3,
        zoomAnimation: true,
        toggleDisplay: true,
        minimized: false,
        mapOptions: {
          attributionControl: false,
          zoomControl: false,
          dragging: false,
          touchZoom: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false
        },
        aimingRectOptions: {
          color: '#f59e0b',
          weight: 2.5,
          fillColor: '#f59e0b',
          fillOpacity: 0.2
        },
        shadowRectOptions: {
          color: '#0a2540',
          weight: 1,
          opacity: 0.7,
          fillOpacity: 0
        }
      });

      mapa.addControl(this.minimap);
      console.info('[M4] Minimap ativo.');
    },

    _criarEscala: function () {
      this.scale = L.control.scale({
        position: 'bottomleft',
        metric: true,
        imperial: false,
        maxWidth: 160,
        updateWhenIdle: false
      });
      this.scale.addTo(mapa);
      console.info('[M4] Escala gráfica ativa.');
    },

    _criarCoordenadas: function () {
      const CoordControl = L.Control.extend({
        options: { position: 'bottomright' },
        onAdd: function () {
          const div = L.DomUtil.create('div', 'leaflet-control-coords');
          div.id = 'leaflet-coords-control';
          div.innerHTML = `
            <span class="coords-part">
              <span class="coords-rotulo">Lat</span>
              <span class="coords-valor" id="coord-lat">—</span>
            </span>
            <span class="coords-sep">|</span>
            <span class="coords-part">
              <span class="coords-rotulo">Lng</span>
              <span class="coords-valor" id="coord-lng">—</span>
            </span>
            <button class="btn-copiar-coords" id="coord-btn-copiar" title="Copiar coordenadas">📋</button>
          `;

          L.DomEvent.disableClickPropagation(div);

          setTimeout(() => {
            const btn = document.getElementById('coord-btn-copiar');
            if (btn) {
              btn.addEventListener('click', () => {
                const lat = document.getElementById('coord-lat')?.textContent || '';
                const lng = document.getElementById('coord-lng')?.textContent || '';
                if (lat === '—' || lng === '—') {
                  if (window.UI) window.UI.toast('Passe o mouse sobre o mapa primeiro.');
                  return;
                }
                const texto = `${lat}, ${lng}`;
                navigator.clipboard.writeText(texto).then(() => {
                  if (window.UI) window.UI.toast(`📋 Copiado: ${texto}`);
                }).catch(() => {
                  if (window.UI) window.UI.toast('⚠️ Não foi possível copiar.');
                });
              });
            }
          }, 0);

          return div;
        }
      });

      this.coords = new CoordControl();
      this.coords.addTo(mapa);

      const latEl = () => document.getElementById('coord-lat');
      const lngEl = () => document.getElementById('coord-lng');

      mapa.on('mousemove', (e) => {
        const la = latEl(); const lo = lngEl();
        if (la) la.textContent = e.latlng.lat.toFixed(5) + '°';
        if (lo) lo.textContent = e.latlng.lng.toFixed(5) + '°';
      });

      mapa.on('mouseout', () => {
        const la = latEl(); const lo = lngEl();
        if (la) la.textContent = '—';
        if (lo) lo.textContent = '—';
      });

      console.info('[M4] Coordenadas do mouse ativas.');
    },

    obterCentro: function () {
      const c = mapa.getCenter();
      return { lat: c.lat, lng: c.lng };
    }
  };

  window.MapExtras = MapExtras;
  console.info('[js] MapExtras carregado');
})();