/* ============================================================
   WebGIS ANTAQ — Módulo: PortSymbology (Nativo & Não-Destrutivo)
   Escopo: Gestão de marcadores visíveis e interativos nos portos
   ============================================================ */
(function () {
  'use strict';

  const PortSymbology = {
    _mapa: null,
    _aplicado: true,

    init(mapa) {
      this._mapa = mapa;
      this._injetarCSS();
      console.info('[PortSymbology] Simbologia nativa com Master Cluster inicializada.');
    },

    aplicar() {
      this._aplicado = true;
    },

    _injetarCSS() {
      if (document.getElementById('port-symbology-css')) return;
      const style = document.createElement('style');
      style.id = 'port-symbology-css';
      style.textContent = `
        .port-anchor-marker {
          background: transparent !important;
          border: none !important;
          cursor: pointer !important;
          transition: transform 0.15s ease;
        }
        .port-anchor-marker:hover {
          transform: scale(1.25);
          z-index: 9999 !important;
        }
      `;
      document.head.appendChild(style);
    },

    refresh() { this.aplicar(); }
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
