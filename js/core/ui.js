/* ============================================================
   WebGIS ANTAQ — Módulo: UI (utilitários de interface)
   Escopo: toast retrocompatível, toggles de painel, painel lateral
   Dependências: window.NotificationManager, window.Security
   Referências "lazy": window.Analytics
   Expõe: window.UI
   ============================================================ */
(function () {
  'use strict';

  const UI = {
    /**
     * Toast retrocompatível — roteia para o NotificationManager.
     * Mantém 100% de compatibilidade com todas as chamadas antigas.
     */
    toast: function (msg) {
      if (typeof window.NotificationManager === 'undefined') {
        const t = document.getElementById('toast');
        if (!t) return;
        t.innerHTML = msg;
        t.style.display = 'block';
        setTimeout(() => { t.style.display = 'none'; }, 3500);
        return;
      }

      const texto = String(msg);
      let tipo = 'info';

      if (/^(✅|✓|💾|📥|📋)/.test(texto.trim())) tipo = 'sucesso';
      else if (/^(⚠️|⚠|🟡)/.test(texto.trim())) tipo = 'alerta';
      else if (/^(❌|🔴)/.test(texto.trim())) tipo = 'erro';
      else if (/^(🔄|⏳|ℹ️)/.test(texto.trim())) tipo = 'info';
      else {
        if (/\bsucesso\b|\bexportad|\bcarregad|\bremovid|\badicionad|\bcopiad|\bimportad/i.test(texto)) tipo = 'sucesso';
        else if (/\bavis|\batenç|\bfaltam\b|\binválid/i.test(texto)) tipo = 'alerta';
        else if (/\berro\b|\berros\b(?!\s*\.)|^erro|\bfalh(ou|a)\b|\bimpossível\b/i.test(texto)) tipo = 'erro';
        else if (/\bprocessando\b|\bcarregando\b|\bsincronizando\b/i.test(texto)) tipo = 'info';
      }

      const msgLimpa = texto
        .replace(/^(✅|✓|💾|📥|📋|⚠️|❌|🔄|⏳|🧹|➕|➖|🗑️|🟡|🟢|✨)\s*/i, '')
        .trim();

      return window.NotificationManager.show({
        tipo: tipo,
        mensagem: msgLimpa || texto,
        duracao: tipo === 'erro' ? 0 : 4500
      });
    },

    toggleMenuAmbiente: function (e) {
      e.stopPropagation();
      document.getElementById('drop-ambiente').classList.toggle('aberto');
    },

    toggleGraficos: function () {
      const p = document.getElementById('painel-graficos');
      p.classList.toggle('aberto');
      if (p.classList.contains('aberto') && window.Analytics) {
        window.Analytics.atualizarSeletores();
        window.Analytics.trocarAba(window.Analytics.abaAtiva);
      }
    },

    alternarSecao: function (el) {
      el.nextElementSibling.classList.toggle('fechado');
    },

    fecharTabela: function () {
      document.getElementById('painel-tabela').classList.remove('aberto');
    },

    recolherPainelLateral: function () {
      const p = document.getElementById('painel-camadas-lateral');
      const b = document.getElementById('btn-flutuante-painel');
      if (p) p.classList.add('recolhido');
      if (b) b.style.display = 'flex';

      // ✅ Avisa o body pra ajustar a largura da tabela
      document.body.classList.add('painel-lateral-recolhido');

      // ✅ Redimensiona o mapa
      if (window.mapa && window.mapa.invalidateSize) {
        setTimeout(() => window.mapa.invalidateSize(), 300);
      }
    },

    abrirPainelLateral: function () {
      const p = document.getElementById('painel-camadas-lateral');
      const b = document.getElementById('btn-flutuante-painel');
      if (p) p.classList.remove('recolhido');
      if (b) b.style.display = 'none';

      // ✅ Remove a classe (tabela volta à largura normal)
      document.body.classList.remove('painel-lateral-recolhido');

      if (window.mapa && window.mapa.invalidateSize) {
        setTimeout(() => window.mapa.invalidateSize(), 300);
      }
    }
  };

  window.UI = UI;
  console.info('[js] UI carregado');
})();