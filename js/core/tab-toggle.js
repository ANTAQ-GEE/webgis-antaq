/* ============================================================
   WebGIS ANTAQ — Módulo: TabToggle (Legado / Compatibilidade)
   A gestão de abas foi unificada no TabManager (js/core/tab-manager.js).
   Este módulo garante retrocompatibilidade sem interceptação de eventos.
   ============================================================ */
(function () {
  'use strict';

  const TabToggle = {
    clicar: function (aba) {
      if (window.TabManager && typeof window.TabManager.trocar === 'function') {
        window.TabManager.trocar(aba);
      } else {
        console.warn('[TabToggle] TabManager ainda não inicializado para aba:', aba);
      }
    },
    init: function () {
      console.info('[TabToggle] Modo de compatibilidade unificado ativo');
    }
  };

  window.TabToggle = TabToggle;
})();
