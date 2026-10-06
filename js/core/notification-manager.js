/* ============================================================
   WebGIS ANTAQ — Módulo: NotificationManager (M5)
   Escopo: notificações ricas (4 tipos, ações, histórico, empilhamento)
   Dependências: Security
   Expõe: window.NotificationManager
   ============================================================ */
(function () {
  'use strict';

  const NotificationManager = {
    _historico: [],
    _maxHistorico: 20,
    _duracaoPadrao: 5000,

    _icones: { sucesso: '✅', info: 'ℹ️', alerta: '⚠️', erro: '❌' },
    _titulosPadrao: { sucesso: 'Sucesso', info: 'Informação', alerta: 'Atenção', erro: 'Erro' },

    show: function (opts) {
      if (typeof opts === 'string') opts = { mensagem: opts };
      opts = opts || {};

      const tipo = ['sucesso', 'info', 'alerta', 'erro'].includes(opts.tipo) ? opts.tipo : 'info';
      const duracao = opts.duracao !== undefined ? opts.duracao : (tipo === 'erro' ? 0 : this._duracaoPadrao);

      const container = document.getElementById('notificacoes-container');
      if (!container) { console.log(`[Notif ${tipo}]`, opts.mensagem); return null; }

      const ativas = container.querySelectorAll('.notificacao');
      if (ativas.length >= 4) ativas[0].dispatchEvent(new CustomEvent('notif-fechar-forcado'));

      const id = 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      const el = document.createElement('div');
      el.className = `notificacao tipo-${tipo}`;
      el.id = id;

      const titulo = opts.titulo || this._titulosPadrao[tipo];
      const icone = this._icones[tipo];

      let acoesHTML = '';
      if (Array.isArray(opts.acoes) && opts.acoes.length) {
        acoesHTML = '<div class="notif-acoes">' +
          opts.acoes.map((a, idx) => `<button data-acao-idx="${idx}">${Security.escapeHTML(a.texto || 'Ação')}</button>`).join('') +
          '</div>';
      }

      const progressoHTML = duracao > 0
        ? `<div class="notif-progresso"><span style="animation-duration:${duracao}ms;"></span></div>`
        : '';

      el.innerHTML = `
        <span class="notif-icone">${icone}</span>
        <div class="notif-conteudo">
          <span class="notif-titulo">${Security.escapeHTML(titulo)}</span>
          <div class="notif-mensagem">${opts.mensagem || ''}</div>
          ${acoesHTML}
        </div>
        <button class="notif-fechar" title="Fechar">✕</button>
        ${progressoHTML}
      `;

      container.appendChild(el);

      this._adicionarAoHistorico({ tipo, titulo, mensagem: opts.mensagem, timestamp: new Date() });
      this._atualizarBotaoHistorico();

      let timeoutId = null;
      if (duracao > 0) timeoutId = setTimeout(() => this._fechar(id), duracao);

      el.querySelector('.notif-fechar').addEventListener('click', () => {
        if (timeoutId) clearTimeout(timeoutId);
        this._fechar(id);
      });

      el.addEventListener('notif-fechar-forcado', () => {
        if (timeoutId) clearTimeout(timeoutId);
        this._fechar(id);
      });

      if (Array.isArray(opts.acoes)) {
        el.querySelectorAll('.notif-acoes button').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.acaoIdx, 10);
            const acao = opts.acoes[idx];
            if (!acao) return;
            if (acao.fechar !== false) {
              if (timeoutId) clearTimeout(timeoutId);
              this._fechar(id);
            }
            try { if (typeof acao.fn === 'function') acao.fn(); }
            catch (e) { console.warn('[Notif] Erro na ação:', e); }
          });
        });
      }

      return id;
    },

    sucesso: function (msg, opts) { return this.show(Object.assign({ tipo: 'sucesso', mensagem: msg }, opts || {})); },
    info:    function (msg, opts) { return this.show(Object.assign({ tipo: 'info',    mensagem: msg }, opts || {})); },
    alerta:  function (msg, opts) { return this.show(Object.assign({ tipo: 'alerta',  mensagem: msg }, opts || {})); },
    erro:    function (msg, opts) { return this.show(Object.assign({ tipo: 'erro',    mensagem: msg, duracao: 0 }, opts || {})); },

    _fechar: function (id) {
      const el = document.getElementById(id);
      if (!el || el.classList.contains('saindo')) return;
      el.classList.add('saindo');
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 250);
    },

    fecharTodas: function () {
      const container = document.getElementById('notificacoes-container');
      if (!container) return;
      container.querySelectorAll('.notificacao').forEach(el =>
        el.dispatchEvent(new CustomEvent('notif-fechar-forcado'))
      );
    },

    _adicionarAoHistorico: function (item) {
      this._historico.unshift(item);
      if (this._historico.length > this._maxHistorico) {
        this._historico = this._historico.slice(0, this._maxHistorico);
      }
    },

    _atualizarBotaoHistorico: function () {
      const btn = document.getElementById('btn-historico-notif');
      if (!btn) return;
      if (this._historico.length > 0) btn.classList.add('visivel');
    },

    abrirHistorico: function () {
      const corpo = document.getElementById('historico-notif-corpo');
      if (!corpo) return;
      if (this._historico.length === 0) {
        corpo.innerHTML = '<div class="historico-vazio">Nenhuma notificação ainda.</div>';
      } else {
        corpo.innerHTML = this._historico.map(item => {
          const hora = item.timestamp.toLocaleTimeString('pt-BR');
          const data = item.timestamp.toLocaleDateString('pt-BR');
          return `
            <div class="historico-item tipo-${item.tipo}">
              <div class="hist-hora">${data} às ${hora}</div>
              <div class="hist-titulo">${Security.escapeHTML(item.titulo)}</div>
              <div>${item.mensagem || ''}</div>
            </div>
          `;
        }).join('');
      }
      document.getElementById('modal-historico-notif').classList.add('aberto');
    },

    fecharHistorico: function () {
      document.getElementById('modal-historico-notif').classList.remove('aberto');
    },

    limparHistorico: function () {
      this._historico = [];
      const btn = document.getElementById('btn-historico-notif');
      if (btn) btn.classList.remove('visivel');
      this.abrirHistorico();
    },

    configurarDuracaoPadrao: function (ms) {
      this._duracaoPadrao = Math.max(0, ms);
    }
  };

  window.NotificationManager = NotificationManager;
  console.info('[js] NotificationManager carregado');
})();