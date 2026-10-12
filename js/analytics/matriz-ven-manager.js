/* ============================================================
   WebGIS ANTAQ — Módulo: MatrizVENManager
   Escopo: modal da matriz operacional do VEN (tempos, extensões, OD)
   Dependências: window.DADOS_GEOJSON_BRUTOS, window.PopupRenderer,
                 window.Security, window.UI, window.DataManager, window.mapa
   Referências "lazy": window.toggleCamada (definida inline)
   Expõe: window.MatrizVENManager
   ============================================================ */
(function () {
  'use strict';

  const MatrizVENManager = {
    anoAtual: 'ven_2024',
    dadosCompletos: [],
    dadosFiltrados: [],

    abrirModal: async function () {
      const modal = document.getElementById('modal-matriz-ven');
      if (!modal) return;
      modal.classList.add('aberto');

      if (!DADOS_GEOJSON_BRUTOS[this.anoAtual]) {
        try { await window.DataManager.carregarCamada(this.anoAtual); }
        catch (e) {
          this.anoAtual = 'ven_2024';
          if (!DADOS_GEOJSON_BRUTOS[this.anoAtual]) {
            try { await window.DataManager.carregarCamada(this.anoAtual); } catch (err) {}
          }
        }
      }
      this.popularFiltrosAno();
      this.atualizarDados();
    },

    fecharModal: function () {
      const modal = document.getElementById('modal-matriz-ven');
      if (modal) modal.classList.remove('aberto');
    },

    popularFiltrosAno: function () {
      const selAno = document.getElementById('matriz-filtro-ano');
      if (selAno) selAno.value = this.anoAtual;
    },

    mudarAno: async function (novoAno) {
      this.anoAtual = novoAno;
      const lblAno = document.getElementById('kpi-matriz-ano');
      if (lblAno) lblAno.innerText = novoAno.replace('ven_', '');

      if (!DADOS_GEOJSON_BRUTOS[novoAno]) {
        if (window.UI) window.UI.toast(`Carregando malha ${novoAno}...`);
        try { await window.DataManager.carregarCamada(novoAno); }
        catch (e) { if (window.UI) window.UI.toast(`⚠️ Malha ${novoAno} não disponível.`); return; }
      }
      this.atualizarDados();
    },

    atualizarDados: function () {
      const dadosGeo = DADOS_GEOJSON_BRUTOS[this.anoAtual];
      if (!dadosGeo || !dadosGeo.features) {
        const corpo = document.getElementById('tabela-matriz-corpo');
        if (corpo) corpo.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#ef4444;">Nenhuma feição para esta safra.</td></tr>';
        return;
      }

      this.dadosCompletos = dadosGeo.features.map((f, idx) => {
        const p = f.properties || {};
        return {
          index: idx, feature: f,
          idhidrovia: Security.getProp(p, 'idhidrovia', 'gid', 'id') || idx,
          nome: Security.getProp(p, 'nome', 'NOME') || 'Hidrovia Sem Denominação',
          rio: Security.getProp(p, 'nome_rio', 'NOME_RIO', 'rio') || '-',
          mun_orig: Security.getProp(p, 'mun_origem', 'MUN_ORIGEM', 'municipio_origem') || '-',
          est_orig: Security.getProp(p, 'est_origem', 'EST_ORIGEM', 'uf_origem') || '',
          mun_dest: Security.getProp(p, 'mun_estino', 'mun_destino', 'MUN_DESTINO', 'municipio_destino') || '-',
          est_dest: Security.getProp(p, 'est_estino', 'est_destino', 'EST_DESTINO', 'uf_destino') || '',
          extensao: Number(Security.getProp(p, 'extensao', 'EXTENSAO') || 0),
          velocidade: Number(Security.getProp(p, 'vel_cional', 'VELOCIDADE') || 0),
          tempo: Security.getProp(p, 'tempo', 'TEMPO') || '-',
          tipo: Security.getProp(p, 'tipo', 'TIPO') || 'Trecho',
          eclusa: Security.getProp(p, 'nom_eclusa', 'NOM_ECLUSA', 'eclusa') || ''
        };
      });

      this.popularDropdownsFiltro();
      this.aplicarFiltros();
    },

    popularDropdownsFiltro: function () {
      const selHidro = document.getElementById('matriz-filtro-hidrovia');
      const selRio = document.getElementById('matriz-filtro-rio');

      if (selHidro) {
        const hidrovias = [...new Set(this.dadosCompletos.map(d => d.nome).filter(Boolean))].sort();
        selHidro.innerHTML = '<option value="">Todas as Hidrovias</option>' + hidrovias.map(h => `<option value="${window.Security.escapeHTML(h)}">${window.Security.escapeHTML(h)}</option>`).join('');
      }
      if (selRio) {
        const rios = [...new Set(this.dadosCompletos.map(d => d.rio).filter(r => r && r !== '-'))].sort();
        selRio.innerHTML = '<option value="">Todos os Rios</option>' + rios.map(r => `<option value="${window.Security.escapeHTML(r)}">${window.Security.escapeHTML(r)}</option>`).join('');
      }
    },

    aplicarFiltros: function () {
      const selHidro = document.getElementById('matriz-filtro-hidrovia');
      const selRio = document.getElementById('matriz-filtro-rio');
      const inputBusca = document.getElementById('matriz-busca-texto');

      const fHidro = selHidro ? selHidro.value.trim().toLowerCase() : '';
      const fRio = selRio ? selRio.value.trim().toLowerCase() : '';
      const fBusca = inputBusca ? inputBusca.value.trim().toLowerCase() : '';

      this.dadosFiltrados = this.dadosCompletos.filter(d => {
        if (fHidro && d.nome.toLowerCase() !== fHidro) return false;
        if (fRio && d.rio.toLowerCase() !== fRio) return false;
        if (fBusca) {
          const matchBusca = d.nome.toLowerCase().includes(fBusca) || d.rio.toLowerCase().includes(fBusca) ||
                             d.mun_orig.toLowerCase().includes(fBusca) || d.mun_dest.toLowerCase().includes(fBusca) ||
                             d.tipo.toLowerCase().includes(fBusca);
          if (!matchBusca) return false;
        }
        return true;
      });

      this.atualizarKPIs();
      this.renderizarTabela();
    },

    atualizarKPIs: function () {
      const elTrechos = document.getElementById('kpi-matriz-trechos');
      const elExt = document.getElementById('kpi-matriz-extensao');
      const elVel = document.getElementById('kpi-matriz-vel');

      const totalTrechos = this.dadosFiltrados.length;
      const totalExt = this.dadosFiltrados.reduce((acc, d) => acc + (d.extensao || 0), 0);
      const velMedia = totalTrechos > 0 ? (this.dadosFiltrados.reduce((acc, d) => acc + (d.velocidade || 0), 0) / totalTrechos) : 0;

      if (elTrechos) elTrechos.innerText = totalTrechos.toLocaleString('pt-BR');
      if (elExt) elExt.innerText = totalExt.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' km';
      if (elVel) elVel.innerText = velMedia.toFixed(1) + ' km/h';
    },

    renderizarTabela: function () {
      const corpo = document.getElementById('tabela-matriz-corpo');
      if (!corpo) return;

      if (!this.dadosFiltrados.length) {
        corpo.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#94a3b8;">Nenhum trecho atende aos filtros.</td></tr>';
        return;
      }

      let html = '';
      const maxLinhas = Math.min(this.dadosFiltrados.length, 300);
      for (let i = 0; i < maxLinhas; i++) {
        const d = this.dadosFiltrados[i];
        const orig = d.mun_orig + (d.est_orig ? `/${d.est_orig}` : '');
        const dest = d.mun_dest + (d.est_dest ? `/${d.est_dest}` : '');

        let classeBadge = 'badge-tempo-medio';
        if (d.tempo.includes('0d 0h') || d.tempo.includes('0d 1h') || d.tempo.includes('0d 2h') || d.tempo.includes('0d 3h') || d.tempo.includes('0d 4h')) classeBadge = 'badge-tempo-rapido';
        else if (d.tempo.includes('1d') || d.tempo.includes('2d') || d.tempo.includes('3d')) classeBadge = 'badge-tempo-longo';

        html += `
          <tr>
            <td style="font-weight:600; color:#f8fafc;">${window.Security.escapeHTML(d.nome)}</td>
            <td style="color:#38bdf8;">${window.Security.escapeHTML(d.rio)}</td>
            <td>${window.Security.escapeHTML(orig)}</td>
            <td>${window.Security.escapeHTML(dest)}</td>
            <td>${d.extensao ? d.extensao.toFixed(1) + ' km' : '-'}</td>
            <td>${d.velocidade ? d.velocidade + ' km/h' : '-'}</td>
            <td><span class="badge-tempo-destaque ${classeBadge}">${window.Security.escapeHTML(d.tempo)}</span></td>
            <td>${window.Security.escapeHTML(d.eclusa || d.tipo)}</td>
            <td style="text-align:center;"><button class="btn-acao-localizar" onclick="MatrizVENManager.localizarNoMapa(${d.index})">📍 Localizar</button></td>
          </tr>`;
      }
      if (this.dadosFiltrados.length > maxLinhas) {
        html += `<tr><td colspan="9" style="text-align:center; padding:10px; color:#f59e0b; background:#081728;">Exibindo primeiros 300 de ${this.dadosFiltrados.length}.</td></tr>`;
      }
      corpo.innerHTML = html;
    },

    localizarNoMapa: function (index) {
      const item = this.dadosCompletos.find(d => d.index === index);
      if (!item || !item.feature) return;

      this.fecharModal();
      const idCamada = this.anoAtual;
      const chkEl = document.getElementById(`chk-${idCamada}`);
      if (chkEl && !chkEl.checked) {
        chkEl.checked = true;
        if (typeof window.toggleCamada === 'function') window.toggleCamada(idCamada, true);
      }

      try {
        // 1. Limpa destaque anterior de trecho O/D
        if (window._matrizODLayer && window.mapa.hasLayer(window._matrizODLayer)) {
          window.mapa.removeLayer(window._matrizODLayer);
        }
        window._matrizODLayer = L.layerGroup().addTo(mapa);

        const geom = item.feature.geometry;
        const coords = geom.coordinates;
        let startPt, endPt;

        if (geom.type === 'MultiLineString') {
          startPt = coords[0][0];
          endPt = coords[coords.length - 1][coords[coords.length - 1].length - 1];
        } else if (geom.type === 'LineString') {
          startPt = coords[0];
          endPt = coords[coords.length - 1];
        } else {
          startPt = coords;
          endPt = coords;
        }

        let latlngOrig = [startPt[1], startPt[0]];
        let latlngDest = [endPt[1], endPt[0]];

        // Validação e correção geográfica das pontas O/D para evitar inversões
        if (window.Security && typeof window.Security.obterCoordPorto === 'function') {
          const cOrig = window.Security.obterCoordPorto(item.mun_orig);
          if (cOrig) {
            const dStart = Math.hypot(latlngOrig[0] - cOrig[0], latlngOrig[1] - cOrig[1]);
            const dEnd = Math.hypot(latlngDest[0] - cOrig[0], latlngDest[1] - cOrig[1]);
            if (dEnd < dStart) {
              const tmp = latlngOrig;
              latlngOrig = latlngDest;
              latlngDest = tmp;
            }
          }
        }

        // 2. Traçado com destaque em ciano de alto contraste
        const linhaDestaque = L.geoJSON(item.feature, {
          style: {
            color: '#00e5ff',
            weight: 6,
            opacity: 0.95
          }
        }).addTo(window._matrizODLayer);

        // 3. Marcador de Origem (DE) - Verde
        const nomeOrig = (item.mun_orig || 'Origem') + (item.est_orig ? `/${item.est_orig}` : '');
        const iconeOrig = L.divIcon({
          className: 'od-marker-origem',
          html: `<div style="background:#10b981; color:#fff; border:2px solid #fff; border-radius:12px; padding:3px 8px; font-size:10px; font-weight:800; box-shadow:0 3px 8px rgba(0,0,0,0.5); white-space:nowrap; display:flex; align-items:center; gap:4px;">
            <span>🟢 DE:</span> <span>${window.Security ? window.Security.escapeHTML(nomeOrig) : nomeOrig}</span>
          </div>`,
          iconSize: [130, 24],
          iconAnchor: [12, 12]
        });
        L.marker(latlngOrig, { icon: iconeOrig, zIndexOffset: 1200 })
          .bindPopup(`<strong>🟢 Ponto de Origem (Partida):</strong><br>${nomeOrig}`)
          .addTo(window._matrizODLayer);

        // 4. Marcador de Destino (PARA) - Vermelho
        const nomeDest = (item.mun_dest || 'Destino') + (item.est_dest ? `/${item.est_dest}` : '');
        const iconeDest = L.divIcon({
          className: 'od-marker-destino',
          html: `<div style="background:#ef4444; color:#fff; border:2px solid #fff; border-radius:12px; padding:3px 8px; font-size:10px; font-weight:800; box-shadow:0 3px 8px rgba(0,0,0,0.5); white-space:nowrap; display:flex; align-items:center; gap:4px;">
            <span>🏁 PARA:</span> <span>${window.Security ? window.Security.escapeHTML(nomeDest) : nomeDest}</span>
          </div>`,
          iconSize: [130, 24],
          iconAnchor: [12, 12]
        });
        L.marker(latlngDest, { icon: iconeDest, zIndexOffset: 1200 })
          .bindPopup(`<strong>🏁 Ponto de Destino (Chegada):</strong><br>${nomeDest}`)
          .addTo(window._matrizODLayer);

        // 5. Ajusta enquadramento do mapa
        const bounds = linhaDestaque.getBounds();
        if (bounds && bounds.isValid()) {
          mapa.fitBounds(bounds, { padding: [80, 80], maxZoom: 13 });
          setTimeout(() => {
            const popupContent = window.PopupRenderer.gerar(idCamada, item.feature.properties);
            L.popup().setLatLng(bounds.getCenter()).setContent(popupContent).openOn(mapa);
            if (window.UI) {
              window.UI.toast(`📍 Trecho: ${nomeOrig} ➔ ${nomeDest} (${item.extensao ? item.extensao.toFixed(1) + ' km' : ''} · ${item.tempo})`);
            }
          }, 350);
        }
      } catch (e) { console.error("Erro ao localizar:", e); }
    },

    exportarCSV: function () {
      if (!this.dadosFiltrados.length) { if (window.UI) window.UI.toast("⚠️ Nenhum trecho filtrado."); return; }

      let csv = "Hidrovia;Rio;Municipio_Origem;UF_Origem;Municipio_Destino;UF_Destino;Extensao_km;Velocidade_kmh;Tempo_Percurso;Tipo;Eclusa\n";
      this.dadosFiltrados.forEach(d => {
        csv += `"${d.nome}";"${d.rio}";"${d.mun_orig}";"${d.est_orig}";"${d.mun_dest}";"${d.est_dest}";"${d.extensao}";"${d.velocidade}";"${d.tempo}";"${d.tipo}";"${d.eclusa}"\n`;
      });

      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Matriz_VEN_Tempos_${this.anoAtual}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (window.UI) window.UI.toast("💾 Matriz exportada em CSV!");
    }
  };

  window.MatrizVENManager = MatrizVENManager;
  console.info('[js] MatrizVENManager carregado');
})();