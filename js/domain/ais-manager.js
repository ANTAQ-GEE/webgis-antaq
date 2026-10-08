/* ============================================================
   M14 — AIS Manager
   Gerencia cadastro + posições + filtros + de-para
   ============================================================ */
(function () {
  'use strict';

  const AISManager = {
    _pronto: false,
    _carregando: false,
    _cadastro: new Map(),   // mmsi → dados
    _posicoes: [],          // todas as posições
    _ultimaPorMmsi: new Map(), // mmsi → última posição
    _tipos: {},             // mmsi → último tipo (para filtros rápidos)
    _filtros: {
      tipos: new Set(),     // vazio = todos
      sogMin: 0,
      sogMax: 100,
      rota: ''
    },
    _visivel: false,

    /* -------------------- Carregamento -------------------- */
    async carregar() {
      if (this._pronto || this._carregando) return;
      this._carregando = true;

      try {
        if (window.UI) window.UI.toast('📡 Carregando dados AIS...');

        const [cadastro, posicoes, manifest] = await Promise.all([
          window.AISLoader.carregarCadastro(),
          window.AISLoader.carregarPosicoes(),
          window.AISLoader.carregarManifest().catch(() => null)
        ]);

        this._cadastro = cadastro;
        this._posicoes = posicoes;
        this._manifest = manifest;

        // Índice: última posição de cada MMSI
        this._ultimaPorMmsi.clear();
        posicoes.forEach(p => {
          const atual = this._ultimaPorMmsi.get(p.mmsi);
          if (!atual || p.timestamp > atual.timestamp) {
            this._ultimaPorMmsi.set(p.mmsi, p);
          }
        });

        // Mapa de tipos para filtros rápidos
        this._tipos = {};
        this._cadastro.forEach((v, k) => { this._tipos[k] = v.tipo; });

        this._pronto = true;
        this._carregando = false;

        if (window.UI) {
          window.UI.toast(
            '✅ AIS carregado: ' + this._cadastro.size +
            ' embarcações · ' + this._posicoes.length + ' pontos'
          );
        }

        return true;
      } catch (err) {
        this._carregando = false;
        console.error('[AIS] erro:', err);
        if (window.UI) window.UI.toast('❌ Falha ao carregar AIS: ' + err.message);
        return false;
      }
    },

    /* -------------------- Consultas -------------------- */
    getStatus() {
      return {
        pronto: this._pronto,
        embarcacoes: this._cadastro.size,
        pontos: this._posicoes.length,
        visivel: this._visivel
      };
    },

    /** De-para: retorna dados do cadastro para um MMSI. */
    getCadastro(mmsi) {
      return this._cadastro.get(mmsi) || null;
    },

    /** Retorna a última posição de cada embarcação (filtrada). */
    getUltimasPosicoes() {
      const out = [];
      this._ultimaPorMmsi.forEach(pos => {
        if (this._passaFiltro(pos)) {
          const cad = this._cadastro.get(pos.mmsi) || {};
          out.push({ ...pos, cadastro: cad });
        }
      });
      return out;
    },

    /** Retorna a trilha completa de um MMSI. */
    getTrilha(mmsi) {
      return this._posicoes
        .filter(p => p.mmsi === mmsi)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    },

    /** Lista de rotas existentes (para filtro). */
    getRotas() {
      const set = new Set();
      this._posicoes.forEach(p => { if (p.rota) set.add(p.rota); });
      return Array.from(set).sort();
    },

    /* -------------------- Filtros -------------------- */
    _passaFiltro(pos) {
      const f = this._filtros;
      if (f.tipos.size > 0) {
        const cad = this._cadastro.get(pos.mmsi);
        if (!cad || !f.tipos.has(cad.tipo)) return false;
      }
      if (pos.sog < f.sogMin || pos.sog > f.sogMax) return false;
      if (f.rota && pos.rota !== f.rota) return false;
      return true;
    },

    setFiltroTipo(tipo, ativo) {
      if (ativo) this._filtros.tipos.add(tipo);
      else this._filtros.tipos.delete(tipo);
      this._renderizar();
    },

    setFiltroSog(min, max) {
      this._filtros.sogMin = Math.max(0, Number(min) || 0);
      this._filtros.sogMax = Math.min(100, Number(max) || 100);
      this._renderizar();
    },

    setFiltroRota(rota) {
      this._filtros.rota = rota || '';
      this._renderizar();
    },

    limparFiltros() {
      this._filtros = { tipos: new Set(), sogMin: 0, sogMax: 100, rota: '' };
      this._renderizar();
    },
/* ============================================================
   M14 — Clique na aba AIS: alterna liga/desliga
   ============================================================ */
clicarAba: function () {
  const abaAtiva = document.querySelector('.aba-btn.ativa, .aba-btn.ativo')?.dataset?.aba;
  const jaEstouNaAba = (abaAtiva === 'ais');

  // Caso 1: já estou na aba AIS e ela está visível → DESLIGA
  if (jaEstouNaAba && this._visivel) {
    this._visivel = false;
    if (window.AISLayer) window.AISLayer.esconder();
    const chk = document.getElementById('chk-ais');
    if (chk) chk.checked = false;
    const cnt = document.getElementById('cnt-ais');
    if (cnt) cnt.innerText = '';
    if (window.UI) window.UI.toast('🚢 AIS desativado');
    return;
  }

  // Caso 2: liga (troca pra aba + mostra camada)
  if (window.TabManager && !jaEstouNaAba) {
    window.TabManager.trocar('ais');
  }

  (async () => {
    if (!this._pronto) {
      const ok = await this.carregar();
      if (!ok) return;
    }
    this._visivel = true;
    if (window.AISLayer) window.AISLayer.mostrar();
    const chk = document.getElementById('chk-ais');
    if (chk) chk.checked = true;
    const cnt = document.getElementById('cnt-ais');
    if (cnt) cnt.innerText = '(' + this.getUltimasPosicoes().length + ')';
    if (window.UI) window.UI.toast('🚢 AIS ativado');
  })();
},
    /* -------------------- Visibilidade -------------------- */
    async toggle() {
      if (!this._pronto) {
        const ok = await this.carregar();
        if (!ok) return;
      }
      this._visivel = !this._visivel;
      if (window.AISLayer) {
        this._visivel ? window.AISLayer.mostrar() : window.AISLayer.esconder();
      }
      if (window.UI) {
        window.UI.toast(this._visivel ? '🚢 AIS visível' : '🚢 AIS oculto');
      }
    },

    /* -------------------- Renderização -------------------- */
    _renderizar() {
      if (!this._visivel || !window.AISLayer) return;
      window.AISLayer.renderizar(this.getUltimasPosicoes());
    }
  };

  window.AISManager = AISManager;
})();