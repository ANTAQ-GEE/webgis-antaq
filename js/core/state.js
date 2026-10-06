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
        cor: "#ef4444", opacidade: 0.35, peso: 1.5, tipoGeo: "poligono", ativa: true, camposVisiveis: []
      },
      ucs_federais: {
        nome: "Unidades de Conservação Federais (ICMBio)", grupo: "restricoes",
        arquivos: ["dados/ucs_federais.geojson", "./dados/ucs_federais.geojson", "../dados/ucs_federais.geojson"],
        cor: "#15803d", opacidade: 0.35, peso: 1.5, tipoGeo: "poligono", ativa: true, camposVisiveis: []
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
      },
      tis_poligonais: {
        descricao: "Poligonais de Terras Indígenas oficialmente reconhecidas pela FUNAI. Camada crítica para análise de interferência socioambiental de empreendimentos aquaviários.",
        fonte: "FUNAI — Fundação Nacional dos Povos Indígenas",
        escala: "1:250.000",
        datum: "SIRGAS 2000 (EPSG:4674)",
        atualizacao: "Mensal",
        responsavel: "GEE-SEPH",
        processo: "Download da base pública FUNAI",
        numero_features: "Todas as TIs homologadas, declaradas e em estudo",
        changelog: [
          "2026-09 — Atualização conforme publicação FUNAI",
          "Camada obrigatória para análise de RID (Raio de Influência Direta)"
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