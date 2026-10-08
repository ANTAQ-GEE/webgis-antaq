/* ============================================================
   WebGIS ANTAQ — Módulo: app.js
   Escopo: funções auxiliares do painel + inicialização da aplicação
   Dependências: todos os módulos anteriores + DOM pronto
   Expõe: funções globais em window (para onclick do HTML)
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     CONSTRUTOR DE ITEM DE CAMADA
     ============================================================ */
  function construirItemCamada(id, cfg, grupoEl) {
    if (id === 'unidades_conservacao') return;
    if (!grupoEl) return;

    const ocultas = window.CatalogoManager.obterOcultas();
    const estaOculta = ocultas.includes(id);

    const item = document.createElement('div');
    item.className = 'item-camada';
    item.id = `item-camada-${id}`;
    if (estaOculta) item.style.display = 'none';

    let subpaletaHTML = '';

    if (id === 'instalacoes_portuarias') {
      let listaSubHTML = '';
      for (const [tKey, cat] of Object.entries(window.PortClassification.tipos)) {
        listaSubHTML += `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:3px 0;">
            <div style="display:flex; align-items:center; gap:6px;">
              <input type="color" id="subcolor-${tKey}" value="${cat.cor}" onchange="Styler.atualizarSubcamadaPorto('${tKey}', this.value)" style="width:16px; height:16px; border:none; padding:0; background:transparent; cursor:pointer;" title="${cat.nome}">
              <span>${cat.nome}</span>
              <span class="badge-contador" id="subcnt-${tKey}"></span>
            </div>
            <input type="checkbox" id="chk-sub-${tKey}" checked onchange="toggleSubcamadaPorto('${tKey}', this.checked)">
          </div>`;
      }
      subpaletaHTML = `
        <div style="margin-top:6px; padding:8px 10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; font-size:10px; display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
            <span style="font-weight:700; color:#0a2540;">Subcamadas de Outorga (ANTAQ):</span>
            <span style="font-size:9px; color:#0284c7; cursor:pointer; font-weight:700;" onclick="toggleTodasSubcamadasPortos(true)">Marcar Todas</span>
          </div>
          ${listaSubHTML}
        </div>`;
      } else if (id === 'tku') {
        // ✅ M12 — Filtros específicos do TKU
        subpaletaHTML = `
          <div style="margin-top:6px; padding:10px 12px; background:linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border:1px solid #fdba74; border-radius:6px; font-size:11px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-weight:800; color:#9a3412;">📅 Anos:</span>
              <div style="display:flex; gap:5px;">
                <button type="button" class="btn-acao-chip" style="background:#fff;border:1px solid #fdba74;color:#9a3412;font-size:9px;padding:2px 6px;" onclick="TKUManager.filtrarAno(2021)">2021</button>
                <button type="button" class="btn-acao-chip" style="background:#fff;border:1px solid #fdba74;color:#9a3412;font-size:9px;padding:2px 6px;" onclick="TKUManager.filtrarAno(2023)">2023</button>
                <button type="button" class="btn-acao-chip" style="background:#fff;border:1px solid #fdba74;color:#9a3412;font-size:9px;padding:2px 6px;" onclick="TKUManager.filtrarAno(2025)">2025</button>
                <button type="button" class="btn-acao-chip" style="background:#fff;border:1px solid #fdba74;color:#9a3412;font-size:9px;padding:2px 6px;" onclick="TKUManager.mostrarTodos()">Todos</button>
              </div>
            </div>

            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
              <label style="display:flex; align-items:center; gap:4px; font-weight:600; color:#7c2d12;">
                <input type="checkbox" id="tku-ano-2021" checked onchange="TKUManager.aplicarFiltro()">
                <span>2021</span>
              </label>
              <label style="display:flex; align-items:center; gap:4px; font-weight:600; color:#7c2d12;">
                <input type="checkbox" id="tku-ano-2023" checked onchange="TKUManager.aplicarFiltro()">
                <span>2023</span>
              </label>
              <label style="display:flex; align-items:center; gap:4px; font-weight:600; color:#7c2d12;">
                <input type="checkbox" id="tku-ano-2025" checked onchange="TKUManager.aplicarFiltro()">
                <span>2025</span>
              </label>
            </div>

            <div style="border-top:1px dashed #fdba74; margin:6px 0; padding-top:6px;">
              <div style="font-weight:800; color:#9a3412; margin-bottom:4px;">🚢 Navegação:</div>
              <div style="display:flex; flex-wrap:wrap; gap:6px;">
                <label style="display:flex; align-items:center; gap:4px; font-weight:600; color:#7c2d12;">
                  <input type="checkbox" id="tku-nav-cabotagem" checked onchange="TKUManager.aplicarFiltro()">
                  <span>Cabotagem</span>
                </label>
                <label style="display:flex; align-items:center; gap:4px; font-weight:600; color:#7c2d12;">
                  <input type="checkbox" id="tku-nav-interior" checked onchange="TKUManager.aplicarFiltro()">
                  <span>Interior</span>
                </label>
                <label style="display:flex; align-items:center; gap:4px; font-weight:600; color:#7c2d12;">
                  <input type="checkbox" id="tku-nav-longo" checked onchange="TKUManager.aplicarFiltro()">
                  <span>Longo Curso</span>
                </label>
              </div>
            </div>

            <div style="border-top:1px dashed #fdba74; margin:8px 0 4px; padding-top:8px;">
              <button type="button" id="btn-tku-modo-cor"
                      onclick="TKUManager.alternarModoCor()"
                      style="width:100%; padding:6px 10px; border:none; border-radius:5px; font-size:10.5px; font-weight:800; color:#fff; cursor:pointer; background:linear-gradient(135deg, #f97316 0%, #dc2626 100%); letter-spacing:0.3px;">
                🎨 Cor por: FLUXO
              </button>
              <div style="font-size:9px; color:#9a3412; margin-top:4px; font-style:italic; text-align:center;">
                Alterne entre <strong>fluxo</strong> (gradiente) e <strong>ano</strong> (2021=azul, 2023=âmbar, 2025=vermelho)
              </div>
            </div>
          </div>
        `;
      } else if (id === 'ucs_todas_mma') {
      const esferasUC = [
        { id: 'Federal', nome: '🏛️ Federal (ICMBio/União)', cor: '#15803d' },
        { id: 'Estadual', nome: '🏢 Estadual (OEMA)', cor: '#059669' },
        { id: 'Municipal', nome: '🏙️ Municipal (Prefeituras)', cor: '#0d9488' },
        { id: 'Privada', nome: '🌲 RPPN / Privada', cor: '#84cc16' }
      ];
      let listaSubHTML = '';
      for (const esf of esferasUC) {
        listaSubHTML += `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:3px 0;">
            <div style="display:flex; align-items:center; gap:6px;">
              <input type="color" id="subcolor-uc-${esf.id}" value="${esf.cor}" onchange="Styler.atualizarSubcamadaUC('${esf.id}', this.value)" style="width:16px; height:16px; border:none; padding:0; background:transparent; cursor:pointer;">
              <span style="font-weight:600; color:#1e293b;">${esf.nome}</span>
              <span class="badge-contador" id="subcnt-uc-${esf.id}"></span>
            </div>
            <input type="checkbox" id="chk-sub-uc-${esf.id}" checked onchange="toggleSubcamadaUC('${esf.id}', this.checked)">
          </div>`;
      }
      subpaletaHTML = `
        <div style="margin-top:6px; padding:8px 10px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; font-size:10px; display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
            <span style="font-weight:700; color:#14532d;">🏛️ Subcamadas por Esfera:</span>
            <span style="font-size:9px; color:#0284c7; cursor:pointer; font-weight:700;" onclick="toggleTodasSubcamadasUC(true)">Marcar Todas</span>
          </div>
          ${listaSubHTML}
        </div>`;
    }

    const ehPorto = (id === 'instalacoes_portuarias');
    const ehMulti = (id === 'instalacoes_portuarias' || id === 'ucs_todas_mma');

    const indicadorHTML = ehMulti
      ? `<span class="legenda-cor" id="indicador-cor-${id}" style="display:inline-flex; align-items:center; justify-content:center; background:#0a2540; color:#38bdf8; font-size:11px;" onclick="toggleGavetaEstilo('${id}')" title="Camada Multicategórica">${id === 'instalacoes_portuarias' ? '⚓' : '🏛️'}</span>`
      : `<span class="legenda-cor" id="indicador-cor-${id}" style="background:${cfg.cor};" onclick="toggleGavetaEstilo('${id}')" title="Personalizar estilo"></span>`;

    const gavetaConteudo = ehPorto
      ? `
        <div style="font-size:10px; color:#64748b; margin-bottom:6px; line-height:1.3;"><i>💡 Camada multicategórica: cores definidas individualmente acima.</i></div>
        <div class="linha-ajuste">
          <span>Opacidade Geral:</span>
          <input type="range" min="0.1" max="1" step="0.05" value="${cfg.opacidade}" oninput="this.nextElementSibling.innerText = Math.round(this.value * 100) + '%'" onchange="Styler.atualizar('${id}', 'opacidade', parseFloat(this.value))">
          <span style="min-width:35px; text-align:right;">${Math.round(cfg.opacidade * 100)}%</span>
        </div>
        <div class="linha-ajuste">
          <span>Tamanho dos Pontos:</span>
          <input type="range" min="2" max="15" step="1" value="${cfg.peso}" oninput="this.nextElementSibling.innerText = this.value + 'px'; Styler.atualizar('${id}', 'peso', parseInt(this.value))">
          <span style="min-width:35px; text-align:right;">${cfg.peso}px</span>
        </div>`
      : `
        <div class="linha-ajuste">
          <span>Cor:</span>
          <input type="color" id="color-picker-${id}" value="${cfg.cor}" onchange="Styler.atualizar('${id}', 'cor', this.value)">
        </div>
        <div class="linha-ajuste">
          <span>Opacidade:</span>
          <input type="range" min="0.1" max="1" step="0.05" value="${cfg.opacidade}" oninput="this.nextElementSibling.innerText = Math.round(this.value * 100) + '%'" onchange="Styler.atualizar('${id}', 'opacidade', parseFloat(this.value))">
          <span style="min-width:35px; text-align:right;">${Math.round(cfg.opacidade * 100)}%</span>
        </div>
        <div class="linha-ajuste">
          <span>Espessura / Raio:</span>
          <input type="range" min="1" max="12" step="0.5" value="${cfg.peso}" oninput="this.nextElementSibling.innerText = this.value + 'px'" onchange="Styler.atualizar('${id}', 'peso', parseFloat(this.value))">
          <span style="min-width:35px; text-align:right;">${cfg.peso}px</span>
        </div>`;

    item.innerHTML = `
      <div class="item-camada-linha-topo">
        <div class="camada-info-bloco">
          ${indicadorHTML}
          <span class="camada-titulo-txt">${cfg.nome}</span>
          <span class="badge-contador" id="cnt-${id}"></span>
          <span class="badge-erro" id="err-${id}"></span>
          <button class="btn-meta-camada" title="Ver metadados da camada" onclick="event.stopPropagation(); LayerMetadata.abrir('${id}')">ℹ️</button>
        </div>
        <label class="switch" title="Ligar/Desligar Camada">
          <input type="checkbox" id="chk-${id}" ${cfg.ativa ? 'checked' : ''} onchange="toggleCamada('${id}', this.checked)">
          <span class="slider"></span>
        </label>
      </div>
      <div class="camada-acoes-barra">
        <button class="btn-acao-chip" title="Mover para Cima" onclick="LayerOrderManager.mover('${id}', 'cima')">▲</button>
        <button class="btn-acao-chip" title="Mover para Baixo" onclick="LayerOrderManager.mover('${id}', 'baixo')">▼</button>
        <button class="btn-acao-chip" title="Ajustar Estilo" onclick="toggleGavetaEstilo('${id}')">🎨 Estilo</button>
        <button class="btn-acao-chip" title="Tabela de Atributos" onclick="abrirTabela('${id}')">📋 Tabela</button>
        <button class="btn-acao-chip" title="Zoom" onclick="zoomCamada('${id}')">🔍</button>
        <button class="btn-acao-chip" title="Exportar GeoJSON" onclick="ExportManager.exportarGeoJSON('${id}')">💾</button>
        ${cfg._isBuffer || id.startsWith('imp_') || id.startsWith('buffer_') ? `
          <button class="btn-acao-chip btn-excluir" title="Excluir permanentemente" onclick="CatalogoManager.excluirPermanentemente('${id}')">🗑️ Excluir</button>
        ` : ''}
        <button class="btn-acao-chip btn-retirar" title="Retirar do painel" onclick="CatalogoManager.ocultarCamada('${id}')">✕ Retirar</button>
      </div>
      ${subpaletaHTML}
      <div class="gaveta-painel" id="gaveta-${id}">
        ${gavetaConteudo}
      </div>`;

    item.draggable = true;
    item.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', id); item.classList.add('arrastando'); });
    item.addEventListener('dragend', () => { item.classList.remove('arrastando'); window.LayerOrderManager.sincronizarOrdemMapa(grupoEl); });

    if (!grupoEl._dragConfigurado) {
      grupoEl._dragConfigurado = true;
      grupoEl.addEventListener('dragover', e => {
        e.preventDefault();
        const arrastando = grupoEl.querySelector('.arrastando');
        if (!arrastando) return;
        const apos = window.LayerOrderManager.obterElementoAposArrasto(grupoEl, e.clientY);
        if (apos == null) grupoEl.appendChild(arrastando);
        else grupoEl.insertBefore(arrastando, apos);
      });
      grupoEl.addEventListener('drop', e => {
        e.preventDefault();
        window.LayerOrderManager.sincronizarOrdemMapa(grupoEl);
      });
    }
    grupoEl.appendChild(item);
  }

  /* ============================================================
     CONSTRUTOR DO PAINEL LATERAL
     ============================================================ */
  function construirPainelLateral() {
    const grupoInfra = document.getElementById('grupo-infra');
    if (grupoInfra) window.VENUnifiedManager.construirCard(grupoInfra);

    for (const [id, cfg] of Object.entries(window.CONFIG_CAMADAS)) {
      if (id.startsWith('ven_')) continue;
      const grupo = document.getElementById(`grupo-${cfg.grupo}`);
      if (!grupo) continue;
      construirItemCamada(id, cfg, grupo);
    }
  }

  /* ============================================================
     TOGGLES DE UI DO PAINEL
     ============================================================ */
  function toggleGavetaEstilo(id) {
    const g = document.getElementById(`gaveta-${id}`);
    if (g) g.classList.toggle('aberta');
  }

  function toggleSubcamadaUC(esfId, ligar) {
    if (!window.SUBGRUPOS_UCS || !window.SUBGRUPOS_UCS[esfId]) return;
    const fg = window.SUBGRUPOS_UCS[esfId];
    const fgPai = window.CAMADAS_MAPA['ucs_todas_mma'] || window.CAMADAS_MAPA['ucs_federais'];

    // ✅ Manipula DENTRO do featureGroup pai
    if (ligar) {
      if (fgPai && !fgPai.hasLayer(fg)) fgPai.addLayer(fg);
    } else {
      if (fgPai && fgPai.hasLayer(fg)) fgPai.removeLayer(fg);
    }

    let ativos = 0;
    const total = window.DADOS_GEOJSON_BRUTOS['ucs_todas_mma']?.features?.length || 0;
    for (const [k, subFg] of Object.entries(window.SUBGRUPOS_UCS)) {
      const chk = document.getElementById(`chk-sub-uc-${k}`);
      if (chk && chk.checked) ativos += subFg.getLayers().length;
    }
    const cntEl = document.getElementById('cnt-ucs_todas_mma');
    if (cntEl) cntEl.innerText = (ativos === total) ? `(${total})` : `(${ativos}/${total})`;
    window.Styler.atualizarLegenda();
  }
window.toggleModoInterativo = function () {
  window._modoInterativo = !window._modoInterativo;
  if (window.UI) {
    window.UI.toast(window._modoInterativo
      ? '🎛️ Modo interativo ativo — camadas pesadas respondem a clique'
      : '🎛️ Modo interativo desligado — pan mais rápido');
  }
  // Recarrega camadas pesadas
  ['tis_poligonais', 'ucs_federais'].forEach(id => {
    if (CAMADAS_MAPA[id] && mapa.hasLayer(CAMADAS_MAPA[id])) {
      mapa.removeLayer(CAMADAS_MAPA[id]);
      delete DADOS_GEOJSON_BRUTOS[id];
      delete CAMADAS_MAPA[id];
      if (window.DataManager) window.DataManager.carregarCamada(id);
    }
  });
};
  function toggleTodasSubcamadasUC(ligar) {
    for (const k of ['Federal', 'Estadual', 'Municipal', 'Privada', 'Outros']) {
      const chk = document.getElementById(`chk-sub-uc-${k}`);
      if (chk) chk.checked = ligar;
      if (window.SUBGRUPOS_UCS && window.SUBGRUPOS_UCS[k]) {
        const fg = window.SUBGRUPOS_UCS[k];
        const fgPai = window.CAMADAS_MAPA['ucs_todas_mma'] || window.CAMADAS_MAPA['ucs_federais'];

        // ✅ Manipula DENTRO do featureGroup pai
        if (ligar) {
          if (fgPai && !fgPai.hasLayer(fg)) fgPai.addLayer(fg);
        } else {
          if (fgPai && fgPai.hasLayer(fg)) fgPai.removeLayer(fg);
        }
      }
    }
    const total = window.DADOS_GEOJSON_BRUTOS['ucs_todas_mma']?.features?.length || 0;
    const cntEl = document.getElementById('cnt-ucs_todas_mma');
    if (cntEl) cntEl.innerText = ligar ? `(${total})` : `(0/${total})`;
    window.Styler.atualizarLegenda();
  }

  function toggleSubcamadaPorto(subtipo, ligar) {
    if (!window.SUBGRUPOS_PORTOS || !window.SUBGRUPOS_PORTOS[subtipo]) return;
    const fg = window.SUBGRUPOS_PORTOS[subtipo];
    const fgPai = window.CAMADAS_MAPA['instalacoes_portuarias'];

    // ✅ Manipula DENTRO do featureGroup pai (evita duplicação)
    if (ligar) {
      if (fgPai && !fgPai.hasLayer(fg)) fgPai.addLayer(fg);
    } else {
      if (fgPai && fgPai.hasLayer(fg)) fgPai.removeLayer(fg);
    }

    let ativos = 0;
    const total = window.DADOS_GEOJSON_BRUTOS['instalacoes_portuarias']?.features?.length || 1179;
    const ligadosChaves = [];
    for (const [tKey, subFg] of Object.entries(window.SUBGRUPOS_PORTOS)) {
      const chk = document.getElementById(`chk-sub-${tKey}`);
      if (chk && chk.checked) { ativos += subFg.getLayers().length; ligadosChaves.push(tKey); }
    }
    const cntEl = document.getElementById('cnt-instalacoes_portuarias');
    if (cntEl) cntEl.innerText = (ativos === total) ? `(${total})` : `(${ativos}/${total})`;

    const sel = document.getElementById('filtro-subtipo-dinamico');
    const selCamada = document.getElementById('sel-camada-busca');
    if (sel && selCamada && selCamada.value === 'instalacoes_portuarias') {
      if (ligadosChaves.length === 1) sel.value = ligadosChaves[0];
      else if (ligadosChaves.length === Object.keys(window.PortClassification.tipos).length) sel.value = 'TODOS';
    }
    window.Styler.atualizarLegenda();
  }

  function toggleTodasSubcamadasPortos(ligar) {
    const fgPai = window.CAMADAS_MAPA['instalacoes_portuarias'];

    for (const tKey of Object.keys(window.PortClassification.tipos)) {
      const chk = document.getElementById(`chk-sub-${tKey}`);
      if (chk) chk.checked = ligar;
      if (window.SUBGRUPOS_PORTOS && window.SUBGRUPOS_PORTOS[tKey]) {
        const fg = window.SUBGRUPOS_PORTOS[tKey];

        // ✅ Manipula DENTRO do featureGroup pai
        if (ligar) {
          if (fgPai && !fgPai.hasLayer(fg)) fgPai.addLayer(fg);
        } else {
          if (fgPai && fgPai.hasLayer(fg)) fgPai.removeLayer(fg);
        }
      }
    }
    const total = window.DADOS_GEOJSON_BRUTOS['instalacoes_portuarias']?.features?.length || 1179;
    const cntEl = document.getElementById('cnt-instalacoes_portuarias');
    if (cntEl) cntEl.innerText = ligar ? `(${total})` : `(0/${total})`;
    const sel = document.getElementById('filtro-subtipo-dinamico');
    if (sel) sel.value = ligar ? 'TODOS' : '';
    window.Styler.atualizarLegenda();
  }

  /* ============================================================
     TOGGLE DE CAMADA (ligar/desligar)
     ============================================================ */
  async function toggleCamada(id, ligar, opcoes) {
    opcoes = opcoes || {};

    // ✅ Captura estado ANTES de qualquer await, com guard contra undefined
    const layerAtual = window.CAMADAS_MAPA?.[id];
    const estadoAnterior = layerAtual ? window.mapa.hasLayer(layerAtual) : false;

    if (!window.CAMADAS_MAPA[id] || !window.DADOS_GEOJSON_BRUTOS[id]) {
      if (window.UI) window.UI.toast(`Carregando camada "${window.CONFIG_CAMADAS[id]?.nome || id}"...`);
      try {
        await window.DataManager.carregarCamada(id);
      } catch (e) {
        if (window.UI) window.UI.toast(`⚠️ Falha ao carregar ${window.CONFIG_CAMADAS[id]?.nome || id}`);
        return;
      }
    }

    // ✅ Registra no histórico ANTES de mudar o mapa (usa estadoAnterior capturado)
    if (!opcoes.semHistorico && estadoAnterior !== ligar) {
      const nome = window.CONFIG_CAMADAS[id]?.nome || id;
      window.ActionHistory.registrar({
        tipo: 'toggle-camada',
        descricao: `${ligar ? 'Ligar' : 'Desligar'} camada "${nome}"`,
        undo: () => {
          const chk = document.getElementById(`chk-${id}`);
          if (chk) chk.checked = estadoAnterior;
          toggleCamada(id, estadoAnterior, { semHistorico: true });
        },
        redo: () => {
          const chk = document.getElementById(`chk-${id}`);
          if (chk) chk.checked = ligar;
          toggleCamada(id, ligar, { semHistorico: true });
        }
      });
    }

    if (ligar) {
      if (!window.mapa.hasLayer(window.CAMADAS_MAPA[id])) window.CAMADAS_MAPA[id].addTo(window.mapa);
      const grupo = document.getElementById(`grupo-${window.CONFIG_CAMADAS[id]?.grupo}`);
      if (grupo) window.LayerOrderManager.sincronizarOrdemMapa(grupo);
    } else {
      if (window.mapa.hasLayer(window.CAMADAS_MAPA[id])) window.mapa.removeLayer(window.CAMADAS_MAPA[id]);
    }
    window.Styler.atualizarLegenda();

    if (!opcoes.semHistorico && estadoAnterior !== ligar) {
      const nome = window.CONFIG_CAMADAS[id]?.nome || id;
      window.ActionHistory.registrar({
        tipo: 'toggle-camada',
        descricao: `${ligar ? 'Ligar' : 'Desligar'} camada "${nome}"`,
        undo: () => {
          const chk = document.getElementById(`chk-${id}`);
          if (chk) chk.checked = estadoAnterior;
          toggleCamada(id, estadoAnterior, { semHistorico: true });
        },
        redo: () => {
          const chk = document.getElementById(`chk-${id}`);
          if (chk) chk.checked = ligar;
          toggleCamada(id, ligar, { semHistorico: true });
        }
      });
    }
  }

  /* ============================================================
     ZOOM EM CAMADA
     ============================================================ */
  async function zoomCamada(id) {
    // ✅ Carrega sob demanda se ainda não carregou
    if (!window.DADOS_GEOJSON_BRUTOS[id]?.features?.length) {
      if (window.UI) window.UI.toast(`⏳ Carregando ${window.CONFIG_CAMADAS[id]?.nome || id}...`);
      try {
        await window.DataManager.carregarCamada(id);
      } catch (e) {
        if (window.UI) window.UI.toast(`⚠️ Falha ao carregar: ${e.message || e}`);
        return;
      }
    }

    // ✅ Liga a camada no mapa se ainda não está visível
    if (window.CAMADAS_MAPA[id] && !window.mapa.hasLayer(window.CAMADAS_MAPA[id])) {
      window.CAMADAS_MAPA[id].addTo(window.mapa);
    }

    if (window.CAMADAS_MAPA[id]) {
      try {
        const bounds = window.CAMADAS_MAPA[id].getBounds();
        if (bounds.isValid()) {
          window.mapa.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }
      } catch (e) {
        if (window.UI) window.UI.toast("Não foi possível calcular os limites da camada.");
      }
    }
  }

  /* ============================================================
     ABRIR TABELA DE ATRIBUTOS
     ============================================================ */
  async function abrirTabela(id) {
    await window.TabelaManager.abrir(id);
  }

  /* ============================================================
     EXPOR FUNÇÕES GLOBAIS (para onclick do HTML)
     ============================================================ */
  window.construirItemCamada = construirItemCamada;
  window.construirPainelLateral = construirPainelLateral;
  window.toggleGavetaEstilo = toggleGavetaEstilo;
  window.toggleSubcamadaUC = toggleSubcamadaUC;
  window.toggleTodasSubcamadasUC = toggleTodasSubcamadasUC;
  window.toggleSubcamadaPorto = toggleSubcamadaPorto;
  window.toggleTodasSubcamadasPortos = toggleTodasSubcamadasPortos;
  window.toggleCamada = toggleCamada;
  window.zoomCamada = zoomCamada;
  window.abrirTabela = abrirTabela;

  /* ============================================================
     HANDLERS GLOBAIS (fora do init)
     ============================================================ */
  window.addEventListener('click', (e) => {
    const dropAmb = document.getElementById('drop-ambiente');
    if (dropAmb && !e.target.closest('#drop-ambiente')) dropAmb.classList.remove('aberto');
    const resBusca = document.getElementById('resultados-busca');
    if (resBusca && !e.target.closest('.barra-busca-atributos')) resBusca.style.display = 'none';
  });

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */
  (async function init() {
    // ✅ 1e-2: captura o parâmetro ?copiloto= ANTES do URLState.init() apagá-lo
    try {
      const paramsIniciais = new URLSearchParams(location.search);
      const perguntaInicial = paramsIniciais.get('copiloto');
      if (perguntaInicial) {
        window._copilotoConsultaPendente = perguntaInicial;
        console.info('[Copiloto] Consulta capturada da URL (pré-boot):', perguntaInicial);
      }
    } catch (e) { /* ignora */ }

    if (window.location.protocol === 'file:') {
      console.warn('Execução em file:// detectada. Navegadores bloqueiam fetch local.');
      setTimeout(() => {
        if (window.UI) window.UI.toast('⚠️ Abrindo como arquivo local. Use um servidor (Live Server / Python) para carregar as camadas.');
      }, 1500);
    }

    try {
      await window.LayerRegistry.carregarManifest();
    } catch (e) { console.warn('Manifesto não carregado:', e); }

    window.FilterManager.atualizarSeletorCamadas();
    construirPainelLateral();
    window.FilterManager.aoMudarCamada("instalacoes_portuarias");
    window.Styler.atualizarLegenda();

    // ✅ UI básica IMEDIATAMENTE (mapa já está pronto desde map.js)
    // ✅ M9: BufferTool não precisa de init() — é ativado por clique no botão
    try { await window.URLState.init(); } catch (e) { console.warn('[URLState] init falhou:', e); }
    try { window.WebGISAbout.init(); } catch (e) { console.warn('[WebGISAbout] init falhou:', e); }
    try { window.MapExtras.init(); } catch (e) { console.warn('[MapExtras] init falhou:', e); }
    try { window.SelectionManager.init(); } catch (e) { console.warn('[SelectionManager] init falhou:', e); }
    // ✅ M11: Inicializa sistema de abas
    try { window.TabManager.init(); } catch (e) { console.warn('[TabManager] init falhou:', e); }
      // ✅ M13: Inicializa estudos/PDFs
    try { window.EstudosManager.init(); } catch (e) { console.warn('[EstudosManager] init falhou:', e); }      
    // ✅ 1e-2: executa a consulta capturada no boot (ou tenta ler da URL, como fallback)
    setTimeout(() => {
      try {
        if (!window.CopilotoIA) return;

        if (window._copilotoConsultaPendente) {
          window.CopilotoIA._executarConsultaPendente(window._copilotoConsultaPendente);
        } else {
          // Fallback: se algo reescreveu a URL, ainda tenta
          window.CopilotoIA.verificarConsultaNaUrl();
        }
      } catch (e) {
        console.warn('[CopilotoIA] execução da consulta pendente falhou:', e);
      }
    }, 2200);
    // ✅ Boot leve: carrega SÓ as camadas essenciais
    const essenciais = ['instalacoes_portuarias', 'uf', 'ven_2022'];
    Promise.allSettled(essenciais.map(id =>
      window.DataManager.carregarCamada(id).catch(() => {})
    )).then(() => {
      if (window.CAMADAS_MAPA['ven_2022']) {
        window.CAMADAS_MAPA['ven_2022'].addTo(window.mapa);
        const qtd = window.DADOS_GEOJSON_BRUTOS['ven_2022']?.features?.length || 0;
        const cnt = document.getElementById('cnt-ven-unificado');
        if (cnt) cnt.innerText = qtd > 0 ? `(${qtd})` : '';
        window.VENUnifiedManager.anoAtivo = 'ven_2022';
      }
      console.info('[boot] Camadas essenciais carregadas.');
    });
    // ⚠️ NÃO carregar as outras no boot — só sob demanda

    // ✅ Fecha o histórico do copiloto com ESC
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        const m = document.getElementById('modal-copiloto-historico');
        if (m && m.classList.contains('aberto')) {
          ev.stopPropagation();
          if (window.CopilotoIA) window.CopilotoIA.fecharHistoricoCopiloto();
        }
      }
    });
    const modalHist = document.getElementById('modal-historico-notif');
    if (modalHist) {
      modalHist.addEventListener('click', (ev) => {
        if (ev.target === modalHist) window.NotificationManager.fecharHistorico();
      });
    }

    // Atalho GD3
    document.addEventListener('keydown', (ev) => {
      if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT' || ev.target.tagName === 'TEXTAREA') return;
      if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && ev.key.toLowerCase() === 'd') {
        ev.preventDefault();
        window.SafraDiffManager.abrir();
      }
    });

    // Handlers R2 (validador)
    const modalVal = document.getElementById('modal-validacao');
    if (modalVal) {
      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && modalVal.classList.contains('aberto')) {
          ev.stopPropagation();
          window.GeoJSONValidator.fecharRelatorio();
        }
      });
      modalVal.addEventListener('click', (ev) => {
        if (ev.target === modalVal) window.GeoJSONValidator.fecharRelatorio();
      });
    }

    // Atalhos medição
      document.addEventListener('keydown', (ev) => {
        const alvo = ev.target;
        const tag = alvo.tagName;
        const tipo = (alvo.type || '').toLowerCase();
        const ehInputTexto = tag === 'TEXTAREA' ||
          (tag === 'INPUT' && ['text', 'search', 'email', 'url', 'password', 'number'].includes(tipo));
        if (ehInputTexto || tag === 'SELECT') return;
      if (ev.key === 'd' || ev.key === 'D') window.MeasurementTool.ativar('distancia');
      if (ev.key === 'a' || ev.key === 'A') window.MeasurementTool.ativar('area');
      if (ev.key === 'r' || ev.key === 'R') window.MeasurementTool.ativar('raio');
      if (ev.key === 'Escape') window.MeasurementTool.desativar();
    });

    // Handlers de impressão
    window.addEventListener('beforeprint', () => {
      document.body.setAttribute('data-data-impressao',
        new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }));
      if (window.mapa && window.mapa.invalidateSize) setTimeout(() => window.mapa.invalidateSize(), 50);
    });
    window.addEventListener('afterprint', () => {
      if (window.mapa && window.mapa.invalidateSize) setTimeout(() => window.mapa.invalidateSize(), 100);
    });

    console.info('✓ WebGIS ANTAQ inicializado com sucesso.');
    console.info('💡 Dica: pressione "d" (distância), "a" (área), "r" (raio) para medir.');
  })();

})();