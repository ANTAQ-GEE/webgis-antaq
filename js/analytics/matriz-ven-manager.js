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
    anoAtual: 'ven_2022',
    dadosCompletos: [],
    dadosFiltrados: [],

    abrirModal: async function () {
      const modal = document.getElementById('modal-matriz-ven');
      if (!modal) return;
      modal.classList.add('aberto');

      if (!DADOS_GEOJSON_BRUTOS[this.anoAtual]) {
        try { await window.DataManager.carregarCamada(this.anoAtual); }
        catch (e) {
          this.anoAtual = 'ven_2022';
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

      this.dadosCompletos = dadosGeo.features.map((f, idx) => ({
        index: idx, feature: f,
        idhidrovia: f.properties.idhidrovia || idx,
        nome: f.properties.nome || f.properties.NOME || 'Hidrovia Sem Denominação',
        rio: f.properties.nome_rio || f.properties.NOME_RIO || f.properties.rio || '-',
        mun_orig: f.properties.mun_origem || f.properties.MUN_ORIGEM || '-',
        est_orig: f.properties.est_origem || f.properties.EST_ORIGEM || '',
        mun_dest: f.properties.mun_estino || f.properties.MUN_DESTINO || '-',
        est_dest: f.properties.est_estino || f.properties.EST_DESTINO || '',
        extensao: Number(f.properties.extensao || f.properties.EXTENSAO || 0),
        velocidade: Number(f.properties.vel_cional || f.properties.VELOCIDADE || 0),
        tempo: f.properties.tempo || f.properties.TEMPO || '-',
        tipo: f.properties.tipo || f.properties.TIPO || 'Trecho',
        eclusa: f.properties.nom_eclusa || f.properties.NOM_ECLUSA || ''
      }));

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
        const tempLayer = L.geoJSON(item.feature);
        const bounds = tempLayer.getBounds();
        if (bounds && bounds.isValid()) {
          mapa.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
          setTimeout(() => {
            const popupContent = window.PopupRenderer.gerar(idCamada, item.feature.properties);
            L.popup().setLatLng(bounds.getCenter()).setContent(popupContent).openOn(mapa);
            if (window.UI) window.UI.toast(`📍 Trecho: ${item.nome} (${item.tempo})`);
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