/* ============================================================
   M15+M16 — AIS Manager
   Cadastro + posições + programação + viagens + alertas + cruzamento VEN
   ============================================================ */
(function () {
  'use strict';

  const AISManager = {
    _pronto: false,
    _carregando: false,
    _cadastro: new Map(),
    _posicoes: [],
    _programacao: [],
    _viagens: [],
    _alertas: [],
    _cruzamento: [],
    _cruzIndex: new Map(),
    _ultimaPorMmsi: new Map(),
    _tipos: {},
    _filtros: {
      tipos: new Set(),
      sogMin: 0,
      sogMax: 100,
      rota: ''
    },
    _visivel: false,
    _modoTrilha: false,

    /* -------------------- Carregamento -------------------- */
    async carregar() {
      if (this._pronto || this._carregando) return;
      this._carregando = true;

      try {
        if (window.UI) window.UI.toast('📡 Carregando dados AIS...');

        const [cadastro, posicoes, programacao, viagens, alertas, cruzamento, manifest] = await Promise.all([
          window.AISLoader.carregarCadastro(),
          window.AISLoader.carregarPosicoes(),
          window.AISLoader.carregarProgramacao().catch(() => []),
          window.AISLoader.carregarViagens().catch(() => []),
          window.AISLoader.carregarAlertas().catch(() => []),
          window.AISLoader.carregarCruzamento().catch(() => []),
          window.AISLoader.carregarManifest().catch(() => null)
        ]);

        this._cadastro = cadastro;
        this._posicoes = posicoes;
        this._programacao = programacao;
        this._viagens = viagens;
        this._alertas = alertas;
        this._cruzamento = cruzamento;
        this._manifest = manifest;

        // Index do cruzamento: chave = mmsi|timestamp
        this._cruzIndex = new Map();
        cruzamento.forEach(c => {
          const key = c.mmsi + '|' + c.timestamp;
          this._cruzIndex.set(key, c);
        });

        // Enriquece as posições com dados do cruzamento
        this._posicoes.forEach(p => {
          const key = p.mmsi + '|' + p.timestamp;
          const c = this._cruzIndex.get(key);
          if (c) {
            p.trecho_ven = c.trecho_ven;
            p.dist_ven_km = c.dist_ven_km;
            p.classificacao = c.classificacao;
          }
        });

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
            '✅ AIS: ' + this._cadastro.size + ' barcos · ' +
            this._posicoes.length + ' pts · ' +
            this._viagens.length + ' legs · ' +
            this._alertas.length + ' alertas'
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

    /* -------------------- Status geral -------------------- */
    getStatus() {
      return {
        pronto: this._pronto,
        embarcacoes: this._cadastro.size,
        pontos: this._posicoes.length,
        viagens: this._viagens.length,
        alertas: this._alertas.length,
        cruzamento: this._cruzamento.length,
        visivel: this._visivel
      };
    },

    /* -------------------- Cadastro -------------------- */
    getCadastro(mmsi) { return this._cadastro.get(mmsi) || null; },

    /* -------------------- Posições -------------------- */
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

    getTodasPosicoes() { return this._posicoes; },

    getTrilha(mmsi) {
      return this._posicoes
        .filter(p => p.mmsi === mmsi)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    },

    getRotas() {
      const set = new Set();
      this._posicoes.forEach(p => { if (p.rota) set.add(p.rota); });
      return Array.from(set).sort();
    },

    /* -------------------- Viagens / Programação / Alertas -------------------- */
    getViagensPorMmsi(mmsi) {
      return this._viagens
        .filter(v => v.mmsi === mmsi)
        .sort((a, b) => a.ordem - b.ordem);
    },
    getProgramacaoPorMmsi(mmsi) {
      return this._programacao
        .filter(p => p.mmsi === mmsi)
        .sort((a, b) => a.ordem - b.ordem);
    },
    getAlertasPorMmsi(mmsi) {
      return this._alertas
        .filter(a => a.mmsi === mmsi)
        .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    },
    getTodosAlertas() {
      return this._alertas.slice().sort((a, b) => {
        const peso = { critico: 0, atencao: 1, info: 2 };
        const pA = peso[a.severidade] ?? 3;
        const pB = peso[b.severidade] ?? 3;
        if (pA !== pB) return pA - pB;
        return (b.timestamp || '').localeCompare(a.timestamp || '');
      });
    },

    /* ============================================================
       M16 — Cruzamento VEN
       ============================================================ */
    getCorredorStats(mmsi) {
      const pos = this._posicoes.filter(p => p.mmsi === mmsi);
      let dentro = 0, atencao = 0, fora = 0;
      pos.forEach(p => {
        if (p.classificacao === 'dentro') dentro++;
        else if (p.classificacao === 'atencao') atencao++;
        else if (p.classificacao === 'fora') fora++;
      });
      const total = pos.length || 1;
      return {
        total: pos.length,
        dentro, atencao, fora,
        pct_dentro: Math.round((dentro / total) * 100),
        pct_atencao: Math.round((atencao / total) * 100),
        pct_fora: Math.round((fora / total) * 100)
      };
    },

    /** Retorna os trechos VEN que a embarcação usou. */
    getTrechosUsados(mmsi) {
      const set = new Map();
      this._posicoes
        .filter(p => p.mmsi === mmsi && p.trecho_ven)
        .forEach(p => {
          const k = p.trecho_ven;
          set.set(k, (set.get(k) || 0) + 1);
        });
      return [...set.entries()]
        .map(([trecho, pontos]) => ({ trecho, pontos }))
        .sort((a, b) => b.pontos - a.pontos);
    },

    /** Situação atual no corredor (última posição). */
    getCorredorAtual(mmsi) {
      const ultima = this._ultimaPorMmsi.get(mmsi);
      if (!ultima) return null;
      return {
        classificacao: ultima.classificacao || 'dentro',
        trecho_ven: ultima.trecho_ven || '',
        dist_ven_km: ultima.dist_ven_km || 0
      };
    },

    /* -------------------- Status por embarcação -------------------- */
    getStatusPorEmbarcacao() {
      const out = new Map();
      this._cadastro.forEach((cad, mmsi) => {
        const viagens = this.getViagensPorMmsi(mmsi);
        const prog = this.getProgramacaoPorMmsi(mmsi);
        const ultimaViagem = viagens[viagens.length - 1];
        const proxima = prog[viagens.length];

        const atrasoAtual = ultimaViagem?.atraso_h ?? 0;
        const status = ultimaViagem?.status ?? 'no_prazo';

        const corredor = this.getCorredorStats(mmsi);
        const corredorAtual = this.getCorredorAtual(mmsi);

        out.set(mmsi, {
          mmsi,
          nome: cad.nome,
          tipo: cad.tipo,
          perfil: cad.perfil || '',
          status,
          atraso_h: atrasoAtual,
          ultimaViagem,
          proximaParada: proxima ? {
            porto: proxima.porto,
            eta_programada: proxima.eta_programada,
          } : null,
          totalViagens: viagens.length,
          totalAlertas: this._alertas.filter(a => a.mmsi === mmsi).length,
          corredor: corredorAtual,
          corredor_stats: corredor
        });
      });
      return out;
    },

    getResumo() {
      const statusMap = this.getStatusPorEmbarcacao();
      const resumo = {
        total: statusMap.size,
        no_prazo: 0,
        atencao: 0,
        atrasado: 0,
        atraso_medio_h: 0,
        alertas_criticos: 0,
        alertas_atencao: 0,
        total_viagens: this._viagens.length
      };
      let somaAtraso = 0;
      statusMap.forEach(s => {
        resumo[s.status] = (resumo[s.status] || 0) + 1;
        somaAtraso += s.atraso_h;
      });
      resumo.atraso_medio_h = statusMap.size ? (somaAtraso / statusMap.size) : 0;
      this._alertas.forEach(a => {
        if (a.severidade === 'critico') resumo.alertas_criticos++;
        else if (a.severidade === 'atencao') resumo.alertas_atencao++;
      });
      return resumo;
    },

    getKpisPorEmbarcacao(mmsi) {
      const viagens = this.getViagensPorMmsi(mmsi);
      const total = viagens.length || 1;
      let noPrazo = 0, atencao = 0, atrasado = 0;
      let somaAtraso = 0, maxAtraso = 0;
      viagens.forEach(v => {
        if (v.status === 'no_prazo') noPrazo++;
        else if (v.status === 'atencao') atencao++;
        else atrasado++;
        somaAtraso += v.atraso_h;
        maxAtraso = Math.max(maxAtraso, v.atraso_h);
      });
      return {
        total: viagens.length,
        no_prazo: noPrazo,
        atencao,
        atrasado,
        pct_no_prazo: Math.round((noPrazo / total) * 100),
        pct_atencao: Math.round((atencao / total) * 100),
        pct_atrasado: Math.round((atrasado / total) * 100),
        atraso_medio_h: somaAtraso / total,
        atraso_max_h: maxAtraso
      };
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

    /* -------------------- Visibilidade / modos -------------------- */
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
      if (this._modoTrilha) {
        window.AISLayer.renderizarTrilhas(this.getTodasPosicoes());
      } else {
        window.AISLayer.renderizar(this.getUltimasPosicoes());
      }
    },

    toggleModoTrilha() {
      this._modoTrilha = !this._modoTrilha;
      if (window.AISLayer) window.AISLayer.limparTrilha();
      this._renderizar();
      if (window.UI) {
        window.UI.toast(this._modoTrilha
          ? '🛤️ Modo trilha'
          : '📍 Modo ponto');
      }
    }
  };

  window.AISManager = AISManager;
})();