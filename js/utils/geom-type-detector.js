/* ============================================================
   WebGIS ANTAQ — Módulo: GeomTypeDetector
   Escopo: detectar tipo geométrico predominante de um GeoJSON
   Dependências: nenhuma
   Expõe: window.GeomTypeDetector
   ============================================================ */
(function () {
  'use strict';

  const GeomTypeDetector = {
    detectar: function (geojson) {
      if (!geojson || !geojson.features || !geojson.features.length) return 'ponto';
      let pontos = 0, linhas = 0, poligonos = 0;
      for (const f of geojson.features) {
        const t = (f.geometry && f.geometry.type) || '';
        if (t.indexOf('Point') !== -1) pontos++;
        else if (t.indexOf('LineString') !== -1) linhas++;
        else if (t.indexOf('Polygon') !== -1) poligonos++;
      }
      if (poligonos > 0 && poligonos >= pontos && poligonos >= linhas) return 'poligono';
      if (linhas > 0 && linhas >= pontos) return 'linha';
      return 'ponto';
    }
  };

  window.GeomTypeDetector = GeomTypeDetector;
  console.info('[js] GeomTypeDetector carregado');
})();