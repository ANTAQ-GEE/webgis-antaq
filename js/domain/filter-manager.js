/* ============================================================
   WebGIS ANTAQ — Módulo: FilterManager
   Escopo: seletor de camadas, sub-filtros dinâmicos, filtros por atributo
   Dependências: window.CONFIG_CAMADAS, window.DADOS_GEOJSON_BRUTOS,
                 window.CAMADAS_MAPA, window.PortClassification,
                 window.Security, window.UI, window.ActionHistory,
                 window.mapa, window.DataManager
   Referências "lazy": window.VENUnifiedManager, window.TabelaManager,
                       window.classificarEsfera
   Expõe: window.FilterManager
   ============================================================ */
(function () {
  'use strict';

  const FilterManager = {
    subfiltroAtivo: 'TODOS',
    colunaEsferaAtiva: null,

    atualizarSeletorCamadas: function () {
      const sel = document.getElementById('sel-camada-busca');
      if (!sel) return;
      const valAtual = sel.value;
      sel.innerHTML = '';
      sel.appendChild(new Option('⚓ Instalações Portuárias', 'instalacoes_portuarias'));
      sel.appendChild(new Option('🌊 Vias Economicamente Navegadas (VEN)', 'ven'));

      for (const [id, cfg] of Object.entries(CONFIG_CAMADAS)) {
        if (id === 'instalacoes_portuarias' || id.startsWith('ven_') || id === 'unidades_conservacao') continue;
        let emoji = '📍';
        if (id.includes('travess')) emoji = '⛴️';
        else if (id.includes('indig') || id.includes('tis')) emoji = '🏹';
        else if (id.includes('conservacao') || id.includes('uc')) emoji = '🌳';
        else if (id.includes('uf') || id.includes('estado')) emoji = '🗺️';
        else if (id.includes('rodovia')) emoji = '🛣️';
        else if (id.includes('ferrovia')) emoji = '🚆';
        else if (id.includes('embarcac') || id.includes('ais')) emoji = '🚢';
        else if (id.includes('snv')) emoji = '📜';
        sel.appendChild(new Option(`${emoji} ${cfg.nome}`, id));
      }

      if (valAtual === 'ven' || valAtual.startsWith('ven_')) sel.value = 'ven';
      else if (CONFIG_CAMADAS[valAtual]) sel.value = valAtual;
      else sel.value = 'instalacoes_portuarias';
    },

    aoMudarCamada: async function (idCamada) {
      const selSub = document.getElementById('filtro-subtipo-dinamico');
      const inputBusca = document.getElementById('input-busca');
      const cfg = CONFIG_CAMADAS[idCamada] || {};

      if (inputBusca) {
        inputBusca.placeholder = `Buscar em ${cfg.nome || 'camada'}...`;
        inputBusca.value = '';
        const listaEl = document.getElementById('resultados-busca');
        if (listaEl) listaEl.style.display = 'none';
      }

      if (!DADOS_GEOJSON_BRUTOS[idCamada] && idCamada !== 'ven') {
        if (selSub) { selSub.style.display = 'inline-block'; selSub.innerHTML = '<option value="">Carregando dados...</option>'; }
        try { await window.DataManager.carregarCamada(idCamada); } catch (e) {}
      }

      this.colunaEsferaAtiva = null;

      if (selSub) {
        if (idCamada === 'ven') {
          selSub.style.display = 'inline-block';
          selSub.innerHTML = `
            <option value="ven_2024">📅 Safra 2024 (Oficial V4)</option>
            <option value="ven_2022" selected>📅 Safra 2022 (Série Histórica)</option>
            <option value="ven_2020">📅 Safra 2020</option>
            <option value="ven_2018">📅 Safra 2018</option>
            <option value="ven_2013">📅 Safra 2013</option>
          `;
          selSub.value = window.VENUnifiedManager ? window.VENUnifiedManager.anoAtivo : 'ven_2022';

          if (inputBusca) {
            const anoAtivo = window.VENUnifiedManager ? window.VENUnifiedManager.anoAtivo : 'ven_2022';
            inputBusca.placeholder = `Buscar trecho VEN ${anoAtivo.replace('ven_','')} (rio, município, eclusa)…`;
          }
        } else if (idCamada === 'instalacoes_portuarias') {
          selSub.innerHTML = '<option value="TODOS">⚓ Todos os Regimes Portuários</option>';
          selSub.style.display = 'inline-block';
          for (const [tKey, cat] of Object.entries(window.PortClassification.tipos)) {
            const el = document.createElement('option');
            el.value = tKey; el.innerText = cat.nome; selSub.appendChild(el);
          }
          selSub.value = window.FILTRO_PORTO_ATUAL || "TODOS";
        } else if (idCamada === 'ucs_todas_mma') {
          selSub.innerHTML = `
            <option value="TODOS">🏛️ Todas as Esferas Federativas</option>
            <option value="Federal">🏛️ Federal (ICMBio/União)</option>
            <option value="Estadual">🏢 Estadual (OEMA)</option>
            <option value="Municipal">🏙️ Municipal (Prefeituras)</option>
            <option value="Privada">🌲 RPPN / Privada</option>
          `;
          selSub.style.display = 'inline-block';
          selSub.value = window.FILTRO_UC_ATUAL || "TODOS";
        } else {
          const g = DADOS_GEOJSON_BRUTOS[idCamada];
          const colunasEsfera = ['esfera', 'esfera_adm', 'esfera_administrativa', 'jurisdicao', 'administracao', 'tipo_administracao', 'esfera_gestao', 'tipo'];
          let colDetectada = null;
          if (g && g.features && g.features.length) {
            const sampleProps = g.features[0].properties || {};
            for (const k of Object.keys(sampleProps)) {
              if (colunasEsfera.includes(k.toLowerCase())) { colDetectada = k; break; }
            }
          }
          if (colDetectada && g && g.features) {
            this.colunaEsferaAtiva = colDetectada;
            const unicos = new Set();
            g.features.forEach(f => {
              const val = f.properties ? f.properties[colDetectada] : null;
              if (window.Security.ehValido(val)) unicos.add(String(val).trim());
            });
            const nomeRotulo = colDetectada.toLowerCase().includes('jurisd') ? 'Jurisdição' : 'Esfera';
            selSub.innerHTML = `<option value="TODOS">🏛️ Todas as ${nomeRotulo}s (${colDetectada})</option>`;
            const listaValores = Array.from(unicos).sort();
            listaValores.forEach(v => {
              const el = document.createElement('option');
              el.value = v;
              let icone = '🏛️';
              const vl = v.toLowerCase();
              if (vl.includes('estad')) icone = '🏢';
              else if (vl.includes('municip')) icone = '🏙️';
              else if (vl.includes('conced')) icone = '🛣️';
              else if (vl.includes('privad') || vl.includes('rppn')) icone = '🌲';
              el.innerText = `${icone} ${v}`;
              selSub.appendChild(el);
            });
            selSub.style.display = 'inline-block';
            selSub.value = "TODOS";
          } else {
            selSub.style.display = 'none';
            selSub.innerHTML = '';
          }
        }
      }

      if (CONFIG_CAMADAS[idCamada]) {
        const chk = document.getElementById(`chk-${idCamada}`);
        if (chk && !chk.checked) {
          chk.checked = true;
          if (typeof window.toggleCamada === 'function') window.toggleCamada(idCamada, true);
        }
      }
    },

    aoMudarSubfiltro: function (valor) {
      const idCamada = document.getElementById('sel-camada-busca').value;
      if (idCamada === 'ven') {
        if (window.VENUnifiedManager) window.VENUnifiedManager.mudarSafra(valor);
        return;
      }
      this.aplicarFiltro(idCamada, valor);
    },

    aplicarFiltro: function (idCamada, valor, opcoes) {
      opcoes = opcoes || {};

      const valorAnterior = (idCamada === 'instalacoes_portuarias')
        ? (window.FILTRO_PORTO_ATUAL || 'TODOS')
        : (idCamada === 'ucs_todas_mma')
          ? (window.FILTRO_UC_ATUAL || 'TODOS')
          : null;

      if (!opcoes.semHistorico && valorAnterior !== null && valorAnterior !== valor && window.ActionHistory) {
        const self = this;
        window.ActionHistory.registrar({
          tipo: 'filtro',
          descricao: `Filtro [${idCamada}]: ${valorAnterior} → ${valor}`,
          undo: () => self.aplicarFiltro(idCamada, valorAnterior, { semHistorico: true }),
          redo: () => self.aplicarFiltro(idCamada, valor, { semHistorico: true })
        });
      }

      if (idCamada === 'instalacoes_portuarias' && window.SUBGRUPOS_PORTOS) {
        let visiveis = 0;
        const total = DADOS_GEOJSON_BRUTOS['instalacoes_portuarias']?.features?.length || 1179;
        const latlngsVisiveis = [];

        // ✅ Adiciona os clusters DENTRO do featureGroup, não direto no mapa
        const featureGroup = CAMADAS_MAPA['instalacoes_portuarias'];
        const featureGroupNoMapa = featureGroup && mapa.hasLayer(featureGroup);

        for (const [tKey, fg] of Object.entries(window.SUBGRUPOS_PORTOS)) {
        const fgPai = CAMADAS_MAPA['instalacoes_portuarias'];
        for (const [tKey, fg] of Object.entries(window.SUBGRUPOS_PORTOS)) {
          const chkSub = document.getElementById(`chk-sub-${tKey}`);
          const deveLigar = (valor === 'TODOS' || tKey === valor);
          if (chkSub) chkSub.checked = deveLigar;

          // ✅ Manipula DENTRO do featureGroup pai
          if (deveLigar) {
            if (fgPai && !fgPai.hasLayer(fg)) fgPai.addLayer(fg);
            visiveis += fg.getLayers().length;
            fg.eachLayer(m => { if (m.getLatLng) latlngsVisiveis.push(m.getLatLng()); });
          } else {
            if (fgPai && fgPai.hasLayer(fg)) fgPai.removeLayer(fg);
          }
        }
        }
        const cntEl = document.getElementById('cnt-instalacoes_portuarias');
        if (cntEl) cntEl.innerText = (valor === 'TODOS' || visiveis === total) ? `(${total})` : `(${visiveis}/${total})`;
        if (latlngsVisiveis.length > 0 && valor !== 'TODOS') {
          const b = L.latLngBounds(latlngsVisiveis);
          mapa.fitBounds(b, { padding: [50, 50], maxZoom: 12, animate: true, duration: 1.0 });
        }
        if (window.Styler) window.Styler.atualizarLegenda();
        if (valor !== 'TODOS' && window.UI) UI.toast(`Filtro [Portos]: ${window.PortClassification.tipos[valor]?.nome || valor} (${visiveis} ativos visíveis).`);
        window.FILTRO_PORTO_ATUAL = valor;

        const selSub = document.getElementById('filtro-subtipo-dinamico');
        if (selSub) selSub.value = valor;

        if (window.TabelaManager && window.TabelaManager.camadaAtualId === 'instalacoes_portuarias' &&
            document.getElementById('painel-tabela').classList.contains('aberto')) {
          const selP = document.getElementById('filtro-porto-tabela');
          if (selP) selP.value = valor;
          window.TabelaManager.filtroPorto = valor;
          window.TabelaManager.pagina = 1;
          window.TabelaManager.aplicarFiltrosInternos();
          window.TabelaManager.renderizar();
        }

      } else if (idCamada === 'ucs_todas_mma' && window.SUBGRUPOS_UCS) {
        let visiveis = 0;
        const total = DADOS_GEOJSON_BRUTOS['ucs_todas_mma']?.features?.length || 0;
        for (const [esfKey, fg] of Object.entries(window.SUBGRUPOS_UCS)) {
          const chkSub = document.getElementById(`chk-sub-uc-${esfKey}`);
          const deveLigar = (valor === 'TODOS' || esfKey === valor);
          if (chkSub) chkSub.checked = deveLigar;
          if (deveLigar) { if (!mapa.hasLayer(fg)) fg.addTo(mapa); visiveis += fg.getLayers().length; }
          else { if (mapa.hasLayer(fg)) mapa.removeLayer(fg); }
        }
        const cntEl = document.getElementById('cnt-ucs_todas_mma');
        if (cntEl) cntEl.innerText = (valor === 'TODOS' || visiveis === total) ? `(${total})` : `(${visiveis}/${total})`;
        window.FILTRO_UC_ATUAL = valor;
        if (window.UI) UI.toast(`Filtro [Esfera]: ${valor === 'TODOS' ? 'Todas as Esferas' : valor} (${visiveis} de ${total}).`);

      } else if (CAMADAS_MAPA[idCamada] && DADOS_GEOJSON_BRUTOS[idCamada]) {
        const colEsfera = this.colunaEsferaAtiva;
        const total = DADOS_GEOJSON_BRUTOS[idCamada]?.features?.length || 0;
        let visiveis = 0;
        if (colEsfera && valor !== 'TODOS') {
          CAMADAS_MAPA[idCamada].clearLayers();
          const filtrados = {
            type: 'FeatureCollection',
            features: DADOS_GEOJSON_BRUTOS[idCamada].features.filter(f => {
              const match = String(f.properties ? f.properties[colEsfera] : '').trim() === valor;
              if (match) visiveis++;
              return match;
            })
          };
          CAMADAS_MAPA[idCamada].addData(filtrados);
          const cntEl = document.getElementById(`cnt-${idCamada}`);
          if (cntEl) cntEl.innerText = `(${visiveis}/${total})`;
          if (window.UI) UI.toast(`Filtro [${colEsfera}]: ${valor} (${visiveis} de ${total}).`);
        } else {
          CAMADAS_MAPA[idCamada].clearLayers();
          CAMADAS_MAPA[idCamada].addData(DADOS_GEOJSON_BRUTOS[idCamada]);
          const cntEl = document.getElementById(`cnt-${idCamada}`);
          if (cntEl) cntEl.innerText = `(${total})`;
        }
      }
    }
  };

  window.FilterManager = FilterManager;
  console.info('[js] FilterManager carregado');
})();