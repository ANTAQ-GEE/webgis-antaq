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