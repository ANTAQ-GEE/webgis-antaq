/* ============================================================
   WebGIS ANTAQ — Módulo: FetchManager (R3)
   Escopo: fetch com retry, backoff exponencial e timeout
   Dependências: nenhuma
   Expõe: window.FetchManager
   ============================================================ */
(function () {
  'use strict';

  const FetchManager = {
    _config: {
      tentativas: 3,
      timeoutMs: 15000,
      backoffMs: [500, 1500, 3500],
      retryOn: [408, 429, 500, 502, 503, 504],
      naoRetryEm: [400, 401, 403, 404, 410, 451]
    },

    fetchComRetry: async function (url, opts) {
      opts = opts || {};
      const cfg = Object.assign({}, this._config, opts);
      const onTentativa = typeof opts.onTentativa === 'function' ? opts.onTentativa : () => {};
      let ultimoErro = null;

      for (let i = 0; i < cfg.tentativas; i++) {
        const ac = new AbortController();
        const tid = setTimeout(() => ac.abort(), cfg.timeoutMs);

        try {
          onTentativa(i + 1, cfg.tentativas);

          const res = await fetch(url, { signal: ac.signal, cache: 'no-store' });
          clearTimeout(tid);

          if (cfg.naoRetryEm.includes(res.status)) return res;
          if (res.ok) return res;

          ultimoErro = new Error(`HTTP ${res.status}`);
        } catch (err) {
          clearTimeout(tid);
          if (err.name === 'AbortError') {
            ultimoErro = new Error(`Timeout (${cfg.timeoutMs}ms)`);
          } else {
            ultimoErro = err;
          }
        }

        if (i < cfg.tentativas - 1) {
          const espera = cfg.backoffMs[i] || 2000;
          await this._esperar(espera);
        }
      }

      throw ultimoErro || new Error('Falha após todas as tentativas');
    },

    fetchJSON: async function (url, opts) {
      const res = await this.fetchComRetry(url, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },

    _esperar: function (ms) {
      return new Promise(res => setTimeout(res, ms));
    }
  };

  window.FetchManager = FetchManager;
  console.info('[js] FetchManager carregado');
})();