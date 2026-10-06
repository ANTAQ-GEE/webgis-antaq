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