/* ============================================================
 * WebGIS Corporativo ANTAQ — Core & Fundação Cartográfica
 * Arquivo: js/dist/bundle-core.js
 * Descrição: Segurança, estado global, mapa Leaflet, histórico e controles básicos
 * Gerado em: 13/10/2026 10:52:35
 * Módulos inclusos:
 *   - js/utils/security.js
 *   - js/utils/geom-type-detector.js
 *   - js/core/fetch-manager.js
 *   - js/core/state.js
 *   - js/core/map.js
 *   - js/core/action-history.js
 *   - js/core/basemap-manager.js
 *   - js/core/notification-manager.js
 *   - js/core/layer-registry.js
 *   - js/core/layer-order-manager.js
 *   - js/core/data-manager.js
 *   - js/core/ui.js
 *   - js/core/ambiente-manager.js
 *   - js/core/url-state.js
 *   - js/core/webgis-version.js
 *   - js/core/webgis-about.js
 * ============================================================ */


/* --- INÍCIO: js/utils/security.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: Security
   Escopo: sanitização HTML, validação de campos, reparo de texto
   Dependências: nenhuma
   Expõe: window.Security
   ============================================================ */
(function () {
  'use strict';

  const Security = {
    escapeHTML: function (str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    },
    ehValido: function (v) {
      if (v === null || v === undefined) return false;
      const s = String(v).trim().toLowerCase();
      return !(s === '' || s === 'none' || s === 'nan' || s === 'null' || s === '-');
    },
    repararTexto: function (str) {
      if (str === null || str === undefined) return '';
      let s = String(str);

      // ============================================================
      // CAMADA 1 — Normalização Unicode (resolve "ô" com bytes diferentes)
      // ============================================================
      try { s = s.normalize('NFC'); } catch (e) { /* navegador antigo */ }

      // ============================================================
      // CAMADA 2 — Mojibake (UTF-8 lido como Latin-1: "Ã§" → "ç")
      // ============================================================
      s = s.replace(/Ã§/g, 'ç').replace(/Ã‡/g, 'Ç')
           .replace(/Ã£/g, 'ã').replace(/Ãƒ/g, 'Ã')
           .replace(/Ã¡/g, 'á').replace(/Ã/g, 'Á')
           .replace(/Ã©/g, 'é').replace(/Ã‰/g, 'É')
           .replace(/Ãª/g, 'ê').replace(/ÃŠ/g, 'Ê')
           .replace(/Ã­/g, 'í').replace(/Ã/g, 'Í')
           .replace(/Ã³/g, 'ó').replace(/Ã/g, 'Ó')
           .replace(/Ãµ/g, 'õ').replace(/Ã/g, 'Õ')
           .replace(/Ã´/g, 'ô').replace(/Ã/g, 'Ô')
           .replace(/Ãº/g, 'ú').replace(/Ã/g, 'Ú')
           .replace(/Ã¢/g, 'â')
           .replace(/Ã /g, 'à')
           .replace(/Ã¼/g, 'ü')
           .replace(/Ã±/g, 'ñ');

      // ============================================================
      // CAMADA 3 — Nomes próprios corrompidos (\uFFFD ou ?)
      // ============================================================
      const nomesProprios = [
        [/\bApu[\uFFFD\?]+/gi, 'Apuí'],
        [/\bPiau[\uFFFD\?]+/gi, 'Piauí'],
        [/\bItagua[\uFFFD\?]+/gi, 'Itaguaí'],
        [/\bJundia[\uFFFD\?]+/gi, 'Jundiaí'],
        [/\bUbu[\uFFFD\?]+/gi, 'Ubuí'],
        [/\bParanagu[\uFFFD\?]+/gi, 'Paranaguá'],
        [/\bTapaj[\uFFFD\?]+s/gi, 'Tapajós'],
        [/\bSolim[\uFFFD\?]+es/gi, 'Solimões'],
        [/\bMaranh[\uFFFD\?]+o/gi, 'Maranhão'],
        [/\bRond[\uFFFD\?]+nia/gi, 'Rondônia'],
        [/\bAmap[\uFFFD\?]+/gi, 'Amapá'],
        [/\bCear[\uFFFD\?]+/gi, 'Ceará'],
        [/\bPar[\uFFFD\?]+\b/gi, 'Pará'],
        [/\bGoi[\uFFFD\?]+s/gi, 'Goiás'],
        [/\bTiet[\uFFFD\?]+/gi, 'Tietê'],
        [/\bIgua[\uFFFD\?]+u/gi, 'Iguaçu'],
        [/\bGua[\uFFFD\?]+ba/gi, 'Guaíba'],
        [/\bJacu[\uFFFD\?]+/gi, 'Jacuí'],
        [/\bTaquar[\uFFFD\?]+/gi, 'Taquari'],
        [/\bS[\uFFFD\?]+o\b/gi, 'São'],
        [/\bJo[\uFFFD\?]+o\b/gi, 'João'],
        [/\bBel[\uFFFD\?]+m\b/gi, 'Belém'],
        [/\bSantar[\uFFFD\?]+m\b/gi, 'Santarém'],
        [/\bMacei[\uFFFD\?]+/gi, 'Maceió'],
        [/\bChu[\uFFFD\?]+/gi, 'Chuí']
      ];
      for (const [re, val] of nomesProprios) s = s.replace(re, val);

      // ============================================================
      // CAMADA 4 — Palavras comuns do domínio ANTAQ (aceita qualquer
      //            caractere corrompido entre letras, ex: "Hidrogrfica")
      // ============================================================
      s = s.replace(/instala[\uFFFD\?çã]*o/gi, 'instalação')
           .replace(/p[\uFFFD\?ú]*blic[oa]/gi, (m) => m.toLowerCase().endsWith('a') ? 'pública' : 'público')
           .replace(/esta[\uFFFD\?çã]*o/gi, 'estação')
           .replace(/mar[\uFFFD\?í]*tim[oa]/gi, (m) => m.toLowerCase().endsWith('a') ? 'marítima' : 'marítimo')
           .replace(/transfer[\uFFFD\?ê]*ncia/gi, 'transferência')
           .replace(/tempor[\uFFFD\?á]*ria/gi, 'temporária')
           .replace(/portu[\uFFFD\?á]*ri[oa]/gi, (m) => m.toLowerCase().endsWith('a') ? 'portuária' : 'portuário')
           .replace(/munic[\uFFFD\?í]*pi[oa]/gi, 'município')
           .replace(/diretri[\uFFFD\?z]+/gi, 'diretriz')
           .replace(/extens[\uFFFD\?ã]*o/gi, 'extensão')
           .replace(/at[\uFFFD\?é]+/gi, 'até')
           .replace(/amaz[\uFFFD\?ô]*ni[ca]/gi, (m) => m.toLowerCase().endsWith('a') ? 'amazônica' : 'amazônico')
           .replace(/regi[\uFFFD\?ã]*o/gi, 'região')
           .replace(/opera[\uFFFD\?çã]*o/gi, 'operação')
           .replace(/navega[\uFFFD\?çã]*o/gi, 'navegação')
           .replace(/baliza[\uFFFD\?çã]*o/gi, 'balizamento')
           .replace(/gest[\uFFFD\?ã]*o/gi, 'gestão');

      // ============================================================
      // CAMADA 5 — Palavras específicas dos dados ANTAQ/DNIT
      //            (usa \u pra blindar contra encoding duplo)
      // ============================================================
      const especificos = [
        // Regiões hidrográficas
        [/Hidrogrfica/gi,              'Hidrográfica'],
        [/Hidrogrficos/gi,             'Hidrográficos'],
        [/Hidrogrfico/gi,              'Hidrográfico'],

        // Nomes de rios e regiões
        [/amaz[\u00F4\u00F3]nic[ao]a/gi, 'Amaz\u00F4nica'],
        [/amaz[\u00F4\u00F3]nica\b/gi,   'Amaz\u00F4nica'],
        [/Tocantins-Araguaia/gi,        'Tocantins-Araguaia'],
        [/\bPar\b(?![\u00E1a-z])/g,     'Par\u00E1'],
        [/Maranh[\u00E3\u00E4]o(?![a-z])/gi, 'Maranh\u00E3o'],

        // Palavras comuns corrompidas
        [/Pr-Projeto/gi,        'Pr\u00E9-Projeto'],
        [/Informa[\u00E7\u00E3]?o/gi,   'Informa\u00E7\u00E3o'],
        [/informa[\u00E7\u00E3]?o/gi,   'informa\u00E7\u00E3o'],
        [/informa[\u00E7\u00F5]?es/gi,  'informa\u00E7\u00F5es'],
        [/aplica[\u00E7\u00E3]?o/gi,    'aplica\u00E7\u00E3o'],
        [/avalia[\u00E7\u00E3]?o/gi,    'avalia\u00E7\u00E3o'],
        [/constru[\u00E7\u00E3]?o/gi,   'constru\u00E7\u00E3o'],
        [/fiscaliza[\u00E7\u00E3]?o/gi, 'fiscaliza\u00E7\u00E3o'],
        [/regula[\u00E7\u00E3]?o/gi,    'regula\u00E7\u00E3o'],
        [/autoriza[\u00E7\u00E3]?o/gi,  'autoriza\u00E7\u00E3o'],

        // Nomes próprios comuns
        [/Vit[\u00F3]ria/gi,    'Vit\u00F3ria'],
        [/Flix/gi,              'F\u00E9lix'],
        [/\bJos\b/g,            'Jos\u00E9'],
        [/Antnio/gi,            'Ant\u00F4nio'],
        [/Brbara/gi,            'B\u00E1rbara'],
        [/Silvnio/gi,           'Silv\u00E2nio'],
        [/Demtrios/gi,          'Dem\u00E9trios'],
        [/Flix/gi,              'F\u00E9lix'],

        // Correção genérica: qualquer "aa" no final vira "a" (amazônicaa → amazônica)
        [/\b([a-z\u00E0-\u00FF]{4,})aa\b/gi, '$1a']
      ];
      for (const [re, val] of especificos) s = s.replace(re, val);

      // ============================================================
      // CAMADA 6 — Reconstrução genérica de padrões com \uFFFD ou ?
      // ============================================================
      s = s.replace(/([a-zA-Z]+)[\uFFFD\?]+o\b/g, '$1ão')
           .replace(/([a-zA-Z]+)[\uFFFD\?]+a\b/g, '$1á')
           .replace(/([a-zA-Z]+)u[\uFFFD\?]+\b/g, '$1uí')
           .replace(/\uFFFD/g, '');

      // ============================================================
      // CAMADA 7 — Acentos FALTANTES (texto sem acento → com acento)
      // ============================================================
      const semAcento = [
        // Palavras comuns do domínio
        [/\bmaritim[oa]\b/gi,     (m) => m.endsWith('a') || m.endsWith('A') ? 'marítima' : 'marítimo'],
        [/\binstalacoes\b/gi,     'instalações'],
        [/\binstalacao\b/gi,      'instalação'],
        [/\bnavegacao\b/gi,       'navegação'],
        [/\bregiao\b/gi,          'região'],
        [/\bregioes\b/gi,         'regiões'],
        [/\bhidrografic[oa]s?\b/gi, (m) => {
          const temS = m.toLowerCase().endsWith('s');
          const temA = !temS && m.toLowerCase().endsWith('a') ? true : (!temS && !m.toLowerCase().endsWith('o') ? true : false);
          return temS ? (m.toLowerCase().endsWith('as') ? 'hidrográficas' : 'hidrográficos')
               : (m.toLowerCase().endsWith('a') ? 'hidrográfica' : 'hidrográfico');
        }],
        // ✅ Correções sem acento que faltavam
        [/\bVitria\b/g,           'Vitória'],
        [/\bVitoria\b/g,          'Vitória'],
        // ✅ Case-sensitive: preserva a capitalização do original
        [/\bMunicipios\b/g,       'Municípios'],
        [/\bMunicipio\b/g,        'Município'],
        [/\bmunicipios\b/g,       'municípios'],
        [/\bmunicipio\b/g,        'município'],
        [/\bBRASILIA\b/g,         'BRASÍLIA'],
        [/\bBrasilia\b/g,         'Brasília'],
        // Nomes próprios de rios
        [/\bTapajos\b/g,          'Tapajós'],
        [/\bSolimoes\b/g,         'Solimões'],
        [/\bTiete\b/g,            'Tietê'],
        [/\bIguacu\b/g,           'Iguaçu'],
        [/\bGuapore\b/g,          'Guaporé'],
        [/\bJapura\b/g,           'Japurá'],
        [/\bJavari\b/g,           'Javari'],
        [/\bNegro\b/g,            'Negro'],
        [/\bMadeira\b/g,          'Madeira'],

        // Nomes de estados e cidades sem acento
        [/\bVitoria\b/g,          'Vitória'],
        [/\bSao Paulo\b/g,        'São Paulo'],
        [/\bBelem\b/g,            'Belém'],
        [/\bSantarem\b/g,         'Santarém'],
        [/\bMacapa\b/g,           'Macapá'],
        [/\bMaceio\b/g,           'Maceió'],
        [/\bGoiania\b/g,          'Goiânia'],
        [/\bBrasilia\b/g,         'Brasília'],
        [/\bCuiaba\b/g,           'Cuiabá'],
        [/\bFlorianopolis\b/g,    'Florianópolis'],
        [/\bNiteroi\b/g,          'Niterói'],
        [/\bVitoria\b/g,          'Vitória'],
        [/\bMaranhao\b/g,         'Maranhão'],
        [/\bCeara\b/g,            'Ceará'],
        [/\bParaiba\b/g,          'Paraíba'],
        [/\bPiaui\b/g,            'Piauí'],
        [/\bRondonia\b/g,         'Rondônia'],
        [/\bAmapa\b/g,            'Amapá'],
        [/\bGoias\b/g,            'Goiás'],
        [/\bEspirito Santo\b/g,   'Espírito Santo'],

        // Nomes próprios comuns em logradouros
        [/\bAntonio\b/g,          'Antônio'],
        [/\bBarbara\b/g,          'Bárbara'],
        [/\bSilvanio\b/g,         'Silvânio'],
        [/\bDemetrios\b/g,        'Demétrios'],
        [/\bFelix\b/g,            'Félix'],
        [/\bJose\b/g,             'José'],
        [/\bJoao\b/g,             'João'],
        [/\bBarao\b/g,            'Barão'],
        [/\bSao\b/g,              'São'],
        [/\bBelem\b/g,            'Belém'],

        // Termos técnicos ANTAQ
        [/\bcomercio\b/gi,        'comércio'],
        [/\bindustria\b/gi,       'indústria'],
        [/\benergia\b/gi,         'energia'],
        [/\bdistancia\b/gi,       'distância'],
        [/\bocorrencia\b/gi,      'ocorrência'],
        [/\bocorrencias\b/gi,     'ocorrências'],
        [/\breferencia\b/gi,      'referência'],
        [/\bReferencia\b/gi,      'Referência'],
        [/\bexistencia\b/gi,      'existência'],
        [/\bseguranca\b/gi,       'segurança'],
        [/\bemergencia\b/gi,      'emergência'],
        [/\bfrequencia\b/gi,      'frequência'],
        [/\bocorrencia\b/gi,      'ocorrência']
      ];
      for (const [re, val] of semAcento) s = s.replace(re, val);

      return s.trim();
    },
  
    /* ============================================================
       EXTRAÇÃO CENTRALIZADA DE UF (Consolidada para todo o WebGIS)
       ============================================================ */
    extrairUF: function (props) {
      if (!props) return '';
      // 1. Campos diretos de sigla da UF
      for (const k of ['SIGLA_UF', 'sigla_uf', 'uf', 'UF', 'estado', 'ESTADO', 'est_uf', 'sg_uf', 'EST_ORIGEM', 'est_origem', 'EST_DESTINO', 'est_destino']) {
        const v = props[k];
        if (v && String(v).trim().length === 2) return String(v).trim().toUpperCase();
      }
      // 2. Extração de padrões "Município/UF"
      for (const k of ['municipio', 'MUNICIPIO', 'nome_municipio', 'NM_MUN', 'mun_origem', 'mun_destino']) {
        const v = props[k];
        if (v && String(v).includes('/')) {
          const partes = String(v).split('/');
          if (partes.length > 1) {
            const sigla = partes[1].trim().toUpperCase();
            if (sigla.length === 2) return sigla;
          }
        }
      }
      return '';
    },
};

  window.Security = Security;
  console.info('[js] Security carregado');
})();
/* --- FIM: js/utils/security.js --- */

/* --- INÍCIO: js/core/data-manager.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: DataManager
   Escopo: carregamento de GeoJSON, clusters de portos, sincronização
   Dependências: window.CONFIG_CAMADAS, window.DADOS_GEOJSON_BRUTOS,
                 window.CAMADAS_MAPA, window.FetchManager, window.Security,
                 window.GeomTypeDetector, window.Styler,
                 window.PortClassification, window.PopupRenderer,
                 window.ActionHistory, window.mapa, window.NotificationManager
   Referências "lazy": window.UI, window.CopilotoIA, window.SelectionManager,
                       window.LayerRegistry, window.VENUnifiedManager
   Expõe: window.DataManager
   ============================================================ */
(function () {
  'use strict';

  const DataManager = {
    carregando: {},

    carregarCamada: async function (id) {
      if (DADOS_GEOJSON_BRUTOS[id] && CAMADAS_MAPA[id]) return DADOS_GEOJSON_BRUTOS[id];
      if (this.carregando[id]) return this.carregando[id];

      const cfg = CONFIG_CAMADAS[id];
      if (!cfg || !cfg.arquivos || !cfg.arquivos.length) return null;

      const cntEl = document.getElementById(`cnt-${id}`);
      const errEl = document.getElementById(`err-${id}`);
      const chkEl = document.getElementById(`chk-${id}`);
      if (cntEl) cntEl.innerText = '(carregando...)';

      const carregarGeoJson = async () => {
        const falhas = [];

        for (let i = 0; i < cfg.arquivos.length; i++) {
          const url = cfg.arquivos[i];

          try {
            const j = await window.FetchManager.fetchJSON(url, {
              onTentativa: (n, total) => {
                if (n === 1) return;
                if (cntEl) cntEl.innerText = `(retry ${n}/${total}…)`;
              }
            });

            if (j && j.features) return j;
            falhas.push(`${url}: sem features`);
          } catch (err) {
            const msg = (err && err.message) || 'erro desconhecido';
            falhas.push(`${url}: ${msg}`);
            console.warn(`[R3] ${id} → falha em "${url}" após retries:`, msg);
          }
        }

        const detalhe = falhas.join(' · ');
        throw new Error(`Camada "${id}" indisponível. ${detalhe}`);
      };

      this.carregando[id] = carregarGeoJson()
        .then(dados => {
          if (!dados.features) throw new Error("Sem feições válidas");

          dados.features.forEach(f => {
            if (f.properties) {
              for (const [k, v] of Object.entries(f.properties)) {
                if (typeof v === 'string') f.properties[k] = window.Security.repararTexto(v);
              }
            }
          });

          DADOS_GEOJSON_BRUTOS[id] = dados;

          if (!cfg.tipoGeo || cfg.tipoGeo === 'auto') {
            cfg.tipoGeo = window.GeomTypeDetector.detectar(dados);
            if (cfg.tipoGeo === 'poligono' && cfg.peso > 3) cfg.peso = 1.5;
            if (cfg.tipoGeo === 'linha' && cfg.peso > 5) cfg.peso = 2.5;
            if (cfg.tipoGeo === 'ponto' && cfg.peso < 3) cfg.peso = 5;
          }

          const opcoes = window.Styler.obterOpcoes(id);

          if (id === 'instalacoes_portuarias') {
            if (!window.SUBGRUPOS_PORTOS) window.SUBGRUPOS_PORTOS = {};

            // ✅ Cluster Master Unificado: elimina sobreposição e aplica raio dinâmico adaptativo
            const criarClusterMasterPortos = () => {
              if (typeof L.markerClusterGroup !== 'function') {
                console.warn('[Cluster] Biblioteca indisponível. Fallback para featureGroup.');
                return L.featureGroup();
              }
              return L.markerClusterGroup({
                maxClusterRadius: (zoom) => {
                  if (zoom <= 5) return 85;   // Zoom continental/nacional: consolida em polos regionais
                  if (zoom <= 8) return 65;   // Zoom estadual/corredores logísticos
                  return 45;                  // Aproximação portuária
                },
                disableClusteringAtZoom: 12,  // Terminais individuais no nível do porto (zoom >= 12)
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true,
                chunkedLoading: true,
                chunkInterval: 100,
                chunkDelay: 50,
                iconCreateFunction: (cluster) => {
                  const count = cluster.getChildCount();
                  let dim = 38;
                  if (count >= 100) dim = 52;
                  else if (count >= 20) dim = 44;
                  else if (count >= 5) dim = 38;

                  return L.divIcon({
                    html: `<div style="width:${dim}px; height:${dim}px; background:radial-gradient(circle at 35% 35%, #0284c7 0%, #0a2540 100%); border:2.5px solid #38bdf8; border-radius:50%; box-shadow:0 3px 10px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.4); display:flex; flex-direction:column; align-items:center; justify-content:center; color:#ffffff; font-family:'Segoe UI',system-ui,sans-serif; font-weight:700; font-size:${count >= 100 ? 12 : 11}px; cursor:pointer; text-shadow:0 1px 2px rgba(0,0,0,0.8);">` +
                          `<span style="line-height:1;">${count}</span>` +
                          `<span style="font-size:8px; opacity:0.85; line-height:1; margin-top:1px;">⚓</span>` +
                          `</div>`,
                    className: 'marker-cluster-custom',
                    iconSize: L.point(dim, dim)
                  });
                }
              });
            };

            // Remove cluster antigo se existir
            if (CAMADAS_MAPA[id] && mapa.hasLayer(CAMADAS_MAPA[id])) {
              mapa.removeLayer(CAMADAS_MAPA[id]);
            }

            const masterCluster = criarClusterMasterPortos();
            CAMADAS_MAPA[id] = masterCluster;

            // Cada subgrupo guarda seus marcadores em um FeatureGroup próprio
            for (const tKey of Object.keys(window.PortClassification.tipos)) {
              if (window.SUBGRUPOS_PORTOS[tKey]) {
                window.SUBGRUPOS_PORTOS[tKey].clearLayers();
              } else {
                window.SUBGRUPOS_PORTOS[tKey] = L.featureGroup();
              }
            }

            // Gerador de ícone de âncora nítido com contraste para qualquer zoom
            const criarIconePorto = (cat) => {
              const sz = (cat.id === 'ORGANIZADO') ? 22 : 18;
              const half = sz / 2;
              return L.divIcon({
                className: 'port-anchor-marker',
                html: `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" xmlns="http://www.w3.org/2000/svg" style="display:block; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">` +
                      `<circle cx="12" cy="12" r="11" fill="#ffffff" stroke="${cat.cor}" stroke-width="2"/>` +
                      `<circle cx="12" cy="4" r="2.2" fill="${cat.cor}"/>` +
                      `<line x1="12" y1="6.2" x2="12" y2="19" stroke="${cat.cor}" stroke-width="2" stroke-linecap="round"/>` +
                      `<line x1="7" y1="10" x2="17" y2="10" stroke="${cat.cor}" stroke-width="2" stroke-linecap="round"/>` +
                      `<path d="M5 13 Q5 19 12 19 Q19 19 19 13" fill="none" stroke="${cat.cor}" stroke-width="2" stroke-linecap="round"/>` +
                      `</svg>`,
                iconSize: [sz, sz],
                iconAnchor: [half, half],
                popupAnchor: [0, -half]
              });
            };

            const markersParaAdicionar = [];

            dados.features.forEach(f => {
              if (!f.geometry || !f.geometry.coordinates) return;
              const cat = window.PortClassification.classificar(f.properties);
              const lat = f.geometry.coordinates[1];
              const lng = f.geometry.coordinates[0];
              if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                const m = L.marker([lat, lng], {
                  pane: 'panePontos',
                  icon: criarIconePorto(cat),
                  interactive: true
                });
                m.feature = f;
                m._portoCatId = cat.id;
                m._portoProps = f.properties;
                m.on("click", (e) => {
                  if (window.MeasurementTool && window.MeasurementTool.modo) return;
                  if (window.CopilotoIA) window.CopilotoIA.ultimoAtivoInspecionado = f;

                  const isMulti = e.originalEvent && (e.originalEvent.ctrlKey || e.originalEvent.metaKey);
                  if (window.SelectionManager) {
                    if (isMulti) {
                      L.DomEvent.stopPropagation(e);
                      window.SelectionManager.toggle(f, 'instalacoes_portuarias', true);
                    } else {
                      if (typeof window.SelectionManager.selecionarUnica === 'function') {
                        window.SelectionManager.selecionarUnica(f, 'instalacoes_portuarias');
                      } else {
                        window.SelectionManager.limpar(true);
                        window.SelectionManager.toggle(f, 'instalacoes_portuarias', true);
                      }
                    }
                  }

                  requestAnimationFrame(() => {
                    try { m.openPopup(); } catch (err) {}
                  });
                });
                m.bindPopup(window.PopupRenderer.gerar('instalacoes_portuarias', f.properties));

                if (window.SUBGRUPOS_PORTOS[cat.id]) {
                  window.SUBGRUPOS_PORTOS[cat.id].addLayer(m);
                }

                const chkSub = document.getElementById(`chk-sub-${cat.id}`);
                const deveLigar = !chkSub || chkSub.checked;
                if (deveLigar) {
                  markersParaAdicionar.push(m);
                }
              }
            });

            if (typeof masterCluster.addLayers === 'function') {
              masterCluster.addLayers(markersParaAdicionar);
            } else {
              markersParaAdicionar.forEach(m => masterCluster.addLayer(m));
            }

            for (const [tKey, fg] of Object.entries(window.SUBGRUPOS_PORTOS)) {
              const cntBadge = document.getElementById(`subcnt-${tKey}`);
              if (cntBadge) cntBadge.innerText = `(${fg.getLayers().length})`;
            }
            if (chkEl && chkEl.checked) CAMADAS_MAPA[id].addTo(mapa);
            if (cntEl) cntEl.innerText = `(${dados.features.length})`;

          } else {
            if (CAMADAS_MAPA[id]) {
              // ✅ Também remove do mapa antes de recriar (evita leak)
              if (mapa.hasLayer(CAMADAS_MAPA[id])) mapa.removeLayer(CAMADAS_MAPA[id]);
              CAMADAS_MAPA[id].clearLayers();
              CAMADAS_MAPA[id].addData(dados);
              if (chkEl && chkEl.checked) CAMADAS_MAPA[id].addTo(mapa);
            } else {
              CAMADAS_MAPA[id] = L.geoJSON(dados, opcoes);
              if (chkEl && chkEl.checked) CAMADAS_MAPA[id].addTo(mapa);
            }
            if (cntEl) cntEl.innerText = `(${dados.features.length})`;

            // ✅ Travessias: anexa os markers de ponte ao featureGroup
            if (id === 'linhas_travessias') {
              CAMADAS_MAPA[id].eachLayer(layer => {
                if (layer._ponteMarker) {
                  CAMADAS_MAPA[id].addLayer(layer._ponteMarker);
                }
              });
            }
          }

          if (errEl) errEl.innerText = '';
          delete this.carregando[id];

          // ✅ Debounce: 14 camadas carregando = 14 re-renders → 1 render final
          if (!this._renderDebounce) {
            this._renderDebounce = setTimeout(() => {
              window.Styler.atualizarLegenda();
              if (window.FilterManager) {
                try { window.FilterManager.atualizarSeletorCamadas(); } catch (e) {}
              }
              this._renderDebounce = null;
            }, 250);
          }

          return dados;
        })
        .catch(err => {
          console.error(`[DataManager] Falha definitiva em "${id}":`, err);
          if (errEl) errEl.innerText = '⚠️ ausente';
          if (cntEl) cntEl.innerText = '(erro)';
          delete this.carregando[id];

          if (window.NotificationManager) {
            const idCamada = id;
            const nomeCamada = (CONFIG_CAMADAS[id] && CONFIG_CAMADAS[id].nome) || id;
            window.NotificationManager.show({
              tipo: 'erro',
              titulo: 'Falha ao carregar camada',
              mensagem:
                `"<strong>${window.Security.escapeHTML(nomeCamada)}</strong>" ` +
                `não pôde ser carregada após ${window.FetchManager._config.tentativas} tentativas por arquivo.`,
              duracao: 0,
              acoes: [{
                texto: '🔄 Tentar novamente',
                fn: () => {
                  delete DataManager.carregando[idCamada];
                  delete DADOS_GEOJSON_BRUTOS[idCamada];
                  if (CAMADAS_MAPA[idCamada]) {
                    try { mapa.removeLayer(CAMADAS_MAPA[idCamada]); } catch (e) {}
                    delete CAMADAS_MAPA[idCamada];
                  }
                  if (cntEl) cntEl.innerText = '(carregando...)';
                  if (errEl) errEl.innerText = '';
                  DataManager.carregarCamada(idCamada);
                }
              }]
            });
          }
          throw err;
        });

      return this.carregando[id];
    },

    redesenharPortos: function () {
      const dados = DADOS_GEOJSON_BRUTOS['instalacoes_portuarias'];
      if (!dados?.features?.length) return;

      const masterCluster = window.CAMADAS_MAPA['instalacoes_portuarias'];
      if (!window.SUBGRUPOS_PORTOS) return;

      for (const tKey of Object.keys(window.SUBGRUPOS_PORTOS)) {
        window.SUBGRUPOS_PORTOS[tKey].clearLayers();
      }
      if (masterCluster) masterCluster.clearLayers();

      const markersParaAdicionar = [];

      for (const f of dados.features) {
        if (!f.geometry?.coordinates) continue;
        const cat = window.PortClassification.classificar(f.properties);
        const [lng, lat] = f.geometry.coordinates;
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) continue;

        const sz = (cat.id === 'ORGANIZADO') ? 22 : 18;
        const half = sz / 2;
        const icone = L.divIcon({
          className: 'port-anchor-marker',
          html: `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" xmlns="http://www.w3.org/2000/svg" style="display:block; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">` +
                `<circle cx="12" cy="12" r="11" fill="#ffffff" stroke="${cat.cor}" stroke-width="2"/>` +
                `<circle cx="12" cy="4" r="2.2" fill="${cat.cor}"/>` +
                `<line x1="12" y1="6.2" x2="12" y2="19" stroke="${cat.cor}" stroke-width="2" stroke-linecap="round"/>` +
                `<line x1="7" y1="10" x2="17" y2="10" stroke="${cat.cor}" stroke-width="2" stroke-linecap="round"/>` +
                `<path d="M5 13 Q5 19 12 19 Q19 19 19 13" fill="none" stroke="${cat.cor}" stroke-width="2" stroke-linecap="round"/>` +
                `</svg>`,
          iconSize: [sz, sz],
          iconAnchor: [half, half],
          popupAnchor: [0, -half]
        });

        const m = L.marker([lat, lng], {
          pane: 'panePontos',
          icon: icone,
          interactive: true
        });

        m.feature = f;
        m._portoCatId = cat.id;
        m._portoProps = f.properties;

        m.bindPopup(window.PopupRenderer.gerar('instalacoes_portuarias', f.properties));

        m.on('click', (e) => {
          if (window.MeasurementTool && window.MeasurementTool.modo) return;
          if (window.CopilotoIA) window.CopilotoIA.ultimoAtivoInspecionado = f;

          const isMulti = e.originalEvent && (e.originalEvent.ctrlKey || e.originalEvent.metaKey);
          if (window.SelectionManager) {
            if (isMulti) {
              L.DomEvent.stopPropagation(e);
              window.SelectionManager.toggle(f, 'instalacoes_portuarias', true);
            } else {
              if (typeof window.SelectionManager.selecionarUnica === 'function') {
                window.SelectionManager.selecionarUnica(f, 'instalacoes_portuarias');
              } else {
                window.SelectionManager.limpar(true);
                window.SelectionManager.toggle(f, 'instalacoes_portuarias', true);
              }
            }
          }

          requestAnimationFrame(() => {
            try { m.openPopup(); } catch (err) {}
          });
        });

        if (window.SUBGRUPOS_PORTOS[cat.id]) {
          window.SUBGRUPOS_PORTOS[cat.id].addLayer(m);
        }

        const chk = document.getElementById(`chk-sub-${cat.id}`);
        if (!chk || chk.checked) {
          markersParaAdicionar.push(m);
        }
      }

      if (masterCluster && markersParaAdicionar.length > 0) {
        if (typeof masterCluster.addLayers === 'function') {
          masterCluster.addLayers(markersParaAdicionar);
        } else {
          markersParaAdicionar.forEach(m => masterCluster.addLayer(m));
        }
      }

      console.info('[DataManager] Portos atualizados no Cluster Master com âncoras de alta visibilidade');
    },

    atualizarTodasCamadas: async function (apenasAtivas = true, opcoes) {
      opcoes = opcoes || {};
      const mostrarToasts = opcoes.mostrarToasts === true;

      const btn = document.getElementById('btn-sync');
      const ico = document.getElementById('ico-sync');
      if (btn) btn.disabled = true;
      if (ico) ico.classList.add('girando');

      if (mostrarToasts && window.UI && UI.toast) {
        UI.toast("🔄 Sincronizando catálogo e atualizando camadas...");
      }

      try { await window.LayerRegistry.carregarManifest(); } catch (e) {}

      const promessas = Object.entries(CONFIG_CAMADAS).map(([id, cfg]) => {
        const chkEl = document.getElementById(`chk-${id}`);
        const deveCarregar = !apenasAtivas || (chkEl ? chkEl.checked : cfg.ativa);
        if (deveCarregar && !id.startsWith('ven_')) {
          delete this.carregando[id];
          delete DADOS_GEOJSON_BRUTOS[id];
          return this.carregarCamada(id);
        }
        return Promise.resolve();
      });
      await Promise.allSettled(promessas);

      if (btn) btn.disabled = false;
      if (ico) ico.classList.remove('girando');
      window.Styler.atualizarLegenda();

      const anoAtivo = (window.VENUnifiedManager && window.VENUnifiedManager.anoAtivo) || 'ven_2022';
      const qtdVen = DADOS_GEOJSON_BRUTOS[anoAtivo]?.features?.length || 0;
      const cntVen = document.getElementById('cnt-ven-unificado');
      if (cntVen) cntVen.innerText = qtdVen > 0 ? `(${qtdVen})` : '';

      if (mostrarToasts && window.UI && UI.toast) {
        UI.toast(`✓ WebGIS atualizado com sucesso às ${new Date().toLocaleTimeString('pt-BR')}`);
      }
    }
  };

  window.DataManager = DataManager;
  console.info('[js] DataManager carregado');
})();
/* --- FIM: js/core/data-manager.js --- */
