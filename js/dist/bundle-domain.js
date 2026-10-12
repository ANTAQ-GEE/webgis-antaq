/* ============================================================
 * WebGIS Corporativo ANTAQ — Regras de Negócio & Ferramentas Cartográficas
 * Arquivo: js/dist/bundle-domain.js
 * Descrição: Classificação de portos, filtros, busca, medição, seleção e geoprocessamento
 * Gerado em: 11/10/2026 20:23:35
 * Módulos inclusos:
 *   - js/domain/port-classification.js
 *   - js/domain/filter-manager.js
 *   - js/domain/search-engine.js
 *   - js/domain/tabela-manager.js
 *   - js/domain/catalogo-manager.js
 *   - js/domain/layer-metadata.js
 *   - js/domain/measurement-tool.js
 *   - js/domain/selection-manager.js
 *   - js/domain/map-extras.js
 *   - js/domain/buffer-tool.js
 *   - js/domain/geo-tools.js
 *   - js/domain/ven-unified-manager.js
 *   - js/domain/safra-diff-manager.js
 *   - js/domain/tku-manager.js
 *   - js/domain/estudos-manager.js
 * ============================================================ */


/* --- INÍCIO: js/domain/port-classification.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: PortClassification
   Escopo: classificação de regimes de outorga portuária + esfera de UCs
   Dependências: Security
   Expõe: window.PortClassification, window.classificarEsfera
   ============================================================ */
(function () {
  'use strict';

  const PortClassification = {
    tipos: {
      ORGANIZADO: { id: 'ORGANIZADO', nome: 'Porto Organizado (Lei 12.815)', cor: '#0284c7', raio: 7.5, peso: 2 },
      PUBLICO:    { id: 'PUBLICO',    nome: 'Porto Público (Cadastro Legado)', cor: '#06b6d4', raio: 6.5, peso: 1.5 },
      TUP:        { id: 'TUP',        nome: 'Terminal de Uso Privado (TUP)', cor: '#10b981', raio: 6,   peso: 1.5 },
      IP4:        { id: 'IP4',        nome: 'Pequeno Porte (IP4)', cor: '#f59e0b', raio: 5.5, peso: 1.5 },
      ETC:        { id: 'ETC',        nome: 'Estação de Transbordo (ETC)', cor: '#8b5cf6', raio: 5.5, peso: 1.5 },
      OUTROS:     { id: 'OUTROS',     nome: 'Demais Registros e Apoio', cor: '#64748b', raio: 4.5, peso: 1 }
    },
    classificar: function (props) {
      if (!props) return this.tipos.OUTROS;
      const raw = String(
        props.tipo || props.TIPO || props.TIPO_INSTALACAO || props.tipo_instalacao ||
        props.ds_tipo || props.perfil || props.PERFIL || props.subtipo || props.SUBTIPO ||
        props.descricao || props.DESCRICAO || ''
      );
      const limpo = Security.repararTexto(raw).toUpperCase();
      if (limpo.includes('ORGANIZADO') || limpo.includes('AUTORIDADE PORTUÁRIA') ||
          limpo.includes('AUTORIDADE PORTUARIA') || limpo.includes('DOCAS')) return this.tipos.ORGANIZADO;
      if (limpo.includes('TERMINAL DE USO PRIVADO') || limpo.includes('TUP') ||
          limpo.includes('USO PRIVADO')) return this.tipos.TUP;
      if (limpo.includes('PÚBLICO') || limpo.includes('PUBLICO') ||
          limpo.includes('PORTUÁRIA PÚBLICA') || limpo.includes('INTERNACIONAL')) return this.tipos.PUBLICO;
      if (limpo.includes('IP4') || limpo.includes('PEQUENO PORTE')) return this.tipos.IP4;
      if (limpo.includes('TRANSBORDO') || limpo.includes('ETC')) return this.tipos.ETC;
      return this.tipos.OUTROS;
    }
  };

  function classificarEsfera(props) {
    if (!props) return { id: 'Outros', nome: 'Outros / Geral', cor: '#047857' };
    let val = '';
    for (const [k, v] of Object.entries(props)) {
      const kLow = k.toLowerCase().trim();
      if (kLow === 'esfera' || kLow.includes('esfera') || kLow.includes('jurisd') ||
          kLow.includes('gestao') || kLow === 'administracao' || kLow === 'tipo_adm') {
        if (v && typeof v === 'string' && v.trim().length > 0) { val = v.trim(); break; }
      }
    }
    if (!val) {
      for (const [k, v] of Object.entries(props)) {
        const vStr = String(v || '').toLowerCase();
        if (vStr.includes('icmbio') || vStr.includes('ibama') ||
            vStr.includes('união') || vStr.includes('uniao')) {
          return { id: 'Federal', nome: 'Federal (ICMBio/União)', cor: '#15803d' };
        }
      }
    }
    const vLow = val.toLowerCase();
    if (vLow.includes('fed') || vLow.includes('uni')) return { id: 'Federal',   nome: 'Federal (ICMBio/União)', cor: '#15803d' };
    if (vLow.includes('est'))                        return { id: 'Estadual',  nome: 'Estadual (OEMA)',        cor: '#059669' };
    if (vLow.includes('mun'))                        return { id: 'Municipal', nome: 'Municipal (Prefeituras)', cor: '#0d9488' };
    if (vLow.includes('priv') || vLow.includes('rppn') || vLow.includes('partic'))
                                                     return { id: 'Privada',   nome: 'RPPN / Privada',       cor: '#84cc16' };
    return { id: 'Outros', nome: 'Outros', cor: '#047857' };
  }

  window.PortClassification = PortClassification;
  window.classificarEsfera = classificarEsfera;
  window.SUBGRUPOS_UCS = window.SUBGRUPOS_UCS || {};
  window.FILTRO_UC_ATUAL = window.FILTRO_UC_ATUAL || "TODOS";
  console.info('[js] PortClassification carregado');
})();
/* --- FIM: js/domain/port-classification.js --- */

/* --- INÍCIO: js/domain/filter-manager.js --- */
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
        else if (id === 'tku') emoji = '📦';
        sel.appendChild(new Option(`${emoji} ${cfg.nome}`, id));
      }

      if (valAtual === 'ven' || valAtual.startsWith('ven_')) sel.value = 'ven';
      else if (CONFIG_CAMADAS[valAtual]) sel.value = valAtual;
      else sel.value = 'instalacoes_portuarias';
    },

    aoMudarCamada: async function (idCamada) {
      // ✅ Suporte à opção "Todas as camadas visíveis"
      if (idCamada === 'TODAS_VISIVEIS') {
        const inputBusca = document.getElementById('input-busca');
        if (inputBusca) {
          inputBusca.placeholder = `Buscar em todas as camadas visíveis...`;
          inputBusca.value = '';
          const listaEl = document.getElementById('resultados-busca');
          if (listaEl) listaEl.style.display = 'none';
        }
        const selSub = document.getElementById('filtro-subtipo-dinamico');
        if (selSub) {
          selSub.innerHTML = '<option value="TODOS">🌐 Sem filtro por subtipo</option>';
          selSub.value = 'TODOS';
        }
        this.colunaEsferaAtiva = null;
        return;
      }
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
        try { await window.DataManager.carregarCamada(idCamada); } catch (e) { }
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
            inputBusca.placeholder = `Buscar trecho VEN ${anoAtivo.replace('ven_', '')} (rio, município, eclusa)…`;
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
/* --- FIM: js/domain/filter-manager.js --- */

/* --- INÍCIO: js/domain/search-engine.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: SearchEngine
   Escopo: busca por atributos, aproximação e zoom em feições
   Dependências: window.DADOS_GEOJSON_BRUTOS, window.CONFIG_CAMADAS,
                 window.PopupRenderer, window.Security, window.UI,
                 window.FilterManager, window.DataManager, window.mapa
   Referências "lazy": window.VENUnifiedManager, window.CopilotoIA
   Expõe: window.SearchEngine
   ============================================================ */
(function () {
  'use strict';

  const SearchEngine = {
    debounceTimer: null,

    _resolverCamadaDeDados: function (idCamada) {
      if (idCamada === 'ven') {
        return (window.VENUnifiedManager && window.VENUnifiedManager.anoAtivo)
          ? window.VENUnifiedManager.anoAtivo
          : 'ven_2022';
      }
      return idCamada;
    },

    onInput: function (val) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.filtrar(val), 250);
    },

    filtrar: function (termo) {
      const listaEl = document.getElementById('resultados-busca');
      if (!termo || termo.trim().length < 2) { listaEl.style.display = 'none'; return; }

      const idCamadaVirtual = document.getElementById('sel-camada-busca').value;
      const idCamada = this._resolverCamadaDeDados(idCamadaVirtual);
      const geojson = DADOS_GEOJSON_BRUTOS[idCamada];
      if (!geojson || !geojson.features) return;

      const t = termo.toLowerCase();
      const matches = [];
      geojson.features.forEach(f => {
        const p = f.properties || {};
        let rotulo = p.nome || p.NOME_INSTALACAO || p.NOME_UC || p.terrai_nom || p.NOME_RIO || p.SIGLA_UF || p.MUNICIPIO || '';
        let encontrou = false;
        for (const [k, v] of Object.entries(p)) {
          if (['geom', 'geometry', 'id', 'gid', 'objectid', '_gpkgtable'].includes(k.toLowerCase())) continue;
          if (v !== undefined && v !== null && String(v).toLowerCase().includes(t)) {
            encontrou = true;
            if (!rotulo) rotulo = `${k}: ${v}`;
            break;
          }
        }
        if (encontrou) matches.push({ nome: String(rotulo), feature: f });
      });

      listaEl.innerHTML = '';
      if (matches.length === 0) {
        listaEl.innerHTML = '<div class="item-resultado">Nenhum ativo localizado.</div>';
      } else {
        matches.slice(0, 8).forEach(m => {
          const d = document.createElement('div');
          d.className = 'item-resultado';
          d.innerText = m.nome;
          d.onclick = () => {
            document.getElementById('input-busca').value = m.nome;
            listaEl.style.display = 'none';
            this.aproximar(m.feature);
          };
          listaEl.appendChild(d);
        });
      }
      listaEl.style.display = 'block';
    },

    aproximar: function (feature) {
      if (window.CopilotoIA) window.CopilotoIA.ultimoAtivoInspecionado = feature;
      if (window.CAMADA_DESTAQUE) mapa.removeLayer(window.CAMADA_DESTAQUE);

      window.CAMADA_DESTAQUE = L.geoJSON(feature, {
        style: { color: '#f59e0b', weight: 6, fillOpacity: 0.5 },
        pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 12, fillColor: '#f59e0b', color: '#fff', weight: 3, fillOpacity: 1 })
      }).addTo(mapa);

      const bounds = window.CAMADA_DESTAQUE.getBounds();
      if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
        mapa.flyTo(bounds.getCenter(), 14, { animate: true, duration: 1.2 });
      } else {
        mapa.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      }

      const idAtualVirtual = document.getElementById('sel-camada-busca').value;
      const idAtual = this._resolverCamadaDeDados(idAtualVirtual);
      window.CAMADA_DESTAQUE.bindPopup(window.PopupRenderer.gerar(idAtual, feature.properties)).openPopup();
    },

    executar: function () {
      const v = (document.getElementById('input-busca').value || '').trim();
      if (!v) {
        if (window.UI) window.UI.toast("Digite o nome ou código de um ativo para aproximar.");
        return;
      }

      const idCamadaVirtual = document.getElementById('sel-camada-busca').value;
      const idCamada = this._resolverCamadaDeDados(idCamadaVirtual);
      const geojson = DADOS_GEOJSON_BRUTOS[idCamada];
      if (!geojson || !geojson.features) {
        if (window.UI) window.UI.toast("Aguarde o carregamento dos dados da camada.");
        return;
      }

      const termo = v.toLowerCase();
      let matchExato = null, primeiroMatch = null;
      for (const f of geojson.features) {
        const p = f.properties || {};
        const nome = String(p.nome || p.NOME_INSTALACAO || p.NOME_RIO || p.nom_vessia || p.nome_travessia || p.SIGLA_UF || p.MUNICIPIO || '');
        if (nome.toLowerCase() === termo) { matchExato = f; break; }
        if (!primeiroMatch && nome.toLowerCase().includes(termo)) primeiroMatch = f;
      }
      const alvo = matchExato || primeiroMatch;

      if (alvo) {
        document.getElementById('resultados-busca').style.display = 'none';
        this.aproximar(alvo);
        const p = alvo.properties || {};
        if (window.UI) window.UI.toast(`📍 Zoom realizado em: ${p.nome || p.NOME_INSTALACAO || 'Ativo'}`);
      } else {
        let achouOutro = null;
        for (const [idOutro, g] of Object.entries(DADOS_GEOJSON_BRUTOS)) {
          if (g && g.features) {
            for (const f of g.features) {
              const p = f.properties || {};
              const n = String(p.nome || p.NOME_INSTALACAO || p.nom_vessia || '');
              if (n.toLowerCase().includes(termo)) { achouOutro = { feature: f, camada: idOutro }; break; }
            }
          }
          if (achouOutro) break;
        }
        if (achouOutro) {
          document.getElementById('sel-camada-busca').value = achouOutro.camada;
          window.FilterManager.aoMudarCamada(achouOutro.camada);
          document.getElementById('resultados-busca').style.display = 'none';
          this.aproximar(achouOutro.feature);
          if (window.UI) window.UI.toast(`📍 Ativo localizado na camada [${CONFIG_CAMADAS[achouOutro.camada]?.nome}].`);
        } else {
          if (window.UI) window.UI.toast(`Nenhum ativo localizado para "${v}".`);
        }
      }
    }
  };

  window.SearchEngine = SearchEngine;
  console.info('[js] SearchEngine carregado');
})();
/* --- FIM: js/domain/search-engine.js --- */

/* --- INÍCIO: js/domain/tabela-manager.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: TabelaManager
   Escopo: tabela de atributos com paginação e filtros
   Dependências: window.CONFIG_CAMADAS, window.DADOS_GEOJSON_BRUTOS,
                 window.PortClassification, window.Security,
                 window.UI, window.SearchEngine, window.FilterManager
   Expõe: window.TabelaManager
   ============================================================ */
(function () {
  'use strict';

  const TabelaManager = {
    camadaAtualId: null,
    features: [],
    filtradas: [],
    colunas: [],
    pagina: 1,
    porPagina: 50,
    filtroPorto: 'TODOS',
    termoBusca: '',

    abrirFiltrado: function (id, featuresFiltradas) {
      const g = DADOS_GEOJSON_BRUTOS[id];
      if (!g || !g.features || !g.features.length) {
        if (window.UI) window.UI.toast("Nenhum dado carregado para esta camada.");
        return;
      }

      this.camadaAtualId = id;
      this.features = featuresFiltradas;
      this.filtradas = featuresFiltradas.slice();
      this.pagina = 1;
      this.termoBusca = '';

      const inp = document.getElementById('filtro-busca-tabela');
      if (inp) inp.value = '';
      const selPorto = document.getElementById('filtro-porto-tabela');
      if (selPorto) selPorto.style.display = 'none';
      this.filtroPorto = 'TODOS';

      const amostra = featuresFiltradas[0].properties || {};
      const todas = Object.keys(amostra)
        .filter(c => !['geom', 'geometry', 'id', '_gpkgtable'].includes(c.toLowerCase()));
      const internos = todas.filter(c => c.startsWith('_'));
      const externos = todas.filter(c => !c.startsWith('_'));
      this.colunas = [...internos, ...externos].slice(0, 20);

      document.getElementById('painel-tabela').classList.add('aberto');

      const titEl = document.getElementById('titulo-tabela-camada');
      if (titEl) titEl.textContent = `Tabela Filtrada: ${CONFIG_CAMADAS[id]?.nome || id} (seleção)`;

      this.renderizar();
    },

    abrir: async function (id) {
      console.log('[Tabela] abrir() chamado para:', id);

      // ✅ Carrega sob demanda COM timeout
      if (!DADOS_GEOJSON_BRUTOS[id]?.features?.length) {
        console.log('[Tabela] Camada fria, carregando...');
        if (window.UI) window.UI.toast(`⏳ Carregando ${CONFIG_CAMADAS[id]?.nome || id}...`);

        try {
          const timeoutMs = 20000;
          await Promise.race([
            window.DataManager.carregarCamada(id),
            new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout ao carregar camada (20s)')), timeoutMs))
          ]);
          console.log('[Tabela] Camada carregada:', DADOS_GEOJSON_BRUTOS[id]?.features?.length || 0, 'feições');
        } catch (e) {
          console.error('[Tabela] Falha ao carregar:', e);
          if (window.UI) window.UI.toast(`⚠️ Falha ao carregar: ${e.message || e}`);
          return;
        }
      } else {
        console.log('[Tabela] Camada já carregada, abrindo direto');
      }
      const g = DADOS_GEOJSON_BRUTOS[id];
      if (!g || !g.features || !g.features.length) { UI.toast("Nenhum dado carregado para esta camada."); return; }

      this.camadaAtualId = id;
      this.features = g.features;
      this.pagina = 1;
      this.termoBusca = '';

      const inp = document.getElementById('filtro-busca-tabela');
      if (inp) inp.value = '';

      const selPorto = document.getElementById('filtro-porto-tabela');
      if (id === 'instalacoes_portuarias') {
        if (selPorto) {
          selPorto.style.display = 'inline-block';
          const CATEGORIAS_VALIDAS = ['TODOS', 'ORGANIZADO', 'PUBLICO', 'TUP', 'IP4', 'ETC', 'OUTROS'];
          let valAtual = window.FILTRO_PORTO_ATUAL;
          if (!CATEGORIAS_VALIDAS.includes(valAtual)) {
            valAtual = 'TODOS';
            window.FILTRO_PORTO_ATUAL = 'TODOS';
          }
          selPorto.value = valAtual;
          this.filtroPorto = valAtual;
        }
      } else {
        if (selPorto) selPorto.style.display = 'none';
        this.filtroPorto = 'TODOS';
      }

      const amostra = g.features[0].properties || {};
      const todas = Object.keys(amostra)
        .filter(c => !['geom', 'geometry', 'id', '_gpkgtable'].includes(c.toLowerCase()));

      // ✅ Prioriza campos internos (_) que carregam info de buffer/geração
      const internos = todas.filter(c => c.startsWith('_'));
      const externos = todas.filter(c => !c.startsWith('_'));

      this.colunas = [...internos, ...externos].slice(0, 20);

      this.aplicarFiltrosInternos();
      document.getElementById('painel-tabela').classList.add('aberto');
      this.renderizar();
    },

    aoMudarFiltroPorto: function (tipo) {
      this.filtroPorto = tipo;
      this.pagina = 1;
      const selSub = document.getElementById('filtro-subtipo-dinamico');
      if (selSub && selSub.value !== tipo) {
        selSub.value = tipo;
        if (window.FilterManager) window.FilterManager.aoMudarSubfiltro(tipo);
      }
      this.aplicarFiltrosInternos();
      this.renderizar();
    },

    filtrar: function (termo) {
      this.termoBusca = (termo || '').toLowerCase().trim();
      this.pagina = 1;
      this.aplicarFiltrosInternos();
      this.renderizar();
    },

    aplicarFiltrosInternos: function () {
      let base = this.features;

      if (this.camadaAtualId === 'instalacoes_portuarias' && this.filtroPorto && this.filtroPorto !== 'TODOS') {
        base = base.filter(f => window.PortClassification.classificar(f.properties || {}).id === this.filtroPorto);
      }

      if (this.termoBusca) {
        base = base.filter(f => {
          const p = f.properties || {};
          for (const c of this.colunas) {
            if (String(p[c] || '').toLowerCase().includes(this.termoBusca)) return true;
          }
          return false;
        });
      }

      this.filtradas = base;
    },

    anterior: function () {
      if (this.pagina > 1) { this.pagina--; this.renderizar(); }
    },

    proximo: function () {
      const totalPag = Math.max(1, Math.ceil(this.filtradas.length / this.porPagina));
      if (this.pagina < totalPag) { this.pagina++; this.renderizar(); }
    },

    renderizar: function () {
      const nomeCamada = CONFIG_CAMADAS[this.camadaAtualId]?.nome || this.camadaAtualId;
      const total = this.filtradas.length;
      const totalGeral = this.features.length;
      const totalPag = Math.max(1, Math.ceil(total / this.porPagina));
      if (this.pagina > totalPag) this.pagina = totalPag;

      const inicio = (this.pagina - 1) * this.porPagina;
      const fim = Math.min(inicio + this.porPagina, total);
      const dadosPagina = this.filtradas.slice(inicio, fim);

      const titEl = document.getElementById('titulo-tabela-camada');
      if (titEl) {
        let extra = '';
        if (this.camadaAtualId === 'instalacoes_portuarias' && this.filtroPorto !== 'TODOS') {
          extra = ` [${window.PortClassification.tipos[this.filtroPorto]?.nome || this.filtroPorto}]`;
        }
        titEl.innerText = total !== totalGeral
          ? `Tabela: ${nomeCamada}${extra} (${total} de ${totalGeral} itens)`
          : `Tabela: ${nomeCamada}${extra} (${totalGeral} itens)`;
      }

      const infoEl = document.getElementById('info-paginacao-tabela');
      if (infoEl) {
        infoEl.innerText = total > 0
          ? `${inicio + 1}–${fim} de ${total} (Pág ${this.pagina}/${totalPag})`
          : `0 de 0`;
      }

      const thead = document.getElementById('thead-atributos');
      let th = '<tr><th style="width:50px; text-align:center;">Zoom</th>';
      this.colunas.forEach(c => th += `<th>${window.Security.escapeHTML(c)}</th>`);
      thead.innerHTML = th + '</tr>';

      const tbody = document.getElementById('tbody-atributos');
      if (!dadosPagina.length) {
        tbody.innerHTML = `<tr><td colspan="${this.colunas.length + 1}" style="text-align:center; padding:18px; color:#64748b;">Nenhum registro.</td></tr>`;
        return;
      }

      let linhasHTML = '';
      dadosPagina.forEach((f, idx) => {
        const globalIdx = inicio + idx;
        linhasHTML += `<tr><td style="text-align:center;"><button style="background:#0284c7; color:#fff; border:none; padding:2px 6px; border-radius:3px; cursor:pointer;" onclick="TabelaManager.aproximar(${globalIdx})">📍</button></td>`;
        this.colunas.forEach(c => {
          linhasHTML += `<td>${window.Security.escapeHTML(f.properties ? f.properties[c] : '')}</td>`;
        });
        linhasHTML += '</tr>';
      });
      tbody.innerHTML = linhasHTML;
    },

    aproximar: function (idx) {
      const f = this.filtradas[idx];
      if (f && window.SearchEngine) window.SearchEngine.aproximar(f);
    }
  };

  window.TabelaManager = TabelaManager;
  console.info('[js] TabelaManager carregado');
})();
/* --- FIM: js/domain/tabela-manager.js --- */

/* --- INÍCIO: js/domain/catalogo-manager.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: CatalogoManager
   Escopo: catálogo de camadas (retirar / adicionar do painel)
   Dependências: window.CONFIG_CAMADAS, window.UI
   Referências "lazy": window.toggleCamada (função global inline)
   Expõe: window.CatalogoManager
   ============================================================ */
(function () {
  'use strict';

  const CatalogoManager = {
    storageKey: 'antaq_webgis_camadas_ocultas',

    obterOcultas: function () {
      try {
        const s = localStorage.getItem(this.storageKey);
        return s ? JSON.parse(s) : [];
      } catch (e) { return []; }
    },

    salvarOcultas: function (lista) {
      try { localStorage.setItem(this.storageKey, JSON.stringify(lista)); } catch (e) {}
    },

    ocultarCamada: function (id, opcoes) {
      opcoes = opcoes || {};
      const cfg = CONFIG_CAMADAS[id];
      const nome = cfg ? cfg.nome : id;
      const chk = document.getElementById(`chk-${id}`);
      const estavaLigada = chk ? chk.checked : false;

      if (!opcoes.semHistorico && window.ActionHistory) {
        const self = this;
        window.ActionHistory.registrar({
          tipo: 'ocultar-camada',
          descricao: `Retirar camada "${nome}" do painel`,
          undo: () => {
            self.adicionarCamadaAoPainel(id, { semHistorico: true });
            if (estavaLigada) {
              const c = document.getElementById(`chk-${id}`);
              if (c && !c.checked) {
                c.checked = true;
                if (typeof window.toggleCamada === 'function') {
                  window.toggleCamada(id, true, { semHistorico: true });
                }
              }
            }
          },
          redo: () => self.ocultarCamada(id, { semHistorico: true })
        });
      }

      if (chk && chk.checked) {
        chk.checked = false;
        if (typeof window.toggleCamada === 'function') {
          window.toggleCamada(id, false, { semHistorico: true });
        }
      }

      const el = document.getElementById(`item-camada-${id}`);
      if (el) el.style.display = 'none';

      const ocultas = this.obterOcultas();
      if (!ocultas.includes(id)) {
        ocultas.push(id);
        this.salvarOcultas(ocultas);
      }
      if (window.UI) window.UI.toast(`Camada "${nome}" retirada. Readicione em "➕ Adicionar".`);
    },

    adicionarCamadaAoPainel: function (id, opcoes) {
      opcoes = opcoes || {};
      const cfg = CONFIG_CAMADAS[id];
      const nome = cfg ? cfg.nome : id;

      if (!opcoes.semHistorico && window.ActionHistory) {
        const self = this;
        window.ActionHistory.registrar({
          tipo: 'adicionar-camada',
          descricao: `Readicionar camada "${nome}" ao painel`,
          undo: () => self.ocultarCamada(id, { semHistorico: true }),
          redo: () => self.adicionarCamadaAoPainel(id, { semHistorico: true })
        });
      }

      const el = document.getElementById(`item-camada-${id}`);
      if (el) el.style.display = 'flex';
      const ocultas = this.obterOcultas().filter(x => x !== id);
      this.salvarOcultas(ocultas);
      this.renderizarCatalogo();
      if (window.UI) window.UI.toast('Camada readicionada ao painel!');
    },

    mostrarTodas: function () {
      this.salvarOcultas([]);
      for (const id of Object.keys(CONFIG_CAMADAS)) {
        const el = document.getElementById(`item-camada-${id}`);
        if (el) el.style.display = 'flex';
      }
      this.renderizarCatalogo();
      if (window.UI) window.UI.toast('Todas as camadas visíveis!');
    },

    abrirModal: function () {
      const m = document.getElementById('modal-catalogo-camadas');
      if (!m) return;
      m.classList.add('aberto');
      this.renderizarCatalogo();
    },

    fecharModal: function () {
      const m = document.getElementById('modal-catalogo-camadas');
      if (m) m.classList.remove('aberto');
    },
    /**
     * Exclui PERMANENTEMENTE uma camada gerada (buffer, importada).
     * Diferente de ocultarCamada(), remove do mapa, memória e painel.
     * NÃO funciona em camadas do sistema (infra, limites, etc.).
     */
    excluirPermanentemente: function (id) {
      const cfg = CONFIG_CAMADAS[id];
      if (!cfg) return;

      // ✅ Só permite excluir camadas geradas
      const ehGerada = cfg._isBuffer || cfg.grupo === 'importadas' || id.startsWith('imp_') || id.startsWith('buffer_');
      if (!ehGerada) {
        if (window.UI) window.UI.toast('⚠️ Esta camada é do sistema e não pode ser excluída.');
        return;
      }

      const nome = cfg.nome || id;
      if (!confirm(`Excluir permanentemente "${nome}"?\n\nEsta ação remove a camada do mapa, do painel e da memória. Não pode ser desfeita.`)) {
        return;
      }

      // 1. Remove do mapa
      if (CAMADAS_MAPA[id]) {
        try { window.mapa.removeLayer(CAMADAS_MAPA[id]); } catch (e) {}
        delete CAMADAS_MAPA[id];
      }

      // 2. Remove dos dados brutos
      delete DADOS_GEOJSON_BRUTOS[id];

      // 3. Remove da config
      delete CONFIG_CAMADAS[id];

      // 4. Remove do localStorage (se estava oculta)
      const ocultas = this.obterOcultas().filter(x => x !== id);
      this.salvarOcultas(ocultas);

      // 5. Remove do DOM
      const item = document.getElementById(`item-camada-${id}`);
      if (item) item.remove();

      // 6. Remove do painel do copiloto (se aparecer lá)
      if (window.FilterManager) {
        try { window.FilterManager.atualizarSeletorCamadas(); } catch (e) {}
      }

      // 7. Atualiza legenda
      if (window.Styler) {
        try { window.Styler.atualizarLegenda(); } catch (e) {}
      }

      // 8. Re-renderiza catálogo (se estiver aberto)
      this.renderizarCatalogo();

      console.info(`[Catálogo] Camada "${nome}" excluída permanentemente.`);
      if (window.UI) window.UI.toast(`🗑️ Camada "${nome}" excluída permanentemente.`);
    },

    /**
     * Exclui TODAS as camadas geradas de uma vez.
     */
    excluirTodasGeradas: function () {
      const geradas = Object.keys(CONFIG_CAMADAS).filter(id => {
        const cfg = CONFIG_CAMADAS[id];
        return cfg._isBuffer || id.startsWith('imp_') || id.startsWith('buffer_') || cfg.grupo === 'importadas';
      });

      if (geradas.length === 0) {
        if (window.UI) window.UI.toast('Nenhuma camada gerada para excluir.');
        return;
      }

      if (!confirm(`Excluir permanentemente ${geradas.length} camada(s) gerada(s)?\n\nEsta ação não pode ser desfeita.`)) {
        return;
      }

      for (const id of geradas) {
        // Remove sem confirmar individualmente
        const cfg = CONFIG_CAMADAS[id];
        if (!cfg) continue;

        if (CAMADAS_MAPA[id]) {
          try { window.mapa.removeLayer(CAMADAS_MAPA[id]); } catch (e) {}
          delete CAMADAS_MAPA[id];
        }
        delete DADOS_GEOJSON_BRUTOS[id];
        delete CONFIG_CAMADAS[id];

        const item = document.getElementById(`item-camada-${id}`);
        if (item) item.remove();
      }

      this.salvarOcultas([]);

      if (window.FilterManager) window.FilterManager.atualizarSeletorCamadas();
      if (window.Styler) window.Styler.atualizarLegenda();
      this.renderizarCatalogo();

      if (window.UI) window.UI.toast(`🗑️ ${geradas.length} camada(s) excluída(s).`);
    },
    renderizarCatalogo: function () {
      const container = document.getElementById('catalogo-conteudo-grupos');
      if (!container) return;

      const gruposInfo = {
        infra: { titulo: "⚓ Infraestrutura Aquaviária & Portuária" },
        multimodal: { titulo: "🚚 Transporte Multimodal (Ferrovias & Rodovias)" },
        limites: { titulo: "🗺️ Limites Territoriais & Bacias" },
        restricoes: { titulo: "🌿 Restrições Socioambientais & Territoriais" },
        importadas: { titulo: "📁 Camadas Importadas / Personalizadas" }
      };

      const ocultas = this.obterOcultas();
      let htmlGrupos = '';

      for (const [grpId, grpMeta] of Object.entries(gruposInfo)) {
        const camadasGrupo = Object.entries(CONFIG_CAMADAS).filter(([id, c]) => c.grupo === grpId && !id.startsWith('ven_'));
        if (!camadasGrupo.length) continue;

        let itensHTML = '';
        for (const [id, cfg] of camadasGrupo) {
          const estaOculta = ocultas.includes(id);
          const statusBadge = estaOculta
            ? '<span style="font-size:9px; color:#94a3b8; background:#334155; padding:2px 6px; border-radius:4px;">Oculta do Painel</span>'
            : '<span style="font-size:9px; color:#34d399; background:rgba(16,185,129,0.2); padding:2px 6px; border-radius:4px;">No Painel</span>';

          const botaoAcao = estaOculta
            ? `<button class="btn-catalogo-acao btn-catalogo-add" onclick="CatalogoManager.adicionarCamadaAoPainel('${id}')">+ Adicionar</button>`
            : `<button class="btn-catalogo-acao btn-catalogo-rem" onclick="CatalogoManager.ocultarCamada('${id}'); CatalogoManager.renderizarCatalogo();">✕ Retirar</button>`;

          itensHTML += `
            <div class="catalogo-item">
              <div style="display:flex; flex-direction:column; gap:3px;">
                <div class="catalogo-item-nome">
                  <span style="width:10px; height:10px; border-radius:2px; background:${cfg.cor}; display:inline-block;"></span>
                  <span>${cfg.nome}</span>
                </div>
                <div>${statusBadge}</div>
              </div>
              ${botaoAcao}
            </div>`;
        }

        htmlGrupos += `
          <div class="catalogo-grupo-bloco">
            <div class="catalogo-grupo-header">${grpMeta.titulo}</div>
            <div class="catalogo-grid">${itensHTML}</div>
          </div>`;
      }

      container.innerHTML = htmlGrupos;
    }
  };

  window.CatalogoManager = CatalogoManager;
  console.info('[js] CatalogoManager carregado');
})();
/* --- FIM: js/domain/catalogo-manager.js --- */

/* --- INÍCIO: js/domain/layer-metadata.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: LayerMetadata (M3)
   Escopo: modal de metadados da camada (fonte, escala, changelog, hash)
   Dependências: window.CONFIG_CAMADAS, window.METADADOS_CAMADAS,
                 window.DADOS_GEOJSON_BRUTOS, window.Security, window.UI
   Expõe: window.LayerMetadata
   ============================================================ */
(function () {
  'use strict';

  const LayerMetadata = {
    camadaAtualId: null,

    abrir: async function (id) {
      this.camadaAtualId = id;

      // ✅ Carrega sob demanda (pra mostrar contagem real de feições)
      if (!DADOS_GEOJSON_BRUTOS[id]?.features?.length) {
        try {
          if (window.UI) window.UI.toast(`⏳ Carregando ${CONFIG_CAMADAS[id]?.nome || id}...`);
          await window.DataManager.carregarCamada(id);
        } catch (e) {
          // Não bloqueia — metadados funcionam mesmo sem feições
          console.warn('[M3] Falha ao carregar camada para metadados:', e);
        }
      }

      const cfg = CONFIG_CAMADAS[id] || {};
      const meta = METADADOS_CAMADAS[id] || {};

      const titulo = document.getElementById('meta-nome-camada');
      if (titulo) titulo.innerText = cfg.nome || id;

      const corpo = document.getElementById('meta-corpo');
      if (!corpo) return;

      const naoInformado = '<span style="color:#64748b; font-style:italic;">Não informado</span>';
      const esc = (v) => v ? window.Security.escapeHTML(String(v)) : naoInformado;

      let changelogHTML = '';
      if (meta.changelog && meta.changelog.length) {
        changelogHTML = '<ul class="meta-changelog">' +
          meta.changelog.map(c => `<li>${window.Security.escapeHTML(c)}</li>`).join('') +
          '</ul>';
      } else {
        changelogHTML = '<p class="meta-descricao" style="color:#64748b; font-style:italic;">Nenhum registro de alteração.</p>';
      }

      const numFeatures = DADOS_GEOJSON_BRUTOS[id]?.features?.length;
      const numFeatTexto = numFeatures
        ? `<strong>${numFeatures.toLocaleString('pt-BR')}</strong> feições carregadas`
        : (meta.numero_features || 'Não informado');

      corpo.innerHTML = `
        <div class="meta-bloco">
          <div class="meta-titulo">📋 Descrição</div>
          <p class="meta-descricao">${esc(meta.descricao)}</p>
        </div>

        <div class="meta-bloco">
          <div class="meta-titulo">🗂️ Origem e Procedência</div>
          <div class="meta-linha"><span class="rotulo">Fonte</span><span class="valor">${esc(meta.fonte)}</span></div>
          <div class="meta-linha"><span class="rotulo">Escala Cartográfica</span><span class="valor">${esc(meta.escala)}</span></div>
          <div class="meta-linha"><span class="rotulo">Datum</span><span class="valor">${esc(meta.datum)}</span></div>
          <div class="meta-linha"><span class="rotulo">Processo / Referência</span><span class="valor">${esc(meta.processo)}</span></div>
        </div>

        <div class="meta-bloco">
          <div class="meta-titulo">🔄 Atualização e Governança</div>
          <div class="meta-linha"><span class="rotulo">Periodicidade</span><span class="valor">${esc(meta.atualizacao)}</span></div>
          <div class="meta-linha"><span class="rotulo">Responsável Técnico</span><span class="valor">${esc(meta.responsavel)}</span></div>
          <div class="meta-linha"><span class="rotulo">Volume</span><span class="valor">${numFeatTexto}</span></div>
          <div class="meta-linha"><span class="rotulo">Tipo Geométrico</span><span class="valor">${esc(cfg.tipoGeo || 'auto')}</span></div>
        </div>

        <div class="meta-bloco">
          <div class="meta-titulo">📜 Changelog</div>
          ${changelogHTML}
        </div>

        <div class="meta-bloco">
          <div class="meta-titulo">🔐 Integridade</div>
          <div class="meta-hash">
            <span id="meta-hash-valor">${this._gerarHashFake(id)}</span>
            <button onclick="LayerMetadata._copiarHash()">Copiar</button>
          </div>
          <p class="meta-descricao" style="font-size:10.5px; color:#64748b; margin-top:8px;">
            Hash de referência da versão carregada. Em produção, será substituído pelo SHA-256 real do arquivo GeoJSON.
          </p>
        </div>
      `;

      document.getElementById('modal-metadados').classList.add('aberto');
    },

    fechar: function () {
      document.getElementById('modal-metadados').classList.remove('aberto');
    },

    _gerarHashFake: function (id) {
      let h = 0;
      for (let i = 0; i < id.length; i++) {
        h = ((h << 5) - h) + id.charCodeAt(i);
        h |= 0;
      }
      const base = Math.abs(h).toString(16).padStart(8, '0');
      return (base + base + base + base).slice(0, 32);
    },

    _copiarHash: function () {
      const el = document.getElementById('meta-hash-valor');
      if (!el) return;
      navigator.clipboard.writeText(el.textContent).then(() => {
        if (window.UI) window.UI.toast('📋 Hash copiado para a área de transferência.');
      }).catch(() => {
        if (window.UI) window.UI.toast('⚠️ Não foi possível copiar o hash.');
      });
    }
  };

  window.LayerMetadata = LayerMetadata;
  console.info('[js] LayerMetadata carregado');
})();
/* --- FIM: js/domain/layer-metadata.js --- */

/* --- INÍCIO: js/domain/measurement-tool.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: MeasurementTool (M1)
   Escopo: medição de distância, área e raio (Turf.js)
           + snap em vértices (grid espacial)
           + overlay ao vivo seguindo o cursor
   Dependências: window.UI, window.mapa, turf (global)
   Expõe: window.MeasurementTool
   ============================================================ */
(function () {
  'use strict';

  const MeasurementTool = {
    modo: null,
    pontos: [],
    marcadoresTemp: [],
    linhaTemp: null,
    poligonoTemp: null,
    circuloTemp: null,
    labelsTemp: [],
    medicoesSalvas: [],
    _ultimoClickTempo: 0,
    _ultimoClickScreen: null,
    _ultimoMove: 0,

    /* ---------- Snap ---------- */
    _snapAtivo: false,
    _snapGrid: {},          // { "lat_cell|lng_cell": [{lat,lng,camada}, ...] }
    _snapTotal: 0,
    _snapIndicator: null,   // marker visual atual
    _snapPoint: null,       // { lat, lng, camada } ou null
    _snapCtrlInvertido: false,

    /* ---------- Overlay ao vivo ---------- */
    _overlayEl: null,

    /* ============================================================
       CICLO DE VIDA
       ============================================================ */
    ativar: function (modo) {
      if (this.modo === modo) { this.desativar(); return; }

      this.limparTemporarios();
      this.modo = modo;
      // ✅ Mostra painel de raio só no modo raio
      const painelRaio = document.getElementById('painel-raio-config');
      if (painelRaio) {
        painelRaio.style.display = (modo === 'raio') ? 'block' : 'none';
      }      
      // ✅ Bloqueia popups de atributos durante a medição
      document.body.classList.add('modo-medicao-ativo');

      // ✅ Impede que o duplo-clique dispare zoom em vez de finalizar
      if (window.mapa && window.mapa.doubleClickZoom) window.mapa.doubleClickZoom.disable();
      if (window.mapa && window.mapa.boxZoom) window.mapa.boxZoom.disable();
      this.pontos = [];

      document.querySelectorAll('.btn-medicao').forEach(b => b.classList.remove('ativo'));
      const btn = document.getElementById(`btn-medir-${modo}`);
      if (btn) btn.classList.add('ativo');

      const painel = document.getElementById('painel-medicao-resultados');
      if (painel) painel.classList.add('aberto');

      // Carrega preferência de snap do localStorage
      this._snapAtivo = localStorage.getItem('antaq_medicao_snap') === 'true';
      this._atualizarBotaoSnap();
      if (this._snapAtivo) this._construirGridSnap();

      const totalSalvas = this.medicoesSalvas.length;
      let dicaInicial = totalSalvas > 0
        ? `Clique para nova medição. ${totalSalvas} medição(ões) no mapa.`
        : 'Clique no mapa para começar. Duplo-clique para finalizar.';
      if (this._snapAtivo) dicaInicial = `🔗 Snap ativo (${this._snapTotal.toLocaleString('pt-BR')} vértices) · ` + dicaInicial;
      this._atualizarPainel(modo, 0, dicaInicial);

      document.getElementById('mapa').style.cursor = 'crosshair';
      this._bindListeners();
      this._configurarOverlay();
    },

    desativar: function () {
      // ✅ Esconde painel de raio
      const painelRaio = document.getElementById('painel-raio-config');
      if (painelRaio) painelRaio.style.display = 'none';      
      this.modo = null;
      // ✅ Restaura popups ao sair da medição
      document.body.classList.remove('modo-medicao-ativo');
      this._esconderBotaoFinalizarRaio();
      // ✅ Reabilita zoom no duplo-clique
      if (window.mapa && window.mapa.doubleClickZoom) window.mapa.doubleClickZoom.enable();
      this._ultimoClickTempo = 0;
      this._ultimoClickScreen = null;
      document.querySelectorAll('.btn-medicao').forEach(b => b.classList.remove('ativo'));
      document.getElementById('mapa').style.cursor = '';
      const painel = document.getElementById('painel-medicao-resultados');
      if (painel) painel.classList.remove('aberto');
      this._unbindListeners();
      this.limparTemporarios();
      this._ocultarOverlay();
      this._removerIndicadorSnap();
    },

    /* ============================================================
       SNAP — CONFIGURAÇÃO E GRID
       ============================================================ */
    toggleSnap: function () {
      this._snapAtivo = !this._snapAtivo;
      localStorage.setItem('antaq_medicao_snap', String(this._snapAtivo));
      this._atualizarBotaoSnap();

      if (this._snapAtivo) {
        this._construirGridSnap();
        if (window.UI) window.UI.toast(`🔗 Snap ativo — ${this._snapTotal.toLocaleString('pt-BR')} vértices indexados.`);
      } else {
        this._removerIndicadorSnap();
        if (window.UI) window.UI.toast('🔗 Snap desativado.');
      }
    },

    _atualizarBotaoSnap: function () {
      const btn = document.getElementById('btn-medicao-snap');
      if (!btn) return;
      if (this._snapAtivo) btn.classList.add('ativo-snap');
      else btn.classList.remove('ativo-snap');
    },

    _construirGridSnap: function () {
      this._snapGrid = {};
      this._snapTotal = 0;

      const inicio = performance.now();

      // ✅ Só indexa o que está visível no viewport atual (evita indexar 7673 rodovias fora da tela)
      const bounds = window.mapa.getBounds();
      let limitados = 0;

      for (const [id, layer] of Object.entries(window.CAMADAS_MAPA)) {
        if (!window.mapa.hasLayer(layer)) continue;
        try {
          if (typeof layer.eachLayer === 'function') {
            layer.eachLayer(sub => {
              // Filtro rápido por bbox
              try {
                if (sub.getBounds && !bounds.intersects(sub.getBounds())) return;
                if (sub.getLatLng && !bounds.contains(sub.getLatLng())) return;
              } catch (e) { /* ignora */ }

              limitados++;
              this._extrairVerticesDe(sub, id);
            });
          }
        } catch (e) { /* camada sem eachLayer */ }
      }

      const duracao = (performance.now() - inicio).toFixed(0);
      const celulas = Object.keys(this._snapGrid).length;
      console.info(`[M1] Snap: ${this._snapTotal} vértices em ${celulas} células (${duracao}ms)`);
    },

    _extrairVerticesDe: function (sub, camadaId, profundidade) {
      if (!sub) return;
      profundidade = profundidade || 0;
      if (profundidade > 5) return; // proteção anti-loop

      // 1) Marker ou CircleMarker com posição única
      if (typeof sub.getLatLng === 'function' && typeof sub.getLatLngs !== 'function') {
        try { this._adicionarVertice(sub.getLatLng(), camadaId); } catch (e) {}
        return;
      }

      // 2) Polyline / Polygon
      if (typeof sub.getLatLngs === 'function') {
        try { this._percorrerLatLngs(sub.getLatLngs(), camadaId); } catch (e) {}
        return;
      }

      // 3) ✅ LayerGroup / FeatureGroup / MarkerClusterGroup — recursão
      if (typeof sub.eachLayer === 'function') {
        try {
          sub.eachLayer(inner => this._extrairVerticesDe(inner, camadaId, profundidade + 1));
        } catch (e) { /* ignora */ }
      }
    },
    _percorrerLatLngs: function (arr, camadaId) {
      if (!Array.isArray(arr)) return;
      for (const item of arr) {
        if (Array.isArray(item)) {
          this._percorrerLatLngs(item, camadaId);
        } else if (item && typeof item.lat === 'number' && typeof item.lng === 'number') {
          this._adicionarVertice(item, camadaId);
        }
      }
    },

    _adicionarVertice: function (ll, camadaId) {
      const key = this._chaveGrid(ll.lat, ll.lng);
      if (!this._snapGrid[key]) this._snapGrid[key] = [];
      this._snapGrid[key].push({ lat: ll.lat, lng: ll.lng, camada: camadaId });
      this._snapTotal++;
    },

    _chaveGrid: function (lat, lng) {
      // Grid de 0.1° (~11 km) — equilíbrio entre resolução e overhead
      return `${Math.floor(lat * 10)}|${Math.floor(lng * 10)}`;
    },

    _encontrarSnap: function (latlng, screenPoint, raioPx) {
      if (!this._snapTotal) return null;

      const cellLat = Math.floor(latlng.lat * 10);
      const cellLng = Math.floor(latlng.lng * 10);

      let melhor = null;
      let menorDist = raioPx;

      for (let dLat = -1; dLat <= 1; dLat++) {
        for (let dLng = -1; dLng <= 1; dLng++) {
          const key = `${cellLat + dLat}|${cellLng + dLng}`;
          const verts = this._snapGrid[key];
          if (!verts) continue;
          for (const v of verts) {
            const sp = window.mapa.latLngToContainerPoint([v.lat, v.lng]);
            const d = sp.distanceTo(screenPoint);
            if (d < menorDist) {
              menorDist = d;
              melhor = v;
            }
          }
        }
      }
      return melhor;
    },
    /**
     * Verifica se o clique caiu "dentro" de algum marker visível no mapa.
     * Retorna o L.LatLng do centro do marker se sim, ou null se não.
     * Marcadores têm prioridade sobre snap de vértices genéricos.
     */
    _detectarMarkerNoClique: function (screenPoint, toleranciaPx) {
      toleranciaPx = toleranciaPx || 15;
      let melhor = null;
      let menorDist = toleranciaPx;

      const verificar = (layer) => {
        if (!layer || typeof layer.getLatLng !== 'function') return;
        // Só considera markers — polylines/polygons têm getLatLngs
        if (typeof layer.getLatLngs === 'function') return;

        try {
          const ll = layer.getLatLng();
          const sp = window.mapa.latLngToContainerPoint(ll);
          const d = sp.distanceTo(screenPoint);
          // Considera o raio visual do próprio marker (CircleMarker)
          const raioMarker = (layer.getRadius && layer.getRadius()) || 6;
          const toleranciaReal = Math.max(toleranciaPx, raioMarker + 3);
          if (d < toleranciaReal && d < menorDist + raioMarker) {
            menorDist = d;
            melhor = ll;
          }
        } catch (e) { /* ignora */ }
      };

      // Percorre todas as camadas visíveis
      for (const [id, camada] of Object.entries(window.CAMADAS_MAPA)) {
        if (!window.mapa.hasLayer(camada)) continue;
        try {
          if (typeof camada.eachLayer === 'function') {
            camada.eachLayer(sub => {
              // Desce um nível pra pegar clusters
              if (sub && typeof sub.eachLayer === 'function' && typeof sub.getLatLng !== 'function') {
                sub.eachLayer(inner => verificar(inner));
              } else {
                verificar(sub);
              }
            });
          }
        } catch (e) { /* ignora */ }
      }

      return melhor;
    },
    _mostrarIndicadorSnap: function (vertice) {
      this._removerIndicadorSnap();
      if (!vertice) return;

      this._snapIndicator = L.marker([vertice.lat, vertice.lng], {
        icon: L.divIcon({
          className: '',
          html: '<div class="snap-indicator"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        }),
        interactive: false,
        pane: 'panePontos'
      }).addTo(window.mapa);
    },

    _removerIndicadorSnap: function () {
      if (this._snapIndicator && window.mapa.hasLayer(this._snapIndicator)) {
        window.mapa.removeLayer(this._snapIndicator);
      }
      this._snapIndicator = null;
      this._snapPoint = null;
    },

    /* ============================================================
       OVERLAY AO VIVO
       ============================================================ */
    _configurarOverlay: function () {
      this._overlayEl = document.getElementById('medicao-live-overlay');
    },

    _atualizarOverlay: function (parcial, total, hint) {
      if (!this._overlayEl) return;

      const parcialEl = document.getElementById('live-parcial');
      const totalEl = document.getElementById('live-total');
      const hintEl = document.getElementById('live-hint');

      if (parcialEl) parcialEl.textContent = this._fmtDist(parcial);
      if (totalEl) totalEl.textContent = this._fmtDist(total);
      if (hintEl) {
        if (hint) {
          hintEl.textContent = hint;
          hintEl.classList.add('visivel');
        } else {
          hintEl.classList.remove('visivel');
        }
      }

      this._overlayEl.style.display = 'block';
    },

    _posicionarOverlay: function (e) {
      if (!this._overlayEl) return;
      // Offset de 15px pra não cobrir o cursor
      const x = e.originalEvent ? e.originalEvent.clientX : e.clientX;
      const y = e.originalEvent ? e.originalEvent.clientY : e.clientY;
      if (typeof x !== 'number' || typeof y !== 'number') return;
      this._overlayEl.style.left = (x + 15) + 'px';
      this._overlayEl.style.top = (y + 15) + 'px';
    },

    _ocultarOverlay: function () {
      if (this._overlayEl) this._overlayEl.style.display = 'none';
    },

    _fmtDist: function (km) {
      if (!km && km !== 0) return '—';
      if (km < 1) return `${(km * 1000).toFixed(0)} m`;
      if (km < 10) return `${km.toFixed(3)} km`;
      return `${km.toFixed(2)} km`;
    },

    /* ============================================================
       LISTENERS
       ============================================================ */
    _bindListeners: function () {
      this._unbindListeners();
      const self = this;

      // ✅ Handler em CAPTURE PHASE registrado no document — pega ANTES de tudo
      this._handlers = {
        clickDom: function (domEvent) {
          if (!self.modo) return;

          // Só processa se o clique foi DENTRO do container do mapa
          const container = window.mapa.getContainer();
          if (!container.contains(domEvent.target)) return;

          // Ignora cliques em controles do Leaflet
          if (domEvent.target.closest && domEvent.target.closest('.leaflet-control')) return;
          if (domEvent.target.closest && domEvent.target.closest('.leaflet-popup')) return;

          // Ignora botão direito / modificadores de navegação
          if (domEvent.button !== 0) return;

          // Converte coordenadas de tela → latlng
          const rect = container.getBoundingClientRect();
          const point = L.point(domEvent.clientX - rect.left, domEvent.clientY - rect.top);

          // ✅ PRIORIDADE 1: clique dentro de um marker (porto, embarcação, etc.)
          // Se o clique caiu "dentro" de um CircleMarker, usa o centro exato dele
          const markerExato = self._detectarMarkerNoClique(point, 15);

          // ✅ PRIORIDADE 2: snap em vértices
          const latlngBase = markerExato || window.mapa.containerPointToLatLng(point);
          const snapVertice = self._snapPoint
            ? L.latLng(self._snapPoint.lat, self._snapPoint.lng)
            : null;

          // Se marcador + snap estiverem perto, marcador vence
          let latlng = latlngBase;
          if (snapVertice && markerExato) {
            const dMarker = window.mapa.latLngToContainerPoint(markerExato).distanceTo(point);
            const dSnap = window.mapa.latLngToContainerPoint(snapVertice).distanceTo(point);
            latlng = dMarker <= dSnap ? markerExato : snapVertice;
          } else if (markerExato) {
            latlng = markerExato;
          } else if (snapVertice) {
            latlng = snapVertice;
          }

          // Se achou marcador, também atualiza o snapPoint pra ficar consistente
          if (markerExato) {
            self._snapPoint = { lat: markerExato.lat, lng: markerExato.lng, camada: 'marker' };
          }

          domEvent.stopPropagation();
          domEvent.preventDefault();

          self._onMapClick({ latlng: latlng, originalEvent: domEvent });
        },
        dblclickDom: function (domEvent) {
          if (!self.modo) return;
          const container = window.mapa.getContainer();
          if (!container.contains(domEvent.target)) return;
          if (domEvent.target.closest && domEvent.target.closest('.leaflet-control')) return;

          domEvent.stopPropagation();
          domEvent.preventDefault();
          self._finalizar();
        },
        mousemove: (e) => self._onMouseMove(e),
        mouseout: () => { self._ocultarOverlay(); self._removerIndicadorSnap(); },
        keydown: (ev) => {
          if (ev.key === 'Escape') self.desativar();
          if (ev.key === 'Control' && self._snapAtivo) self._snapCtrlInvertido = true;
          if (ev.key === 'Alt' && !self._snapAtivo && self._snapTotal > 0) self._snapCtrlInvertido = true;
        },
        keyup: (ev) => {
          if (ev.key === 'Control' || ev.key === 'Alt') self._snapCtrlInvertido = false;
        }
      };

      // ✅ Registra no document, capture phase
      document.addEventListener('click', this._handlers.clickDom, true);
      document.addEventListener('dblclick', this._handlers.dblclickDom, true);

      // Mousemove continua no Leaflet
      window.mapa.on('mousemove', this._handlers.mousemove);
      window.mapa.on('mouseout', this._handlers.mouseout);

      document.addEventListener('keydown', this._handlers.keydown);
      document.addEventListener('keyup', this._handlers.keyup);

      console.log('[M1] Listeners registrados. Modo:', self.modo);
    },

    _unbindListeners: function () {
      if (!this._handlers) return;

      document.removeEventListener('click', this._handlers.clickDom, true);
      document.removeEventListener('dblclick', this._handlers.dblclickDom, true);

      window.mapa.off('mousemove', this._handlers.mousemove);
      window.mapa.off('mouseout', this._handlers.mouseout);

      document.removeEventListener('keydown', this._handlers.keydown);
      document.removeEventListener('keyup', this._handlers.keyup);

      this._handlers = null;
      console.log('[M1] Listeners removidos.');
    },

    /* ============================================================
       EVENTOS DO MAPA
       ============================================================ */
    _onMapClick: function (e) {
      if (!this.modo) return;

      // ✅ Garante que nenhum popup roube a interação
      if (window.mapa && window.mapa.closePopup) window.mapa.closePopup();

      // Usa ponto de snap se disponível, senão o clique cru
      const latlng = this._snapPoint
        ? L.latLng(this._snapPoint.lat, this._snapPoint.lng)
        : e.latlng;

      const screenPoint = window.mapa.latLngToContainerPoint(latlng);
      const agora = Date.now();

      if (this._ultimoClickTempo &&
          (agora - this._ultimoClickTempo) < 320 &&
          this._ultimoClickScreen &&
          this._ultimoClickScreen.distanceTo(screenPoint) < 10) {
        this._ultimoClickTempo = 0;
        this._ultimoClickScreen = null;
        return;
      }
      this._ultimoClickTempo = agora;
      this._ultimoClickScreen = screenPoint;

      if (this.modo === 'raio') {
        if (this.pontos.length === 0) {
          this.pontos.push(latlng);
          this._desenharCirculo(latlng, 0);
          this._atualizarPainel('raio', 0, 'Mova o mouse para ajustar o raio. Clique para finalizar.');
        } else {
          this._finalizar();
        }
        return;
      }

      this.pontos.push(latlng);
      this._desenharPontoTemp(latlng);
      this._atualizarFormaTemporaria();

      if (this.pontos.length === 1) {
        this._atualizarPainel(this.modo, 0, 'Clique em mais pontos. Duplo-clique ou ESC para finalizar.');
      }
    },

    _onMouseMove: function (e) {
      if (!this.modo) return;

      const agora = Date.now();
      if (this._ultimoMove && (agora - this._ultimoMove) < 33) return;
      this._ultimoMove = agora;

      const screenPoint = window.mapa.latLngToContainerPoint(e.latlng);

      /* ---------- 1. Resolve snap ---------- */
      const snapAtivoAgora = this._snapAtivo !== this._snapCtrlInvertido;
      let pontoEfetivo = e.latlng;

      if (snapAtivoAgora && this._snapTotal > 0) {
        const snap = this._encontrarSnap(e.latlng, screenPoint, 12);
        if (snap) {
          this._snapPoint = snap;
          pontoEfetivo = L.latLng(snap.lat, snap.lng);
          this._mostrarIndicadorSnap(snap);
        } else {
          this._snapPoint = null;
          this._removerIndicadorSnap();
        }
      } else {
        this._snapPoint = null;
        this._removerIndicadorSnap();
      }

      /* ---------- 2. Overlay + preview ---------- */
      this._posicionarOverlay(e);

      // Hint contextual (snap on/off/ctrl)
      let hint = '';
      if (snapAtivoAgora && this._snapPoint) hint = `🔗 vértice (${this._snapPoint.camada})`;
      else if (this._snapAtivo && this._snapCtrlInvertido) hint = 'snap suspenso (Ctrl)';
      else if (!this._snapAtivo && this._snapCtrlInvertido && this._snapTotal > 0) hint = 'snap forçado (Alt)';

      // Se não tem pontos ainda, só mostra o overlay básico
      if (this.pontos.length === 0) {
        this._atualizarOverlay(0, 0, hint || 'clique para iniciar');
        return;
      }

      /* ---------- 3. Preview do próximo segmento ---------- */
      if (this.modo === 'raio') {
        const centro = this.pontos[0];
        const dist = this._distanciaKm(centro, pontoEfetivo);
        this._desenharCirculo(centro, dist);
        const areaKm2 = Math.PI * dist * dist;
        this._atualizarOverlay(dist, dist, hint || `área ≈ ${areaKm2.toFixed(2)} km²`);
        this._atualizarPainel('raio', dist * 1000, `Área ≈ ${areaKm2.toFixed(2)} km²`);
        return;
      }

      const pontosPreview = [...this.pontos, pontoEfetivo];
      const totalAcumulado = this._calcularDistanciaTotal(this.pontos);
      const ultimoPonto = this.pontos[this.pontos.length - 1];
      const distParcial = this._distanciaKm(ultimoPonto, pontoEfetivo);

      if (this.modo === 'distancia') {
        this._desenharLinha(pontosPreview, false);
      } else {
        this._desenharPoligono(pontosPreview, false);
      }

      this._atualizarOverlay(distParcial, totalAcumulado + distParcial, hint);
    },

    _finalizar: function () {
      if (!this.modo) return;

      this._ultimoClickTempo = 0;
      this._ultimoClickScreen = null;
      this._removerIndicadorSnap();

      if (this.modo === 'raio') {
        if (this.pontos.length < 1 || !this.circuloTemp) { this.desativar(); return; }
        const centro = this.pontos[0];
        const raio = this.circuloTemp.getRadius() / 1000;
        const areaKm2 = Math.PI * raio * raio;

        this._atualizarPainel('raio', raio * 1000, `Área total ≈ ${areaKm2.toFixed(2)} km²`);
        this.medicoesSalvas.push(this.circuloTemp);
        this.circuloTemp = null;

        // ✅ Label 1: raio (acima do centro)
        const labelRaio = L.marker(centro, {
          icon: L.divIcon({
            className: 'label-medicao',
            html: `⭕ ${raio.toFixed(2)} km`,
            iconSize: [120, 20],
            iconAnchor: [60, -12]
          }),
          interactive: false,
          pane: 'panePontos'
        }).addTo(window.mapa);
        this.medicoesSalvas.push(labelRaio);

        // ✅ Label 2: área (abaixo do centro)
        const labelArea = L.marker(centro, {
          icon: L.divIcon({
            className: 'label-medicao label-area',
            html: `▦ ${areaKm2 >= 1000 ? (areaKm2 / 1000).toFixed(2) + ' mil km²' : areaKm2.toFixed(2) + ' km²'}`,
            iconSize: [140, 20],
            iconAnchor: [70, 30]
          }),
          interactive: false,
          pane: 'panePontos'
        }).addTo(window.mapa);
        this.medicoesSalvas.push(labelArea);

      } else if (this.modo === 'distancia') {
        if (this.pontos.length < 2) { this.desativar(); return; }
        if (this.linhaTemp) {
          try { this.linhaTemp.setStyle({ dashArray: null }); } catch (e) {}
          this.medicoesSalvas.push(this.linhaTemp);
        }
        this.linhaTemp = null;

      } else if (this.modo === 'area') {
        if (this.pontos.length < 3) { this.desativar(); return; }

        // ✅ Calcula a área final ANTES de limpar os pontos
        let areaM2 = 0, perimKm = 0;
        try {
          const coords = this.pontos.map(p => [p.lng, p.lat]);
          coords.push(coords[0]);
          const poly = turf.polygon([coords]);
          areaM2 = turf.area(poly);
          perimKm = this._calcularDistanciaTotal(this.pontos);
        } catch (e) { /* ignora */ }

        if (this.poligonoTemp) this.medicoesSalvas.push(this.poligonoTemp);
        this.poligonoTemp = null;

        // ✅ Label permanente da área no centroide
        if (areaM2 > 0) {
          try {
            // Centroide real via Turf
            const coords = this.pontos.map(p => [p.lng, p.lat]);
            coords.push(coords[0]);
            const poly = turf.polygon([coords]);
            const centroide = turf.centroid(poly);
            const [lngC, latC] = centroide.geometry.coordinates;

            const areaKm2 = areaM2 / 1_000_000;
            const textoArea = areaKm2 >= 1000
              ? `▦ ${(areaKm2 / 1000).toFixed(2)} mil km²`
              : `▦ ${areaKm2.toFixed(2)} km²`;

            const labelArea = L.marker([latC, lngC], {
              icon: L.divIcon({
                className: 'label-medicao label-area',
                html: textoArea,
                iconSize: [160, 22],
                iconAnchor: [80, 11]
              }),
              interactive: false,
              pane: 'panePontos'
            }).addTo(window.mapa);
            this.medicoesSalvas.push(labelArea);

            // ✅ Label secundária: perímetro (abaixo do centroide)
            const labelPerim = L.marker([latC, lngC], {
              icon: L.divIcon({
                className: 'label-medicao label-perimetro',
                html: `⟲ ${perimKm.toFixed(2)} km`,
                iconSize: [140, 18],
                iconAnchor: [70, -14]
              }),
              interactive: false,
              pane: 'panePontos'
            }).addTo(window.mapa);
            this.medicoesSalvas.push(labelPerim);
          } catch (e) { /* ignora */ }
        }
      }
      // ✅ Esconde o botão de fixar raio depois de finalizar
      this._esconderBotaoFinalizarRaio();
      this.labelsTemp.forEach(l => {
        l._permanente = true;
        this.medicoesSalvas.push(l);
      });

      this.pontos = [];
      this.marcadoresTemp.forEach(m => window.mapa.removeLayer(m));
      this.marcadoresTemp = [];
      this.labelsTemp = [];

      const totalSalvas = this.medicoesSalvas.length;
      this._atualizarPainel(this.modo, 0,
        `Clique para iniciar nova medição. ${totalSalvas} medição(ões) no mapa.`);
    },

    /* ============================================================
       DESENHO
       ============================================================ */
    _desenharPontoTemp: function (latlng) {
      const m = L.circleMarker(latlng, {
        radius: 5, fillColor: '#f59e0b', color: '#ffffff',
        weight: 2, fillOpacity: 1, pane: 'panePontos'
      }).addTo(window.mapa);
      this.marcadoresTemp.push(m);
    },

    _desenharLinha: function (pontos, permanente) {
      if (this.linhaTemp) window.mapa.removeLayer(this.linhaTemp);
      this.linhaTemp = L.polyline(pontos, {
        color: '#f59e0b', weight: 3, opacity: 0.95,
        dashArray: permanente ? null : '6, 4', pane: 'paneLinhas'
      }).addTo(window.mapa);
      this._calcularEExibirDistancia(pontos);
    },

    _desenharPoligono: function (pontos, permanente) {
      if (this.poligonoTemp) window.mapa.removeLayer(this.poligonoTemp);
      this.poligonoTemp = L.polygon(pontos, {
        color: '#f59e0b', weight: 3, fillColor: '#f59e0b',
        fillOpacity: 0.15, pane: 'paneLinhas'
      }).addTo(window.mapa);
      this._calcularEExibirArea(pontos);
    },

    _desenharCirculo: function (centro, raioKm) {
      if (this.circuloTemp) window.mapa.removeLayer(this.circuloTemp);
      this.circuloTemp = L.circle(centro, {
        radius: raioKm * 1000, color: '#f59e0b', weight: 3,
        fillColor: '#f59e0b', fillOpacity: 0.12, pane: 'paneLinhas'
      }).addTo(window.mapa);
    },
    /**
     * Aplica um raio exato digitado no input (em vez de arrastar o mouse).
     * Usa o primeiro ponto já clicado como centro, ou o centro do mapa se nenhum.
     */
    aplicarRaioExato: function () {
      const input = document.getElementById('raio-input-km');
      if (!input) return;

      const valorKm = parseFloat(input.value);
      if (!Number.isFinite(valorKm) || valorKm <= 0) {
        if (window.UI) window.UI.toast('⚠️ Informe um raio válido em km.');
        return;
      }

      // Se não tem centro definido, usa o centro do mapa
      let centro = this.pontos[0];
      if (!centro) {
        const c = window.mapa.getCenter();
        centro = L.latLng(c.lat, c.lng);
        this.pontos.push(centro);
      }

      // Desenha o círculo no raio exato
      this._desenharCirculo(centro, valorKm);

      // Atualiza o painel
      const areaKm2 = Math.PI * valorKm * valorKm;
      this._atualizarPainel('raio', valorKm * 1000,
        `Área ≈ ${areaKm2.toFixed(2)} km² · Clique em "Finalizar" ou no 2º ponto pra fixar`);

      // Cria o botão de finalizar se não existir
      this._mostrarBotaoFinalizarRaio();
    },

    _mostrarBotaoFinalizarRaio: function () {
      let btn = document.getElementById('btn-finalizar-raio');
      if (!btn) {
        btn = document.createElement('button');
        btn.id = 'btn-finalizar-raio';
        btn.textContent = '✓ Fixar raio';
        btn.style.cssText = `
          position: absolute; bottom: 90px; left: 50%;
          transform: translateX(-50%); z-index: 1501;
          background: #10b981; color: #fff; border: 1px solid #34d399;
          padding: 8px 20px; border-radius: 6px; font-size: 12px;
          font-weight: 800; cursor: pointer;
          box-shadow: 0 4px 14px rgba(16,185,129,0.4);
          font-family: 'Segoe UI', sans-serif;
        `;
        btn.onclick = () => this._finalizar();
        document.body.appendChild(btn);
      }
      btn.style.display = 'block';
    },

    _esconderBotaoFinalizarRaio: function () {
      const btn = document.getElementById('btn-finalizar-raio');
      if (btn) btn.style.display = 'none';
    },    

    _atualizarFormaTemporaria: function () {
      if (this.modo === 'distancia' && this.pontos.length >= 2) {
        this._desenharLinha(this.pontos, false);
      } else if (this.modo === 'area' && this.pontos.length >= 3) {
        this._desenharPoligono(this.pontos, false);
      }
    },

    /* ============================================================
       CÁLCULOS
       ============================================================ */
    _calcularEExibirDistancia: function (pontos) {
      if (pontos.length < 2) {
        this._atualizarPainel('distancia', 0, 'Adicione mais pontos.');
        return;
      }
      let totalKm = 0;
      const coords = pontos.map(p => [p.lng, p.lat]);

      this.labelsTemp.forEach(l => { if (l._tipo === 'segmento') window.mapa.removeLayer(l); });
      this.labelsTemp = this.labelsTemp.filter(l => l._tipo !== 'segmento');

      for (let i = 0; i < coords.length - 1; i++) {
        try {
          const seg = turf.lineString([coords[i], coords[i + 1]]);
          const distKm = turf.length(seg, { units: 'kilometers' });
          totalKm += distKm;
          const meio = [(pontos[i].lat + pontos[i + 1].lat) / 2, (pontos[i].lng + pontos[i + 1].lng) / 2];
          const label = L.marker(meio, {
            icon: L.divIcon({
              className: 'label-medicao',
              html: distKm < 1 ? `${(distKm * 1000).toFixed(0)} m` : `${distKm.toFixed(2)} km`,
              iconSize: [60, 20],
              iconAnchor: [30, 10]
            }),
            interactive: false,
            pane: 'panePontos'
          }).addTo(window.mapa);
          label._tipo = 'segmento';
          this.labelsTemp.push(label);
        } catch (err) {}
      }

      const dica = pontos.length >= 2 ? 'Duplo-clique para finalizar.' : 'Adicione mais pontos.';
      this._atualizarPainel('distancia', totalKm * 1000, dica);
    },

    _calcularEExibirArea: function (pontos) {
      if (pontos.length < 3) {
        const parcial = this._calcularDistanciaTotal(pontos);
        this._atualizarPainel('area', parcial * 1000, 'Adicione pelo menos 3 pontos para calcular a área.');
        return;
      }
      try {
        const coords = pontos.map(p => [p.lng, p.lat]);
        coords.push(coords[0]);
        const poly = turf.polygon([coords]);
        const areaM2 = turf.area(poly);
        const areaKm2 = areaM2 / 1_000_000;
        const perimKm = this._calcularDistanciaTotal(pontos);
        this._atualizarPainel('area', areaKm2 * 1_000_000, `Perímetro: ${perimKm.toFixed(2)} km • Duplo-clique para finalizar.`);
      } catch (err) {}
    },

    _calcularDistanciaTotal: function (pontos) {
      let total = 0;
      for (let i = 0; i < pontos.length - 1; i++) {
        total += this._distanciaKm(pontos[i], pontos[i + 1]);
      }
      return total;
    },

    _distanciaKm: function (a, b) {
      try {
        return turf.distance([a.lng, a.lat], [b.lng, b.lat], { units: 'kilometers' });
      } catch (e) {
        return a.distanceTo(b) / 1000;
      }
    },

    /* ============================================================
       PAINEL / LIMPEZA
       ============================================================ */
    _atualizarPainel: function (modo, valor, dica) {
      const rotulo = document.getElementById('medicao-rotulo');
      const valorEl = document.getElementById('medicao-valor');
      const dicaEl = document.getElementById('medicao-dica');
      if (!rotulo) return;

      const nomes = { distancia: '📏 Distância total', area: '⬛ Área total', raio: '⭕ Raio' };
      rotulo.textContent = nomes[modo] || 'Medição';

      if (modo === 'area') {
        valorEl.textContent = valor >= 1_000_000 ? `${(valor / 1_000_000).toFixed(3)} km²`
                           : valor >= 1000 ? `${(valor / 1000).toFixed(2)} km²`
                           : `${valor.toFixed(2)} m²`;
      } else {
        valorEl.textContent = valor >= 1000 ? `${(valor / 1000).toFixed(3)} km`
                           : `${valor.toFixed(1)} m`;
      }
      dicaEl.textContent = dica || '';
    },

    limparTemporarios: function () {
      if (this.linhaTemp) window.mapa.removeLayer(this.linhaTemp);
      if (this.poligonoTemp) window.mapa.removeLayer(this.poligonoTemp);
      if (this.circuloTemp) window.mapa.removeLayer(this.circuloTemp);
      this.linhaTemp = this.poligonoTemp = this.circuloTemp = null;
      this.marcadoresTemp.forEach(m => window.mapa.removeLayer(m));
      this.marcadoresTemp = [];
      this.labelsTemp.forEach(l => window.mapa.removeLayer(l));
      this.labelsTemp = [];
      this.pontos = [];
      this._removerIndicadorSnap();
    },

    limparTudo: function () {
      this.limparTemporarios();

      this.medicoesSalvas.forEach(m => { if (window.mapa.hasLayer(m)) window.mapa.removeLayer(m); });
      this.medicoesSalvas = [];

      const orfaos = [];
      window.mapa.eachLayer(layer => {
        try {
          if (layer instanceof L.Marker &&
              layer.options &&
              layer.options.icon &&
              layer.options.icon.options &&
              (layer.options.icon.options.className === 'label-medicao' ||
               (layer.options.icon.options.html || '').indexOf('snap-indicator') !== -1)) {
            orfaos.push(layer);
          }
        } catch (e) {}
      });
      orfaos.forEach(l => window.mapa.removeLayer(l));

      if (window.UI) window.UI.toast(`🧹 Medições removidas (${this.medicoesSalvas.length + orfaos.length} elementos).`);
    }
  };

  window.MeasurementTool = MeasurementTool;
  console.info('[js] MeasurementTool carregado (com snap + overlay)');
})();
/* --- FIM: js/domain/measurement-tool.js --- */

/* --- INÍCIO: js/domain/selection-manager.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: SelectionManager (M2)
   Escopo: seleção múltipla de feições (Ctrl+Clique, Shift+Arrastar)
   Dependências: window.PortClassification, window.Security,
                 window.UI, window.TabelaManager, window.mapa,
                 turf (global)
   Referências "lazy": window.classificarEsfera, window.FilterManager,
                       window.DataManager, window.VENUnifiedManager
   Expõe: window.SelectionManager
   ============================================================ */
(function () {
  'use strict';

  const SelectionManager = {
    _selecionadas: [],
    _highlightLayer: null,
    _paneCriado: false,
    _rectAtivo: false,
    _startPoint: null,

    /* ✅ Verifica se a camada está REALMENTE visível no mapa */
    _camadaVisivel(camadaId) {
      if (!window.mapa || !window.CAMADAS_MAPA) return false;

      const layerPai = window.CAMADAS_MAPA[camadaId];
      if (!layerPai) return false;
      if (!window.mapa.hasLayer(layerPai)) return false;

      if (layerPai.getLayers) {
        const temFilhoVisivel = layerPai.getLayers().some(sub => {
          if (sub.options && sub.options.opacity === 0) return false;
          if (sub._path && sub._path.style.display === 'none') return false;
          if (sub._container && sub._container.style.display === 'none') return false;
          return true;
        });
        if (!temFilhoVisivel) return false;
      }

      return true;
    },
    /* ✅ Lista todas as camadas visíveis no momento */
    _listarCamadasVisiveis() {
      const visiveis = [];
      if (!window.CAMADAS_MAPA || !window.mapa) return visiveis;

      Object.keys(window.CAMADAS_MAPA).forEach(id => {
        // ✅ Inclui buffers, imports e resultados de geoprocessamento
        // (útil para limpar/gerenciar resultados depois)
        if (this._camadaVisivel(id)) visiveis.push(id);
      });
      return visiveis;
    },
    init: function () {
      if (!this._paneCriado) {
        mapa.createPane('paneSelecao');
        mapa.getPane('paneSelecao').style.zIndex = 700;
        mapa.getPane('paneSelecao').style.pointerEvents = 'none';
        this._paneCriado = true;
      }

      if (mapa.boxZoom) mapa.boxZoom.disable();
      this._configurarRectSelection();
      this._configurarTeclado();
      console.info('[M2] Seleção múltipla pronta. Ctrl+Clique ou Shift+Arrastar.');
    },

    toggle: function (feature, camadaId) {
      // Fecha o popup do Leaflet (senão ele fica "grudado" na tela)
      if (window.mapa && window.mapa.closePopup) window.mapa.closePopup();

      const chave = this._chaveDe(feature, camadaId);
      const idx = this._selecionadas.findIndex(s => s.chaveUnica === chave);

      if (idx >= 0) {
        this._selecionadas.splice(idx, 1);
        if (window.UI) window.UI.toast(`➖ Feição removida da seleção (${this._selecionadas.length} restantes).`);
      } else {
        this._selecionadas.push({ feature, camadaId, chaveUnica: chave });
        if (window.UI) window.UI.toast(`➕ Feição adicionada à seleção (${this._selecionadas.length} no total).`);
      }

      this._atualizarUI();
    },

    adicionarMultiplas: function (features, camadaId) {
      let adicionadas = 0;
      for (const f of features) {
        const chave = this._chaveDe(f, camadaId);
        if (!this._selecionadas.find(s => s.chaveUnica === chave)) {
          this._selecionadas.push({ feature: f, camadaId, chaveUnica: chave });
          adicionadas++;
        }
      }
      if (adicionadas > 0) {
        this._atualizarUI();
        if (window.UI) window.UI.toast(`➕ ${adicionadas} feições adicionadas (${this._selecionadas.length} no total).`);
      } else {
        if (window.UI) window.UI.toast('Nenhuma feição nova na área selecionada.');
      }
    },

    temSelecao: function () { return this._selecionadas.length > 0; },
    obterSelecionadas: function () { return this._selecionadas.slice(); },

    selecionarTudo: async function () {
      const selCamada = document.getElementById('sel-camada-busca');
      if (!selCamada) return;

      const idVirtual = selCamada.value;

      // ✅ NOVO: modo TODAS_VISIVEIS
      if (idVirtual === 'TODAS_VISIVEIS') {
        return this._selecionarTudoVisiveis();
      }

      let idCamada = idVirtual;

      if (idVirtual === 'ven') {
        const selPainel = document.getElementById('sel-safra-ven-painel');
        const selSub = document.getElementById('filtro-subtipo-dinamico');
        const safraPainel = selPainel ? selPainel.value : null;
        const safraSub = selSub ? selSub.value : null;
        const safraInterna = window.VENUnifiedManager ? window.VENUnifiedManager.anoAtivo : null;
        idCamada = safraPainel || safraSub || safraInterna || 'ven_2022';
      }

      // ✅ Camada precisa estar visível
      if (!this._camadaVisivel(idCamada)) {
        if (window.UI) {
          window.UI.toast(`⚠️ A camada "${CONFIG_CAMADAS?.[idCamada]?.nome || idCamada}" está desligada. Ligue no painel para usar Selecionar Tudo.`);
        }
        return;
      }

      // ✅ AIS isolado bloqueia
      if (window.ControleAIS?._aberto && window.ControleAIS?._isolarAIS) {
        const permitidosAIS = window.ControleAIS?._camadasSalvas || [];
        if (permitidosAIS.length && !permitidosAIS.includes(idCamada)) {
          if (window.UI) window.UI.toast('⚠️ Em modo AIS isolado, só a camada AIS é selecionável.');
          return;
        }
      }

      if (!DADOS_GEOJSON_BRUTOS[idCamada]) {
        if (window.UI) window.UI.toast(`⏳ Carregando ${idCamada}...`);
        try {
          await window.DataManager.carregarCamada(idCamada);
        } catch (e) {
          if (window.UI) window.UI.toast(`⚠️ Falha ao carregar ${idCamada}: ${e.message}`);
          return;
        }
      }

      const dados = DADOS_GEOJSON_BRUTOS[idCamada];
      if (!dados || !dados.features || !dados.features.length) {
        if (window.UI) window.UI.toast(`⚠️ Camada ${idCamada} sem feições.`);
        return;
      }

      let featuresParaSelecionar = dados.features;
      let nomeFiltro = '';

      const selSub = document.getElementById('filtro-subtipo-dinamico');
      const filtroAtivo = selSub ? selSub.value : null;

      if (filtroAtivo && filtroAtivo !== 'TODOS' && filtroAtivo !== '' && !filtroAtivo.startsWith('ven_')) {
        if (idCamada === 'instalacoes_portuarias') {
          featuresParaSelecionar = dados.features.filter(f => {
            const cat = window.PortClassification.classificar(f.properties || {});
            return cat.id === filtroAtivo;
          });
          nomeFiltro = window.PortClassification.tipos[filtroAtivo]?.nome || filtroAtivo;
        } else if (idCamada === 'ucs_todas_mma' && typeof window.classificarEsfera === 'function') {
          featuresParaSelecionar = dados.features.filter(f => {
            return window.classificarEsfera(f.properties).id === filtroAtivo;
          });
          nomeFiltro = filtroAtivo;
        } else if (window.FilterManager && window.FilterManager.colunaEsferaAtiva) {
          const col = window.FilterManager.colunaEsferaAtiva;
          featuresParaSelecionar = dados.features.filter(f => {
            const v = String(f.properties ? f.properties[col] : '').trim();
            return v === filtroAtivo;
          });
          nomeFiltro = `${col}: ${filtroAtivo}`;
        }
      }

      const anteriores = this._selecionadas.length;
      this._selecionadas = [];
      if (this._highlightLayer && mapa.hasLayer(this._highlightLayer)) {
        mapa.removeLayer(this._highlightLayer);
        this._highlightLayer = null;
      }

      for (const f of featuresParaSelecionar) {
        const chave = this._chaveDe(f, idCamada);
        this._selecionadas.push({ feature: f, camadaId: idCamada, chaveUnica: chave });
      }

      this._atualizarUI();

      const nomeCamada = CONFIG_CAMADAS[idCamada]?.nome || idCamada;
      const msgFiltro = nomeFiltro ? ` [${nomeFiltro}]` : '';
      const msgAnt = anteriores > 0 ? ` (${anteriores} anteriores removidas)` : '';
      if (window.UI) window.UI.toast(`🎯 ${this._selecionadas.length} feições de "${nomeCamada}"${msgFiltro} selecionadas${msgAnt}.`);
    },

    zoomParaSelecao: function () {
      if (!this._selecionadas.length) return;
      try {
        const grupo = L.featureGroup(this._selecionadas.map(s => L.geoJSON(s.feature)));
        const bounds = grupo.getBounds();
        if (bounds.isValid()) {
          mapa.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
        }
      } catch (e) { console.warn('[M2] Erro ao fazer zoom:', e); }
    },

    abrirTabelaFiltrada: function () {
      if (!this._selecionadas.length) return;
      const camadaId = this._selecionadas[0].camadaId;
      const todasMesma = this._selecionadas.every(s => s.camadaId === camadaId);
      if (!todasMesma) {
        if (window.UI) window.UI.toast('⚠️ A seleção abrange múltiplas camadas. Selecione apenas uma.');
        return;
      }
      const features = this._selecionadas.map(s => s.feature);
      if (window.TabelaManager) window.TabelaManager.abrirFiltrado(camadaId, features);
    },
    _selecionarTudoVisiveis: async function () {
      let camadasAlvo = this._listarCamadasVisiveis();
      if (!camadasAlvo.length) {
        if (window.UI) window.UI.toast('⚠️ Nenhuma camada visível no mapa.');
        return;
      }

      // AIS isolado
      if (window.ControleAIS?._aberto && window.ControleAIS?._isolarAIS) {
        const permitidosAIS = window.ControleAIS?._camadasSalvas || [];
        if (permitidosAIS.length) {
          camadasAlvo = camadasAlvo.filter(c => permitidosAIS.includes(c));
          if (!camadasAlvo.length) {
            if (window.UI) window.UI.toast('⚠️ Em modo AIS isolado, só a camada AIS é selecionável.');
            return;
          }
        }
      }

      this._selecionadas = [];
      if (this._highlightLayer && mapa.hasLayer(this._highlightLayer)) {
        mapa.removeLayer(this._highlightLayer);
        this._highlightLayer = null;
      }

      let total = 0;
      for (const camadaId of camadasAlvo) {
        if (!DADOS_GEOJSON_BRUTOS[camadaId]) {
          try {
            await window.DataManager.carregarCamada(camadaId);
          } catch (e) {
            console.warn(`[M2] Falha ao carregar ${camadaId}:`, e.message);
            continue;
          }
        }
        const dados = DADOS_GEOJSON_BRUTOS[camadaId];
        if (!dados || !dados.features) continue;

        let features = dados.features;

        // Filtro específico de portos (mantém comportamento atual)
        if (camadaId === 'instalacoes_portuarias') {
          const fp = window.FILTRO_PORTO_ATUAL || 'TODOS';
          if (fp !== 'TODOS') {
            features = features.filter(f =>
              window.PortClassification.classificar(f.properties || {}).id === fp
            );
          }
        }

        for (const f of features) {
          const chave = this._chaveDe(f, camadaId);
          this._selecionadas.push({ feature: f, camadaId, chaveUnica: chave });
        }
        total += features.length;
      }

      this._atualizarUI();

      const nomeadas = camadasAlvo.length;
      if (window.UI) {
        window.UI.toast(`🎯 ${total} feições selecionadas de ${nomeadas} camada(s) visível(is).`);
      }
    },
    exportarCSV: function () {
      if (!this._selecionadas.length) {
        if (window.UI) window.UI.toast('⚠️ Nenhuma feição selecionada.');
        return;
      }

      const chaves = new Set();
      this._selecionadas.forEach(s => {
        Object.keys(s.feature.properties || {}).forEach(k => {
          if (!['geom', 'geometry'].includes(k.toLowerCase())) chaves.add(k);
        });
      });
      const colunas = [...chaves];

      const linhas = [colunas.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')];
      this._selecionadas.forEach(s => {
        const p = s.feature.properties || {};
        const row = colunas.map(c => {
          const v = p[c] !== undefined && p[c] !== null ? p[c] : '';
          return `"${String(v).replace(/"/g, '""')}"`;
        });
        linhas.push(row.join(';'));
      });

      const csv = '\uFEFF' + linhas.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `selecao_${this._selecionadas.length}_feicoes_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (window.UI) window.UI.toast(`📥 CSV com ${this._selecionadas.length} feições exportado.`);
    },

    exportarGeoJSON: function () {
      if (!this._selecionadas.length) {
        if (window.UI) window.UI.toast('⚠️ Nenhuma feição selecionada.');
        return;
      }
      const fc = {
        type: 'FeatureCollection',
        features: this._selecionadas.map(s => s.feature)
      };
      const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `selecao_${this._selecionadas.length}_feicoes_${new Date().toISOString().slice(0, 10)}.geojson`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (window.UI) window.UI.toast(`💾 GeoJSON com ${this._selecionadas.length} feições exportado.`);
    },

    _atualizarUI: function () {
      const painel = document.getElementById('painel-selecao');
      const countEl = document.getElementById('selecao-count');

      if (this._selecionadas.length === 0) {
        if (painel) painel.classList.remove('aberto');
      } else {
        if (countEl) countEl.textContent = this._selecionadas.length;
        if (painel) painel.classList.add('aberto');
      }

      this._atualizarHighlight();
    },

    _atualizarHighlight: function () {
      if (this._highlightLayer) {
        try {
          if (mapa.hasLayer(this._highlightLayer)) mapa.removeLayer(this._highlightLayer);
        } catch (e) { console.warn('[M2] Erro ao remover highlight:', e); }
        this._highlightLayer = null;
      }

      if (!this._selecionadas.length) return;

      if (!mapa.getPane('paneSelecao')) {
        mapa.createPane('paneSelecao');
        mapa.getPane('paneSelecao').style.zIndex = 650;
        mapa.getPane('paneSelecao').style.pointerEvents = 'none';
      }

      try {
        const fc = {
          type: 'FeatureCollection',
          features: this._selecionadas.map(s => s.feature)
        };
        this._highlightLayer = L.geoJSON(fc, {
          pane: 'paneSelecao',
          interactive: false,
          style: {
            color: '#f59e0b',
            weight: 3,
            opacity: 0.95,
            fillColor: '#f59e0b',
            fillOpacity: 0,
            dashArray: null
          },
          pointToLayer: (f, latlng) => L.circleMarker(latlng, {
            pane: 'paneSelecao',
            radius: 8,
            color: '#f59e0b',
            weight: 3,
            fillColor: '#fbbf24',
            fillOpacity: 0.85
          })
        }).addTo(mapa);

        const pane = mapa.getPane('paneSelecao');
        if (pane) {
          pane.style.zIndex = 700;
          pane.style.pointerEvents = 'none';
        }

        this._highlightLayer.eachLayer(sub => {
          if (sub.bringToFront) sub.bringToFront();
        });

        console.log(`[M2] Highlight criado com ${this._highlightLayer.getLayers().length} features`);
      } catch (e) { console.warn('[M2] Erro ao criar highlight:', e); }
    },

    limpar: function (silencioso) {
      this._selecionadas = [];

      if (this._highlightLayer) {
        try {
          if (mapa.hasLayer(this._highlightLayer)) mapa.removeLayer(this._highlightLayer);
        } catch (e) { console.warn('[M2] Erro ao remover highlight:', e); }
        this._highlightLayer = null;
      }

      const painel = document.getElementById('painel-selecao');
      if (painel) painel.classList.remove('aberto');
      const countEl = document.getElementById('selecao-count');
      if (countEl) countEl.textContent = '0';

      if (!silencioso && window.UI) window.UI.toast('🗑️ Seleção limpa.');
    },

    _chaveDe: function (feature, camadaId) {
      const p = feature.properties || {};

      let id = p.idhidrovia || p.idseq || p.id || p.ID ||
        p.gid || p.GID || p.objectid || p.codigo || p.CODIGO ||
        p.idm_origem || p.terrai_cod || p.cd_uc || p.codigo_uc;

      if (!id) {
        const nome = p.nome || p.NOME || p.NOME_INSTALACAO ||
          p.nome_rio || p.NOME_RIO || p.terrai_nom || '';
        const geoHash = JSON.stringify(feature.geometry || '').substring(0, 200);
        id = `${nome}::${geoHash}`;
      }

      return `${camadaId}::${id}`;
    },

    _configurarRectSelection: function () {
      const container = mapa.getContainer();
      const rectEl = document.getElementById('retangulo-selecao');
      const self = this;

      container.addEventListener('mousedown', (e) => {
        if (!e.shiftKey) return;
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        self._rectAtivo = true;
        self._startPoint = { x: e.clientX, y: e.clientY };
        document.body.classList.add('modo-selecao-retangulo');

        if (rectEl) {
          rectEl.style.left = e.clientX + 'px';
          rectEl.style.top = e.clientY + 'px';
          rectEl.style.width = '0px';
          rectEl.style.height = '0px';
          rectEl.classList.add('ativo');
        }
      }, true);

      window.addEventListener('mousemove', (e) => {
        if (!self._rectAtivo || !self._startPoint) return;
        if (!rectEl) return;

        const x = Math.min(self._startPoint.x, e.clientX);
        const y = Math.min(self._startPoint.y, e.clientY);
        const w = Math.abs(e.clientX - self._startPoint.x);
        const h = Math.abs(e.clientY - self._startPoint.y);

        rectEl.style.left = x + 'px';
        rectEl.style.top = y + 'px';
        rectEl.style.width = w + 'px';
        rectEl.style.height = h + 'px';
      });

      window.addEventListener('mouseup', (e) => {
        if (!self._rectAtivo) return;
        self._rectAtivo = false;
        document.body.classList.remove('modo-selecao-retangulo');
        if (rectEl) rectEl.classList.remove('ativo');

        if (!self._startPoint) return;

        const x1 = self._startPoint.x;
        const y1 = self._startPoint.y;
        const x2 = e.clientX;
        const y2 = e.clientY;
        self._startPoint = null;

        if (Math.abs(x2 - x1) < 6 && Math.abs(y2 - y1) < 6) return;

        const containerRect = container.getBoundingClientRect();
        const p1 = L.point(x1 - containerRect.left, y1 - containerRect.top);
        const p2 = L.point(x2 - containerRect.left, y2 - containerRect.top);
        const bounds = L.latLngBounds(
          mapa.containerPointToLatLng(p1),
          mapa.containerPointToLatLng(p2)
        );

        self._selecionarPorBounds(bounds);
      });
    },

    _selecionarPorBounds: function (bounds) {
      const selCamada = document.getElementById('sel-camada-busca');
      const camadaIdVirtual = selCamada ? selCamada.value : null;

      if (!camadaIdVirtual) {
        if (window.UI) window.UI.toast('⚠️ Selecione uma camada para usar seleção por retângulo.');
        return;
      }

      // ✅ NOVO: opção "TODAS" → itera por todas visíveis
      let camadasAlvo = [];
      if (camadaIdVirtual === 'TODAS_VISIVEIS') {
        camadasAlvo = this._listarCamadasVisiveis();
        if (!camadasAlvo.length) {
          if (window.UI) window.UI.toast('⚠️ Nenhuma camada visível no mapa.');
          return;
        }
      } else {
        let camadaId = camadaIdVirtual;
        if (camadaIdVirtual === 'ven') {
          camadaId = (window.VENUnifiedManager && window.VENUnifiedManager.anoAtivo)
            ? window.VENUnifiedManager.anoAtivo : 'ven_2022';
        }
        if (!this._camadaVisivel(camadaId)) {
          if (window.UI) {
            window.UI.toast(`⚠️ A camada "${CONFIG_CAMADAS?.[camadaId]?.nome || camadaId}" está desligada.`);
          }
          return;
        }
        camadasAlvo = [camadaId];
      }

      // ✅ AIS isolado bloqueia camadas externas
      if (window.ControleAIS?._aberto && window.ControleAIS?._isolarAIS) {
        const permitidos = window.ControleAIS?._camadasSalvas || [];
        if (permitidos.length) {
          camadasAlvo = camadasAlvo.filter(c => permitidos.includes(c));
          if (!camadasAlvo.length) {
            if (window.UI) window.UI.toast('⚠️ Em modo AIS isolado, só a camada AIS é selecionável.');
            return;
          }
        }
      }

      if (typeof turf === 'undefined') {
        if (window.UI) window.UI.toast('⚠️ Turf.js indisponível.');
        return;
      }

      const tol = 0.03;
      const boundsGeoJSON = {
        type: 'Polygon',
        coordinates: [[
          [bounds.getWest() - tol, bounds.getSouth() - tol],
          [bounds.getEast() + tol, bounds.getSouth() - tol],
          [bounds.getEast() + tol, bounds.getNorth() + tol],
          [bounds.getWest() - tol, bounds.getNorth() + tol],
          [bounds.getWest() - tol, bounds.getSouth() - tol]
        ]]
      };

      let totalAdicionadas = 0;
      const resumoPorCamada = [];

      camadasAlvo.forEach(camadaId => {
        const dados = DADOS_GEOJSON_BRUTOS[camadaId];
        if (!dados || !dados.features) return;

        let featuresBase = dados.features;

        // Filtro portos
        if (camadaId === 'instalacoes_portuarias') {
          const fp = window.FILTRO_PORTO_ATUAL || 'TODOS';
          if (fp !== 'TODOS') {
            featuresBase = featuresBase.filter(f =>
              window.PortClassification.classificar(f.properties || {}).id === fp
            );
          }
        }

        const dentro = [];
        for (const f of featuresBase) {
          try {
            const tempLayer = L.geoJSON(f);
            const b = tempLayer.getBounds();
            if (!b.isValid() || !bounds.intersects(b)) continue;
            try {
              if (turf.booleanIntersects(f, boundsGeoJSON)) dentro.push(f);
            } catch (eTurf) {
              dentro.push(f);
            }
          } catch (e) { /* ignora */ }
        }

        if (dentro.length) {
          this.adicionarMultiplas(dentro, camadaId);
          totalAdicionadas += dentro.length;
          resumoPorCamada.push(`${CONFIG_CAMADAS?.[camadaId]?.nome || camadaId}: ${dentro.length}`);
        }
      });

      if (totalAdicionadas === 0) {
        if (window.UI) window.UI.toast('Nenhuma feição na área selecionada.');
      } else if (camadasAlvo.length > 1) {
        if (window.UI) window.UI.toast(`🎯 Selecionadas ${totalAdicionadas} feições de ${camadasAlvo.length} camadas.`);
      }
    },

    _configurarTeclado: function () {
      const self = this;
      document.addEventListener('keydown', (ev) => {
        const alvo = ev.target;
        const tag = (alvo && alvo.tagName) || '';
        const tipo = ((alvo && alvo.type) || '').toLowerCase();
        const ehInputTexto = tag === 'TEXTAREA' ||
          (tag === 'INPUT' && ['text', 'search', 'email', 'url', 'password', 'number'].includes(tipo));
        if (ehInputTexto || tag === 'SELECT') return;

        if (ev.key === 'Escape') {
          if (self._selecionadas && self._selecionadas.length > 0) {
            console.log('[M2] ESC detectado — limpando', self._selecionadas.length, 'feições');
            self.limpar();
            ev.preventDefault();
            ev.stopPropagation();
            return;
          }
        }

        if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && ev.key.toLowerCase() === 'a') {
          ev.preventDefault();
          self.selecionarTudo();
        }
      }, true);
    }
  };

  window.SelectionManager = SelectionManager;
  console.info('[js] SelectionManager carregado');
})();
/* --- FIM: js/domain/selection-manager.js --- */

/* --- INÍCIO: js/domain/map-extras.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: MapExtras (M4)
   Escopo: minimap, escala gráfica, coordenadas do mouse
   Dependências: window.UI, window.mapa
   Expõe: window.MapExtras
   ============================================================ */
(function () {
  'use strict';

  const MapExtras = {
    minimap: null,
    scale: null,
    coords: null,

    init: function () {
      try { this._criarMinimap(); } catch (e) { console.warn('[M4] Falha no minimap:', e); }
      try { this._criarEscala(); } catch (e) { console.warn('[M4] Falha na escala:', e); }
      try { this._criarCoordenadas(); } catch (e) { console.warn('[M4] Falha nas coordenadas:', e); }
    },

    _criarMinimap: function () {
      if (typeof L.Control.MiniMap !== 'function') {
        console.warn('[M4] Plugin MiniMap não carregado.');
        return;
      }

      const baseMinimap = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
          subdomains: 'abc',
          maxZoom: 19,
          minZoom: 0,
          errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        }
      );

      this.minimap = new L.Control.MiniMap(baseMinimap, {
        position: 'topleft',
        width: 180,
        height: 180,
        collapsedWidth: 24,
        collapsedHeight: 24,
        zoomLevelOffset: -3,
        zoomAnimation: true,
        toggleDisplay: true,
        minimized: false,
        mapOptions: {
          attributionControl: false,
          zoomControl: false,
          dragging: false,
          touchZoom: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false
        },
        aimingRectOptions: {
          color: '#f59e0b',
          weight: 2.5,
          fillColor: '#f59e0b',
          fillOpacity: 0.2
        },
        shadowRectOptions: {
          color: '#0a2540',
          weight: 1,
          opacity: 0.7,
          fillOpacity: 0
        }
      });

      mapa.addControl(this.minimap);
      console.info('[M4] Minimap ativo.');
    },

    _criarEscala: function () {
      this.scale = L.control.scale({
        position: 'bottomleft',
        metric: true,
        imperial: false,
        maxWidth: 160,
        updateWhenIdle: false
      });
      this.scale.addTo(mapa);
      console.info('[M4] Escala gráfica ativa.');
    },

    _criarCoordenadas: function () {
      const CoordControl = L.Control.extend({
        options: { position: 'bottomright' },
        onAdd: function () {
          const div = L.DomUtil.create('div', 'leaflet-control-coords');
          div.id = 'leaflet-coords-control';
          div.innerHTML = `
            <span class="coords-part">
              <span class="coords-rotulo">Lat</span>
              <span class="coords-valor" id="coord-lat">—</span>
            </span>
            <span class="coords-sep">|</span>
            <span class="coords-part">
              <span class="coords-rotulo">Lng</span>
              <span class="coords-valor" id="coord-lng">—</span>
            </span>
            <button class="btn-copiar-coords" id="coord-btn-copiar" title="Copiar coordenadas">📋</button>
          `;

          L.DomEvent.disableClickPropagation(div);

          setTimeout(() => {
            const btn = document.getElementById('coord-btn-copiar');
            if (btn) {
              btn.addEventListener('click', () => {
                const lat = document.getElementById('coord-lat')?.textContent || '';
                const lng = document.getElementById('coord-lng')?.textContent || '';
                if (lat === '—' || lng === '—') {
                  if (window.UI) window.UI.toast('Passe o mouse sobre o mapa primeiro.');
                  return;
                }
                const texto = `${lat}, ${lng}`;
                navigator.clipboard.writeText(texto).then(() => {
                  if (window.UI) window.UI.toast(`📋 Copiado: ${texto}`);
                }).catch(() => {
                  if (window.UI) window.UI.toast('⚠️ Não foi possível copiar.');
                });
              });
            }
          }, 0);

          return div;
        }
      });

      this.coords = new CoordControl();
      this.coords.addTo(mapa);

      const latEl = () => document.getElementById('coord-lat');
      const lngEl = () => document.getElementById('coord-lng');

      mapa.on('mousemove', (e) => {
        const la = latEl(); const lo = lngEl();
        if (la) la.textContent = e.latlng.lat.toFixed(5) + '°';
        if (lo) lo.textContent = e.latlng.lng.toFixed(5) + '°';
      });

      mapa.on('mouseout', () => {
        const la = latEl(); const lo = lngEl();
        if (la) la.textContent = '—';
        if (lo) lo.textContent = '—';
      });

      console.info('[M4] Coordenadas do mouse ativas.');
    },

    obterCentro: function () {
      const c = mapa.getCenter();
      return { lat: c.lat, lng: c.lng };
    }
  };

  window.MapExtras = MapExtras;
  console.info('[js] MapExtras carregado');
})();
/* --- FIM: js/domain/map-extras.js --- */

/* --- INÍCIO: js/domain/buffer-tool.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: BufferTool (M9)
   Escopo: criação de buffers geodésicos em camadas vetoriais
   Dependências: window.DADOS_GEOJSON_BRUTOS, window.CONFIG_CAMADAS,
                 window.CAMADAS_MAPA, window.Styler, window.UI,
                 window.Security, window.LayerRegistry, window.FilterManager,
                 window.mapa, turf (global)
   Expõe: window.BufferTool
   ============================================================ */
(function () {
  'use strict';

  const BufferTool = {
    _contador: 0,
    _filtrosAcumulados: [],       // [{ campo, valor }]
    _modoSel: 'filtro',           // 'filtro' | 'individuais' | 'mapa'
    _feicoesSelecionadas: new Set(),
    _buscaFeicao: '',
    /**
     * Adiciona o valor selecionado no dropdown atual à lista de filtros acumulados.
     * Evita duplicatas.
     */
    adicionarFiltroAtual: function () {
      const selFiltro = document.getElementById('buffer-filtro');
      if (!selFiltro) return;

      const valor = selFiltro.value;
      if (!valor || valor === 'TODOS') {
        if (window.UI) window.UI.toast('⚠️ Selecione um valor no dropdown antes de adicionar.');
        return;
      }

      const [campo, valorCampo] = valor.split('::');
      if (!campo || !valorCampo) return;

      // Evita duplicata
      const jaExiste = this._filtrosAcumulados.some(f =>
        f.campo === campo && f.valor === valorCampo
      );
      if (jaExiste) {
        if (window.UI) window.UI.toast('⚠️ Este filtro já está aplicado.');
        return;
      }

      // Mesmo campo: substitui valor anterior (evita AND contraditório)
      const mesmoCampo = this._filtrosAcumulados.findIndex(f => f.campo === campo);
      if (mesmoCampo >= 0) {
        this._filtrosAcumulados[mesmoCampo] = { campo, valor: valorCampo };
      } else {
        this._filtrosAcumulados.push({ campo, valor: valorCampo });
      }

      // Reseta o dropdown pra "TODOS" (força o usuário a escolher o próximo)
      selFiltro.value = 'TODOS';

      this._renderizarChips();
      this._atualizarPreview();
    },

    /**
     * Remove um filtro da lista pelo índice.
     */
    removerFiltro: function (idx) {
      if (idx >= 0 && idx < this._filtrosAcumulados.length) {
        this._filtrosAcumulados.splice(idx, 1);
        this._renderizarChips();
        this._atualizarPreview();
      }
    },

    /**
     * Limpa todos os filtros acumulados.
     */
    limparFiltrosAcumulados: function () {
      this._filtrosAcumulados = [];
      this._renderizarChips();
      this._atualizarPreview();
    },

    /**
     * Renderiza os chips no DOM.
     */
    _renderizarChips: function () {
      const container = document.getElementById('buffer-filtros-ativos');
      if (!container) return;

      if (this._filtrosAcumulados.length === 0) {
        container.innerHTML = '<em style="color:#64748b;font-size:10.5px;">Nenhum filtro acumulado</em>';
        return;
      }

      container.innerHTML = this._filtrosAcumulados.map((f, i) =>
        `<span class="buffer-chip">
           ${window.Security.escapeHTML(f.campo)} = "${window.Security.escapeHTML(f.valor)}"
           <button class="buffer-chip-remover" onclick="BufferTool.removerFiltro(${i})" title="Remover filtro">×</button>
         </span>`
      ).join('') +
      `<button class="btn-acao-chip btn-excluir" style="font-size:9.5px;padding:2px 6px;" onclick="BufferTool.limparFiltrosAcumulados()" title="Limpar todos">
         🗑️ Limpar
       </button>`;
    },
    /* ============================================================
       M9.4 — SELEÇÃO DE FEIÇÕES INDIVIDUAIS
       ============================================================ */

    mudarModoSel: function (modo) {
      this._modoSel = modo;

      const elFiltro = document.getElementById('buffer-modo-filtro');
      const elInd = document.getElementById('buffer-modo-individuais');
      const elMapa = document.getElementById('buffer-modo-mapa');

      if (elFiltro) elFiltro.style.display = (modo === 'filtro') ? '' : 'none';
      if (elInd) elInd.style.display = (modo === 'individuais') ? '' : 'none';
      if (elMapa) elMapa.style.display = (modo === 'mapa') ? '' : 'none';

      if (modo === 'individuais') this._renderizarListaFeicoes();
      if (modo === 'mapa') {
        // ✅ Sempre atualiza a contagem da seleção atual ao entrar no modo mapa
        this._atualizarStatusMapa();
      }

      this._atualizarPreview();
    },

    _chaveFeicao: function (f) {
      const p = f.properties || {};
      let id = p.idhidrovia || p.idseq || p.id || p.ID ||
               p.gid || p.GID || p.objectid || p.codigo || p.CODIGO ||
               p.id_trecho_ || p.objectid_1 ||
               p.idm_origem || p.terrai_cod || p.cd_uc || p.codigo_uc;

      if (!id) {
        const nome = p.nome || p.NOME || p.NOME_INSTALACAO ||
                     p.nome_rio || p.NOME_RIO || p.terrai_nom || '';
        const geoHash = JSON.stringify(f.geometry || '').substring(0, 200);
        id = `${nome}::${geoHash}`;
      }
      return String(id);
    },

    _nomeFeicao: function (f) {
      const p = f.properties || {};
      return p.nome || p.NOME || p.NOME_INSTALACAO || p.cidade ||
             p.nome_rio || p.NOME_RIO || p.terrai_nom || p.nome_uc ||
             p.NOME_UC || p.municipio || `Feição #${this._chaveFeicao(f).slice(0, 12)}`;
    },

    _atualizarContadorFeicoes: function () {
      const el = document.getElementById('buffer-contador-feicoes');
      if (!el) return;
      const n = this._feicoesSelecionadas.size;
      el.textContent = n === 0 ? '0 selecionadas' : `${n} selecionada${n !== 1 ? 's' : ''}`;
    },
    /**
     * Extrai a UF de uma feição (mesma lógica do CopilotoIA).
     */
    _extrairUF: function (f) {
      const p = f.properties || {};

      // 1) Sigla direta
      for (const k of ['SIGLA_UF', 'sigla_uf', 'uf', 'UF', 'est_uf', 'sg_uf',
                       'est_origem', 'EST_ORIGEM', 'est_destino', 'EST_DESTINO']) {
        const v = p[k];
        if (v && String(v).trim().length === 2) return String(v).trim().toUpperCase();
      }

      // 2) Município no formato "Cidade/UF"
      for (const k of ['municipio', 'MUNICIPIO', 'nome_municipio']) {
        const v = p[k];
        if (v && String(v).includes('/')) {
          const partes = String(v).split('/');
          if (partes.length > 1) {
            const uf = partes[1].trim().toUpperCase();
            if (uf.length === 2) return uf;
          }
        }
      }

      // 3) Estado por extenso
      const mapa = {
        'acre':'AC','alagoas':'AL','amapa':'AP','amazonas':'AM','bahia':'BA',
        'ceara':'CE','distrito federal':'DF','espirito santo':'ES','goias':'GO',
        'maranhao':'MA','mato grosso':'MT','mato grosso do sul':'MS',
        'minas gerais':'MG','para':'PA','paraiba':'PB','parana':'PR',
        'pernambuco':'PE','piaui':'PI','rio de janeiro':'RJ',
        'rio grande do norte':'RN','rio grande do sul':'RS','rondonia':'RO',
        'roraima':'RR','santa catarina':'SC','sao paulo':'SP','sergipe':'SE','tocantins':'TO'
      };
      for (const k of ['estado', 'ESTADO', 'Estado']) {
        const v = p[k];
        if (!v) continue;
        const norm = String(v).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (mapa[norm]) return mapa[norm];
        if (norm.length === 2) return norm.toUpperCase();
      }

      return '';
    },    
    _renderizarListaFeicoes: function () {
      const container = document.getElementById('buffer-lista-feicoes');
      if (!container) return;

      const selCamada = document.getElementById('buffer-camada');
      const camadaId = selCamada?.value;

      if (!camadaId) {
        container.innerHTML = '<em style="color:#64748b;font-size:10.5px;padding:20px;display:block;text-align:center;">Escolha uma camada primeiro</em>';
        return;
      }

      const dados = DADOS_GEOJSON_BRUTOS[camadaId];
      if (!dados?.features?.length) {
        container.innerHTML = '<em style="color:#64748b;font-size:10.5px;padding:20px;display:block;text-align:center;">Camada sem feições carregadas</em>';
        return;
      }

      const busca = (this._buscaFeicao || '').toLowerCase().trim();
      let features = dados.features;

      if (busca.length >= 2) {
        features = features.filter(f => {
          const nome = this._nomeFeicao(f).toLowerCase();
          if (nome.includes(busca)) return true;
          const uf = this._extrairUF(f) || '';
          return uf.toLowerCase().includes(busca);
        });
      }

      const LIMITE_VISUAL = 300;
      const visiveis = features.slice(0, LIMITE_VISUAL);

      if (visiveis.length === 0) {
        container.innerHTML = '<em style="color:#64748b;font-size:10.5px;padding:20px;display:block;text-align:center;">Nenhuma feição encontrada</em>';
        return;
      }

      let html = '';
      visiveis.forEach(f => {
        const chave = this._chaveFeicao(f);
        const selecionada = this._feicoesSelecionadas.has(chave);
        const nome = this._nomeFeicao(f);
        const uf = this._extrairUF(f) || '';
        const chaveEsc = window.Security.escapeHTML(chave).replace(/'/g, "\\'");

        html += `<div class="buffer-feicao-item ${selecionada ? 'selecionada' : ''}" onclick="BufferTool.toggleFeicao('${chaveEsc}', event)">
          <input type="checkbox" ${selecionada ? 'checked' : ''} onclick="event.stopPropagation(); BufferTool.toggleFeicao('${chaveEsc}')">
          <span class="buffer-feicao-nome" title="${window.Security.escapeHTML(nome)}">${window.Security.escapeHTML(nome)}</span>
          ${uf ? `<span class="buffer-feicao-uf">${window.Security.escapeHTML(uf)}</span>` : ''}
        </div>`;
      });

      if (features.length > LIMITE_VISUAL) {
        html += `<div style="padding:8px 10px;text-align:center;font-size:10px;color:#64748b;background:#0b1f33;">
          Mostrando ${LIMITE_VISUAL} de ${features.length} feições. Refine a busca.
        </div>`;
      }

      container.innerHTML = html;
      this._atualizarContadorFeicoes();
    },

    toggleFeicao: function (chave, evento) {
      if (evento) evento.stopPropagation();

      console.log('[Buffer] toggleFeicao recebeu chave:', chave);
      console.log('[Buffer] Estava selecionada?', this._feicoesSelecionadas.has(chave));

      if (this._feicoesSelecionadas.has(chave)) {
        this._feicoesSelecionadas.delete(chave);
      } else {
        this._feicoesSelecionadas.add(chave);
      }

      console.log('[Buffer] Set agora tem:', this._feicoesSelecionadas.size, 'itens');

      this._renderizarListaFeicoes();
      this._atualizarPreview();
    },

    selecionarTodasVisiveis: function (selecionar) {
      const selCamada = document.getElementById('buffer-camada');
      const camadaId = selCamada?.value;
      if (!camadaId) return;

      const dados = DADOS_GEOJSON_BRUTOS[camadaId];
      if (!dados?.features?.length) return;

      let features = dados.features;
      const busca = (this._buscaFeicao || '').toLowerCase().trim();

      if (busca.length >= 2) {
        features = features.filter(f => {
          const nome = this._nomeFeicao(f).toLowerCase();
          if (nome.includes(busca)) return true;
          const uf = this._extrairUF(f) || '';
          return uf.toLowerCase().includes(busca);
        });
      }

      for (const f of features) {
        const chave = this._chaveFeicao(f);
        if (selecionar) this._feicoesSelecionadas.add(chave);
        else this._feicoesSelecionadas.delete(chave);
      }

      this._renderizarListaFeicoes();
      this._atualizarPreview();
    },

    filtrarListaFeicoes: function (termo) {
      this._buscaFeicao = termo;
      this._renderizarListaFeicoes();
    },

    usarSelecaoDoMapa: function () {
      if (!window.SelectionManager) {
        if (window.UI) window.UI.toast('⚠️ Módulo de seleção indisponível.');
        return;
      }

      const selecionadas = window.SelectionManager.obterSelecionadas();
      if (!selecionadas?.length) {
        if (window.UI) window.UI.toast('⚠️ Nenhuma feição selecionada. Use Ctrl+Clique no mapa.');
        return;
      }

      // ✅ Só atualiza a UI — o filtro lê direto do SelectionManager
      this._atualizarStatusMapa();
      this._atualizarPreview();
      if (window.UI) window.UI.toast(`🎯 ${selecionadas.length} feição(ões) prontas para buffer.`);
    },

    _atualizarStatusMapa: function () {
      const el = document.getElementById('buffer-selecao-mapa-status');
      if (!el) return;

      const sel = window.SelectionManager?.obterSelecionadas?.() || [];
      const qtd = sel.length;

      if (qtd === 0) {
        el.innerHTML = '<em style="color:#94a3b8;">Nenhuma feição selecionada no mapa.<br>Use <kbd>Ctrl+Clique</kbd> sobre feições para selecioná-las.</em>';
        return;
      }

      el.innerHTML = `
        <div style="color:#fbbf24;font-weight:700;font-size:12px;">🎯 ${qtd} feição(ões) selecionada(s) no mapa</div>
        <div style="font-size:10.5px;color:#94a3b8;margin-top:4px;">Ao clicar em "Criar Buffer", o buffer será gerado sobre essas feições.</div>
      `;
    },      
    /* ============================================================
       UI
       ============================================================ */
    abrirModal: function () {
      const modal = document.getElementById('modal-buffer');
      if (!modal) return;

      // ✅ Sempre reseta os filtros acumulados ao abrir
      this._filtrosAcumulados = [];

      this._popularSelectCamadas();
      this._popularSelectFiltros();
      this._renderizarChips();
      this._renderizarListaFeicoes();   // ✅ M9.4
      this._atualizarContadorFeicoes(); // ✅ M9.4
      this._atualizarPreview();

      modal.classList.add('aberto');

      const selCamada = document.getElementById('buffer-camada');
      const inpRaio = document.getElementById('buffer-raio');
      const chkDissolve = document.getElementById('buffer-dissolve');
      const selFiltro = document.getElementById('buffer-filtro');
      const chkFiltroAtivo = document.getElementById('buffer-usar-filtro-ativo');

      if (selCamada && !selCamada._bufferListeners) {
        selCamada.addEventListener('change', async () => {
          this._filtrosAcumulados = [];
          this._feicoesSelecionadas = new Set();
          this._buscaFeicao = '';
          const inpBusca = document.getElementById('buffer-busca-feicao');
          if (inpBusca) inpBusca.value = '';

          // ✅ Carrega sob demanda
          const camadaId = selCamada.value;
          if (camadaId && !DADOS_GEOJSON_BRUTOS[camadaId]?.features?.length) {
            if (window.UI) window.UI.toast(`⏳ Carregando ${CONFIG_CAMADAS[camadaId]?.nome || camadaId}...`);
            try {
              await window.DataManager.carregarCamada(camadaId);
            } catch (e) {
              console.warn('[M9] Falha ao carregar:', e);
            }
          }

          this._renderizarChips();
          this._popularSelectFiltros();
          this._renderizarListaFeicoes();
          this._atualizarContadorFeicoes();
          this._atualizarPreview();
        });
        selCamada._bufferListeners = true;
      }
      if (inpRaio && !inpRaio._bufferListeners) {
        inpRaio.addEventListener('input', () => this._atualizarPreview());
        inpRaio._bufferListeners = true;
      }
      if (chkDissolve && !chkDissolve._bufferListeners) {
        chkDissolve.addEventListener('change', () => this._atualizarPreview());
        chkDissolve._bufferListeners = true;
      }
      if (selFiltro && !selFiltro._bufferListeners) {
        selFiltro.addEventListener('change', () => this._atualizarPreview());
        selFiltro._bufferListeners = true;
      }
      const inpLote = document.getElementById('buffer-raios-lote');
      if (inpLote && !inpLote._bufferListeners) {
        inpLote.addEventListener('input', () => this._atualizarPreview());
        inpLote._bufferListeners = true;
      }      
      if (chkFiltroAtivo && !chkFiltroAtivo._bufferListeners) {
        chkFiltroAtivo.addEventListener('change', () => {
          if (selFiltro) selFiltro.disabled = chkFiltroAtivo.checked;
          this._atualizarPreview();
        });
        chkFiltroAtivo._bufferListeners = true;
      }
    },

    fecharModal: function () {
      const modal = document.getElementById('modal-buffer');
      if (modal) modal.classList.remove('aberto');
    },

    _popularSelectCamadas: function () {
      const sel = document.getElementById('buffer-camada');
      if (!sel) return;

      const valAtual = sel.value;
      sel.innerHTML = '';

      // ✅ Lista TODAS as camadas do CONFIG (mesmo não carregadas)
      const candidatas = [];
      for (const [id, cfg] of Object.entries(CONFIG_CAMADAS)) {
        // Ignora camadas geradas
        if (id.startsWith('buffer_') || id.startsWith('geo_') || id.startsWith('imp_')) continue;

        const n = DADOS_GEOJSON_BRUTOS[id]?.features?.length || 0;
        const nome = cfg.nome || id;
        candidatas.push({ id, nome, n });
      }
      candidatas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      if (candidatas.length === 0) {
        sel.innerHTML = '<option value="">(Nenhuma camada carregada)</option>';
        return;
      }

      for (const c of candidatas) {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.nome} (${c.n.toLocaleString('pt-BR')})`;
        sel.appendChild(opt);
      }

      // ✅ Restaura seleção, ou força a primeira como default
      if (valAtual && candidatas.find(c => c.id === valAtual)) {
        sel.value = valAtual;
      } else if (candidatas.length > 0) {
        sel.value = candidatas[0].id;
      }

      console.log('[M9.4] Select populado. Valor:', sel.value, '| Opções:', candidatas.length);
    },
    _popularSelectFiltros: function () {
      const selCamada = document.getElementById('buffer-camada');
      const selFiltro = document.getElementById('buffer-filtro');
      if (!selCamada || !selFiltro) return;

      const camadaId = selCamada.value;
      const dados = DADOS_GEOJSON_BRUTOS[camadaId];

      // ✅ MAPA DE FILTROS POR CAMADA (definitivo — baseado nos dados reais)
      const FILTROS_POR_CAMADA = {
        rodovias: [
          { campo: 'sg_uf', rotulo: 'UF' },
          { campo: 'nm_tipo_tr', rotulo: 'Tipo de Trecho' },
          { campo: 'ds_jurisdi', rotulo: 'Jurisdição' },
          { campo: 'ds_superfi', rotulo: 'Superfície' },
          { campo: 'ds_legenda', rotulo: 'Legenda' },
          { campo: 'leg_multim', rotulo: 'Multimodalidade' }
        ],
        ferrovias: [
          { campo: 'uf', rotulo: 'UF' },
          { campo: 'tip_situac', rotulo: 'Situação' },
          { campo: 'bitola', rotulo: 'Bitola' },
          { campo: 'municipio', rotulo: 'Município' }
        ],
        instalacoes_portuarias: [
          { campo: 'estado', rotulo: 'Estado' },
          { campo: 'tipo', rotulo: 'Tipo' },
          { campo: 'modalidade', rotulo: 'Modalidade' },
          { campo: 'situacao', rotulo: 'Situação' },
          { campo: 'gestao', rotulo: 'Gestão' },
          { campo: 'fonte', rotulo: 'Fonte' }
        ],
        ucs_federais: [
          { campo: 'esfera', rotulo: 'Esfera' },
          { campo: 'categoria', rotulo: 'Categoria' },
          { campo: 'grupo', rotulo: 'Grupo' },
          { campo: 'uf', rotulo: 'UF' },
          { campo: 'nome', rotulo: 'Nome' }
        ],
        tis_poligonais: [
          { campo: 'modalidade', rotulo: 'Modalidade' },
          { campo: 'fase', rotulo: 'Fase' },
          { campo: 'etnia_nom', rotulo: 'Etnia' },
          { campo: 'uf', rotulo: 'UF' }
        ],
        linhas_travessias: [
          { campo: 'est_origem', rotulo: 'UF Origem' },
          { campo: 'est_destino', rotulo: 'UF Destino' },
          { campo: 'tipo', rotulo: 'Tipo' }
        ],
        ven_2022: [
          { campo: 'navegacao', rotulo: 'Navegação' },
          { campo: 'tipo', rotulo: 'Tipo' },
          { campo: 'nome_rio', rotulo: 'Rio' },
          { campo: 'nome', rotulo: 'Nome' }
        ],
        ven_2024: [
          { campo: 'navegacao', rotulo: 'Navegação' },
          { campo: 'tipo', rotulo: 'Tipo' },
          { campo: 'nome_rio', rotulo: 'Rio' },
          { campo: 'nome', rotulo: 'Nome' }
        ],
        ven_2020: [
          { campo: 'navegacao', rotulo: 'Navegação' },
          { campo: 'tipo', rotulo: 'Tipo' },
          { campo: 'nome_rio', rotulo: 'Rio' }
        ],
        ven_2018: [
          { campo: 'navegacao', rotulo: 'Navegação' },
          { campo: 'tipo', rotulo: 'Tipo' },
          { campo: 'nome_rio', rotulo: 'Rio' }
        ],
        ven_2013: [
          { campo: 'navegacao', rotulo: 'Navegação' },
          { campo: 'tipo', rotulo: 'Tipo' },
          { campo: 'nome_rio', rotulo: 'Rio' }
        ],
        embarcacoes: [
          { campo: 'tipo', rotulo: 'Tipo' },
          { campo: 'tipo_embarcacao', rotulo: 'Tipo de Embarcação' },
          { campo: 'uf', rotulo: 'UF' }
        ],
        uf: [
          { campo: 'SIGLA_UF', rotulo: 'Sigla' },
          { campo: 'nome', rotulo: 'Nome' },
          { campo: 'regiao', rotulo: 'Região' }
        ]
      };

      // Fallback genérico: se camada não estiver no mapa acima, procura automaticamente
      const campos = FILTROS_POR_CAMADA[camadaId] || this._detectarCamposAutomaticamente(dados);

      const opcoes = [];

      if (dados?.features?.length) {
        for (const { campo, rotulo } of campos) {
          const valores = new Set();
          let totalComValor = 0;

          for (const f of dados.features) {
            let v = f.properties?.[campo];
            if (v === null || v === undefined || v === '') continue;

            v = String(v).trim();
            if (v.length === 0 || v.length > 80) continue;

            // Ignora URLs/emails/CNPJ
            if (/^https?:\/\//i.test(v)) continue;
            if (/^www\./i.test(v)) continue;
            if (/@/.test(v) && !v.includes(' ')) continue;
            if (/^\d{6,}$/.test(v)) continue;

            valores.add(v);
            totalComValor++;
          }

          const proporcao = dados.features.length > 0 ? totalComValor / dados.features.length : 0;

          if (valores.size >= 2 && valores.size <= 60 && proporcao >= 0.3) {
            opcoes.push({ campo, rotulo, valores: Array.from(valores).sort() });
          }
        }
      }

      // ✅ LIMPEZA TOTAL antes de popular
      while (selFiltro.firstChild) selFiltro.removeChild(selFiltro.firstChild);

      if (opcoes.length === 0) {
        selFiltro.disabled = true;
        const opt = document.createElement('option');
        opt.value = 'TODOS';
        opt.textContent = '(esta camada não tem filtros disponíveis)';
        selFiltro.appendChild(opt);
        console.warn(`[M9] Nenhum filtro encontrado para "${camadaId}"`);
        return;
      }

      selFiltro.disabled = false;

      const optDefault = document.createElement('option');
      optDefault.value = 'TODOS';
      optDefault.textContent = 'Todas as feições';
      selFiltro.appendChild(optDefault);

      for (const op of opcoes) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = op.rotulo || op.campo;

        for (const v of op.valores) {
          const opt = document.createElement('option');
          opt.value = `${op.campo}::${v}`;
          opt.textContent = v;
          optgroup.appendChild(opt);
        }
        selFiltro.appendChild(optgroup);
      }

      console.info(`[M9] ${opcoes.length} filtro(s) para "${camadaId}":`, opcoes.map(o => o.campo).join(', '));
    },

    /**
     * Fallback: detecta campos automaticamente se a camada não tem filtros mapeados.
     */
    _detectarCamposAutomaticamente: function (dados) {
      if (!dados?.features?.length) return [];

      const candidatos = {};
      const amostra = dados.features.slice(0, 200);

      for (const f of amostra) {
        for (const [k, v] of Object.entries(f.properties || {})) {
          if (v === null || v === undefined || v === '') continue;
          const s = String(v).trim();
          if (s.length === 0 || s.length > 80) continue;
          if (/^https?:\/\//i.test(s)) continue;
          if (/@/.test(s) && !s.includes(' ')) continue;

          candidatos[k] = candidatos[k] || new Set();
          candidatos[k].add(s);
        }
      }

      const resultado = [];
      for (const [campo, valores] of Object.entries(candidatos)) {
        if (valores.size >= 2 && valores.size <= 60) {
          resultado.push({ campo, rotulo: campo });
        }
      }
      return resultado;
    },
    _atualizarPreview: function () {
      const selCamada = document.getElementById('buffer-camada');
      const inpRaio = document.getElementById('buffer-raio');
      const preview = document.getElementById('buffer-preview');

      if (!selCamada || !inpRaio || !preview) return;

      const camadaId = selCamada.value;
      const raio = parseFloat(inpRaio.value) || 50;

      if (!camadaId) {
        preview.innerHTML = '<em style="color:#64748b;">Selecione uma camada para ver o preview.</em>';
        return;
      }

      const dados = DADOS_GEOJSON_BRUTOS[camadaId];
      const n = dados?.features?.length || 0;
      const nome = window.CONFIG_CAMADAS[camadaId]?.nome || camadaId;

      // ✅ Aplica filtros e conta
      const { filtradas, filtroTexto } = this._aplicarFiltros(dados);
      const nFiltrado = filtradas.length;

      const pct = n > 0 ? ((nFiltrado / n) * 100).toFixed(0) : 0;

      // ✅ Verifica modo (único ou lote)
      const modo = this._obterModoRaio();
      const comparativoEl = document.getElementById('buffer-comparativo');
      let textoRaios = '';

      if (modo === 'lote') {
        const inpLote = document.getElementById('buffer-raios-lote');
        const raios = this._parseRaiosLote(inpLote?.value || '');
        if (raios.length === 0) {
          preview.innerHTML = '<em style="color:#ef4444;">⚠️ Informe ao menos 1 raio válido separado por vírgula.</em>';
          if (comparativoEl) comparativoEl.style.display = 'none';
          return;
        }
        textoRaios = raios.map(r => `${r} km`).join(', ');

        // ✅ Tabela comparativa (teórica — área π·r²)
        this._renderizarComparativo(raios);
        if (comparativoEl) comparativoEl.style.display = 'block';
      } else {
        textoRaios = `${raio} km`;
        if (comparativoEl) comparativoEl.style.display = 'none';
      }

      preview.innerHTML = `
        <div style="font-size:11px;color:#94a3b8;line-height:1.5;">
          Serão processadas <strong style="color:#38bdf8;">${nFiltrado.toLocaleString('pt-BR')}</strong>
          ${nFiltrado !== n ? `<span style="color:#64748b;">de ${n.toLocaleString('pt-BR')} (${pct}%)</span>` : ''}
          feições de <strong style="color:#e2e8f0;">${window.Security.escapeHTML(nome)}</strong>,<br>
          criando buffers de <strong style="color:#f59e0b;">${textoRaios}</strong> em torno de cada uma.
          ${filtroTexto ? `<br><br><span style="color:#fbbf24;font-size:10px;">🔍 Filtro: ${window.Security.escapeHTML(filtroTexto)}</span>` : ''}
        </div>
      `;
    },

    /**
     * Renderiza tabela comparativa (área teórica por raio).
     */
    _renderizarComparativo: function (raios) {
      const tbody = document.getElementById('buffer-comparativo-corpo');
      if (!tbody) return;

      const linhas = raios.map(r => {
        const area = Math.PI * r * r;
        return `<tr>
          <td>${r}</td>
          <td>π·${r}²</td>
          <td>${area >= 1000 ? (area / 1000).toFixed(1) + ' mil km²' : area.toFixed(0) + ' km²'}</td>
        </tr>`;
      }).join('');

      tbody.innerHTML = linhas;
    },
    /**
     * Aplica os filtros selecionados no modal.
     * Retorna { filtradas, filtroTexto }.
     */
    _aplicarFiltros: function (dados) {
      if (!dados?.features?.length) {
        return { filtradas: [], filtroTexto: '' };
      }

      const selCamada = document.getElementById('buffer-camada');
      const selFiltro = document.getElementById('buffer-filtro');
      const chkFiltroAtivo = document.getElementById('buffer-usar-filtro-ativo');

      const camadaId = selCamada ? selCamada.value : '';

      // ✅ Modo 1: usa filtro ativo do painel principal
      if (chkFiltroAtivo && chkFiltroAtivo.checked) {
        const filtroTexto = this._obterFiltroAtivoTexto(camadaId);
        const filtradas = this._aplicarFiltroAtivo(dados, camadaId);
        return { filtradas, filtroTexto };
      }

      // ✅ Modo 2: usa filtro do dropdown do modal
      if (!selFiltro || selFiltro.value === 'TODOS') {
        return { filtradas: dados.features, filtroTexto: '' };
      }

      const [campo, valor] = selFiltro.value.split('::');
      const filtradas = dados.features.filter(f => {
        const v = f.properties?.[campo];
        return v !== undefined && v !== null && String(v).trim() === valor;
      });

      return {
        filtradas,
        filtroTexto: `${campo} = "${valor}"`
      };
    },

    /**
     * Retorna texto descritivo do filtro ativo no painel principal.
     */
    _obterFiltroAtivoTexto: function (camadaId) {
      if (camadaId === 'instalacoes_portuarias') {
        const filtro = window.FILTRO_PORTO_ATUAL || 'TODOS';
        if (filtro !== 'TODOS') {
          const cat = window.PortClassification?.tipos?.[filtro];
          return `Regime = ${cat?.nome || filtro}`;
        }
      }

      if (camadaId === 'ucs_todas_mma') {
        const filtro = window.FILTRO_UC_ATUAL || 'TODOS';
        if (filtro !== 'TODOS') return `Esfera = ${filtro}`;
      }

      const selSub = document.getElementById('filtro-subtipo-dinamico');
      const selCamada = document.getElementById('sel-camada-busca');
      if (selSub && selSub.value && selSub.value !== 'TODOS' && selCamada && selCamada.value === camadaId) {
        return `Filtro ativo = ${selSub.value}`;
      }

      return '';
    },

    /**
     * Aplica os filtros selecionados no modal.
     * Prioridade:
     *   1. Filtros acumulados (chips) — se houver
     *   2. Checkbox "usar filtro ativo do painel principal"
     *   3. Dropdown do modal (filtro único, sem +)
     */
    _aplicarFiltros: function (dados) {
      if (!dados?.features?.length) {
        return { filtradas: [], filtroTexto: '' };
      }

      const selCamada = document.getElementById('buffer-camada');
      const selFiltro = document.getElementById('buffer-filtro');
      const chkFiltroAtivo = document.getElementById('buffer-usar-filtro-ativo');
      const camadaId = selCamada ? selCamada.value : '';

      // ============================================================
      // MODO A: feições individuais
      //   - MODO "individuais": usa o Set local (_feicoesSelecionadas)
      //   - MODO "mapa": lê SEMPRE do SelectionManager (evita estado antigo)
      // ============================================================
      if (this._modoSel === 'individuais' || this._modoSel === 'mapa') {
        let chavesParaFiltrar;

        if (this._modoSel === 'mapa') {
          // ✅ Modo mapa: lê direto da seleção ativa no mapa
          if (!window.SelectionManager) {
            return { filtradas: [], filtroTexto: '⚠️ SelectionManager indisponível' };
          }
          const selecionadas = window.SelectionManager.obterSelecionadas();
          if (!selecionadas?.length) {
            return { filtradas: [], filtroTexto: '⚠️ Nenhuma feição selecionada no mapa' };
          }
          chavesParaFiltrar = new Set();
          for (const s of selecionadas) {
            chavesParaFiltrar.add(this._chaveFeicao(s.feature));
          }
          console.log('[Buffer] MODO MAPA — lendo', selecionadas.length, 'feições direto do SelectionManager');
        } else {
          // Modo individuais: usa o Set local
          chavesParaFiltrar = this._feicoesSelecionadas;
          console.log('[Buffer] MODO INDIVIDUAIS — Set local tem', chavesParaFiltrar.size, 'chaves');
        }

        if (chavesParaFiltrar.size === 0) {
          return { filtradas: [], filtroTexto: '⚠️ Nenhuma feição selecionada' };
        }

        const filtradas = dados.features.filter(f =>
          chavesParaFiltrar.has(this._chaveFeicao(f))
        );

        console.log('[Buffer] Features matching:', filtradas.length);
        return {
          filtradas,
          filtroTexto: `${filtradas.length} feição(ões) selecionada(s)`
        };
      }

      // ============================================================
      // MODO B: filtros acumulados (chips)
      // ============================================================
      if (this._filtrosAcumulados.length > 0) {
        let filtradas = dados.features;
        const aplicados = [];

        for (const { campo, valor } of this._filtrosAcumulados) {
          filtradas = filtradas.filter(f => {
            const v = f.properties?.[campo];
            if (v === null || v === undefined) return false;
            return String(v).trim() === String(valor).trim();
          });
          aplicados.push(`${campo} = "${valor}"`);
        }

        return {
          filtradas,
          filtroTexto: aplicados.join(' E ')
        };
      }

      // ============================================================
      // MODO C: filtro ativo do painel principal
      // ============================================================
      if (chkFiltroAtivo && chkFiltroAtivo.checked) {
        const filtroTexto = this._obterFiltroAtivoTexto(camadaId);
        const filtradas = this._aplicarFiltroAtivo(dados, camadaId);
        return { filtradas, filtroTexto };
      }

      // ============================================================
      // MODO D: filtro do dropdown (único)
      // ============================================================
      if (!selFiltro || selFiltro.value === 'TODOS') {
        console.log('[Buffer] MODO D (sem filtro) — retornando TODAS as', dados.features.length, 'feições');
        return { filtradas: dados.features, filtroTexto: '' };
      }

      const [campo, valor] = selFiltro.value.split('::');
      const filtradas = dados.features.filter(f => {
        const v = f.properties?.[campo];
        return v !== undefined && v !== null && String(v).trim() === valor;
      });

      return {
        filtradas,
        filtroTexto: `${campo} = "${valor}"`
      };
    },
      mudarModo: function (modo) {
      const unicoW = document.getElementById('buffer-raio-unico-wrapper');
      const loteW = document.getElementById('buffer-raio-lote-wrapper');

      if (unicoW) unicoW.style.display = (modo === 'unico') ? '' : 'none';
      if (loteW) loteW.style.display = (modo === 'lote') ? '' : 'none';

      this._atualizarPreview();
    },

    _obterModoRaio: function () {
      const sel = document.querySelector('input[name="buffer-modo"]:checked');
      return sel ? sel.value : 'unico';
    },

    _parseRaiosLote: function (texto) {
      return String(texto || '')
        .split(',')
        .map(s => parseFloat(s.trim()))
        .filter(n => Number.isFinite(n) && n > 0 && n <= 1000)
        .slice(0, 6);   // máximo 6 raios
    },  
    /* ============================================================
       PROCESSAMENTO
       ============================================================ */
    criar: async function () {
      const selCamada = document.getElementById('buffer-camada');
      const inpRaio = document.getElementById('buffer-raio');
      const inpLote = document.getElementById('buffer-raios-lote');
      const chkDissolve = document.getElementById('buffer-dissolve');
      const btnCriar = document.getElementById('btn-buffer-criar');

      if (!selCamada || !inpRaio) return;

      const camadaId = selCamada.value;
      const dissolve = chkDissolve ? chkDissolve.checked : false;

      // ✅ Verifica modo
      const modo = this._obterModoRaio();
      let raios = [];

      if (modo === 'lote') {
        raios = this._parseRaiosLote(inpLote?.value || '');
        if (raios.length === 0) {
          if (window.UI) window.UI.toast('⚠️ Informe ao menos 1 raio válido no campo de lote.');
          return;
        }
      } else {
        raios = [parseFloat(inpRaio.value) || 50];
      }

      // ✅ Carrega sob demanda
      if (!DADOS_GEOJSON_BRUTOS[camadaId]?.features?.length) {
        if (window.UI) window.UI.toast(`⏳ Carregando ${CONFIG_CAMADAS[camadaId]?.nome || camadaId}...`);
        try {
          await window.DataManager.carregarCamada(camadaId);
        } catch (e) {
          if (window.UI) window.UI.toast(`⚠️ Falha ao carregar: ${e.message || e}`);
          if (btnCriar) { btnCriar.disabled = false; btnCriar.innerHTML = '⭕ Criar Buffer'; }
          return;
        }
      }

      const dadosBrutos = DADOS_GEOJSON_BRUTOS[camadaId];
      if (!dadosBrutos?.features?.length) {
        if (window.UI) window.UI.toast('⚠️ Camada sem feições.');
        if (btnCriar) { btnCriar.disabled = false; btnCriar.innerHTML = '⭕ Criar Buffer'; }
        return;
      }

      // ✅ Aplica filtros ANTES de processar
      const { filtradas, filtroTexto } = this._aplicarFiltros(dadosBrutos);
      if (filtradas.length === 0) {
        let msg = '⚠️ Nenhuma feição corresponde ao filtro.';
        if (this._modoSel === 'individuais' || this._modoSel === 'mapa') {
          msg = '⚠️ Selecione ao menos 1 feição.';
        }
        if (window.UI) window.UI.toast(msg);
        return;
      }

      const dados = { type: 'FeatureCollection', features: filtradas };

      if (typeof turf === 'undefined') {
        if (window.UI) window.UI.toast('⚠️ Turf.js indisponível. Recarregue a página.');
        return;
      }
      console.info(`[M9] Processando ${filtradas.length} feição(ões)${filtroTexto ? ` (${filtroTexto})` : ''}`);      

      // Desabilita botão durante processamento
      if (btnCriar) {
        btnCriar.disabled = true;
        const qtd = raios.length;
        btnCriar.innerHTML = qtd > 1 ? `⏳ Processando ${qtd} raios...` : '⏳ Processando...';
      }

      const inicio = performance.now();
      let sucessos = 0;
      let erros = 0;

      try {
        // ✅ Loop pelos raios
        for (const raioKm of raios) {
          try {
            const resultado = await this._processarBuffer(dados, raioKm, dissolve);

            // Marca o filtro no geojson pra aparecer no nome da camada
            if (filtroTexto) resultado._filtroTexto = filtroTexto;

            // Adiciona como nova camada
            this._criarCamadaBuffer(camadaId, raioKm, dissolve, resultado);
            sucessos++;

            // Yield pra UI entre raios
            if (raios.length > 1) await new Promise(r => setTimeout(r, 100));
          } catch (e) {
            console.warn(`[M9] Falha no raio ${raioKm}km:`, e);
            erros++;
          }
        }

        const duracao = ((performance.now() - inicio) / 1000).toFixed(1);
        console.info(`[M9] ${sucessos} buffer(s) criado(s) em ${duracao}s${erros > 0 ? ` (${erros} com erro)` : ''}`);

        this.fecharModal();

        if (window.UI) {
          const msg = sucessos === 1
            ? `✓ Buffer de ${raios[0]} km criado em ${duracao}s.`
            : `✓ ${sucessos} buffers criados em ${duracao}s${erros > 0 ? ` (${erros} falha(s))` : ''}.`;
          window.UI.toast(msg);
        }
      } catch (e) {
        console.error('[M9] Falha crítica ao criar buffer:', e);
        if (window.UI) window.UI.toast('⚠️ Falha ao criar buffer: ' + (e.message || e));
      } finally {
        if (btnCriar) {
          btnCriar.disabled = false;
          btnCriar.innerHTML = '⭕ Criar Buffer';
        }
      }
    },

    _processarBuffer: async function (dados, raioKm, dissolve) {
      // Converte km → graus (aproximação; turf.buffer aceita km direto)
      const steps = 12;   // 12 segmentos = bom equilíbrio entre precisão e performance

      // Processa em chunks pra não travar a UI
      const buffers = [];
      const features = dados.features.filter(f => f.geometry);
      const chunkSize = 100;

      for (let i = 0; i < features.length; i++) {
        const f = features[i];
        try {
          const buffered = turf.buffer(f, raioKm, { units: 'kilometers', steps });
          if (buffered) {
            // ✅ Preserva as properties da feição original
            const propsOrigem = f.properties || {};
            const propsLimpas = {};
            const IGNORAR = ['geom', 'geometry', 'shape', 'shape_leng', 'shape_area', 'objectid_1', 'marcador'];
            for (const [k, v] of Object.entries(propsOrigem)) {
              if (IGNORAR.includes(k.toLowerCase())) continue;
              if (v === null || v === undefined) continue;
              propsLimpas[k] = v;
            }

            // Calcula área deste buffer individual
            let areaM2 = 0;
            try { areaM2 = turf.area(buffered); } catch (e) { /* ignora */ }

            // ✅ Adiciona campos do buffer (prefixo _)
            buffered.properties = Object.assign({}, {
              _buffer_raio_km: raioKm,
              _buffer_area_km2: +(areaM2 / 1_000_000).toFixed(2),
              _buffer_area_m2: Math.round(areaM2),
              _buffer_gerado_em: new Date().toLocaleString('pt-BR')
            }, propsLimpas);

            buffers.push(buffered);
          }
        } catch (e) { /* ignora feição inválida */ }

        // Yield a cada chunk pra UI respirar
        if (i > 0 && i % chunkSize === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      if (buffers.length === 0) throw new Error('Nenhum buffer foi gerado');

      // Se dissolve, une todos numa só feature
      if (dissolve && buffers.length > 1) {
        try {
          let acumulado = buffers[0];
          for (let i = 1; i < buffers.length; i++) {
            acumulado = turf.union(acumulado, buffers[i]);
            if (i % 20 === 0) await new Promise(r => setTimeout(r, 0));
          }

          // ✅ Herda propriedades da primeira feição original + métricas úteis
          const propsOrigem = dados.features[0]?.properties || {};
          const propsLimpas = {};
          // Copia só campos "úteis" (não geométricos)
          const IGNORAR = ['geom', 'geometry', 'shape', 'shape_leng', 'shape_area', 'objectid_1', 'marcador'];
          for (const [k, v] of Object.entries(propsOrigem)) {
            if (IGNORAR.includes(k.toLowerCase())) continue;
            if (v === null || v === undefined) continue;
            propsLimpas[k] = v;
          }

          // Calcula área total (m²)
          let areaM2 = 0;
          try { areaM2 = turf.area(acumulado); } catch (e) { /* ignora */ }

          const propsDissolve = Object.assign({}, propsLimpas, {
            _dissolved: true,
            _count: buffers.length,
            _area_total_m2: Math.round(areaM2),
            _area_total_km2: +(areaM2 / 1_000_000).toFixed(2),
            _gerado_por: 'M9 · Buffer + Dissolve',
            _data_geracao: new Date().toLocaleString('pt-BR')
          });

          return {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: propsDissolve,
              geometry: acumulado.geometry
            }]
          };
        } catch (e) {
          console.warn('[M9] Dissolve falhou, retornando buffers individuais:', e);
        }
      }

      return { type: 'FeatureCollection', features: buffers };
    },

    _criarCamadaBuffer: function (camadaOrigemId, raioKm, dissolve, geojson) {
      this._contador++;

      // ✅ Garante que o pane dedicado do buffer existe e recebe cliques
      if (!window.mapa.getPane('paneBuffer')) {
        window.mapa.createPane('paneBuffer');
        window.mapa.getPane('paneBuffer').style.zIndex = 650;      // entre pontos (600) e seleção (700)
        window.mapa.getPane('paneBuffer').style.pointerEvents = 'auto';
      }
      const nomeBase = window.CONFIG_CAMADAS[camadaOrigemId]?.nome || camadaOrigemId;
      const filtroTexto = geojson._filtroTexto || '';
      const nome = `Buffer ${raioKm}km · ${nomeBase}${filtroTexto ? ` [${filtroTexto}]` : ''}${dissolve ? ' (unificado)' : ''}`;
      const id = `buffer_${Date.now()}_${raioKm}km_${camadaOrigemId}`;

      // Cor aleatória distinta
      const cor = window.LayerRegistry.corAleatoria();

      // Registra em CONFIG_CAMADAS
      CONFIG_CAMADAS[id] = {
        nome: nome,
        grupo: 'importadas',   // reaproveita a seção "Camadas Importadas" do painel
        arquivos: [],
        cor: cor,
        opacidade: 0.25,
        peso: 1.5,
        tipoGeo: 'poligono',
        ativa: true,
        camposVisiveis: [],
        _isBuffer: true,
        _camadaOrigem: camadaOrigemId,
        _raioKm: raioKm,
        _dissolve: dissolve
      };

      // Salva dados
      DADOS_GEOJSON_BRUTOS[id] = geojson;

      // Renderiza no mapa
      CAMADAS_MAPA[id] = L.geoJSON(geojson, {
        pane: 'paneBuffer',         // ✅ pane dedicada (650) — recebe cliques
        interactive: true,
        bubblingMouseEvents: false,
        style: {
          color: cor,
          weight: 2,
          opacity: 0.8,
          fillColor: cor,
          fillOpacity: 0.25,
          dashArray: '5, 5'
        },
        onEachFeature: (f, layer) => {
          const p = f.properties || {};

          // ✅ Calcula área do buffer
          let areaKm2 = 0;
          try {
            const areaM2 = turf.area(f);
            areaKm2 = areaM2 / 1_000_000;
          } catch (e) { /* ignora */ }

          const props = p._dissolved
            ? {
                Nome: `Buffer unificado · ${raioKm} km`,
                Origem: nomeBase,
                'Feições origem': p._count,
                'Raio': `${raioKm} km`,
                'Área total': areaKm2 >= 1000
                  ? `${(areaKm2 / 1000).toFixed(2)} mil km²`
                  : `${areaKm2.toFixed(2)} km²`
              }
            : {
                Nome: `Buffer · ${raioKm} km`,
                Origem: nomeBase,
                'Raio': `${raioKm} km`,
                'Área': areaKm2 >= 1
                  ? `${areaKm2.toFixed(2)} km²`
                  : `${(areaKm2 * 100).toFixed(2)} ha`
              };

          // ✅ Constrói popup próprio (mais limpo que o genérico)
          const linhas = Object.entries(props).map(([k, v]) =>
            `<div class="pop-linha">
              <span class="pop-lbl">${window.Security.escapeHTML(k)}:</span>
              <span class="pop-val">${window.Security.escapeHTML(v)}</span>
            </div>`
          ).join('');

          const html = `
            <div class="pop-topo">⭕ Buffer Geodésico</div>
            <div class="pop-corpo">${linhas}</div>
            <div class="pop-rodape-auditoria">
              <span>Origem: ${window.Security.escapeHTML(nomeBase)}</span>
              <span>Turf.js · ${new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          `;
          // ✅ Popup abre no centroide (posição consistente)
          layer.getPopupAnchor = () => [0, 0];
          layer.on('click', (e) => {
            // Recalcula o centro do buffer pra centralizar o popup
            try {
              const centro = layer.getBounds().getCenter();
              layer.setLatLng && layer.setLatLng(centro);   // só pra polígono
            } catch (e) { /* ignora */ }
          });
          layer.bindPopup(html);

          // ✅ Tooltip ao passar o mouse
          layer.bindTooltip(`⭕ Buffer ${raioKm} km`, {
            sticky: true,
            className: 'rotulo-hover-feicao'
          });
        }
      });

      CAMADAS_MAPA[id].addTo(window.mapa);

      // Adiciona no painel lateral
      const grupoEl = document.getElementById('grupo-importadas');
      const msgVazio = document.getElementById('msg-sem-importadas');
      if (msgVazio) msgVazio.style.display = 'none';

      if (grupoEl) {
        grupoEl.classList.remove('fechado');
        if (typeof window.construirItemCamada === 'function') {
          window.construirItemCamada(id, CONFIG_CAMADAS[id], grupoEl);
        }
        const cntBadge = document.getElementById(`cnt-${id}`);
        if (cntBadge) cntBadge.innerText = `(${geojson.features.length})`;
        setTimeout(() => {
          const item = document.getElementById(`item-camada-${id}`);
          if (item) {
            item.style.display = 'flex';   // ✅ Força visível mesmo se estava "oculta"
            const painelCorpo = document.querySelector('#painel-camadas-lateral .painel-corpo') || grupoEl; if (painelCorpo) painelCorpo.scrollTop = item.offsetTop; window.scrollTo(0, 0);
          }
          // ✅ Confirma que o item foi criado
          console.log('[Buffer] Item criado:', !!item, '| ID:', id);
        }, 50);
      }

      // Ajusta zoom pro resultado
      try {
        const bounds = CAMADAS_MAPA[id].getBounds();
        if (bounds.isValid()) window.mapa.fitBounds(bounds, { padding: [40, 40] });
      } catch (e) { /* ignora */ }

      // Atualiza selects e legenda
      if (window.Styler) window.Styler.atualizarLegenda();
      if (window.FilterManager) window.FilterManager.atualizarSeletorCamadas();
    }
  };

  window.BufferTool = BufferTool;
  console.info('[js] BufferTool carregado (M9)');
})();
/* --- FIM: js/domain/buffer-tool.js --- */

/* --- INÍCIO: js/domain/geo-tools.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: GeoTools (M10)
   Escopo: geoprocessamento (intersecção, diferença, união)
   Dependências: window.DADOS_GEOJSON_BRUTOS, window.CONFIG_CAMADAS,
                 window.CAMADAS_MAPA, window.LayerRegistry, window.UI,
                 window.Security, window.Styler, window.FilterManager,
                 window.mapa, window.DataManager, turf (global)
   Expõe: window.GeoTools
   ============================================================ */
(function () {
  'use strict';

  const GeoTools = {
    _contador: 0,

    /* ============================================================
       UI — ABRIR / FECHAR MODAL
       ============================================================ */
    abrirModal: function () {
      const modal = document.getElementById('modal-geo');
      if (!modal) {
        console.error('[M10] Modal #modal-geo não encontrado no DOM');
        return;
      }

      this._popularSelects();
      this._configurarListeners();
      this._atualizarPreview();

      modal.classList.add('aberto');
    },

    fecharModal: function () {
      const modal = document.getElementById('modal-geo');
      if (modal) modal.classList.remove('aberto');
    },

    _configurarListeners: function () {
      const selA = document.getElementById('geo-camada-a');
      const selB = document.getElementById('geo-camada-b');
      const selOp = document.getElementById('geo-operacao');

      if (selA && !selA._geoListeners) {
        selA.addEventListener('change', () => this._atualizarPreview());
        selA._geoListeners = true;
      }
      if (selB && !selB._geoListeners) {
        selB.addEventListener('change', () => this._atualizarPreview());
        selB._geoListeners = true;
      }
      if (selOp && !selOp._geoListeners) {
        selOp.addEventListener('change', () => this._atualizarPreview());
        selOp._geoListeners = true;
      }

      // ✅ Radios visuais controlam o select oculto E forçam refresh do preview
      document.querySelectorAll('input[name="geo-op"]').forEach(radio => {
        if (radio._geoListeners) return;
        radio.addEventListener('change', (e) => {
          if (selOp) selOp.value = e.target.value;
          // Força reprocessamento mesmo se o value não mudou (edge case)
          setTimeout(() => this._atualizarPreview(), 10);
        });
        radio._geoListeners = true;
      });
      // ✅ Click nos labels dos radios também dispara preview
      document.querySelectorAll('.geo-op-opcao').forEach(label => {
        if (label._geoLabelListeners) return;
        label.addEventListener('click', () => {
          setTimeout(() => this._atualizarPreview(), 20);
        });
        label._geoLabelListeners = true;
      });
      const chkDis = document.getElementById('geo-dissolve');
      if (chkDis && !chkDis._geoListeners) {
        chkDis.addEventListener('change', () => this._atualizarPreview());
        chkDis._geoListeners = true;
      }
    },

    _popularSelects: function () {
      const selA = document.getElementById('geo-camada-a');
      const selB = document.getElementById('geo-camada-b');
      if (!selA || !selB) return;

      // Lista TODAS as camadas do CONFIG (mesmo não carregadas)
      const candidatas = [];
      for (const [id, cfg] of Object.entries(CONFIG_CAMADAS)) {
        // Ignora buffers/geos/importadas (evita selects poluídos)
        if (id.startsWith('buffer_') || id.startsWith('geo_') || id.startsWith('imp_')) continue;

        const carregada = DADOS_GEOJSON_BRUTOS[id]?.features?.length || 0;
        const nome = cfg.nome || id;
        const marca = carregada > 0 ? `(${carregada.toLocaleString('pt-BR')})` : '(carregar)';
        candidatas.push({ id, nome, n: carregada, label: `${nome} ${marca}` });
      }
      candidatas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      const valA = selA.value;
      const valB = selB.value;

      selA.innerHTML = '';
      selB.innerHTML = '';

      if (candidatas.length === 0) {
        selA.innerHTML = '<option value="">(Nenhuma camada disponível)</option>';
        selB.innerHTML = '<option value="">(Nenhuma camada disponível)</option>';
        return;
      }

      for (const c of candidatas) {
        const optA = document.createElement('option');
        optA.value = c.id;
        optA.textContent = c.label;
        selA.appendChild(optA);

        const optB = document.createElement('option');
        optB.value = c.id;
        optB.textContent = c.label;
        selB.appendChild(optB);
      }

      // Restaura ou escolhe defaults diferentes
      if (valA && candidatas.find(c => c.id === valA)) selA.value = valA;
      else selA.value = candidatas[0].id;

      if (valB && candidatas.find(c => c.id === valB) && valB !== selA.value) selB.value = valB;
      else {
        const outro = candidatas.find(c => c.id !== selA.value);
        selB.value = outro ? outro.id : candidatas[0].id;
      }

      console.log(`[M10] ${candidatas.length} camadas no select | A=${selA.value} B=${selB.value}`);
    },

    _atualizarPreview: function () {
      const preview = document.getElementById('geo-preview');
      if (!preview) return;

      const selA = document.getElementById('geo-camada-a');
      const selB = document.getElementById('geo-camada-b');
      const selOp = document.getElementById('geo-operacao');

      const idA = selA ? selA.value : '';
      const idB = selB ? selB.value : '';
      const op = (selOp && selOp.value) ? selOp.value : 'intersecao';

      if (!idA || !idB) {
        preview.innerHTML = '<em style="color:#64748b;">Selecione duas camadas.</em>';
        return;
      }
      if (idA === idB) {
        preview.innerHTML = '<em style="color:#f59e0b;">⚠️ Selecione camadas diferentes para A e B.</em>';
        return;
      }

      const nA = DADOS_GEOJSON_BRUTOS[idA]?.features?.length || 0;
      const nB = DADOS_GEOJSON_BRUTOS[idB]?.features?.length || 0;
      const nomeA = window.CONFIG_CAMADAS[idA]?.nome || idA;
      const nomeB = window.CONFIG_CAMADAS[idB]?.nome || idB;

      const operacoes = {
        'intersecao': '🔷 Intersecção',
        'diferenca': '🔶 Diferença (A - B)',
        'uniao': '🔗 União',
        'pontos_em': '🎯 Pontos em Polígono'
      };
      const nomeOp = operacoes[op] || '🔷 Intersecção';

      const pares = nA * nB;
      const pesado = pares > 50000;
      const carregadaA = nA > 0;
      const carregadaB = nB > 0;

      // ✅ Detecta tipos geométricos pra avisar incompatibilidades
      let avisoTipo = '';
      let tipoA = '?';
      let tipoB = '?';
      if (carregadaA && carregadaB && this._detectarTipoGeom) {
        tipoA = this._detectarTipoGeom(DADOS_GEOJSON_BRUTOS[idA].features);
        tipoB = this._detectarTipoGeom(DADOS_GEOJSON_BRUTOS[idB].features);

        const tipoLabel = { ponto: 'pontos', linha: 'linhas', poligono: 'polígonos', desconhecido: '?' };

        // Avisos específicos por operação
        if (op === 'pontos_em') {
          const valido = (tipoA === 'ponto' && tipoB === 'poligono') || (tipoA === 'poligono' && tipoB === 'ponto');
          if (!valido) {
            avisoTipo = `<div style="margin-top:8px;padding:6px 10px;background:rgba(239,68,68,0.15);border-left:3px solid #ef4444;border-radius:4px;font-size:10.5px;color:#fca5a5;">
              ⚠️ <strong>Combinação inválida.</strong> Esta operação precisa de <strong>pontos × polígonos</strong>.
              Você tem ${tipoLabel[tipoA] || '?'} × ${tipoLabel[tipoB] || '?'}.
            </div>`;
          } else {
            avisoTipo = `<div style="margin-top:8px;padding:6px 10px;background:rgba(16,185,129,0.15);border-left:3px solid #10b981;border-radius:4px;font-size:10.5px;color:#a7f3d0;">
              ✅ <strong>Compatível.</strong> ${tipoLabel[tipoA]} em ${tipoLabel[tipoB]}.
            </div>`;
          }
        } else if (op === 'intersecao') {
          if ((tipoA === 'ponto') !== (tipoB === 'ponto')) {
            avisoTipo = `<div style="margin-top:8px;padding:6px 10px;background:rgba(245,158,11,0.15);border-left:3px solid #f59e0b;border-radius:4px;font-size:10.5px;color:#fde68a;">
              ℹ️ Ponto × não-ponto <strong>não funciona com <code>turf.intersect</code></strong>.
              Use <strong>🎯 Pontos em</strong> se quiser filtrar pontos dentro de polígonos.
            </div>`;
          }
        }
      }

      const tipoLabel = { ponto: 'pontos', linha: 'linhas', poligono: 'polígonos', desconhecido: '?' };
      const tiposTexto = (carregadaA && carregadaB)
        ? `<div style="font-size:10px;color:#64748b;margin-bottom:6px;">
             A: <strong>${tipoLabel[tipoA] || '?'}</strong> · B: <strong>${tipoLabel[tipoB] || '?'}</strong>
           </div>`
        : '';

      preview.innerHTML = `
        <div style="font-size:11.5px;color:#cbd5e1;line-height:1.5;">
          <div style="font-weight:700;color:#fbbf24;margin-bottom:6px;">${nomeOp}</div>
          ${tiposTexto}
          <div>
            <strong style="color:#38bdf8;">${carregadaA ? nA.toLocaleString('pt-BR') : '?'}</strong>
            feições de <span style="color:#e2e8f0;">${window.Security.escapeHTML(nomeA)}</span>
            ${!carregadaA ? '<span style="color:#f59e0b;"> (será carregada)</span>' : ''}
          </div>
          <div>
            <strong style="color:#38bdf8;">${carregadaB ? nB.toLocaleString('pt-BR') : '?'}</strong>
            feições de <span style="color:#e2e8f0;">${window.Security.escapeHTML(nomeB)}</span>
            ${!carregadaB ? '<span style="color:#f59e0b;"> (será carregada)</span>' : ''}
          </div>
          ${carregadaA && carregadaB ? `
            <div style="margin-top:8px;font-size:10.5px;color:#64748b;">
              Pares a testar: <strong>${pares.toLocaleString('pt-BR')}</strong>
              ${pesado ? '<span style="color:#f59e0b;"> — pode demorar</span>' : ''}
            </div>
          ` : ''}
          ${avisoTipo}
        </div>
      `;
    },

    /* ============================================================
       MOTOR DE CÁLCULO
       ============================================================ */
    calcular: async function () {
      const selA = document.getElementById('geo-camada-a');
      const selB = document.getElementById('geo-camada-b');
      const selOp = document.getElementById('geo-operacao');
      const chkDissolve = document.getElementById('geo-dissolve');
      const btn = document.getElementById('btn-geo-calcular');

      const idA = selA?.value;
      const idB = selB?.value;
      const op = (selOp && selOp.value) ? selOp.value : 'intersecao';
      const dissolve = chkDissolve ? chkDissolve.checked : false;

      if (!idA || !idB) {
        if (window.UI) window.UI.toast('⚠️ Selecione as duas camadas.');
        return;
      }
      if (idA === idB) {
        if (window.UI) window.UI.toast('⚠️ Escolha camadas diferentes.');
        return;
      }

      if (typeof turf === 'undefined') {
        if (window.UI) window.UI.toast('⚠️ Turf.js indisponível.');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Calculando...';
      }

      // Carrega camadas sob demanda
      try {
        if (!DADOS_GEOJSON_BRUTOS[idA]?.features?.length) {
          if (window.UI) window.UI.toast(`⏳ Carregando ${CONFIG_CAMADAS[idA]?.nome || idA}...`);
          await window.DataManager.carregarCamada(idA);
        }
        if (!DADOS_GEOJSON_BRUTOS[idB]?.features?.length) {
          if (window.UI) window.UI.toast(`⏳ Carregando ${CONFIG_CAMADAS[idB]?.nome || idB}...`);
          await window.DataManager.carregarCamada(idB);
        }
      } catch (e) {
        console.error('[M10] Falha ao carregar camadas:', e);
      }

      const dadosA = DADOS_GEOJSON_BRUTOS[idA];
      const dadosB = DADOS_GEOJSON_BRUTOS[idB];
      if (!dadosA?.features?.length || !dadosB?.features?.length) {
        if (window.UI) window.UI.toast('⚠️ Uma das camadas não pôde ser carregada.');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '⚙️ Calcular';
        }
        return;
      }

      const inicio = performance.now();

      try {
        let resultadoFeatures = [];

        if (op === 'intersecao') {
          resultadoFeatures = await this._processarIntersecao(dadosA, dadosB);
        } else if (op === 'diferenca') {
          resultadoFeatures = await this._processarDiferenca(dadosA, dadosB);
        } else if (op === 'uniao') {
          resultadoFeatures = await this._processarUniao(dadosA, dadosB);
        } else if (op === 'pontos_em') {
          resultadoFeatures = await this._processarPontosEm(dadosA, dadosB);
        }

        if (resultadoFeatures.length === 0) {
          if (window.UI) window.UI.toast('⚠️ Nenhuma feição resultou da operação.');
          return;
        }

        if (dissolve && resultadoFeatures.length > 1 && op !== 'uniao') {
          resultadoFeatures = await this._dissolver(resultadoFeatures);
        }

        const duracao = ((performance.now() - inicio) / 1000).toFixed(1);
        console.info(`[M10] ${resultadoFeatures.length} feição(ões) em ${duracao}s`);

        this._criarCamadaResultado(idA, idB, op, resultadoFeatures, dissolve);

        this.fecharModal();

        if (window.UI) {
          window.UI.toast(`✓ ${resultadoFeatures.length} feição(ões) geradas em ${duracao}s.`);
        }
      } catch (e) {
        console.error('[M10] Erro:', e);
        if (window.UI) window.UI.toast('⚠️ Falha: ' + (e.message || e));
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '⚙️ Calcular';
        }
      }
    },

    /* ---------- Intersecção ---------- */
    _processarIntersecao: async function (dadosA, dadosB) {
      const resultado = [];
      const featsA = dadosA.features.filter(f => f && f.geometry);
      const featsB = dadosB.features.filter(f => f && f.geometry);
      let processados = 0;

      for (const fA of featsA) {
        let boundsA;
        try { boundsA = L.geoJSON(fA).getBounds(); } catch (e) { continue; }
        if (!boundsA || !boundsA.isValid()) continue;

        for (const fB of featsB) {
          let boundsB;
          try { boundsB = L.geoJSON(fB).getBounds(); } catch (e) { continue; }
          if (!boundsB || !boundsB.isValid()) continue;

          if (!boundsA.intersects(boundsB)) continue;

          try {
            const tipoA = fA.geometry.type;
            const tipoB = fB.geometry.type;
            let intersec = null;

            // Caso 1: Polígono × Polígono
            if (tipoA.includes('Polygon') && tipoB.includes('Polygon')) {
              intersec = turf.intersect(fA, fB);
            }
            // Caso 2: Ponto × Polígono
            else if (tipoA.includes('Point') && tipoB.includes('Polygon')) {
              if (turf.booleanPointInPolygon(fA, fB)) {
                intersec = JSON.parse(JSON.stringify(fA));
              }
            }
            // Caso 3: Polígono × Ponto
            else if (tipoA.includes('Polygon') && tipoB.includes('Point')) {
              if (turf.booleanPointInPolygon(fB, fA)) {
                intersec = JSON.parse(JSON.stringify(fB));
              }
            }
            // Caso 4: Linha × Polígono
            else if (tipoA.includes('LineString') && tipoB.includes('Polygon')) {
              if (turf.booleanIntersects(fA, fB)) {
                intersec = JSON.parse(JSON.stringify(fA));
              }
            }
            // Caso 5: Polígono × Linha
            else if (tipoA.includes('Polygon') && tipoB.includes('LineString')) {
              if (turf.booleanIntersects(fB, fA)) {
                intersec = JSON.parse(JSON.stringify(fB));
              }
            }

            if (intersec) {
              const propsA = fA.properties || {};
              const propsB = fB.properties || {};
              const propsFinal = {};

              for (const [k, v] of Object.entries(propsA)) {
                if (['geom','geometry','shape_leng','shape_area'].includes(k.toLowerCase())) continue;
                propsFinal[`A_${k}`] = v;
              }
              for (const [k, v] of Object.entries(propsB)) {
                if (['geom','geometry','shape_leng','shape_area'].includes(k.toLowerCase())) continue;
                propsFinal[`B_${k}`] = v;
              }

              try {
                if (intersec.geometry.type.includes('Polygon')) {
                  const areaM2 = turf.area(intersec);
                  propsFinal._area_m2 = Math.round(areaM2);
                  propsFinal._area_km2 = +(areaM2 / 1_000_000).toFixed(3);
                } else if (intersec.geometry.type.includes('LineString')) {
                  const compKm = turf.length(intersec, { units: 'kilometers' });
                  propsFinal._extensao_km = +compKm.toFixed(3);
                }
              } catch (e) { /* ignora */ }

              intersec.properties = propsFinal;
              resultado.push(intersec);
            }
          } catch (e) { /* ignora */ }

          processados++;
          if (processados % 200 === 0) await new Promise(r => setTimeout(r, 0));
        }
      }

      return resultado;
    },

    /* ---------- Diferença (A - B) ---------- */
    _processarDiferenca: async function (dadosA, dadosB) {
      const resultado = [];
      const featsA = dadosA.features.filter(f => f.geometry);
      const featsB = dadosB.features.filter(f => f.geometry);
      let processados = 0;

      for (const fA of featsA) {
        let atual = fA;
        let boundsA;
        try { boundsA = L.geoJSON(fA).getBounds(); } catch (e) { continue; }
        if (!boundsA.isValid()) continue;

        let sofreuRecorte = false;

        for (const fB of featsB) {
          let boundsB;
          try { boundsB = L.geoJSON(fB).getBounds(); } catch (e) { continue; }
          if (!boundsB.isValid()) continue;
          if (!boundsA.intersects(boundsB)) continue;

          try {
            const diff = turf.difference(atual, fB);
            if (diff) {
              atual = diff;
              sofreuRecorte = true;
            } else {
              atual = null;
              break;
            }
          } catch (e) { /* ignora */ }

          processados++;
          if (processados % 200 === 0) await new Promise(r => setTimeout(r, 0));
        }

        if (atual) {
          const propsOrig = fA.properties || {};
          const propsLimpas = {};
          for (const [k, v] of Object.entries(propsOrig)) {
            if (['geom','geometry'].includes(k.toLowerCase())) continue;
            propsLimpas[k] = v;
          }
          propsLimpas._recortada = sofreuRecorte;

          try {
            const areaM2 = turf.area(atual);
            propsLimpas._area_m2 = Math.round(areaM2);
            propsLimpas._area_km2 = +(areaM2 / 1_000_000).toFixed(3);
          } catch (e) { /* ignora */ }

          atual.properties = propsLimpas;
          resultado.push(atual);
        }
      }

      return resultado;
    },
    /* ---------- Pontos em Polígono (spatial join) ---------- */
    _detectarTipoGeom: function (features) {
      if (!features?.length) return 'desconhecido';
      const counts = { ponto: 0, linha: 0, poligono: 0 };
      for (let i = 0; i < Math.min(50, features.length); i++) {
        const t = features[i].geometry?.type || '';
        if (t.includes('Point')) counts.ponto++;
        else if (t.includes('LineString')) counts.linha++;
        else if (t.includes('Polygon')) counts.poligono++;
      }
      if (counts.ponto >= counts.linha && counts.ponto >= counts.poligono) return 'ponto';
      if (counts.linha >= counts.poligono) return 'linha';
      return 'poligono';
    },

    _processarPontosEm: async function (dadosA, dadosB) {
      const tipoA = this._detectarTipoGeom(dadosA.features);
      const tipoB = this._detectarTipoGeom(dadosB.features);

      console.info(`[M10] pontos_em: A=${tipoA}, B=${tipoB}`);

      let pontos, poligonos, invertido = false;

      if (tipoA === 'ponto' && tipoB === 'poligono') {
        pontos = dadosA.features;
        poligonos = dadosB.features;
      } else if (tipoB === 'ponto' && tipoA === 'poligono') {
        pontos = dadosB.features;
        poligonos = dadosA.features;
        invertido = true;
      } else {
        throw new Error(`Combinação incompatível (A=${tipoA} × B=${tipoB}). Preciso de ponto × polígono.`);
      }

      // Pré-calcula bounding boxes dos polígonos (otimização)
      const polysComBbox = [];
      for (const poly of poligonos) {
        if (!poly.geometry) continue;
        try {
          const bounds = L.geoJSON(poly).getBounds();
          if (bounds.isValid()) polysComBbox.push({ feature: poly, bounds: bounds });
        } catch (e) { /* ignora */ }
      }

      console.info(`[M10] ${pontos.length} pontos × ${polysComBbox.length} polígonos com bbox`);

      const resultado = [];
      let processados = 0;

      for (const p of pontos) {
        let pontoGeo;
        try {
          if (p.geometry?.type === 'Point') {
            pontoGeo = p.geometry;
          } else if (p.geometry?.type === 'MultiPoint' && p.geometry.coordinates.length > 0) {
            pontoGeo = { type: 'Point', coordinates: p.geometry.coordinates[0] };
          } else {
            continue;
          }
        } catch (e) { continue; }

        const lat = pontoGeo.coordinates[1];
        const lng = pontoGeo.coordinates[0];
        const ptLatLng = L.latLng(lat, lng);

        let contenedor = null;

        for (const { feature, bounds } of polysComBbox) {
          if (!bounds.contains(ptLatLng)) continue;

          try {
            if (turf.booleanPointInPolygon(pontoGeo, feature)) {
              contenedor = feature;
              break;
            }
          } catch (e) { /* ignora */ }

          processados++;
          if (processados % 500 === 0) await new Promise(r => setTimeout(r, 0));
        }

        if (contenedor) {
          const propsP = p.properties || {};
          const propsPoly = contenedor.properties || {};
          const propsFinal = {};

          const prefixoP = invertido ? 'B_' : 'A_';
          const prefixoPoly = invertido ? 'A_' : 'B_';

          for (const [k, v] of Object.entries(propsP)) {
            if (['geom', 'geometry'].includes(k.toLowerCase())) continue;
            propsFinal[`${prefixoP}${k}`] = v;
          }
          for (const [k, v] of Object.entries(propsPoly)) {
            if (['geom', 'geometry'].includes(k.toLowerCase())) continue;
            propsFinal[`${prefixoPoly}${k}`] = v;
          }

          propsFinal._contido_em = invertido ? 'A' : 'B';

          resultado.push({
            type: 'Feature',
            properties: propsFinal,
            geometry: pontoGeo
          });
        }
      }

      return resultado;
    },
    /* ---------- União ---------- */
    _processarUniao: async function (dadosA, dadosB) {
      const todas = [...dadosA.features, ...dadosB.features];
      let acumulado = null;

      for (let i = 0; i < todas.length; i++) {
        const f = todas[i];
        if (!f.geometry) continue;

        try {
          if (!acumulado) {
            acumulado = f;
          } else {
            const u = turf.union(acumulado, f);
            if (u) acumulado = u;
          }
        } catch (e) { /* ignora */ }

        if (i > 0 && i % 20 === 0) await new Promise(r => setTimeout(r, 0));
      }

      if (!acumulado) return [];

      try {
        const areaM2 = turf.area(acumulado);
        acumulado.properties = Object.assign({}, acumulado.properties || {}, {
          _uniao_origem: `${dadosA.features.length} + ${dadosB.features.length} feições`,
          _area_m2: Math.round(areaM2),
          _area_km2: +(areaM2 / 1_000_000).toFixed(3)
        });
      } catch (e) { /* ignora */ }

      return [acumulado];
    },

    /* ---------- Dissolve ---------- */
    _dissolver: async function (features) {
      let acumulado = features[0];
      for (let i = 1; i < features.length; i++) {
        try {
          const u = turf.union(acumulado, features[i]);
          if (u) acumulado = u;
        } catch (e) { /* ignora */ }
        if (i % 20 === 0) await new Promise(r => setTimeout(r, 0));
      }

      try {
        const areaM2 = turf.area(acumulado);
        acumulado.properties = Object.assign({}, acumulado.properties || {}, {
          _dissolved: true,
          _count: features.length,
          _area_km2: +(areaM2 / 1_000_000).toFixed(3)
        });
      } catch (e) { /* ignora */ }

      return [acumulado];
    },

    /* ---------- Cria camada resultado ---------- */
    _criarCamadaResultado: function (idA, idB, op, features, dissolve) {
      this._contador++;
      const nomeA = window.CONFIG_CAMADAS[idA]?.nome || idA;
      const nomeB = window.CONFIG_CAMADAS[idB]?.nome || idB;
      const opsNomes = { intersecao: '∩', diferenca: '−', uniao: '∪', pontos_em: '🎯' };
      const opSimbolo = opsNomes[op] || op;
      const nome = `Geo ${opSimbolo} · ${nomeA.split(' ')[0]} × ${nomeB.split(' ')[0]}${dissolve ? ' (unificado)' : ''}`;
      const id = `geo_${Date.now()}_${op}_${idA}_${idB}`;

      const cor = window.LayerRegistry.corAleatoria();

      CONFIG_CAMADAS[id] = {
        nome: nome,
        grupo: 'importadas',
        arquivos: [],
        cor: cor,
        opacidade: 0.4,
        peso: 2,
        tipoGeo: window.GeomTypeDetector ? window.GeomTypeDetector.detectar(geojson) : 'poligono',
        ativa: true,
        camposVisiveis: [],
        _isGeo: true,
        _operacao: op
      };

      const geojson = { type: 'FeatureCollection', features };
      DADOS_GEOJSON_BRUTOS[id] = geojson;

      // Garante pane dedicada
      if (!window.mapa.getPane('paneBuffer')) {
        window.mapa.createPane('paneBuffer');
        window.mapa.getPane('paneBuffer').style.zIndex = 650;
        window.mapa.getPane('paneBuffer').style.pointerEvents = 'auto';
      }

      CAMADAS_MAPA[id] = L.geoJSON(geojson, {
        pane: 'paneBuffer',
        interactive: true,
        bubblingMouseEvents: false,
        style: {
          color: cor,
          weight: 2.5,
          opacity: 0.9,
          fillColor: cor,
          fillOpacity: 0.35,
          dashArray: op === 'diferenca' ? '8, 6' : null
        },
        // ✅ Pontos viram círculos destacados (não markers padrão)
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {
          pane: 'panePontos',       // z-index 600 — acima dos outros layers
          radius: 8,
          color: '#ffffff',
          weight: 2,
          fillColor: cor,
          fillOpacity: 1
        }),
        onEachFeature: (f, layer) => {
          const p = f.properties || {};
          const linhas = Object.entries(p)
            .filter(([k]) => !['geom','geometry'].includes(k.toLowerCase()))
            .slice(0, 15)
            .map(([k, v]) =>
              `<div class="pop-linha"><span class="pop-lbl">${window.Security.escapeHTML(k)}:</span><span class="pop-val">${window.Security.escapeHTML(v)}</span></div>`
            ).join('');

          const html = `
            <div class="pop-topo">⚙️ Resultado Geoprocessamento</div>
            <div class="pop-corpo">${linhas || '<p style="color:#64748b;">Sem atributos.</p>'}</div>
            <div class="pop-rodape-auditoria">
              <span>${opSimbolo} ${nomeA.slice(0, 20)} × ${nomeB.slice(0, 20)}</span>
              <span>Turf.js</span>
            </div>
          `;
          layer.bindPopup(html);
        }
      });

      CAMADAS_MAPA[id].addTo(window.mapa);

      const grupoEl = document.getElementById('grupo-importadas');
      const msgVazio = document.getElementById('msg-sem-importadas');
      if (msgVazio) msgVazio.style.display = 'none';

      if (grupoEl) {
        grupoEl.classList.remove('fechado');
        if (typeof window.construirItemCamada === 'function') {
          window.construirItemCamada(id, CONFIG_CAMADAS[id], grupoEl);
        }
        const cntBadge = document.getElementById(`cnt-${id}`);
        if (cntBadge) cntBadge.innerText = `(${features.length})`;

        setTimeout(() => {
          const item = document.getElementById(`item-camada-${id}`);
          if (item) {
            item.style.display = 'flex';
            window.scrollTo(0, 0);
          }
        }, 50);
      }

      try {
        const bounds = CAMADAS_MAPA[id].getBounds();
        if (bounds.isValid()) window.mapa.fitBounds(bounds, { padding: [40, 40] });
      } catch (e) { /* ignora */ }

      if (window.Styler) window.Styler.atualizarStyle?.();
      if (window.Styler) window.Styler.atualizarLegenda();
      if (window.FilterManager) window.FilterManager.atualizarSeletorCamadas();
    }
  };

  window.GeoTools = GeoTools;
  console.info('[js] GeoTools carregado (M10)');
})();
/* --- FIM: js/domain/geo-tools.js --- */

/* --- INÍCIO: js/domain/ven-unified-manager.js --- */
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
    anoAtivo: 'ven_2024',
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
            <option value="ven_2024" selected>2024 (Oficial V4)</option>
            <option value="ven_2022">2022 (Série Histórica)</option>
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
            <input type="range" min="0.1" max="1" step="0.05" value="${CONFIG_CAMADAS[this.anoAtivo]?.opacidade ?? 0.9}"
                   oninput="this.nextElementSibling.innerText = Math.round(this.value * 100) + '%'"
                   onchange="VENUnifiedManager.atualizarOpacidade(parseFloat(this.value))">
            <span style="min-width:35px; text-align:right; font-size:10px;">${Math.round((CONFIG_CAMADAS[this.anoAtivo]?.opacidade ?? 0.9) * 100)}%</span>
          </div>
          <div class="linha-ajuste">
            <span>Espessura:</span>
            <input type="range" min="1" max="8" step="0.5" value="${CONFIG_CAMADAS[this.anoAtivo]?.peso ?? 2.8}"
                   oninput="this.nextElementSibling.innerText = this.value + 'px'"
                   onchange="VENUnifiedManager.atualizarPeso(parseFloat(this.value))">
            <span style="min-width:35px; text-align:right; font-size:10px;">${CONFIG_CAMADAS[this.anoAtivo]?.peso ?? 2.8}px</span>
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

    atualizarOpacidade: function (val, opcoes) {
      opcoes = opcoes || {};
      const ano = opcoes.anoOverride || this.anoAtivo;
      if (!CONFIG_CAMADAS[ano]) return;

      const valorAnterior = CONFIG_CAMADAS[ano].opacidade;

      if (!opcoes.semHistorico && valorAnterior !== val && window.ActionHistory) {
        const self = this;
        window.ActionHistory.registrar({
          tipo: 'ven-opacidade',
          descricao: `Alterar opacidade de VEN ${ano.replace('ven_', '')}`,
          undo: () => self.atualizarOpacidade(valorAnterior, { semHistorico: true, anoOverride: ano }),
          redo: () => self.atualizarOpacidade(val, { semHistorico: true, anoOverride: ano })
        });
      }

      CONFIG_CAMADAS[ano].opacidade = val;
      if (CAMADAS_MAPA[ano] && CAMADAS_MAPA[ano].setStyle) {
        CAMADAS_MAPA[ano].setStyle({ opacity: val });
      }
    },

    atualizarPeso: function (val, opcoes) {
      opcoes = opcoes || {};
      const ano = opcoes.anoOverride || this.anoAtivo;
      if (!CONFIG_CAMADAS[ano]) return;

      const valorAnterior = CONFIG_CAMADAS[ano].peso;

      if (!opcoes.semHistorico && valorAnterior !== val && window.ActionHistory) {
        const self = this;
        window.ActionHistory.registrar({
          tipo: 'ven-peso',
          descricao: `Alterar espessura de VEN ${ano.replace('ven_', '')}`,
          undo: () => self.atualizarPeso(valorAnterior, { semHistorico: true, anoOverride: ano }),
          redo: () => self.atualizarPeso(val, { semHistorico: true, anoOverride: ano })
        });
      }

      CONFIG_CAMADAS[ano].peso = val;
      if (CAMADAS_MAPA[ano] && CAMADAS_MAPA[ano].setStyle) {
        CAMADAS_MAPA[ano].setStyle({ weight: val });
      }
    }
  };

  window.VENUnifiedManager = VENUnifiedManager;
  console.info('[js] VENUnifiedManager carregado');
})();
/* --- FIM: js/domain/ven-unified-manager.js --- */

/* --- INÍCIO: js/domain/safra-diff-manager.js --- */
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
/* --- FIM: js/domain/safra-diff-manager.js --- */

/* --- INÍCIO: js/domain/tku-manager.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: TKUManager (M12)
   Escopo: filtros específicos do TKU (ano + navegação + colorir por ano)
   Dependências: window.DADOS_GEOJSON_BRUTOS, window.CAMADAS_MAPA,
                 window.CONFIG_CAMADAS, window.UI, window.Styler
   Expõe: window.TKUManager
   ============================================================ */
(function () {
  'use strict';

  const TKUManager = {
    modoCor: 'fluxo',   // 'fluxo' | 'ano'

    /* ============================================================
       FILTRO POR ANO + NAVEGAÇÃO
       ============================================================ */
    aplicarFiltro: function () {
      const anos = [];
      if (document.getElementById('tku-ano-2021')?.checked) anos.push(2021);
      if (document.getElementById('tku-ano-2023')?.checked) anos.push(2023);
      if (document.getElementById('tku-ano-2025')?.checked) anos.push(2025);

      const navs = [];
      if (document.getElementById('tku-nav-cabotagem')?.checked) navs.push('Cabotagem');
      if (document.getElementById('tku-nav-interior')?.checked) navs.push('Interior');
      if (document.getElementById('tku-nav-longo')?.checked) navs.push('Longo Curso');

      const dados = window.DADOS_GEOJSON_BRUTOS['tku'];
      if (!dados?.features?.length) return;

      const filtradas = dados.features.filter(f => {
        const p = f.properties || {};
        return anos.includes(Number(p.ano)) && navs.includes(p.navegacao);
      });

      const camada = window.CAMADAS_MAPA['tku'];
      if (camada) {
        camada.clearLayers();
        camada.addData({
          type: 'FeatureCollection',
          features: filtradas
        });

        // Reaplica modo de cor (se estiver em modo 'ano')
        if (this.modoCor === 'ano') {
          this._aplicarCorPorAno(camada);
        }
      }

      const cnt = document.getElementById('cnt-tku');
      if (cnt) cnt.innerText = `(${filtradas.length}/${dados.features.length})`;

      if (window.UI) {
        window.UI.toast(`📦 TKU: ${filtradas.length} de ${dados.features.length} trechos visíveis.`);
      }
    },

    /* ============================================================
       MODO: COLORIR POR FLUXO vs POR ANO
       ============================================================ */
    alternarModoCor: function () {
      this.modoCor = this.modoCor === 'fluxo' ? 'ano' : 'fluxo';
      this._atualizarBotaoModo();
      this._reaplicarEstilo();
    },

    _atualizarBotaoModo: function () {
      const btn = document.getElementById('btn-tku-modo-cor');
      if (!btn) return;
      if (this.modoCor === 'ano') {
        btn.innerHTML = '🎨 Cor por: ANO';
        btn.style.background = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
      } else {
        btn.innerHTML = '🎨 Cor por: FLUXO';
        btn.style.background = 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)';
      }
    },

    _reaplicarEstilo: function () {
      const camada = window.CAMADAS_MAPA['tku'];
      if (!camada) return;

      // Aplica modo 'fluxo' (default do styler)
      if (this.modoCor === 'fluxo') {
        const faixas = window.Styler._tkuFaixas || window.Styler._calcularFaixasTKU();

        camada.eachLayer(layer => {
          if (!layer.feature || !layer.setStyle) return;
          const fluxo = Number(layer.feature.properties?.fluxo) || 0;

          let peso = 2.5, cor = '#10b981';
          if (fluxo > faixas.p90) { peso = 10; cor = '#dc2626'; }
          else if (fluxo > faixas.p70) { peso = 8; cor = '#f97316'; }
          else if (fluxo > faixas.p50) { peso = 6; cor = '#f59e0b'; }
          else if (fluxo > faixas.p30) { peso = 4; cor = '#84cc16'; }

          layer.setStyle({ color: cor, weight: peso, opacity: 0.85 });
        });
      } else {
        // Aplica modo 'ano'
        this._aplicarCorPorAno(camada);
      }

      if (window.Styler) window.Styler.atualizarLegenda();
    },

    _aplicarCorPorAno: function (camada) {
      camada.eachLayer(layer => {
        if (!layer.feature || !layer.setStyle) return;
        const ano = Number(layer.feature.properties?.ano);
        const cor = this._corPorAno(ano);
        layer.setStyle({ color: cor, weight: 4, opacity: 0.9 });
      });
    },

    _corPorAno: function (ano) {
      if (ano === 2021) return '#3b82f6';   // azul
      if (ano === 2023) return '#f59e0b';   // âmbar
      if (ano === 2025) return '#dc2626';   // vermelho
      return '#94a3b8';
    },

    /* ============================================================
       ATALHOS RÁPIDOS
       ============================================================ */
    filtrarAno: function (ano) {
      // Desmarca todos e marca só o ano solicitado
      ['2021', '2023', '2025'].forEach(a => {
        const chk = document.getElementById(`tku-ano-${a}`);
        if (chk) chk.checked = (String(ano) === a);
      });
      // Mantém todas as navegações
      ['cabotagem', 'interior', 'longo'].forEach(n => {
        const chk = document.getElementById(`tku-nav-${n}`);
        if (chk) chk.checked = true;
      });
      this.aplicarFiltro();
    },

    mostrarTodos: function () {
      ['2021', '2023', '2025'].forEach(a => {
        const chk = document.getElementById(`tku-ano-${a}`);
        if (chk) chk.checked = true;
      });
      ['cabotagem', 'interior', 'longo'].forEach(n => {
        const chk = document.getElementById(`tku-nav-${n}`);
        if (chk) chk.checked = true;
      });
      this.aplicarFiltro();
    }
  };

  window.TKUManager = TKUManager;
  console.info('[js] TKUManager carregado (M12)');
})();
/* --- FIM: js/domain/tku-manager.js --- */

/* --- INÍCIO: js/domain/estudos-manager.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: EstudosManager (M13)
   Escopo: gestão de estudos/PDFs publicados no WebGIS
   Dependências: window.Security, window.UI, window.NotificationManager
   Expõe: window.EstudosManager
   ============================================================ */
(function () {
  'use strict';

  const EstudosManager = {
    _estudos: [],
    _filtroCategoria: 'TODOS',
    _busca: '',
    _storageKey: 'antaq_estudos_sessao',
    _carregado: false,

    /* ============================================================
       CARREGAMENTO
       ============================================================ */
    carregar: async function () {
      if (this._carregado) return this._estudos;

      try {
        const res = await fetch('docs/estudos/manifest.json?_t=' + Date.now());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        this._estudos = Array.isArray(data.estudos) ? data.estudos : [];
        console.info(`[M13] ${this._estudos.length} estudo(s) carregado(s)`);
      } catch (e) {
        console.warn('[M13] Falha ao carregar manifest:', e.message);
        this._estudos = [];
      }

      // ✅ Adiciona estudos salvos na sessão (localStorage)
      try {
        const salvos = JSON.parse(localStorage.getItem(this._storageKey) || '[]');
        for (const s of salvos) {
          if (!this._estudos.find(e => e.id === s.id)) {
            this._estudos.push(s);
          }
        }
      } catch (e) { /* ignora */ }

      this._carregado = true;
      return this._estudos;
    },

    /* ============================================================
       RENDERIZAÇÃO DA ABA
       ============================================================ */
    renderizar: async function () {
      const container = document.getElementById('estudos-lista');
      if (!container) return;

      await this.carregar();

      // Aplica filtros
      let lista = this._estudos.slice();
      if (this._filtroCategoria !== 'TODOS') {
        lista = lista.filter(e => e.categoria === this._filtroCategoria);
      }
      if (this._busca) {
        const t = this._busca.toLowerCase();
        lista = lista.filter(e =>
          (e.titulo || '').toLowerCase().includes(t) ||
          (e.descricao || '').toLowerCase().includes(t) ||
          (e.autores || '').toLowerCase().includes(t) ||
          (e.tags || []).some(tag => tag.toLowerCase().includes(t))
        );
      }

      // Ordena por ano (mais recente primeiro)
      lista.sort((a, b) => (b.ano || 0) - (a.ano || 0));

      this._atualizarContador(lista.length);

      if (lista.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding:30px 20px; color:#64748b;">
            <div style="font-size:32px; margin-bottom:8px;">📭</div>
            <div style="font-size:12px; font-weight:600;">Nenhum estudo encontrado</div>
            <div style="font-size:10.5px; margin-top:4px;">${this._busca || this._filtroCategoria !== 'TODOS' ? 'Tente ajustar os filtros' : 'Clique em "Adicionar Estudo" para começar'}</div>
          </div>
        `;
        return;
      }

      container.innerHTML = lista.map(e => this._renderizarCard(e)).join('');
    },

    _renderizarCard: function (estudo) {
      const corCat = {
        'VEN': { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', emoji: '🌊' },
        'TKU': { bg: '#ffedd5', border: '#fdba74', text: '#9a3412', emoji: '📦' },
        'Geral': { bg: '#e0e7ff', border: '#a5b4fc', text: '#3730a3', emoji: '📚' }
      }[estudo.categoria] || { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', emoji: '📄' };

      const tagsHTML = (estudo.tags || []).slice(0, 4).map(t =>
        `<span style="display:inline-block; background:#0f172a; color:#7dd3fc; font-size:9px; padding:2px 6px; border-radius:3px; margin-right:3px;">${window.Security.escapeHTML(t)}</span>`
      ).join('');

      const idEsc = window.Security.escapeHTML(estudo.id);

      return `
        <div class="estudo-card" data-categoria="${window.Security.escapeHTML(estudo.categoria || 'Geral')}"
             style="background:linear-gradient(135deg, ${corCat.bg} 0%, #fff 100%); border:1px solid ${corCat.border}; border-radius:8px; padding:12px 14px; margin-bottom:10px; transition:all 0.15s ease;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
              <span style="font-size:20px; flex-shrink:0;">${corCat.emoji}</span>
              <div style="min-width:0; flex:1;">
                <div style="font-size:12.5px; font-weight:800; color:#0f172a; line-height:1.3; word-break:break-word;">
                  ${window.Security.escapeHTML(estudo.titulo)}
                </div>
                <div style="font-size:10px; color:${corCat.text}; margin-top:3px; font-weight:600;">
                  <span style="background:${corCat.border}55; padding:1px 6px; border-radius:3px; font-size:9.5px; text-transform:uppercase; letter-spacing:0.4px;">${window.Security.escapeHTML(estudo.categoria || 'Geral')}</span>
                  ${estudo.ano ? `<span style="margin-left:6px;">📅 ${estudo.ano}</span>` : ''}
                  ${estudo.autores ? `<span style="margin-left:6px;">👥 ${window.Security.escapeHTML(estudo.autores)}</span>` : ''}
                </div>
              </div>
            </div>
          </div>

          ${estudo.descricao ? `
            <p style="font-size:11px; color:#475569; line-height:1.5; margin:0 0 8px 0;">
              ${window.Security.escapeHTML(estudo.descricao)}
            </p>
          ` : ''}

          ${tagsHTML ? `<div style="margin-bottom:8px;">${tagsHTML}</div>` : ''}

          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button type="button" onclick="EstudosManager.abrirPDF('${idEsc}')"
                    style="flex:1; min-width:120px; background:${corCat.text}; color:#fff; border:none; padding:6px 10px; border-radius:5px; font-size:10.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">
              📄 Abrir PDF
            </button>
            <button type="button" onclick="EstudosManager.baixarPDF('${idEsc}')"
                    style="background:#fff; color:${corCat.text}; border:1px solid ${corCat.border}; padding:6px 10px; border-radius:5px; font-size:10.5px; font-weight:700; cursor:pointer;">
              ⬇️ Baixar
            </button>
            ${estudo._local ? `
              <button type="button" onclick="EstudosManager.removerEstudo('${idEsc}')"
                      title="Remover (só em sessão local)"
                      style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; padding:6px 10px; border-radius:5px; font-size:10.5px; font-weight:700; cursor:pointer;">
                🗑️
              </button>
            ` : ''}
          </div>

          ${estudo.processo ? `
            <div style="font-size:9.5px; color:#64748b; margin-top:6px; font-family:Consolas,monospace;">
              📎 ${window.Security.escapeHTML(estudo.processo)}
            </div>
          ` : ''}
        </div>
      `;
    },

    _atualizarContador: function (n) {
      const el = document.getElementById('estudos-contador');
      if (el) el.textContent = `${n} estudo${n !== 1 ? 's' : ''}`;
    },

    /* ============================================================
       AÇÕES
       ============================================================ */
    abrirPDF: function (id) {
      const estudo = this._estudos.find(e => e.id === id);
      if (!estudo) return;

      // ✅ Tipo 1: link externo (gov.br, SEI, etc)
      if (estudo.tipo === 'externo' && estudo.url) {
        window.open(estudo.url, '_blank', 'noopener');
        if (window.UI) window.UI.toast('🔗 Abrindo link externo...');
        return;
      }

      // ✅ Tipo 2: upload local na sessão atual
      if (estudo._blobUrl) {
        window.open(estudo._blobUrl, '_blank');
        return;
      }

      // ✅ Tipo 3: PDF no repo (docs/estudos/xxx.pdf)
      if (estudo.arquivo) {
        window.open(estudo.arquivo, '_blank');
        return;
      }

      if (window.UI) window.UI.toast('⚠️ Arquivo não disponível nesta sessão. Publique em docs/estudos/ para acesso permanente.');
    },

    baixarPDF: function (id) {
      const estudo = this._estudos.find(e => e.id === id);
      if (!estudo) return;

      let url, nome;

      if (estudo.tipo === 'externo' && estudo.url) {
        url = estudo.url;
        nome = url.split('/').pop() || `${estudo.id}.pdf`;
      } else if (estudo._blobUrl) {
        url = estudo._blobUrl;
        nome = estudo._fileName || `${estudo.id}.pdf`;
      } else if (estudo.arquivo) {
        url = estudo.arquivo;
        nome = url.split('/').pop();
      } else {
        if (window.UI) window.UI.toast('⚠️ Arquivo não disponível.');
        return;
      }

      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (window.UI) window.UI.toast('⬇️ Download iniciado.');
    },

    removerEstudo: function (id) {
      if (!confirm('Remover este estudo da sessão local?')) return;

      this._estudos = this._estudos.filter(e => e.id !== id);

      // Salva de volta no localStorage
      const paraSalvar = this._estudos.filter(e => e._local).map(e => ({
        id: e.id,
        titulo: e.titulo,
        categoria: e.categoria,
        ano: e.ano,
        autores: e.autores,
        descricao: e.descricao,
        tags: e.tags,
        processo: e.processo,
        _local: true
      }));
      try { localStorage.setItem(this._storageKey, JSON.stringify(paraSalvar)); } catch (e) {}

      this.renderizar();
      if (window.UI) window.UI.toast('🗑️ Estudo removido.');
    },

    /* ============================================================
       FILTROS
       ============================================================ */
    filtrarPorCategoria: function (cat) {
      this._filtroCategoria = cat;
      // Atualiza botões
      document.querySelectorAll('[data-estudo-cat]').forEach(btn => {
        btn.classList.toggle('ativo', btn.dataset.estudoCat === cat);
      });
      this.renderizar();
    },

    buscar: function (termo) {
      this._busca = termo || '';
      this.renderizar();
    },

    /* ============================================================
       INICIALIZAÇÃO
       ============================================================ */
    init: function () {
      // Reagir quando o usuário abrir a aba "Estudos"
      window.addEventListener('tabmudou', async (e) => {
        if (e.detail.aba !== 'analise') return;
        // Só renderiza se a aba interna for "relatorios"
        setTimeout(() => {
          const abaRel = document.getElementById('aba-relatorios');
          if (abaRel && abaRel.style.display !== 'none') {
            this.renderizar();
          }
        }, 200);
      });

      // Primeira renderização (quando a aba Estudos abrir)
      const btnRel = document.getElementById('tab-btn-relatorios');
      if (btnRel) {
        btnRel.addEventListener('click', () => setTimeout(() => this.renderizar(), 100));
      }
    },  
    /* ============================================================
       M13 — MODAL DE ADICIONAR ESTUDO
       ============================================================ */

    abrirModalAdicionar: function () {
      const modal = document.getElementById('modal-estudo');
      if (!modal) {
        console.error('[M13] Modal #modal-estudo não encontrado');
        if (window.UI) window.UI.toast('⚠️ Modal de adicionar estudo indisponível.');
        return;
      }

      // Reset do formulário
      const campos = ['estudo-titulo', 'estudo-autores', 'estudo-descricao', 'estudo-tags', 'estudo-processo', 'estudo-url'];
      campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      const inpAno = document.getElementById('estudo-ano');
      if (inpAno) inpAno.value = new Date().getFullYear();
      const inpArq = document.getElementById('estudo-arquivo');
      if (inpArq) inpArq.value = '';
      const preview = document.getElementById('estudo-arquivo-preview');
      if (preview) preview.innerHTML = '';

      // Reset do radio
      const radioExterno = document.querySelector('input[name="estudo-fonte"][value="externo"]');
      if (radioExterno) radioExterno.checked = true;
      this.mudarFonte('externo');

      // Validação de arquivo
      if (inpArq && !inpArq._listener) {
        inpArq.addEventListener('change', () => this._previewArquivo());
        inpArq._listener = true;
      }

      modal.classList.add('aberto');
      setTimeout(() => document.getElementById('estudo-titulo')?.focus(), 100);
    },

    fecharModalAdicionar: function () {
      const modal = document.getElementById('modal-estudo');
      if (modal) modal.classList.remove('aberto');
    },

    mudarFonte: function (tipo) {
      const campoExterno = document.getElementById('estudo-fonte-externo-campo');
      const campoLocal = document.getElementById('estudo-fonte-local-campo');

      if (campoExterno) campoExterno.style.display = (tipo === 'externo') ? '' : 'none';
      if (campoLocal) campoLocal.style.display = (tipo === 'local') ? '' : 'none';
    },

    _previewArquivo: function () {
      const inp = document.getElementById('estudo-arquivo');
      const preview = document.getElementById('estudo-arquivo-preview');
      if (!inp || !preview) return;

      const file = inp.files?.[0];
      if (!file) { preview.innerHTML = ''; return; }

      const tamanhoMB = file.size / (1024 * 1024);
      const excede = tamanhoMB > 50;

      preview.innerHTML = `
        <div style="background:${excede ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}; border-left:3px solid ${excede ? '#ef4444' : '#10b981'}; border-radius:4px; padding:6px 10px; font-size:10.5px; color:${excede ? '#fecaca' : '#a7f3d0'};">
          ${excede ? '⚠️' : '✅'} <strong>${window.Security.escapeHTML(file.name)}</strong> · ${tamanhoMB.toFixed(1)} MB
          ${excede ? '<br>Arquivo maior que 50MB — use link externo' : ''}
        </div>
      `;
    },

    salvarEstudo: function () {
      const titulo = document.getElementById('estudo-titulo')?.value.trim();
      const categoria = document.getElementById('estudo-categoria')?.value || 'Geral';
      const ano = parseInt(document.getElementById('estudo-ano')?.value, 10) || new Date().getFullYear();
      const autores = document.getElementById('estudo-autores')?.value.trim() || '';
      const descricao = document.getElementById('estudo-descricao')?.value.trim() || '';
      const processo = document.getElementById('estudo-processo')?.value.trim() || '';
      const tagsRaw = document.getElementById('estudo-tags')?.value.trim() || '';
      const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

      const fonte = document.querySelector('input[name="estudo-fonte"]:checked')?.value || 'externo';

      // Validação
      if (!titulo) {
        if (window.UI) window.UI.toast('⚠️ Informe o título do estudo.');
        return;
      }

      const id = `est_${Date.now()}_${window.LayerRegistry?.gerarId?.(titulo) || titulo.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

      const estudo = {
        id,
        titulo,
        categoria,
        ano,
        autores,
        descricao,
        tags,
        processo,
        publicado: new Date().toISOString().slice(0, 10),
        _local: true
      };

      if (fonte === 'externo') {
        const url = document.getElementById('estudo-url')?.value.trim();
        if (!url) {
          if (window.UI) window.UI.toast('⚠️ Informe a URL do arquivo.');
          return;
        }
        estudo.tipo = 'externo';
        estudo.url = url;
      } else {
        const inp = document.getElementById('estudo-arquivo');
        const file = inp?.files?.[0];
        if (!file) {
          if (window.UI) window.UI.toast('⚠️ Selecione um arquivo PDF ou ZIP.');
          return;
        }
        if (file.size > 50 * 1024 * 1024) {
          if (window.UI) window.UI.toast('⚠️ Arquivo maior que 50MB. Use link externo.');
          return;
        }
        estudo.tipo = 'local';
        estudo.arquivo = `docs/estudos/${id}.pdf`;
        estudo._fileName = file.name;
        estudo._size = file.size;

        // Cria blob URL pra abrir na sessão
        try {
          estudo._blobUrl = URL.createObjectURL(file);
        } catch (e) {}
      }

      // Adiciona à lista em memória
      this._estudos.push(estudo);

      // Persiste no localStorage (sem o blob URL, que não sobrevive)
      const paraSalvar = this._estudos
        .filter(e => e._local)
        .map(e => ({
          id: e.id,
          titulo: e.titulo,
          categoria: e.categoria,
          ano: e.ano,
          autores: e.autores,
          descricao: e.descricao,
          tags: e.tags,
          processo: e.processo,
          publicado: e.publicado,
          tipo: e.tipo,
          url: e.url,
          arquivo: e.arquivo,
          _local: true
        }));
      try { localStorage.setItem(this._storageKey, JSON.stringify(paraSalvar)); } catch (e) {}

      // Atualiza UI
      this.fecharModalAdicionar();
      this.renderizar();

      if (window.UI) {
        window.UI.toast(`✅ Estudo "${window.Security.escapeHTML(titulo)}" adicionado.`);
      }
    },
  };

  window.EstudosManager = EstudosManager;
  console.info('[js] EstudosManager carregado (M13)');
})();
/* --- FIM: js/domain/estudos-manager.js --- */


/* --- INÍCIO: js/domain/navegacao-estrategica.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: NavegacaoEstrategica
   Escopo: navegação executiva por corredores estratégicos (Arco Norte,
           Tietê-Paraná, Rio Paraguai, Santos) e modo apresentação.
   Dependências: window.mapa, window.UI, window.DataManager, window.CAMADAS_MAPA
   Expõe: window.NavegacaoEstrategica
   ============================================================ */
(function () {
  'use strict';

  const CORREDORES = {
    'arco-norte': {
      nome: 'Arco Norte (Bacia Amazônica)',
      subtitulo: 'Barcarena, Santarém, Rio Madeira e Manaus',
      centro: [-2.9, -55.5],
      zoom: 6,
      camadasRecomendadas: ['ven_2024', 'instalacoes_portuarias'],
      descricao: '🚢 Arco Norte: Corredor hidroviário estratégico para escoamento de grãos e cabotagem'
    },
    'tiete-parana': {
      nome: 'Hidrovia Tietê-Paraná',
      subtitulo: 'Eixo multimodal SP / MS / PR / GO',
      centro: [-21.2, -50.8],
      zoom: 7,
      camadasRecomendadas: ['ven_2024'],
      descricao: '🌾 Hidrovia Tietê-Paraná: Eixo hidroviário de alta integração intermodal'
    },
    'rio-paraguai': {
      nome: 'Corredor do Rio Paraguai',
      subtitulo: 'Corumbá, Ladário e Porto Murtinho',
      centro: [-19.2, -57.6],
      zoom: 7,
      camadasRecomendadas: ['ven_2024', 'instalacoes_portuarias'],
      descricao: '⛰️ Rio Paraguai: Corredor de minério de ferro, manganês e grãos'
    },
    'santos': {
      nome: 'Complexo Portuário de Santos',
      subtitulo: 'Baixada Santista e Terminais Arrendados/TUP',
      centro: [-23.96, -46.30],
      zoom: 12,
      camadasRecomendadas: ['instalacoes_portuarias'],
      descricao: '⚓ Santos: Maior complexo portuário do Hemisfério Sul'
    },
    'brasil': {
      nome: 'Visão Nacional Completa',
      subtitulo: 'Malha hidroviária e portuária brasileira',
      centro: [-14.235, -51.925],
      zoom: 4,
      camadasRecomendadas: [],
      descricao: '🇧🇷 Panorama Nacional: 14 camadas regulatórias da ANTAQ'
    }
  };

  const NavegacaoEstrategica = {
    _modoApresentacaoAtivo: false,

    toggleMenu: function (ev) {
      if (ev) ev.stopPropagation();
      const menu = document.getElementById('dropdown-corredores');
      if (!menu) return;
      const aberto = menu.style.display === 'block';
      menu.style.display = aberto ? 'none' : 'block';
    },

    fecharMenu: function () {
      const menu = document.getElementById('dropdown-corredores');
      if (menu) menu.style.display = 'none';
    },

    voarPara: function (idCorredor) {
      this.fecharMenu();
      const c = CORREDORES[idCorredor];
      if (!c || !window.mapa) return;

      // 1. Voa suavemente até o centro do corredor
      window.mapa.flyTo(c.centro, c.zoom, {
        animate: true,
        duration: 1.6,
        easeLinearity: 0.25
      });

      // 2. Garante que as camadas estratégicas estejam ativas
      if (Array.isArray(c.camadasRecomendadas)) {
        c.camadasRecomendadas.forEach(idCamada => {
          if (window.CAMADAS_MAPA && !window.CAMADAS_MAPA[idCamada]) {
            if (typeof window.toggleCamada === 'function') {
              try { window.toggleCamada(idCamada); } catch (e) {}
            }
          }
        });
      }

      // 3. Feedback executivo discreto
      if (window.UI && typeof window.UI.toast === 'function') {
        window.UI.toast(c.descricao);
      }
    },

    toggleModoApresentacao: function () {
      this._modoApresentacaoAtivo = !this._modoApresentacaoAtivo;
      document.body.classList.toggle('modo-apresentacao', this._modoApresentacaoAtivo);

      const btn = document.getElementById('btn-modo-apresentacao');
      const ico = document.getElementById('ico-apresentacao');
      const painel = document.getElementById('painel-camadas-lateral');

      if (this._modoApresentacaoAtivo) {
        if (btn) btn.style.background = '#0284c7';
        if (ico) ico.textContent = '📺';

        // Recolhe o painel lateral para foco no mapa
        if (painel && !painel.classList.contains('recolhido')) {
          painel.classList.add('recolhido');
          document.body.classList.add('painel-lateral-recolhido');
        }

        // Tenta tela cheia se suportado e permitido
        try {
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } catch (e) {}

        if (window.UI) {
          window.UI.toast('🖥️ Modo Apresentação Ativado — Foco no mapa e telão executivo.');
        }
      } else {
        if (btn) btn.style.background = '#1e293b';
        if (ico) ico.textContent = '🖥️';

        if (painel && painel.classList.contains('recolhido')) {
          painel.classList.remove('recolhido');
          document.body.classList.remove('painel-lateral-recolhido');
        }

        try {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } catch (e) {}

        if (window.UI) {
          window.UI.toast('Modo Apresentação desativado.');
        }
      }

      // Reajusta o mapa Leaflet
      setTimeout(() => {
        if (window.mapa && window.mapa.invalidateSize) {
          window.mapa.invalidateSize();
        }
      }, 300);
    }
  };

  // Fecha o dropdown ao clicar fora
  document.addEventListener('click', (ev) => {
    const container = document.querySelector('.menu-corredores-container');
    if (container && !container.contains(ev.target)) {
      NavegacaoEstrategica.fecharMenu();
    }
  });

  // Atalho F10 para alternar Modo Apresentação
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'F10') {
      ev.preventDefault();
      NavegacaoEstrategica.toggleModoApresentacao();
    }
  });

  window.NavegacaoEstrategica = NavegacaoEstrategica;
  console.info('[js] NavegacaoEstrategica carregado');
})();
/* --- FIM: js/domain/navegacao-estrategica.js --- */
