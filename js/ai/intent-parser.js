/* ============================================================
   WebGIS ANTAQ — Módulo: IntentParser (Copiloto IA · etapa 1a)
   Escopo: classifica perguntas do usuário e extrai parâmetros.
           Não responde — só entende.
   Dependências: window.Security
   Expõe: window.IntentParser
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Dicionários ---------- */

  // Sinônimos de camadas (o que o usuário digita → id interno)
  const CAMADAS_SINONIMOS = {
    instalacoes_portuarias: [
      'porto', 'portos', 'instalação', 'instalações', 'instalacao', 'instalacoes',
      'terminal', 'terminais', 'tup', 'tups', 'ip4', 'etc', 'atracadouro',
      'instalações portuárias', 'instalacoes portuarias'
    ],
    ven: [
      'via', 'vias', 'ven', 'hidrovia', 'hidrovias', 'rio navegável',
      'trecho', 'trechos', 'vias navegáveis', 'vias navegaveis'
    ],
    linhas_travessias: [
      'travessia', 'travessias', 'linha', 'linhas', 'balsa', 'balsas',
      'ferry', 'ferries'
    ],
    tis_poligonais: [
      'ti', 'tis', 'terra indígena', 'terras indígenas', 'terra indigena',
      'terras indigenas', 'território indígena'
    ],
    ucs_federais: [
      'uc', 'ucs', 'unidade de conservação', 'unidades de conservação',
      'unidade de conservacao', 'unidades de conservacao', 'conservação',
      'conservacao', 'icmbio'
    ],
    uf: ['uf', 'ufs', 'estado', 'estados', 'unidade da federação'],
    rodovias: ['rodovia', 'rodovias', 'estrada', 'estradas'],
    ferrovias: ['ferrovia', 'ferrovias', 'trem', 'trens', 'malha ferroviária']
  };

  // Siglas de UF e nomes por extenso
  const UFS = {
    'ac': 'AC', 'acre': 'AC',
    'al': 'AL', 'alagoas': 'AL',
    'ap': 'AP', 'amapá': 'AP', 'amapa': 'AP',
    'am': 'AM', 'amazonas': 'AM',
    'ba': 'BA', 'bahia': 'BA',
    'ce': 'CE', 'ceará': 'CE', 'ceara': 'CE',
    'df': 'DF', 'distrito federal': 'DF',
    'es': 'ES', 'espírito santo': 'ES', 'espirito santo': 'ES',
    'go': 'GO', 'goiás': 'GO', 'goias': 'GO',
    'ma': 'MA', 'maranhão': 'MA', 'maranhao': 'MA',
    'mt': 'MT', 'mato grosso': 'MT',
    'ms': 'MS', 'mato grosso do sul': 'MS',
    'mg': 'MG', 'minas gerais': 'MG',
    'pa': 'PA', 'pará': 'PA', 'para': 'PA',
    'pb': 'PB', 'paraíba': 'PB', 'paraiba': 'PB',
    'pr': 'PR', 'paraná': 'PR', 'parana': 'PR',
    'pe': 'PE', 'pernambuco': 'PE',
    'pi': 'PI', 'piauí': 'PI', 'piaui': 'PI',
    'rj': 'RJ', 'rio de janeiro': 'RJ',
    'rn': 'RN', 'rio grande do norte': 'RN',
    'rs': 'RS', 'rio grande do sul': 'RS',
    'ro': 'RO', 'rondônia': 'RO', 'rondonia': 'RO',
    'rr': 'RR', 'roraima': 'RR',
    'sc': 'SC', 'santa catarina': 'SC',
    'sp': 'SP', 'são paulo': 'SP', 'sao paulo': 'SP',
    'se': 'SE', 'sergipe': 'SE',
    'to': 'TO', 'tocantins': 'TO'
  };

  // Sub-regiões (agrupamentos de UF)
  const REGIOES = {
    'norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
    'nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
    'centro-oeste': ['DF', 'GO', 'MT', 'MS'],
    'sudeste': ['ES', 'MG', 'RJ', 'SP'],
    'sul': ['PR', 'RS', 'SC'],
    'amazônia legal': ['AC', 'AP', 'AM', 'MA', 'MT', 'PA', 'RO', 'RR', 'TO'],
    'amazonia legal': ['AC', 'AP', 'AM', 'MA', 'MT', 'PA', 'RO', 'RR', 'TO']
  };

  /* ---------- Utilitários ---------- */

  function normalizar(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function acharCamada(textoNorm) {
    // Busca por sinônimos mais longos primeiro (evita "porto" casar antes de "instalações portuárias")
    const todosSinonimos = [];
    for (const [id, lista] of Object.entries(CAMADAS_SINONIMOS)) {
      for (const s of lista) {
        todosSinonimos.push({ id, sin: normalizar(s), len: s.length });
      }
    }
    todosSinonimos.sort((a, b) => b.len - a.len);

    for (const { id, sin } of todosSinonimos) {
      if (textoNorm.includes(sin)) return id;
    }
    return null;
  }

  function acharUF(textoNorm) {
    // UFs por sigla (2 letras) — busca com word boundary
    for (const [chave, sigla] of Object.entries(UFS)) {
      if (chave.length <= 3) {
        const re = new RegExp(`\\b${chave}\\b`);
        if (re.test(textoNorm)) return sigla;
      }
    }
    // UFs por nome por extenso
    for (const [nome, sigla] of Object.entries(UFS)) {
      if (nome.length > 3 && textoNorm.includes(nome)) return sigla;
    }
    return null;
  }

  function acharRegiao(textoNorm) {
    for (const regiao of Object.keys(REGIOES)) {
      if (textoNorm.includes(regiao)) return regiao;
    }
    return null;
  }

  function acharNumero(textoNorm) {
    // Captura "50", "100", "1.5" — pega o primeiro número encontrado
    const m = textoNorm.match(/\b(\d+(?:[.,]\d+)?)\b/);
    return m ? parseFloat(m[1].replace(',', '.')) : null;
  }

  /* ---------- Classificação principal ---------- */

  const IntentParser = {
    /**
     * Interpreta uma pergunta e retorna um objeto de intenção.
     * @param {string} pergunta
     * @returns {Object} { tipo, camada?, filtro?, n?, raio?, alvo?, ... }
     */
    interpretar: function (pergunta) {
      const texto = normalizar(pergunta);

      if (!texto) return { tipo: 'vazio' };

      // ---------- 1. Comparação de safras VEN ----------
      if (
        (texto.includes('mudou') || texto.includes('mudanca') || texto.includes('mudança') ||
         texto.includes('adicionad') || texto.includes('removid') ||
         texto.includes('compar') || texto.includes('diferenca') || texto.includes('diferença')) &&
        (texto.includes('ven') || texto.includes('hidrovia') || texto.includes('trecho') ||
         texto.includes('2022') || texto.includes('2024'))
      ) {
        const safras = this._extrairSafras(texto);
        return {
          tipo: 'comparacao',
          safraA: safras[0] || 'ven_2022',
          safraB: safras[1] || 'ven_2024'
        };
      }

      // ---------- 2. Ficha de ativo específico ----------
      const matchFicha = texto.match(/(?:sobre|fale|informac|detalh|ficha|dados)\s+(?:do|da|de|sobre\s+)?(.{3,60})$/);
      if (matchFicha && !texto.includes('quantos') && !texto.includes('quantas')) {
        return {
          tipo: 'ficha',
          alvo: matchFicha[1].trim()
        };
      }

      // ---------- 3. Ranking (top N) ----------
      const matchTop = texto.match(/\b(?:top|maiores|menores|melhores|piores|ranking)\s*(\d+)?/);
      if (matchTop) {
        const camada = acharCamada(texto);
        return {
          tipo: 'ranking',
          camada: camada || 'instalacoes_portuarias',
          n: matchTop[1] ? parseInt(matchTop[1], 10) : 10,
          criterio: texto.includes('menor') ? 'asc' : 'desc'
        };
      }

      // ---------- 4. Contagem ----------
      const matchContagem = texto.match(/\b(quant[oa]s?|numero de|total de|contar|contagem)\b/);
      if (matchContagem) {
        const camada = acharCamada(texto);
        const uf = acharUF(texto);
        const regiao = acharRegiao(texto);
        const filtro = {};

        if (uf) filtro.uf = uf;
        else if (regiao) filtro.regiao = regiao;

        // Filtra por regime de porto (tup, organizado, etc.)
        if (texto.includes('tup')) filtro.regime = 'TUP';
        else if (texto.includes('organizado')) filtro.regime = 'ORGANIZADO';
        else if (texto.includes('ip4') || texto.includes('pequeno porte')) filtro.regime = 'IP4';
        else if (texto.includes('etc') && camada === 'instalacoes_portuarias') filtro.regime = 'ETC';
        else if (texto.includes('publico') || texto.includes('público')) filtro.regime = 'PUBLICO';

        return {
          tipo: 'contagem',
          camada: camada || 'instalacoes_portuarias',
          filtro: Object.keys(filtro).length > 0 ? filtro : null
        };
      }

      // ---------- 5. Geoespacial (buffer / proximidade) ----------
      const matchGeo = texto.match(/(?:a menos de|ate|até|dentro de|proxim[oa]s? de|num raio de)\s*(\d+)\s*(?:km|quilometros?)/);
      if (matchGeo) {
        const camada = acharCamada(texto);
        const alvo = this._acharCamadaAlvo(texto);
        return {
          tipo: 'geo',
          camada: camada || 'instalacoes_portuarias',
          raio: parseInt(matchGeo[1], 10),
          alvo: alvo
        };
      }

      // ---------- 6. Zoom / localizar ----------
      if (texto.startsWith('zoom') || texto.startsWith('ir para') || texto.startsWith('localizar') || texto.startsWith('mostrar')) {
        const termo = pergunta.replace(/^(zoom|ir para|localizar|mostrar)\s+(em\s+)?/i, '').trim();
        return { tipo: 'zoom', termo };
      }

      // ---------- 7. Nota técnica ----------
      if (texto.includes('nota tecnica') || texto.includes('nota técnica') ||
          texto.includes('parecer') || texto.includes('minuta')) {
        return { tipo: 'nota_tecnica' };
      }

      // ---------- 7.5. Perguntas pré-definidas (botões rápidos) ----------
      if (texto.includes('regulados por tipo') || texto.includes('ativos portuários regulados')) {
        return { tipo: 'agrupamento', camada: 'instalacoes_portuarias', agruparPor: 'regime' };
      }
      if (texto.includes('extensão total do ven') || (texto.includes('ven 2024') && texto.includes('amazônia'))) {
        return { tipo: 'resumo_ven' };
      }
      if (texto.includes('metodologia') || texto.includes('matriz de tempos') || texto.includes('caminhos mínimos')) {
        return { tipo: 'metodologia_ven' };
      }

      // ---------- 8. Perguntas pré-definidas (botões rápidos) ----------
      if (texto.includes('ativos portu') && texto.includes('regulado')) {
        return { tipo: 'agrupamento', camada: 'instalacoes_portuarias', agruparPor: 'regime' };
      }
      if (texto.includes('extens') && texto.includes('ven 2024')) {
        return { tipo: 'resumo_ven' };
      }
      if (texto.includes('metodologia') || texto.includes('matriz de tempos')) {
        return { tipo: 'metodologia_ven' };
      }

      // ---------- 9. Desconhecido ----------
      return { tipo: 'desconhecido', textoOriginal: pergunta };
    },

    /* ---------- Helpers internos ---------- */

    _extrairSafras: function (textoNorm) {
      const safras = [];
      const anos = textoNorm.match(/\b(2013|2018|2020|2022|2024)\b/g);
      if (anos) {
        for (const ano of anos) {
          const id = 'ven_' + ano;
          if (!safras.includes(id)) safras.push(id);
        }
      }
      return safras;
    },

    _acharCamadaAlvo: function (textoNorm) {
      // Usa word boundaries (\b) pra pegar "ti"/"tis"/"uc"/"ucs" em qualquer posição
      if (textoNorm.includes('terra ind') || /\btis?\b/.test(textoNorm)) return 'tis_poligonais';
      if (textoNorm.includes('unidade de conserv') || /\bucs?\b/.test(textoNorm)) return 'ucs_federais';
      if (textoNorm.includes('hidrovia') || /\bven\b/.test(textoNorm)) return 'ven';
      if (textoNorm.includes('travessia')) return 'linhas_travessias';
      if (textoNorm.includes('rodovia')) return 'rodovias';
      if (textoNorm.includes('ferrovia')) return 'ferrovias';
      if (textoNorm.includes('municipio') || textoNorm.includes('município')) return 'br_municipios_2025';
      return null;
    },

    /* ---------- Debug ---------- */
    explicar: function (intencao) {
      const linhas = [`**Tipo:** \`${intencao.tipo}\``];
      for (const [k, v] of Object.entries(intencao)) {
        if (k === 'tipo') continue;
        if (typeof v === 'object' && v !== null) {
          linhas.push(`**${k}:** \`${JSON.stringify(v)}\``);
        } else {
          linhas.push(`**${k}:** \`${v}\``);
        }
      }
      return linhas.join('  \n');
    }
  };

  window.IntentParser = IntentParser;
  console.info('[js] IntentParser carregado (Copiloto 1a)');
})();