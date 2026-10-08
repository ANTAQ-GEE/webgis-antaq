/* ============================================================
   WebGIS ANTAQ — Módulo: mapa + panes
   Escopo: inicialização do mapa Leaflet e hierarquia de panes
   Dependências: L (Leaflet global), DOM com <div id="mapa">
   Expõe: window.mapa
   ============================================================ */
(function () {
  'use strict';

  const mapa = L.map('mapa', {
    center: [-14.0, -52.0],
    zoom: 4,
    zoomControl: false,
    preferCanvas: true,
    // ✅ Otimizações de performance
    updateWhenIdle: true,        // Só redesenha quando parar de mover
    updateWhenZooming: false,    // Não atualiza durante zoom (só no fim)
    keepBuffer: 2,               // Mantém 2 tiles extras no buffer
    wheelDebounceTime: 40        // Debounce do scroll wheel
  });

  L.control.zoom({ position: 'bottomright' }).addTo(mapa);

  mapa.createPane('paneLimites');    mapa.getPane('paneLimites').style.zIndex = 400;
  mapa.createPane('paneRestricoes'); mapa.getPane('paneRestricoes').style.zIndex = 450;
  mapa.createPane('paneLinhas');     mapa.getPane('paneLinhas').style.zIndex = 500;
  mapa.createPane('panePontos');     mapa.getPane('panePontos').style.zIndex = 600;

  window.mapa = mapa;
  console.info('[js] mapa + panes criados');
})();