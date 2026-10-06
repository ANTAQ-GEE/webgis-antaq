/* ============================================================
   WebGIS ANTAQ — Módulo: SafraDiffManager (GD3)
   Escopo: diff visual entre safras VEN (adicionados/removidos/
           mantidos/modificados)
   Dependências: window.DADOS_GEOJSON_BRUTOS, window.DataManager,
                 window.Security, window.UI, window.mapa,
                 turf (global)
   Expõe: window.SafraDiffManager
   ============================================================ */
(function () {
  'use strict';

  const SafraDiffManager = {
    _resultado: null,
    _camadasDiff: [],
    _toleranciaMetros: 500,
    _limiarModificacaoPct: 20,

    abrir: async function () {
      const modal = document.getElementById('modal-diff-safras');
      if (!modal) {
        console.error('[GD3] Modal não encontrado no DOM!');
        if (window.UI) window.UI.toast('⚠️ Modal de comparação não encontrado.');
        return;
      }

      if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }

      modal.style.cssText = `
        display: flex !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 9999999 !important;
        background: rgba(10, 25, 47, 0.9) !important;
        justify-content: center !important;
        align-items: center !important;
        padding: 20px !important;
        box-sizing: border-box !important;
        overflow: auto !important;
        backdrop-filter: blur(8px) !important;
      `;

      modal.classList.add('aberto');

      document.getElementById('diff-placeholder').style.display = 'block';
      document.getElementById('diff-resultado').style.display = 'none';
      document.getElementById('btn-diff-exportar').disabled = true;

      const rect = modal.getBoundingClientRect();
      console.log('[GD3] Modal aberto. Rect:', {
        top: rect.top, left: rect.left,
        width: rect.width, height: rect.height,
        visibility: getComputedStyle(modal).visibility,
        opacity: getComputedStyle(modal).opacity
      });
    },

    fechar: function () {
      const modal = document.getElementById('modal-diff-safras');
      if (modal) {
        modal.classList.remove('aberto');
        modal.style.display = 'none';
      }
    },

    limparMapa: function () {
      this._camadasDiff.forEach(c => {
        try { if (mapa.hasLayer(c)) mapa.removeLayer(c); } catch (e) {}
      });
      this._camadasDiff = [];
      if (window.UI) window.UI.toast('🧹 Mapa limpo.');
    },

    comparar: async function () {
      const selA = document.getElementById('diff-safra-a');
      const selB = document.getElementById('diff-safra-b');
      if (!selA || !selB) return;

      const safraA = selA.value;
      const safraB = selB.value;

      if (safraA === safraB) {
        if (window.UI) window.UI.toast('⚠️ Selecione duas safras diferentes.');
        return;
      }

      const btn = document.getElementById('btn-diff-comparar');
      btn.disabled = true;
      btn.innerHTML = '<span class="girando" style="display:inline-block;">⏳</span> Comparando...';

      try {
        if (!DADOS_GEOJSON_BRUTOS[safraA]) await window.DataManager.carregarCamada(safraA);
        if (!DADOS_GEOJSON_BRUTOS[safraB]) await window.DataManager.carregarCamada(safraB);
      } catch (e) {
        if (window.UI) window.UI.toast(`⚠️ Falha ao carregar safras: ${e.message}`);
        btn.disabled = false;
        btn.innerHTML = '🔍 Comparar';
        return;
      }

      const dadosA = DADOS_GEOJSON_BRUTOS[safraA];
      const dadosB = DADOS_GEOJSON_BRUTOS[safraB];

      if (!dadosA || !dadosB) {
        if (window.UI) window.UI.toast('⚠️ Safras não carregadas.');
        btn.disabled = false;
        btn.innerHTML = '🔍 Comparar';
        return;
      }

      await new Promise(r => setTimeout(r, 50));
      const resultado = this._calcularDiff(dadosA.features, dadosB.features, safraA, safraB);
      this._resultado = resultado;

      this._renderizarResultado(resultado);
      this._desenharNoMapa(resultado);

      btn.disabled = false;
      btn.innerHTML = '🔍 Comparar';
      document.getElementById('btn-diff-exportar').disabled = false;
      if (window.UI) window.UI.toast(`✓ Comparação concluída: ${resultado.adicionados.length} adicionados, ${resultado.removidos.length} removidos.`);
    },

    _calcularDiff: function (featuresA, featuresB, safraA, safraB) {
      const resultado = {
        safraA, safraB,
        adicionados: [],
        removidos: [],
        mantidos: [],
        modificados: [],
        extensaoA: 0,
        extensaoB: 0
      };

      resultado.extensaoA = featuresA.reduce((s, f) => s + (Number(f.properties.extensao) || 0), 0);
      resultado.extensaoB = featuresB.reduce((s, f) => s + (Number(f.properties.extensao) || 0), 0);

      const bboxA = featuresA.map((f, i) => {
        try {
          const b = L.geoJSON(f).getBounds();
          return { idx: i, bounds: b.isValid() ? b : null, feature: f };
        } catch (e) { return { idx: i, bounds: null, feature: f }; }
      });

      const matchesB = new Set();
      const matchesA = new Set();

      for (let j = 0; j < featuresB.length; j++) {
        const fB = featuresB[j];
        let boundsB;
        try {
          boundsB = L.geoJSON(fB).getBounds();
        } catch (e) { boundsB = null; }

        if (!boundsB || !boundsB.isValid()) {
          resultado.adicionados.push(fB);
          continue;
        }

        let bufferB;
        try {
          bufferB = turf.buffer(fB, this._toleranciaMetros / 1000, { units: 'kilometers' });
        } catch (e) { bufferB = null; }

        let achouPar = false;

        for (const itemA of bboxA) {
          if (!itemA.bounds) continue;
          if (matchesA.has(itemA.idx)) continue;
          if (!boundsB.intersects(itemA.bounds)) continue;

          if (bufferB) {
            try {
              if (turf.booleanIntersects(itemA.feature, bufferB)) {
                const extA = Number(itemA.feature.properties.extensao) || 0;
                const extB = Number(fB.properties.extensao) || 0;
                const delta = extA > 0 ? Math.abs(extB - extA) / extA * 100 : 0;

                if (delta > this._limiarModificacaoPct) {
                  resultado.modificados.push({ a: itemA.feature, b: fB, delta });
                } else {
                  resultado.mantidos.push({ a: itemA.feature, b: fB, delta });
                }
                matchesA.add(itemA.idx);
                matchesB.add(j);
                achouPar = true;
                break;
              }
            } catch (e) { /* ignora */ }
          }
        }

        if (!achouPar) {
          resultado.adicionados.push(fB);
        }
      }

      for (const itemA of bboxA) {
        if (!matchesA.has(itemA.idx)) {
          resultado.removidos.push(itemA.feature);
        }
      }

      return resultado;
    },

    _renderizarResultado: function (r) {
      document.getElementById('diff-placeholder').style.display = 'none';
      const resEl = document.getElementById('diff-resultado');
      resEl.style.display = 'flex';

      const deltaExt = r.extensaoB - r.extensaoA;
      const deltaPct = r.extensaoA > 0 ? (deltaExt / r.extensaoA * 100).toFixed(2) : '0.00';
      const sinal = deltaExt >= 0 ? '+' : '';

      document.getElementById('diff-kpis').innerHTML = `
        <div class="diff-kpi adicionado">
          <span class="rotulo">Adicionados</span>
          <span class="valor">${r.adicionados.length}</span>
          <span class="delta">Trechos novos em ${r.safraB.replace('ven_','')}</span>
        </div>
        <div class="diff-kpi removido">
          <span class="rotulo">Removidos</span>
          <span class="valor">${r.removidos.length}</span>
          <span class="delta">Trechos ausentes em ${r.safraB.replace('ven_','')}</span>
        </div>
        <div class="diff-kpi mantido">
          <span class="rotulo">Mantidos</span>
          <span class="valor">${r.mantidos.length}</span>
          <span class="delta">Presença inalterada</span>
        </div>
        <div class="diff-kpi modificado">
          <span class="rotulo">Modificados</span>
          <span class="valor">${r.modificados.length}</span>
          <span class="delta">Δ extensão > ${this._limiarModificacaoPct}%</span>
        </div>
      `;

      document.getElementById('diff-aviso').innerHTML = `
        <strong>📊 Resumo da comparação:</strong><br>
        Extensão base (<span class="dest">${r.safraA.replace('ven_','')}</span>):
        <strong>${r.extensaoA.toLocaleString('pt-BR', {maximumFractionDigits: 1})} km</strong> ·
        Extensão comparada (<span class="dest">${r.safraB.replace('ven_','')}</span>):
        <strong>${r.extensaoB.toLocaleString('pt-BR', {maximumFractionDigits: 1})} km</strong> ·
        Variação: <strong>${sinal}${deltaExt.toFixed(1)} km (${sinal}${deltaPct}%)</strong>
      `;

      const linhas = [];

      r.adicionados.forEach(f => {
        const p = f.properties || {};
        linhas.push({
          status: 'adicionado',
          nome: p.nome || '—',
          rio: p.nome_rio || '—',
          extA: '—',
          extB: (Number(p.extensao) || 0).toFixed(1) + ' km',
          delta: '—'
        });
      });

      r.removidos.forEach(f => {
        const p = f.properties || {};
        linhas.push({
          status: 'removido',
          nome: p.nome || '—',
          rio: p.nome_rio || '—',
          extA: (Number(p.extensao) || 0).toFixed(1) + ' km',
          extB: '—',
          delta: '—'
        });
      });

      r.modificados.forEach(({a, b, delta}) => {
        const pa = a.properties || {};
        const pb = b.properties || {};
        linhas.push({
          status: 'modificado',
          nome: pb.nome || pa.nome || '—',
          rio: pb.nome_rio || pa.nome_rio || '—',
          extA: (Number(pa.extensao) || 0).toFixed(1) + ' km',
          extB: (Number(pb.extensao) || 0).toFixed(1) + ' km',
          delta: delta.toFixed(1) + '%'
        });
      });

      const linhasVisiveis = linhas.slice(0, 500);

      document.getElementById('diff-tbody').innerHTML = linhasVisiveis.map(l => `
        <tr>
          <td><span class="diff-status-badge ${l.status}">${l.status}</span></td>
          <td>${window.Security.escapeHTML(l.nome)}</td>
          <td>${window.Security.escapeHTML(l.rio)}</td>
          <td>${l.extA}</td>
          <td>${l.extB}</td>
          <td>${l.delta}</td>
        </tr>
      `).join('');

      if (linhas.length > 500) {
        document.getElementById('diff-tbody').innerHTML += `
          <tr><td colspan="6" style="text-align:center; padding:12px; color:#f59e0b;">
            Exibindo 500 de ${linhas.length} trechos. Use o CSV para ver todos.
          </td></tr>
        `;
      }
    },

    _desenharNoMapa: function (r) {
      this.limparMapa();

      const estilo = (cor, dash) => ({
        color: cor,
        weight: 4,
        opacity: 0.95,
        fillOpacity: 0,
        dashArray: dash || null,
        pane: 'paneSelecao'
      });

      if (r.adicionados.length) {
        const camada = L.geoJSON(
          { type: 'FeatureCollection', features: r.adicionados },
          { style: estilo('#10b981'), pane: 'paneSelecao', interactive: false }
        ).addTo(mapa);
        this._camadasDiff.push(camada);
      }

      if (r.removidos.length) {
        const camada = L.geoJSON(
          { type: 'FeatureCollection', features: r.removidos },
          { style: estilo('#ef4444', '8, 6'), pane: 'paneSelecao', interactive: false }
        ).addTo(mapa);
        this._camadasDiff.push(camada);
      }

      if (r.modificados.length) {
        const camada = L.geoJSON(
          { type: 'FeatureCollection', features: r.modificados.map(m => m.b) },
          { style: estilo('#f97316'), pane: 'paneSelecao', interactive: false }
        ).addTo(mapa);
        this._camadasDiff.push(camada);
      }

      setTimeout(() => {
        try {
          const grupo = L.featureGroup(this._camadasDiff);
          const bounds = grupo.getBounds();
          if (bounds.isValid()) {
            mapa.fitBounds(bounds, { padding: [60, 60] });
          }
        } catch (e) {}
      }, 200);

      setTimeout(() => {
        const modal = document.getElementById('modal-diff-safras');
        if (modal) modal.classList.remove('aberto');
        if (window.UI) window.UI.toast('🗺️ Mapa com o diff. Reabra o modal em "Comparar Safras" para ver os detalhes.');
      }, 600);
    },

    exportarCSV: function () {
      if (!this._resultado) {
        if (window.UI) window.UI.toast('⚠️ Nenhuma comparação realizada.');
        return;
      }

      const r = this._resultado;
      const linhas = [];
      linhas.push('"Status";"Hidrovia";"Rio";"Extensão Base (km)";"Extensão Comparada (km)";"Delta (%)"');

      r.adicionados.forEach(f => {
        const p = f.properties || {};
        linhas.push(`"adicionado";"${(p.nome||'').replace(/"/g,'""')}";"${(p.nome_rio||'').replace(/"/g,'""')}";"";"${Number(p.extensao||0).toFixed(1)}";""`);
      });
      r.removidos.forEach(f => {
        const p = f.properties || {};
        linhas.push(`"removido";"${(p.nome||'').replace(/"/g,'""')}";"${(p.nome_rio||'').replace(/"/g,'""')}";"${Number(p.extensao||0).toFixed(1)}";"";""`);
      });
      r.mantidos.forEach(({a,b,delta}) => {
        const pa = a.properties || {};
        const pb = b.properties || {};
        linhas.push(`"mantido";"${(pb.nome||pa.nome||'').replace(/"/g,'""')}";"${(pb.nome_rio||pa.nome_rio||'').replace(/"/g,'""')}";"${Number(pa.extensao||0).toFixed(1)}";"${Number(pb.extensao||0).toFixed(1)}";"${delta.toFixed(1)}"`);
      });
      r.modificados.forEach(({a,b,delta}) => {
        const pa = a.properties || {};
        const pb = b.properties || {};
        linhas.push(`"modificado";"${(pb.nome||pa.nome||'').replace(/"/g,'""')}";"${(pb.nome_rio||pa.nome_rio||'').replace(/"/g,'""')}";"${Number(pa.extensao||0).toFixed(1)}";"${Number(pb.extensao||0).toFixed(1)}";"${delta.toFixed(1)}"`);
      });

      const csv = '\uFEFF' + linhas.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diff_${r.safraA}_vs_${r.safraB}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (window.UI) window.UI.toast(`💾 CSV exportado com ${linhas.length - 1} trechos.`);
    }
  };

  window.SafraDiffManager = SafraDiffManager;
  console.info('[js] SafraDiffManager carregado');
})();