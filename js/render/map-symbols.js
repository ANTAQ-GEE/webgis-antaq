/* ============================================================
   WebGIS ANTAQ — Módulo: MapSymbols
   Escopo: ícones SVG institucionais para markers no mapa
           (âncora, ponte, barco)
   Dependências: nenhuma
   Expõe: window.MapSymbols
   ============================================================ */
(function () {
  'use strict';

  /**
   * Gera um L.divIcon com SVG inline.
   * @param {string} svgInterno - conteúdo SVG (paths)
   * @param {string} cor - cor CSS (hex)
   * @param {number} tamanho - tamanho em px
   * @param {string} [extraClass] - classe CSS adicional
   */
  function criarDivIcon(svgInterno, cor, tamanho, extraClass) {
    const tam = tamanho || 28;
    const strokeColor = '#ffffff';
    const strokeWidth = 2;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
           width="${tam}" height="${tam}" fill="none"
           stroke="${strokeColor}" stroke-width="${strokeWidth}"
           stroke-linecap="round" stroke-linejoin="round"
           style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));">
        <circle cx="12" cy="12" r="10" fill="${cor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" opacity="0.95"/>
        <g transform="scale(0.55) translate(10, 10)">
          ${svgInterno}
        </g>
      </svg>
    `;

    return L.divIcon({
      className: 'marker-symbol ' + (extraClass || ''),
      html: svg,
      iconSize: [tam, tam],
      iconAnchor: [tam / 2, tam / 2],
      popupAnchor: [0, -tam / 2]
    });
  }

  /* ---------- SVGs base (desenhados no viewBox 0 0 24 24) ---------- */

  // ⚓ Âncora — círculo superior + haste + cruz + base curva
  const SVG_ANCORA = `
    <circle cx="12" cy="4" r="2.8"/>
    <line x1="12" y1="6.8" x2="12" y2="21"/>
    <line x1="6.5" y1="11" x2="17.5" y2="11"/>
    <path d="M4 14 Q4 21 12 21 Q20 21 20 14"/>
  `;

  // 🌉 Ponte — vão de arco + tabuleiro
  const SVG_PONTE = `
    <path d="M2 14 Q12 4 22 14"/>
    <line x1="2" y1="14" x2="22" y2="14"/>
    <line x1="6" y1="14" x2="6" y2="9"/>
    <line x1="18" y1="14" x2="18" y2="9"/>
    <line x1="12" y1="14" x2="12" y2="6"/>
  `;

  // 🚢 Barco — vela + casco
  const SVG_BARCO = `
    <path d="M12 2 L12 13 L20 13 Z"/>
    <line x1="12" y1="2" x2="12" y2="13"/>
    <path d="M3 15 L21 15 L19 21 L5 21 Z"/>
  `;

  const MapSymbols = {
    /**
     * Marcador de âncora (Instalações Portuárias).
     * @param {string} cor — cor do regime (hex)
     * @param {number} [tamanho=28]
     */
    ancora: function (cor, tamanho) {
      return criarDivIcon(SVG_ANCORA, cor || '#10b981', tamanho || 28, 'marker-ancora');
    },

    /**
     * Marcador de ponte (Travessias).
     */
    ponte: function (cor, tamanho) {
      return criarDivIcon(SVG_PONTE, cor || '#f59e0b', tamanho || 26, 'marker-ponte');
    },

    /**
     * Marcador de barco (Embarcações/AIS).
     */
    barco: function (cor, tamanho) {
      return criarDivIcon(SVG_BARCO, cor || '#38bdf8', tamanho || 26, 'marker-barco');
    },

    /**
     * Utilitário: retorna o HTML do SVG pra usar em legendas.
     */
    html: function (tipo, cor, tamanho) {
      tamanho = tamanho || 18;
      const svgs = { ancora: SVG_ANCORA, ponte: SVG_PONTE, barco: SVG_BARCO };
      const svgInterno = svgs[tipo];
      if (!svgInterno) return '';

      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
             width="${tamanho}" height="${tamanho}" fill="none"
             stroke="#ffffff" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle;">
          <circle cx="12" cy="12" r="10" fill="${cor}" opacity="0.95"/>
          <g transform="scale(0.55) translate(10, 10)">
            ${svgInterno}
          </g>
        </svg>
      `;
    },
    /**
     * HTML do cluster com ícone temático + número.
     * @param {string} tipo — 'ancora' | 'ponte' | 'barco'
     * @param {string} cor — cor hex
     * @param {number} count — número no cluster
     * @param {number} dim — diâmetro em px
     */
    clusterHtml: function (tipo, cor, count, dim) {
      dim = dim || 40;
      const svgs = { ancora: SVG_ANCORA, ponte: SVG_PONTE, barco: SVG_BARCO };
      const svgInterno = svgs[tipo] || SVG_ANCORA;
      const iconSize = Math.round(dim * 0.4);

      return `
        <div style="
          position:relative;
          background:${cor};
          width:${dim}px; height:${dim}px;
          border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          border:3px solid rgba(255,255,255,0.92);
          box-shadow:0 2px 10px rgba(0,0,0,0.45);
          font-family:'Segoe UI', sans-serif;
          color:#ffffff;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}"
               viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2"
               stroke-linecap="round" stroke-linejoin="round"
               style="margin-right:2px; opacity:0.95; flex-shrink:0;">
            ${svgInterno}
          </svg>
          <span style="font-size:${Math.round(dim * 0.35)}px; font-weight:800; letter-spacing:-0.5px;">${count}</span>
        </div>
      `;
    },    
  };

  window.MapSymbols = MapSymbols;
  console.info('[js] MapSymbols carregado (âncora, ponte, barco)');
})();