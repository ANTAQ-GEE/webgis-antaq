/* ============================================================
   WebGIS ANTAQ — Módulo: BasemapManager
   Escopo: alternância entre satélite (Esri) e escuro (Esri Dark)
   Dependências: L, window.mapa, window.ActionHistory
   Expõe: window.BasemapManager
   ============================================================ */
(function () {
  'use strict';

  const mapa = window.mapa;
  if (!mapa) {
    console.error('[js] BasemapManager: window.mapa não existe. Verifique a ordem dos <script src>.');
    return;
  }

  const BasemapManager = {
    satelite: L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    ).addTo(mapa),
    rotulos: L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { pane: 'overlayPane' }
    ).addTo(mapa),
    escuro: L.layerGroup([
      L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'),
      L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}')
    ]),

    trocar: function (tipo, opcoes) {
      opcoes = opcoes || {};
      const atual = window._basemapAtual || 'satelite';

      if (tipo === 'satelite') {
        mapa.removeLayer(this.escuro);
        this.satelite.addTo(mapa);
        this.rotulos.addTo(mapa);
      } else {
        mapa.removeLayer(this.satelite);
        mapa.removeLayer(this.rotulos);
        this.escuro.addTo(mapa);
      }
      window._basemapAtual = tipo;

      // Sincroniza o radio no painel lateral
      const radio = document.querySelector(`input[name="basemap"][value="${tipo}"]`);
      if (radio) radio.checked = true;

      // M8: registra (só se ActionHistory existir e não for undo/redo)
      if (!opcoes.semHistorico && atual !== tipo && window.ActionHistory) {
        const self = this;
        window.ActionHistory.registrar({
          tipo: 'basemap',
          descricao: `Trocar mapa base para ${tipo === 'satelite' ? 'Satélite' : 'Escuro'}`,
          undo: () => self.trocar(atual, { semHistorico: true }),
          redo: () => self.trocar(tipo, { semHistorico: true })
        });
      }
    }
  };

  window.BasemapManager = BasemapManager;
  console.info('[js] BasemapManager carregado');
})();