/* ============================================================
   WebGIS ANTAQ — Módulo: StylerTKU (M12 — extensão)
   Escopo: adiciona suporte a TKU ao Styler sem modificar o original
   Dependências: window.Styler, window.DADOS_GEOJSON_BRUTOS,
                 window.Security, turf (global)
   Expõe: (estende window.Styler)
   ============================================================ */
(function () {
  'use strict';

  if (!window.Styler) {
    console.error('[M12] Styler não carregado. Verifique a ordem dos scripts.');
    return;
  }

  const Styler = window.Styler;

  /* ============================================================
     1. FAIXAS DO TKU (percentis)
     ============================================================ */
  Styler._calcularFaixasTKU = function () {
    const dados = window.DADOS_GEOJSON_BRUTOS['tku'];
    if (!dados?.features?.length) {
      return { p30: 100000, p50: 300000, p70: 600000, p90: 900000 };
    }

    const fluxos = dados.features
      .map(f => Number(f.properties?.fluxo) || 0)
      .filter(v => v > 0)
      .sort((a, b) => a - b);

    const p = (n) => fluxos[Math.floor(fluxos.length * n)] || 0;

    const faixas = {
      p30: p(0.30),
      p50: p(0.50),
      p70: p(0.70),
      p90: p(0.90)
    };

    console.info('[M12] Faixas TKU calculadas:', faixas);
    return faixas;
  };

  /* ============================================================
     2. OPÇÕES DA CAMADA TKU
     ============================================================ */
  Styler._obterOpcoesTKU = function (cfg) {
    if (!this._tkuFaixas) {
      this._tkuFaixas = this._calcularFaixasTKU();
    }

    const calcPeso = (fluxo) => {
      if (!fluxo || fluxo <= 0) return 1;
      if (fluxo > this._tkuFaixas.p90) return 10;
      if (fluxo > this._tkuFaixas.p70) return 8;
      if (fluxo > this._tkuFaixas.p50) return 6;
      if (fluxo > this._tkuFaixas.p30) return 4;
      return 2.5;
    };

    const calcCor = (fluxo) => {
      if (!fluxo || fluxo <= 0) return '#94a3b8';
      if (fluxo > this._tkuFaixas.p90) return '#dc2626';
      if (fluxo > this._tkuFaixas.p70) return '#f97316';
      if (fluxo > this._tkuFaixas.p50) return '#f59e0b';
      if (fluxo > this._tkuFaixas.p30) return '#84cc16';
      return '#10b981';
    };

    return {
      pane: 'paneLinhas',
      interactive: true,
      style: (f) => {
        const fluxo = Number(f.properties?.fluxo) || 0;
        return {
          pane: 'paneLinhas',
          color: calcCor(fluxo),
          weight: calcPeso(fluxo),
          opacity: 0.85,
          fill: false,
          lineCap: 'round'
        };
      },
      onEachFeature: (f, layer) => {
        const p = f.properties || {};
        const fluxoFmt = p.fluxo >= 1000
          ? `${(p.fluxo / 1000).toFixed(0)} mil`
          : (p.fluxo || 0).toFixed(0);
        const fluxoBruto = p.fluxo
          ? Number(p.fluxo).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
          : '—';
        const badgeCor = calcCor(Number(p.fluxo) || 0);

        const linhas = `
          <div class="pop-linha"><span class="pop-lbl">Ano:</span><span class="pop-val"><strong>${p.ano || '—'}</strong></span></div>
          <div class="pop-linha"><span class="pop-lbl">Navegação:</span><span class="pop-val">${window.Security.escapeHTML(p.navegacao || '—')}</span></div>
          <div class="pop-linha"><span class="pop-lbl">Trecho:</span><span class="pop-val">${window.Security.escapeHTML(p.nome || '—')}</span></div>
          <div class="pop-linha"><span class="pop-lbl">OD:</span><span class="pop-val">${window.Security.escapeHTML((p.municipio_origem || '?') + '/' + (p.uf_origem || '?'))} → ${window.Security.escapeHTML((p.municipio_destino || '—') + (p.uf_destino ? '/' + p.uf_destino : ''))}</span></div>
          <div class="pop-linha"><span class="pop-lbl">Rio:</span><span class="pop-val">${window.Security.escapeHTML(p.nome_rio || '—')}</span></div>
          <div class="pop-linha"><span class="pop-lbl">Extensão:</span><span class="pop-val">${p.extensao ? p.extensao.toFixed(1) + ' km' : '—'}</span></div>
          <div class="pop-linha"><span class="pop-lbl">Velocidade:</span><span class="pop-val">${p.velocidade ? p.velocidade + ' km/h' : '—'}</span></div>
        `;

        const html = `
          <div class="pop-topo" style="background:linear-gradient(135deg, #0a2540 0%, ${badgeCor} 100%);">
            🚢 TKU · Tonelada-Quilômetro Útil
          </div>
          <div class="pop-corpo">
            <div style="background:${badgeCor}22;border-left:4px solid ${badgeCor};padding:10px 12px;border-radius:6px;margin-bottom:10px;">
              <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Fluxo de Carga</div>
              <div style="font-size:22px;color:${badgeCor};font-weight:800;font-family:Consolas,monospace;margin-top:2px;">
                ${fluxoFmt} <span style="font-size:11px;opacity:0.7;">t·km</span>
              </div>
              <div style="font-size:10.5px;color:#64748b;font-family:Consolas,monospace;">${fluxoBruto}</div>
            </div>
            ${linhas}
          </div>
          <div class="pop-rodape-auditoria">
            <span>Fonte: ANTAQ / Mercante</span>
            <span>Verificado: ${new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        `;

        layer.bindPopup(html);

        if (p.nome) {
          layer.bindTooltip(
            `<strong>${window.Security.escapeHTML(p.nome.slice(0, 40))}</strong><br>
             <small style="color:${badgeCor};">${p.ano} · ${window.Security.escapeHTML(p.navegacao || '')} · ${fluxoFmt} t·km</small>`,
            { sticky: true, className: 'rotulo-hover-feicao' }
          );
        }
      }
    };
  };

  /* ============================================================
     3. INTERCEPTA obterOpcoes pra retornar as opções TKU quando for id='tku'
     ============================================================ */
  const obterOpcoesOriginal = Styler.obterOpcoes;
  Styler.obterOpcoes = function (id) {
    if (id === 'tku') {
      return this._obterOpcoesTKU(window.CONFIG_CAMADAS[id] || {});
    }
    return obterOpcoesOriginal.apply(this, arguments);
  };

  /* ============================================================
     4. ESTENDE atualizarLegenda pra incluir o gradiente TKU
     ============================================================ */
  const atualizarLegendaOriginal = Styler.atualizarLegenda;
  Styler.atualizarLegenda = function () {
    // Chama a versão original (que já lida com todas as outras camadas)
    atualizarLegendaOriginal.apply(this, arguments);

    // ✅ Adiciona bloco especial do TKU SE estiver ativo
    const cfg = window.CONFIG_CAMADAS['tku'];
    if (!cfg) return;

    const estaAtiva = (window.CAMADAS_MAPA['tku'] && window.mapa.hasLayer(window.CAMADAS_MAPA['tku']))
                   || (!window.CAMADAS_MAPA['tku'] && cfg.ativa);
    if (!estaAtiva) return;

    const corpo = document.getElementById('corpo-legenda');
    if (!corpo) return;

    // Verifica se já foi adicionado (evita duplicação)
    if (corpo.querySelector('[data-tku-legend]')) return;

    const div = document.createElement('div');
    div.setAttribute('data-tku-legend', '1');
    div.style.marginBottom = '6px';
    div.style.width = '100%';
    div.innerHTML = `
      <div style="font-weight:700; color:#0f172a; font-size:11px; margin-bottom:4px;">📦 TKU — Intensidade de Carga</div>
      <div style="display:flex; flex-direction:column; gap:3px;">
        <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#10b981; height:2.5px; width:24px;"></span><span>Muito baixo (&lt; p30)</span></div>
        <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#84cc16; height:4px; width:24px;"></span><span>Baixo (p30-p50)</span></div>
        <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#f59e0b; height:6px; width:24px;"></span><span>Médio (p50-p70)</span></div>
        <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#f97316; height:8px; width:24px;"></span><span>Alto (p70-p90)</span></div>
        <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#dc2626; height:10px; width:24px;"></span><span>Muito alto (&gt; p90)</span></div>
      </div>
    `;
    corpo.appendChild(div);
  };

  /* ============================================================
     5. LEGENDA — modo "por ano" (alternativo ao gradiente de fluxo)
     ============================================================ */
  const atualizarLegendaBase = Styler.atualizarLegenda;
  Styler.atualizarLegenda = function () {
    atualizarLegendaBase.apply(this, arguments);

    const cfg = window.CONFIG_CAMADAS['tku'];
    if (!cfg) return;

    const estaAtiva = (window.CAMADAS_MAPA['tku'] && window.mapa.hasLayer(window.CAMADAS_MAPA['tku']))
                   || (!window.CAMADAS_MAPA['tku'] && cfg.ativa);
    if (!estaAtiva) return;

    const corpo = document.getElementById('corpo-legenda');
    if (!corpo) return;

    // Remove legenda antiga do TKU (vai ser re-adicionada no modo atual)
    const antiga = corpo.querySelector('[data-tku-legend]');
    if (antiga) antiga.remove();

    const modoAno = window.TKUManager && window.TKUManager.modoCor === 'ano';

    const div = document.createElement('div');
    div.setAttribute('data-tku-legend', '1');
    div.style.marginBottom = '6px';
    div.style.width = '100%';

    if (modoAno) {
      // Modo ANO: 3 cores fixas
      div.innerHTML = `
        <div style="font-weight:700; color:#0f172a; font-size:11px; margin-bottom:4px;">📦 TKU — por Ano</div>
        <div style="display:flex; flex-direction:column; gap:3px;">
          <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#3b82f6; height:4px; width:24px;"></span><span>2021</span></div>
          <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#f59e0b; height:4px; width:24px;"></span><span>2023</span></div>
          <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#dc2626; height:4px; width:24px;"></span><span>2025</span></div>
        </div>
      `;
    } else {
      // Modo FLUXO: gradiente
      div.innerHTML = `
        <div style="font-weight:700; color:#0f172a; font-size:11px; margin-bottom:4px;">📦 TKU — Intensidade de Carga</div>
        <div style="display:flex; flex-direction:column; gap:3px;">
          <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#10b981; height:2.5px; width:24px;"></span><span>Muito baixo (&lt; p30)</span></div>
          <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#84cc16; height:4px; width:24px;"></span><span>Baixo (p30-p50)</span></div>
          <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#f59e0b; height:6px; width:24px;"></span><span>Médio (p50-p70)</span></div>
          <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#f97316; height:8px; width:24px;"></span><span>Alto (p70-p90)</span></div>
          <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#dc2626; height:10px; width:24px;"></span><span>Muito alto (&gt; p90)</span></div>
        </div>
      `;
    }
    corpo.appendChild(div);
  };

  console.info('[js] StylerTKU carregado (M12 — extensão do Styler)');
})();