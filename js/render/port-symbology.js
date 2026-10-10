/* ============================================================
   PortSymbology v2 — Decora portos com âncoras SEM quebrar handlers
   Abordagem: overlay não-interativo sobre circleMarker invisível
   ============================================================ */
(function () {
  'use strict';

  function obterConfig(chave) {
    const k = String(chave || '').toUpperCase();
    const MAP = {
      ORGANIZADO: 'ORGANIZADO', PUBLICO: 'PUBLICO', TUP: 'TUP',
      ETC: 'ETC', IP4: 'IP4', OUTROS: 'OUTROS'
    };
    const TAMANHOS = {
      ORGANIZADO: { minZoom: 3,  size: 22 },
      PUBLICO:    { minZoom: 6,  size: 18 },
      TUP:        { minZoom: 7,  size: 16 },
      ETC:        { minZoom: 8,  size: 15 },
      IP4:        { minZoom: 9,  size: 13 },
      OUTROS:     { minZoom: 11, size: 10 }
    };
    let cor = '#64748b';
    try {
      const kpc = MAP[k] || k;
      const item = window.PortClassification?.tipos?.[kpc]
                || window.PortClassification?.tipos?.[k];
      if (item && item.cor) cor = item.cor;
    } catch (e) {}
    const t = TAMANHOS[k] || { minZoom: 10, size: 12 };
    return { minZoom: t.minZoom, size: t.size, cor };
  }

  function anchorSVG(cor, size) {
    return `
      <svg viewBox="0 0 24 24" width="${size}" height="${size}"
           xmlns="http://www.w3.org/2000/svg" style="display:block;">
        <circle cx="12" cy="12" r="11" fill="#ffffff"
                stroke="${cor}" stroke-width="1.5"/>
        <path d="M12 4a2 2 0 0 0-2 2c0 .9.6 1.7 1.5 1.9V9H9.5v1.5h2v7.3c-2.6-.3-4.7-2.3-5-4.8H8L5.5 10.5 3 13h1.5c.4 3.9 3.7 7 7.5 7s7.1-3.1 7.5-7H21L18.5 10.5 16 13h1.5c-.3 2.5-2.4 4.5-5 4.8v-7.3h2V9h-2V7.9c.9-.2 1.5-1 1.5-1.9a2 2 0 0 0-2-2z"
              fill="${cor}"/>
      </svg>`;
  }

  function criarIcone(cfg) {
    return L.divIcon({
      className: 'port-anchor-marker',
      html: anchorSVG(cfg.cor, cfg.size),
      iconSize: [cfg.size, cfg.size],
      iconAnchor: [cfg.size / 2, cfg.size / 2]
    });
  }

  const PortSymbology = {
    _mapa: null,
    _zoomListener: null,
    _aplicado: false,

    init(mapa) {
      if (!mapa) return;
      this._mapa = mapa;
      this._injetarCSS();

      this._zoomListener = () => this._aplicarVisibilidadePorZoom();
      mapa.on('zoomend', this._zoomListener);

      const self = this;
      let tentativas = 0;
      const check = setInterval(() => {
        tentativas++;
        if (window.SUBGRUPOS_PORTOS) {
          clearInterval(check);
          setTimeout(() => self.aplicar(), 400);
        }
        if (tentativas > 60) clearInterval(check);
      }, 500);

      mapa.on('layeradd', () => {
        if (this._aplicado) setTimeout(() => this._aplicarVisibilidadePorZoom(), 100);
      });

      console.info('[PortSymbology] v2 pronto');
    },

    /* ------------------------------------------------------------
       Aplica âncoras SOBRE os circleMarkers (que ficam invisíveis)
       ------------------------------------------------------------ */
    aplicar() {
      const subgrupos = window.SUBGRUPOS_PORTOS;
      if (!subgrupos) return;

      let total = 0;
      Object.keys(subgrupos).forEach(chave => {
        const fg = subgrupos[chave];
        if (!fg || !fg.getLayers) return;
        const cfg = obterConfig(chave);

        [...fg.getLayers()].forEach(m => {
          if (m._portSymAplicado) return;
          if (!(m instanceof L.CircleMarker)) return;

            // Torna invisível E remove a interatividade do SVG original
            try {
                m.setStyle({ opacity: 0, fillOpacity: 0, weight: 0 });
                // Aguarda o SVG ser renderizado e desativa pointer-events
                setTimeout(() => {
                    if (m._path) m._path.style.pointerEvents = 'none';
                    if (m._container) m._container.style.pointerEvents = 'none';
                }, 50);
            } catch (e) { }

          // 2. Âncora overlay não-interativa (cliques passam por baixo)
          const anchor = L.marker(m.getLatLng(), {
            icon: criarIcone(cfg),
            zIndexOffset: 150,
            interactive: true,
            keyboard: false
          });
          anchor._portMinZoom = cfg.minZoom;
          anchor._origem = m;
            // Copia os handlers de click (menos o interno do popup)
            if (m._events && m._events.click) {
                m._events.click.forEach(handler => {
                    const src = handler.fn.toString();
                    if (src.includes('this._popup&&this._map') || src.includes('this._popup && this._map')) return;
                    try { anchor.on('click', handler.fn, handler.ctx); } catch (e) { }
                });
            }

            // Rebind do popup no anchor
            if (m.getPopup && m.getPopup()) {
                anchor.bindPopup(m.getPopup().getContent(), {
                    maxWidth: m.getPopup().options?.maxWidth || 320,
                    className: m.getPopup().options?.className || ''
                });
            }
            if (m.getTooltip && m.getTooltip()) {
                anchor.bindTooltip(m.getTooltip().getContent(), {
                    direction: 'top', offset: [0, -12], className: 'port-anchor-tooltip'
                });
            }
          fg.addLayer(anchor);

          m._portSymAplicado = true;
          m._portSymAnchor = anchor;
          total++;
        });
      });

      this._aplicado = true;
      this._aplicarVisibilidadePorZoom();
      console.log('[PortSymbology] ' + total + ' portos decorados');
    },

    _aplicarVisibilidadePorZoom() {
      if (!this._mapa) return;
      const zoom = this._mapa.getZoom();

      const processar = (fg) => {
        if (!fg || !fg.getLayers) return;
        fg.getLayers().forEach(m => {
          if (!m._portSymAplicado || !m._portSymAnchor) return;
          const anchor = m._portSymAnchor;
          const el = anchor.getElement ? anchor.getElement() : null;
          if (!el) return;

          const minZ = anchor._portMinZoom || 10;
          if (zoom >= minZ) {
            el.style.display = '';
            el.style.opacity = '1';
          } else {
            el.style.display = 'none';
            el.style.opacity = '0';
          }
        });
      };

      if (window.SUBGRUPOS_PORTOS) {
        Object.values(window.SUBGRUPOS_PORTOS).forEach(processar);
      }
    },

    _injetarCSS() {
      if (document.getElementById('port-symbology-css')) return;
      const style = document.createElement('style');
      style.id = 'port-symbology-css';
      style.textContent = `
        .port-anchor-marker {
          background: transparent !important;
          border: none !important;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
        }
      `;
      document.head.appendChild(style);
    },

    refresh() { this._aplicado = false; this.aplicar(); }
  };

  window.PortSymbology = PortSymbology;

  const tentarInit = () => {
    if (window.mapa) PortSymbology.init(window.mapa);
    else setTimeout(tentarInit, 300);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tentarInit);
  } else {
    tentarInit();
  }
})();