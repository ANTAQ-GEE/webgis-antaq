/* ============================================================
   M15 — Painel Executivo AIS (Sala de Situação)
   WebGIS ANTAQ — Gerência de Estudos e Projetos Hidroviários
   Versão 2.0 — Consolidado
   ============================================================ */
(function () {
  'use strict';

  const CSS_ID = 'painel-ais-css';

  /* ------------------------------------------------------------
     CSS
     ------------------------------------------------------------ */
  function injetarCSS() {
    if (document.getElementById(CSS_ID)) return;
    const style = document.createElement('style');
    style.id = CSS_ID;
    style.textContent = `
      body.painel-ais-ativo .barra-busca-atributos,
      body.painel-ais-ativo #barra-camadas-superior,
      body.painel-ais-ativo .controles-topo-mapa { display: none !important; }

      /* ---------- TOPBAR (KPIs) ---------- */
      .pai-topbar {
        position: fixed;
        top: 92px; left: 8px; right: 8px;
        z-index: 1450;
        background: rgba(6,20,38,0.97);
        backdrop-filter: blur(10px);
        border: 1px solid #0284c7;
        border-radius: 12px;
        padding: 12px 16px;
        display: none;
        box-shadow: 0 16px 40px rgba(0,0,0,0.6);
        font-family: 'Segoe UI', system-ui, sans-serif;
      }
      .pai-topbar.aberto { display: block; }

      .pai-topbar-header {
        display: flex; justify-content: space-between; align-items: center;
        padding-bottom: 10px; margin-bottom: 12px;
        border-bottom: 1px solid #1e293b;
      }
      .pai-topbar-titulo {
        display: flex; align-items: center; gap: 10px;
      }
      .pai-topbar-titulo-ico {
        font-size: 20px; line-height: 1;
      }
      .pai-topbar-titulo-txt {
        display: flex; flex-direction: column; gap: 1px;
      }
      .pai-topbar-titulo-txt strong {
        font-size: 13px; color: #38bdf8; letter-spacing: 0.3px;
        font-weight: 800; text-transform: uppercase;
      }
      .pai-topbar-titulo-txt small {
        font-size: 10.5px; color: #94a3b8;
      }
      .pai-topbar-acoes {
        display: flex; gap: 8px; align-items: center;
      }
      .pai-btn-acao {
        background: transparent;
        border: 1px solid #334155;
        color: #94a3b8;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.15s;
        display: inline-flex; align-items: center; gap: 5px;
      }
      .pai-btn-acao:hover {
        background: #1e293b; color: #f1f5f9; border-color: #64748b;
      }
      .pai-btn-acao.destaque {
        background: #0284c7; color: #fff; border-color: #38bdf8;
      }
      .pai-btn-acao.destaque:hover {
        background: #0369a1;
      }

      .pai-kpis {
        display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px;
      }
      .pai-kpi {
        background: linear-gradient(135deg, #0b192c 0%, #0a2540 100%);
        border: 1px solid #1e4976;
        border-radius: 8px;
        padding: 12px 14px;
        position: relative; overflow: hidden;
        transition: transform 0.15s, border-color 0.15s;
      }
      .pai-kpi:hover {
        transform: translateY(-1px);
        border-color: #38bdf8;
      }
      .pai-kpi::before {
        content: ''; position: absolute; left: 0; top: 0; bottom: 0;
        width: 3px; background: #38bdf8;
      }
      .pai-kpi.verde::before   { background: #10b981; }
      .pai-kpi.amarelo::before { background: #f59e0b; }
      .pai-kpi.vermelho::before{ background: #ef4444; }
      .pai-kpi-ico {
        font-size: 14px; line-height: 1; margin-bottom: 4px;
        opacity: 0.9;
      }
      .pai-kpi-valor {
        font-size: 26px; font-weight: 800; line-height: 1;
        color: #f1f5f9; letter-spacing: -0.5px;
      }
      .pai-kpi-valor .unidade {
        font-size: 14px; color: #94a3b8; font-weight: 600;
        margin-left: 2px;
      }
      .pai-kpi-label {
        font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.6px;
        color: #94a3b8; font-weight: 700; margin-top: 5px;
      }
      .pai-kpi-sub {
        font-size: 10px; color: #64748b; margin-top: 2px;
      }

      /* ---------- SIDEBAR ---------- */
      .pai-sidebar {
        position: fixed;
        top: 248px; right: 8px; bottom: 8px;
        width: 340px; z-index: 1450;
        background: rgba(11,25,44,0.97);
        backdrop-filter: blur(10px);
        border: 1px solid #0284c7;
        border-radius: 12px;
        display: none;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 16px 40px rgba(0,0,0,0.6);
        font-family: 'Segoe UI', system-ui, sans-serif;
        color: #f1f5f9;
      }
      .pai-sidebar.aberto { display: flex; }
      .pai-side-title {
        padding: 11px 14px;
        font-size: 11px; font-weight: 800;
        text-transform: uppercase; letter-spacing: 0.6px;
        color: #cbd5e1;
        background: #061426;
        border-bottom: 1px solid #1e293b;
        display: flex; justify-content: space-between; align-items: center;
      }
      .pai-side-badge {
        background: #1e4976; color: #38bdf8;
        font-size: 10px; padding: 2px 9px; border-radius: 10px;
        font-weight: 700;
      }
      .pai-side-list { overflow-y: auto; flex: 1; }
      .pai-side-list::-webkit-scrollbar { width: 6px; }
      .pai-side-list::-webkit-scrollbar-track { background: #061426; }
      .pai-side-list::-webkit-scrollbar-thumb {
        background: #1e4976; border-radius: 3px;
      }
      .pai-side-list.vazio {
        display: flex; align-items: center; justify-content: center;
        color: #64748b; font-size: 11px; padding: 20px;
        text-align: center; line-height: 1.6;
      }
      .pai-alerta {
        padding: 11px 14px;
        border-bottom: 1px solid #1e293b;
        border-left: 3px solid #64748b;
        cursor: pointer;
        transition: background 0.15s;
      }
      .pai-alerta:hover { background: #0a2540; }
      .pai-alerta:focus-visible {
        outline: 2px solid #38bdf8;
        outline-offset: -2px;
      }
      .pai-alerta.critico { border-left-color: #ef4444; }
      .pai-alerta.atencao { border-left-color: #f59e0b; }
      .pai-alerta-titulo {
        font-size: 12px; font-weight: 700;
        display: flex; justify-content: space-between; gap: 8px;
      }
      .pai-alerta-tag {
        font-size: 9px; padding: 2px 7px; border-radius: 8px;
        font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;
        white-space: nowrap;
      }
      .pai-alerta.critico .pai-alerta-tag { background: rgba(239,68,68,0.2); color: #f87171; }
      .pai-alerta.atencao .pai-alerta-tag { background: rgba(245,158,11,0.2); color: #fbbf24; }
      .pai-alerta-desc { font-size: 10.5px; color: #94a3b8; margin-top: 4px; line-height: 1.45; }
      .pai-alerta-data {
        font-size: 9.5px; color: #64748b; margin-top: 4px;
        display: flex; align-items: center; gap: 4px;
      }

      /* ---------- CARDS ---------- */
      .pai-cards {
        position: fixed;
        left: 8px; right: 356px; bottom: 8px;
        height: 120px;
        z-index: 1450;
        background: rgba(6,20,38,0.97);
        backdrop-filter: blur(10px);
        border: 1px solid #0284c7;
        border-radius: 12px;
        padding: 12px 14px;
        display: none;
        gap: 10px;
        overflow-x: auto;
        overflow-y: hidden;
        box-shadow: 0 16px 40px rgba(0,0,0,0.6);
        font-family: 'Segoe UI', system-ui, sans-serif;
      }
      .pai-cards.aberto { display: flex; }
      .pai-cards::-webkit-scrollbar { height: 8px; }
      .pai-cards::-webkit-scrollbar-track { background: #061426; }
      .pai-cards::-webkit-scrollbar-thumb {
        background: #1e4976; border-radius: 4px;
      }
      .pai-card {
        flex: 0 0 200px;
        background: linear-gradient(135deg, #0b192c 0%, #0a2540 100%);
        border: 1px solid #1e4976;
        border-radius: 8px;
        padding: 10px 12px;
        cursor: pointer;
        transition: transform 0.12s, border-color 0.12s;
        position: relative; overflow: hidden;
      }
      .pai-card:hover {
        transform: translateY(-2px);
        border-color: #38bdf8;
      }
      .pai-card:focus-visible {
        outline: 2px solid #38bdf8;
        outline-offset: 2px;
      }
      .pai-card::before {
        content: ''; position: absolute; left: 0; top: 0; bottom: 0;
        width: 3px; background: #64748b;
      }
      .pai-card.no_prazo::before { background: #10b981; }
      .pai-card.atencao::before { background: #f59e0b; }
      .pai-card.atrasado::before { background: #ef4444; }
      .pai-card-nome {
        font-size: 11px; font-weight: 700; color: #f1f5f9;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        margin-bottom: 6px;
      }
      .pai-card-status {
        font-size: 8.5px; padding: 2px 7px; border-radius: 10px;
        font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;
        display: inline-block; margin-bottom: 7px;
      }
      .pai-card-status.no_prazo { background: rgba(16,185,129,0.2); color: #34d399; }
      .pai-card-status.atencao { background: rgba(245,158,11,0.2); color: #fbbf24; }
      .pai-card-status.atrasado { background: rgba(239,68,68,0.2); color: #f87171; }
      .pai-card-info {
        display: flex; justify-content: space-between;
        font-size: 9.5px; color: #94a3b8; margin-bottom: 2px;
      }
      .pai-card-info b { color: #cbd5e1; font-weight: 700; }

      /* ---------- LOADING / ERRO / VAZIO ---------- */
      .pai-loading {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; gap: 12px;
        padding: 40px 20px; color: #94a3b8;
        font-size: 12px;
      }
      .pai-loading-spinner {
        width: 28px; height: 28px;
        border: 3px solid #1e4976;
        border-top-color: #38bdf8;
        border-radius: 50%;
        animation: pai-spin 0.9s linear infinite;
      }
      @keyframes pai-spin {
        to { transform: rotate(360deg); }
      }
      .pai-erro {
        display: flex; flex-direction: column; align-items: center;
        gap: 10px; padding: 40px 20px; text-align: center;
      }
      .pai-erro-ico { font-size: 32px; }
      .pai-erro-titulo { font-size: 13px; color: #f87171; font-weight: 700; }
      .pai-erro-desc { font-size: 11px; color: #94a3b8; max-width: 380px; line-height: 1.5; }
      .pai-erro-btn {
        background: #0284c7; color: #fff; border: none;
        border-radius: 6px; padding: 8px 16px;
        font-size: 11px; font-weight: 700; cursor: pointer;
        font-family: inherit; margin-top: 6px;
      }
      .pai-erro-btn:hover { background: #0369a1; }

      /* ---------- RODAPÉ ---------- */
      .pai-rodape {
        position: fixed;
        bottom: 132px; left: 8px;
        z-index: 1450;
        font-size: 9.5px; color: #64748b;
        font-family: 'Segoe UI', system-ui, sans-serif;
        padding: 4px 10px;
        background: rgba(6,20,38,0.85);
        border-radius: 4px;
        display: none;
        gap: 12px;
      }
      .pai-rodape.aberto { display: flex; }
      .pai-rodape b { color: #94a3b8; font-weight: 600; }
    `;
    document.head.appendChild(style);
  }

  /* ------------------------------------------------------------
     PAINEL EXECUTIVO
     ------------------------------------------------------------ */
  const PainelAIS = {
    _aberto: false,
    _estado: 'carregando', // 'carregando' | 'pronto' | 'erro'

    async abrir() {
      if (window.ControleAIS && window.ControleAIS._aberto) {
        window.ControleAIS.fechar();
      }

      injetarCSS();
      this._garantirHTML();    

      document.querySelectorAll('.aba-btn').forEach(b =>
        b.classList.remove('ativo', 'ativa', 'active')
      );
      const btn = document.querySelector('.aba-btn[data-aba="painel"]');
      if (btn) btn.classList.add('ativo');

      const pc = document.getElementById('painel-camadas-lateral');
      if (pc) pc.style.display = 'none';

      document.body.classList.add('painel-ais-ativo');

      document.getElementById('pai-topbar').classList.add('aberto');
      document.getElementById('pai-sidebar').classList.add('aberto');
      document.getElementById('pai-cards').classList.add('aberto');
      document.getElementById('pai-rodape').classList.add('aberto');

      this._aberto = true;

      // Estado inicial: loading
      this._estado = 'carregando';
      this._renderizarLoading();

      try {
        if (!window.AISManager || !window.AISManager._pronto) {
          const ok = await window.AISManager.carregar();
          if (!ok) throw new Error('Falha ao carregar dados AIS');
        }

        if (window.AISManager && !window.AISManager._visivel) {
          window.AISManager._visivel = true;
          if (window.AISLayer) window.AISLayer.mostrar();
        }

        this._estado = 'pronto';
        this.renderizar();
      } catch (err) {
        console.error('[PainelAIS] erro:', err);
        this._estado = 'erro';
        this._renderizarErro(err.message || 'Erro desconhecido');
      }
    },

    fechar() {
      document.body.classList.remove('painel-ais-ativo');
      ['pai-topbar', 'pai-sidebar', 'pai-cards', 'pai-rodape'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('aberto');
      });

      const pc = document.getElementById('painel-camadas-lateral');
      if (pc) pc.style.display = '';

      document.querySelectorAll('.aba-btn').forEach(b =>
        b.classList.remove('ativo', 'ativa', 'active')
      );
      const btnMapa = document.querySelector('.aba-btn[data-aba="mapa"]');
      if (btnMapa) btnMapa.classList.add('ativo');

      this._aberto = false;
    },

    _garantirHTML() {
      if (document.getElementById('pai-topbar')) return;

      const topbar = document.createElement('div');
      topbar.id = 'pai-topbar';
      topbar.className = 'pai-topbar';
      topbar.setAttribute('role', 'region');
      topbar.setAttribute('aria-label', 'Sala de Situação AIS');
      document.body.appendChild(topbar);

      const sidebar = document.createElement('div');
      sidebar.id = 'pai-sidebar';
      sidebar.className = 'pai-sidebar';
      sidebar.setAttribute('role', 'complementary');
      sidebar.setAttribute('aria-label', 'Alertas ativos');
      document.body.appendChild(sidebar);

      const cards = document.createElement('div');
      cards.id = 'pai-cards';
      cards.className = 'pai-cards';
      cards.setAttribute('role', 'region');
      cards.setAttribute('aria-label', 'Embarcações monitoradas');
      document.body.appendChild(cards);

      const rodape = document.createElement('div');
      rodape.id = 'pai-rodape';
      rodape.className = 'pai-rodape';
      rodape.setAttribute('role', 'contentinfo');
      document.body.appendChild(rodape);
    },

    renderizar() {
      if (!this._aberto || this._estado !== 'pronto') return;
      try {
        this._renderizarKpis();
        this._renderizarAlertas();
        this._renderizarCards();
        this._renderizarRodape();
      } catch (err) {
        console.error('[PainelAIS] erro render:', err);
        this._renderizarErro('Erro ao renderizar dados: ' + err.message);
      }
    },

    /* -------------------- Estados -------------------- */
    _renderizarLoading() {
      const topbar = document.getElementById('pai-topbar');
      const sidebar = document.getElementById('pai-sidebar');
      const cards = document.getElementById('pai-cards');
      const rodape = document.getElementById('pai-rodape');
      const html = `
        <div class="pai-loading">
          <div class="pai-loading-spinner"></div>
          <span>Carregando dados AIS...</span>
        </div>`;
      if (topbar) topbar.innerHTML = html;
      if (sidebar) sidebar.innerHTML = html;
      if (cards) cards.innerHTML = html;
      if (rodape) rodape.innerHTML = '';
    },

    _renderizarErro(msg) {
      const erroHTML = `
        <div class="pai-erro">
          <div class="pai-erro-ico">⚠️</div>
          <div class="pai-erro-titulo">Não foi possível carregar o painel</div>
          <div class="pai-erro-desc">${this._escapar(msg)}</div>
          <button class="pai-erro-btn" onclick="PainelAIS.abrir()">Tentar novamente</button>
        </div>`;

      ['pai-topbar', 'pai-sidebar', 'pai-cards'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = erroHTML;
      });
      const rodape = document.getElementById('pai-rodape');
      if (rodape) rodape.innerHTML = '';
    },

    /* -------------------- KPIs -------------------- */
    _renderizarKpis() {
      const el = document.getElementById('pai-topbar');
      if (!el) return;

      const r = window.AISManager.getResumo();
      const atrasoMedio = (r.atraso_medio_h || 0).toFixed(1);
      const pctPrazo = r.total ? Math.round((r.no_prazo / r.total) * 100) : 0;

      el.innerHTML = `
        <div class="pai-topbar-header">
          <div class="pai-topbar-titulo">
            <span class="pai-topbar-titulo-ico">🎛️</span>
            <div class="pai-topbar-titulo-txt">
              <strong>Sala de Situação AIS</strong>
              <small>Monitoramento de embarcações · Amazônia Legal · Gerência de Estudos e Projetos Hidroviários</small>
            </div>
          </div>
          <div class="pai-topbar-acoes">
            <button class="pai-btn-acao" onclick="PainelAIS.exportarResumo()" title="Exportar resumo em JSON">
              ⬇ Exportar resumo
            </button>
            <button class="pai-btn-acao destaque" onclick="PainelAIS.fechar()" title="Fechar painel">
              ✕ Fechar
            </button>
          </div>
        </div>

        <div class="pai-kpis">
          <div class="pai-kpi">
            <div class="pai-kpi-ico">🚢</div>
            <div class="pai-kpi-valor">${r.total}</div>
            <div class="pai-kpi-label">Embarcações</div>
            <div class="pai-kpi-sub">em monitoramento</div>
          </div>
          <div class="pai-kpi verde">
            <div class="pai-kpi-ico">🟢</div>
            <div class="pai-kpi-valor" style="color:#34d399;">${r.no_prazo}</div>
            <div class="pai-kpi-label">No prazo</div>
            <div class="pai-kpi-sub">${pctPrazo}% da frota</div>
          </div>
          <div class="pai-kpi amarelo">
            <div class="pai-kpi-ico">🟡</div>
            <div class="pai-kpi-valor" style="color:#fbbf24;">${r.atencao}</div>
            <div class="pai-kpi-label">Atenção</div>
            <div class="pai-kpi-sub">+0,5h a 2h</div>
          </div>
          <div class="pai-kpi vermelho">
            <div class="pai-kpi-ico">🔴</div>
            <div class="pai-kpi-valor" style="color:#f87171;">${r.atrasado}</div>
            <div class="pai-kpi-label">Atrasado</div>
            <div class="pai-kpi-sub">+2h acima do previsto</div>
          </div>
          <div class="pai-kpi amarelo">
            <div class="pai-kpi-ico">⏱️</div>
            <div class="pai-kpi-valor">${atrasoMedio}<span class="unidade">h</span></div>
            <div class="pai-kpi-label">Atraso médio</div>
            <div class="pai-kpi-sub">por embarcação</div>
          </div>
          <div class="pai-kpi vermelho">
            <div class="pai-kpi-ico">🚨</div>
            <div class="pai-kpi-valor" style="color:#f87171;">${r.alertas_criticos}</div>
            <div class="pai-kpi-label">Alertas críticos</div>
            <div class="pai-kpi-sub">${r.alertas_atencao} de atenção</div>
          </div>
        </div>
      `;
    },

    /* -------------------- Alertas -------------------- */
    _renderizarAlertas() {
      const sidebar = document.getElementById('pai-sidebar');
      if (!sidebar) return;

      const alertas = window.AISManager.getTodosAlertas();

      const headerHTML = `
        <div class="pai-side-title">
          <span>⚠️ O que exige ação agora</span>
          <span class="pai-side-badge">${alertas.length}</span>
        </div>`;

      if (!alertas.length) {
        sidebar.innerHTML = headerHTML +
          '<div class="pai-side-list vazio">Nenhum alerta ativo no momento.<br>Todas as embarcações dentro da tolerância.</div>';
        return;
      }

      const LABEL = {
        atraso: 'Atraso',
        parada_nao_prevista: 'Parada',
        desempenho_baixo: 'Desempenho'
      };

      const itensHTML = alertas.slice(0, 15).map(a => `
        <div class="pai-alerta ${a.severidade}"
             role="button"
             tabindex="0"
             onclick="PainelAIS._abrirNoControle(${a.mmsi})"
             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();PainelAIS._abrirNoControle(${a.mmsi});}">
          <div class="pai-alerta-titulo">
            <span>${this._escapar(a.nome)}</span>
            <span class="pai-alerta-tag">${LABEL[a.tipo] || a.tipo}</span>
          </div>
          <div class="pai-alerta-desc">${this._escapar(a.descricao)}</div>
          <div class="pai-alerta-data">🕒 ${this._formatarData(a.timestamp)}</div>
        </div>
      `).join('');

      sidebar.innerHTML = headerHTML + `<div class="pai-side-list">${itensHTML}</div>`;
    },

    /* -------------------- Cards -------------------- */
    _renderizarCards() {
      const el = document.getElementById('pai-cards');
      if (!el) return;

      const statusMap = window.AISManager.getStatusPorEmbarcacao();
      const lista = [...statusMap.values()].sort((a, b) => b.atraso_h - a.atraso_h);

      if (!lista.length) {
        el.innerHTML = '<div class="pai-loading">Nenhuma embarcação monitorada</div>';
        return;
      }

      const LABEL = { no_prazo: 'No prazo', atencao: 'Atenção', atrasado: 'Atrasado' };

      el.innerHTML = lista.map(s => {
        const atrasoTxt = s.atraso_h > 0 ? `+${s.atraso_h.toFixed(1)}h` : '0h';
        return `
          <div class="pai-card ${s.status}"
               role="button"
               tabindex="0"
               onclick="PainelAIS._abrirNoControle(${s.mmsi})"
               onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();PainelAIS._abrirNoControle(${s.mmsi});}">
            <div class="pai-card-nome" title="${this._escapar(s.nome)}">${this._escapar(s.nome)}</div>
            <span class="pai-card-status ${s.status}">${LABEL[s.status] || s.status}</span>
            <div class="pai-card-info"><span>Atraso</span><b>${atrasoTxt}</b></div>
            <div class="pai-card-info"><span>Alertas</span><b>${s.totalAlertas}</b></div>
          </div>
        `;
      }).join('');
    },

    /* -------------------- Rodapé -------------------- */
    _renderizarRodape() {
      const el = document.getElementById('pai-rodape');
      if (!el) return;
      const agora = new Date().toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      el.innerHTML = `
        <span><b>Fonte:</b> AIS · dados de demonstração</span>
        <span><b>Atualizado em:</b> ${agora}</span>
        <span><b>Sistema:</b> WebGIS ANTAQ · GEE/SEPH</span>
      `;
    },

    /* -------------------- Ações -------------------- */
    _abrirNoControle(mmsi) {
      this.fechar();
      if (window.ControleAIS) {
        window.ControleAIS.abrir().then(() => {
          window.ControleAIS.selecionarEmbarcacao(mmsi);
        });
      }
    },

    exportarResumo() {
      try {
        const r = window.AISManager.getResumo();
        const statusMap = window.AISManager.getStatusPorEmbarcacao();
        const embarcacoes = [...statusMap.values()].map(s => ({
          mmsi: s.mmsi,
          nome: s.nome,
          tipo: s.tipo,
          perfil: s.perfil,
          status: s.status,
          atraso_h: s.atraso_h,
          total_viagens: s.totalViagens,
          total_alertas: s.totalAlertas
        }));

        const payload = {
          gerado_em: new Date().toISOString(),
          fonte: 'WebGIS ANTAQ — Sala de Situação AIS',
          resumo: r,
          embarcacoes
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resumo-ais-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.UI) window.UI.toast('✅ Resumo exportado');
      } catch (err) {
        console.error('[PainelAIS] erro ao exportar:', err);
        if (window.UI) window.UI.toast('❌ Falha ao exportar');
      }
    },

    /* -------------------- Helpers -------------------- */
    _escapar(s) {
      if (window.Security && window.Security.escapeHTML) return window.Security.escapeHTML(s || '');
      return String(s || '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    },

    _formatarData(iso) {
      if (!iso) return '—';
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit',
          hour: '2-digit', minute: '2-digit'
        });
      } catch (e) { return iso; }
    }
  };

  window.PainelAIS = PainelAIS;
})();