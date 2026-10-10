/* ============================================================
   M15 — AIS Workspace (3 modos: Monitor · Simulador · Dashboard)
   Substitui controle-ais.js e painel-ais.js
   ============================================================ */
(function () {
  'use strict';

  const CSS_ID = 'ais-workspace-css';

  /* ============================================================
     CSS
     ============================================================ */
  function injetarCSS() {
    ['controle-ais-css', 'controle-ais-css-v2', 'controle-ais-css-v3', 'ais-workspace-css-v1', 'painel-ais-css'].forEach(id => {
      const el = document.getElementById(id);
      if (el && id !== CSS_ID) el.remove();
    });
    if (document.getElementById(CSS_ID)) return;

    const s = document.createElement('style');
    s.id = CSS_ID;
    s.textContent = `
      /* ---------- Painel ---------- */
      .aw-painel {
        position: fixed; top: 88px; right: 10px; bottom: 10px;
        width: 470px; background: rgba(11,25,44,0.97);
        backdrop-filter: blur(10px);
        border: 1px solid #0284c7; border-radius: 12px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.65);
        display: none; flex-direction: column;
        z-index: 1500; color: #f1f5f9;
        font-family: 'Segoe UI', system-ui, sans-serif;
        overflow: hidden;
      }
      .aw-painel.aberto { display: flex; }
      .aw-painel.fullscreen { width: calc(100vw - 20px); left: 10px; }

      /* Header */
      .aw-header {
        padding: 11px 14px; flex-shrink: 0;
        background: linear-gradient(135deg, #061426 0%, #0a2540 100%);
        border-bottom: 1px solid rgba(2,132,199,0.3);
        display: flex; align-items: center; gap: 10px;
      }
      .aw-header-ico { font-size: 18px; }
      .aw-header-txt { flex: 1; min-width: 0; }
      .aw-header-txt strong {
        display: block; font-size: 12.5px; color: #38bdf8;
        font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase;
      }
      .aw-header-txt small { display: block; font-size: 10px; color: #94a3b8; margin-top: 1px; }
      .aw-btn-h {
        background: transparent; border: 1px solid #334155;
        color: #cbd5e1; border-radius: 5px;
        padding: 5px 10px; font-size: 10.5px; font-weight: 700;
        cursor: pointer; font-family: inherit; white-space: nowrap;
        transition: all 0.15s;
      }
      .aw-btn-h:hover { background: #1e293b; color: #f1f5f9; }
      .aw-btn-x {
        background: transparent; border: none; color: #94a3b8;
        font-size: 22px; cursor: pointer; padding: 0 4px; line-height: 1;
      }
      .aw-btn-x:hover { color: #f1f5f9; }

      /* Tabs */
      .aw-tabs { display: flex; background: #061426; border-bottom: 1px solid #1e293b; flex-shrink: 0; }
      .aw-tab {
        flex: 1; padding: 9px 6px; background: transparent; border: none;
        color: #94a3b8; font-family: inherit; font-size: 10.5px;
        font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
        cursor: pointer; transition: all 0.15s; border-bottom: 2px solid transparent;
      }
      .aw-tab:hover { color: #cbd5e1; background: rgba(2,132,199,0.08); }
      .aw-tab.on { color: #38bdf8; border-bottom-color: #38bdf8; background: rgba(2,132,199,0.12); }

      /* Corpo */
      .aw-body { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
      .aw-modo { flex: 1; min-height: 0; display: none; flex-direction: column; overflow: hidden; }
      .aw-modo.on { display: flex; }

      /* ---------- KPIs ---------- */
      .aw-kpis {
        display: grid; grid-template-columns: repeat(4, 1fr);
        gap: 6px; padding: 10px; background: #061426;
        border-bottom: 1px solid #1e293b; flex-shrink: 0;
      }
      .aw-kpi {
        background: linear-gradient(135deg, #0b192c 0%, #0a2540 100%);
        border-radius: 6px; padding: 8px 4px; text-align: center;
        border-left: 3px solid #64748b;
      }
      .aw-kpi.v { border-left-color: #10b981; }
      .aw-kpi.a { border-left-color: #f59e0b; }
      .aw-kpi.r { border-left-color: #ef4444; }
      .aw-kpi-valor { font-size: 20px; font-weight: 800; line-height: 1; margin-bottom: 3px; letter-spacing: -0.5px; }
      .aw-kpi-label { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; font-weight: 700; }

      /* ---------- Filtros ---------- */
      .aw-filtros {
        display: grid; grid-template-columns: 1fr 1fr 1fr 1fr auto;
        gap: 6px; padding: 8px 10px; background: #061426;
        border-bottom: 1px solid #1e293b; flex-shrink: 0;
      }
      .aw-fg { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
      .aw-fg label { font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; font-weight: 700; }
      .aw-fg select, .aw-fg input {
        background: #0b192c; color: #f1f5f9;
        border: 1px solid #1e4976; border-radius: 4px;
        padding: 4px 6px; font-size: 10.5px;
        font-family: inherit; width: 100%; min-width: 0;
      }
      .aw-btn-limpar {
        align-self: end; background: transparent; color: #94a3b8;
        border: 1px solid #334155; border-radius: 4px;
        padding: 4px 9px; font-size: 10.5px; cursor: pointer;
        height: 25px; font-family: inherit;
      }
      .aw-btn-limpar:hover { background: #1e293b; color: #f1f5f9; }

      /* ---------- Listas ---------- */
      .aw-scroll { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
      .aw-secao { display: flex; flex-direction: column; min-height: 0; border-bottom: 1px solid #1e293b; }
      .aw-secao.emb { flex: 0 0 auto; max-height: 32%; }
      .aw-secao.alt { flex: 1 1 auto; }
      .aw-sec-tit {
        padding: 7px 12px; font-size: 10px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.5px;
        color: #cbd5e1; background: #061426;
        display: flex; justify-content: space-between; align-items: center;
        gap: 8px; flex-shrink: 0;
      }
      .aw-badge { background: #1e4976; color: #38bdf8; font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 700; }
      .aw-lista { overflow-y: auto; flex: 1; min-height: 0; }
      .aw-lista::-webkit-scrollbar { width: 6px; }
      .aw-lista::-webkit-scrollbar-thumb { background: #1e4976; border-radius: 3px; }
      .aw-lista.vazio { display: flex; align-items: center; justify-content: center; padding: 20px; color: #64748b; font-size: 11px; text-align: center; }

      /* Item emb */
      .aw-emb { padding: 8px 12px; border-bottom: 1px solid #1e293b; cursor: pointer; transition: background 0.15s; border-left: 3px solid transparent; }
      .aw-emb:hover { background: #0a2540; }
      .aw-emb.sel { background: rgba(2,132,199,0.2); border-left-color: #38bdf8; }
      .aw-emb-nome { font-size: 11.5px; font-weight: 700; color: #f1f5f9; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .aw-tag { font-size: 8.5px; padding: 2px 7px; border-radius: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; }
      .aw-tag.no_prazo { background: rgba(16,185,129,0.2); color: #34d399; }
      .aw-tag.atencao { background: rgba(245,158,11,0.2); color: #fbbf24; }
      .aw-tag.atrasado { background: rgba(239,68,68,0.2); color: #f87171; }
      .aw-emb-info { font-size: 10px; color: #94a3b8; margin-top: 3px; display: flex; gap: 8px; flex-wrap: wrap; }
      .aw-emb-info b { color: #cbd5e1; }

      /* Item alerta */
      .aw-alerta { padding: 8px 12px; border-bottom: 1px solid #1e293b; cursor: pointer; transition: background 0.15s; border-left: 3px solid #64748b; }
      .aw-alerta:hover { background: #0a2540; }
      .aw-alerta.critico { border-left-color: #ef4444; }
      .aw-alerta.atencao { border-left-color: #f59e0b; }
      .aw-alerta-titulo { font-size: 11px; font-weight: 700; color: #f1f5f9; display: flex; justify-content: space-between; gap: 6px; }
      .aw-alerta-tag { font-size: 8.5px; padding: 1px 6px; border-radius: 8px; font-weight: 700; text-transform: uppercase; }
      .aw-alerta.critico .aw-alerta-tag { background: rgba(239,68,68,0.2); color: #f87171; }
      .aw-alerta.atencao .aw-alerta-tag { background: rgba(245,158,11,0.2); color: #fbbf24; }
      .aw-alerta-desc { font-size: 10px; color: #94a3b8; margin-top: 3px; line-height: 1.4; }
      .aw-alerta-data { font-size: 9px; color: #64748b; margin-top: 2px; }

      /* Timeline */
      .aw-timeline { background: #061426; border-top: 1px solid #1e293b; padding: 8px 12px 10px; flex-shrink: 0; }
      .aw-tl-controles { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
      .aw-btn-play { background: #0284c7; color: #fff; border: none; border-radius: 5px; padding: 5px 12px; font-size: 10.5px; font-weight: 700; cursor: pointer; font-family: inherit; }
      .aw-btn-play:hover { background: #0369a1; }
      .aw-btn-play.pausado { background: #f59e0b; }
      .aw-tempo { flex: 1; font-size: 10px; color: #94a3b8; text-align: center; font-variant-numeric: tabular-nums; }
      .aw-vel { background: #0b192c; color: #f1f5f9; border: 1px solid #1e4976; border-radius: 5px; padding: 3px 6px; font-size: 10px; font-family: inherit; cursor: pointer; }
      .aw-slider { width: 100%; accent-color: #38bdf8; }

      /* Detalhe */
      .aw-det-header { padding: 10px 14px; background: #061426; border-bottom: 1px solid #1e293b; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
      .aw-btn-voltar { background: transparent; border: 1px solid #334155; color: #94a3b8; border-radius: 5px; padding: 4px 10px; font-size: 10.5px; cursor: pointer; font-family: inherit; }
      .aw-btn-voltar:hover { background: #1e293b; color: #f1f5f9; }
      .aw-det-nome { flex: 1; font-size: 12.5px; font-weight: 700; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .aw-det-body { flex: 1; overflow-y: auto; padding: 12px; min-height: 0; }
      .aw-det-body::-webkit-scrollbar { width: 6px; }
      .aw-det-body::-webkit-scrollbar-thumb { background: #1e4976; border-radius: 3px; }
      .aw-bloco { background: #061426; border: 1px solid #1e293b; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; }
      .aw-bloco-tit { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; font-weight: 700; margin-bottom: 8px; }
      .aw-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .aw-mini { background: #0b192c; border-radius: 5px; padding: 7px 4px; text-align: center; }
      .aw-mini-v { font-size: 15px; font-weight: 800; }
      .aw-mini-l { font-size: 8.5px; color: #94a3b8; text-transform: uppercase; margin-top: 3px; }
      .aw-linha { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #1e293b; font-size: 11px; }
      .aw-linha:last-child { border-bottom: none; }
      .aw-linha-l { color: #94a3b8; }
      .aw-linha-v { color: #f1f5f9; font-weight: 600; }
      .aw-trecho { padding: 7px 0; border-bottom: 1px solid #1e293b; font-size: 10px; }
      .aw-trecho:last-child { border-bottom: none; }
      .aw-trecho-topo { display: flex; justify-content: space-between; gap: 6px; }
      .aw-trecho-porto { color: #f1f5f9; font-weight: 700; }
      .aw-trecho-dados { display: flex; gap: 10px; margin-top: 3px; color: #94a3b8; font-size: 9.5px; flex-wrap: wrap; }

      /* ---------- Simulador ---------- */
      .aw-sim-body { flex: 1; overflow-y: auto; padding: 12px; min-height: 0; }
      .aw-sim-body::-webkit-scrollbar { width: 6px; }
      .aw-sim-body::-webkit-scrollbar-thumb { background: #1e4976; border-radius: 3px; }
      .aw-sim-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
      .aw-sim-form label { font-size: 9.5px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; font-weight: 700; margin-bottom: 4px; display: block; }
      .aw-sim-form select {
        width: 100%; background: #0b192c; color: #f1f5f9;
        border: 1px solid #1e4976; border-radius: 5px;
        padding: 8px 10px; font-size: 12px; font-family: inherit;
      }
      .aw-btn-rodar {
        width: 100%; background: linear-gradient(135deg, #0284c7, #0369a1);
        color: #fff; border: none; border-radius: 6px;
        padding: 11px 16px; font-size: 12.5px; font-weight: 800;
        cursor: pointer; font-family: inherit;
        letter-spacing: 0.4px; text-transform: uppercase;
        box-shadow: 0 4px 12px rgba(2,132,199,0.4);
        transition: transform 0.1s;
      }
      .aw-btn-rodar:hover { transform: translateY(-1px); }
      .aw-sim-status { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 6px; font-size: 11px; margin-bottom: 10px; }
      .aw-sim-status.ok { background: rgba(16,185,129,0.15); color: #34d399; }
      .aw-sim-status.warn { background: rgba(245,158,11,0.15); color: #fbbf24; }
      .aw-sim-status.err { background: rgba(239,68,68,0.15); color: #f87171; }
      .aw-sim-parada { display: flex; align-items: center; gap: 10px; padding: 9px 12px; background: #061426; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #64748b; }
      .aw-sim-parada.bom { border-left-color: #10b981; }
      .aw-sim-parada.atencao { border-left-color: #f59e0b; }
      .aw-sim-parada.ruim { border-left-color: #ef4444; }
      .aw-sim-idx { width: 26px; height: 26px; border-radius: 50%; background: #1e4976; color: #38bdf8; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0; }
      .aw-sim-parada-info { flex: 1; min-width: 0; }
      .aw-sim-parada-nome { font-size: 11.5px; font-weight: 700; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .aw-sim-parada-horas { font-size: 10px; color: #94a3b8; margin-top: 2px; }
      .aw-sim-parada-tag { font-size: 9px; padding: 2px 8px; border-radius: 10px; font-weight: 700; text-transform: uppercase; flex-shrink: 0; }
      .aw-sim-parada-tag.ok { background: rgba(16,185,129,0.2); color: #34d399; }
      .aw-sim-parada-tag.warn { background: rgba(245,158,11,0.2); color: #fbbf24; }
      .aw-sim-parada-tag.err { background: rgba(239,68,68,0.2); color: #f87171; }

      /* ---------- Dashboard (executivo) ---------- */
      .aw-dash-body { flex: 1; overflow-y: auto; padding: 16px; min-height: 0; }
      .aw-dash-body::-webkit-scrollbar { width: 6px; }
      .aw-dash-body::-webkit-scrollbar-thumb { background: #1e4976; border-radius: 3px; }
      .aw-dash-titulo {
        font-size: 13px; font-weight: 800; color: #38bdf8;
        letter-spacing: 0.3px; text-transform: uppercase; margin-bottom: 4px;
      }
      .aw-dash-sub {
        font-size: 11px; color: #94a3b8; margin-bottom: 14px;
      }
      .aw-dash-kpis {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
        margin-bottom: 16px;
      }
      .aw-dash-kpi {
        background: linear-gradient(135deg, #0b192c 0%, #0a2540 100%);
        border: 1px solid #1e4976; border-radius: 10px;
        padding: 14px; position: relative; overflow: hidden;
      }
      .aw-dash-kpi::before {
        content: ''; position: absolute; left: 0; top: 0; bottom: 0;
        width: 4px; background: #38bdf8;
      }
      .aw-dash-kpi.v::before { background: #10b981; }
      .aw-dash-kpi.a::before { background: #f59e0b; }
      .aw-dash-kpi.r::before { background: #ef4444; }
      .aw-dash-kpi-ico { font-size: 16px; margin-bottom: 4px; }
      .aw-dash-kpi-v {
        font-size: 32px; font-weight: 800; line-height: 1;
        letter-spacing: -1px; margin-bottom: 4px;
      }
      .aw-dash-kpi-l {
        font-size: 10px; text-transform: uppercase;
        letter-spacing: 0.6px; color: #94a3b8; font-weight: 700;
      }
      .aw-dash-kpi-s { font-size: 10px; color: #64748b; margin-top: 4px; }
      .aw-dash-secao {
        background: rgba(6,20,38,0.5);
        border: 1px solid #1e293b; border-radius: 10px;
        padding: 14px; margin-bottom: 12px;
      }
      .aw-dash-sec-tit {
        font-size: 11px; text-transform: uppercase;
        letter-spacing: 0.6px; color: #cbd5e1;
        font-weight: 800; margin-bottom: 10px;
        display: flex; justify-content: space-between; align-items: center;
      }
      .aw-dash-alerta {
        padding: 8px 10px; background: #0b192c;
        border-radius: 6px; margin-bottom: 6px;
        border-left: 3px solid #64748b;
      }
      .aw-dash-alerta.critico { border-left-color: #ef4444; }
      .aw-dash-alerta.atencao { border-left-color: #f59e0b; }
      .aw-dash-alerta-tit {
        font-size: 11px; font-weight: 700; color: #f1f5f9;
        display: flex; justify-content: space-between; gap: 8px;
      }
      .aw-dash-alerta-desc { font-size: 10px; color: #94a3b8; margin-top: 3px; }
      .aw-dash-cards {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 8px;
      }
      .aw-dash-card {
        background: #0b192c; border: 1px solid #1e4976;
        border-radius: 8px; padding: 10px;
        cursor: pointer; transition: all 0.15s;
      }
      .aw-dash-card:hover { transform: translateY(-2px); border-color: #38bdf8; }
      .aw-dash-card-nome {
        font-size: 11px; font-weight: 700; color: #f1f5f9;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        margin-bottom: 5px;
      }
      .aw-dash-card-linha {
        display: flex; justify-content: space-between;
        font-size: 10px; color: #94a3b8; margin-bottom: 2px;
      }
      .aw-dash-card-linha b { color: #cbd5e1; }
    `;
    document.head.appendChild(s);
  }

  /* ============================================================
     OBJETO
     ============================================================ */
  const ControleAIS = {
    _aberto: false,
    _isolarAIS: true,        // ← nova linha
    _camadasSalvas: null,    // ← nova linha
    _modo: 'monitor',         // 'monitor' | 'simulador' | 'dashboard'
    _emb: null,
    _fullscreen: false,
    _filtros: { status: '', tipo: '', perfil: '', corredor: '' },
    _sim: { mmsi: null, rodando: false },
    _tl: {
      playing: false, tAtual: 0, tInicio: 0, tFim: 0,
      vel: 6, _timer: null, _passo: 200, _janela: 24,
      _contexto: 'global'     // 'global' | 'vessel'
    },

    /* ------------------------------------------------------------
       ABRIR / FECHAR
       ------------------------------------------------------------ */
    async abrir() {
      this._camadasSalvas = null;   // ← ADICIONA ESSA LINHA
      if (window.PainelAIS && window.PainelAIS._aberto) {
        window.PainelAIS.fechar();
      }
      injetarCSS();
      this._garantirHTML();

      const p = document.getElementById('aw-painel');
      if (p) { p.classList.add('aberto'); p.style.display = 'flex'; }
      this._aberto = true;
      this._emb = null;
      this._fullscreen = false;

      const pc = document.getElementById('painel-camadas-lateral');
      if (pc) pc.style.display = 'none';
      this._desligarCamadas();
      if (!window.AISManager || !window.AISManager._pronto) {
        if (!window.AISManager) return;
        const ok = await window.AISManager.carregar();
        if (!ok) { if (window.UI) window.UI.toast('❌ Falha ao carregar AIS'); return; }
      }
      if (!window.AISManager._visivel) {
        window.AISManager._visivel = true;
        if (window.AISLayer) window.AISLayer.mostrar();
      }

      this._garantirRangeGlobal();
      this.trocarModo('monitor');

      document.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('ativo', 'ativa', 'active'));
      const btn = document.querySelector('.aba-btn[data-aba="ais"]');
      if (btn) btn.classList.add('ativo');
    },
    _desligarCamadas() {
      if (!this._isolarAIS) return;
      if (!window.CAMADAS_MAPA || !window.mapa) return;

      // Sempre coleta o que está REALMENTE visível agora
      const salvas = [];
      Object.entries(window.CAMADAS_MAPA).forEach(([id, layer]) => {
        if (!layer) return;
        if (window.mapa.hasLayer(layer)) {
          salvas.push(id);
          window.mapa.removeLayer(layer);
        }
      });

      // Faz merge com o que já tinha salvo (nunca perde referência)
      if (this._camadasSalvas && this._camadasSalvas.length) {
        const merged = new Set([...this._camadasSalvas, ...salvas]);
        this._camadasSalvas = [...merged];
      } else {
        this._camadasSalvas = salvas;
      }

      console.log('[AIS] camadas isoladas:', this._camadasSalvas);
    },
    _restaurarCamadas() {
      if (!this._camadasSalvas || !this._camadasSalvas.length) {
        console.log('[AIS] nada para restaurar');
        return;
      }
      if (!window.CAMADAS_MAPA || !window.mapa) return;

      let restauradas = 0;
      this._camadasSalvas.forEach(id => {
        const layer = window.CAMADAS_MAPA[id];
        if (!layer) {
          console.warn('[AIS] layer não existe mais:', id);
          return;
        }
        if (!window.mapa.hasLayer(layer)) {
          layer.addTo(window.mapa);
          restauradas++;
        }
      });

      console.log('[AIS] camadas restauradas:', restauradas, 'de', this._camadasSalvas.length);
      this._camadasSalvas = null;  // limpa SEMPRE, mesmo se restaurou 0
    },

    toggleIsolarAIS() {
      this._isolarAIS = !this._isolarAIS;
      const btn = document.getElementById('aw-btn-isolar');
      if (btn) {
        btn.style.background = this._isolarAIS ? '#0284c7' : 'transparent';
        btn.style.color = this._isolarAIS ? '#fff' : '#cbd5e1';
        btn.title = this._isolarAIS ? 'Camadas isoladas — clique pra manter todas visíveis' : 'Manter todas camadas visíveis';
      }
      if (window.UI) {
        window.UI.toast(this._isolarAIS
          ? '🔒 Camadas isoladas ao abrir AIS'
          : '🔓 Camadas mantidas');
      }
      // Se desligou, restaura as camadas que estavam salvas
      if (!this._isolarAIS && this._camadasSalvas) {
        this._restaurarCamadas();
      }
      // Se ligou e o painel está aberto, isola agora
      if (this._isolarAIS && this._aberto) {
        this._desligarCamadas();
      }
    },
    forcarRestauracao() {
      if (!this._camadasSalvas || !this._camadasSalvas.length) {
        if (window.UI) window.UI.toast('ℹ️ Nenhuma camada para restaurar');
        return;
      }
      this._restaurarCamadas();
      if (window.UI) window.UI.toast('🔄 Camadas restauradas');
    },
    limparVisualizacao() {
      if (window.AISLayer) window.AISLayer.limparTrilha();
      if (this._emb) {
        this._emb = null;
        this._mostrarPrincipal();
        this.renderMonitor();
        this._contextoGlobal();
        this._atualizarFrame();
      }
      if (window.UI) window.UI.toast('🧹 Visualização limpa');
    },
    fechar() {
      this._pausar();
      this._restaurarCamadas();
      const p = document.getElementById('aw-painel');
      if (p) { p.classList.remove('aberto', 'fullscreen'); p.style.display = 'none'; }
      const pc = document.getElementById('painel-camadas-lateral');
      if (pc) pc.style.display = '';

      if (window.AISManager && window.AISManager._visivel) {
        window.AISManager._visivel = false;
        if (window.AISLayer) window.AISLayer.esconder();
      }
      this._garantirRangeGlobal();
      this.trocarModo('monitor');

      this._aberto = false;
      this._emb = null;
      this._fullscreen = false;
    },

    /* ------------------------------------------------------------
       MODO
       ------------------------------------------------------------ */
    trocarModo(modo) {
      this._modo = modo;
      document.querySelectorAll('.aw-tab').forEach(t => t.classList.toggle('on', t.dataset.modo === modo));
      document.querySelectorAll('.aw-modo').forEach(m => m.classList.toggle('on', m.dataset.modo === modo));

      const tl = document.getElementById('aw-timeline');
      if (tl) tl.style.display = (modo === 'dashboard') ? 'none' : '';

      const p = document.getElementById('aw-painel');
      if (p) p.classList.toggle('fullscreen', modo === 'dashboard' && this._fullscreen);

      if (modo === 'monitor') {
        this._contextoGlobal();
        this.renderMonitor();
        this._atualizarFrame();
      } else if (modo === 'simulador') {
        this._renderSimuladorForm();
      } else if (modo === 'dashboard') {
        this._renderDashboard();
      }
    },

    toggleFullscreen() {
      this._fullscreen = !this._fullscreen;
      const p = document.getElementById('aw-painel');
      if (p) p.classList.toggle('fullscreen', this._fullscreen);
      if (window.mapa && window.mapa.invalidateSize) {
        setTimeout(() => window.mapa.invalidateSize(), 150);
      }
    },

    _contextoGlobal() {
      this._tl._contexto = 'global';
      this._emb = null;
      this._garantirRangeGlobal();
    },

    /* ------------------------------------------------------------
       HTML
       ------------------------------------------------------------ */
    _garantirHTML() {
      if (document.getElementById('aw-painel')) return;
      const el = document.createElement('div');
      el.id = 'aw-painel';
      el.className = 'aw-painel';
      el.innerHTML = `
        <div class="aw-header">
          <span class="aw-header-ico">🎛️</span>
          <div class="aw-header-txt">
            <strong>AIS · Monitoramento</strong>
            <small>Embarcações · Amazônia Legal</small>
          </div>
          <button class="aw-btn-h" id="aw-btn-isolar" onclick="ControleAIS.toggleIsolarAIS()" title="Camadas isoladas ao abrir AIS" style="background:#0284c7;color:#fff;">🔒</button>
          <button class="aw-btn-h" onclick="ControleAIS.limparVisualizacao()" title="Limpar trilhas do mapa">🧹</button>
          <button class="aw-btn-h" onclick="ControleAIS.forcarRestauracao()" title="Forçar restauração de camadas">🔄</button>
          <button class="aw-btn-h" onclick="ControleAIS.toggleFullscreen()" id="aw-btn-full" title="Alternar tela cheia">⛶</button>
          <button class="aw-btn-h" onclick="ControleAIS.exportarCSV()" title="Exportar CSV">⬇ CSV</button>
          <button class="aw-btn-x" onclick="ControleAIS.fechar(); if(window.TabManager) TabManager.trocar('mapa');" title="Fechar">&times;</button>
        </div>

        <div class="aw-tabs">
          <button class="aw-tab on" data-modo="monitor" onclick="ControleAIS.trocarModo('monitor')">📋 Monitor</button>
          <button class="aw-tab" data-modo="simulador" onclick="ControleAIS.trocarModo('simulador')">🚢 Simulador</button>
          <button class="aw-tab" data-modo="dashboard" onclick="ControleAIS.trocarModo('dashboard')">📊 Dashboard</button>
        </div>

        <div class="aw-body">
          <!-- MODO MONITOR -->
          <div class="aw-modo on" data-modo="monitor">
            <div id="aw-principal" style="display:flex;flex-direction:column;flex:1;min-height:0;">
              <div class="aw-kpis" id="aw-kpis"></div>
<div class="aw-filtros">
  <div class="aw-fg"><label>Status</label>
    <select id="aw-filtro-status" onchange="ControleAIS.aplicarFiltros()">
      <option value="">Todos</option>
      <option value="no_prazo">🟢 No prazo</option>
      <option value="atencao">🟡 Atenção</option>
      <option value="atrasado">🔴 Atrasado</option>
    </select>
  </div>
  <div class="aw-fg"><label>Tipo</label>
    <select id="aw-filtro-tipo" onchange="ControleAIS.aplicarFiltros()">
      <option value="">Todos</option>
      <option value="Carga Geral">Carga Geral</option>
      <option value="Passageiros">Passageiros</option>
      <option value="Tanque">Tanque</option>
    </select>
  </div>
  <div class="aw-fg"><label>Perfil</label>
    <select id="aw-filtro-perfil" onchange="ControleAIS.aplicarFiltros()">
      <option value="">Todos</option>
      <option value="pontual">Pontual</option>
      <option value="regular">Regular</option>
      <option value="irregular">Irregular</option>
      <option value="problematica">Problemática</option>
    </select>
  </div>
<div class="aw-fg">
  <label title="Filtra pela distância até os trechos VEN (onde houve movimentação de carga nas safras 2022/2024)">
    Vias Navegadas (VEN) <span style="cursor:help;color:#38bdf8;">ⓘ</span>
  </label>
  <select id="aw-filtro-corredor" onchange="ControleAIS.aplicarFiltros()"
          title="🟢 Em trecho VEN: até 2 km de trecho com navegação de carga comprovada&#10;🟡 Próximo: 2 a 5 km — nas margens do trecho VEN&#10;🔴 Fora: mais de 5 km — sem histórico de carga no local">
    <option value="">Todos</option>
    <option value="dentro">🟢 Em trecho VEN</option>
    <option value="atencao">🟡 Próximo ao trecho</option>
    <option value="fora">🔴 Fora do trecho</option>
  </select>
</div>
  <button class="aw-btn-limpar" onclick="ControleAIS.limparFiltros()">Limpar</button>
    <button class="aw-btn-limpar" onclick="ControleAIS.limparFiltros()">Limpar</button>
</div>
<div class="aw-legenda-corredor" style="display:flex;gap:14px;align-items:center;
     padding:6px 12px;background:#0a1424;border-bottom:1px solid #1e293b;
     font-size:9.5px;color:#94a3b8;flex-shrink:0;">
  <span style="color:#64748b;font-weight:700;letter-spacing:0.4px;">VIAS NAVEGADAS (VEN):</span>
  <span><span style="color:#10b981;">●</span> Em trecho &lt; 2 km</span>
  <span><span style="color:#f59e0b;">●</span> Próximo 2–5 km</span>
  <span><span style="color:#ef4444;">●</span> Fora &gt; 5 km</span>
  <span style="margin-left:auto;font-style:italic;color:#64748b;">
    Trechos com movimentação de carga registrada nas safras VEN (2022 · 2024)
  </span>
</div>
</div>
              <div class="aw-scroll">
                <div class="aw-secao emb">
                  <div class="aw-sec-tit"><span>🚢 Embarcações</span><span class="aw-badge" id="aw-total-emb">0</span></div>
                  <div class="aw-lista" id="aw-lista-emb"></div>
                </div>
                <div class="aw-secao alt">
                  <div class="aw-sec-tit"><span>⚠️ Alertas</span><span class="aw-badge" id="aw-total-alt">0</span></div>
                  <div class="aw-lista" id="aw-lista-alt"></div>
                </div>
              </div>
            </div>
            <div id="aw-detalhe" style="display:none;flex-direction:column;flex:1;min-height:0;"></div>
          </div>

          <!-- MODO SIMULADOR -->
          <div class="aw-modo" data-modo="simulador">
            <div class="aw-sim-body" id="aw-sim-body"></div>
          </div>

          <!-- MODO DASHBOARD -->
          <div class="aw-modo" data-modo="dashboard">
            <div class="aw-dash-body" id="aw-dash-body"></div>
          </div>
        </div>

        <!-- TIMELINE -->
        <div class="aw-timeline" id="aw-timeline">
          <div class="aw-tl-controles">
            <button id="aw-btn-play" class="aw-btn-play" onclick="ControleAIS.togglePlay()">▶ Play</button>
            <span id="aw-tempo" class="aw-tempo">—</span>
            <select id="aw-vel" class="aw-vel" onchange="ControleAIS.setVel(this.value)">
              <option value="1">1h/s</option>
              <option value="6" selected>6h/s</option>
              <option value="24">1 dia/s</option>
              <option value="84">3,5 dias/s</option>
            </select>
          </div>
          <input type="range" id="aw-slider" min="0" max="1000" value="0"
                 oninput="ControleAIS.seek(this.value)" class="aw-slider">
        </div>
      `;
      document.body.appendChild(el);
    },

    /* ============================================================
       MODO MONITOR
       ============================================================ */
    renderMonitor() {
      if (!this._aberto || this._modo !== 'monitor') return;
      if (this._emb) {
        this._renderDetalhe(this._emb);
      } else {
        this._mostrarPrincipal();
        this._renderKpis();
        this._renderEmb();
        this._renderAlertas();
      }
    },

    _mostrarPrincipal() {
      const p = document.getElementById('aw-principal');
      const d = document.getElementById('aw-detalhe');
      if (p) p.style.display = 'flex';
      if (d) d.style.display = 'none';
    },
    _mostrarDetalhe() {
      const p = document.getElementById('aw-principal');
      const d = document.getElementById('aw-detalhe');
      if (p) p.style.display = 'none';
      if (d) d.style.display = 'flex';
    },

    _renderKpis() {
      const el = document.getElementById('aw-kpis');
      if (!el) return;
      const sm = window.AISManager.getStatusPorEmbarcacao();
      const ok = this._mmsisFiltrados();
      let total = 0, v = 0, a = 0, r = 0;
      sm.forEach(s => {
        if (!ok.has(s.mmsi)) return;
        total++;
        if (s.status === 'no_prazo') v++;
        else if (s.status === 'atencao') a++;
        else r++;
      });
      el.innerHTML = `
        <div class="aw-kpi"><div class="aw-kpi-valor" style="color:#38bdf8;">${total}</div><div class="aw-kpi-label">Total</div></div>
        <div class="aw-kpi v"><div class="aw-kpi-valor" style="color:#34d399;">${v}</div><div class="aw-kpi-label">No prazo</div></div>
        <div class="aw-kpi a"><div class="aw-kpi-valor" style="color:#fbbf24;">${a}</div><div class="aw-kpi-label">Atenção</div></div>
        <div class="aw-kpi r"><div class="aw-kpi-valor" style="color:#f87171;">${r}</div><div class="aw-kpi-label">Atrasado</div></div>
      `;
    },

    _renderEmb() {
      const el = document.getElementById('aw-lista-emb');
      const badge = document.getElementById('aw-total-emb');
      if (!el) return;
      const sm = window.AISManager.getStatusPorEmbarcacao();
      const ok = this._mmsisFiltrados();
      const list = [...sm.values()].filter(s => ok.has(s.mmsi)).sort((a, b) => b.atraso_h - a.atraso_h);
      if (badge) badge.innerText = list.length;
      if (!list.length) { el.className = 'aw-lista vazio'; el.innerHTML = 'Nenhuma embarcação'; return; }
      el.className = 'aw-lista';
      const L = { no_prazo: 'No prazo', atencao: 'Atenção', atrasado: 'Atrasado' };
      el.innerHTML = list.map(s => {
        const at = s.atraso_h > 0
          ? `<span style="color:${s.atraso_h > 2 ? '#f87171' : '#fbbf24'};">+${s.atraso_h.toFixed(1)}h</span>`
          : '<span style="color:#34d399;">0h</span>';
        const sel = this._emb === s.mmsi ? 'sel' : '';
        const cls = s.corredor?.classificacao || 'dentro';
        const clsIco = cls === 'dentro' ? '🟢' : cls === 'atencao' ? '🟡' : '🔴';
        const clsLabel = cls === 'dentro' ? 'Em trecho VEN' : cls === 'atencao' ? 'Próximo' : 'Fora do VEN';
        return `<div class="aw-emb ${sel}" onclick="ControleAIS.selecionar(${s.mmsi})">
  <div class="aw-emb-nome">
    <span>${this._esc(s.nome)}</span>
    <span class="aw-tag ${s.status}">${L[s.status]}</span>
  </div>
  <div class="aw-emb-info">
    <span>Atraso: ${at}</span>
    <span>Alertas: <b>${s.totalAlertas}</b></span>
    <span>Pernas: <b>${s.totalViagens}</b></span>
  </div>
  <div class="aw-emb-info" style="margin-top:3px;">
    <span title="${clsLabel}">${clsIco} <b>${this._esc(s.corredor?.trecho_ven || '—')}</b></span>
  </div>
</div>`;
      }).join('');
    },

    _renderAlertas() {
      const el = document.getElementById('aw-lista-alt');
      const badge = document.getElementById('aw-total-alt');
      if (!el) return;
      const ok = this._mmsisFiltrados();
      const alt = window.AISManager.getTodosAlertas().filter(a => ok.has(a.mmsi));
      if (badge) badge.innerText = alt.length;
      if (!alt.length) { el.className = 'aw-lista vazio'; el.innerHTML = 'Nenhum alerta'; return; }
      el.className = 'aw-lista';
      const L = { atraso: 'Atraso', parada_nao_prevista: 'Parada', desempenho_baixo: 'Desempenho' };
      el.innerHTML = alt.slice(0, 40).map(a => `
        <div class="aw-alerta ${a.severidade}" onclick="ControleAIS.selecionar(${a.mmsi})">
          <div class="aw-alerta-titulo"><span>${this._esc(a.nome)}</span><span class="aw-alerta-tag">${L[a.tipo] || a.tipo}</span></div>
          <div class="aw-alerta-desc">${this._esc(a.descricao)}</div>
          <div class="aw-alerta-data">🕒 ${this._fmt(a.timestamp)}</div>
        </div>`).join('');
    },

    selecionar(mmsi) {
      if (this._emb === mmsi) {
        this._emb = null;
        this._mostrarPrincipal();
        this.renderMonitor();
        this._atualizarMapa();
        this._contextoGlobal();
        this._atualizarFrame();
        if (window.AISLayer) window.AISLayer.limparTrilha();
        return;
      }
      this._emb = mmsi;
      this._mostrarDetalhe();
      this._renderDetalhe(mmsi);
      this._atualizarMapa();
      this._rangeVessel(mmsi);
      this._atualizarFrame();
      if (window.AISLayer) window.AISLayer._destacarTrilha(mmsi);
    },

    _renderDetalhe(mmsi) {
      const el = document.getElementById('aw-detalhe');
      if (!el) return;
      const cad = window.AISManager.getCadastro(mmsi) || {};
      const s = window.AISManager.getStatusPorEmbarcacao().get(mmsi) || {};
      const k = window.AISManager.getKpisPorEmbarcacao(mmsi);
      const vg = window.AISManager.getViagensPorMmsi(mmsi);
      const al = window.AISManager.getAlertasPorMmsi(mmsi);
      const L = { no_prazo: 'No prazo', atencao: 'Atenção', atrasado: 'Atrasado' };

      const trechos = vg.slice(0, 40).map(v => `
        <div class="aw-trecho">
          <div class="aw-trecho-topo">
            <span class="aw-trecho-porto">${this._esc(v.porto)}</span>
            <span class="aw-tag ${v.status}">${L[v.status] || v.status}</span>
          </div>
          <div class="aw-trecho-dados">
            <span>Prev: ${this._fmt(v.eta_programada)}</span>
            <span>Real: ${this._fmt(v.eta_real)}</span>
            <span>Atraso: +${(v.atraso_h || 0).toFixed(1)}h</span>
          </div>
        </div>`).join('');

      const alertasHTML = al.length
        ? al.map(a => `<div class="aw-alerta ${a.severidade}" style="cursor:default;">
            <div class="aw-alerta-titulo"><span>${this._esc(a.tipo)}</span><span class="aw-alerta-tag">${a.severidade}</span></div>
            <div class="aw-alerta-desc">${this._esc(a.descricao)}</div>
            <div class="aw-alerta-data">🕒 ${this._fmt(a.timestamp)}</div>
          </div>`).join('')
        : '<div style="color:#64748b;font-size:11px;padding:8px 0;">Nenhum alerta</div>';

      el.innerHTML = `
        <div class="aw-det-header">
          <button class="aw-btn-voltar" onclick="ControleAIS.selecionar(${mmsi})">← Voltar</button>
          <div class="aw-det-nome">${this._esc(cad.nome || 'MMSI ' + mmsi)}</div>
        </div>
        <div class="aw-det-body">
          <div class="aw-bloco">
            <div class="aw-bloco-tit">Identificação</div>
            <div class="aw-linha"><span class="aw-linha-l">MMSI</span><span class="aw-linha-v">${mmsi}</span></div>
            <div class="aw-linha"><span class="aw-linha-l">Tipo</span><span class="aw-linha-v">${this._esc(cad.tipo || '-')}</span></div>
            <div class="aw-linha"><span class="aw-linha-l">Perfil</span><span class="aw-linha-v">${this._esc(cad.perfil || '-')}</span></div>
            <div class="aw-linha"><span class="aw-linha-l">Status</span><span class="aw-tag ${s.status || ''}">${L[s.status] || '-'}</span></div>
          </div>
          <div class="aw-bloco">
            <div class="aw-bloco-tit">Desempenho</div>
            <div class="aw-grid3">
              <div class="aw-mini"><div class="aw-mini-v" style="color:#34d399;">${k.pct_no_prazo}%</div><div class="aw-mini-l">No prazo</div></div>
              <div class="aw-mini"><div class="aw-mini-v" style="color:#fbbf24;">${k.pct_atencao}%</div><div class="aw-mini-l">Atenção</div></div>
              <div class="aw-mini"><div class="aw-mini-v" style="color:#f87171;">${k.pct_atrasado}%</div><div class="aw-mini-l">Atrasado</div></div>
            </div>
            <div class="aw-linha" style="margin-top:8px;"><span class="aw-linha-l">Atraso médio</span><span class="aw-linha-v">${k.atraso_medio_h.toFixed(1)}h</span></div>
            <div class="aw-linha"><span class="aw-linha-l">Atraso máximo</span><span class="aw-linha-v">${k.atraso_max_h.toFixed(1)}h</span></div>
            <div class="aw-linha"><span class="aw-linha-l">Total de pernas</span><span class="aw-linha-v">${k.total}</span></div>
          </div>
          <div class="aw-bloco">
            <div class="aw-bloco-tit">Pernas da viagem</div>
            ${trechos || '<div style="color:#64748b;font-size:11px;">Sem pernas</div>'}
          </div>
          <div class="aw-bloco">
          ${this._blocoCorredorHTML(mmsi)}
          <div class="aw-bloco">
            <div class="aw-bloco-tit">Alertas (${al.length})</div>
            ${alertasHTML}
          </div>
        </div>`;
    },

    _blocoCorredorHTML(mmsi) {
      const stats = window.AISManager.getCorredorStats(mmsi);
      const atual = window.AISManager.getCorredorAtual(mmsi);
      const trechos = window.AISManager.getTrechosUsados(mmsi);

      if (!atual) {
        return `<div class="aw-bloco">
      <div class="aw-bloco-tit">Vias Economicamente Navegadas (VEN)</div>
      <div style="color:#64748b;font-size:11px;">Sem dados de VEN</div>
    </div>`;
      }

      const cls = atual.classificacao;
      const clsLabel = cls === 'dentro' ? 'EM TRECHO COM CARGA REGISTRADA'
        : cls === 'atencao' ? 'PRÓXIMO À MARGEM DO TRECHO'
          : 'FORA DOS TRECHOS VEN';
      const clsCor = cls === 'dentro' ? '#34d399'
        : cls === 'atencao' ? '#fbbf24' : '#f87171';

      const trechosHTML = trechos.length
        ? trechos.map(t => `
        <div class="aw-linha">
          <span class="aw-linha-l">${this._esc(t.trecho)}</span>
          <span class="aw-linha-v">${t.pontos} pts</span>
        </div>`).join('')
        : '<div style="color:#64748b;font-size:11px;">Sem trechos identificados</div>';

      return `
    <div class="aw-bloco">
      <div class="aw-bloco-tit">📍 Onde esta embarcação está navegando?</div>

      <div style="background:rgba(30,73,118,0.4); border-left:3px solid #38bdf8;
                  padding:10px 12px; border-radius:6px; margin-bottom:12px;
                  font-size:11px; color:#cbd5e1; line-height:1.6;">
        <b style="color:#38bdf8;">O que é VEN?</b><br>
        Vias Economicamente Navegadas são os <b>trechos de rio por onde
        efetivamente circularam cargas</b> nas safras oficiais da ANTAQ
        (nesta base: <b>2022 e 2024</b>). Não é uma classificação oficial
        de hidrovia — é o <b>registro histórico de onde houve movimentação
        comercial</b>.
      </div>

      <div style="font-size:10.5px; color:#94a3b8; margin-bottom:8px;
                  text-transform:uppercase; letter-spacing:0.4px; font-weight:700;">
        Situação atual
      </div>
      <div style="background:${clsCor}; color:#0f172a; font-size:10.5px;
                  font-weight:800; letter-spacing:0.4px;
                  padding:7px 10px; border-radius:6px;
                  margin-bottom:12px; text-align:center;">
        ${clsLabel}
      </div>

      <div class="aw-linha">
        <span class="aw-linha-l">Trecho com carga mais próximo</span>
        <span class="aw-linha-v">${this._esc(atual.trecho_ven || '—')}</span>
      </div>
      <div class="aw-linha">
        <span class="aw-linha-l">Distância até esse trecho</span>
        <span class="aw-linha-v">${(atual.dist_ven_km || 0).toFixed(2)} km</span>
      </div>

      <div style="background:#0b192c; border:1px solid #1e293b;
                  border-radius:6px; padding:8px 10px; margin-top:10px;
                  font-size:10px; color:#94a3b8; line-height:1.5;">
        <b style="color:#cbd5e1;">Como ler a distância:</b><br>
        <span style="color:#34d399;">●</span> Até 2 km &nbsp;→&nbsp; <b style="color:#cbd5e1;">Em trecho VEN</b> (navegando onde há carga registrada)<br>
        <span style="color:#fbbf24;">●</span> 2 a 5 km &nbsp;→&nbsp; <b style="color:#cbd5e1;">Próximo</b> (na margem do trecho VEN)<br>
        <span style="color:#f87171;">●</span> Acima de 5 km &nbsp;→&nbsp; <b style="color:#cbd5e1;">Fora do VEN</b> (sem registro de carga no local)
      </div>

      <div class="aw-bloco-tit" style="margin-top:14px;">Histórico de uso das vias</div>
      <div class="aw-grid3">
        <div class="aw-mini"><div class="aw-mini-v" style="color:#34d399;">${stats.pct_dentro}%</div><div class="aw-mini-l">Em trecho</div></div>
        <div class="aw-mini"><div class="aw-mini-v" style="color:#fbbf24;">${stats.pct_atencao}%</div><div class="aw-mini-l">Próx. margem</div></div>
        <div class="aw-mini"><div class="aw-mini-v" style="color:#f87171;">${stats.pct_fora}%</div><div class="aw-mini-l">Fora</div></div>
      </div>

      <div class="aw-bloco-tit" style="margin-top:14px;">Trechos navegados</div>
      ${trechosHTML}
    </div>`;
    },

    /* ============================================================
       MODO SIMULADOR
       ============================================================ */
    _renderSimuladorForm() {
      const body = document.getElementById('aw-sim-body');
      if (!body) return;
      const sm = window.AISManager.getStatusPorEmbarcacao();
      const lista = [...sm.values()].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

      body.innerHTML = `
    <div class="aw-bloco">
      <div class="aw-bloco-tit">Configurar viagem</div>
      <div class="aw-sim-form">
        <div>
          <label>Embarcação</label>
          <select id="aw-sim-emb" onchange="ControleAIS._simMudarEmb()">
            <option value="">— Selecione —</option>
            ${lista.map(s => `<option value="${s.mmsi}">${this._esc(s.nome)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Porto de origem</label>
          <select id="aw-sim-origem" onchange="ControleAIS._simAtualizarDestinos()">
            <option value="">— Selecione a embarcação primeiro —</option>
          </select>
        </div>
        <div>
          <label>Porto de destino</label>
          <select id="aw-sim-destino">
            <option value="">— Selecione a origem primeiro —</option>
          </select>
        </div>
        <button class="aw-btn-rodar" onclick="ControleAIS.rodarSimulacao()">
          ▶ Simular viagem
        </button>
      </div>
    </div>
    <div id="aw-sim-resultado"></div>
  `;
    },

    _simMudarEmb() {
      const sel = document.getElementById('aw-sim-emb');
      const selO = document.getElementById('aw-sim-origem');
      const selD = document.getElementById('aw-sim-destino');
      const r = document.getElementById('aw-sim-resultado');
      if (r) r.innerHTML = '';
      if (!sel || !selO || !selD) return;

      const mmsi = parseInt(sel.value, 10);
      selO.innerHTML = '<option value="">— Selecione —</option>';
      selD.innerHTML = '<option value="">— Selecione a origem primeiro —</option>';
      if (!mmsi) {
        selO.innerHTML = '<option value="">— Selecione a embarcação primeiro —</option>';
        return;
      }

      const viagens = window.AISManager.getViagensPorMmsi(mmsi);
      const portos = [];
      const vistos = new Set();
      viagens.forEach(v => {
        if (v.porto && !vistos.has(v.porto)) {
          vistos.add(v.porto);
          portos.push(v.porto);
        }
      });

      selO.innerHTML = '<option value="">— Selecione —</option>' +
        portos.map(p => `<option value="${this._esc(p)}">${this._esc(p)}</option>`).join('');
    },
    _simAtualizarDestinos() {
      const selO = document.getElementById('aw-sim-origem');
      const selD = document.getElementById('aw-sim-destino');
      if (!selO || !selD) return;
      const origem = selO.value;
      const mmsi = parseInt(document.getElementById('aw-sim-emb').value, 10);
      if (!origem || !mmsi) {
        selD.innerHTML = '<option value="">— Selecione a origem primeiro —</option>';
        return;
      }

      const viagens = window.AISManager.getViagensPorMmsi(mmsi);
      const portos = [];
      const vistos = new Set();
      viagens.forEach(v => {
        if (v.porto && v.porto !== origem && !vistos.has(v.porto)) {
          vistos.add(v.porto);
          portos.push(v.porto);
        }
      });

      selD.innerHTML = '<option value="">— Selecione —</option>' +
        portos.map(p => `<option value="${this._esc(p)}">${this._esc(p)}</option>`).join('');
    },

    _rangeVesselTrecho(mmsi, legs) {
      if (!legs || !legs.length) return;
      const tIni = new Date(legs[0].eta_real || legs[0].eta_programada).getTime();
      const tFim = new Date(legs[legs.length - 1].eta_real || legs[legs.length - 1].eta_programada).getTime();
      if (!tIni || !tFim) return;
      this._tl.tInicio = Math.min(tIni, tFim);
      this._tl.tFim = Math.max(tIni, tFim);
      this._tl.tAtual = this._tl.tInicio;
      this._tl._contexto = 'vessel';
    },
    rodarSimulacao() {
      const embSel = document.getElementById('aw-sim-emb');
      const origSel = document.getElementById('aw-sim-origem');
      const destSel = document.getElementById('aw-sim-destino');
      if (!embSel || !origSel || !destSel) return;

      const mmsi = parseInt(embSel.value, 10);
      const origem = origSel.value;
      const destino = destSel.value;

      if (!mmsi) { if (window.UI) window.UI.toast('⚠️ Escolha a embarcação'); return; }
      if (!origem) { if (window.UI) window.UI.toast('⚠️ Escolha a origem'); return; }
      if (!destino) { if (window.UI) window.UI.toast('⚠️ Escolha o destino'); return; }
      if (origem === destino) { if (window.UI) window.UI.toast('⚠️ Origem e destino iguais'); return; }

      const todasViagens = window.AISManager.getViagensPorMmsi(mmsi);
      const idxOrig = todasViagens.findIndex(v => v.porto === origem);
      const idxDest = todasViagens.findIndex(v => v.porto === destino);
      if (idxOrig < 0 || idxDest < 0) {
        if (window.UI) window.UI.toast('❌ Rota não encontrada'); return;
      }

      // Pega o trecho origem → destino (com reverso se necessário)
      let legs;
      if (idxOrig <= idxDest) {
        legs = todasViagens.slice(idxOrig, idxDest + 1);
      } else {
        legs = todasViagens.slice(idxDest, idxOrig + 1).reverse();
      }

      this._sim.mmsi = mmsi;
      this._sim.rodando = true;
      this._sim.legs = legs;

      const totalKm = legs.reduce((s, v) => s + (v.km || 0), 0);
      const somaAtraso = legs.reduce((s, v) => s + (v.atraso_h || 0), 0);
      const atrasoMedio = legs.length ? somaAtraso / legs.length : 0;
      const atrasoMax = Math.max(...legs.map(v => v.atraso_h || 0));

      const nPrazo = legs.filter(v => v.status === 'no_prazo').length;
      const nAtencao = legs.filter(v => v.status === 'atencao').length;
      const nAtrasado = legs.filter(v => v.status === 'atrasado').length;
      const pctPrazo = Math.round((nPrazo / legs.length) * 100);

      let statusClass = 'ok', statusMsg = 'Viagem dentro do planejado';
      if (nAtrasado / legs.length > 0.5) {
        statusClass = 'err';
        statusMsg = `${nAtrasado} de ${legs.length} pernas em atraso`;
      } else if (nAtrasado + nAtencao > legs.length * 0.3) {
        statusClass = 'warn';
        statusMsg = `${nAtrasado + nAtencao} de ${legs.length} pernas com desvio`;
      }

      const paradasHTML = legs.map((v, i) => {
        const tag = v.status === 'no_prazo' ? 'ok' : v.status === 'atencao' ? 'warn' : 'err';
        const ico = { no_prazo: '✓', atencao: '⚠️', atrasado: '✕' }[v.status];
        return `
      <div class="aw-sim-parada ${tag}">
        <div class="aw-sim-idx">${i + 1}</div>
        <div class="aw-sim-parada-info">
          <div class="aw-sim-parada-nome">${this._esc(v.porto)}</div>
          <div class="aw-sim-parada-horas">
            Prev: ${this._fmt(v.eta_programada)} · Real: ${this._fmt(v.eta_real)}
          </div>
        </div>
        <span class="aw-sim-parada-tag ${tag}">${ico} +${(v.atraso_h || 0).toFixed(1)}h</span>
      </div>`;
      }).join('');

      const body = document.getElementById('aw-sim-resultado');
      if (!body) return;

      body.innerHTML = `
    <div class="aw-bloco">
      <div class="aw-bloco-tit">Resumo da viagem</div>
      <div class="aw-sim-status ${statusClass}">
        <span>${statusClass === 'ok' ? '✅' : statusClass === 'warn' ? '⚠️' : '🚨'}</span>
        <span>${statusMsg}</span>
      </div>
      <div class="aw-grid3">
        <div class="aw-mini"><div class="aw-mini-v" style="color:#38bdf8;">${legs.length}</div><div class="aw-mini-l">Paradas</div></div>
        <div class="aw-mini"><div class="aw-mini-v" style="color:#fbbf24;">${atrasoMedio.toFixed(1)}h</div><div class="aw-mini-l">Atraso médio</div></div>
        <div class="aw-mini"><div class="aw-mini-v" style="color:#f87171;">${atrasoMax.toFixed(1)}h</div><div class="aw-mini-l">Atraso máx</div></div>
      </div>
      <div class="aw-linha" style="margin-top:8px;"><span class="aw-linha-l">Origem</span><span class="aw-linha-v">${this._esc(origem)}</span></div>
      <div class="aw-linha"><span class="aw-linha-l">Destino</span><span class="aw-linha-v">${this._esc(destino)}</span></div>
      <div class="aw-linha"><span class="aw-linha-l">Distância</span><span class="aw-linha-v">${totalKm.toFixed(0)} km</span></div>
      <div class="aw-linha"><span class="aw-linha-l">% no prazo</span><span class="aw-linha-v" style="color:#34d399;">${pctPrazo}%</span></div>
    </div>

    <div class="aw-bloco">
      <div class="aw-bloco-tit">Rota · ${legs.length} paradas</div>
      ${paradasHTML}
    </div>

    <div class="aw-bloco">
      <div class="aw-bloco-tit">Próximo passo</div>
      <div style="font-size:11px;color:#94a3b8;line-height:1.5;">
        Use os controles <b style="color:#cbd5e1;">▶ Play</b> abaixo do painel para animar a viagem no mapa.
        Ajuste a velocidade em <b style="color:#cbd5e1;">6h/s · 1 dia/s · 3,5 dias/s</b>.
      </div>
    </div>
  `;

      // Foca no mapa e ajusta a animação pra esse trecho
      this._emb = mmsi;
      this._atualizarMapa();
      this._rangeVesselTrecho(mmsi, legs);
      this._atualizarFrame();
      if (window.AISLayer) window.AISLayer._destacarTrilha(mmsi);
      if (window.UI) window.UI.toast('✅ Viagem simulada — use o Play');
    },

    /* ============================================================
       MODO DASHBOARD (executivo)
       ============================================================ */
    _renderDashboard() {
      const el = document.getElementById('aw-dash-body');
      if (!el) return;
      const r = window.AISManager.getResumo();
      const alertas = window.AISManager.getTodosAlertas();
      const statusMap = window.AISManager.getStatusPorEmbarcacao();
      const lista = [...statusMap.values()].sort((a, b) => b.atraso_h - a.atraso_h);

      const pctPrazo = r.total ? Math.round((r.no_prazo / r.total) * 100) : 0;
      const atrasoMedio = (r.atraso_medio_h || 0).toFixed(1);

      const alertasTop = alertas.slice(0, 6).map(a => `
        <div class="aw-dash-alerta ${a.severidade}">
          <div class="aw-dash-alerta-tit">
            <span>${this._esc(a.nome)}</span>
            <span style="font-size:9px;color:${a.severidade === 'critico' ? '#f87171' : '#fbbf24'};">
              ${a.tipo}
            </span>
          </div>
          <div class="aw-dash-alerta-desc">${this._esc(a.descricao)}</div>
        </div>
      `).join('');

      const cardsEmb = lista.map(s => `
        <div class="aw-dash-card" onclick="ControleAIS._irParaMonitor(${s.mmsi})">
          <div class="aw-dash-card-nome" title="${this._esc(s.nome)}">${this._esc(s.nome)}</div>
          <span class="aw-tag ${s.status}">${s.status === 'no_prazo' ? 'No prazo' : s.status === 'atencao' ? 'Atenção' : 'Atrasado'}</span>
          <div style="margin-top:6px;">
            <div class="aw-dash-card-linha"><span>Atraso</span><b>+${s.atraso_h.toFixed(1)}h</b></div>
            <div class="aw-dash-card-linha"><span>Alertas</span><b>${s.totalAlertas}</b></div>
          </div>
        </div>
      `).join('');

      el.innerHTML = `
        <div class="aw-dash-titulo">📊 Sala de Situação · AIS</div>
        <div class="aw-dash-sub">Monitoramento de embarcações na Amazônia Legal · Gerência de Estudos e Projetos Hidroviários</div>

        <div class="aw-dash-kpis">
          <div class="aw-dash-kpi">
            <div class="aw-dash-kpi-ico">🚢</div>
            <div class="aw-dash-kpi-v" style="color:#38bdf8;">${r.total}</div>
            <div class="aw-dash-kpi-l">Embarcações</div>
            <div class="aw-dash-kpi-s">em monitoramento</div>
          </div>
          <div class="aw-dash-kpi v">
            <div class="aw-dash-kpi-ico">🟢</div>
            <div class="aw-dash-kpi-v" style="color:#34d399;">${r.no_prazo}</div>
            <div class="aw-dash-kpi-l">No prazo</div>
            <div class="aw-dash-kpi-s">${pctPrazo}% da frota</div>
          </div>
          <div class="aw-dash-kpi a">
            <div class="aw-dash-kpi-ico">🟡</div>
            <div class="aw-dash-kpi-v" style="color:#fbbf24;">${r.atencao}</div>
            <div class="aw-dash-kpi-l">Atenção</div>
            <div class="aw-dash-kpi-s">desvio de 0,5–2h</div>
          </div>
          <div class="aw-dash-kpi r">
            <div class="aw-dash-kpi-ico">🔴</div>
            <div class="aw-dash-kpi-v" style="color:#f87171;">${r.atrasado}</div>
            <div class="aw-dash-kpi-l">Atrasado</div>
            <div class="aw-dash-kpi-s">+2h do previsto</div>
          </div>
          <div class="aw-dash-kpi a">
            <div class="aw-dash-kpi-ico">⏱️</div>
            <div class="aw-dash-kpi-v">${atrasoMedio}<span style="font-size:16px;color:#94a3b8;">h</span></div>
            <div class="aw-dash-kpi-l">Atraso médio</div>
            <div class="aw-dash-kpi-s">por embarcação</div>
          </div>
          <div class="aw-dash-kpi r">
            <div class="aw-dash-kpi-ico">🚨</div>
            <div class="aw-dash-kpi-v" style="color:#f87171;">${r.alertas_criticos}</div>
            <div class="aw-dash-kpi-l">Alertas críticos</div>
            <div class="aw-dash-kpi-s">${r.alertas_atencao} de atenção</div>
          </div>
        </div>

        <div class="aw-dash-secao">
          <div class="aw-dash-sec-tit">
            <span>⚠️ O que exige ação agora</span>
            <span style="color:#38bdf8;font-size:10px;">${alertas.length} alertas</span>
          </div>
          ${alertasTop || '<div style="color:#64748b;font-size:11px;">Nenhum alerta ativo</div>'}
        </div>

        <div class="aw-dash-secao">
          <div class="aw-dash-sec-tit">
            <span>🚢 Embarcações monitoradas</span>
            <span style="color:#38bdf8;font-size:10px;">${lista.length} embarcações</span>
          </div>
          <div class="aw-dash-cards">
            ${cardsEmb || '<div style="color:#64748b;font-size:11px;">Nenhuma embarcação</div>'}
          </div>
        </div>
      `;
    },

    _irParaMonitor(mmsi) {
      this.trocarModo('monitor');
      setTimeout(() => this.selecionar(mmsi), 100);
    },

    /* ============================================================
       FILTROS
       ============================================================ */
    aplicarFiltros() {
      this._filtros.status = document.getElementById('aw-filtro-status')?.value || '';
      this._filtros.tipo = document.getElementById('aw-filtro-tipo')?.value || '';
      this._filtros.perfil = document.getElementById('aw-filtro-perfil')?.value || '';
      this._filtros.corredor = document.getElementById('aw-filtro-corredor')?.value || '';
      this.renderMonitor();
      this._atualizarMapa();
    },

    limparFiltros() {
      ['aw-filtro-status', 'aw-filtro-tipo', 'aw-filtro-perfil', 'aw-filtro-corredor'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      this._filtros = { status: '', tipo: '', perfil: '', corredor: '' };
      this.aplicarFiltros();
    },

    _mmsisFiltrados() {
      const sm = window.AISManager.getStatusPorEmbarcacao();
      const set = new Set();
      sm.forEach((s, mmsi) => {
        if (this._filtros.status && s.status !== this._filtros.status) return;
        if (this._filtros.tipo && s.tipo !== this._filtros.tipo) return;
        if (this._filtros.perfil && s.perfil !== this._filtros.perfil) return;
        if (this._filtros.corredor) {
          const cls = s.corredor?.classificacao || 'dentro';
          if (cls !== this._filtros.corredor) return;
        }
        set.add(mmsi);
      });
      return set;
    },

    _atualizarMapa() {
      if (!window.AISLayer) return;
      if (this._emb) {
        const so = window.AISManager.getTodasPosicoes().filter(p => p.mmsi === this._emb);
        window.AISLayer.renderizarTrilhas(so);
        return;
      }
      const mmsis = this._mmsisFiltrados();
      const todas = window.AISManager.getTodasPosicoes().filter(p => mmsis.has(p.mmsi));
      window.AISLayer.renderizarTrilhas(todas);
    },

    /* ============================================================
       TIMELINE
       ============================================================ */
    _garantirRangeGlobal() {
      const pos = window.AISManager.getTodasPosicoes();
      if (!pos.length) return;
      let tMin = Infinity, tMax = -Infinity;
      pos.forEach(p => {
        const t = new Date(p.timestamp).getTime();
        if (t < tMin) tMin = t;
        if (t > tMax) tMax = t;
      });
      this._tl.tInicio = tMin;
      this._tl.tFim = tMax;
      this._tl.tAtual = tMin;
      this._tl._contexto = 'global';
    },

    _rangeVessel(mmsi) {
      const pos = window.AISManager.getTodasPosicoes().filter(p => p.mmsi === mmsi);
      if (!pos.length) return;
      let tMin = Infinity, tMax = -Infinity;
      pos.forEach(p => {
        const t = new Date(p.timestamp).getTime();
        if (t < tMin) tMin = t;
        if (t > tMax) tMax = t;
      });
      this._tl.tInicio = tMin;
      this._tl.tFim = tMax;
      this._tl.tAtual = tMin;
      this._tl._contexto = 'vessel';
    },

    togglePlay() { this._tl.playing ? this._pausar() : this._play(); },

    _play() {
      const tl = this._tl;
      if (tl.tAtual >= tl.tFim) tl.tAtual = tl.tInicio;
      tl.playing = true;
      const b = document.getElementById('aw-btn-play');
      if (b) { b.innerText = '⏸ Pausar'; b.classList.add('pausado'); }
      tl._timer = setInterval(() => {
        tl.tAtual += tl.vel * 3600 * 1000 * (tl._passo / 1000);
        if (tl.tAtual >= tl.tFim) { tl.tAtual = tl.tFim; this._pausar(); }
        this._atualizarFrame();
      }, tl._passo);
    },

    _pausar() {
      const tl = this._tl;
      tl.playing = false;
      if (tl._timer) clearInterval(tl._timer);
      tl._timer = null;
      const b = document.getElementById('aw-btn-play');
      if (b) { b.innerText = '▶ Play'; b.classList.remove('pausado'); }
    },

    setVel(v) { this._tl.vel = Number(v) || 6; },

    seek(val) {
      const tl = this._tl;
      tl.tAtual = tl.tInicio + (tl.tFim - tl.tInicio) * (Number(val) / 1000);
      this._atualizarFrame();
    },

    _atualizarFrame() {
      const tl = this._tl;
      let pos = window.AISManager.getTodasPosicoes();
      if (!pos.length) return;
      if (this._emb) pos = pos.filter(p => p.mmsi === this._emb);
      if (window.AISLayer) window.AISLayer.renderizarProgressivo(pos, tl.tAtual, tl._janela);

      const label = document.getElementById('aw-tempo');
      if (label) {
        label.innerText = new Date(tl.tAtual).toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
      }
      const s = document.getElementById('aw-slider');
      if (s && tl.tFim > tl.tInicio) {
        s.value = Math.round(((tl.tAtual - tl.tInicio) / (tl.tFim - tl.tInicio)) * 1000);
      }
    },

    /* ============================================================
       EXPORT
       ============================================================ */
    exportarCSV() {
      try {
        const sm = window.AISManager.getStatusPorEmbarcacao();
        const mmsis = this._mmsisFiltrados();
        const linhas = [['mmsi', 'nome', 'tipo', 'perfil', 'status', 'atraso_h', 'total_viagens', 'total_alertas']];
        sm.forEach((s, mmsi) => {
          if (!mmsis.has(mmsi)) return;
          linhas.push([mmsi, '"' + (s.nome || '').replace(/"/g, '""') + '"',
            s.tipo || '', s.perfil || '', s.status || '',
            (s.atraso_h || 0).toFixed(2), s.totalViagens || 0, s.totalAlertas || 0]);
        });
        const csv = linhas.map(l => l.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `embarcacoes-ais-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (window.UI) window.UI.toast('✅ CSV exportado');
      } catch (e) {
        console.error('[AIS] export:', e);
        if (window.UI) window.UI.toast('❌ Falha ao exportar');
      }
    },

    /* ============================================================
       HELPERS
       ============================================================ */
    _esc(s) {
      if (window.Security && window.Security.escapeHTML) return window.Security.escapeHTML(s || '');
      return String(s || '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    },
    _fmt(iso) {
      if (!iso) return '—';
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      } catch (e) { return iso; }
    }
  };
  // ✅ Fecha o painel AIS automaticamente quando o usuário troca para outra aba
  window.addEventListener('tabmudou', function (e) {
    if (e.detail.aba !== 'ais' && ControleAIS._aberto) {
      ControleAIS.fechar();
    }
  });

  window.ControleAIS = ControleAIS;
})();