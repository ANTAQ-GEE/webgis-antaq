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
/* ============================================================
   WebGIS ANTAQ — Módulo: PortClassification
   Escopo: classificação de instalações portuárias por esfera/regime
           regulatório (Lei nº 12.815/2013) + separação de Portos
           Internacionais (Longo Curso)
   Expõe: window.PortClassification, window.classificarEsfera
   ============================================================ */
(function () {
  'use strict';

  const PortClassification = {
    tipos: {
      ORGANIZADO:    { id: 'ORGANIZADO',    nome: 'Porto Organizado',                     cor: '#dc2626', padraoAtivo: true  },
      ARRENDAMENTO:  { id: 'ARRENDAMENTO',  nome: 'Terminal Arrendado',                   cor: '#ea580c', padraoAtivo: true  },
      TUP:           { id: 'TUP',           nome: 'Terminal de Uso Privado (TUP)',        cor: '#9333ea', padraoAtivo: true  },
      ETC:           { id: 'ETC',           nome: 'Estação de Transbordo (ETC)',          cor: '#ca8a04', padraoAtivo: true  },
      IPT:           { id: 'IPT',           nome: 'Instalação de Turismo (IPT)',          cor: '#0284c7', padraoAtivo: true  },
      IP4:           { id: 'IP4',           nome: 'Pequeno Porte (IP4)',                  cor: '#16a34a', padraoAtivo: true  },
      REGISTRO:      { id: 'REGISTRO',      nome: 'Instalação Registrada / Estaleiro',    cor: '#0d9488', padraoAtivo: true  },
      PUBLICO:       { id: 'PUBLICO',       nome: 'Porto Público / Hidroviário',          cor: '#2563eb', padraoAtivo: true  },
      INTERNACIONAL: { id: 'INTERNACIONAL', nome: 'Porto Internacional (Longo Curso)',    cor: '#475569', padraoAtivo: false },
      OUTROS:        { id: 'OUTROS',        nome: 'Outras Instalações / Apoio',           cor: '#64748b', padraoAtivo: true  }
    },

    classificar: function (props) {
      if (!props) return this.tipos.OUTROS;
      const texto = `${props.tipo || ''} ${props.subtipo || ''} ${props.modalidade || ''} ${props.nome || ''} ${props.instalacao || ''}`.toUpperCase();
      const limpo = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (limpo.includes('INTERNACIONAL')) return this.tipos.INTERNACIONAL;
      if (limpo.includes('ORGANIZADO') || limpo.includes('POLIGONAL')) return this.tipos.ORGANIZADO;
      if (limpo.includes('ARRENDAMENTO') || limpo.includes('ARRENDADO')) return this.tipos.ARRENDAMENTO;
      if (limpo.includes('TUP') || limpo.includes('USO PRIVADO') || limpo.includes('PRIVADO')) return this.tipos.TUP;
      if (limpo.includes('ETC') || limpo.includes('TRANSBORDO')) return this.tipos.ETC;
      if (limpo.includes('IPT') || limpo.includes('TURISMO') || limpo.includes('PASSAGEIRO')) return this.tipos.IPT;
      if (limpo.includes('IP4') || limpo.includes('PEQUENO PORTE')) return this.tipos.IP4;
      if (limpo.includes('REGISTRAD') || limpo.includes('ESTALEIRO') || limpo.includes('REGISTRO')) return this.tipos.REGISTRO;
      if (limpo.includes('PUBLICO')) return this.tipos.PUBLICO;

      return this.tipos.OUTROS;
    }
  };

  function classificarEsfera(props) {
    if (!props) return 'Não Informada';
    const texto = JSON.stringify(props).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (
      texto.includes('PRIVAD') ||
      texto.includes('TUP') ||
      texto.includes('ARRENDAMENTO') ||
      texto.includes('ESTALEIRO') ||
      texto.includes('REGISTRAD') ||
      texto.includes('ETC') ||
      texto.includes('IPT') ||
      texto.includes('TERMINAL DE USO PRIVADO') ||
      texto.includes('AUTORIZACAO') ||
      texto.includes('CONTRATO DE ADESAO')
    ) {
      return 'Privada';
    }

    if (
      texto.includes('PUBLIC') ||
      texto.includes('ORGANIZADO') ||
      texto.includes('IP4') ||
      texto.includes('DNIT') ||
      texto.includes('FEDERAL') ||
      texto.includes('ESTADUAL') ||
      texto.includes('MUNICIPAL') ||
      texto.includes('COMPANHIA DOCAS') ||
      texto.includes('PORTO PUBLICO') ||
      texto.includes('DELEGADO') ||
      texto.includes('UNIAO')
    ) {
      return 'Pública';
    }

    return 'Não Informada';
  }

  window.PortClassification = PortClassification;
  window.classificarEsfera = classificarEsfera;

  console.info('[js] PortClassification carregado (Portos Internacionais separados de Portos Nacionais)');
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

        const masterCluster = CAMADAS_MAPA['instalacoes_portuarias'];

        for (const [tKey, sub] of Object.entries(window.SUBGRUPOS_PORTOS)) {
          const chkSub = document.getElementById(`chk-sub-${tKey}`);
          const deveLigar = (valor === 'TODOS' || tKey === valor);
          if (chkSub) chkSub.checked = deveLigar;

          if (masterCluster) {
            if (deveLigar) {
              const aAdicionar = [];
              sub.eachLayer(m => {
                if (!masterCluster.hasLayer(m)) aAdicionar.push(m);
                if (m.getLatLng) latlngsVisiveis.push(m.getLatLng());
              });
              if (aAdicionar.length > 0) {
                if (typeof masterCluster.addLayers === 'function') masterCluster.addLayers(aAdicionar);
                else aAdicionar.forEach(m => masterCluster.addLayer(m));
              }
              visiveis += sub.getLayers().length;
            } else {
              const aRemover = [];
              sub.eachLayer(m => {
                if (masterCluster.hasLayer(m)) aRemover.push(m);
              });
              if (aRemover.length > 0) {
                if (typeof masterCluster.removeLayers === 'function') masterCluster.removeLayers(aRemover);
                else aRemover.forEach(m => masterCluster.removeLayer(m));
              }
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

  function normalizar(texto) {
    if (!texto) return '';
    return String(texto)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  const SearchEngine = {
    debounceTimer: null,

    _resolverCamadaDeDados: function (idCamada) {
      if (idCamada === 'ven') {
        const selSub = document.getElementById('filtro-subtipo-dinamico');
        if (selSub && selSub.value && selSub.value.startsWith('ven_')) {
          return selSub.value;
        }
        return (window.VENUnifiedManager && window.VENUnifiedManager.anoAtivo)
          ? window.VENUnifiedManager.anoAtivo
          : 'ven_2024';
      }
      return idCamada;
    },

    _gerarRotulo: function (f, idCamada) {
      const p = f.properties || {};
      const id = idCamada || '';

      // Vias Navegadas (VEN)
      if (id.startsWith('ven_') || id === 'ven') {
        const nomeHidrovia = p.nome || 'Hidrovia';
        const rio = p.nome_rio || p.NOME_RIO || '';
        const orig = p.mun_origem || p.municipio_origem || '';
        const dest = p.mun_estino || p.mun_destino || p.municipio_destino || '';
        let od = '';
        if (orig || dest) {
          od = ` · ${orig || '—'} → ${dest || '—'}`;
        }
        if (rio) {
          return `${nomeHidrovia} (${rio})${od}`;
        }
        return `${nomeHidrovia}${od}`;
      }

      // Instalações Portuárias
      if (id === 'instalacoes_portuarias') {
        const nome = p.nome || p.NOME_INSTALACAO || p.nome_instalacao || 'Instalação Portuária';
        const mun = p.municipio || p.MUNICIPIO || p.mun_origem || '';
        const uf = p.uf || p.UF || p.sigla_uf || p.SIGLA_UF || '';
        const loc = (mun || uf) ? ` (${mun}${mun && uf ? '/' : ''}${uf})` : '';
        return `${nome}${loc}`;
      }

      // Travessias
      if (id.includes('travess')) {
        const nome = p.nom_vessia || p.nome_travessia || p.nome || 'Travessia';
        const mun = p.municipio || p.mun_origem || '';
        return `${nome}${mun ? ` (${mun})` : ''}`;
      }

      // Unidades de Conservação / Terras Indígenas
      if (p.NOME_UC || p.nome_uc) return `UC · ${p.NOME_UC || p.nome_uc}`;
      if (p.terrai_nom) return `TI · ${p.terrai_nom}`;

      // Rodovias / Ferrovias
      if (p.snv || p.vl_codigo) return `Trecho ${p.snv || p.vl_codigo}${p.nome ? ' · ' + p.nome : ''}`;

      // Padrão genérico
      const generico = p.nome || p.NOME || p.descricao || p.DESCRICAO || p.sigla_uf || p.SIGLA_UF || '';
      if (generico) return String(generico);

      // Fallback para primeiro valor alfanumérico não-geométrico
      for (const [k, v] of Object.entries(p)) {
        if (['geom', 'geometry', 'id', 'gid', 'objectid', '_gpkgtable'].includes(k.toLowerCase())) continue;
        if (v && typeof v === 'string' && v.trim().length > 1) {
          return `${k}: ${v.trim()}`;
        }
      }
      return 'Feição ' + (p.id || p.gid || '');
    },

    onInput: function (val) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.filtrar(val), 180);
    },

    filtrar: async function (termo) {
      const listaEl = document.getElementById('resultados-busca');
      if (!listaEl) return;

      if (!termo || termo.trim().length < 1) {
        listaEl.style.display = 'none';
        listaEl.innerHTML = '';
        return;
      }

      const idCamadaVirtual = document.getElementById('sel-camada-busca')?.value || 'instalacoes_portuarias';
      const termoNorm = normalizar(termo);
      const matches = [];

      // Caso 1: Busca em TODAS as camadas visíveis
      if (idCamadaVirtual === 'TODAS_VISIVEIS') {
        const camadasAlvo = [];
        for (const [id, layer] of Object.entries(window.CAMADAS_MAPA || {})) {
          if (window.mapa && window.mapa.hasLayer(layer)) {
            camadasAlvo.push(id);
          }
        }

        for (const idC of camadasAlvo) {
          const fc = window.DADOS_GEOJSON_BRUTOS?.[idC];
          if (!fc || !fc.features) continue;

          for (const f of fc.features) {
            if (matches.length >= 10) break;
            const p = f.properties || {};
            let achou = false;

            for (const [k, v] of Object.entries(p)) {
              if (['geom', 'geometry', 'id', 'gid', 'objectid', '_gpkgtable'].includes(k.toLowerCase())) continue;
              if (v !== undefined && v !== null && normalizar(v).includes(termoNorm)) {
                achou = true;
                break;
              }
            }

            if (achou) {
              const rotulo = this._gerarRotulo(f, idC);
              const nomeCamada = window.CONFIG_CAMADAS?.[idC]?.nome || idC;
              matches.push({
                nome: rotulo,
                subtitulo: nomeCamada,
                feature: f,
                camadaId: idC
              });
            }
          }
          if (matches.length >= 10) break;
        }
      }
      // Caso 2: Busca na camada selecionada
      else {
        const idCamada = this._resolverCamadaDeDados(idCamadaVirtual);
        let geojson = window.DADOS_GEOJSON_BRUTOS?.[idCamada];

        // Se a camada não estiver carregada na memória, carrega sob demanda
        if (!geojson || !geojson.features?.length) {
          if (window.DataManager && typeof window.DataManager.carregarCamada === 'function') {
            try {
              listaEl.innerHTML = '<div class="item-resultado" style="color:#38bdf8;">⏳ Carregando dados da camada…</div>';
              listaEl.style.display = 'block';
              geojson = await window.DataManager.carregarCamada(idCamada);
            } catch (e) {
              console.warn('[SearchEngine] Falha ao carregar camada sob demanda:', e);
            }
          }
        }

        if (geojson && geojson.features) {
          for (const f of geojson.features) {
            if (matches.length >= 10) break;
            const p = f.properties || {};
            let achou = false;

            for (const [k, v] of Object.entries(p)) {
              if (['geom', 'geometry', 'id', 'gid', 'objectid', '_gpkgtable'].includes(k.toLowerCase())) continue;
              if (v !== undefined && v !== null && normalizar(v).includes(termoNorm)) {
                achou = true;
                break;
              }
            }

            if (achou) {
              const rotulo = this._gerarRotulo(f, idCamada);
              matches.push({
                nome: rotulo,
                subtitulo: '',
                feature: f,
                camadaId: idCamada
              });
            }
          }
        }
      }

      listaEl.innerHTML = '';
      if (matches.length === 0) {
        listaEl.innerHTML = '<div class="item-resultado" style="color:#94a3b8;">Nenhum ativo localizado.</div>';
      } else {
        matches.slice(0, 8).forEach(m => {
          const d = document.createElement('div');
          d.className = 'item-resultado';
          d.style.display = 'flex';
          d.style.flexDirection = 'column';
          d.style.gap = '2px';

          const titulo = document.createElement('span');
          titulo.innerText = m.nome;
          titulo.style.fontWeight = '600';
          titulo.style.color = '#f1f5f9';
          d.appendChild(titulo);

          if (m.subtitulo) {
            const sub = document.createElement('span');
            sub.innerText = m.subtitulo;
            sub.style.fontSize = '10px';
            sub.style.color = '#38bdf8';
            d.appendChild(sub);
          }

          d.onclick = () => {
            const inp = document.getElementById('input-busca');
            if (inp) inp.value = m.nome;
            listaEl.style.display = 'none';
            this.aproximar(m.feature, m.camadaId);
          };
          listaEl.appendChild(d);
        });
      }
      listaEl.style.display = 'block';
    },

    aproximar: function (feature, camadaId) {
      if (window.CopilotoIA) window.CopilotoIA.ultimoAtivoInspecionado = feature;
      if (window.CAMADA_DESTAQUE && window.mapa) {
        try { window.mapa.removeLayer(window.CAMADA_DESTAQUE); } catch (e) {}
      }

      const idAtualVirtual = document.getElementById('sel-camada-busca')?.value || 'instalacoes_portuarias';
      const idAtual = camadaId || this._resolverCamadaDeDados(idAtualVirtual);

      window.CAMADA_DESTAQUE = L.geoJSON(feature, {
        style: { color: '#f59e0b', weight: 6, opacity: 0.95, fillOpacity: 0.5 },
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {
          radius: 12,
          fillColor: '#f59e0b',
          color: '#ffffff',
          weight: 3,
          fillOpacity: 1
        })
      }).addTo(window.mapa);

      try {
        const bounds = window.CAMADA_DESTAQUE.getBounds();
        if (bounds.isValid()) {
          if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
            window.mapa.flyTo(bounds.getCenter(), 14, { animate: true, duration: 1.2 });
          } else {
            window.mapa.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
          }
        }
      } catch (e) { /* ignora */ }

      if (window.PopupRenderer && typeof window.PopupRenderer.gerar === 'function') {
        const popupHtml = window.PopupRenderer.gerar(idAtual, feature.properties);
        window.CAMADA_DESTAQUE.bindPopup(popupHtml).openPopup();
      }
    },

    executar: async function () {
      const inp = document.getElementById('input-busca');
      const v = (inp ? inp.value : '').trim();
      if (!v) {
        if (window.UI) window.UI.toast("Digite o nome ou código de um ativo para aproximar.");
        return;
      }

      const idCamadaVirtual = document.getElementById('sel-camada-busca')?.value || 'instalacoes_portuarias';
      const idCamada = this._resolverCamadaDeDados(idCamadaVirtual);
      let geojson = window.DADOS_GEOJSON_BRUTOS?.[idCamada];

      if (!geojson || !geojson.features?.length) {
        if (window.DataManager && typeof window.DataManager.carregarCamada === 'function') {
          if (window.UI) window.UI.toast(`⏳ Carregando dados de ${idCamada}...`);
          try {
            geojson = await window.DataManager.carregarCamada(idCamada);
          } catch (e) {}
        }
      }

      if (!geojson || !geojson.features) {
        if (window.UI) window.UI.toast("Aguarde o carregamento dos dados da camada.");
        return;
      }

      const termoNorm = normalizar(v);
      let matchExato = null;
      let primeiroMatch = null;

      for (const f of geojson.features) {
        const p = f.properties || {};
        for (const [k, val] of Object.entries(p)) {
          if (['geom', 'geometry', 'id', 'gid', 'objectid', '_gpkgtable'].includes(k.toLowerCase())) continue;
          const strNorm = normalizar(val);
          if (strNorm === termoNorm) {
            matchExato = f;
            break;
          }
          if (!primeiroMatch && strNorm.includes(termoNorm)) {
            primeiroMatch = f;
          }
        }
        if (matchExato) break;
      }

      const alvo = matchExato || primeiroMatch;

      if (alvo) {
        const listaEl = document.getElementById('resultados-busca');
        if (listaEl) listaEl.style.display = 'none';
        this.aproximar(alvo, idCamada);
        const p = alvo.properties || {};
        const rotulo = this._gerarRotulo(alvo, idCamada);
        if (window.UI) window.UI.toast(`📍 Zoom realizado em: ${rotulo}`);
      } else {
        // Busca global em outras camadas carregadas
        let achouOutro = null;
        for (const [idOutro, g] of Object.entries(window.DADOS_GEOJSON_BRUTOS || {})) {
          if (g && g.features) {
            for (const f of g.features) {
              const p = f.properties || {};
              for (const [k, val] of Object.entries(p)) {
                if (['geom', 'geometry', 'id', 'gid', 'objectid', '_gpkgtable'].includes(k.toLowerCase())) continue;
                if (normalizar(val).includes(termoNorm)) {
                  achouOutro = { feature: f, camada: idOutro };
                  break;
                }
              }
              if (achouOutro) break;
            }
          }
          if (achouOutro) break;
        }

        if (achouOutro) {
          const selCam = document.getElementById('sel-camada-busca');
          if (selCam) {
            selCam.value = achouOutro.camada;
            if (window.FilterManager && typeof window.FilterManager.aoMudarCamada === 'function') {
              window.FilterManager.aoMudarCamada(achouOutro.camada);
            }
          }
          const listaEl = document.getElementById('resultados-busca');
          if (listaEl) listaEl.style.display = 'none';
          this.aproximar(achouOutro.feature, achouOutro.camada);
          const nomeC = window.CONFIG_CAMADAS?.[achouOutro.camada]?.nome || achouOutro.camada;
          if (window.UI) window.UI.toast(`📍 Ativo localizado na camada [${nomeC}].`);
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

      // Prioridade 1: Indexa feições selecionadas em SelectionManager
      if (window.SelectionManager && Array.isArray(window.SelectionManager._selecionadas) && window.SelectionManager._selecionadas.length > 0) {
        for (const item of window.SelectionManager._selecionadas) {
          const f = item.feature;
          const id = item.camadaId || 'selecao';
          if (f && f.geometry) {
            this._extrairVerticesDeFeature(f, id);
          }
        }
      }

      // Prioridade 2: Indexa camadas visíveis no viewport atual
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

    _extrairVerticesDeFeature: function (f, camadaId) {
      if (!f || !f.geometry || !f.geometry.coordinates) return;
      const type = f.geometry.type;
      const coords = f.geometry.coordinates;

      if (type === 'Point') {
        if (coords.length >= 2) this._adicionarVertice({ lat: coords[1], lng: coords[0] }, camadaId);
      } else if (type === 'MultiPoint' || type === 'LineString') {
        for (const pt of coords) {
          if (pt && pt.length >= 2) this._adicionarVertice({ lat: pt[1], lng: pt[0] }, camadaId);
        }
      } else if (type === 'MultiLineString' || type === 'Polygon') {
        for (const ring of coords) {
          if (Array.isArray(ring)) {
            for (const pt of ring) {
              if (pt && pt.length >= 2) this._adicionarVertice({ lat: pt[1], lng: pt[0] }, camadaId);
            }
          }
        }
      } else if (type === 'MultiPolygon') {
        for (const poly of coords) {
          if (Array.isArray(poly)) {
            for (const ring of poly) {
              if (Array.isArray(ring)) {
                for (const pt of ring) {
                  if (pt && pt.length >= 2) this._adicionarVertice({ lat: pt[1], lng: pt[0] }, camadaId);
                }
              }
            }
          }
        }
      }
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

      if (!this._moveendListener && window.mapa) {
        this._moveendListener = () => {
          if (this._snapAtivo && this.modo) {
            clearTimeout(this._snapRebuildTimer);
            this._snapRebuildTimer = setTimeout(() => this._construirGridSnap(), 250);
          }
        };
        window.mapa.on('moveend zoomend', this._moveendListener);
      }

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

      if (this._moveendListener && window.mapa) {
        window.mapa.off('moveend zoomend', this._moveendListener);
        this._moveendListener = null;
      }

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
        const snap = this._encontrarSnap(e.latlng, screenPoint, 18);
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
        mapa.getPane('paneSelecao').style.zIndex = 580;
        mapa.getPane('paneSelecao').style.pointerEvents = 'none';
        this._paneCriado = true;
      }

      if (mapa.boxZoom) mapa.boxZoom.disable();
      this._configurarRectSelection();
      this._configurarTeclado();
      console.info('[M2] Seleção múltipla pronta. Ctrl+Clique ou Shift+Arrastar.');
    },

    selecionarUnica: function (feature, camadaId) {
      const chave = this._chaveDe(feature, camadaId);
      this._selecionadas = [{ feature, camadaId, chaveUnica: chave }];
      this._atualizarUI();
    },

    toggle: function (feature, camadaId, manterPopup) {
      if (!manterPopup && window.mapa && window.mapa.closePopup) {
        window.mapa.closePopup();
      }

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

      // ✅ Mantém sincronizado com o snap da ferramenta de medição
      if (window.MeasurementTool && window.MeasurementTool._snapAtivo && typeof window.MeasurementTool._construirGridSnap === 'function') {
        window.MeasurementTool._construirGridSnap();
      }
    },

    _atualizarHighlight: function () {
      if (this._highlightLayer) {
        try {
          if (mapa.hasLayer(this._highlightLayer)) mapa.removeLayer(this._highlightLayer);
        } catch (e) { console.warn('[M2] Erro ao remover highlight:', e); }
        this._highlightLayer = null;
      }

      if (!this._selecionadas.length) return;

      let pane = mapa.getPane('paneSelecao');
      if (!pane) {
        pane = mapa.createPane('paneSelecao');
      }
      if (pane) {
        pane.style.zIndex = 580;
        pane.style.pointerEvents = 'none';
      }

      try {
        if (!this._svgRenderer) {
          this._svgRenderer = L.svg({ pane: 'paneSelecao', padding: 0.5 });
        }
        const fc = {
          type: 'FeatureCollection',
          features: this._selecionadas.map(s => s.feature)
        };
        this._highlightLayer = L.geoJSON(fc, {
          pane: 'paneSelecao',
          renderer: this._svgRenderer,
          interactive: false,
          bubblingMouseEvents: false,
          style: {
            pane: 'paneSelecao',
            renderer: this._svgRenderer,
            interactive: false,
            color: '#f59e0b',
            weight: 3,
            opacity: 0.95,
            fillColor: '#f59e0b',
            fillOpacity: 0,
            dashArray: null
          },
          pointToLayer: (f, latlng) => L.circleMarker(latlng, {
            pane: 'paneSelecao',
            renderer: this._svgRenderer,
            interactive: false,
            bubblingMouseEvents: false,
            radius: 9,
            color: '#f59e0b',
            weight: 3,
            fillColor: '#fbbf24',
            fillOpacity: 0.45
          })
        }).addTo(mapa);

        if (pane) {
          pane.style.zIndex = 580;
          pane.style.pointerEvents = 'none';
          pane.querySelectorAll('*').forEach(el => {
            el.style.pointerEvents = 'none';
            if (el.classList && el.classList.contains('leaflet-interactive')) {
              el.classList.remove('leaflet-interactive');
            }
          });
        }
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
   Escopo: geoprocessamento (intersecção, diferença, união, pontos em polígono)
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

      // Radios visuais controlam o select oculto E forçam refresh do preview
      document.querySelectorAll('input[name="geo-op"]').forEach(radio => {
        if (radio._geoListeners) return;
        radio.addEventListener('change', (e) => {
          if (selOp) selOp.value = e.target.value;
          setTimeout(() => this._atualizarPreview(), 10);
        });
        radio._geoListeners = true;
      });

      // Click nos labels dos radios também garante seleção e dispara preview
      document.querySelectorAll('.geo-op-opcao').forEach(label => {
        if (label._geoLabelListeners) return;
        label.addEventListener('click', () => {
          const radio = label.querySelector('input[name="geo-op"]');
          if (radio) {
            radio.checked = true;
            if (selOp) selOp.value = radio.value;
          }
          setTimeout(() => this._atualizarPreview(), 10);
        });
        label._geoLabelListeners = true;
      });

      const chkDis = document.getElementById('geo-dissolve');
      if (chkDis && !chkDis._geoListeners) {
        chkDis.addEventListener('change', () => this._atualizarPreview());
        chkDis._geoListeners = true;
      }

      // Fechamento amigável pelo backdrop e tecla ESC
      const modal = document.getElementById('modal-geo');
      if (modal && !modal._backdropListener) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.fecharModal();
        });
        modal._backdropListener = true;
      }
      if (!this._escListener) {
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            const m = document.getElementById('modal-geo');
            if (m && m.classList.contains('aberto')) this.fecharModal();
          }
        });
        this._escListener = true;
      }
    },

    _popularSelects: function () {
      const selA = document.getElementById('geo-camada-a');
      const selB = document.getElementById('geo-camada-b');
      if (!selA || !selB) return;

      const candidatas = [];
      const config = window.CONFIG_CAMADAS || {};
      const brutos = window.DADOS_GEOJSON_BRUTOS || {};

      for (const [id, cfg] of Object.entries(config)) {
        if (id.startsWith('geo_')) continue; // Permite usar camadas de Buffer e Importadas no Geoprocessamento!

        const carregada = brutos[id]?.features?.length || 0;
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
      const checkedRadio = document.querySelector('input[name="geo-op"]:checked');
      const op = checkedRadio?.value || selOp?.value || 'intersecao';
      if (selOp && selOp.value !== op) selOp.value = op;

      const chkDis = document.getElementById('geo-dissolve');
      if (chkDis) {
        if (op === 'pontos_em') {
          chkDis.disabled = true;
          chkDis.checked = false;
          if (chkDis.parentElement) chkDis.parentElement.style.opacity = '0.5';
        } else {
          chkDis.disabled = false;
          if (chkDis.parentElement) chkDis.parentElement.style.opacity = '1';
        }
      }

      if (!idA || !idB) {
        preview.innerHTML = '<em style="color:#64748b;">Selecione duas camadas.</em>';
        return;
      }
      if (idA === idB) {
        preview.innerHTML = '<em style="color:#f59e0b;">⚠️ Selecione camadas diferentes para A e B.</em>';
        return;
      }

      const brutos = window.DADOS_GEOJSON_BRUTOS || {};
      const config = window.CONFIG_CAMADAS || {};
      const nA = brutos[idA]?.features?.length || 0;
      const nB = brutos[idB]?.features?.length || 0;
      const nomeA = config[idA]?.nome || idA;
      const nomeB = config[idB]?.nome || idB;

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

      const inferirTipo = (id) => {
        if (brutos[id]?.features?.length && this._detectarTipoGeom) {
          const t = this._detectarTipoGeom(brutos[id].features);
          if (t && t !== 'desconhecido') return t;
        }
        const cfg = config[id];
        if (cfg?.tipoGeo) {
          const tg = String(cfg.tipoGeo).toLowerCase();
          if (tg.includes('ponto')) return 'ponto';
          if (tg.includes('linha')) return 'linha';
          if (tg.includes('poli')) return 'poligono';
        }
        return 'desconhecido';
      };

      const tipoA = inferirTipo(idA);
      const tipoB = inferirTipo(idB);
      const tipoLabel = { ponto: 'pontos', linha: 'linhas', poligono: 'polígonos', desconhecido: '?' };

      let avisoTipo = '';
      if (op === 'pontos_em') {
        const valido = (tipoA === 'ponto' && tipoB === 'poligono') || (tipoA === 'poligono' && tipoB === 'ponto');
        if (!valido && tipoA !== 'desconhecido' && tipoB !== 'desconhecido') {
          avisoTipo = `<div style="margin-top:8px;padding:6px 10px;background:rgba(239,68,68,0.15);border-left:3px solid #ef4444;border-radius:4px;font-size:10.5px;color:#fca5a5;">
            ⚠️ <strong>Combinação inválida.</strong> Esta operação precisa de <strong>pontos × polígonos</strong>.
            Você tem ${tipoLabel[tipoA] || '?'} × ${tipoLabel[tipoB] || '?'}.
          </div>`;
        } else {
          avisoTipo = `<div style="margin-top:8px;padding:6px 10px;background:rgba(16,185,129,0.15);border-left:3px solid #10b981;border-radius:4px;font-size:10.5px;color:#a7f3d0;">
            ✅ <strong>Compatível.</strong> ${tipoLabel[tipoA] || '?'} em ${tipoLabel[tipoB] || '?'}.
          </div>`;
        }
      } else if (op === 'intersecao') {
        if ((tipoA === 'ponto') !== (tipoB === 'ponto') && tipoA !== 'desconhecido' && tipoB !== 'desconhecido') {
          avisoTipo = `<div style="margin-top:8px;padding:6px 10px;background:rgba(245,158,11,0.15);border-left:3px solid #f59e0b;border-radius:4px;font-size:10.5px;color:#fde68a;">
            ℹ️ Ponto × não-ponto: utilize <strong>🎯 Pontos em</strong> se desejar filtrar pontos contidos em polígonos.
          </div>`;
        }
      }

      const tiposTexto = `<div style="font-size:10px;color:#64748b;margin-bottom:6px;">
        A: <strong>${tipoLabel[tipoA] || '?'}</strong> · B: <strong>${tipoLabel[tipoB] || '?'}</strong>
      </div>`;

      const escape = (val) => (window.Security && window.Security.escapeHTML) ? window.Security.escapeHTML(val) : String(val ?? '');

      preview.innerHTML = `
        <div style="font-size:11.5px;color:#cbd5e1;line-height:1.5;">
          <div style="font-weight:700;color:#fbbf24;margin-bottom:6px;">${nomeOp}</div>
          ${tiposTexto}
          <div>
            <strong style="color:#38bdf8;">${carregadaA ? nA.toLocaleString('pt-BR') : '?'}</strong>
            feições de <span style="color:#e2e8f0;">${escape(nomeA)}</span>
            ${!carregadaA ? '<span style="color:#f59e0b;"> (será carregada)</span>' : ''}
          </div>
          <div>
            <strong style="color:#38bdf8;">${carregadaB ? nB.toLocaleString('pt-BR') : '?'}</strong>
            feições de <span style="color:#e2e8f0;">${escape(nomeB)}</span>
            ${!carregadaB ? '<span style="color:#f59e0b;"> (será carregada)</span>' : ''}
          </div>
          ${(carregadaA && carregadaB) ? `
            <div style="margin-top:8px;font-size:10.5px;color:#64748b;">
              Pares a testar: <strong>${pares.toLocaleString('pt-BR')}</strong>
              ${pesado ? '<span style="color:#f59e0b;"> — otimizado com bounding box</span>' : ''}
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
      const checkedRadio = document.querySelector('input[name="geo-op"]:checked');
      const op = checkedRadio?.value || selOp?.value || 'intersecao';
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

      const brutos = window.DADOS_GEOJSON_BRUTOS || {};
      const config = window.CONFIG_CAMADAS || {};

      // Carrega camadas sob demanda
      try {
        if (!brutos[idA]?.features?.length) {
          if (window.UI) window.UI.toast(`⏳ Carregando ${config[idA]?.nome || idA}...`);
          if (window.DataManager && window.DataManager.carregarCamada) {
            await window.DataManager.carregarCamada(idA);
          }
        }
        if (!brutos[idB]?.features?.length) {
          if (window.UI) window.UI.toast(`⏳ Carregando ${config[idB]?.nome || idB}...`);
          if (window.DataManager && window.DataManager.carregarCamada) {
            await window.DataManager.carregarCamada(idB);
          }
        }
      } catch (e) {
        console.error('[M10] Falha ao carregar camadas:', e);
      }

      const dadosA = brutos[idA];
      const dadosB = brutos[idB];
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

        // Dissolve só é aplicável para polígonos resultantes de interseção/diferença
        if (dissolve && resultadoFeatures.length > 1 && op !== 'uniao' && op !== 'pontos_em') {
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
      const featsA = (dadosA.features || []).filter(f => f && f.geometry);
      const featsB = (dadosB.features || []).filter(f => f && f.geometry);
      let processados = 0;

      // Pré-calcula Bounding Box de B
      const bComBbox = [];
      for (const fB of featsB) {
        let bbox = null;
        if (typeof turf !== 'undefined' && turf.bbox) {
          try { bbox = turf.bbox(fB); } catch (e) {}
        }
        let bounds = null;
        if (typeof L !== 'undefined' && L.geoJSON) {
          try { bounds = L.geoJSON(fB).getBounds(); } catch (e) {}
        }
        bComBbox.push({ feature: fB, bbox, bounds: (bounds && bounds.isValid()) ? bounds : null });
      }

      for (const fA of featsA) {
        let bboxA = null;
        if (typeof turf !== 'undefined' && turf.bbox) {
          try { bboxA = turf.bbox(fA); } catch (e) {}
        }
        let boundsA = null;
        if (typeof L !== 'undefined' && L.geoJSON) {
          try { boundsA = L.geoJSON(fA).getBounds(); } catch (e) {}
        }
        if (!boundsA || !boundsA.isValid()) continue;

        for (const itemB of bComBbox) {
          const { feature: fB, bbox: bboxB, bounds: boundsB } = itemB;
          if (bboxA && bboxB) {
            if (bboxA[2] < bboxB[0] || bboxA[0] > bboxB[2] || bboxA[3] < bboxB[1] || bboxA[1] > bboxB[3]) continue;
          } else if (boundsB) {
            if (!boundsA.intersects(boundsB)) continue;
          }

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
              const coordA = fA.geometry.coordinates;
              if (turf.booleanPointInPolygon(coordA, fB) || turf.booleanPointInPolygon(fA, fB)) {
                intersec = JSON.parse(JSON.stringify(fA));
              }
            }
            // Caso 3: Polígono × Ponto
            else if (tipoA.includes('Polygon') && tipoB.includes('Point')) {
              const coordB = fB.geometry.coordinates;
              if (turf.booleanPointInPolygon(coordB, fA) || turf.booleanPointInPolygon(fB, fA)) {
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
        }

        processados++;
        if (processados % 100 === 0) await new Promise(r => setTimeout(r, 0));
      }

      return resultado;
    },

    /* ---------- Diferença (A - B) ---------- */
    _processarDiferenca: async function (dadosA, dadosB) {
      const resultado = [];
      const featsA = (dadosA.features || []).filter(f => f && f.geometry);
      const featsB = (dadosB.features || []).filter(f => f && f.geometry);
      let processados = 0;

      const bComBbox = [];
      for (const fB of featsB) {
        let bbox = null;
        if (typeof turf !== 'undefined' && turf.bbox) {
          try { bbox = turf.bbox(fB); } catch (e) {}
        }
        let bounds = null;
        if (typeof L !== 'undefined' && L.geoJSON) {
          try { bounds = L.geoJSON(fB).getBounds(); } catch (e) {}
        }
        bComBbox.push({ feature: fB, bbox, bounds: (bounds && bounds.isValid()) ? bounds : null });
      }

      for (const fA of featsA) {
        let atual = fA;
        let bboxA = null;
        if (typeof turf !== 'undefined' && turf.bbox) {
          try { bboxA = turf.bbox(fA); } catch (e) {}
        }
        let boundsA = null;
        if (typeof L !== 'undefined' && L.geoJSON) {
          try { boundsA = L.geoJSON(fA).getBounds(); } catch (e) {}
        }
        if (!boundsA || !boundsA.isValid()) continue;

        let sofreuRecorte = false;

        for (const itemB of bComBbox) {
          const { feature: fB, bbox: bboxB, bounds: boundsB } = itemB;
          if (bboxA && bboxB) {
            if (bboxA[2] < bboxB[0] || bboxA[0] > bboxB[2] || bboxA[3] < bboxB[1] || bboxA[1] > bboxB[3]) continue;
          } else if (boundsB) {
            if (!boundsA.intersects(boundsB)) continue;
          }

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

        processados++;
        if (processados % 100 === 0) await new Promise(r => setTimeout(r, 0));
      }

      return resultado;
    },

    /* ---------- Detecção de tipo geométrico ---------- */
    _detectarTipoGeom: function (features) {
      if (!Array.isArray(features) || !features.length) return 'desconhecido';
      const counts = { ponto: 0, linha: 0, poligono: 0 };
      const lim = Math.min(50, features.length);
      for (let i = 0; i < lim; i++) {
        const t = features[i]?.geometry?.type || '';
        if (t.includes('Point')) counts.ponto++;
        else if (t.includes('LineString')) counts.linha++;
        else if (t.includes('Polygon')) counts.poligono++;
      }
      if (counts.ponto > 0 && counts.ponto >= counts.linha && counts.ponto >= counts.poligono) return 'ponto';
      if (counts.linha > 0 && counts.linha >= counts.poligono) return 'linha';
      if (counts.poligono > 0) return 'poligono';
      return 'desconhecido';
    },

    /* ---------- Pontos em Polígono (spatial join) ---------- */
    _processarPontosEm: async function (dadosA, dadosB) {
      const tipoA = this._detectarTipoGeom(dadosA.features);
      const tipoB = this._detectarTipoGeom(dadosB.features);

      console.info(`[M10] pontos_em: A=${tipoA}, B=${tipoB}`);

      let pontos, poligonos, invertido = false;

      if (tipoA === 'ponto' && (tipoB === 'poligono' || tipoB === 'desconhecido')) {
        pontos = (dadosA.features || []).filter(f => f && f.geometry);
        poligonos = (dadosB.features || []).filter(f => f && f.geometry);
      } else if (tipoB === 'ponto' && (tipoA === 'poligono' || tipoA === 'desconhecido')) {
        pontos = (dadosB.features || []).filter(f => f && f.geometry);
        poligonos = (dadosA.features || []).filter(f => f && f.geometry);
        invertido = true;
      } else {
        throw new Error(`Combinação incompatível (A=${tipoA} × B=${tipoB}). Preciso de ponto × polígono.`);
      }

      // Pré-calcula bounding boxes dos polígonos
      const polysComBbox = [];
      for (const poly of poligonos) {
        if (!poly || !poly.geometry) continue;
        try {
          let bbox = null;
          if (typeof turf !== 'undefined' && turf.bbox) {
            try { bbox = turf.bbox(poly); } catch (e) {}
          }
          let bounds = null;
          if (typeof L !== 'undefined' && L.geoJSON) {
            try { bounds = L.geoJSON(poly).getBounds(); } catch (e) {}
          }
          polysComBbox.push({
            feature: poly,
            bbox: bbox,
            bounds: (bounds && bounds.isValid()) ? bounds : null
          });
        } catch (e) { /* ignora */ }
      }

      console.info(`[M10] ${pontos.length} pontos × ${polysComBbox.length} polígonos preparados com bbox`);

      const resultado = [];
      let processados = 0;

      for (const p of pontos) {
        processados++;
        if (processados % 100 === 0) await new Promise(r => setTimeout(r, 0));

        let pontoGeo;
        try {
          if (p.geometry?.type === 'Point') {
            pontoGeo = p.geometry;
          } else if (p.geometry?.type === 'MultiPoint' && p.geometry.coordinates?.length > 0) {
            pontoGeo = { type: 'Point', coordinates: p.geometry.coordinates[0] };
          } else {
            continue;
          }
        } catch (e) { continue; }

        if (!pontoGeo || !Array.isArray(pontoGeo.coordinates) || pontoGeo.coordinates.length < 2) continue;

        const lng = pontoGeo.coordinates[0];
        const lat = pontoGeo.coordinates[1];
        if (isNaN(lat) || isNaN(lng)) continue;
        const ptLatLng = (typeof L !== 'undefined') ? L.latLng(lat, lng) : null;

        let contenedor = null;

        for (const item of polysComBbox) {
          const { feature, bbox, bounds } = item;
          // BBox numérico rápido: [minLng, minLat, maxLng, maxLat]
          if (bbox) {
            if (lng < bbox[0] || lat < bbox[1] || lng > bbox[2] || lat > bbox[3]) continue;
          } else if (bounds && ptLatLng) {
            if (!bounds.contains(ptLatLng)) continue;
          }

          try {
            if (turf.booleanPointInPolygon([lng, lat], feature) || turf.booleanPointInPolygon(pontoGeo, feature)) {
              contenedor = feature;
              break;
            }
          } catch (e) { /* ignora */ }
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
      const todas = [...(dadosA.features || []), ...(dadosB.features || [])].filter(f => f && f.geometry);
      if (!todas.length) return [];
      let acumulado = todas[0];

      for (let i = 1; i < todas.length; i++) {
        const f = todas[i];
        try {
          const u = turf.union(acumulado, f);
          if (u) acumulado = u;
        } catch (e) { /* ignora */ }

        if (i % 20 === 0) await new Promise(r => setTimeout(r, 0));
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
      const validas = (features || []).filter(f => f && f.geometry);
      if (!validas.length) return features;
      let acumulado = validas[0];

      for (let i = 1; i < validas.length; i++) {
        try {
          const u = turf.union(acumulado, validas[i]);
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
      const config = window.CONFIG_CAMADAS || {};
      const brutos = window.DADOS_GEOJSON_BRUTOS || {};
      const camadasMapa = window.CAMADAS_MAPA || {};

      const nomeA = config[idA]?.nome || idA;
      const nomeB = config[idB]?.nome || idB;
      const opsNomes = { intersecao: '∩', diferenca: '−', uniao: '∪', pontos_em: '🎯' };
      const opSimbolo = opsNomes[op] || op;
      const nome = `Geo ${opSimbolo} · ${nomeA.split(' ')[0]} × ${nomeB.split(' ')[0]}${dissolve ? ' (unificado)' : ''}`;
      const id = `geo_${Date.now()}_${op}_${idA}_${idB}`;

      const cor = (window.LayerRegistry && typeof window.LayerRegistry.corAleatoria === 'function')
        ? window.LayerRegistry.corAleatoria()
        : '#a855f7';

      // Salva dados GeoJSON
      const geojson = { type: 'FeatureCollection', features };
      brutos[id] = geojson;

      let tipoGeo = (op === 'pontos_em') ? 'ponto' : 'poligono';
      if (window.GeomTypeDetector && typeof window.GeomTypeDetector.detectar === 'function') {
        try {
          tipoGeo = window.GeomTypeDetector.detectar(geojson) || tipoGeo;
        } catch (e) { /* fallback */ }
      }

      config[id] = {
        nome: nome,
        grupo: 'importadas',
        arquivos: [],
        cor: cor,
        opacidade: 0.4,
        peso: 2,
        tipoGeo: tipoGeo,
        ativa: true,
        camposVisiveis: [],
        _isGeo: true,
        _operacao: op
      };

      // Garante panes dedicadas no Leaflet de forma segura
      if (window.mapa && typeof window.mapa.createPane === 'function') {
        let pBuf = window.mapa.getPane && window.mapa.getPane('paneBuffer');
        if (!pBuf) {
          pBuf = window.mapa.createPane('paneBuffer');
        }
        if (pBuf && pBuf.style) {
          pBuf.style.zIndex = 650;
          pBuf.style.pointerEvents = 'auto';
        }

        let pPts = window.mapa.getPane && window.mapa.getPane('panePontos');
        if (!pPts) {
          pPts = window.mapa.createPane('panePontos');
        }
        if (pPts && pPts.style) {
          pPts.style.zIndex = 600;
          pPts.style.pointerEvents = 'auto';
        }
      }

      camadasMapa[id] = L.geoJSON(geojson, {
        pane: (tipoGeo === 'ponto') ? 'panePontos' : 'paneBuffer',
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
        // Pontos viram círculos destacados
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {
          pane: 'panePontos',
          radius: 7,
          color: '#ffffff',
          weight: 2,
          fillColor: cor,
          fillOpacity: 0.95
        }),
        onEachFeature: (f, layer) => {
          const p = f.properties || {};
          const escape = (val) => (window.Security && window.Security.escapeHTML) ? window.Security.escapeHTML(val) : String(val ?? '');
          const linhas = Object.entries(p)
            .filter(([k]) => !['geom','geometry'].includes(k.toLowerCase()))
            .slice(0, 15)
            .map(([k, v]) =>
              `<div class="pop-linha"><span class="pop-lbl">${escape(k)}:</span><span class="pop-val">${escape(v)}</span></div>`
            ).join('');

          const html = `
            <div class="pop-topo">⚙️ Resultado Geoprocessamento</div>
            <div class="pop-corpo">${linhas || '<p style="color:#64748b;">Sem atributos.</p>'}</div>
            <div class="pop-rodape-auditoria">
              <span>${opSimbolo} ${escape(nomeA.slice(0, 20))} × ${escape(nomeB.slice(0, 20))}</span>
              <span>Turf.js</span>
            </div>
          `;
          layer.bindPopup(html);
        }
      });

      if (window.mapa) {
        camadasMapa[id].addTo(window.mapa);
      }

      const grupoEl = document.getElementById('grupo-importadas');
      const msgVazio = document.getElementById('msg-sem-importadas');
      if (msgVazio) msgVazio.style.display = 'none';

      if (grupoEl) {
        grupoEl.classList.remove('fechado');
        if (typeof window.construirItemCamada === 'function') {
          window.construirItemCamada(id, config[id], grupoEl);
        }
        const cntBadge = document.getElementById(`cnt-${id}`);
        if (cntBadge) cntBadge.innerText = `(${features.length})`;

        setTimeout(() => {
          const item = document.getElementById(`item-camada-${id}`);
          if (item) {
            item.style.display = 'flex';
            const painelCorpo = document.querySelector('#painel-camadas-lateral .painel-corpo') || grupoEl;
            if (painelCorpo && item.offsetTop) painelCorpo.scrollTop = item.offsetTop;
          }
        }, 50);
      }

      try {
        if (camadasMapa[id] && window.mapa) {
          const bounds = camadasMapa[id].getBounds();
          if (bounds && bounds.isValid()) {
            window.mapa.fitBounds(bounds, { padding: [40, 40] });
          }
        }
      } catch (e) { /* ignora */ }

      if (window.Styler && typeof window.Styler.atualizarStyle === 'function') window.Styler.atualizarStyle();
      if (window.Styler && typeof window.Styler.atualizarLegenda === 'function') window.Styler.atualizarLegenda();
      if (window.FilterManager && typeof window.FilterManager.atualizarSeletorCamadas === 'function') window.FilterManager.atualizarSeletorCamadas();
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

/* ============================================================
   WebGIS Corporativo ANTAQ — Módulo: RelatorioExecutivoPDF
   Escopo: Geração de Nota Técnica e Dossiê Executivo de Geointeligência
           no padrão SEI/ANTAQ (GEE/SEPH - Resolução nº 116/2024 e
           Lei nº 12.815/2013), com carregamento automático sob demanda
           de Terras Indígenas (FUNAI) e Unidades de Conservação (ICMBio),
           cruzamento poligonal exato e exportação nativa A4 para PDF.
   Expõe: window.RelatorioExecutivoPDF
   ============================================================ */
(function () {
  'use strict';

  const RelatorioExecutivoPDF = {
    gerarNotaTecnica: async function (opcoes = {}) {
      const escopo = opcoes.escopo || 'auto';
      const selecionadas = (window.SelectionManager && Array.isArray(window.SelectionManager._selecionadas))
        ? window.SelectionManager._selecionadas
        : [];

      const usarSelecao = (escopo === 'selecao') || (escopo === 'auto' && selecionadas.length > 0);

      // Abre a janela sincronamente no evento de clique para evitar bloqueador de pop-up
      const win = window.open('', '_blank', 'width=1080,height=880,scrollbars=yes');
      if (!win) {
        if (window.UI && typeof window.UI.toast === 'function') {
          window.UI.toast('⚠️ Permita pop-ups no navegador para abrir a Nota Técnica A4.', 'erro');
        } else {
          alert('Permita pop-ups no navegador para abrir a Nota Técnica para impressão/PDF.');
        }
        return;
      }

      // Tela de carregamento imediata enquanto garante as poligonais de TIs e UCs
      win.document.open();
      win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Processando Nota Técnica ANTAQ...</title>
        <style>body{margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0a192f;color:#f8fafc;font-family:'Segoe UI',system-ui,sans-serif;text-align:center;padding:24px;}
        .box{max-width:480px;background:#0f2744;border:1px solid #0284c7;border-radius:12px;padding:28px 32px;box-shadow:0 20px 50px rgba(0,0,0,0.6);}
        .spin{font-size:36px;margin-bottom:12px;animation:p 1.2s infinite ease-in-out;}@keyframes p{0%,100%{transform:scale(1);}50%{transform:scale(1.18);}}</style></head>
        <body><div class="box"><div class="spin">🛰️</div><h3 style="margin:0 0 8px 0;color:#38bdf8;">Gerando Nota Técnica SEI/ANTAQ (GEE/SEPH)</h3>
        <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.5;">Carregando poligonais oficiais da <strong>FUNAI (Terras Indígenas)</strong> e do <strong>ICMBio (Unidades de Conservação)</strong> e executando o cruzamento geodésico das instalações...</p></div></body></html>`);
      win.document.close();

      try {
        await this._garantirCamadasRestricao();
        const dadosRelatorio = this._coletarDados(usarSelecao, selecionadas);
        const htmlNota = this._montarHTML(dadosRelatorio);

        win.document.open();
        win.document.write(htmlNota);
        win.document.close();

        if (window.UI && typeof window.UI.toast === 'function') {
          window.UI.toast('📄 Nota Técnica GEE/SEPH gerada com cruzamento socioambiental completo!', 'sucesso');
        }
      } catch (err) {
        console.error('[RelatorioExecutivoPDF] Erro ao gerar Nota Técnica:', err);
        if (window.UI && typeof window.UI.toast === 'function') {
          window.UI.toast('⚠️ Erro ao gerar Nota Técnica: ' + (err.message || err), 'erro');
        }
      }
    },

    _garantirCamadasRestricao: async function () {
      window.DADOS_GEOJSON_BRUTOS = window.DADOS_GEOJSON_BRUTOS || {};
      const camadasRestricao = [
        { id: 'tis_poligonais', urls: ['dados/tis_poligonais.geojson', './dados/tis_poligonais.geojson'] },
        { id: 'ucs_federais',   urls: ['dados/ucs_federais.geojson', './dados/ucs_federais.geojson'] }
      ];

      await Promise.allSettled(camadasRestricao.map(async (item) => {
        if (window.DADOS_GEOJSON_BRUTOS[item.id]?.features?.length > 0) return;

        // 1. Tenta via FetchManager / DataAdapter silenciosamente (sem precisar ligar a camada no mapa)
        for (const url of item.urls) {
          try {
            let gj = null;
            if (window.FetchManager && typeof window.FetchManager.fetchGeoJSON === 'function') {
              gj = await window.FetchManager.fetchGeoJSON(url, { timeoutMs: 20000, retries: 1 });
            } else {
              const r = await fetch(url);
              if (r.ok) gj = await r.json();
            }
            if (gj && Array.isArray(gj.features) && gj.features.length > 0) {
              window.DADOS_GEOJSON_BRUTOS[item.id] = gj;
              console.info(`[RelatorioExecutivoPDF] Base ${item.id} carregada em memória (${gj.features.length} poligonais).`);
              return;
            }
          } catch (_) {}
        }

        // 2. Fallback via DataManager.carregarCamada
        if (window.DataManager && typeof window.DataManager.carregarCamada === 'function') {
          try {
            await window.DataManager.carregarCamada(item.id);
          } catch (_) {}
        }
      }));
    },

    _extrairUFRobusta: function (p) {
      if (!p) return 'N/I';
      if (window.Security && typeof window.Security.extrairUF === 'function') {
        const u = window.Security.extrairUF(p);
        if (u) return u;
      }
      const raw = (p.uf || p.estado || p.sigla_uf || '').toString().toUpperCase().trim();
      return raw.length === 2 ? raw : 'N/I';
    },

    _coletarDados: function (usarSelecao, selecionadas) {
      const agora = new Date();
      const dataFormatada = agora.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
      const horaFormatada = agora.toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit'
      });

      const ufFiltro = document.getElementById('sel-uf-busca')?.value || 'TODAS';
      const camadaBusca = document.getElementById('sel-camada-busca')?.value || 'instalacoes_portuarias';
      const centroMapa = window.mapa ? window.mapa.getCenter() : { lat: -15.78, lng: -47.93 };
      const zoomMapa = window.mapa ? window.mapa.getZoom() : 4;

      let feicoesAlvo = [];
      let tituloEscopo = '';

      if (usarSelecao && selecionadas.length > 0) {
        feicoesAlvo = selecionadas.map(item => ({
          feature: item.feature,
          camadaId: item.camadaId || 'instalacoes_portuarias'
        }));
        tituloEscopo = `Recorte de Seleção Espacial Ativa (${feicoesAlvo.length.toLocaleString('pt-BR')} feições inspecionadas)`;
      } else {
        const brutosPortos = window.DADOS_GEOJSON_BRUTOS?.['instalacoes_portuarias']?.features || [];
        brutosPortos.forEach(f => {
          const cat = window.PortClassification ? window.PortClassification.classificar(f.properties) : { id: 'OUTROS' };
          const chkSub = document.getElementById(`chk-sub-${cat.id}`);
          const subAtivo = chkSub ? chkSub.checked : (cat.padraoAtivo !== false);
          if (!subAtivo) return;

          const ufProp = this._extrairUFRobusta(f.properties);
          if (ufFiltro && ufFiltro !== 'TODAS' && ufProp !== ufFiltro.toUpperCase()) {
            return;
          }
          feicoesAlvo.push({ feature: f, camadaId: 'instalacoes_portuarias' });
        });
        tituloEscopo = ufFiltro !== 'TODAS'
          ? `Inventário Portuário e Hidroviário — Recorte Estadual (${ufFiltro})`
          : `Inventário Nacional de Instalações Portuárias e Hidroviárias Ativas`;
      }

      const contagemRegime = {};
      const contagemEsfera = { 'Pública': 0, 'Privada': 0, 'Não Informada': 0 };
      const contagemUF = {};
      const itensDetalhados = [];

      feicoesAlvo.forEach((item, idx) => {
        const p = item.feature?.properties || {};
        const geom = item.feature?.geometry || {};
        const cat = window.PortClassification
          ? window.PortClassification.classificar(p)
          : { id: 'OUTROS', nome: p.tipo || 'Instalação', cor: '#64748b' };
        const esfera = window.classificarEsfera ? window.classificarEsfera(p) : 'Não Informada';
        const uf = (cat.id === 'INTERNACIONAL') ? 'EXT' : this._extrairUFRobusta(p);
        const nome = (window.Security && window.Security.repararTexto)
          ? window.Security.repararTexto(p.nome || p.instalacao || p.nm_instalacao || p.porto || p.hidrovia || `Feição #${idx + 1}`)
          : (p.nome || p.instalacao || p.nm_instalacao || p.porto || p.hidrovia || `Feição #${idx + 1}`);
        const municipio = (window.Security && window.Security.repararTexto)
          ? window.Security.repararTexto(p.municipio || p.nm_municipio || p.cidade || p.loc_izacao || '—')
          : (p.municipio || p.nm_municipio || p.cidade || p.loc_izacao || '—');

        contagemRegime[cat.nome] = (contagemRegime[cat.nome] || 0) + 1;
        contagemEsfera[esfera] = (contagemEsfera[esfera] || 0) + 1;
        if (uf !== 'EXT') {
          contagemUF[uf] = (contagemUF[uf] || 0) + 1;
        }

        let coordsStr = '—';
        if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
          coordsStr = `${Number(geom.coordinates[1]).toFixed(4)}°, ${Number(geom.coordinates[0]).toFixed(4)}°`;
        }

        if (itensDetalhados.length < 150) {
          itensDetalhados.push({
            ordem: idx + 1,
            nome: String(nome),
            regime: cat.nome,
            corRegime: cat.cor,
            esfera,
            municipio: String(municipio),
            uf,
            coordenadas: coordsStr
          });
        }
      });

      // Executa o cruzamento sobre TODAS as feições alvo contra TIs e UCs
      const analiseSocioambiental = this._avaliarProximidadeSocioambiental(feicoesAlvo);

      return {
        numeroNota: `${Math.floor(100 + Math.random() * 890)}/${agora.getFullYear()}/GEE/SEPH`,
        dataFormatada,
        horaFormatada,
        tituloEscopo,
        ufFiltro,
        camadaBusca,
        centroMapa,
        zoomMapa,
        totalFeicoes: feicoesAlvo.length,
        usarSelecao,
        contagemRegime,
        contagemEsfera,
        contagemUF,
        itensDetalhados,
        analiseSocioambiental
      };
    },

    _haversineKm: function (lon1, lat1, lon2, lat2) {
      const R = 6371.0;
      const toRad = Math.PI / 180;
      const dLat = (lat2 - lat1) * toRad;
      const dLon = (lon2 - lon1) * toRad;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
    },

    _indexarPoligonais: function (features, tipoRestricao) {
      const index = [];
      const reparar = (txt) => (window.Security && window.Security.repararTexto) ? window.Security.repararTexto(String(txt || '')) : String(txt || '');

      for (const f of features) {
        const geom = f?.geometry;
        if (!geom) continue;
        const allCoords = [];
        if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
          for (const ring of geom.coordinates) {
            if (Array.isArray(ring)) allCoords.push(...ring);
          }
        } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
          for (const poly of geom.coordinates) {
            if (Array.isArray(poly)) {
              for (const ring of poly) {
                if (Array.isArray(ring)) allCoords.push(...ring);
              }
            }
          }
        }
        if (allCoords.length === 0) continue;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let i = 0; i < allCoords.length; i++) {
          const x = allCoords[i][0], y = allCoords[i][1];
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }

        // Amostra até 250 vértices de borda para cálculo rápido e exato de distância à borda
        const step = Math.max(1, Math.floor(allCoords.length / 250));
        const sampled = [];
        for (let i = 0; i < allCoords.length; i += step) {
          sampled.push(allCoords[i]);
        }

        const p = f.properties || {};
        const nome = tipoRestricao === 'TI'
          ? reparar(p.terrai_nom || p.nome || p.nm_ti || 'Terra Indígena')
          : reparar(p.nome || p.nm_uc || p.nome_uc || p.ORIG_NAME || 'Unidade de Conservação');
        const detalhe = tipoRestricao === 'TI'
          ? reparar(`${p.etnia_nome ? 'Etnia ' + p.etnia_nome : ''}${p.fase_ti ? ' (' + p.fase_ti + ')' : ''}`.trim() || 'FUNAI')
          : reparar(p.categoria || p.grupo || p.esfera || 'ICMBio');
        const uf = p.uf_sigla || p.uf || '';

        index.push({
          feature: f,
          nome: uf ? `${nome} (${uf})` : nome,
          tipo: tipoRestricao === 'TI' ? 'Terra Indígena (FUNAI)' : 'Unidade de Conservação (ICMBio)',
          detalhe,
          // Buffer de ~16km em graus (0.16°) ao redor do Bounding Box
          bbox: [minX - 0.16, minY - 0.16, maxX + 0.16, maxY + 0.16],
          coords: sampled
        });
      }
      return index;
    },

    _avaliarProximidadeSocioambiental: function (feicoesAlvo) {
      const tis = window.DADOS_GEOJSON_BRUTOS?.['tis_poligonais']?.features || [];
      const ucs = window.DADOS_GEOJSON_BRUTOS?.['ucs_federais']?.features || [];

      const resultado = {
        tisCarregadas: tis.length,
        ucsCarregadas: ucs.length,
        totalAlertasTI: 0,
        totalAlertasUC: 0,
        totalSobreposicaoDireta: 0,
        alertasBuffer15km: []
      };

      if (tis.length === 0 && ucs.length === 0) return resultado;

      const idxTI = this._indexarPoligonais(tis, 'TI');
      const idxUC = this._indexarPoligonais(ucs, 'UC');
      const todosIndices = idxTI.concat(idxUC);
      const reparar = (txt) => (window.Security && window.Security.repararTexto) ? window.Security.repararTexto(String(txt || '')) : String(txt || '');

      const alertas = [];

      for (let i = 0; i < feicoesAlvo.length; i++) {
        const f = feicoesAlvo[i].feature;
        if (!f || !f.geometry || f.geometry.type !== 'Point' || !Array.isArray(f.geometry.coordinates)) continue;
        const lon = Number(f.geometry.coordinates[0]);
        const lat = Number(f.geometry.coordinates[1]);
        if (isNaN(lon) || isNaN(lat)) continue;

        const nomeAtivo = reparar(f.properties?.nome || f.properties?.instalacao || 'Ativo Portuário');
        const ufAtivo = this._extrairUFRobusta(f.properties);

        for (let j = 0; j < todosIndices.length; j++) {
          const poly = todosIndices[j];
          const b = poly.bbox;
          if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;

          // Verifica primeiro se está no interior exato da poligonal via Turf
          let dentro = false;
          if (window.turf && typeof window.turf.booleanPointInPolygon === 'function') {
            try {
              dentro = window.turf.booleanPointInPolygon([lon, lat], poly.feature);
            } catch (_) {}
          }

          let minDist = 0;
          if (!dentro) {
            minDist = Infinity;
            const coords = poly.coords;
            for (let k = 0; k < coords.length; k++) {
              const d = this._haversineKm(lon, lat, coords[k][0], coords[k][1]);
              if (d < minDist) minDist = d;
            }
          }

          if (dentro || minDist <= 15.0) {
            if (poly.tipo.includes('FUNAI')) resultado.totalAlertasTI++;
            else resultado.totalAlertasUC++;
            if (dentro || minDist < 0.5) resultado.totalSobreposicaoDireta++;

            alertas.push({
              ativo: ufAtivo !== 'N/I' ? `${nomeAtivo} (${ufAtivo})` : nomeAtivo,
              restricao: poly.nome,
              tipo: poly.tipo,
              detalhe: poly.detalhe,
              dentro,
              distanciaNum: dentro ? 0 : minDist,
              distanciaKm: dentro ? '0,00 km (Interior)' : `${minDist.toFixed(2).replace('.', ',')} km`
            });
          }
        }
      }

      alertas.sort((a, b) => a.distanciaNum - b.distanciaNum);
      resultado.alertasBuffer15km = alertas.slice(0, 45);
      return resultado;
    },

    _montarHTML: function (d) {
      const linhasRegime = Object.entries(d.contagemRegime)
        .sort((a, b) => b[1] - a[1])
        .map(([regime, qtd]) => {
          const perc = d.totalFeicoes > 0 ? ((qtd / d.totalFeicoes) * 100).toFixed(1) : '0.0';
          return `
            <tr>
              <td><strong>${regime}</strong></td>
              <td style="text-align:right; font-weight:700;">${qtd.toLocaleString('pt-BR')}</td>
              <td style="text-align:right;">${perc}%</td>
            </tr>`;
        }).join('');

      const topUFs = Object.entries(d.contagemUF)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([uf, qtd]) => `<span class="chip-uf"><strong>${uf}:</strong> ${qtd}</span>`)
        .join(' ');

      const linhasAtivos = d.itensDetalhados.map(it => `
        <tr>
          <td style="text-align:center;">${it.ordem}</td>
          <td><strong>${it.nome}</strong></td>
          <td><span class="dot" style="background:${it.corRegime};"></span>${it.regime}</td>
          <td>${it.esfera}</td>
          <td>${it.municipio}</td>
          <td style="text-align:center; font-weight:700;">${it.uf}</td>
          <td style="font-family:monospace; font-size:10px;">${it.coordenadas}</td>
        </tr>`).join('');

      const s = d.analiseSocioambiental;
      const totalAlertas = s.totalAlertasTI + s.totalAlertasUC;

      const blocoSocioambiental = totalAlertas > 0
        ? `<p class="paragrafo">
            3.2. O cruzamento espacial geodésico processou <strong>${s.tisCarregadas.toLocaleString('pt-BR')} Terras Indígenas (FUNAI)</strong> e <strong>${s.ucsCarregadas.toLocaleString('pt-BR')} Unidades de Conservação Federais (ICMBio)</strong>, identificando <strong>${totalAlertas} ocorrências</strong> na faixa de amortecimento de <strong>15 km</strong> (${s.totalAlertasTI} junto a Terras Indígenas e ${s.totalAlertasUC} junto a Unidades de Conservação, sendo <strong>${s.totalSobreposicaoDireta}</strong> em sobreposição direta ou faixa marginal imediata &le; 500 m). A tabela a seguir relaciona os ativos mais críticos ordenados pela menor distância à borda poligonal:
          </p>
          <table class="tabela-dados">
            <thead>
              <tr>
                <th>Ativo Portuário / Hidroviário</th>
                <th>Área Protegida Interceptada / Próxima</th>
                <th>Órgão / Tipologia</th>
                <th>Etnia / Categoria</th>
                <th style="text-align:right;">Distância à Poligonal</th>
              </tr>
            </thead>
            <tbody>
              ${s.alertasBuffer15km.map(a => `
                <tr>
                  <td><strong>${a.ativo}</strong></td>
                  <td>${a.restricao}</td>
                  <td>${a.tipo}</td>
                  <td>${a.detalhe || '—'}</td>
                  <td style="text-align:right; font-weight:700; color:${a.distanciaNum < 1 ? '#dc2626' : '#b45309'};">${a.distanciaKm}</td>
                </tr>`).join('')}
            </tbody>
          </table>`
        : `<p class="paragrafo">3.2. No recorte espacial avaliado contra <strong>${s.tisCarregadas.toLocaleString('pt-BR')} Terras Indígenas (FUNAI)</strong> e <strong>${s.ucsCarregadas.toLocaleString('pt-BR')} Unidades de Conservação Federais (ICMBio)</strong>, não foram detectadas interseções ou proximidades críticas na faixa de 15 km para as feições selecionadas.</p>`;

      return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nota Técnica nº ${d.numeroNota} — WebGIS ANTAQ</title>
  <style>
    @page { size: A4 portrait; margin: 18mm 15mm 18mm 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1e293b;
      background: #f1f5f9;
      margin: 0;
      padding: 24px;
      line-height: 1.55;
      font-size: 12px;
    }
    .barra-acoes {
      max-width: 210mm;
      margin: 0 auto 16px auto;
      background: #0a2540;
      color: #fff;
      padding: 12px 18px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .btn-acao {
      background: #0284c7;
      color: #fff;
      border: 1px solid #38bdf8;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-acao:hover { background: #0369a1; }
    .folha-a4 {
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 20mm 18mm;
      box-shadow: 0 6px 24px rgba(15, 23, 42, 0.12);
      border-radius: 4px;
    }
    .cabecalho-sei {
      border-bottom: 2px solid #0a2540;
      padding-bottom: 12px;
      margin-bottom: 18px;
      text-align: center;
    }
    .cabecalho-sei .orgao {
      font-size: 13px;
      font-weight: 800;
      color: #0a2540;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }
    .cabecalho-sei .suborgao {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      margin-top: 2px;
    }
    .bloco-identificacao {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #0a2540;
      padding: 10px 14px;
      margin-bottom: 18px;
      font-size: 11.5px;
    }
    h2.secao {
      font-size: 12.5px;
      font-weight: 800;
      color: #0a2540;
      text-transform: uppercase;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin: 20px 0 10px 0;
    }
    p.paragrafo {
      text-align: justify;
      margin: 6px 0 10px 0;
      color: #1e293b;
    }
    .grid-kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 12px 0 16px 0;
    }
    .card-kpi {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px;
      text-align: center;
    }
    .card-kpi .valor {
      font-size: 20px;
      font-weight: 800;
      color: #0a2540;
    }
    .card-kpi .rotulo {
      font-size: 10px;
      color: #475569;
      text-transform: uppercase;
      font-weight: 700;
      margin-top: 2px;
    }
    .tabela-dados {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 16px 0;
      font-size: 11px;
    }
    .tabela-dados th {
      background: #0a2540;
      color: #ffffff;
      text-align: left;
      padding: 6px 8px;
      font-weight: 700;
    }
    .tabela-dados td {
      padding: 5px 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    .tabela-dados tr:nth-child(even) td { background: #f8fafc; }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 5px;
    }
    .chip-uf {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 10.5px;
      margin: 2px;
    }
    .assinatura {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #cbd5e1;
      text-align: center;
      font-size: 11px;
      color: #334155;
    }
    @media (max-width: 768px) {
      body { padding: 8px; }
      .folha-a4 { padding: 14px; overflow-x: auto; }
      .grid-kpis { grid-template-columns: repeat(2, 1fr); }
    }
    @media print {
      body { background: #fff; padding: 0; }
      .barra-acoes { display: none !important; }
      .folha-a4 { box-shadow: none; padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="barra-acoes">
    <div>
      <strong>📄 NOTA TÉCNICA EXECUTIVA — PADRÃO SEI/ANTAQ (GEE/SEPH)</strong>
      <div style="font-size:11px; color:#bae6fd;">Documento formatado em folha A4 pronto para impressão ou exportação em PDF</div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="btn-acao" onclick="window.print()">🖨️ Imprimir / Salvar em PDF</button>
      <button class="btn-acao" style="background:#334155; border-color:#64748b;" onclick="window.close()">✕ Fechar</button>
    </div>
  </div>

  <div class="folha-a4">
    <div class="cabecalho-sei">
      <div class="orgao">Agência Nacional de Transportes Aquaviários — ANTAQ</div>
      <div class="suborgao">Superintendência de Estudos e Projetos Hidroviários (SEPH) · Gerência Especial de Estudos (GEE)</div>
    </div>

    <div class="bloco-identificacao">
      <div><strong>NOTA TÉCNICA Nº ${d.numeroNota}</strong></div>
      <div><strong>DATA DE EMISSÃO:</strong> ${d.dataFormatada} às ${d.horaFormatada} (Horário de Brasília)</div>
      <div><strong>ASSUNTO:</strong> Análise Georreferenciada de Instalações Portuárias, Regimes de Outorga e Diagnóstico Territorial (${d.tituloEscopo})</div>
      <div><strong>ENQUADRAMENTO ESPACIAL:</strong> Centro [${d.centroMapa.lat.toFixed(4)}°, ${d.centroMapa.lng.toFixed(4)}°] · Nível de Zoom ${d.zoomMapa} · Datum Oficial SIRGAS 2000 (EPSG:4674)</div>
    </div>

    <h2 class="secao">1. INTRODUÇÃO</h2>
    <p class="paragrafo">
      1.1. Esta Nota Técnica foi gerada automaticamente pelo módulo de Geointeligência do <strong>WebGIS Corporativo ANTAQ</strong>, em subsídio às atividades da Gerência Especial de Estudos (GEE), vinculada à Superintendência de Estudos e Projetos Hidroviários (SEPH), com o objetivo de consolidar o diagnóstico espacial e regulatório sobre o recorte: <strong>${d.tituloEscopo}</strong>.
    </p>
    <p class="paragrafo">
      1.2. Para a presente análise geoespacial foram considerados os seguintes marcos normativos e bases técnicas: Lei nº 10.233/2001; Lei nº 12.815/2013 (Marco Regulatório do Setor Portuário); Resolução ANTAQ nº 116/2024 (Regimento Interno — Art. 58, competências da GEE/SEPH); e a Agenda Plurianual de Estudos 2025-2028.
    </p>

    <h2 class="secao">2. SÍNTESE EXECUTIVA E REGIMES DE OUTORGA (LEI Nº 12.815/2013)</h2>
    <p class="paragrafo">
      2.1. O processamento espacial identificou <strong>${d.totalFeicoes.toLocaleString('pt-BR')}</strong> instalações ativas no escopo analisado, distribuídas entre a esfera <strong>Pública (${d.contagemEsfera['Pública'] || 0})</strong> e a esfera <strong>Privada (${d.contagemEsfera['Privada'] || 0})</strong>, refletindo a capilaridade logística da malha aquaviária e portuária sob regulação da Agência.
    </p>

    <div class="grid-kpis">
      <div class="card-kpi">
        <div class="valor">${d.totalFeicoes.toLocaleString('pt-BR')}</div>
        <div class="rotulo">Total de Ativos</div>
      </div>
      <div class="card-kpi">
        <div class="valor" style="color:#2563eb;">${(d.contagemEsfera['Pública'] || 0).toLocaleString('pt-BR')}</div>
        <div class="rotulo">Esfera Pública</div>
      </div>
      <div class="card-kpi">
        <div class="valor" style="color:#9333ea;">${(d.contagemEsfera['Privada'] || 0).toLocaleString('pt-BR')}</div>
        <div class="rotulo">Esfera Privada</div>
      </div>
      <div class="card-kpi">
        <div class="valor" style="color:#dc2626;">${(s.totalAlertasTI + s.totalAlertasUC).toLocaleString('pt-BR')}</div>
        <div class="rotulo">Alertas Socioambientais (≤15km)</div>
      </div>
    </div>

    <table class="tabela-dados">
      <thead>
        <tr>
          <th>Classificação Regulatória / Modalidade de Outorga (ANTAQ)</th>
          <th style="text-align:right;">Quantidade de Instalações</th>
          <th style="text-align:right;">Participação Relativa (%)</th>
        </tr>
      </thead>
      <tbody>
        ${linhasRegime}
      </tbody>
    </table>

    <p class="paragrafo">
      2.2. <strong>Distribuição Regional por Unidade da Federação (Top 12):</strong> ${topUFs || 'Não aplicável'}
    </p>

    <h2 class="secao">3. DIAGNÓSTICO SOCIOAMBIENTAL E SOBREPOSIÇÕES TERRITORIAIS (FUNAI / ICMBIO)</h2>
    <p class="paragrafo">
      3.1. Em consonância com as diretrizes de sustentabilidade hidroviária e portuária da SEPH/ANTAQ, realizou-se a verificação topológica automática de interior poligonal e distância geodésica à borda em relação às poligonais oficiais de Terras Indígenas (FUNAI) e Unidades de Conservação Federais (ICMBio).
    </p>
    ${blocoSocioambiental}

    <h2 class="secao">4. RELAÇÃO CADASTRAL DE ATIVOS INSPECIONADOS (${d.itensDetalhados.length} DE ${d.totalFeicoes})</h2>
    <table class="tabela-dados">
      <thead>
        <tr>
          <th style="width:36px; text-align:center;">#</th>
          <th>Denominação da Instalação</th>
          <th>Regime / Subcamada</th>
          <th>Esfera</th>
          <th>Município / Localidade</th>
          <th style="text-align:center;">UF</th>
          <th>Coordenadas (SIRGAS 2000)</th>
        </tr>
      </thead>
      <tbody>
        ${linhasAtivos}
      </tbody>
    </table>

    <h2 class="secao">5. CONCLUSÕES E RECOMENDAÇÕES TÉCNICAS</h2>
    <p class="paragrafo">
      5.1. Os dados consolidados nesta Nota Técnica demonstram a consistência posicional e cadastral da base geoespacial gerida pela GEE/SEPH nos termos do art. 58 da Resolução ANTAQ nº 116/2024, servindo como subsídio direto para estudos de demanda, regulação tarifária, planejamento da Agenda Plurianual de Estudos 2025-2028 e atendimento a demandas de transparência ativa (SIC / Fala.BR).
    </p>
    <p class="paragrafo">
      5.2. Restituímos os autos e o presente relatório cartográfico à GEE/SEPH para análise e prosseguimento.
    </p>

    <h2 class="secao">6. REFERÊNCIAS CITADAS</h2>
    <div style="font-size:10.5px; color:#475569;">
      <div>1. Lei nº 10.233, de 5 de junho de 2001 — Criação da ANTAQ (https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10233.htm)</div>
      <div>2. Lei nº 12.815, de 5 de junho de 2013 — Lei dos Portos (https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12815.htm)</div>
      <div>3. Resolução ANTAQ nº 116/2024 — Regimento Interno da ANTAQ (https://sophia.antaq.gov.br/Terminal/acervo/detalhe/37131)</div>
      <div>4. Agenda Plurianual de Estudos ANTAQ 2025-2028 (https://www.gov.br/antaq/pt-br/central-de-conteudos/estudos-e-pesquisas-da-antaq-1/agenda-de-estudos-2025-2028)</div>
    </div>

    <div class="assinatura">
      <strong>Sistema de Inteligência Geográfica — WebGIS Corporativo ANTAQ</strong><br>
      Gerência Especial de Estudos (GEE) · Superintendência de Estudos e Projetos Hidroviários (SEPH)
    </div>
  </div>
</body>
</html>`;
    }
  };

  window.RelatorioExecutivoPDF = RelatorioExecutivoPDF;
  console.info('[js] RelatorioExecutivoPDF carregado (Cruzamento Poligonal Automático TIs/UCs + UF 100%)');
})();

/* --- INÍCIO: js/domain/batimetria-tin-manager.js --- */
/* ============================================================
   WebGIS Corporativo ANTAQ — Módulo: BatimetriaTINManager
   Escopo: Upload de nuvens de pontos batimétricos (X Y Z),
           escolha de separador (Espaço, Vírgula, Ponto-e-Vírgula, Tab),
           conversão geodésica UTM -> SIRGAS 2000 / WGS84 (padrão UTM 22S)
           e Interpolação TIN (Triangulated Irregular Network) restrita
           à área dos pontos (ancorada das extremidades para o interior).
   Dependências: window.mapa, window.CAMADAS_MAPA, window.CONFIG_CAMADAS,
                 window.DADOS_GEOJSON_BRUTOS, window.UI, turf (global)
   Expõe: window.BatimetriaTINManager
   ============================================================ */
(function () {
  'use strict';

  const BatimetriaTINManager = {
    _textoBruto: '',
    _nomeArquivo: '',
    _contadorCamadas: 0,
    _ultimoResultadoGeoJSON: null,

    // Tabela de faixas batimétricas (metros)
    FAIXAS_CORES: [
      { max: 2.5,  cor: '#dc2626', rotulo: 'Crítico / Banco (< 2,5 m)' },
      { max: 4.5,  cor: '#f97316', rotulo: 'Atenção / Raso (2,5 – 4,5 m)' },
      { max: 7.0,  cor: '#eab308', rotulo: 'Transição / Talude (4,5 – 7,0 m)' },
      { max: 11.0, cor: '#38bdf8', rotulo: 'Canal Operacional (7,0 – 11,0 m)' },
      { max: 16.0, cor: '#0284c7', rotulo: 'Canal Profundo (11,0 – 16,0 m)' },
      { max: Infinity, cor: '#1e3a8a', rotulo: 'Calha / Talvegue (> 16,0 m)' }
    ],

    abrirModal: function () {
      const modal = document.getElementById('modal-batimetria-tin');
      if (!modal) return;
      modal.classList.add('aberto');
      this.atualizarPreview();
    },

    fecharModal: function () {
      const modal = document.getElementById('modal-batimetria-tin');
      if (modal) modal.classList.remove('aberto');
    },

    aoSelecionarArquivo: function (files) {
      if (!files || !files.length) return;
      const file = files[0];
      this._nomeArquivo = file.name.replace(/\.[^.]+$/, '');
      const lbl = document.getElementById('bat-nome-arquivo');
      if (lbl) lbl.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

      const reader = new FileReader();
      reader.onload = (e) => {
        this._textoBruto = String(e.target.result || '');
        const txtArea = document.getElementById('bat-texto-xyz');
        if (txtArea) {
          // Mostra até os primeiros 15.000 caracteres na caixa de texto para não travar o DOM em arquivos gigantes
          txtArea.value = this._textoBruto.length > 15000
            ? this._textoBruto.slice(0, 15000) + `\n# ... [Arquivo completo em memória: ${this._textoBruto.split(/\r?\n/).length} linhas]`
            : this._textoBruto;
        }
        this.autoDetectarSeparador(this._textoBruto);
        this.atualizarPreview();
      };
      reader.readAsText(file, 'utf-8');
    },

    aoDigitarTexto: function (val) {
      if (!val.includes('# ... [Arquivo completo em memória:')) {
        this._textoBruto = val;
      }
      this.atualizarPreview();
    },

    autoDetectarSeparador: function (texto) {
      const selSep = document.getElementById('bat-separador');
      if (!selSep || !texto) return;

      const linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l && !/^[a-zA-Z#]/.test(l));
      if (!linhas.length) return;
      const amostra = linhas[0];

      if (amostra.includes(';')) selSep.value = 'ponto_virgula';
      else if (amostra.includes('\t')) selSep.value = 'tab';
      else if ((amostra.match(/,/g) || []).length >= 2 && !amostra.includes(' ')) selSep.value = 'virgula';
      else selSep.value = 'espaco';
    },

    /**
     * Conversão Geodésica Analítica (Série de Redfearn / Snyder)
     * Converte coordenadas planas UTM (Easting X, Northing Y) em SIRGAS 2000 / WGS84 (Elipsoide GRS80)
     * para Latitude e Longitude em graus decimais com precisão submilimétrica.
     */
    utmParaLatLon: function (easting, northing, zona, hemisferioSul) {
      const a = 6378137.0; // Semi-eixo maior GRS80 / SIRGAS 2000
      const f = 1 / 298.257222101;
      const k0 = 0.9996;
      const eSq = f * (2 - f);
      const ePrimeSq = eSq / (1 - eSq);
      const e1 = (1 - Math.sqrt(1 - eSq)) / (1 + Math.sqrt(1 - eSq));

      const x = easting - 500000.0;
      const y = hemisferioSul ? (northing - 10000000.0) : northing;

      const lonOrigin = (zona - 1) * 6 - 180 + 3; // Meridiano central da zona UTM

      const M = y / k0;
      const mu = M / (a * (1 - eSq / 4 - 3 * eSq * eSq / 64 - 5 * eSq * eSq * eSq / 256));

      const phi1Rad = mu +
        (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu) +
        (21 * e1 * e1 / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu) +
        (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu) +
        (1097 * Math.pow(e1, 4) / 512) * Math.sin(8 * mu);

      const sinPhi1 = Math.sin(phi1Rad);
      const cosPhi1 = Math.cos(phi1Rad);
      const tanPhi1 = Math.tan(phi1Rad);

      const N1 = a / Math.sqrt(1 - eSq * sinPhi1 * sinPhi1);
      const T1 = tanPhi1 * tanPhi1;
      const C1 = ePrimeSq * cosPhi1 * cosPhi1;
      const R1 = a * (1 - eSq) / Math.pow(1 - eSq * sinPhi1 * sinPhi1, 1.5);
      const D = x / (N1 * k0);

      const latRad = phi1Rad - (N1 * tanPhi1 / R1) * (
        D * D / 2 -
        (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ePrimeSq) * Math.pow(D, 4) / 24 +
        (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ePrimeSq - 3 * C1 * C1) * Math.pow(D, 6) / 720
      );

      const lonRad = (
        D -
        (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 +
        (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ePrimeSq + 24 * T1 * T1) * Math.pow(D, 5) / 120
      ) / cosPhi1;

      const lat = latRad * (180 / Math.PI);
      const lon = lonOrigin + lonRad * (180 / Math.PI);
      return { lat, lon };
    },

    _parseNumero: function (str, separadorEscolhido) {
      if (str === undefined || str === null) return NaN;
      let s = String(str).trim();
      if (!s) return NaN;
      // Se o separador de colunas NÃO for vírgula, aceita vírgula como separador decimal (ex: 684320,45)
      if (separadorEscolhido !== 'virgula' && s.includes(',') && !s.includes('.')) {
        s = s.replace(',', '.');
      }
      return parseFloat(s);
    },

    _extrairPontos: function (limiteAmostra = 0) {
      const fonte = this._textoBruto || document.getElementById('bat-texto-xyz')?.value || '';
      const sep = document.getElementById('bat-separador')?.value || 'espaco';
      const crs = document.getElementById('bat-projecao')?.value || 'UTM_22S';
      const ordem = document.getElementById('bat-ordem-colunas')?.value || 'XYZ';
      const zPositivo = document.getElementById('bat-sinal-z')?.value || 'abs';

      const linhas = fonte.split(/\r?\n/);
      const pontos = [];

      let regexSep = /\s+/;
      if (sep === 'virgula') regexSep = /\s*,\s*/;
      else if (sep === 'ponto_virgula') regexSep = /\s*;\s*/;
      else if (sep === 'tab') regexSep = /\t+/;
      else if (sep === 'auto') regexSep = /[\s,;\t]+/;

      for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha || linha.startsWith('#') || linha.startsWith('//')) continue;

        const cols = linha.split(regexSep).filter(Boolean);
        if (cols.length < 3) continue;

        let rawX, rawY, rawZ;
        if (ordem === 'XYZ') {
          rawX = cols[0]; rawY = cols[1]; rawZ = cols[2];
        } else if (ordem === 'YXZ') {
          rawY = cols[0]; rawX = cols[1]; rawZ = cols[2];
        } else if (ordem === 'ID_XYZ' && cols.length >= 4) {
          rawX = cols[1]; rawY = cols[2]; rawZ = cols[3];
        } else {
          rawX = cols[0]; rawY = cols[1]; rawZ = cols[2];
        }

        const x = this._parseNumero(rawX, sep);
        const y = this._parseNumero(rawY, sep);
        let z = this._parseNumero(rawZ, sep);

        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
        if (zPositivo === 'abs') z = Math.abs(z);
        else if (zPositivo === 'inv') z = -z;

        let lat = y, lon = x;
        if (crs.startsWith('UTM_')) {
          // Ex: UTM_22S ou UTM_22N
          const m = crs.match(/UTM_(\d+)([SN])/);
          const zona = m ? parseInt(m[1], 10) : 22;
          const sul = m ? (m[2] === 'S') : true;
          if (x < 100000 || x > 950000 || y < 0 || y > 10500000) continue;
          const conv = this.utmParaLatLon(x, y, zona, sul);
          lat = conv.lat;
          lon = conv.lon;
        } else {
          // Geográfico (SIRGAS 2000 / WGS84)
          if (Math.abs(lat) > 90 && Math.abs(lon) <= 90) {
            const tmp = lat; lat = lon; lon = tmp;
          }
          if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
        }

        pontos.push({ x, y, z, lat, lon });
        if (limiteAmostra > 0 && pontos.length >= limiteAmostra) break;
      }

      return pontos;
    },

    atualizarPreview: function () {
      const box = document.getElementById('bat-preview-corpo');
      if (!box) return;

      const todos = this._extrairPontos(0);
      if (todos.length === 0) {
        box.innerHTML = `<div style="color:#94a3b8; font-style:italic;">Carregue um arquivo <strong>X Y Z</strong>, cole os dados abaixo ou clique em <strong>"🧪 Carregar Exemplo UTM 22S"</strong> para visualizar a conversão.</div>`;
        return;
      }

      const amostra = todos.slice(0, 4);
      let zMin = Infinity, zMax = -Infinity;
      for (const p of todos) {
        if (p.z < zMin) zMin = p.z;
        if (p.z > zMax) zMax = p.z;
      }

      const linhasHtml = amostra.map((p, idx) => `
        <tr>
          <td style="color:#94a3b8;">#${idx + 1}</td>
          <td style="font-family:monospace;">${p.x.toFixed(2)}</td>
          <td style="font-family:monospace;">${p.y.toFixed(2)}</td>
          <td style="font-family:monospace; color:#38bdf8; font-weight:700;">${p.z.toFixed(2)} m</td>
          <td style="font-family:monospace; color:#a7f3d0;">${p.lat.toFixed(5)}°, ${p.lon.toFixed(5)}°</td>
        </tr>
      `).join('');

      box.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
          <span>✅ <strong style="color:#38bdf8;">${todos.length.toLocaleString('pt-BR')}</strong> pontos batimétricos válidos reconhecidos</span>
          <span>🌊 Profundidade: <strong>${zMin.toFixed(2)} m</strong> a <strong>${zMax.toFixed(2)} m</strong></span>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:10.5px; text-align:left;">
          <thead>
            <tr style="border-bottom:1px solid #1e4976; color:#94a3b8;">
              <th>Pt</th><th>X (Original)</th><th>Y (Original)</th><th>Z (Prof.)</th><th>Convertido (SIRGAS 2000 Lat/Lon)</th>
            </tr>
          </thead>
          <tbody>${linhasHtml}</tbody>
        </table>
      `;
    },

    /**
     * Gera um conjunto realista de batimetria ecobatimétrica em UTM 22 Sul (EPSG:31982)
     * separado por espaço (X Y Z), simulando um trecho de canal hidroviário sinuoso com
     * margens rasas (extremidades), talude e canal profundo (talvegue) + banco raso (pedral).
     */
    carregarExemploUTM22S: function () {
      // Coordenadas UTM 22S (região hidroviária Tocantins / Pará - Meridiano Central -51°)
      const baseE = 668000;
      const baseN = 9715000;
      const linhasXYZ = [
        '# Levantamento Ecobatimétrico — Seções Transversais (Projeção: SIRGAS 2000 / UTM Zona 22S)',
        '# Formato: X(Easting_m) Y(Northing_m) Z(Profundidade_m) — Separado por Espaço'
      ];

      // 18 seções transversais ao longo de 2,4 km de rio sinuoso, cada seção com 9 pontos (da margem esquerda à margem direita)
      const numSecoes = 18;
      const passoLongo = 140; // 140m entre seções
      const larguraMeio = 220; // 440m de largura total do canal

      for (let s = 0; s < numSecoes; s++) {
        const prog = s / (numSecoes - 1);
        const centroN = baseN + s * passoLongo;
        // Curva suave (meandro) em X
        const centroE = baseE + Math.sin(prog * Math.PI * 1.4) * 320;
        // Direção tangente e normal para orientar a seção transversal
        const dEdS = Math.cos(prog * Math.PI * 1.4) * (Math.PI * 1.4 / ((numSecoes - 1) * passoLongo)) * 320;
        const ang = Math.atan2(dEdS, 1);
        const cosA = Math.cos(ang), sinA = Math.sin(ang);

        for (let p = -4; p <= 4; p++) {
          const frac = p / 4; // -1 (extremidade esquerda) até +1 (extremidade direita)
          const offset = frac * larguraMeio;
          const x = centroE + offset * cosA;
          const y = centroN - offset * sinA;

          // Perfil transversal parabólico (margens rasas ~1.2m nas extremidades -> talvegue ~13.5m no centro)
          let prof = 1.2 + (1 - frac * frac) * 12.5;

          // Simula um alto-fundo / pedral crítico entre as seções 7 e 10
          if (s >= 7 && s <= 10 && Math.abs(frac) <= 0.5) {
            prof = 2.1 + Math.abs(frac) * 1.8;
          }

          linhasXYZ.push(`${x.toFixed(2)} ${y.toFixed(2)} ${prof.toFixed(2)}`);
        }
      }

      this._textoBruto = linhasXYZ.join('\n');
      this._nomeArquivo = 'batimetria_canal_utm22s';

      const txtArea = document.getElementById('bat-texto-xyz');
      if (txtArea) txtArea.value = this._textoBruto;
      const selSep = document.getElementById('bat-separador');
      if (selSep) selSep.value = 'espaco';
      const selProj = document.getElementById('bat-projecao');
      if (selProj) selProj.value = 'UTM_22S';
      const lbl = document.getElementById('bat-nome-arquivo');
      if (lbl) lbl.textContent = '🧪 batimetria_canal_utm22s.xyz (162 pontos em UTM 22S)';

      this.atualizarPreview();
      if (window.UI) window.UI.toast('🧪 Dados de exemplo em UTM 22S (X Y Z separados por espaço) carregados!');
    },

    _haversineMetros: function (lon1, lat1, lon2, lat2) {
      const R = 6371000.0;
      const toRad = Math.PI / 180;
      const dLat = (lat2 - lat1) * toRad;
      const dLon = (lon2 - lon1) * toRad;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
    },

    /**
     * Identifica os pontos das extremidades (borda côncava / perímetro da nuvem)
     * e densifica os segmentos da borda externa para ancorar a triangulação
     * das extremidades para dentro da geometria.
     */
    _ancorarExtremidadesParaDentro: function (pontos, maxArestaMetros) {
      if (pontos.length < 6 || typeof turf === 'undefined') return pontos;

      try {
        const fcPts = turf.featureCollection(
          pontos.map((p, idx) => turf.point([p.lon, p.lat], { z: p.z, idx }))
        );

        // Calcula envoltória côncava (ou convexa como fallback) para capturar o perímetro externo
        let hull = null;
        try {
          hull = turf.concave(fcPts, { maxEdge: Math.max(0.3, (maxArestaMetros * 1.5) / 1000), units: 'kilometers' });
        } catch (_) {}
        if (!hull || !hull.geometry) {
          try { hull = turf.convex(fcPts); } catch (_) {}
        }
        if (!hull || !hull.geometry) return pontos;

        const coordsBorda = hull.geometry.type === 'Polygon'
          ? hull.geometry.coordinates[0]
          : (hull.geometry.type === 'MultiPolygon' ? hull.geometry.coordinates[0][0] : []);

        if (!coordsBorda || coordsBorda.length < 4) return pontos;

        // Para cada segmento da extremidade (borda), se a distância entre dois vértices de borda
        // for grande mas menor que maxArestaMetros, insere um ponto sintético de costura na borda
        // com Z interpolado entre os dois vértices da extremidade (forçando os triângulos a crescerem da borda para dentro)
        const pontosExtrasBorda = [];
        const passoDensificacao = Math.max(40, maxArestaMetros * 0.45);

        const acharZMaisProximo = (lon, lat) => {
          let melhorZ = pontos[0].z;
          let menorD = Infinity;
          for (let i = 0; i < pontos.length; i++) {
            const d = (pontos[i].lon - lon) * (pontos[i].lon - lon) + (pontos[i].lat - lat) * (pontos[i].lat - lat);
            if (d < menorD) {
              menorD = d;
              melhorZ = pontos[i].z;
            }
          }
          return melhorZ;
        };

        for (let i = 0; i < coordsBorda.length - 1; i++) {
          const [lon1, lat1] = coordsBorda[i];
          const [lon2, lat2] = coordsBorda[i + 1];
          const distM = this._haversineMetros(lon1, lat1, lon2, lat2);

          if (distM > passoDensificacao && distM <= maxArestaMetros * 1.15) {
            const z1 = acharZMaisProximo(lon1, lat1);
            const z2 = acharZMaisProximo(lon2, lat2);
            const nSub = Math.min(4, Math.floor(distM / passoDensificacao));
            for (let k = 1; k <= nSub; k++) {
              const t = k / (nSub + 1);
              pontosExtrasBorda.push({
                x: 0,
                y: 0,
                lon: lon1 + (lon2 - lon1) * t,
                lat: lat1 + (lat2 - lat1) * t,
                z: z1 + (z2 - z1) * t,
                _bordaCostura: true
              });
            }
          }
        }

        return pontos.concat(pontosExtrasBorda);
      } catch (e) {
        return pontos;
      }
    },

    _corPorProfundidade: function (z) {
      for (const faixa of this.FAIXAS_CORES) {
        if (z <= faixa.max) return faixa.cor;
      }
      return '#1e3a8a';
    },

    _rotuloFaixa: function (z) {
      for (const faixa of this.FAIXAS_CORES) {
        if (z <= faixa.max) return faixa.rotulo;
      }
      return 'Calha / Talvegue (> 16,0 m)';
    },

    /**
     * Executa a Interpolação TIN restrita à área dos pontos (das extremidades para o interior)
     * e adiciona como camada interativa no mapa e no Painel de Camadas.
     */
    executarInterpolacaoTIN: function () {
      if (typeof turf === 'undefined' || typeof turf.tin !== 'function') {
        if (window.UI) window.UI.toast('⚠️ Biblioteca geométrica Turf.js indisponível.', 'erro');
        return;
      }

      const pontosBrutos = this._extrairPontos(0);
      if (pontosBrutos.length < 3) {
        if (window.UI) window.UI.toast('⚠️ Forneça pelo menos 3 pontos válidos (X Y Z) para gerar a malha TIN.', 'erro');
        return;
      }

      // Se a nuvem tiver mais de 6.000 pontos, faz decimação inteligente preservando extremos
      let pontos = pontosBrutos;
      if (pontosBrutos.length > 6000) {
        const passo = Math.ceil(pontosBrutos.length / 6000);
        pontos = pontosBrutos.filter((_, idx) => idx % passo === 0 || idx === pontosBrutos.length - 1);
      }

      // Calcula espaçamento característico dos pontos para definir o raio máximo de restrição de borda (Alpha-Shape)
      const inputMaxAresta = parseFloat(document.getElementById('bat-max-aresta')?.value || '0');
      let maxArestaMetros = inputMaxAresta;

      if (!maxArestaMetros || maxArestaMetros <= 0) {
        // Estima automaticamente a distância típica entre pontos vizinhos
        const dists = [];
        const am = Math.min(pontos.length, 120);
        for (let i = 0; i < am; i++) {
          let menor = Infinity;
          for (let j = 0; j < pontos.length; j++) {
            if (i === j) continue;
            const d = this._haversineMetros(pontos[i].lon, pontos[i].lat, pontos[j].lon, pontos[j].lat);
            if (d > 0.1 && d < menor) menor = d;
          }
          if (Number.isFinite(menor)) dists.push(menor);
        }
        dists.sort((a, b) => a - b);
        const mediana = dists.length ? dists[Math.floor(dists.length * 0.75)] : 150;
        maxArestaMetros = Math.max(80, Math.min(2500, mediana * 2.8));
      }

      // 1. Ancora as extremidades para dentro da geometria (densificação de borda côncava)
      const pontosAncorados = this._ancorarExtremidadesParaDentro(pontos, maxArestaMetros);

      // 2. Monta FeatureCollection para turf.tin
      const fcPontos = turf.featureCollection(
        pontosAncorados.map(p => turf.point([p.lon, p.lat], { z: Number(p.z.toFixed(3)) }))
      );

      // 3. Gera a Triangulação de Delaunay (TIN)
      const tinBruto = turf.tin(fcPontos, 'z');
      if (!tinBruto || !Array.isArray(tinBruto.features) || tinBruto.features.length === 0) {
        if (window.UI) window.UI.toast('⚠️ Não foi possível triangular os pontos informados.', 'erro');
        return;
      }

      // 4. Restringe a malha à área estrita dos pontos (remove triângulos espúrios que cruzam margens secas)
      const triangulosValidos = [];
      let areaTotalM2 = 0;
      let zMinGlobal = Infinity, zMaxGlobal = -Infinity, somaZ = 0;
      let qtdCriticos = 0;

      for (const tri of tinBruto.features) {
        const ring = tri.geometry?.coordinates?.[0];
        if (!ring || ring.length < 4) continue;

        const d1 = this._haversineMetros(ring[0][0], ring[0][1], ring[1][0], ring[1][1]);
        const d2 = this._haversineMetros(ring[1][0], ring[1][1], ring[2][0], ring[2][1]);
        const d3 = this._haversineMetros(ring[2][0], ring[2][1], ring[0][0], ring[0][1]);
        const maiorLado = Math.max(d1, d2, d3);

        // Poda de borda (Alpha-Shape / Concave Restriction): descarta triângulos com aresta > maxArestaMetros
        if (maiorLado > maxArestaMetros) continue;

        const zA = Number(tri.properties?.a ?? 0);
        const zB = Number(tri.properties?.b ?? 0);
        const zC = Number(tri.properties?.c ?? 0);
        const zMedio = +((zA + zB + zC) / 3).toFixed(2);
        const zMinTri = +Math.min(zA, zB, zC).toFixed(2);
        const zMaxTri = +Math.max(zA, zB, zC).toFixed(2);
        const desnivel = +(zMaxTri - zMinTri).toFixed(2);

        if (zMinTri < zMinGlobal) zMinGlobal = zMinTri;
        if (zMaxTri > zMaxGlobal) zMaxGlobal = zMaxTri;
        somaZ += zMedio;
        if (zMedio <= 2.5) qtdCriticos++;

        let areaTri = 0;
        try { areaTri = turf.area(tri); } catch (_) {}
        areaTotalM2 += areaTri;

        const cor = this._corPorProfundidade(zMedio);
        const classificacao = this._rotuloFaixa(zMedio);

        tri.properties = {
          nome: `Face Batimétrica TIN (${zMedio.toFixed(2)} m)`,
          profundidade_media_m: zMedio,
          profundidade_min_m: zMinTri,
          profundidade_max_m: zMaxTri,
          variacao_cota_m: desnivel,
          classificacao_calado: classificacao,
          maior_aresta_m: +maiorLado.toFixed(1),
          area_m2: Math.round(areaTri),
          _cor_tin: cor
        };

        triangulosValidos.push(tri);
      }

      if (triangulosValidos.length === 0) {
        if (window.UI) {
          window.UI.toast(`⚠️ Todos os triângulos excederam a aresta máxima (${Math.round(maxArestaMetros)} m). Aumente o valor de Aresta Máxima.`, 'alerta');
        }
        return;
      }

      const mostrarPontos = document.getElementById('bat-mostrar-pontos')?.checked !== false;
      const resultadoGeoJSON = {
        type: 'FeatureCollection',
        features: triangulosValidos
      };
      this._ultimoResultadoGeoJSON = resultadoGeoJSON;

      // 5. Cria e plota a camada no Leaflet e registra no Painel de Camadas
      this._contadorCamadas++;
      const idCamada = `bat_tin_${Date.now()}`;
      const crsLabel = document.getElementById('bat-projecao')?.selectedOptions?.[0]?.text?.split('—')?.[0]?.trim() || 'UTM 22S';
      const nomeCamada = `🌊 TIN Batimétrico (${this._nomeArquivo || crsLabel})`;

      if (window.mapa && !window.mapa.getPane('paneBatimetria')) {
        const pBat = window.mapa.createPane('paneBatimetria');
        pBat.style.zIndex = 485;
      }

      const grupoFinal = L.featureGroup();

      const layerTIN = L.geoJSON(resultadoGeoJSON, {
        pane: 'paneBatimetria',
        interactive: true,
        style: (f) => ({
          pane: 'paneBatimetria',
          color: f.properties._cor_tin,
          weight: 0.7,
          opacity: 0.85,
          fillColor: f.properties._cor_tin,
          fillOpacity: 0.78
        }),
        onEachFeature: (f, layer) => {
          const p = f.properties;
          const html = `
            <div class="pop-topo" style="background:linear-gradient(135deg, #0a2540 0%, ${p._cor_tin} 100%);">
              🌊 Superfície Batimétrica TIN
            </div>
            <div class="pop-corpo">
              <div style="background:${p._cor_tin}22; border-left:4px solid ${p._cor_tin}; padding:8px 10px; border-radius:6px; margin-bottom:8px;">
                <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700;">Profundidade Interpolada (Face TIN)</div>
                <div style="font-size:20px; font-weight:800; color:${p._cor_tin};">${p.profundidade_media_m.toFixed(2)} m</div>
                <div style="font-size:10.5px; color:#334155; font-weight:600;">${p.classificacao_calado}</div>
              </div>
              <div class="pop-linha"><span class="pop-lbl">Vértice Mínimo:</span><span class="pop-val">${p.profundidade_min_m.toFixed(2)} m</span></div>
              <div class="pop-linha"><span class="pop-lbl">Vértice Máximo:</span><span class="pop-val">${p.profundidade_max_m.toFixed(2)} m</span></div>
              <div class="pop-linha"><span class="pop-lbl">Desnível na Face:</span><span class="pop-val">${p.variacao_cota_m.toFixed(2)} m</span></div>
              <div class="pop-linha"><span class="pop-lbl">Maior Aresta:</span><span class="pop-val">${p.maior_aresta_m} m</span></div>
              <div class="pop-linha"><span class="pop-lbl">Área do Triângulo:</span><span class="pop-val">${p.area_m2.toLocaleString('pt-BR')} m²</span></div>
            </div>
          `;
          layer.bindPopup(html, { maxWidth: 320 });
          layer.on('click', (e) => {
            if (window.MeasurementTool && window.MeasurementTool.modo) return;
            try { if (!layer.isPopupOpen()) layer.openPopup(e.latlng); } catch (_) {}
            if (window.SelectionManager && typeof window.SelectionManager.selecionarUnica === 'function') {
              window.SelectionManager.selecionarUnica(f, idCamada);
            }
          });
        }
      });

      grupoFinal.addLayer(layerTIN);

      // Opcionalmente adiciona os pontos de sondagem originais sobre a malha TIN
      if (mostrarPontos && pontos.length <= 1500) {
        pontos.forEach((pt, idx) => {
          const corPt = this._corPorProfundidade(pt.z);
          const cm = L.circleMarker([pt.lat, pt.lon], {
            pane: 'panePontos',
            radius: 3.5,
            color: '#ffffff',
            weight: 1,
            fillColor: corPt,
            fillOpacity: 0.95
          });
          cm.bindPopup(`
            <div class="pop-topo">📍 Ponto de Sondagem #${idx + 1}</div>
            <div class="pop-corpo">
              <div class="pop-linha"><span class="pop-lbl">Profundidade (Z):</span><span class="pop-val"><strong>${pt.z.toFixed(2)} m</strong></span></div>
              <div class="pop-linha"><span class="pop-lbl">Coord. Origem (X, Y):</span><span class="pop-val">${pt.x.toFixed(2)}, ${pt.y.toFixed(2)}</span></div>
              <div class="pop-linha"><span class="pop-lbl">SIRGAS 2000:</span><span class="pop-val">${pt.lat.toFixed(5)}°, ${pt.lon.toFixed(5)}°</span></div>
            </div>
          `);
          grupoFinal.addLayer(cm);
        });
      }

      grupoFinal.addTo(window.mapa);

      // Registra no estado global para funcionar na Tabela de Atributos, Exportação, Seleção e Nota Técnica
      window.DADOS_GEOJSON_BRUTOS[idCamada] = resultadoGeoJSON;
      window.CAMADAS_MAPA[idCamada] = grupoFinal;
      window.CONFIG_CAMADAS[idCamada] = {
        nome: nomeCamada,
        grupo: 'importadas',
        cor: '#0284c7',
        opacidade: 0.80,
        peso: 1,
        tipoGeo: 'poligono',
        ativa: true,
        gerada: true
      };

      const grupoImp = document.getElementById('grupo-importadas');
      const msgVazio = document.getElementById('msg-sem-importadas');
      if (msgVazio) msgVazio.style.display = 'none';
      if (grupoImp && typeof window.construirItemCamada === 'function') {
        window.construirItemCamada(idCamada, window.CONFIG_CAMADAS[idCamada], grupoImp);
      }
      if (window.FilterManager && typeof window.FilterManager.atualizarSeletorCamadas === 'function') {
        window.FilterManager.atualizarSeletorCamadas();
      }
      if (window.Styler && typeof window.Styler.atualizarLegenda === 'function') {
        window.Styler.atualizarLegenda();
      }

      try {
        const bounds = layerTIN.getBounds();
        if (bounds && bounds.isValid()) {
          window.mapa.fitBounds(bounds.pad(0.15));
        }
      } catch (_) {}

      const mediaGlobal = (somaZ / triangulosValidos.length).toFixed(2);
      const areaHa = (areaTotalM2 / 10000).toFixed(1);

      this.fecharModal();
      if (window.UI) {
        window.UI.toast(`🌊 Malha TIN gerada: ${triangulosValidos.length} triângulos (${areaHa} ha) | Prof. média: ${mediaGlobal} m (${qtdCriticos} faces críticas ≤ 2,5 m).`);
      }
    },

    exportarUltimoTIN: function () {
      if (!this._ultimoResultadoGeoJSON) {
        if (window.UI) window.UI.toast('⚠️ Gere uma interpolação TIN primeiro para exportar.', 'alerta');
        return;
      }
      const blob = new Blob([JSON.stringify(this._ultimoResultadoGeoJSON, null, 2)], { type: 'application/geo+json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this._nomeArquivo || 'batimetria_tin'}_antaq.geojson`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  window.BatimetriaTINManager = BatimetriaTINManager;
  console.info('[js] BatimetriaTINManager carregado (Upload XYZ + Conversão UTM -> SIRGAS 2000 + Interpolação TIN)');
})();
/* --- FIM: js/domain/batimetria-tin-manager.js --- */
