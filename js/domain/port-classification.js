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
