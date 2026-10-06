/* ============================================================
   WebGIS ANTAQ — Módulo: LayerOrderManager
   Escopo: reordenação de camadas (↑ ↓, drag&drop, sincronização de z-index)
   Dependências: window.CONFIG_CAMADAS, window.CAMADAS_MAPA,
                 window.Styler, window.ActionHistory, window.mapa
   Referência "lazy": window.UI
   Expõe: window.LayerOrderManager
   ============================================================ */
(function () {
  'use strict';

  const LayerOrderManager = {
    mover: function (id, direcao, opcoes) {
      opcoes = opcoes || {};
      const item = document.getElementById(`item-camada-${id}`);
      if (!item) return;
      const grupoEl = item.parentElement;
      if (!grupoEl) return;

      const direcaoInversa = direcao === 'cima' ? 'baixo' : 'cima';
      const nome = CONFIG_CAMADAS[id]?.nome || id;

      if (direcao === 'cima') {
        const prev = item.previousElementSibling;
        if (prev && prev.classList.contains('item-camada')) {
          grupoEl.insertBefore(item, prev);
          this.sincronizarOrdemMapa(grupoEl);
          if (window.UI && UI.toast) UI.toast(`⬆️ "${nome}" movida para cima.`);

          if (!opcoes.semHistorico && window.ActionHistory) {
            const self = this;
            window.ActionHistory.registrar({
              tipo: 'ordem-camada',
              descricao: `Mover "${nome}" para cima`,
              undo: () => self.mover(id, direcaoInversa, { semHistorico: true }),
              redo: () => self.mover(id, direcao, { semHistorico: true })
            });
          }
        }
      } else if (direcao === 'baixo') {
        const next = item.nextElementSibling;
        if (next && next.classList.contains('item-camada')) {
          grupoEl.insertBefore(next, item);
          this.sincronizarOrdemMapa(grupoEl);
          if (window.UI && UI.toast) UI.toast(`⬇️ "${nome}" movida para baixo.`);

          if (!opcoes.semHistorico && window.ActionHistory) {
            const self = this;
            window.ActionHistory.registrar({
              tipo: 'ordem-camada',
              descricao: `Mover "${nome}" para baixo`,
              undo: () => self.mover(id, direcaoInversa, { semHistorico: true }),
              redo: () => self.mover(id, direcao, { semHistorico: true })
            });
          }
        }
      }
    },

    sincronizarOrdemMapa: function (grupoEl) {
      if (!grupoEl) return;
      const itens = Array.from(grupoEl.querySelectorAll('.item-camada'));
      for (let i = itens.length - 1; i >= 0; i--) {
        const layerId = itens[i].id.replace('item-camada-', '');
        const layer = CAMADAS_MAPA[layerId];
        if (layer && mapa.hasLayer(layer)) {
          if (layer.bringToFront) layer.bringToFront();
          if (layer.eachLayer) layer.eachLayer(sub => { if (sub.bringToFront) sub.bringToFront(); });
        }
      }
      if (window.Styler) window.Styler.atualizarLegenda();
    },

    obterElementoAposArrasto: function (container, y) {
      const elementos = [...container.querySelectorAll('.item-camada:not(.arrastando)')];
      return elementos.reduce((maisProximo, filho) => {
        const box = filho.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > maisProximo.offset) return { offset: offset, element: filho };
        return maisProximo;
      }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
  };

  window.LayerOrderManager = LayerOrderManager;
  console.info('[js] LayerOrderManager carregado');
})();