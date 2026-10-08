/* ============================================================
   WebGIS ANTAQ — Módulo: WebGIS_VERSION
   Escopo: metadados de versão, build, commit e changelog
   Dependências: nenhuma
   Expõe: window.WebGIS_VERSION
   ============================================================ */
(function () {
  'use strict';

  const WebGIS_VERSION = {
    versao: '1.2.0',
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
        versao: '0.9.10',
        canal: 'teste',
        data: '2026-10-05',
        notas: [
          'R1 — Modularização completa: 30+ módulos extraídos para js/',
          'R3 — FetchManager com retry, backoff exponencial e timeout',
          'Q1 — Smoke tests em Playwright (10 testes, cobre boot + módulos)',
          'CHANGELOG.md criado com formato Keep a Changelog',
          'Sem build step: classic scripts, ordem de carga documentada'
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
