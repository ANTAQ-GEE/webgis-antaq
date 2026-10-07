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
  };

  window.Security = Security;
  console.info('[js] Security carregado');
})();