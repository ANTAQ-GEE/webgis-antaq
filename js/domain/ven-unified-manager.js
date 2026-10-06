/* ============================================================
   WebGIS ANTAQ — Módulo: VENUnifiedManager
   Escopo: card unificado do VEN com seletor de safra
   Dependências: window.CONFIG_CAMADAS, window.CAMADAS_MAPA,
                 window.DADOS_GEOJSON_BRUTOS, window.DataManager,
                 window.Styler, window.UI, window.ActionHistory,
                 window.mapa
   Expõe: window.VENUnifiedManager
   ============================================================ */
(function () {
  'use strict';

  const VENUnifiedManager = {
    anoAtivo: 'ven_2022',
    ligado: true,

    construirCard: function (container) {
      if (!container) return;
      let card = document.getElementById('item-camada-ven-unificado');
      if (card) card.remove();

      card = document.createElement('div');
      card.className = 'item-camada item-camada-pasta';
      card.id = 'item-camada-ven-unificado';
      card.style.border = '1px solid #bae6fd';
      card.style.background = '#f0f9ff';
      card.innerHTML = `
        <div class="item-camada-linha-topo">
          <div class="camada-info-bloco">
            <span class="legenda-cor" style="background:#00e5ff; box-shadow:0 0 4px #00e5ff;"></span>
            <span class="camada-titulo-txt" style="color:#0369a1; font-weight:700;">Vias Navegadas (VEN)</span>
            <span class="badge-contador" id="cnt-ven-unificado">(carregando...)</span>
          </div>
          <label class="switch" title="Ligar/Desligar Malha Hidroviária">
            <input type="checkbox" id="chk-ven-unificado" checked onchange="VENUnifiedManager.toggle(this.checked)">
            <span class="slider"></span>
          </label>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:6px; background:#e0f2fe; padding:4px 8px; border-radius:5px; font-size:10.5px;">
          <span style="font-weight:700; color:#0369a1;">📁 Safra Selecionada:</span>
          <select id="sel-safra-ven-painel" onchange="VENUnifiedManager.mudarSafra(this.value)" style="padding:2px 6px; font-size:11px; border:1px solid #0284c7; border-radius:4px; background:#fff; font-weight:700; color:#0284c7; cursor:pointer;">
            <option value="ven_2024">2024 (Oficial V4)</option>
            <option value="ven_2022" selected>2022 (Série Histórica)</option>
            <option value="ven_2020">2020</option>
            <option value="ven_2018">2018</option>
            <option value="ven_2013">2013</option>
          </select>
        </div>
        <div class="camada-acoes-barra" style="border-top-color:#bae6fd;">
          <button class="btn-acao-chip" onclick="MatrizVENManager.abrirModal()" style="color:#0284c7; font-weight:700;">⏱️ Matriz VEN</button>
          <button class="btn-acao-chip" onclick="zoomCamada(VENUnifiedManager.anoAtivo)">🔍 Zoom</button>
          <button class="btn-acao-chip" onclick="toggleGavetaEstilo('ven-unificado')">🎨 Estilo</button>
          <button class="btn-acao-chip" onclick="ExportManager.baixarPlanilhaExcel()">📊 Excel</button>
          <button class="btn-acao-chip" onclick="ExportManager.exportarGeoJSON(VENUnifiedManager.anoAtivo)">💾 GeoJSON</button>
        </div>
        <div class="gaveta-painel" id="gaveta-ven-unificado" style="background:#f8fafc;">
          <div class="linha-ajuste">
            <span>Opacidade:</span>
            <input type="range" min="0.1" max="1" step="0.05" value="0.9" oninput="VENUnifiedManager.atualizarOpacidade(parseFloat(this.value))">
          </div>
          <div class="linha-ajuste">
            <span>Espessura:</span>
            <input type="range" min="1" max="8" step="0.5" value="2.8" oninput="VENUnifiedManager.atualizarPeso(parseFloat(this.value))">
          </div>
        </div>`;
      container.insertBefore(card, container.firstChild);
    },

    mudarSafra: async function (novoAno, opcoes) {
      opcoes = opcoes || {};
      const anoVelho = this.anoAtivo;

      if (!opcoes.semHistorico && anoVelho !== novoAno && window.ActionHistory) {
        const self = this;
        window.ActionHistory.registrar({
          tipo: 'mudar-safra-ven',
          descricao: `Trocar safra VEN para ${novoAno.replace('ven_', '')}`,
          undo: () => self.mudarSafra(anoVelho, { semHistorico: true }),
          redo: () => self.mudarSafra(novoAno, { semHistorico: true })
        });
      }

      if (CAMADAS_MAPA[anoVelho] && mapa.hasLayer(CAMADAS_MAPA[anoVelho])) {
        mapa.removeLayer(CAMADAS_MAPA[anoVelho]);
      }
      this.anoAtivo = novoAno;

      const selP = document.getElementById('sel-safra-ven-painel');
      if (selP) selP.value = novoAno;
      const selB = document.getElementById('filtro-subtipo-dinamico');
      const selCamadaB = document.getElementById('sel-camada-busca');
      if (selB && selCamadaB && selCamadaB.value === 'ven') selB.value = novoAno;

      if (this.ligado) {
        if (window.UI) window.UI.toast(`Carregando malha VEN ${novoAno.replace('ven_', '')}...`);
        try {
          await window.DataManager.carregarCamada(novoAno);
          if (CAMADAS_MAPA[novoAno]) {
            CAMADAS_MAPA[novoAno].addTo(mapa);
            const qtd = DADOS_GEOJSON_BRUTOS[novoAno]?.features?.length || 0;
            const cnt = document.getElementById('cnt-ven-unificado');
            if (cnt) cnt.innerText = `(${qtd})`;
            if (window.UI) window.UI.toast(`✓ VEN ${novoAno.replace('ven_', '')}: ${qtd} trechos.`);
          }
        } catch (e) {
          if (window.UI) window.UI.toast(`⚠️ Base ${novoAno} não encontrada. Voltando para 2022.`);
          this.anoAtivo = 'ven_2022';
          if (CAMADAS_MAPA['ven_2022']) CAMADAS_MAPA['ven_2022'].addTo(mapa);
          if (selP) selP.value = 'ven_2022';
        }
      }
      if (window.Styler) window.Styler.atualizarLegenda();
    },

    toggle: function (ligar, opcoes) {
      opcoes = opcoes || {};
      const estavaLigado = this.ligado;

      if (!opcoes.semHistorico && window.ActionHistory && estavaLigado !== ligar) {
        const self = this;
        window.ActionHistory.registrar({
          tipo: 'toggle-ven',
          descricao: `${ligar ? 'Ligar' : 'Desligar'} camada "Vias Navegadas (VEN)"`,
          undo: () => {
            const chk = document.getElementById('chk-ven-unificado');
            if (chk) chk.checked = estavaLigado;
            self.toggle(estavaLigado, { semHistorico: true });
          },
          redo: () => {
            const chk = document.getElementById('chk-ven-unificado');
            if (chk) chk.checked = ligar;
            self.toggle(ligar, { semHistorico: true });
          }
        });
      }

      this.ligado = ligar;
      const ano = this.anoAtivo;

      if (ligar) {
        if (CAMADAS_MAPA[ano]) {
          if (!mapa.hasLayer(CAMADAS_MAPA[ano])) CAMADAS_MAPA[ano].addTo(mapa);
        } else {
          window.DataManager.carregarCamada(ano).then(() => {
            if (CAMADAS_MAPA[ano] && !mapa.hasLayer(CAMADAS_MAPA[ano])) CAMADAS_MAPA[ano].addTo(mapa);
            const qtd = DADOS_GEOJSON_BRUTOS[ano]?.features?.length || 0;
            const cnt = document.getElementById('cnt-ven-unificado');
            if (cnt) cnt.innerText = `(${qtd})`;
          });
        }
      } else {
        for (const a of ['ven_2024', 'ven_2022', 'ven_2020', 'ven_2018', 'ven_2013']) {
          if (CAMADAS_MAPA[a] && mapa.hasLayer(CAMADAS_MAPA[a])) mapa.removeLayer(CAMADAS_MAPA[a]);
        }
      }
      if (window.Styler) window.Styler.atualizarLegenda();
    },

    atualizarOpacidade: function (val) {
      const ano = this.anoAtivo;
      if (CONFIG_CAMADAS[ano]) CONFIG_CAMADAS[ano].opacidade = val;
      if (CAMADAS_MAPA[ano]) CAMADAS_MAPA[ano].setStyle({ opacity: val });
    },

    atualizarPeso: function (val) {
      const ano = this.anoAtivo;
      if (CONFIG_CAMADAS[ano]) CONFIG_CAMADAS[ano].peso = val;
      if (CAMADAS_MAPA[ano]) CAMADAS_MAPA[ano].setStyle({ weight: val });
    }
  };

  window.VENUnifiedManager = VENUnifiedManager;
  console.info('[js] VENUnifiedManager carregado');
})();