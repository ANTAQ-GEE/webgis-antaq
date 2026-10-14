/* ============================================================
 * WebGIS Corporativo ANTAQ — Core & Fundação Cartográfica
 * Arquivo: js/dist/bundle-core.js
 * Descrição: Segurança, estado global, mapa Leaflet, histórico e controles básicos
 * Gerado em: 11/10/2026 20:23:32
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
      const IBGE_UF = {
        '11':'RO','12':'AC','13':'AM','14':'RR','15':'PA','16':'AP','17':'TO',
        '21':'MA','22':'PI','23':'CE','24':'RN','25':'PB','26':'PE','27':'AL','28':'SE','29':'BA',
        '31':'MG','32':'ES','33':'RJ','35':'SP','41':'PR','42':'SC','43':'RS',
        '50':'MS','51':'MT','52':'GO','53':'DF'
      };
      const UFS_VALIDAS = new Set(Object.values(IBGE_UF));
      const NOMES_UF = {
        'ACRE':'AC','ALAGOAS':'AL','AMAPA':'AP','AMAZONAS':'AM','BAHIA':'BA','CEARA':'CE',
        'DISTRITO FEDERAL':'DF','ESPIRITO SANTO':'ES','GOIAS':'GO','MARANHAO':'MA',
        'MATO GROSSO DO SUL':'MS','MATO GROSSO':'MT','MINAS GERAIS':'MG','PARA':'PA',
        'PARAIBA':'PB','PARANA':'PR','PERNAMBUCO':'PE','PIAUI':'PI','RIO DE JANEIRO':'RJ',
        'RIO GRANDE DO NORTE':'RN','RIO GRANDE DO SUL':'RS','RONDONIA':'RO','RORAIMA':'RR',
        'SANTA CATARINA':'SC','SAO PAULO':'SP','SERGIPE':'SE','TOCANTINS':'TO'
      };

      // 1. Campos diretos de sigla da UF ou nome de Estado
      for (const k of ['SIGLA_UF', 'sigla_uf', 'uf', 'UF', 'uf_sigla', 'estado', 'ESTADO', 'est_uf', 'sg_uf', 'EST_ORIGEM', 'est_origem', 'EST_DESTINO', 'est_destino']) {
        const raw = props[k];
        if (!raw) continue;
        const v = String(raw).trim().toUpperCase();
        if (v.length === 2 && UFS_VALIDAS.has(v)) return v;
        const vNorm = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (NOMES_UF[vNorm]) return NOMES_UF[vNorm];
      }

      // 2. Códigos de terminal ANTAQ (ex: BRPA001 -> PA, BRES001 -> ES, BRRJ001 -> RJ)
      for (const k of ['cdterminal', 'cdi_tuaria', 'cdc_troide', 'CDTERMINAL', 'CDI_TUARIA']) {
        const v = String(props[k] || '').trim().toUpperCase();
        if (v.length >= 5 && v.startsWith('BR')) {
          const cand = v.slice(2, 4);
          if (UFS_VALIDAS.has(cand) && /\d/.test(v[4])) return cand;
        }
      }

      // 3. Códigos IBGE de Estado ou Município (idestado: "BR33" ou idcidade: "1505304" / "BR150140")
      for (const k of ['idestado', 'idcidade', 'cd_mun', 'cod_ibge']) {
        const v = String(props[k] || '').toUpperCase().replace(/^BR/, '').trim();
        if (v.length >= 2 && IBGE_UF[v.slice(0, 2)]) {
          return IBGE_UF[v.slice(0, 2)];
        }
      }

      // 4. Extração de padrões "Município/UF" ou "Município - UF"
      for (const k of ['municipio', 'MUNICIPIO', 'cidade', 'nome_municipio', 'NM_MUN', 'mun_origem', 'mun_destino']) {
        const v = String(props[k] || '');
        if (v.includes('/')) {
          const sigla = v.split('/').pop().trim().toUpperCase();
          if (sigla.length === 2 && UFS_VALIDAS.has(sigla)) return sigla;
        }
      }

      // 5. Bacias Sedimentares / Plataformas Marítimas costeiras
      const nome = String(props.nome || props.instalacao || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (nome.includes('BACIA')) {
        if (nome.includes('CAMPOS')) return 'RJ';
        if (nome.includes('SANTOS')) return 'SP';
        if (nome.includes('ESPIRITO SANTO')) return 'ES';
        if (nome.includes('RECONCAVO') || nome.includes('CAMAMU') || nome.includes('CUMURUXATIBA') || nome.includes('JACUIPE') || nome.includes('MUCURI')) return 'BA';
        if (nome.includes('SEAL')) return 'SE';
        if (nome.includes('PERNAMBUCO')) return 'PE';
        if (nome.includes('BARREIRINHAS')) return 'MA';
        if (nome.includes('PARA-MARANHAO')) return 'PA';
        if (nome.includes('PELOTAS')) return 'RS';
        if (nome.includes('CEARA')) return 'CE';
        if (nome.includes('POTIGUAR')) return 'RN';
        if (nome.includes('FOZ DO AMAZONAS')) return 'AP';
      }

      return '';
    },

    /**
     * Busca tolerante a maiúsculas/minúsculas de propriedades GeoJSON.
     * @param {Object} props - Objeto feature.properties
     * @param {...string} chaves - Lista de nomes possíveis (ex: 'nome', 'NOME', 'nome_rio')
     * @returns {any} Primeiro valor não vazio encontrado ou string vazia
     */
    getProp: function (props, ...chaves) {
      if (!props) return '';
      for (const c of chaves) {
        if (props[c] !== undefined && props[c] !== null && String(props[c]).trim() !== '') {
          return props[c];
        }
      }
      const chavesMin = chaves.map(c => String(c).toLowerCase());
      for (const [k, v] of Object.entries(props)) {
        if (chavesMin.includes(k.toLowerCase()) && v !== undefined && v !== null && String(v).trim() !== '') {
          return v;
        }
      }
      return '';
    },

    /**
     * Formatação numérica segura no padrão ABNT / pt-BR.
     * @param {number|string} v - Valor numérico
     * @param {number} [decimais=0] - Casas decimais
     * @returns {string} Valor formatado (ex: '20.404' ou '16.836,8')
     */
    formatarNumero: function (v, decimais = 0) {
      const n = Number(v);
      if (!Number.isFinite(n)) return '—';
      return n.toLocaleString('pt-BR', {
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais
      });
    },

    /**
     * Formatação de extensões em quilômetros.
     */
    formatarKm: function (v, decimais = 1) {
      const n = Number(v);
      if (!Number.isFinite(n)) return '—';
      return n.toLocaleString('pt-BR', {
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais
      }) + ' km';
    },

    /**
     * Base de coordenadas geográficas de referência dos portos e municípios hidroviários.
     */
    PORTOS_CONHECIDOS: {
      'MANAUS': [-3.1375, -60.0261],
      'ITACOATIARA': [-3.1376, -58.4415],
      'URUCARA': [-2.5361, -57.7597],
      'URUCARÁ': [-2.5361, -57.7597],
      'PARINTINS': [-2.6241, -56.7341],
      'JURUTI': [-2.1522, -56.0964],
      'OBIDOS': [-1.9027, -55.5312],
      'ÓBIDOS': [-1.9027, -55.5312],
      'ORIXIMINA': [-1.7656, -55.8661],
      'ORIXIMINÁ': [-1.7656, -55.8661],
      'SANTAREM': [-2.4150, -54.7375],
      'SANTARÉM': [-2.4150, -54.7375],
      'MONTE ALEGRE': [-2.0095, -54.0703],
      'PRAINHA': [-1.8000, -53.4800],
      'ALMEIRIM': [-1.5233, -52.5817],
      'GURUPA': [-1.4056, -51.6406],
      'GURUPÁ': [-1.4056, -51.6406],
      'BREVES': [-1.6817, -50.4800],
      'BELEM': [-1.4558, -48.4902],
      'BELÉM': [-1.4558, -48.4902],
      'PORTO VELHO': [-8.7619, -63.9039],
      'HUMAITA': [-7.5061, -63.0208],
      'HUMAITÁ': [-7.5061, -63.0208],
      'TABATINGA': [-4.2547, -69.9386],
      'BENJAMIN CONSTANT': [-4.3828, -70.0311],
      'SAO PAULO DE OLIVENCA': [-3.4619, -68.9606],
      'SÃO PAULO DE OLIVENÇA': [-3.4619, -68.9606],
      'AMATURA': [-3.3644, -68.2008],
      'AMATURÁ': [-3.3644, -68.2008],
      'SANTO ANTONIO DO ICA': [-3.1028, -67.9406],
      'SANTO ANTÔNIO DO IÇÁ': [-3.1028, -67.9406],
      'TONANTINS': [-2.8731, -67.8025],
      'FONTE BOA': [-2.5147, -66.0919],
      'JUTAI': [-2.7483, -66.7797],
      'JUTAÍ': [-2.7483, -66.7797],
      'SANTOS': [-23.9619, -46.3042],
      'PARANAGUA': [-25.5028, -48.5147],
      'PARANAGUÁ': [-25.5028, -48.5147],
      'RIO GRANDE': [-32.0350, -52.0986],
      'ITAQUI': [-2.5750, -44.3667],
      'SUAPE': [-8.3967, -34.9608]
    },

    /**
     * Retorna [lat, lon] de um porto/município com busca tolerante a acentos e sufixos /UF.
     */
    obterCoordPorto: function (nome) {
      if (!nome) return null;
      let limpo = String(nome).split('/')[0].split('-')[0].trim().toUpperCase();
      if (this.PORTOS_CONHECIDOS[limpo]) return this.PORTOS_CONHECIDOS[limpo];

      try {
        const norm = limpo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        for (const [k, v] of Object.entries(this.PORTOS_CONHECIDOS)) {
          const kNorm = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (kNorm === norm || norm.includes(kNorm) || kNorm.includes(norm)) {
            return v;
          }
        }
      } catch (e) {}
      return null;
    }
};

  window.Security = Security;
  console.info('[js] Security carregado');
})();
/* --- FIM: js/utils/security.js --- */

/* --- INÍCIO: js/utils/geom-type-detector.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: GeomTypeDetector
   Escopo: detectar tipo geométrico predominante de um GeoJSON
   Dependências: nenhuma
   Expõe: window.GeomTypeDetector
   ============================================================ */
(function () {
  'use strict';

  const GeomTypeDetector = {
    detectar: function (geojson) {
      if (!geojson || !geojson.features || !geojson.features.length) return 'ponto';
      let pontos = 0, linhas = 0, poligonos = 0;
      for (const f of geojson.features) {
        const t = (f.geometry && f.geometry.type) || '';
        if (t.indexOf('Point') !== -1) pontos++;
        else if (t.indexOf('LineString') !== -1) linhas++;
        else if (t.indexOf('Polygon') !== -1) poligonos++;
      }
      if (poligonos > 0 && poligonos >= pontos && poligonos >= linhas) return 'poligono';
      if (linhas > 0 && linhas >= pontos) return 'linha';
      return 'ponto';
    }
  };

  window.GeomTypeDetector = GeomTypeDetector;
  console.info('[js] GeomTypeDetector carregado');
})();
/* --- FIM: js/utils/geom-type-detector.js --- */

/* --- INÍCIO: js/core/fetch-manager.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: FetchManager (R3)
   Escopo: fetch com retry, backoff exponencial e timeout
   Dependências: nenhuma
   Expõe: window.FetchManager
   ============================================================ */
(function () {
  'use strict';

  const FetchManager = {
    _config: {
      tentativas: 3,
      timeoutMs: 15000,
      backoffMs: [500, 1500, 3500],
      retryOn: [408, 429, 500, 502, 503, 504],
      naoRetryEm: [400, 401, 403, 404, 410, 451]
    },

    fetchComRetry: async function (url, opts) {
      opts = opts || {};
      const cfg = Object.assign({}, this._config, opts);
      const onTentativa = typeof opts.onTentativa === 'function' ? opts.onTentativa : () => {};
      let ultimoErro = null;

      for (let i = 0; i < cfg.tentativas; i++) {
        const ac = new AbortController();
        const tid = setTimeout(() => ac.abort(), cfg.timeoutMs);

        try {
          onTentativa(i + 1, cfg.tentativas);

          const res = await fetch(url, { signal: ac.signal, cache: 'default' });
          clearTimeout(tid);

          if (cfg.naoRetryEm.includes(res.status)) return res;
          if (res.ok) return res;

          ultimoErro = new Error(`HTTP ${res.status}`);
        } catch (err) {
          clearTimeout(tid);
          if (err.name === 'AbortError') {
            ultimoErro = new Error(`Timeout (${cfg.timeoutMs}ms)`);
          } else {
            ultimoErro = err;
          }
        }

        if (i < cfg.tentativas - 1) {
          const espera = cfg.backoffMs[i] || 2000;
          await this._esperar(espera);
        }
      }

      throw ultimoErro || new Error('Falha após todas as tentativas');
    },

    fetchJSON: async function (url, opts) {
      const res = await this.fetchComRetry(url, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },

    _esperar: function (ms) {
      return new Promise(res => setTimeout(res, ms));
    }
  };

  window.FetchManager = FetchManager;
  console.info('[js] FetchManager carregado');
})();
/* --- FIM: js/core/fetch-manager.js --- */

/* --- INÍCIO: js/core/data-adapter.js --- */
/* ============================================================
   WebGIS Corporativo ANTAQ — Módulo: DataAdapter (Enterprise Data Layer)
   Escopo: Abstração universal de fontes de dados geoespaciais
           Suporta:
             1. GeoJSON Estático Local / Serverless (Modo padrão)
             2. API REST PostGIS (Backend institucional ANTAQ)
             3. ArcGIS Enterprise / FeatureServer REST API (Esri)
             4. OGC WFS 2.0 (GeoServer / INDE / Catálogo Nacional)
   Dependências: window.FetchManager, window.CONFIG_CAMADAS
   Expõe: window.DataAdapter
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'antaq_webgis_data_sources_v1';

  const DataAdapter = {
    // Modo global padrão ('static' | 'postgis_api' | 'arcgis_rest' | 'ogc_wfs')
    modoGlobal: 'static',

    // Endpoints base configuráveis para integração com TI / ArcGIS / PostGIS
    endpoints: {
      postgisBaseUrl: '/api/v1/geo',
      arcgisBaseUrl: '',
      wfsBaseUrl: '',
      authToken: ''
    },

    // Registro customizado por camada (permite híbrido: ex. Portos no ArcGIS e VEN no PostGIS)
    fontesPorCamada: {},

    // Estatísticas de telemetria de carregamento para auditoria
    telemetria: {},

    init: function () {
      try {
        const salvo = localStorage.getItem(STORAGE_KEY);
        if (salvo) {
          const parsed = JSON.parse(salvo);
          if (parsed.modoGlobal) this.modoGlobal = parsed.modoGlobal;
          if (parsed.endpoints) Object.assign(this.endpoints, parsed.endpoints);
          if (parsed.fontesPorCamada) Object.assign(this.fontesPorCamada, parsed.fontesPorCamada);
        }
      } catch (e) {
        console.warn('[DataAdapter] Não foi possível restaurar configuração:', e);
      }
      console.info(`[DataAdapter] Inicializado (Modo Global: ${this.modoGlobal.toUpperCase()})`);
    },

    /**
     * Configura a fonte de dados de uma camada específica ou global.
     * @param {string} idCamada — ID da camada ou 'GLOBAL'
     * @param {object} config — { modo, url, layerId, typeName, token, fallbackLocal }
     */
    configurarFonte: function (idCamada, config) {
      if (!config) return;
      if (idCamada === 'GLOBAL') {
        if (config.modo) this.modoGlobal = config.modo;
        if (config.postgisBaseUrl) this.endpoints.postgisBaseUrl = config.postgisBaseUrl;
        if (config.arcgisBaseUrl) this.endpoints.arcgisBaseUrl = config.arcgisBaseUrl;
        if (config.wfsBaseUrl) this.endpoints.wfsBaseUrl = config.wfsBaseUrl;
        if (config.authToken !== undefined) this.endpoints.authToken = config.authToken;
      } else {
        this.fontesPorCamada[idCamada] = Object.assign(
          { modo: 'static', fallbackLocal: true },
          this.fontesPorCamada[idCamada] || {},
          config
        );
      }
      this._salvarConfig();
    },

    _salvarConfig: function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          modoGlobal: this.modoGlobal,
          endpoints: this.endpoints,
          fontesPorCamada: this.fontesPorCamada
        }));
      } catch (e) {}
    },

    /**
     * Constrói a URL de requisição conforme o conector selecionado.
     */
    construirUrl: function (idCamada, cfgFonte, opcoes) {
      opcoes = opcoes || {};
      const modo = (cfgFonte && cfgFonte.modo) || this.modoGlobal || 'static';

      if (modo === 'postgis_api') {
        const base = (cfgFonte && cfgFonte.url) || `${this.endpoints.postgisBaseUrl}/camadas/${idCamada}`;
        const params = new URLSearchParams({ format: 'geojson' });
        if (opcoes.bbox) params.set('bbox', opcoes.bbox.join(','));
        if (opcoes.safra) params.set('safra', opcoes.safra);
        return `${base}${base.includes('?') ? '&' : '?'}${params.toString()}`;
      }

      if (modo === 'arcgis_rest') {
        // Padrão oficial ArcGIS FeatureServer REST API retornando GeoJSON nativo (EPSG:4326)
        const base = (cfgFonte && cfgFonte.url) || `${this.endpoints.arcgisBaseUrl}/${cfgFonte?.layerId ?? 0}/query`;
        const params = new URLSearchParams({
          where: (cfgFonte && cfgFonte.where) || '1=1',
          outFields: (cfgFonte && cfgFonte.outFields) || '*',
          outSR: '4326',
          f: 'geojson'
        });
        if (opcoes.bbox) {
          params.set('geometry', opcoes.bbox.join(','));
          params.set('geometryType', 'esriGeometryEnvelope');
          params.set('inSR', '4326');
          params.set('spatialRel', 'esriSpatialRelIntersects');
        }
        const token = (cfgFonte && cfgFonte.token) || this.endpoints.authToken;
        if (token) params.set('token', token);
        return `${base}${base.includes('?') ? '&' : '?'}${params.toString()}`;
      }

      if (modo === 'ogc_wfs') {
        const base = (cfgFonte && cfgFonte.url) || this.endpoints.wfsBaseUrl;
        const typeName = (cfgFonte && cfgFonte.typeName) || `antaq:${idCamada}`;
        const params = new URLSearchParams({
          service: 'WFS',
          version: '2.0.0',
          request: 'GetFeature',
          typeNames: typeName,
          outputFormat: 'application/json',
          srsName: 'EPSG:4326'
        });
        if (opcoes.bbox) {
          params.set('bbox', `${opcoes.bbox.join(',')},EPSG:4326`);
        }
        return `${base}${base.includes('?') ? '&' : '?'}${params.toString()}`;
      }

      return null;
    },

    /**
     * Converte resposta Esri JSON (caso um servidor ArcGIS antigo não suporte f=geojson)
     * para FeatureCollection GeoJSON padrão RFC 7946.
     */
    normalizarRespostaGeoJSON: function (payload) {
      if (!payload) throw new Error('Payload vazio recebido da fonte de dados');

      // Já é um FeatureCollection GeoJSON padrão
      if (payload.type === 'FeatureCollection' && Array.isArray(payload.features)) {
        return payload;
      }

      // Caso seja resposta Esri FeatureSet (features com attributes e geometry x/y/paths/rings)
      if (Array.isArray(payload.features) && (payload.geometryType || payload.fields)) {
        const features = payload.features.map(ef => {
          let geom = null;
          const g = ef.geometry;
          if (g) {
            if (typeof g.x === 'number' && typeof g.y === 'number') {
              geom = { type: 'Point', coordinates: [g.x, g.y] };
            } else if (Array.isArray(g.paths)) {
              geom = g.paths.length === 1
                ? { type: 'LineString', coordinates: g.paths[0] }
                : { type: 'MultiLineString', coordinates: g.paths };
            } else if (Array.isArray(g.rings)) {
              geom = { type: 'Polygon', coordinates: g.rings };
            }
          }
          return {
            type: 'Feature',
            properties: ef.attributes || ef.properties || {},
            geometry: geom
          };
        }).filter(f => f.geometry !== null);

        return { type: 'FeatureCollection', features };
      }

      // Caso seja array direto de registros com lat/lon (ex: tabela PostGIS serializada em JSON)
      if (Array.isArray(payload)) {
        const features = payload.map(row => {
          const lat = parseFloat(row.lat ?? row.latitude ?? row.LATITUDE);
          const lon = parseFloat(row.lon ?? row.lng ?? row.longitude ?? row.LONGITUDE);
          if (isNaN(lat) || isNaN(lon)) return null;
          return {
            type: 'Feature',
            properties: row,
            geometry: { type: 'Point', coordinates: [lon, lat] }
          };
        }).filter(Boolean);
        return { type: 'FeatureCollection', features };
      }

      throw new Error('Formato de resposta desconhecido (não é GeoJSON nem Esri FeatureSet)');
    },

    /**
     * Carrega uma camada utilizando o conector configurado, com fallback resiliente
     * para os arquivos GeoJSON locais caso a API externa não esteja acessível.
     */
    carregarCamada: async function (idCamada, arquivosFallback, opcoes) {
      opcoes = opcoes || {};
      const inicio = performance.now();
      const cfgFonte = this.fontesPorCamada[idCamada] || null;
      const modoEfetivo = (cfgFonte && cfgFonte.modo) || this.modoGlobal || 'static';
      const onTentativa = opcoes.onTentativa || (() => {});

      // 1. Tenta conector externo (PostGIS / ArcGIS / WFS) se configurado
      if (modoEfetivo !== 'static') {
        const urlExterna = this.construirUrl(idCamada, cfgFonte, opcoes);
        if (urlExterna) {
          try {
            const headers = {};
            const token = (cfgFonte && cfgFonte.token) || this.endpoints.authToken;
            if (token && modoEfetivo !== 'arcgis_rest') {
              headers['Authorization'] = `Bearer ${token}`;
            }

            const bruto = await window.FetchManager.fetchJSON(urlExterna, {
              onTentativa,
              headers
            });
            const geojson = this.normalizarRespostaGeoJSON(bruto);
            if (geojson && geojson.features) {
              this.telemetria[idCamada] = {
                fonte: modoEfetivo,
                url: urlExterna,
                feicoes: geojson.features.length,
                latenciaMs: Math.round(performance.now() - inicio),
                timestamp: new Date().toISOString(),
                fallbackAcionado: false
              };
              console.info(`[DataAdapter] Camada "${idCamada}" carregada via ${modoEfetivo.toUpperCase()} (${geojson.features.length} feições)`);
              return geojson;
            }
          } catch (errApi) {
            console.warn(`[DataAdapter] Fonte externa (${modoEfetivo}) indisponível para "${idCamada}": ${errApi.message}. Acionando fallback local...`);
            if (cfgFonte && cfgFonte.fallbackLocal === false) {
              throw errApi;
            }
          }
        }
      }

      // 2. Fallback / Modo Estático Padrão (arquivos .geojson locais)
      const listaUrls = Array.isArray(arquivosFallback) ? arquivosFallback : [arquivosFallback].filter(Boolean);
      const falhas = [];

      for (let i = 0; i < listaUrls.length; i++) {
        const url = listaUrls[i];
        try {
          const j = await window.FetchManager.fetchJSON(url, { onTentativa });
          const geojson = this.normalizarRespostaGeoJSON(j);
          if (geojson && geojson.features) {
            this.telemetria[idCamada] = {
              fonte: 'static_geojson',
              url: url,
              feicoes: geojson.features.length,
              latenciaMs: Math.round(performance.now() - inicio),
              timestamp: new Date().toISOString(),
              fallbackAcionado: modoEfetivo !== 'static'
            };
            return geojson;
          }
          falhas.push(`${url}: sem features`);
        } catch (err) {
          const msg = (err && err.message) || 'erro desconhecido';
          falhas.push(`${url}: ${msg}`);
        }
      }

      throw new Error(`Camada "${idCamada}" indisponível. ${falhas.join(' · ')}`);
    },

    /**
     * Retorna o diagnóstico de todas as fontes de dados carregadas.
     */
    obterDiagnostico: function () {
      return {
        modoGlobal: this.modoGlobal,
        endpoints: this.endpoints,
        fontesCustomizadas: Object.keys(this.fontesPorCamada).length,
        telemetriaCamadas: this.telemetria
      };
    }
  };

  DataAdapter.init();
  window.DataAdapter = DataAdapter;
})();
/* --- FIM: js/core/data-adapter.js --- */

/* --- INÍCIO: js/core/state.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: State (dados compartilhados)
   Escopo: estado global de configuração e dados carregados
   Dependências: nenhuma
   Expõe: window.CONFIG_CAMADAS, window.METADADOS_CAMADAS,
          window.CAMADAS_MAPA, window.DADOS_GEOJSON_BRUTOS
   ============================================================ */
(function () {
  'use strict';

    const CONFIG_CAMADAS = {
      instalacoes_portuarias: {
        nome: "Instalações Portuárias", grupo: "infra",
        arquivos: ["dados/instalacoes_portuarias.geojson", "./dados/instalacoes_portuarias.geojson", "../dados/instalacoes_portuarias.geojson", "dados/portos.geojson", "dados/instalacoes_portuarias_antaq.geojson", "dados/tup.geojson"],
        cor: "#10b981", opacidade: 0.95, peso: 6, tipoGeo: "ponto", ativa: true, camposVisiveis: []
      },
      ven_2022: {
        nome: "Vias Navegadas (VEN 2022)", grupo: "infra",
        arquivos: ["dados/ven_2022.geojson", "./dados/ven_2022.geojson", "../dados/ven_2022.geojson", "dados/shp_ven_2022_completo.geojson", "dados/vias_economicamente_navegadas.geojson"],
        cor: "#38bdf8", opacidade: 0.85, peso: 2.6, tipoGeo: "linha", ativa: true, camposVisiveis: []
      },
      ven_2024: {
        nome: "Vias Navegadas (VEN 2024 - Oficial V4)", grupo: "infra",
        arquivos: ["dados/ven_2024.geojson", "./dados/ven_2024.geojson", "../dados/ven_2024.geojson", "dados/ven_2024_v4.geojson", "dados/ven_2022.geojson"],
        cor: "#00e5ff", opacidade: 0.95, peso: 3.0, tipoGeo: "linha", ativa: false, camposVisiveis: []
      },
      ven_2020: {
        nome: "Vias Navegadas (VEN 2020)", grupo: "infra",
        arquivos: ["dados/ven_2020.geojson", "./dados/ven_2020.geojson", "../dados/ven_2020.geojson", "dados/shp_ven2020_completo.geojson"],
        cor: "#0ea5e9", opacidade: 0.85, peso: 2.4, tipoGeo: "linha", ativa: false, camposVisiveis: []
      },
      ven_2018: {
        nome: "Vias Navegadas (VEN 2018)", grupo: "infra",
        arquivos: ["dados/ven_2018.geojson", "./dados/ven_2018.geojson", "../dados/ven_2018.geojson", "dados/viaseconomicamentenavegadas.geojson"],
        cor: "#0284c7", opacidade: 0.80, peso: 2.2, tipoGeo: "linha", ativa: false, camposVisiveis: []
      },
      ven_2013: {
        nome: "Vias Navegadas (VEN 2013)", grupo: "infra",
        arquivos: ["dados/ven_2013.geojson", "./dados/ven_2013.geojson", "../dados/ven_2013.geojson"],
        cor: "#0369a1", opacidade: 0.75, peso: 2.0, tipoGeo: "linha", ativa: false, camposVisiveis: []
      },
      linhas_travessias: {
        nome: "Linhas de Travessias", grupo: "infra",
        arquivos: ["dados/linhas_travessias.geojson", "./dados/linhas_travessias.geojson", "../dados/linhas_travessias.geojson"],
        cor: "#f59e0b", opacidade: 0.90, peso: 2, tipoGeo: "linha_tracejada", ativa: true, camposVisiveis: []
      },
      snv_1973: {
        nome: "Sistema Nacional de Viação (1973)", grupo: "infra",
        arquivos: ["dados/snv_1973.geojson", "./dados/snv_1973.geojson", "../dados/snv_1973.geojson"],
        cor: "#94a3b8", opacidade: 0.75, peso: 1.8, tipoGeo: "linha", ativa: false, camposVisiveis: []
      },
    tku: {
      nome: "TKU — Tonelada-Quilômetro Útil", grupo: "infra",
      arquivos: ["dados/tku.geojson", "./dados/tku.geojson", "../dados/tku.geojson"],
      cor: "#f97316", opacidade: 0.85, peso: 3, tipoGeo: "linha", ativa: false,
      camposVisiveis: ['nome', 'navegacao', 'ano', 'fluxo', 'extensao', 'velocidade', 'regiao_hidrografica', 'uf_origem', 'uf_destino']
    },  
      embarcacoes: {
        nome: "Tráfego de Embarcações / AIS", grupo: "infra",
        arquivos: ["dados/embarcacoes.geojson", "./dados/embarcacoes.geojson", "../dados/embarcacoes.geojson"],
        cor: "#38bdf8", opacidade: 0.80, peso: 4, tipoGeo: "ponto", ativa: true, camposVisiveis: []
      },
      rodovias: {
        nome: "Rodovias Federais (SNV)", grupo: "multimodal",
        arquivos: ["dados/rodovias.geojson", "./dados/rodovias.geojson", "../dados/rodovias.geojson"],
        cor: "#f97316", opacidade: 0.85, peso: 2.2, tipoGeo: "linha", ativa: false, camposVisiveis: []
      },
      ferrovias: {
        nome: "Malha Ferroviária Federal", grupo: "multimodal",
        arquivos: ["dados/ferrovias.geojson", "./dados/ferrovias.geojson", "../dados/ferrovias.geojson"],
        cor: "#a855f7", opacidade: 0.90, peso: 2.5, tipoGeo: "linha", ativa: false, camposVisiveis: []
      },
      uf: {
        nome: "Unidades da Federação (IBGE)", grupo: "limites",
        arquivos: ["dados/uf.geojson", "./dados/uf.geojson", "../dados/uf.geojson"],
        cor: "#60a5fa", opacidade: 0.80, peso: 1.2, tipoGeo: "poligono_linha", ativa: true, camposVisiveis: []
      },
      tis_poligonais: {
        nome: "Terras Indígenas (FUNAI)", grupo: "restricoes",
        arquivos: ["dados/tis_poligonais.geojson", "./dados/tis_poligonais.geojson", "../dados/tis_poligonais.geojson"],
        cor: "#ef4444", opacidade: 0.35, peso: 1.5, tipoGeo: "poligono", ativa: false, camposVisiveis: []
      },
      ucs_federais: {
        nome: "Unidades de Conservação Federais (ICMBio)", grupo: "restricoes",
        arquivos: ["dados/ucs_federais.geojson", "./dados/ucs_federais.geojson", "../dados/ucs_federais.geojson"],
        cor: "#15803d", opacidade: 0.35, peso: 1.5, tipoGeo: "poligono", ativa: false, camposVisiveis: []
      }
    };

    const METADADOS_CAMADAS = {
      instalacoes_portuarias: {
        descricao: "Cadastro oficial de instalações portuárias reguladas pela ANTAQ: portos organizados, terminais de uso privado (TUP), instalações de pequeno porte (IP4), estações de transbordo de carga (ETC) e demais outorgas. Base utilizada para fiscalização, outorga e estudos de planejamento portuário.",
        fonte: "SDP / ANTAQ — Sistema de Desempenho Portuário",
        escala: "1:250.000 (detalhada) e 1:1.000.000 (planejamento)",
        datum: "SIRGAS 2000 (EPSG:4674)",
        atualizacao: "Continua — atualizada a cada nova outorga publicada",
        responsavel: "Superintendência de Outorgas (SOG) / GEE-SEPH",
        processo: "Consulta pública contínua via SEI",
        numero_features: "≈ 1.179 ativos regulados",
        changelog: [
          "2026-09 — Incorporação de 23 novos TUPs autorizados",
          "2026-06 — Revisão de coordenadas de 47 IP4 no Amazonas",
          "2026-01 — Alinhamento com nova metodologia de classificação por regime"
        ]
      },
      ven_2022: {
        descricao: "Vias Economicamente Navegadas (VEN) — trechos hidroviários com tráfego comercial comprovado por manifestos do Sistema Mercante. Série histórica oficial consolidada pela ANTAQ. Base para cálculo de tempos de percurso, matrizes O/D e indicadores de TKU.",
        fonte: "SIGTAQ / SDP / Sistema Mercante (Min. Fazenda)",
        escala: "1:1.000.000",
        datum: "SIRGAS 2000 (EPSG:4674)",
        atualizacao: "Anual — safra 2022 consolidada",
        responsavel: "Gerência Especial de Estudos (GEE) / SEPH",
        processo: "SEI 50300.007913/2023-45",
        numero_features: "≈ 20.125 km de extensão total",
        changelog: [
          "2023-05 — Publicação oficial VEN 2022",
          "Inclusão de 962 km (Guajará-Mirim / Pimenteiras do Oeste)",
          "Relação com PNV: 48,24% de aproveitamento"
        ]
      },
      ven_2024: {
        descricao: "Atualização mais recente das Vias Economicamente Navegadas (VEN 2024, versão oficial V4). Incorpora ajustes metodológicos e novas rotas identificadas na série histórica.",
        fonte: "SEPH / ANTAQ — Projeto P6",
        escala: "1:1.000.000",
        datum: "SIRGAS 2000 (EPSG:4674)",
        atualizacao: "Publicação oficial — ano-base 2024",
        responsavel: "Superintendência de Estudos e Projetos Hidroviários (SEPH)",
        processo: "SEI 50300.003706/2025-83 — Acórdão nº 782-ANTAQ",
        numero_features: "≈ 20.404 km de extensão total (+1,39% vs 2022)",
        changelog: [
          "2025-09 — Publicação oficial VEN 2024",
          "82,52% da malha concentrada na Bacia Amazônica",
          "Análise de gargalos: Pedral do Lourenço e secas severas"
        ]
      },
      linhas_travessias: {
        descricao: "Linhas regulares de travessia aquaviária outorgadas pela ANTAQ, unindo estados e municípios. Inclui transporte de passageiros, veículos e cargas em travessias interestaduais e internacionais.",
        fonte: "Superintendência de Outorgas (SOG) / ANTAQ",
        escala: "1:500.000",
        datum: "SIRGAS 2000 (EPSG:4674)",
        atualizacao: "Continua — atualizada a cada nova outorga",
        responsavel: "SOG / GEE-SEPH",
        processo: "Resoluções normativas ANTAQ",
        numero_features: "≈ 93 linhas ativas",
        changelog: [
          "2026-08 — Revisão de traçados na Bacia do São Francisco",
          "2026-02 — Inclusão de 5 novas travessias internacionais"
        ]
      },
      uf: {
        descricao: "Malha de Unidades da Federação — divisão político-administrativa oficial do Brasil. Utilizada como camada base para filtros territoriais e cálculo de estatísticas por estado.",
        fonte: "IBGE — Malha Territorial 2024",
        escala: "1:5.000.000",
        datum: "SIRGAS 2000 (EPSG:4674)",
        atualizacao: "Anual (IBGE)",
        responsavel: "GEE-SEPH (repositório local)",
        processo: "Download direto do portal IBGE",
        numero_features: "27 unidades (26 estados + DF)",
        changelog: [
          "2024-06 — Atualização anual conforme IBGE",
          "2023-05 — Nenhuma alteração de limite"
        ]
      }      ,
      tku: {
        descricao: "TKU (Tonelada-Quilômetro Útil) — medida de intensidade de carga transportada por quilômetro navegado em cada trecho hidroviário. Consolida dados de 2021, 2023 e 2025 nas 3 navegações (Cabotagem, Interior, Longo Curso).",
        fonte: "SDP / SEPH / Sistema Mercante · ANTAQ",
        escala: "1:1.000.000",
        datum: "SIRGAS 2000 (EPSG:4674)",
        atualizacao: "Anual (consolidação por safra)",
        responsavel: "GEE/SEPH — Gerência Especial de Estudos",
        processo: "Consulta pública contínua via SEI",
        numero_features: "≈ 1.345 trechos (2021+2023+2025)",
        changelog: [
          "2026-10 — Consolidação das safras 2021, 2023 e 2025",
          "Cálculo de fluxo em toneladas × km por trecho OD"
        ]
      },
      
      ucs_federais: {
        descricao: "Unidades de Conservação Federais geridas pelo ICMBio. Base para aplicação do Art. 36 da Lei nº 9.985/2000 (SNUC) em análises de licenciamento e outorga.",
        fonte: "ICMBio — Cadastro Nacional de UCs",
        escala: "1:250.000",
        datum: "SIRGAS 2000 (EPSG:4674)",
        atualizacao: "Semestral",
        responsavel: "GEE-SEPH",
        processo: "Download da base pública ICMBio",
        numero_features: "UCs federais de proteção integral e uso sustentável",
        changelog: [
          "2026-09 — Atualização semestral conforme ICMBio",
          "Inclui zonas de amortecimento quando disponíveis"
        ]
      }
    };

  const CAMADAS_MAPA = {};
  const DADOS_GEOJSON_BRUTOS = {};

  window.CONFIG_CAMADAS = CONFIG_CAMADAS;
  window.METADADOS_CAMADAS = METADADOS_CAMADAS;
  window.CAMADAS_MAPA = CAMADAS_MAPA;
  window.DADOS_GEOJSON_BRUTOS = DADOS_GEOJSON_BRUTOS;
  console.info('[js] State carregado (' + Object.keys(CONFIG_CAMADAS).length + ' camadas)');
})();
/* --- FIM: js/core/state.js --- */

/* --- INÍCIO: js/core/map.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: mapa + panes
   Escopo: inicialização do mapa Leaflet e hierarquia de panes
   Dependências: L (Leaflet global), DOM com <div id="mapa">
   Expõe: window.mapa
   ============================================================ */
(function () {
  'use strict';

  const mapa = L.map('mapa', {
    center: [-14.0, -52.0],
    zoom: 4,
    zoomControl: false,
    preferCanvas: true,
    // ✅ Otimizações de performance
    updateWhenIdle: true,        // Só redesenha quando parar de mover
    updateWhenZooming: false,    // Não atualiza durante zoom (só no fim)
    keepBuffer: 2,               // Mantém 2 tiles extras no buffer
    wheelDebounceTime: 40        // Debounce do scroll wheel
  });

  L.control.zoom({ position: 'bottomright' }).addTo(mapa);

  mapa.createPane('paneLimites');    mapa.getPane('paneLimites').style.zIndex = 400;
  mapa.createPane('paneRestricoes'); mapa.getPane('paneRestricoes').style.zIndex = 450;
  mapa.createPane('paneLinhas');     mapa.getPane('paneLinhas').style.zIndex = 500;
  mapa.createPane('panePontos');     mapa.getPane('panePontos').style.zIndex = 600;

  window.mapa = mapa;
  console.info('[js] mapa + panes criados');
})();
/* --- FIM: js/core/map.js --- */

/* --- INÍCIO: js/core/action-history.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: ActionHistory (M8 — Undo/Redo)
   Escopo: fila circular de 20 ações com undo/redo
   Dependências: Security (para escapeHTML nas notificações)
   Expõe: window.ActionHistory
   NOTA: este módulo é carregado antes de UI existir no escopo global.
         Por isso usa this._toast() (fallback seguro) em vez de UI.toast().
   ============================================================ */
(function () {
  'use strict';

  const ActionHistory = {
    _historico: [],
    _redoStack: [],
    _maxAcoes: 20,
    _aplicando: false,

    /* Toast seguro: usa UI se já existir, senão cai no console */
    _toast: function (msg) {
      if (window.UI && typeof window.UI.toast === 'function') {
        window.UI.toast(msg);
      } else {
        console.log('[ActionHistory]', msg.replace(/<[^>]+>/g, ''));
      }
    },

    registrar: function (acao) {
      if (this._aplicando) return;
      if (!acao || typeof acao.undo !== 'function' || typeof acao.redo !== 'function') return;

      this._redoStack = [];
      this._historico.push({
        tipo: acao.tipo || 'acao',
        descricao: acao.descricao || 'Ação',
        undo: acao.undo,
        redo: acao.redo,
        timestamp: Date.now()
      });

      if (this._historico.length > this._maxAcoes) this._historico.shift();
      this._atualizarUI();
    },

    undo: function () {
      if (!this._historico.length) { this._toast('ℹ️ Nada para desfazer.'); return; }

      const acao = this._historico.pop();
      this._aplicando = true;
      try {
        acao.undo();
        this._redoStack.push(acao);

        const btn = document.getElementById('btn-undo');
        if (btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 400); }

        this._toast(`↶ Desfeito: <strong>${Security.escapeHTML(acao.descricao)}</strong>`);
      } catch (e) {
        console.error('[M8] Erro ao desfazer:', e);
        this._toast(`⚠️ Erro ao desfazer: ${e.message}`);
      } finally {
        this._aplicando = false;
        this._atualizarUI();
      }
    },

    redo: function () {
      if (!this._redoStack.length) { this._toast('ℹ️ Nada para refazer.'); return; }

      const acao = this._redoStack.pop();
      this._aplicando = true;
      try {
        acao.redo();
        this._historico.push(acao);

        const btn = document.getElementById('btn-redo');
        if (btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 400); }

        this._toast(`↷ Refeito: <strong>${Security.escapeHTML(acao.descricao)}</strong>`);
      } catch (e) {
        console.error('[M8] Erro ao refazer:', e);
        this._toast(`⚠️ Erro ao refazer: ${e.message}`);
      } finally {
        this._aplicando = false;
        this._atualizarUI();
      }
    },

    limpar: function () {
      this._historico = [];
      this._redoStack = [];
      this._atualizarUI();
    },

    podeUndo: function () { return this._historico.length > 0; },
    podeRedo: function () { return this._redoStack.length > 0; },
    estaAplicando: function () { return this._aplicando; },

    _atualizarUI: function () {
      const btnUndo = document.getElementById('btn-undo');
      const btnRedo = document.getElementById('btn-redo');
      const badgeUndo = document.getElementById('badge-undo-count');
      const badgeRedo = document.getElementById('badge-redo-count');

      if (btnUndo) btnUndo.disabled = !this.podeUndo();
      if (btnRedo) btnRedo.disabled = !this.podeRedo();

      if (badgeUndo) {
        if (this._historico.length > 0) {
          badgeUndo.textContent = this._historico.length;
          badgeUndo.classList.add('visivel');
        } else {
          badgeUndo.classList.remove('visivel');
        }
      }
      if (badgeRedo) {
        if (this._redoStack.length > 0) {
          badgeRedo.textContent = this._redoStack.length;
          badgeRedo.classList.add('visivel');
        } else {
          badgeRedo.classList.remove('visivel');
        }
      }
    },

    obterUltimaDescricao: function () {
      if (!this._historico.length) return null;
      return this._historico[this._historico.length - 1].descricao;
    },

    _configurarAtalhos: function () {
      document.addEventListener('keydown', (ev) => {
        const alvo = ev.target;
        if (alvo) {
          const tag = alvo.tagName;
          const tipo = (alvo.type || '').toLowerCase();
          const ehInputTexto = tag === 'TEXTAREA' ||
            (tag === 'INPUT' && ['text', 'search', 'email', 'url', 'password', 'number'].includes(tipo));
          if (ehInputTexto || tag === 'SELECT') return;
        }

        if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && ev.key.toLowerCase() === 'z') {
          ev.preventDefault();
          this.undo();
          return;
        }
        if (((ev.ctrlKey || ev.metaKey) && ev.shiftKey && ev.key.toLowerCase() === 'z') ||
            ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && ev.key.toLowerCase() === 'y')) {
          ev.preventDefault();
          this.redo();
          return;
        }
      });
    },

    init: function () {
      this._configurarAtalhos();
      this._atualizarUI();
      console.info('[M8] Undo/Redo pronto. Ctrl+Z (undo), Ctrl+Shift+Z (redo).');
    }
  };

  window.ActionHistory = ActionHistory;

  // Auto-init ao carregar (o DOM dos botões já existe — scripts no fim do <body>)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ActionHistory.init());
  } else {
    ActionHistory.init();
  }

  console.info('[js] ActionHistory carregado');
})();
/* --- FIM: js/core/action-history.js --- */

/* --- INÍCIO: js/core/basemap-manager.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: BasemapManager
   Escopo: alternância entre satélite (Esri) e escuro (Esri Dark)
   Dependências: L, window.mapa, window.ActionHistory
   Expõe: window.BasemapManager
   ============================================================ */
(function () {
  'use strict';

  const mapa = window.mapa;
  if (!mapa) {
    console.error('[js] BasemapManager: window.mapa não existe. Verifique a ordem dos <script src>.');
    return;
  }

  const BasemapManager = {
    satelite: L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    ).addTo(mapa),
    rotulos: L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { pane: 'overlayPane' }
    ).addTo(mapa),
    escuro: L.layerGroup([
      L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'),
      L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}')
    ]),

    trocar: function (tipo, opcoes) {
      opcoes = opcoes || {};
      const atual = window._basemapAtual || 'satelite';

      if (tipo === 'satelite') {
        mapa.removeLayer(this.escuro);
        this.satelite.addTo(mapa);
        this.rotulos.addTo(mapa);
      } else {
        mapa.removeLayer(this.satelite);
        mapa.removeLayer(this.rotulos);
        this.escuro.addTo(mapa);
      }
      window._basemapAtual = tipo;

      // Sincroniza o radio no painel lateral
      const radio = document.querySelector(`input[name="basemap"][value="${tipo}"]`);
      if (radio) radio.checked = true;

      // M8: registra (só se ActionHistory existir e não for undo/redo)
      if (!opcoes.semHistorico && atual !== tipo && window.ActionHistory) {
        const self = this;
        window.ActionHistory.registrar({
          tipo: 'basemap',
          descricao: `Trocar mapa base para ${tipo === 'satelite' ? 'Satélite' : 'Escuro'}`,
          undo: () => self.trocar(atual, { semHistorico: true }),
          redo: () => self.trocar(tipo, { semHistorico: true })
        });
      }
    }
  };

  window.BasemapManager = BasemapManager;
  console.info('[js] BasemapManager carregado');
})();
/* --- FIM: js/core/basemap-manager.js --- */

/* --- INÍCIO: js/core/notification-manager.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: NotificationManager (M5)
   Escopo: notificações ricas (4 tipos, ações, histórico, empilhamento)
   Dependências: Security
   Expõe: window.NotificationManager
   ============================================================ */
(function () {
  'use strict';

  const NotificationManager = {
    _historico: [],
    _maxHistorico: 20,
    _duracaoPadrao: 5000,

    _icones: { sucesso: '✅', info: 'ℹ️', alerta: '⚠️', erro: '❌' },
    _titulosPadrao: { sucesso: 'Sucesso', info: 'Informação', alerta: 'Atenção', erro: 'Erro' },

    show: function (opts) {
      if (typeof opts === 'string') opts = { mensagem: opts };
      opts = opts || {};

      const tipo = ['sucesso', 'info', 'alerta', 'erro'].includes(opts.tipo) ? opts.tipo : 'info';
      const duracao = opts.duracao !== undefined ? opts.duracao : (tipo === 'erro' ? 0 : this._duracaoPadrao);

      const container = document.getElementById('notificacoes-container');
      if (!container) { console.log(`[Notif ${tipo}]`, opts.mensagem); return null; }

      const ativas = container.querySelectorAll('.notificacao');
      if (ativas.length >= 4) ativas[0].dispatchEvent(new CustomEvent('notif-fechar-forcado'));

      const id = 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      const el = document.createElement('div');
      el.className = `notificacao tipo-${tipo}`;
      el.id = id;

      const titulo = opts.titulo || this._titulosPadrao[tipo];
      const icone = this._icones[tipo];

      let acoesHTML = '';
      if (Array.isArray(opts.acoes) && opts.acoes.length) {
        acoesHTML = '<div class="notif-acoes">' +
          opts.acoes.map((a, idx) => `<button data-acao-idx="${idx}">${Security.escapeHTML(a.texto || 'Ação')}</button>`).join('') +
          '</div>';
      }

      const progressoHTML = duracao > 0
        ? `<div class="notif-progresso"><span style="animation-duration:${duracao}ms;"></span></div>`
        : '';

      el.innerHTML = `
        <span class="notif-icone">${icone}</span>
        <div class="notif-conteudo">
          <span class="notif-titulo">${Security.escapeHTML(titulo)}</span>
          <div class="notif-mensagem">${opts.mensagem || ''}</div>
          ${acoesHTML}
        </div>
        <button class="notif-fechar" title="Fechar">✕</button>
        ${progressoHTML}
      `;

      container.appendChild(el);

      this._adicionarAoHistorico({ tipo, titulo, mensagem: opts.mensagem, timestamp: new Date() });
      this._atualizarBotaoHistorico();

      let timeoutId = null;
      if (duracao > 0) timeoutId = setTimeout(() => this._fechar(id), duracao);

      el.querySelector('.notif-fechar').addEventListener('click', () => {
        if (timeoutId) clearTimeout(timeoutId);
        this._fechar(id);
      });

      el.addEventListener('notif-fechar-forcado', () => {
        if (timeoutId) clearTimeout(timeoutId);
        this._fechar(id);
      });

      if (Array.isArray(opts.acoes)) {
        el.querySelectorAll('.notif-acoes button').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.acaoIdx, 10);
            const acao = opts.acoes[idx];
            if (!acao) return;
            if (acao.fechar !== false) {
              if (timeoutId) clearTimeout(timeoutId);
              this._fechar(id);
            }
            try { if (typeof acao.fn === 'function') acao.fn(); }
            catch (e) { console.warn('[Notif] Erro na ação:', e); }
          });
        });
      }

      return id;
    },

    sucesso: function (msg, opts) { return this.show(Object.assign({ tipo: 'sucesso', mensagem: msg }, opts || {})); },
    info:    function (msg, opts) { return this.show(Object.assign({ tipo: 'info',    mensagem: msg }, opts || {})); },
    alerta:  function (msg, opts) { return this.show(Object.assign({ tipo: 'alerta',  mensagem: msg }, opts || {})); },
    erro:    function (msg, opts) { return this.show(Object.assign({ tipo: 'erro',    mensagem: msg, duracao: 0 }, opts || {})); },

    _fechar: function (id) {
      const el = document.getElementById(id);
      if (!el || el.classList.contains('saindo')) return;
      el.classList.add('saindo');
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 250);
    },

    fecharTodas: function () {
      const container = document.getElementById('notificacoes-container');
      if (!container) return;
      container.querySelectorAll('.notificacao').forEach(el =>
        el.dispatchEvent(new CustomEvent('notif-fechar-forcado'))
      );
    },

    _adicionarAoHistorico: function (item) {
      this._historico.unshift(item);
      if (this._historico.length > this._maxHistorico) {
        this._historico = this._historico.slice(0, this._maxHistorico);
      }
    },

    _atualizarBotaoHistorico: function () {
      const btn = document.getElementById('btn-historico-notif');
      if (!btn) return;
      if (this._historico.length > 0) btn.classList.add('visivel');
    },

    abrirHistorico: function () {
      const corpo = document.getElementById('historico-notif-corpo');
      if (!corpo) return;
      if (this._historico.length === 0) {
        corpo.innerHTML = '<div class="historico-vazio">Nenhuma notificação ainda.</div>';
      } else {
        corpo.innerHTML = this._historico.map(item => {
          const hora = item.timestamp.toLocaleTimeString('pt-BR');
          const data = item.timestamp.toLocaleDateString('pt-BR');
          return `
            <div class="historico-item tipo-${item.tipo}">
              <div class="hist-hora">${data} às ${hora}</div>
              <div class="hist-titulo">${Security.escapeHTML(item.titulo)}</div>
              <div>${item.mensagem || ''}</div>
            </div>
          `;
        }).join('');
      }
      document.getElementById('modal-historico-notif').classList.add('aberto');
    },

    fecharHistorico: function () {
      document.getElementById('modal-historico-notif').classList.remove('aberto');
    },

    limparHistorico: function () {
      this._historico = [];
      const btn = document.getElementById('btn-historico-notif');
      if (btn) btn.classList.remove('visivel');
      this.abrirHistorico();
    },

    configurarDuracaoPadrao: function (ms) {
      this._duracaoPadrao = Math.max(0, ms);
    }
  };

  window.NotificationManager = NotificationManager;
  console.info('[js] NotificationManager carregado');
})();
/* --- FIM: js/core/notification-manager.js --- */

/* --- INÍCIO: js/core/layer-registry.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: LayerRegistry
   Escopo: paleta, geração de IDs, registro de camadas, manifesto
   Dependências: window.CONFIG_CAMADAS, window.FetchManager
   Expõe: window.LayerRegistry
   ============================================================ */
(function () {
  'use strict';

  const LayerRegistry = {
    paleta: ['#0ea5e9','#f59e0b','#10b981','#8b5cf6','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1','#14b8a6','#a855f7'],

    corAleatoria: function () {
      return this.paleta[Math.floor(Math.random() * this.paleta.length)];
    },

    gerarId: function (nome) {
      return String(nome || 'camada').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    },

    registrar: function (item) {
      const id = item.id || this.gerarId(item.nome || item.arquivo);
      if (id === 'unidades_conservacao' || (item.arquivo && item.arquivo.includes('unidades_conservacao'))) return null;
      if (CONFIG_CAMADAS[id]) return id;

      CONFIG_CAMADAS[id] = {
        nome: item.nome || id,
        grupo: item.grupo || 'importadas',
        arquivos: [item.arquivo],
        cor: item.cor || this.corAleatoria(),
        opacidade: item.opacidade !== undefined ? item.opacidade : 0.85,
        peso: item.peso || 5,
        tipoGeo: item.tipoGeo || null,
        ativa: item.ativa !== false,
        camposVisiveis: item.camposVisiveis || []
      };
      return id;
    },

    carregarManifest: async function () {
      const caminhos = ['dados/manifest.json', 'manifest.json', 'dados/manifest_teste.json', 'manifest_teste.json'];
      for (const c of caminhos) {
        try {
          const r = await window.FetchManager.fetchComRetry(c, {
            tentativas: 2,
            timeoutMs: 8000
          });
          if (r.ok) {
            const txt = await r.text();
            const limpo = txt.replace(/^\ufeff/, '').trim();
            const m = JSON.parse(limpo);
            const lista = m.camadas || m.layers || [];
            for (const item of lista) this.registrar(item);
            console.info(`✓ Manifesto carregado de [${c}]: ${lista.length} camadas.`);
            return;
          }
        } catch (e) { /* tenta o próximo */ }
      }
      console.info('Nenhum manifesto externo. Operando com catálogo padrão.');
    }
  };

  window.LayerRegistry = LayerRegistry;
  console.info('[js] LayerRegistry carregado');
})();
/* --- FIM: js/core/layer-registry.js --- */

/* --- INÍCIO: js/core/layer-order-manager.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: LayerOrderManager
   Escopo: reordenação de camadas (↑ ↓, drag&drop, sincronização de z-index)
   Dependências: window.CONFIG_CAMADAS, window.CAMADAS_MAPA,
                 window.Styler, window.ActionHistory, window.mapa
   Referência "lazy": window.UI
   Expõe: window.LayerOrderManager
   ============================================================ */
(function () {
  'use strict';

  const LayerOrderManager = {
    mover: function (id, direcao, opcoes) {
      opcoes = opcoes || {};
      const item = document.getElementById(`item-camada-${id}`);
      if (!item) return;
      const grupoEl = item.parentElement;
      if (!grupoEl) return;

      const direcaoInversa = direcao === 'cima' ? 'baixo' : 'cima';
      const nome = CONFIG_CAMADAS[id]?.nome || id;

      if (direcao === 'cima') {
        const prev = item.previousElementSibling;
        if (prev && prev.classList.contains('item-camada')) {
          grupoEl.insertBefore(item, prev);
          this.sincronizarOrdemMapa(grupoEl);
          if (window.UI && UI.toast) UI.toast(`⬆️ "${nome}" movida para cima.`);

          if (!opcoes.semHistorico && window.ActionHistory) {
            const self = this;
            window.ActionHistory.registrar({
              tipo: 'ordem-camada',
              descricao: `Mover "${nome}" para cima`,
              undo: () => self.mover(id, direcaoInversa, { semHistorico: true }),
              redo: () => self.mover(id, direcao, { semHistorico: true })
            });
          }
        }
      } else if (direcao === 'baixo') {
        const next = item.nextElementSibling;
        if (next && next.classList.contains('item-camada')) {
          grupoEl.insertBefore(next, item);
          this.sincronizarOrdemMapa(grupoEl);
          if (window.UI && UI.toast) UI.toast(`⬇️ "${nome}" movida para baixo.`);

          if (!opcoes.semHistorico && window.ActionHistory) {
            const self = this;
            window.ActionHistory.registrar({
              tipo: 'ordem-camada',
              descricao: `Mover "${nome}" para baixo`,
              undo: () => self.mover(id, direcaoInversa, { semHistorico: true }),
              redo: () => self.mover(id, direcao, { semHistorico: true })
            });
          }
        }
      }
    },

    sincronizarOrdemMapa: function (grupoEl) {
      if (!grupoEl) return;
      const itens = Array.from(grupoEl.querySelectorAll('.item-camada'));
      for (let i = itens.length - 1; i >= 0; i--) {
        const layerId = itens[i].id.replace('item-camada-', '');
        const layer = CAMADAS_MAPA[layerId];
        if (layer && mapa.hasLayer(layer)) {
          if (layer.bringToFront) layer.bringToFront();
          if (layer.eachLayer) layer.eachLayer(sub => { if (sub.bringToFront) sub.bringToFront(); });
        }
      }
      if (window.Styler) window.Styler.atualizarLegenda();
    },

    obterElementoAposArrasto: function (container, y) {
      const elementos = [...container.querySelectorAll('.item-camada:not(.arrastando)')];
      return elementos.reduce((maisProximo, filho) => {
        const box = filho.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > maisProximo.offset) return { offset: offset, element: filho };
        return maisProximo;
      }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
  };

  window.LayerOrderManager = LayerOrderManager;
  console.info('[js] LayerOrderManager carregado');
})();
/* --- FIM: js/core/layer-order-manager.js --- */

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
        if (window.DataAdapter && typeof window.DataAdapter.carregarCamada === 'function') {
          return window.DataAdapter.carregarCamada(id, cfg.arquivos, {
            onTentativa: (n, total) => {
              if (n === 1) return;
              if (cntEl) cntEl.innerText = `(retry ${n}/${total}…)`;
            }
          });
        }

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
                html: `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" xmlns="http://www.w3.org/2000/svg" style="display:block; pointer-events:none; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">` +
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
              if (f.properties && window.Security && typeof window.Security.extrairUF === 'function') {
                const ufRes = window.Security.extrairUF(f.properties);
                if (ufRes) {
                  if (!f.properties.uf) f.properties.uf = ufRes;
                  if (!f.properties.estado) f.properties.estado = ufRes;
                }
              }
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
                m.bindPopup(window.PopupRenderer.gerar('instalacoes_portuarias', f.properties), {
                  maxWidth: 360,
                  autoPan: true,
                  closeButton: true
                });
                m.on("click", (e) => {
                  if (window.MeasurementTool && window.MeasurementTool.modo) return;
                  if (window.CopilotoIA) window.CopilotoIA.ultimoAtivoInspecionado = f;

                  const isMulti = e.originalEvent && (e.originalEvent.ctrlKey || e.originalEvent.metaKey);
                  if (isMulti) {
                    if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
                    try { m.closePopup(); } catch (_) {}
                    if (window.SelectionManager) {
                      window.SelectionManager.toggle(f, 'instalacoes_portuarias', false);
                    }
                    return;
                  }

                  try {
                    if (!m.isPopupOpen()) m.openPopup();
                  } catch (_) {}

                  if (window.SelectionManager && typeof window.SelectionManager.selecionarUnica === 'function') {
                    window.SelectionManager.selecionarUnica(f, 'instalacoes_portuarias');
                  }
                });

                if (window.SUBGRUPOS_PORTOS[cat.id]) {
                  window.SUBGRUPOS_PORTOS[cat.id].addLayer(m);
                }

                const chkSub = document.getElementById(`chk-sub-${cat.id}`);
                const deveLigar = chkSub ? chkSub.checked : (cat.padraoAtivo !== false);
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
            if (cntEl) {
              const nAtivos = markersParaAdicionar.length;
              const nTotal = dados.features.length;
              cntEl.innerText = (nAtivos === nTotal) ? `(${nTotal})` : `(${nAtivos}/${nTotal})`;
            }

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
          html: `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" xmlns="http://www.w3.org/2000/svg" style="display:block; pointer-events:none; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">` +
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

        m.bindPopup(window.PopupRenderer.gerar('instalacoes_portuarias', f.properties), {
          maxWidth: 360,
          autoPan: true,
          closeButton: true
        });

        m.on('click', (e) => {
          if (window.MeasurementTool && window.MeasurementTool.modo) return;
          if (window.CopilotoIA) window.CopilotoIA.ultimoAtivoInspecionado = f;

          const isMulti = e.originalEvent && (e.originalEvent.ctrlKey || e.originalEvent.metaKey);
          if (isMulti) {
            if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
            try { m.closePopup(); } catch (_) {}
            if (window.SelectionManager) {
              window.SelectionManager.toggle(f, 'instalacoes_portuarias', false);
            }
            return;
          }

          try {
            if (!m.isPopupOpen()) m.openPopup();
          } catch (_) {}

          if (window.SelectionManager && typeof window.SelectionManager.selecionarUnica === 'function') {
            window.SelectionManager.selecionarUnica(f, 'instalacoes_portuarias');
          }
        });

        if (window.SUBGRUPOS_PORTOS[cat.id]) {
          window.SUBGRUPOS_PORTOS[cat.id].addLayer(m);
        }

        const chk = document.getElementById(`chk-sub-${cat.id}`);
        const deveLigar = chk ? chk.checked : (cat.padraoAtivo !== false);
        if (deveLigar) {
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

/* --- INÍCIO: js/core/ui.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: UI (utilitários de interface)
   Escopo: toast retrocompatível, toggles de painel, painel lateral
   Dependências: window.NotificationManager, window.Security
   Referências "lazy": window.Analytics
   Expõe: window.UI
   ============================================================ */
(function () {
  'use strict';

  const UI = {
    /**
     * Toast retrocompatível — roteia para o NotificationManager.
     * Mantém 100% de compatibilidade com todas as chamadas antigas.
     */
    toast: function (msg) {
      if (typeof window.NotificationManager === 'undefined') {
        const t = document.getElementById('toast');
        if (!t) return;
        t.innerHTML = msg;
        t.style.display = 'block';
        setTimeout(() => { t.style.display = 'none'; }, 3500);
        return;
      }

      const texto = String(msg);
      let tipo = 'info';

      if (/^(✅|✓|💾|📥|📋)/.test(texto.trim())) tipo = 'sucesso';
      else if (/^(⚠️|⚠|🟡)/.test(texto.trim())) tipo = 'alerta';
      else if (/^(❌|🔴)/.test(texto.trim())) tipo = 'erro';
      else if (/^(🔄|⏳|ℹ️)/.test(texto.trim())) tipo = 'info';
      else {
        if (/\bsucesso\b|\bexportad|\bcarregad|\bremovid|\badicionad|\bcopiad|\bimportad/i.test(texto)) tipo = 'sucesso';
        else if (/\bavis|\batenç|\bfaltam\b|\binválid/i.test(texto)) tipo = 'alerta';
        else if (/\berro\b|\berros\b(?!\s*\.)|^erro|\bfalh(ou|a)\b|\bimpossível\b/i.test(texto)) tipo = 'erro';
        else if (/\bprocessando\b|\bcarregando\b|\bsincronizando\b/i.test(texto)) tipo = 'info';
      }

      const msgLimpa = texto
        .replace(/^(✅|✓|💾|📥|📋|⚠️|❌|🔄|⏳|🧹|➕|➖|🗑️|🟡|🟢|✨)\s*/i, '')
        .trim();

      return window.NotificationManager.show({
        tipo: tipo,
        mensagem: msgLimpa || texto,
        duracao: tipo === 'erro' ? 0 : 4500
      });
    },

    toggleMenuAmbiente: function (e) {
      e.stopPropagation();
      document.getElementById('drop-ambiente').classList.toggle('aberto');
    },

    toggleGraficos: function () {
      const p = document.getElementById('painel-graficos');
      p.classList.toggle('aberto');
      if (p.classList.contains('aberto') && window.Analytics) {
        window.Analytics.atualizarSeletores();
        window.Analytics.trocarAba(window.Analytics.abaAtiva);
      }
    },

    alternarSecao: function (el) {
      el.nextElementSibling.classList.toggle('fechado');
    },

    fecharTabela: function () {
      document.getElementById('painel-tabela').classList.remove('aberto');
    },

    recolherPainelLateral: function () {
      const p = document.getElementById('painel-camadas-lateral');
      const b = document.getElementById('btn-flutuante-painel');
      if (p) p.classList.add('recolhido');
      if (b) b.style.display = 'flex';

      // ✅ Avisa o body pra ajustar a largura da tabela
      document.body.classList.add('painel-lateral-recolhido');

      // ✅ Redimensiona o mapa
      if (window.mapa && window.mapa.invalidateSize) {
        setTimeout(() => window.mapa.invalidateSize(), 300);
      }
    },

    abrirPainelLateral: function () {
      const p = document.getElementById('painel-camadas-lateral');
      const b = document.getElementById('btn-flutuante-painel');
      if (p) p.classList.remove('recolhido');
      if (b) b.style.display = 'none';

      // ✅ Remove a classe (tabela volta à largura normal)
      document.body.classList.remove('painel-lateral-recolhido');

      if (window.mapa && window.mapa.invalidateSize) {
        setTimeout(() => window.mapa.invalidateSize(), 300);
      }
    }
  };

  window.UI = UI;
  console.info('[js] UI carregado');
})();
/* --- FIM: js/core/ui.js --- */

/* --- INÍCIO: js/core/ambiente-manager.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: AmbienteManager
   Escopo: alternância produção / homologação com autenticação SHA-256
   Dependências: window.UI
   Expõe: window.AmbienteManager
   ============================================================ */
(function () {
  'use strict';

  const AmbienteManager = {
    atual: 'producao',
    hashCorreto: '847ad09d04f991bbc665ab36a7e2cfb55f2e70bf488fad1b615083d999a401fe',

    sha256: async function (texto) {
      const msgBuffer = new TextEncoder().encode(texto);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    definir: async function (tipo) {
      document.getElementById('drop-ambiente')?.classList.remove('aberto');

      if (tipo === 'homologacao') {
        const auth = sessionStorage.getItem('antaq_auth_homolog');
        if (auth !== 'true') {
          const senhaDigitada = prompt("🔒 ACESSO RESTRITO - HOMOLOGAÇÃO GEE/SEPH\n\nDigite a senha técnica institucional:");
          if (!senhaDigitada) return;
          const hashDigitado = await this.sha256(senhaDigitada.trim());
          if (hashDigitado !== this.hashCorreto) {
            alert("❌ Acesso Negado: Senha incorreta.\n\nO ambiente de homologação é restrito à equipe GEE/SEPH.");
            return;
          }
          sessionStorage.setItem('antaq_auth_homolog', 'true');
          if (window.UI) window.UI.toast("🔓 Acesso autorizado! Ambiente de Homologação ativado.");
        }
      }
      this.aplicarAmbiente(tipo);
    },

    aplicarAmbiente: function (tipo) {
      this.atual = tipo;
      const txt = document.getElementById('txt-ambiente');
      const itemH = document.getElementById('item-env-homolog');
      const itemP = document.getElementById('item-env-prod');
      const btnEnv = document.getElementById('btn-env-topo');

      if (tipo === 'homologacao') {
        if (txt) txt.innerText = 'Homologação (Estudos GEE)';
        if (btnEnv) { btnEnv.style.background = '#f59e0b'; btnEnv.style.color = '#000'; }
        itemH?.classList.add('ativo'); itemP?.classList.remove('ativo');
        document.body.classList.add('modo-homologacao');
        if (window.UI) window.UI.toast("🟡 Modo Homologação Ativo: Edição liberada.");
      } else {
        if (txt) txt.innerText = 'Produção (Oficial ANTAQ)';
        if (btnEnv) { btnEnv.style.background = '#0a2540'; btnEnv.style.color = '#38bdf8'; }
        itemP?.classList.add('ativo'); itemH?.classList.remove('ativo');
        document.body.classList.remove('modo-homologacao');
        if (window.UI) window.UI.toast("🟢 Modo Produção Ativo: Padrão oficial travado.");
      }
    }
  };

  window.AmbienteManager = AmbienteManager;
  console.info('[js] AmbienteManager carregado');
})();
/* --- FIM: js/core/ambiente-manager.js --- */

/* --- INÍCIO: js/core/url-state.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: URLState (G3)
   Escopo: persistência de estado na URL (compartilhamento de mapas)
   Dependências: window.mapa, window.FilterManager, window.BasemapManager,
                 window.VENUnifiedManager
   Expõe: window.URLState
   ============================================================ */
(function () {
  'use strict';

  const URLState = {
    _timer: null,
    _restaurando: false,
    _inicializado: false,

    init: async function () {
      if (this._inicializado) {
        console.warn('[URLState] init() já foi chamado — ignorando.');
        return;
      }
      this._inicializado = true;
      console.info('[URLState] Inicializando…');

      this._configurarListeners();
      console.info('[URLState] Listeners instalados.');

      await this._restaurar();
      this._salvarAgora();
      console.info('[URLState] Estado inicial gravado na URL.');
    },

    salvar: function () {
      if (this._restaurando) return;
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this._salvarAgora(), 400);
    },

    _salvarAgora: function () {
      try {
        const centro = mapa.getCenter();
        const p = new URLSearchParams();

        p.set('lat', centro.lat.toFixed(5));
        p.set('lng', centro.lng.toFixed(5));
        p.set('z', String(Math.round(mapa.getZoom())));

        const selCamada = document.getElementById('sel-camada-busca');
        if (selCamada && selCamada.value) p.set('camada', selCamada.value);

        if (selCamada && selCamada.value === 'ven' && window.VENUnifiedManager) {
          p.set('safra', window.VENUnifiedManager.anoAtivo);
        }

        const selSub = document.getElementById('filtro-subtipo-dinamico');
        if (selSub && selSub.value && selSub.value !== 'TODOS' && selCamada && selCamada.value !== 'ven') {
          p.set('filtro', selSub.value);
        }

        const radioBase = document.querySelector('input[name="basemap"]:checked');
        if (radioBase && radioBase.value === 'escuro') p.set('base', 'escuro');

        // ✅ M11: salva aba ativa na URL
        if (window.TabManager && window.TabManager.abaAtiva && window.TabManager.abaAtiva !== 'mapa') {
          p.set('aba', window.TabManager.abaAtiva);
        }        

        const qs = p.toString();
        const novaURL = location.pathname + (qs ? '?' + qs : '');

        try {
          history.replaceState(null, '', novaURL);
        } catch (errReplace) {
          console.warn('[URLState] replaceState falhou, tentando pushState…', errReplace);
          try { history.pushState(null, '', novaURL); }
          catch (errPush) {
            console.error('[URLState] Não foi possível atualizar a URL neste ambiente.', errPush);
          }
        }
      } catch (e) {
        console.warn('[URLState] Erro ao salvar estado:', e);
      }
    },

    _restaurar: async function () {
      const params = new URLSearchParams(location.search);
      const keys = [...params.keys()];

      if (!keys.length) {
        console.info('[URLState] Sem parâmetros na URL — nada a restaurar.');
        this._restaurando = false;
        return;
      }

      console.info('[URLState] Restaurando estado da URL:', params.toString());
      this._restaurando = true;

      try {
        const lat = parseFloat(params.get('lat'));
        const lng = parseFloat(params.get('lng'));
        const zRaw = parseFloat(params.get('z'));
        const z = Math.min(Math.max(Math.round(zRaw), 1), 18);

        if (!isNaN(lat) && !isNaN(lng) && !isNaN(zRaw) && z >= 1 && z <= 18) {
          mapa.setView([lat, lng], z);
          console.info(`[URLState] Mapa posicionado em (${lat}, ${lng}) z=${z}`);
        }

        if (params.get('base') === 'escuro') {
          const radio = document.querySelector('input[name="basemap"][value="escuro"]');
          if (radio) {
            radio.checked = true;
            window.BasemapManager.trocar('escuro');
            console.info('[URLState] Basemap restaurado para escuro.');
          }
        }
        
        // ✅ M11: restaura aba ativa
        const abaUrl = params.get('aba');
        if (abaUrl && window.TabManager && ['mapa', 'analise', 'geo', 'ais'].includes(abaUrl)) {
          window.TabManager.trocar(abaUrl);
          console.info(`[URLState] Aba restaurada: ${abaUrl}`);
        }

        const camada = params.get('camada');
        const safra = params.get('safra');
        const filtro = params.get('filtro');

        if (camada) {
          const selCamada = document.getElementById('sel-camada-busca');
          if (selCamada && selCamada.querySelector(`option[value="${camada}"]`)) {
            await window.FilterManager.aoMudarCamada(camada);

            if (camada === 'ven') {
              if (safra && window.VENUnifiedManager && window.VENUnifiedManager.anoAtivo !== safra) {
                await this._aguardar(400);
                await window.VENUnifiedManager.mudarSafra(safra);
              }
            } else if (filtro) {
              await this._aguardar(300);
              const selSub = document.getElementById('filtro-subtipo-dinamico');
              if (selSub) {
                selSub.value = filtro;
                window.FilterManager.aoMudarSubfiltro(filtro);
              }
            }
          }
        }
      } catch (e) {
        console.warn('[URLState] Falha ao restaurar:', e);
      } finally {
        this._restaurando = false;
      }
    },

    _configurarListeners: function () {
      mapa.on('moveend', () => this.salvar());
      mapa.on('zoomend', () => this.salvar());

      const selCamada = document.getElementById('sel-camada-busca');
      if (selCamada) selCamada.addEventListener('change', () => this.salvar());

      const selSub = document.getElementById('filtro-subtipo-dinamico');
      if (selSub) selSub.addEventListener('change', () => this.salvar());

      document.querySelectorAll('input[name="basemap"]').forEach(r => {
        r.addEventListener('change', () => this.salvar());
      });
    },

    obterLinkAtual: function () { return location.href; },

    _aguardar: function (ms) { return new Promise(res => setTimeout(res, ms)); }
  };

  window.URLState = URLState;

  // Rede de segurança: se o IIFE do app esquecer de chamar URLState.init(),
  // auto-inicializa após o boot
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
      if (!URLState._inicializado) {
        console.warn('[URLState] Auto-init acionado (o init() principal não foi chamado).');
        URLState.init();
      }
    }, 1500);
  } else {
    window.addEventListener('load', () => {
      setTimeout(() => {
        if (!URLState._inicializado) {
          console.warn('[URLState] Auto-init acionado (o init() principal não foi chamado).');
          URLState.init();
        }
      }, 1500);
    });
  }

  console.info('[js] URLState carregado');
})();
/* --- FIM: js/core/url-state.js --- */

/* --- INÍCIO: js/core/webgis-version.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: WebGIS_VERSION
   Escopo: metadados de versão, build, commit e changelog
   Dependências: nenhuma
   Expõe: window.WebGIS_VERSION
   ============================================================ */
(function () {
  'use strict';

  const WebGIS_VERSION = {
    versao: '1.3.0',
    canal: 'teste',
    build: '2026.10.08',
    commit: 'a3f8b2c',
    atualizado: '08/10/2026',
    responsavel: 'GEE/SEPH — Gerência Especial de Estudos',
    contato: 'gee.seph@antaq.gov.br',
    repositorio: 'https://github.com/antag-gee/webgis-antaq',
    licenca: 'Uso institucional — ANTAQ',
    descricao: `O WebGIS Corporativo da ANTAQ é uma plataforma de inteligência territorial voltada à análise integrada da infraestrutura aquaviária brasileira. Integra bases de instalações portuárias, vias economicamente navegadas, linhas de travessia, restrições socioambientais e limites administrativos, com ferramentas de medição, análise espacial e copiloto regulatório.`,

    changelog: [
      {
        versao: '1.3.0',
        canal: 'teste',
        data: '2026-10-08',
        notas: [
          'M12 — Integração TKU com 1.345 trechos (2021/2023/2025)',
          'Choropleth linear por intensidade de fluxo',
          'Filtros por ano e navegação + modo "cor por ano"',
          'KPIs e gráficos de evolução na aba Análise',
          'Aba Estudos com cards TKU + VEN + links oficiais',
          'Pipeline Python para consolidação TKU',
          'Painel analítico responsivo'
        ]
      },
      {
        versao: '0.9.9',
        canal: 'teste',
        data: '2026-10-05',
        notas: [
          'GD3 — Diff visual entre safras VEN',
          'Comparação geométrica com tolerância de 500m via Turf.js',
          'Exportação CSV do diff + desenho no mapa',
          'Atalho Ctrl+Shift+D'
        ]
      },
      {
         
        versao: '0.9.0',
        canal: 'teste',
        data: '2026-09-30',
        notas: [
          'M1 — Ferramenta de medição (distância, área, raio)',
          'M3 — Card de metadados por camada',
          'G1 — Agrupamento inteligente de pontos (MarkerCluster)',
          'G3 — Persistência de estado na URL',
          'Impressão — Layout limpo para PDF/papel'
           
        ]
      },
      {  versao: '1.0.0',
         canal: 'teste',
         data: '2026-10-06',
         notas: [
            'Marco v1.0 — Fase 1 do roadmap completa',
            'R1 (modularização), R3 (retry), GD3 (diff), Q1(A) (smoke tests)',
            'Publicação contínua no GitHub Pages'
       ]
      },
      {
        versao: '1.1.0',
        canal: 'teste',
        data: '2026-10-07',
        notas: [
          'M9 — Ferramenta de Buffer geodésico (com dissolve e filtros)',
          'Copiloto 1c — Comandos geográficos avançados (contenção, cruza UF, buffer por ponto)',
          'Copiloto 1e — Histórico + CSV + Compartilhar via URL',
          'Símbolos institucionais: âncora (portos), ponte (travessias), barco (embarcações)',
          'Clusters com ícone temático + número',
          'Correção de encoding em nomes de rios e regiões hidrográficas',
          'Favicon institucional (SVG inline)'
        ]
      },
      {
        versao: '1.2.0',
        canal: 'teste',
        data: '2026-10-08',
        notas: [
          'M9 — Ferramenta de Buffer completo (filtros + lote + chips + feições)',
          'M10 — Geoprocessamento: intersecção, diferença, união e pontos em polígono',
          'M11 — Sistema de abas (Mapa, Análise, Geo, AIS)',
          'Atalhos Ctrl+1/2/3/4 para trocar de aba',
          'Integração com URL state e memória em localStorage',
          'Correção definitiva de encoding em nomes de rios e regiões',
          'Rodovias e ferrovias agora ligam corretamente',
          'Copiloto IA: bloqueio de duplicação em 3 camadas'
        ]
      },         
    ]
  };

  window.WebGIS_VERSION = WebGIS_VERSION;
  console.info('[js] WebGIS_VERSION carregado (v' + WebGIS_VERSION.versao + ')');
})();
/* --- FIM: js/core/webgis-version.js --- */

/* --- INÍCIO: js/core/webgis-about.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: WebGISAbout (M7)
   Escopo: rodapé de versionamento + modal "Sobre este WebGIS"
   Dependências: window.WebGIS_VERSION, window.Security, window.UI
   Expõe: window.WebGISAbout
   ============================================================ */
(function () {
  'use strict';

  const WebGISAbout = {
    _jaInicializado: false,

    init: function () {
      if (this._jaInicializado) return;
      this._jaInicializado = true;

      this._renderizarRodape();
      this._configurarAtalhos();
      this._verificarNovidadeVersao();

      console.info(`[WebGIS] Versão ${window.WebGIS_VERSION.versao} (${window.WebGIS_VERSION.canal}) — build ${window.WebGIS_VERSION.build}`);
    },

    abrir: function () {
      const corpo = document.getElementById('sobre-corpo');
      if (!corpo) return;

      const V = window.WebGIS_VERSION;
      const badgeCanal = V.canal === 'producao'
        ? '<span class="badge-canal producao">Produção</span>'
        : '<span class="badge-canal teste">Homologação</span>';

      const changelogHTML = V.changelog.map(item => `
        <li class="changelog-item">
          <div class="changelog-versao">
            <span class="num ${item.canal === 'teste' ? 'teste' : ''}">v${window.Security.escapeHTML(item.versao)}</span>
            <span class="data">${window.Security.escapeHTML(item.data)}</span>
          </div>
          <ul class="changelog-notas">
            ${item.notas.map(n => `<li>${window.Security.escapeHTML(n)}</li>`).join('')}
          </ul>
        </li>
      `).join('');

      corpo.innerHTML = `
        <div class="sobre-bloco">
          <div class="sobre-titulo">Sobre esta aplicação</div>
          <p class="sobre-descricao">${window.Security.escapeHTML(V.descricao)}</p>
        </div>

        <div class="sobre-bloco">
          <div class="sobre-titulo">Informações técnicas</div>
          <div class="sobre-grid">
            <div class="sobre-info">
              <div class="rotulo">Versão</div>
              <div class="valor">${window.Security.escapeHTML(V.versao)} ${badgeCanal}</div>
            </div>
            <div class="sobre-info">
              <div class="rotulo">Build</div>
              <div class="valor mono">${window.Security.escapeHTML(V.build)}</div>
            </div>
            <div class="sobre-info">
              <div class="rotulo">Commit</div>
              <div class="valor mono">
                ${window.Security.escapeHTML(V.commit)}
                <button class="btn-copiar-inline" onclick="WebGISAbout._copiarCommit()" title="Copiar hash completo">Copiar</button>
              </div>
            </div>
            <div class="sobre-info">
              <div class="rotulo">Última atualização dos dados</div>
              <div class="valor">${window.Security.escapeHTML(V.atualizado)}</div>
            </div>
          </div>
        </div>

        <div class="sobre-bloco">
          <div class="sobre-titulo">Governança e contato</div>
          <div class="sobre-creditos">
            <strong>Responsável técnico:</strong> ${window.Security.escapeHTML(V.responsavel)}<br>
            <strong>Contato:</strong> <a class="sobre-link" href="mailto:${window.Security.escapeHTML(V.contato)}">${window.Security.escapeHTML(V.contato)}</a><br>
            <strong>Repositório:</strong> <a class="sobre-link" href="${window.Security.escapeHTML(V.repositorio)}" target="_blank" rel="noopener">${window.Security.escapeHTML(V.repositorio)}</a><br>
            <strong>Licença:</strong> ${window.Security.escapeHTML(V.licenca)}
          </div>
        </div>

        <div class="sobre-bloco">
          <div class="sobre-titulo">Changelog (últimas versões)</div>
          <ul class="changelog-lista">${changelogHTML}</ul>
        </div>
      `;

      document.getElementById('modal-sobre').classList.add('aberto');
    },

    fechar: function () {
      document.getElementById('modal-sobre').classList.remove('aberto');
    },

    _renderizarRodape: function () {
      const V = window.WebGIS_VERSION;
      const rodape = document.getElementById('rodape-versao');
      if (!rodape) return;

      const set = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = txt;
      };

      set('rodape-versao-num',
        `<strong>WebGIS ANTAQ</strong> v${window.Security.escapeHTML(V.versao)}
         <span class="badge-canal ${V.canal === 'producao' ? 'producao' : 'teste'}">
           ${V.canal === 'producao' ? 'Produção' : 'Homologação'}
         </span>`);

      set('rodape-build', `build ${window.Security.escapeHTML(V.build)} · <span class="mono">${window.Security.escapeHTML(V.commit)}</span>`);
      // ✅ Data de "hoje" no formato do usuário
      const agora = new Date();
      const dataFormatada = agora.toLocaleDateString('pt-BR');
      const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      set('rodape-dados', `📅 Dados: ${window.Security.escapeHTML(V.atualizado)} · Acesso: ${dataFormatada} ${horaFormatada}`);
      set('rodape-responsavel', window.Security.escapeHTML(V.responsavel));

      rodape.style.display = 'flex';
    },

    _configurarAtalhos: function () {
      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          const m = document.getElementById('modal-sobre');
          if (m && m.classList.contains('aberto')) {
            ev.stopPropagation();
            this.fechar();
          }
        }
        if (ev.key === 'F1') {
          ev.preventDefault();
          this.abrir();
        }
      });

      const modal = document.getElementById('modal-sobre');
      if (modal) {
        modal.addEventListener('click', (ev) => {
          if (ev.target === modal) this.fechar();
        });
      }
    },

    _verificarNovidadeVersao: function () {
      try {
        const chave = 'antaq_webgis_versao_vista';
        const versaoVista = localStorage.getItem(chave);
        const versaoAtual = window.WebGIS_VERSION.versao;

        if (versaoVista !== versaoAtual) {
          localStorage.setItem(chave, versaoAtual);

          if (!versaoVista) {
            console.info('[WebGIS] Primeira visita registrada.');
            return;
          }

          console.info(`[WebGIS] Nova versão detectada: ${versaoVista} → ${versaoAtual}`);

          const btn = document.getElementById('btn-sobre');
          if (btn) btn.classList.add('aviso-novo');

          setTimeout(() => {
            if (window.UI) {
              window.UI.toast(
                `✨ Atualizado para <strong>v${window.Security.escapeHTML(versaoAtual)}</strong>. ` +
                `<a href="#" onclick="event.preventDefault(); WebGISAbout.abrir();" style="color:#38bdf8; text-decoration:underline;">Ver novidades</a>`
              );
            }
            setTimeout(() => { if (btn) btn.classList.remove('aviso-novo'); }, 8000);
          }, 2000);
        }
      } catch (e) {
        console.warn('[WebGIS] Não foi possível verificar versão:', e);
      }
    },

    _copiarCommit: function () {
      try {
        navigator.clipboard.writeText(window.WebGIS_VERSION.commit).then(() => {
          if (window.UI) window.UI.toast('📋 Hash do commit copiado.');
        });
      } catch (e) {
        if (window.UI) window.UI.toast('⚠️ Não foi possível copiar.');
      }
    },

    obterVersao: function () { return window.WebGIS_VERSION.versao; },
    obterCanal: function () { return window.WebGIS_VERSION.canal; },
    obterCommit: function () { return window.WebGIS_VERSION.commit; }
  };

  window.WebGISAbout = WebGISAbout;
  console.info('[js] WebGISAbout carregado');
})();
/* --- FIM: js/core/webgis-about.js --- */
