/* ============================================================
   WebGIS ANTAQ — Módulo: ActionHistory (M8 — Undo/Redo)
   Escopo: fila circular de 20 ações com undo/redo
   Dependências: Security (para escapeHTML nas notificações)
   Expõe: window.ActionHistory
   NOTA: este módulo é carregado antes de UI existir no escopo global.
         Por isso usa this._toast() (fallback seguro) em vez de UI.toast().
   ============================================================ */
(function () {
  'use strict';

  const ActionHistory = {
    _historico: [],
    _redoStack: [],
    _maxAcoes: 20,
    _aplicando: false,

    /* Toast seguro: usa UI se já existir, senão cai no console */
    _toast: function (msg) {
      if (window.UI && typeof window.UI.toast === 'function') {
        window.UI.toast(msg);
      } else {
        console.log('[ActionHistory]', msg.replace(/<[^>]+>/g, ''));
      }
    },

    registrar: function (acao) {
      if (this._aplicando) return;
      if (!acao || typeof acao.undo !== 'function' || typeof acao.redo !== 'function') return;

      this._redoStack = [];
      this._historico.push({
        tipo: acao.tipo || 'acao',
        descricao: acao.descricao || 'Ação',
        undo: acao.undo,
        redo: acao.redo,
        timestamp: Date.now()
      });

      if (this._historico.length > this._maxAcoes) this._historico.shift();
      this._atualizarUI();
    },

    undo: function () {
      if (!this._historico.length) { this._toast('ℹ️ Nada para desfazer.'); return; }

      const acao = this._historico.pop();
      this._aplicando = true;
      try {
        acao.undo();
        this._redoStack.push(acao);

        const btn = document.getElementById('btn-undo');
        if (btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 400); }

        this._toast(`↶ Desfeito: <strong>${Security.escapeHTML(acao.descricao)}</strong>`);
      } catch (e) {
        console.error('[M8] Erro ao desfazer:', e);
        this._toast(`⚠️ Erro ao desfazer: ${e.message}`);
      } finally {
        this._aplicando = false;
        this._atualizarUI();
      }
    },

    redo: function () {
      if (!this._redoStack.length) { this._toast('ℹ️ Nada para refazer.'); return; }

      const acao = this._redoStack.pop();
      this._aplicando = true;
      try {
        acao.redo();
        this._historico.push(acao);

        const btn = document.getElementById('btn-redo');
        if (btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 400); }

        this._toast(`↷ Refeito: <strong>${Security.escapeHTML(acao.descricao)}</strong>`);
      } catch (e) {
        console.error('[M8] Erro ao refazer:', e);
        this._toast(`⚠️ Erro ao refazer: ${e.message}`);
      } finally {
        this._aplicando = false;
        this._atualizarUI();
      }
    },

    limpar: function () {
      this._historico = [];
      this._redoStack = [];
      this._atualizarUI();
    },

    podeUndo: function () { return this._historico.length > 0; },
    podeRedo: function () { return this._redoStack.length > 0; },
    estaAplicando: function () { return this._aplicando; },

    _atualizarUI: function () {
      const btnUndo = document.getElementById('btn-undo');
      const btnRedo = document.getElementById('btn-redo');
      const badgeUndo = document.getElementById('badge-undo-count');
      const badgeRedo = document.getElementById('badge-redo-count');

      if (btnUndo) btnUndo.disabled = !this.podeUndo();
      if (btnRedo) btnRedo.disabled = !this.podeRedo();

      if (badgeUndo) {
        if (this._historico.length > 0) {
          badgeUndo.textContent = this._historico.length;
          badgeUndo.classList.add('visivel');
        } else {
          badgeUndo.classList.remove('visivel');
        }
      }
      if (badgeRedo) {
        if (this._redoStack.length > 0) {
          badgeRedo.textContent = this._redoStack.length;
          badgeRedo.classList.add('visivel');
        } else {
          badgeRedo.classList.remove('visivel');
        }
      }
    },

    obterUltimaDescricao: function () {
      if (!this._historico.length) return null;
      return this._historico[this._historico.length - 1].descricao;
    },

    _configurarAtalhos: function () {
      document.addEventListener('keydown', (ev) => {
        const alvo = ev.target;
        if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT')) return;

        if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && ev.key.toLowerCase() === 'z') {
          ev.preventDefault();
          this.undo();
          return;
        }
        if (((ev.ctrlKey || ev.metaKey) && ev.shiftKey && ev.key.toLowerCase() === 'z') ||
            ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && ev.key.toLowerCase() === 'y')) {
          ev.preventDefault();
          this.redo();
          return;
        }
      });
    },

    init: function () {
      this._configurarAtalhos();
      this._atualizarUI();
      console.info('[M8] Undo/Redo pronto. Ctrl+Z (undo), Ctrl+Shift+Z (redo).');
    }
  };

  window.ActionHistory = ActionHistory;

  // Auto-init ao carregar (o DOM dos botões já existe — scripts no fim do <body>)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ActionHistory.init());
  } else {
    ActionHistory.init();
  }

  console.info('[js] ActionHistory carregado');
})();