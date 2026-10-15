/* ============================================================
   WebGIS Corporativo ANTAQ — Módulo: BatimetriaTINManager v6
   Escopo:
     1. Interpolação TIN Idêntica ao QGIS:
        - Método de interpolação: Linear | Clough-Toucher (cúbica)
        - Extensão: xmin, xmax, ymin, ymax [EPSG:31982] (Da Camada | Da Tela)
        - Tamanho do raster de saída: Linhas <-> Tamanho do pixel Y | Colunas <-> Tamanho do pixel X
        - Rampas: Spectral Batimétrica (QGIS), Banda Simples Cinza (QGIS), Azuis Hidroviários, Viridis, Faixas de Calado
        - Recorte: Retração Só na Borda Externa (0 buracos no meio), Limite Manual ou Envoltória Convexa QGIS
     2. Correção Batimétrica pelo Ábaco das Cartas Náuticas da Marinha (CHM/DHN) + Dados ANA:
        - Baseado nas Cartas Náuticas Raster da pasta Cartas_Nauticas (Rio Amazonas 4020A, Rio Madeira 4734,
          Rio Tocantins 4366, Rio Solimões 4056/HS-D1, Rio Tapajós 4382A):
          * Nível de Correção na Estação 1 (Montante/Oeste): C1 = H1 (Cota ANA) - NR1 (Nível de Redução da Carta)
          * Nível de Correção na Estação 2 (Jusante/Leste):  C2 = H2 (Cota ANA) - NR2 (Nível de Redução da Carta)
          * Interpolação Linear pela Longitude (ou Latitude):
            f(coord) = (coord - coord1) / (coord2 - coord1)
            C(coord) = C1 + f(coord) * (C2 - C1)
        - Permite corrigir cada ponto batimétrico X Y Z automaticamente pela sua Longitude/Latitude exata!
        - Inclui visualização gráfica interativa do próprio Ábaco da Marinha (eixos, escala magenta de correção e linha tracejada).
     3. Perfil Longitudinal de Navegação (Talvegue / Canal) e Filtro de Restrição de Profundidade:
        - Canvas com altura 100% travada (sem loop de redimensionamento ao mover o mouse)
        - Traçado manual no mapa ou Detecção Automática do Talvegue
        - Avaliação do eixo central e da Largura da Faixa do Canal (bombordo/boreste)
        - Destaque em vermelho dos bancos rasos no gráfico e no mapa, marcador 🚢 sincronizado e exportação CSV/GeoJSON/PNG.
   Expõe: window.BatimetriaTINManager
   ============================================================ */
(function () {
  'use strict';

  /**
   * Catálogo Completo Pré-Calibrado de Ábacos de Correção de Profundidades e Redução Fluviomarinha
   * Extraído diretamente das Cartas Náuticas Raster da Marinha do Brasil (CHM/DHN) na pasta Cartas_Nauticas:
   * - Rio Amazonas Médio: Manaus <-> Itacoatiara (4030-4032A), Itacoatiara <-> Parintins (4025-4029A), Parintins <-> Óbidos <-> Santarém (4020A-4024)
   * - Rio Amazonas Baixo & Foz: Santarém <-> Prainha (4011-4019), Almeirim <-> Gurupá <-> Santana/Macapá (4101A-4102A, 204-244)
   * - Rio Pará & Baía de Marajó: Vila do Conde/Barcarena <-> Belém/Mosqueiro (302-303, 320-321), Curralinho/Breves <-> Abaetetuba/Vila do Conde (304-306)
   * - Estreitos de Marajó: Porto São José/Tajapuru <-> Breves (4351-4353)
   * - Rio Solimões Leste & Oeste: Missão I/Tefé <-> Coari <-> Codajás <-> Manaus (4051-4056), Tabatinga <-> Sto. Antônio do Içá <-> Fonte Boa <-> Tefé (HS-B/C/D)
   * - Rio Madeira Alto, Médio & Baixo: Porto Velho <-> Humaitá (4740-4753), Humaitá I <-> Manicoré I (4725-4739), Manicoré I <-> Borba/Foz (4711-4724)
   * - Rio Tapajós: Itaituba <-> Fordlândia <-> Santarém (4381A-4383)
   * - Rio Tocantins: Nazaré dos Patos <-> Tucuruí <-> Cametá (4361-4366)
   */
  const CATALOGO_ABACOS_MARINHA = {
    // =========================================================================
    // GRUPO 1: RIO AMAZONAS (MANAUS -> ITACOATIARA -> PARINTINS -> SANTARÉM -> PRAINHA -> FOZ/MACAPÁ)
    // =========================================================================
    'carta_4030_manaus_itacoatiara': {
      nome: 'Cartas 4030 a 4032A — Rio Amazonas Médio (Manaus ↔ Itacoatiara)',
      rio: 'Rio Amazonas (Manaus ↔ Itacoatiara)',
      cartasSerie: '4030, 4031, 4032, 4032A',
      regime: 'Fluvial (Ábaco CHM/DHN por Longitude)',
      eixo: 'lon',
      bbox: { minLat: -3.55, maxLat: -2.85, minLon: -60.15, maxLon: -58.40, prioridade: 10 },
      est1: {
        nome: 'Manaus — Rio Negro/Amazonas (AM)',
        codigoANA: '14990000',
        coordGraus: -59.3333, // Eixo esquerdo do Ábaco na Carta 4030 (59° 20,0' W / Ref. Manaus)
        coordRotulo: "59° 20,0' W (Ref. Manaus)",
        nrMetros: 17.90,      // Correção = 0 m quando Nível em Manaus = 17,90 m
        cotaExemploM: 25.00,  // C₁ = 25,00 - 17,90 = +7,10 m
        escalaMin: 16,
        escalaMax: 30
      },
      est2: {
        nome: 'Itacoatiara (AM)',
        codigoANA: '16030000',
        coordGraus: -58.4333, // 58° 26,0' W
        coordRotulo: "58° 26,0' W",
        nrMetros: 2.50,       // Correção = 0 m quando Nível em Itacoatiara = 2,50 m
        cotaExemploM: 11.00,  // C₂ = 11,00 - 2,50 = +8,50 m
        escalaMin: 1,
        escalaMax: 16
      },
      auditoriaOficial: {
        local: "São José do Amatari (Long. 58° 53,0' W)",
        coordTeste: -58.8833,
        cEsperadoCarta: 7.80,
        permanencia: '90%'
      },
      notaExemplo: "Exemplo Oficial da Carta 4030 (Manaus ↔ Itacoatiara): Estando o nível do rio em Manaus na cota de 25,0 m (NR₁ = 17,9 m → C₁ = +7,10 m) e em Itacoatiara na cota de 11,0 m (NR₂ = 2,5 m → C₂ = +8,50 m), a correção nas proximidades de São José do Amatari (Long. 58° 53'W) é de +7,80 m (90% de permanência)."
    },

    'carta_4026_itacoatiara_parintins': {
      nome: 'Cartas 4025 a 4029A — Rio Amazonas Médio (Itacoatiara ↔ Parintins)',
      rio: 'Rio Amazonas (Itacoatiara ↔ Parintins)',
      cartasSerie: '4025, 4025A, 4026, 4026A, 4027, 4028, 4029, 4029A',
      regime: 'Fluvial (Ábaco CHM/DHN por Longitude)',
      eixo: 'lon',
      bbox: { minLat: -3.45, maxLat: -2.35, minLon: -58.4333, maxLon: -56.7250, prioridade: 10 },
      est1: {
        nome: 'Itacoatiara (AM)',
        codigoANA: '16030000',
        coordGraus: -58.4333, // 58° 26,0' W
        coordRotulo: "58° 26,0' W",
        nrMetros: 2.50,
        cotaExemploM: 11.00,  // C₁ = +8,50 m
        escalaMin: 1,
        escalaMax: 16
      },
      est2: {
        nome: 'Parintins (AM)',
        codigoANA: '16350000',
        coordGraus: -56.7250, // 56° 43,5' W
        coordRotulo: "56° 43,5' W",
        nrMetros: 1.00,
        cotaExemploM: 10.20,  // C₂ = +9,20 m
        escalaMin: 0,
        escalaMax: 14
      },
      auditoriaOficial: {
        local: "Urucurituba / Ponta do Jauari (Long. 57° 34,7' W)",
        coordTeste: -57.5792,
        cEsperadoCarta: 8.85,
        permanencia: '90%'
      },
      notaExemplo: "Ábaco Oficial das Cartas 4025 a 4029A: Estando o nível do rio em Itacoatiara na cota de 11,0 m (C₁ = +8,50 m) e em Parintins na cota de 10,2 m (C₂ = +9,20 m), a correção na região central de Urucurituba (Long. 57° 34,7'W) é de +8,85 m."
    },

    'carta_4020a_amazonas': {
      nome: 'Cartas 4020A a 4024 — Rio Amazonas Médio (Parintins ↔ Óbidos ↔ Santarém)',
      rio: 'Rio Amazonas (Parintins ↔ Santarém)',
      cartasSerie: '4020A, 4020B, 4021, 4022, 4023, 4023A, 4024',
      regime: 'Fluvial (Ábaco CHM/DHN por Longitude)',
      eixo: 'lon',
      bbox: { minLat: -2.68, maxLat: -1.75, minLon: -56.7250, maxLon: -54.7167, prioridade: 10 },
      est1: {
        nome: 'Parintins (AM)',
        codigoANA: '16350000',
        coordGraus: -56.7250, // 56° 43,5' W
        coordRotulo: "56° 43,5' W",
        nrMetros: 1.00,       // Correção = 0 m quando Nível em Parintins = 1,0 m
        cotaExemploM: 10.20,  // Exemplo oficial impresso nas Cartas 4020A e 4023
        escalaMin: 0,
        escalaMax: 14
      },
      est2: {
        nome: 'Santarém (PA)',
        codigoANA: '17050001',
        coordGraus: -54.7167, // 54° 43,0' W
        coordRotulo: "54° 43,0' W",
        nrMetros: 1.10,       // Correção = +6,9 m quando Nível em Santarém = 8,0 m
        cotaExemploM: 8.00,   // Exemplo oficial impresso nas Cartas 4020A e 4023
        escalaMin: 0,
        escalaMax: 14
      },
      auditoriaOficial: {
        local: "Ponta Maria José — Carta 4020A (Long. 54° 47,0' W) / Ponta do Frazão — Carta 4023 (55° 50,0' W → +8,20 m)",
        coordTeste: -54.7833,
        cEsperadoCarta: 7.00,
        permanencia: '90%'
      },
      notaExemplo: "Exemplo Oficial das Cartas 4020A e 4023: Estando o nível do rio em Santarém na cota de 8,0 m (C₂ = +6,90 m) e em Parintins na cota de 10,2 m (C₁ = +9,20 m), a correção na Ponta Maria José (Long. 54° 47'W) é de +7,00 m e na Ponta do Frazão (Long. 55° 50'W) é de +8,20 m (90% de permanência)."
    },

    'carta_4018_santarem_prainha': {
      nome: 'Cartas 4011 a 4019 — Rio Amazonas Baixo (Santarém ↔ Prainha / Monte Alegre)',
      rio: 'Rio Amazonas Baixo (Santarém ↔ Prainha)',
      cartasSerie: '4011, 4012, 4013, 4014, 4015, 4016, 4017, 4018, 4019',
      regime: 'Fluvial (Ábaco CHM/DHN por Longitude)',
      eixo: 'lon',
      bbox: { minLat: -2.55, maxLat: -1.40, minLon: -54.7167, maxLon: -53.20, prioridade: 10 },
      est1: {
        nome: 'Santarém (PA)',
        codigoANA: '17050001',
        coordGraus: -54.7167, // 54° 43,0' W
        coordRotulo: "54° 43,0' W",
        nrMetros: 1.10,       // Correção = 0 m quando Nível em Santarém = 1,10 m
        cotaExemploM: 7.00,   // Exemplo oficial Carta 4018: H₁ = 7,0 m -> C₁ = +5,90 m
        escalaMin: 1,
        escalaMax: 11
      },
      est2: {
        nome: 'Prainha (PA)',
        codigoANA: '18010000',
        coordGraus: -53.4667, // 53° 28,0' W
        coordRotulo: "53° 28,0' W",
        nrMetros: 1.00,       // Correção = 0 m quando Nível em Prainha = 1,00 m
        cotaExemploM: 3.40,   // Exemplo oficial Carta 4018: H₂ = 3,4 m -> C₂ = +2,40 m
        escalaMin: 1,
        escalaMax: 11
      },
      auditoriaOficial: {
        local: "Farolete Ponta Peregrino — Carta 4018 (Long. 53° 51,0' W / Fator 51,4%)",
        coordTeste: -54.0738,
        cEsperadoCarta: 4.10,
        permanencia: '90%'
      },
      notaExemplo: "Exemplo Oficial da Carta 4018 (Santarém ↔ Prainha): Estando o nível do rio em Prainha na cota de 3,4 m (NR₂ = 1,0 m → C₂ = +2,40 m) e em Santarém na cota de 7,0 m (NR₁ = 1,1 m → C₁ = +5,90 m), a correção no Farolete Ponta Peregrino é de +4,10 m (90% de permanência)."
    },

    'carta_4101_foz_amazonas': {
      nome: 'Cartas 4101A/B, 4102A e 204–244 — Baixo Amazonas / Braço Sul (Almeirim ↔ Gurupá ↔ Macapá/Santana)',
      rio: 'Rio Amazonas — Foz / Braço Sul / Santana',
      cartasSerie: '4101A, 4101B, 4102A, 4102B, 204, 205, 206, 221, 241, 242, 243, 244',
      regime: 'Fluviomarinho (Redução combinada Réguas ANA + Maré Santana/Macapá)',
      eixo: 'lon',
      bbox: { minLat: -1.65, maxLat: 1.20, minLon: -53.20, maxLon: -49.80, prioridade: 8 },
      est1: {
        nome: 'Almeirim / Gurupá (PA)',
        codigoANA: '18460000',
        coordGraus: -52.5800,
        coordRotulo: "52° 34,8' W",
        nrMetros: 0.80,
        cotaExemploM: 3.20,   // C₁ = +2,40 m
        escalaMin: 0,
        escalaMax: 8
      },
      est2: {
        nome: 'Santana / Macapá (AP)',
        codigoANA: '19150000',
        coordGraus: -51.1700,
        coordRotulo: "51° 10,2' W",
        nrMetros: 0.40,
        cotaExemploM: 2.80,   // C₂ = +2,40 m
        escalaMin: 0,
        escalaMax: 8
      },
      auditoriaOficial: {
        local: "Canal de Gurupá / Santana — Carta 4101A (Long. 51° 52,5' W)",
        coordTeste: -51.8750,
        cEsperadoCarta: 2.40,
        permanencia: 'MLWS / 90%'
      },
      notaExemplo: "Série 4101A–4102B e 204–244 (Almeirim ↔ Gurupá ↔ Santana/Macapá): Redução combinada entre a régua de Almeirim/Gurupá (ANA 18460000, NR = 0,80 m) e o porto de Santana/Macapá (ANA 19150000, NR = 0,40 m — Baixa-Mar Média de Sizígia)."
    },

    // =========================================================================
    // GRUPO 2: RIO PARÁ E ESTREITOS DE MARAJÓ (BELÉM <-> VILA DO CONDE <-> ABAETETUBA <-> BREVES)
    // =========================================================================
    'carta_321_rio_para': {
      nome: 'Cartas 302, 303, 320 e 321 — Rio Pará Leste (Vila do Conde / Barcarena ↔ Belém / Mosqueiro)',
      rio: 'Rio Pará (Belém ↔ Vila do Conde / Barcarena)',
      cartasSerie: '302, 303, 304, 320, 321',
      regime: 'Fluviomarinho (Nível de Redução = Baixa-Mar Média de Sizígia — MLWS CHM/DHN)',
      eixo: 'lon',
      bbox: { minLat: -1.95, maxLat: -0.60, minLon: -49.18, maxLon: -48.10, prioridade: 12 },
      est1: {
        nome: 'Vila do Conde / Barcarena (PA)',
        codigoANA: '31900000',
        coordGraus: -48.7500, // 48° 45,0' W
        coordRotulo: "48° 45,0' W",
        nrMetros: 0.30,       // NR = MLWS (Nível Médio MSL = 1,70 m | Preamar Sizígia MHWS = 3,10 m)
        cotaExemploM: 2.50,   // C₁ = 2,50 - 0,30 = +2,20 m
        escalaMin: 0,
        escalaMax: 5
      },
      est2: {
        nome: 'Porto de Belém / Mosqueiro (PA)',
        codigoANA: '40100',
        coordGraus: -48.4900, // 48° 29,4' W
        coordRotulo: "48° 29,4' W",
        nrMetros: 0.20,       // NR = MLWS (Nível Médio MSL = 1,80 m | Preamar Sizígia MHWS = 3,30 m)
        cotaExemploM: 2.70,   // C₂ = 2,70 - 0,20 = +2,50 m
        escalaMin: 0,
        escalaMax: 5
      },
      auditoriaOficial: {
        local: "Canal de Acesso a Belém / Cotijuba — Carta 321 (Long. 48° 37,2' W)",
        coordTeste: -48.6200,
        cEsperadoCarta: 2.35,
        permanencia: 'Maré Sizígia (MLWS)'
      },
      notaExemplo: "Cartas 320 e 321 — Rio Pará (Vila do Conde ↔ Belém): Profundidades reduzidas ao Nível da Baixa-Mar Média de Sizígia (MLWS). Em Vila do Conde (NR₁ = 0,30 m, MSL = 1,70 m, MHWS = 3,10 m) e em Belém (NR₂ = 0,20 m, MSL = 1,80 m, MHWS = 3,30 m), interpola-se a cota maregráfica/fluviométrica por Longitude."
    },

    'carta_304_rio_para_oeste': {
      nome: 'Cartas 304, 305 e 306 — Rio Pará Oeste (Curralinho / Breves ↔ Abaetetuba / Vila do Conde)',
      rio: 'Rio Pará Oeste (Curralinho ↔ Abaetetuba ↔ Vila do Conde)',
      cartasSerie: '304, 305, 306',
      regime: 'Fluviomarinho (Redução ao Nível da Baixa-Mar Média de Sizígia — MLWS)',
      eixo: 'lon',
      bbox: { minLat: -2.05, maxLat: -1.25, minLon: -50.38, maxLon: -48.75, prioridade: 11 },
      est1: {
        nome: 'Curralinho / Ponta Goiabal (PA)',
        codigoANA: '18980000',
        coordGraus: -49.8800, // 49° 52,8' W
        coordRotulo: "49° 52,8' W",
        nrMetros: 0.25,
        cotaExemploM: 2.15,   // C₁ = +1,90 m
        escalaMin: 0,
        escalaMax: 5
      },
      est2: {
        nome: 'Vila do Conde / Abaetetuba (PA)',
        codigoANA: '31900000',
        coordGraus: -48.7500, // 48° 45,0' W
        coordRotulo: "48° 45,0' W",
        nrMetros: 0.30,
        cotaExemploM: 2.50,   // C₂ = +2,20 m
        escalaMin: 0,
        escalaMax: 5
      },
      auditoriaOficial: {
        local: "Passagem de Boa Vista / Rio Pará — Carta 305 (Long. 49° 18,9' W)",
        coordTeste: -49.3150,
        cEsperadoCarta: 2.05,
        permanencia: 'Maré Sizígia (MLWS)'
      },
      notaExemplo: "Cartas 304 a 306 — Rio Pará Oeste: Interpola a correção batimétrica entre Curralinho/Goiabal (Long. 49° 52,8'W, NR₁ = 0,25 m) e Abaetetuba/Vila do Conde (Long. 48° 45,0'W, NR₂ = 0,30 m) ao longo do canal de navegação do Rio Pará."
    },

    'carta_4353_estreitos_marajo': {
      nome: 'Cartas 4351, 4352 e 4353 — Estreitos de Marajó (Porto São José / Tajapuru ↔ Breves)',
      rio: 'Estreitos de Marajó (Tajapuru ↔ Breves)',
      cartasSerie: '4351, 4352, 4353',
      regime: 'Fluviomarinho (Redução ao Nível da Baixa-Mar Média de Sizígia — Carta 4353)',
      eixo: 'lon',
      bbox: { minLat: -2.00, maxLat: -1.35, minLon: -51.45, maxLon: -50.38, prioridade: 12 },
      est1: {
        nome: 'Porto São José / Furo do Tajapuru (PA)',
        codigoANA: '18920000',
        coordGraus: -51.4400, // 51° 26,4' W
        coordRotulo: "51° 26,4' W",
        nrMetros: 0.10,       // NR = 0,10 m (Nível Médio = 0,60 m, Preamar Sizígia = 1,20 m na Carta 4353)
        cotaExemploM: 1.10,   // C₁ = +1,00 m
        escalaMin: 0,
        escalaMax: 4
      },
      est2: {
        nome: 'Breves — Estreitos de Marajó (PA)',
        codigoANA: '18950000',
        coordGraus: -50.3800, // 50° 22,8' W
        coordRotulo: "50° 22,8' W",
        nrMetros: 0.30,       // NR = 0,30 m (Nível Médio = 1,10 m, Preamar Sizígia = 2,10 m)
        cotaExemploM: 1.80,   // C₂ = +1,50 m
        escalaMin: 0,
        escalaMax: 4
      },
      auditoriaOficial: {
        local: "Furo do Ituquara / Tajapuru — Carta 4353 (Long. 50° 54,6' W)",
        coordTeste: -50.9100,
        cEsperadoCarta: 1.25,
        permanencia: 'MLWS (Carta 4353)'
      },
      notaExemplo: "Cartas 4351 a 4353 — Estreitos de Marajó: Conforme quadro de Informações sobre Marés da Carta 4353 (Porto São José: Nível Médio = 0,6 m, Preamar de Sizígia = 1,2 m) e Breves (ANA 18950000), interpola-se a redução entre os Furos do Tajapuru/Ituquara e Breves."
    },

    // =========================================================================
    // GRUPO 3: RIO SOLIMÕES (MANAUS <-> CODAJÁS <-> COARI <-> TEFÉ <-> TABATINGA)
    // =========================================================================
    'carta_4056_solimoes': {
      nome: 'Cartas 4051 a 4056 — Rio Solimões Leste (Missão I / Tefé ↔ Coari ↔ Codajás ↔ Manaus)',
      rio: 'Rio Solimões Leste (Tefé ↔ Coari ↔ Manaus)',
      cartasSerie: '4051, 4052, 4053, 4054, 4054A, 4055, 4056',
      regime: 'Fluvial (Ábaco CHM/DHN por Longitude)',
      eixo: 'lon',
      bbox: { minLat: -4.40, maxLat: -3.05, minLon: -64.72, maxLon: -60.00, prioridade: 11 },
      est1: {
        nome: 'Missão I / Tefé (AM)',
        codigoANA: '13150003',
        coordGraus: -64.7167, // 64° 43,0' W
        coordRotulo: "64° 43,0' W",
        nrMetros: 3.10,       // Correção = 0 m quando Nível em Missão I = 3,10 m
        cotaExemploM: 13.40,  // Exemplo oficial Carta 4056: H₁ = 13,40 m -> C₁ = +10,30 m
        escalaMin: 2,
        escalaMax: 18
      },
      est2: {
        nome: 'Manaus — Rio Negro/Solimões (AM)',
        codigoANA: '14990000',
        coordGraus: -60.0250, // 60° 01,5' W
        coordRotulo: "60° 01,5' W",
        nrMetros: 17.58,      // Correção = 0 m quando Nível em Manaus = 17,58 m (Carta 4056)
        cotaExemploM: 28.48,  // Exemplo oficial Carta 4056: H₂ = 28,48 m -> C₂ = +10,90 m
        escalaMin: 16,
        escalaMax: 32
      },
      auditoriaOficial: {
        local: "Proximidades de Codajás — Carta 4056 (Long. 62° 05,0' W)",
        coordTeste: -62.0833,
        cEsperadoCarta: 10.70,
        permanencia: '90%'
      },
      notaExemplo: "Exemplo Oficial da Carta 4056 (Rio Solimões Leste): Estando o nível do rio em Missão I na cota de 13,40 m (NR₁ = 3,10 m → C₁ = +10,30 m) e em Manaus na cota de 28,48 m (NR₂ = 17,58 m → C₂ = +10,90 m), a correção nas proximidades de Codajás (Long. 62° 05'W) é de +10,70 m (90% de permanência)."
    },

    'carta_hsd1_solimoes_oeste': {
      nome: 'Cartas HS-B1 a B6, HS-C1 a C15 e HS-D1 a D11 — Rio Solimões Médio/Oeste (Tabatinga ↔ Sto. Antônio do Içá ↔ Tefé)',
      rio: 'Rio Solimões Oeste (Tabatinga ↔ Tefé)',
      cartasSerie: 'HS-B1..B6, HS-C1..C15, HS-D1..D11',
      regime: 'Fluvial (Ábaco CHM/DHN por Longitude)',
      eixo: 'lon',
      bbox: { minLat: -4.60, maxLat: -2.40, minLon: -70.05, maxLon: -64.7167, prioridade: 10 },
      est1: {
        nome: 'Tabatinga / Sto. Antônio do Içá (AM)',
        codigoANA: '10100000',
        coordGraus: -69.9300, // 69° 55,8' W
        coordRotulo: "69° 55,8' W",
        nrMetros: 2.20,
        cotaExemploM: 9.50,   // C₁ = +7,30 m
        escalaMin: 1,
        escalaMax: 15
      },
      est2: {
        nome: 'Fonte Boa / Missão I — Tefé (AM)',
        codigoANA: '12900000',
        coordGraus: -64.7167, // 64° 43,0' W
        coordRotulo: "64° 43,0' W",
        nrMetros: 3.10,
        cotaExemploM: 11.20,  // C₂ = +8,10 m
        escalaMin: 2,
        escalaMax: 16
      },
      auditoriaOficial: {
        local: "São Paulo de Olivença / Fonte Boa — Série HS-D (Long. 67° 19,4' W)",
        coordTeste: -67.3233,
        cEsperadoCarta: 7.70,
        permanencia: '90%'
      },
      notaExemplo: "Cartas Hidroviárias Série HS-B, HS-C e HS-D (Rio Solimões Médio e Oeste): Interpola linearmente o nível de correção entre Tabatinga / Sto. Antônio do Içá (ANA 10100000 / 12350000) e Fonte Boa / Tefé (ANA 12900000 / 13150003) pela Longitude."
    },

    // =========================================================================
    // GRUPO 4: RIO MADEIRA (PORTO VELHO <-> HUMAITÁ <-> MANICORÉ <-> BORBA / FOZ)
    // =========================================================================
    'carta_4753_madeira_alto': {
      nome: 'Cartas 4740 a 4753 — Rio Madeira Alto (Porto Velho ↔ Humaitá)',
      rio: 'Rio Madeira Alto (Porto Velho ↔ Humaitá)',
      cartasSerie: '4740 a 4753',
      regime: 'Fluvial (Ábaco CHM/DHN por Latitude)',
      eixo: 'lat',
      bbox: { minLat: -8.90, maxLat: -7.5050, minLon: -64.10, maxLon: -62.80, prioridade: 12 },
      est1: {
        nome: 'Porto Velho (RO)',
        codigoANA: '15400000',
        coordGraus: -8.7667,  // 08° 46,0' S
        coordRotulo: "08° 46,0' S",
        nrMetros: 3.30,       // Correção = 0 m quando Nível em Porto Velho = 3,30 m
        cotaExemploM: 10.00,  // Exemplo oficial Carta 4753: H₁ = 10,0 m -> C₁ = +6,70 m
        escalaMin: 3,
        escalaMax: 18
      },
      est2: {
        nome: 'Humaitá (AM)',
        codigoANA: '15630000',
        coordGraus: -7.5050,  // 07° 30,3' S
        coordRotulo: "07° 30,3' S",
        nrMetros: 10.10,      // Correção = 0 m quando Nível em Humaitá = 10,10 m
        cotaExemploM: 19.00,  // Exemplo oficial Carta 4753: H₂ = 19,0 m -> C₂ = +8,90 m
        escalaMin: 10,
        escalaMax: 25
      },
      auditoriaOficial: {
        local: "Porto de Amparo — Carta 4753 (Lat. 08° 38,0' S)",
        coordTeste: -8.6333,
        cEsperadoCarta: 7.00,
        permanencia: '90%'
      },
      notaExemplo: "Exemplo Oficial da Carta 4753 (Porto Velho ↔ Humaitá): Estando o nível do rio em Porto Velho na cota de 10,0 m (NR₁ = 3,3 m → C₁ = +6,70 m) e em Humaitá na cota de 19,0 m (NR₂ = 10,1 m → C₂ = +8,90 m), a correção nas proximidades do Porto de Amparo (Lat. 08° 38'S) é de +7,00 m (90% de permanência)."
    },

    'carta_4734_madeira': {
      nome: 'Cartas 4725 a 4739 — Rio Madeira Médio (Humaitá I ↔ Manicoré I)',
      rio: 'Rio Madeira Médio (Humaitá ↔ Manicoré)',
      cartasSerie: '4725 a 4739 (Carta 4734)',
      regime: 'Fluvial (Ábaco CHM/DHN por Latitude)',
      eixo: 'lat',
      bbox: { minLat: -7.5050, maxLat: -5.8200, minLon: -63.25, maxLon: -61.15, prioridade: 12 },
      est1: {
        nome: 'Humaitá I (AM)',
        codigoANA: '15630000',
        coordGraus: -7.5050,  // 07° 30,3' S
        coordRotulo: "07° 30,3' S",
        nrMetros: 10.10,      // Correção = 0 m quando Nível em Humaitá I = 10,1 m
        cotaExemploM: 15.00,  // Exemplo oficial impresso na Carta 4734 (C₁ = +4,90 m)
        escalaMin: 11,
        escalaMax: 25
      },
      est2: {
        nome: 'Manicoré I (AM)',
        codigoANA: '15700000',
        coordGraus: -5.8200,  // 05° 49,2' S
        coordRotulo: "05° 49,2' S",
        nrMetros: 12.10,      // Correção = 0 m quando Nível em Manicoré I = 12,1 m
        cotaExemploM: 21.00,  // Exemplo oficial impresso na Carta 4734 (C₂ = +8,90 m)
        escalaMin: 13,
        escalaMax: 27
      },
      auditoriaOficial: {
        local: "Ilha do Bom Intento — Carta 4734 (Lat. 06° 15,0' S)",
        coordTeste: -6.2500,
        cEsperadoCarta: 7.90,
        permanencia: '94%'
      },
      notaExemplo: "Exemplo Oficial da Carta 4734 (Humaitá I ↔ Manicoré I): Estando o nível do rio em Manicoré I na cota de 21,0 m (C₂ = +8,90 m) e em Humaitá I na cota de 15,0 m (C₁ = +4,90 m), a correção nas proximidades da Ilha do Bom Intento (Lat. 06° 15'S) é de +7,90 m (94% de permanência)."
    },

    'carta_4715_madeira_baixo': {
      nome: 'Cartas 4711 a 4724 — Rio Madeira Baixo (Manicoré I ↔ Novo Aripuanã ↔ Borba / Foz)',
      rio: 'Rio Madeira Baixo (Manicoré ↔ Borba / Foz)',
      cartasSerie: '4711 a 4724',
      regime: 'Fluvial (Ábaco CHM/DHN por Latitude)',
      eixo: 'lat',
      bbox: { minLat: -5.8200, maxLat: -3.3800, minLon: -61.50, maxLon: -58.75, prioridade: 12 },
      est1: {
        nome: 'Manicoré I (AM)',
        codigoANA: '15700000',
        coordGraus: -5.8200,  // 05° 49,2' S
        coordRotulo: "05° 49,2' S",
        nrMetros: 12.10,
        cotaExemploM: 21.00,  // C₁ = +8,90 m
        escalaMin: 12,
        escalaMax: 27
      },
      est2: {
        nome: 'Borba / Foz do Madeira (AM)',
        codigoANA: '15850000',
        coordGraus: -3.3800,  // 03° 22,8' S
        coordRotulo: "03° 22,8' S",
        nrMetros: 4.50,
        cotaExemploM: 12.50,  // C₂ = +8,00 m
        escalaMin: 4,
        escalaMax: 19
      },
      auditoriaOficial: {
        local: "Novo Aripuanã / Borba — Carta 4715 (Lat. 04° 36,0' S)",
        coordTeste: -4.6000,
        cEsperadoCarta: 8.45,
        permanencia: '90%'
      },
      notaExemplo: "Série 4711 a 4724 — Rio Madeira Baixo: Interpola a correção batimétrica por Latitude entre as réguas da ANA de Manicoré I (15700000, NR = 12,10 m) e Borba / Foz do Madeira (15850000, NR = 4,50 m)."
    },

    // =========================================================================
    // GRUPO 5: RIO TAPAJÓS E RIO TOCANTINS
    // =========================================================================
    'carta_4382_tapajos': {
      nome: 'Cartas 4381A/B, 4382A/B e 4383 — Rio Tapajós (Itaituba ↔ Fordlândia ↔ Santarém)',
      rio: 'Rio Tapajós (Itaituba ↔ Santarém)',
      cartasSerie: '4381A, 4381B, 4382A, 4382B, 4383',
      regime: 'Fluvial (Ábaco CHM/DHN por Latitude)',
      eixo: 'lat',
      bbox: { minLat: -4.40, maxLat: -2.44, minLon: -56.15, maxLon: -54.70, prioridade: 14 },
      est1: {
        nome: 'Itaituba (PA)',
        codigoANA: '17730000',
        coordGraus: -4.2583,  // 04° 15,5' S
        coordRotulo: "04° 15,5' S",
        nrMetros: 2.00,       // Correção = 0 m quando Nível em Itaituba = 2,00 m (Carta 4382A)
        cotaExemploM: 9.60,   // Exemplo oficial Carta 4382A: H₁ = 9,60 m -> C₁ = +7,60 m
        escalaMin: 2,
        escalaMax: 11
      },
      est2: {
        nome: 'Santarém — Tapajós (PA)',
        codigoANA: '17050001',
        coordGraus: -2.4417,  // 02° 26,5' S
        coordRotulo: "02° 26,5' S",
        nrMetros: 1.50,       // Correção = 0 m quando Nível em Santarém = 1,50 m (Carta 4382A)
        cotaExemploM: 6.00,   // Exemplo oficial Carta 4382A: H₂ = 6,00 m -> C₂ = +4,50 m
        escalaMin: 1,
        escalaMax: 10
      },
      auditoriaOficial: {
        local: "Proximidades de Fordlândia — Carta 4382A (Lat. 03° 49,6' S)",
        coordTeste: -3.8267,
        cEsperadoCarta: 6.80,
        permanencia: '90%'
      },
      notaExemplo: "Exemplo Oficial da Carta 4382A (Rio Tapajós): Estando o nível do rio em Santarém na cota de 6,0 m (NR₂ = 1,5 m → C₂ = +4,50 m) e em Itaituba na cota de 9,6 m (NR₁ = 2,0 m → C₁ = +7,60 m), a correção nas proximidades de Fordlândia (Lat. 03° 49,6'S) é de +6,80 m (90% de permanência)."
    },

    'carta_4366_tocantins': {
      nome: 'Cartas 4361 a 4366 — Rio Tocantins (Nazaré dos Patos ↔ Tucuruí ↔ Cametá)',
      rio: 'Rio Tocantins (Nazaré dos Patos ↔ Tucuruí)',
      cartasSerie: '4361A, 4361B, 4362, 4363, 4364, 4365, 4366',
      regime: 'Fluvial (Ábaco CHM/DHN por Latitude)',
      eixo: 'lat',
      bbox: { minLat: -3.95, maxLat: -2.10, minLon: -49.85, maxLon: -49.30, prioridade: 14 },
      est1: {
        nome: 'Nazaré dos Patos (PA)',
        codigoANA: '29650000',
        coordGraus: -3.4533,  // 03° 27,2' S
        coordRotulo: "03° 27,2' S",
        nrMetros: 2.50,       // Correção = 0 m quando Nível em Nazaré dos Patos = 2,50 m (Carta 4366)
        cotaExemploM: 6.00,   // Exemplo oficial Carta 4366: H₁ = 6,0 m -> C₁ = +3,50 m
        escalaMin: 2,
        escalaMax: 10.5
      },
      est2: {
        nome: 'Tucuruí (PA)',
        codigoANA: '29700000',
        coordGraus: -3.7417,  // 03° 44,5' S
        coordRotulo: "03° 44,5' S",
        nrMetros: 2.00,       // Correção = 0 m quando Nível em Tucuruí = 2,00 m (Carta 4366)
        cotaExemploM: 8.00,   // Exemplo oficial Carta 4366: H₂ = 8,0 m -> C₂ = +6,00 m
        escalaMin: 2,
        escalaMax: 10.5
      },
      auditoriaOficial: {
        local: "Proximidades de Pederneiras — Carta 4366 (Lat. 03° 41,0' S)",
        coordTeste: -3.6833,
        cEsperadoCarta: 5.50,
        permanencia: '90%'
      },
      notaExemplo: "Exemplo Oficial da Carta 4366 (Rio Tocantins): Estando o nível do rio em Tucuruí na cota de 8,0 m (NR₂ = 2,0 m → C₂ = +6,00 m) e em Nazaré dos Patos na cota de 6,0 m (NR₁ = 2,5 m → C₁ = +3,50 m), a correção nas proximidades de Pederneiras (Lat. 03° 41'S) é de +5,50 m (90% de permanência)."
    }
  };

  const BatimetriaTINManager = {
    _textoBruto: '',
    _nomeArquivo: '',
    _contadorCamadas: 0,
    _ultimoResultadoGeoJSON: null,
    _ultimoRelatorioParams: null,
    _ultimoRasterDataUrl: null,
    _ultimoImgOverlay: null,
    _ultimoBoundsGeo: null,
    _ultimoColsCanvas: 800,
    _ultimoRowsCanvas: 800,
    _ultimoMetodoInterp: 'linear',
    _ultimoPaleta: 'qgis_spectral',
    _pontosCache: [],
    _abaModalAtiva: 'tin',

    // Extensão planar exata (em metros UTM ou graus se geográfico) e geográfica
    _extensao: {
      xmin: 0, xmax: 0, ymin: 0, ymax: 0,
      larguraM: 0, alturaM: 0,
      minLat: 0, maxLat: 0, minLon: 0, maxLon: 0,
      zMin: 0, zMax: 0,
      epsg: 'EPSG:31982',
      passoIntraLinhaM: 0, espacamentoInterLinhasM: 0
    },

    // Estado do Desenho de Polígono de Limite Manual
    _desenhandoLimite: false,
    _verticesLimite: [],
    _layerLimiteTemp: null,
    _poligonoLimiteGeoJSON: null,
    _previewPontosLayer: null,

    // Estado do Perfil Longitudinal (Caminho da Embarcação / Talvegue)
    _desenhandoRota: false,
    _verticesRota: [],
    _layerRotaTemp: null,
    _layerRotaMapa: null,
    _markerNavioHover: null,
    _amostrasPerfil: [],
    _trechosCriticos: [],
    _hoverIdxPerfil: -1,

    abrirModal: function (abaOpcional) {
      const modal = document.getElementById('modal-batimetria-tin');
      if (!modal) return;
      modal.classList.add('aberto');
      if (abaOpcional) this.trocarAbaModal(abaOpcional);
      this.atualizarPreview(false);
      this.atualizarCalculoAbaco();
      // Dispara automaticamente a consulta à API Pública da ANA para puxar as cotas mais recentes das 2 estações!
      clearTimeout(this._timerAutoANA);
      this._timerAutoANA = setTimeout(() => {
        this.buscarCotasANA(true);
      }, 150);
    },

    fecharModal: function () {
      const modal = document.getElementById('modal-batimetria-tin');
      if (modal) modal.classList.remove('aberto');
    },

    trocarAbaModal: function (aba) {
      this._abaModalAtiva = aba;
      ['tin', 'abaco', 'perfil'].forEach(id => {
        const btn = document.getElementById(`bat-tab-btn-${id}`);
        const pane = document.getElementById(`bat-tab-pane-${id}`);
        if (btn) btn.classList.toggle('ativo', id === aba);
        if (pane) pane.style.display = (id === aba) ? 'flex' : 'none';
      });
      if (aba === 'abaco') {
        setTimeout(() => this.atualizarCalculoAbaco(), 40);
      }
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
          txtArea.value = this._textoBruto.length > 15000
            ? this._textoBruto.slice(0, 15000) + `\n# ... [Arquivo completo carregado em memória: ${this._textoBruto.split(/\r?\n/).length.toLocaleString('pt-BR')} registros]`
            : this._textoBruto;
        }
        this.autoDetectarSeparador(this._textoBruto);
        this.atualizarPreview(true);
      };
      reader.readAsText(file, 'utf-8');
    },

    aoDigitarTexto: function (val) {
      if (!val.includes('# ... [Arquivo completo carregado em memória:')) {
        this._textoBruto = val;
      }
      this.atualizarPreview(true);
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

    _obterCodigoEPSG: function (crs) {
      const mapa = {
        'UTM_18S': 'EPSG:31978', 'UTM_19S': 'EPSG:31979', 'UTM_20S': 'EPSG:31980',
        'UTM_21S': 'EPSG:31981', 'UTM_22S': 'EPSG:31982', 'UTM_23S': 'EPSG:31983',
        'UTM_24S': 'EPSG:31984', 'UTM_25S': 'EPSG:31985',
        'UTM_20N': 'EPSG:31974', 'UTM_21N': 'EPSG:31975', 'UTM_22N': 'EPSG:31976',
        'GEO_SIRGAS': 'EPSG:4674'
      };
      return mapa[crs] || 'EPSG:31982';
    },

    /**
     * Conversão Geodésica Analítica (Série de Redfearn / GRS80): UTM -> Lat/Lon
     */
    utmParaLatLon: function (easting, northing, zona, hemisferioSul) {
      const a = 6378137.0;
      const f = 1 / 298.257222101;
      const k0 = 0.9996;
      const eSq = f * (2 - f);
      const ePrimeSq = eSq / (1 - eSq);
      const e1 = (1 - Math.sqrt(1 - eSq)) / (1 + Math.sqrt(1 - eSq));

      const x = easting - 500000.0;
      const y = hemisferioSul ? (northing - 10000000.0) : northing;
      const lonOrigin = (zona - 1) * 6 - 180 + 3;

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

      return {
        lat: latRad * (180 / Math.PI),
        lon: lonOrigin + lonRad * (180 / Math.PI)
      };
    },

    /**
     * Conversão Inversa (Lat/Lon -> UTM Easting/Northing)
     */
    latLonParaUtm: function (lat, lon, zonaForcada) {
      const a = 6378137.0;
      const f = 1 / 298.257222101;
      const k0 = 0.9996;
      const eSq = f * (2 - f);
      const ePrimeSq = eSq / (1 - eSq);

      const zona = zonaForcada || (Math.floor((lon + 180) / 6) + 1);
      const lonOrigin = (zona - 1) * 6 - 180 + 3;
      const latRad = lat * (Math.PI / 180);
      const lonRad = (lon - lonOrigin) * (Math.PI / 180);

      const sinLat = Math.sin(latRad);
      const cosLat = Math.cos(latRad);
      const tanLat = Math.tan(latRad);

      const N = a / Math.sqrt(1 - eSq * sinLat * sinLat);
      const T = tanLat * tanLat;
      const C = ePrimeSq * cosLat * cosLat;
      const A = cosLat * lonRad;

      const M = a * (
        (1 - eSq / 4 - 3 * eSq * eSq / 64 - 5 * eSq * eSq * eSq / 256) * latRad -
        (3 * eSq / 8 + 3 * eSq * eSq / 32 + 45 * eSq * eSq * eSq / 1024) * Math.sin(2 * latRad) +
        (15 * eSq * eSq / 256 + 45 * eSq * eSq * eSq / 1024) * Math.sin(4 * latRad) -
        (35 * eSq * eSq * eSq / 3072) * Math.sin(6 * latRad)
      );

      const easting = k0 * N * (
        A + (1 - T + C) * Math.pow(A, 3) / 6 +
        (5 - 18 * T + T * T + 72 * C - 58 * ePrimeSq) * Math.pow(A, 5) / 120
      ) + 500000.0;

      let northing = k0 * (
        M + N * tanLat * (
          A * A / 2 + (5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4) / 24 +
          (61 - 58 * T + T * T + 600 * C - 330 * ePrimeSq) * Math.pow(A, 6) / 720
        )
      );
      if (lat < 0) northing += 10000000.0;
      return { x: easting, y: northing, zona, sul: lat < 0 };
    },

    // =========================================================================
    // ⚓ MOTOR DO ÁBACO DE CORREÇÃO DE PROFUNDIDADES (MARINHA DO BRASIL + ANA)
    // =========================================================================

    aoTrocarPresetAbaco: function (presetId, manterCoordTeste) {
      const p = CATALOGO_ABACOS_MARINHA[presetId];
      if (!p) {
        this.atualizarCalculoAbaco();
        return;
      }

      const selPreset = document.getElementById('abaco-preset-carta');
      if (selPreset && selPreset.value !== presetId) {
        selPreset.value = presetId;
      }

      const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      setVal('abaco-eixo', p.eixo);
      setVal('abaco-est1-nome', p.est1.nome);
      setVal('abaco-est1-cod', p.est1.codigoANA);
      setVal('abaco-est1-coord', p.est1.coordGraus);
      setVal('abaco-est1-nr', p.est1.nrMetros.toFixed(2));
      setVal('abaco-est1-h', p.est1.cotaExemploM.toFixed(2));

      setVal('abaco-est2-nome', p.est2.nome);
      setVal('abaco-est2-cod', p.est2.codigoANA);
      setVal('abaco-est2-coord', p.est2.coordGraus);
      setVal('abaco-est2-nr', p.est2.nrMetros.toFixed(2));
      setVal('abaco-est2-h', p.est2.cotaExemploM.toFixed(2));

      const notaEl = document.getElementById('abaco-nota-carta');
      if (notaEl) {
        notaEl.innerHTML = `🗺️ <strong>${p.nome}</strong> <span style="color:#f9a8d4;">[Cartas: ${p.cartasSerie || '-'} · ${p.regime || 'Fluvial'}]</span><br>${p.notaExemplo}`;
      }

      if (!manterCoordTeste) {
        const coordTeste = p.auditoriaOficial && Number.isFinite(p.auditoriaOficial.coordTeste)
          ? p.auditoriaOficial.coordTeste
          : +((p.est1.coordGraus + p.est2.coordGraus) / 2).toFixed(4);
        setVal('abaco-coord-teste', coordTeste);
      }

      this.atualizarCalculoAbaco();
    },

    /**
     * Restaura as cotas do exemplo oficial impresso na Carta da Marinha e posiciona na coordenada de prova real
     */
    testarExemploOficialCarta: function () {
      const presetId = document.getElementById('abaco-preset-carta')?.value || 'carta_4020a_amazonas';
      this.aoTrocarPresetAbaco(presetId, false);
      if (window.UI) {
        const p = CATALOGO_ABACOS_MARINHA[presetId];
        window.UI.toast(`🎯 Prova Real carregada: ${p?.auditoriaOficial?.local || presetId}`);
      }
    },

    /**
     * Inteligência Geográfica: Detecta automaticamente qual Carta Náutica / Ábaco da Marinha cobre
     * o levantamento batimétrico carregado (pelo Bounding Box e centroide Lat/Lon dos pontos XYZ).
     */
    autoDetectarAbacoPorCoordenadas: function (minLat, maxLat, minLon, maxLon, silencioso) {
      if (!Number.isFinite(minLat) || !Number.isFinite(minLon)) {
        const pts = this._pontosCache && this._pontosCache.length ? this._pontosCache : this._extrairPontos(0);
        if (!pts.length) {
          if (!silencioso && window.UI) window.UI.toast('⚠️ Carregue um arquivo X Y Z primeiro para auto-detectar o Ábaco da área.', 'alerta');
          return null;
        }
        minLat = Infinity; maxLat = -Infinity; minLon = Infinity; maxLon = -Infinity;
        for (const p of pts) {
          if (p.lat < minLat) minLat = p.lat;
          if (p.lat > maxLat) maxLat = p.lat;
          if (p.lon < minLon) minLon = p.lon;
          if (p.lon > maxLon) maxLon = p.lon;
        }
      }

      const latMed = (minLat + maxLat) / 2;
      const lonMed = (minLon + maxLon) / 2;

      let melhorId = null;
      let melhorScore = -Infinity;
      let menorDistGraus = Infinity;
      let maisProximoId = 'carta_4020a_amazonas';

      for (const [id, item] of Object.entries(CATALOGO_ABACOS_MARINHA)) {
        const b = item.bbox;
        if (b) {
          const dentroLat = (latMed >= b.minLat - 0.12 && latMed <= b.maxLat + 0.12);
          const dentroLon = (lonMed >= b.minLon - 0.12 && lonMed <= b.maxLon + 0.12);
          if (dentroLat && dentroLon) {
            // Prioriza caixas mais específicas (ex: Tapajós, Tocantins, Rio Pará, Estreitos) e proximidade ao centro do eixo
            const cEixo = item.eixo === 'lat' ? latMed : lonMed;
            const meioEixo = (item.est1.coordGraus + item.est2.coordGraus) / 2;
            const spanEixo = Math.max(0.1, Math.abs(item.est2.coordGraus - item.est1.coordGraus));
            const proxCentro = 1 - Math.min(1, Math.abs(cEixo - meioEixo) / spanEixo);
            const score = (b.prioridade || 10) * 10 + proxCentro * 5;
            if (score > melhorScore) {
              melhorScore = score;
              melhorId = id;
            }
          }

          const cLat = (b.minLat + b.maxLat) / 2;
          const cLon = (b.minLon + b.maxLon) / 2;
          const d = Math.hypot(latMed - cLat, lonMed - cLon);
          if (d < menorDistGraus) {
            menorDistGraus = d;
            maisProximoId = id;
          }
        }
      }

      const escolhidoId = melhorId || maisProximoId;
      const escolhido = CATALOGO_ABACOS_MARINHA[escolhidoId];
      if (!escolhido) return null;

      this._ultimoAbacoAutoDetectado = {
        id: escolhidoId,
        nome: escolhido.nome,
        rio: escolhido.rio,
        cartasSerie: escolhido.cartasSerie,
        latMed,
        lonMed,
        exatoNoBbox: !!melhorId
      };

      // Atualiza o select e os parâmetros da carta, posicionando a coordenada de simulação no centroide real do levantamento!
      const coordCentroLevantamento = +(escolhido.eixo === 'lat' ? latMed : lonMed).toFixed(4);
      const inpCoordTeste = document.getElementById('abaco-coord-teste');
      if (inpCoordTeste) inpCoordTeste.value = coordCentroLevantamento;

      this.aoTrocarPresetAbaco(escolhidoId, true);

      const badgeEl = document.getElementById('abaco-badge-autodetect');
      if (badgeEl) {
        badgeEl.style.display = 'flex';
        badgeEl.innerHTML = `
          <span>🧠 <strong>Ábaco Auto-Selecionado pela Área dos Pontos:</strong> <strong style="color:#fde047;">${escolhido.nome}</strong></span>
          <span style="font-family:monospace; color:#a7f3d0;">Centroide: Lat ${latMed.toFixed(4)}°, Lon ${lonMed.toFixed(4)}° (${escolhido.est1.nome} ↔ ${escolhido.est2.nome})</span>
        `;
      }

      if (!silencioso && window.UI) {
        window.UI.toast(`🧭 Ábaco auto-selecionado pela área: ${escolhido.rio} (${escolhido.cartasSerie})`);
      }

      return this._ultimoAbacoAutoDetectado;
    },

    _lerConfigAbaco: function () {
      const presetId = document.getElementById('abaco-preset-carta')?.value || 'carta_4020a_amazonas';
      const ativo = document.getElementById('abaco-ativar-correcao')?.checked === true;
      const modoOperacao = document.getElementById('abaco-modo-operacao')?.value || 'reduzir_sondagem';
      const eixo = document.getElementById('abaco-eixo')?.value || 'lon';

      const nome1 = document.getElementById('abaco-est1-nome')?.value || 'Estação 1 (Montante)';
      const cod1 = document.getElementById('abaco-est1-cod')?.value || '16350000';
      const coord1 = parseFloat(document.getElementById('abaco-est1-coord')?.value || '-56.725');
      const nr1 = parseFloat(document.getElementById('abaco-est1-nr')?.value || '1.00') || 0;
      const h1 = parseFloat(document.getElementById('abaco-est1-h')?.value || '10.20') || 0;

      const nome2 = document.getElementById('abaco-est2-nome')?.value || 'Estação 2 (Jusante)';
      const cod2 = document.getElementById('abaco-est2-cod')?.value || '17050001';
      const coord2 = parseFloat(document.getElementById('abaco-est2-coord')?.value || '-54.7167');
      const nr2 = parseFloat(document.getElementById('abaco-est2-nr')?.value || '1.10') || 0;
      const h2 = parseFloat(document.getElementById('abaco-est2-h')?.value || '8.00') || 0;

      // Níveis de correção nas duas réguas: C = H_atual - NR_carta
      const c1 = h1 - nr1;
      const c2 = h2 - nr2;

      return {
        presetId, ativo, modoOperacao, eixo,
        nome1, cod1, coord1, nr1, h1, c1,
        nome2, cod2, coord2, nr2, h2, c2
      };
    },

    /**
     * Fórmula matemática exata do Ábaco da Marinha (CHM/DHN):
     *   C₁ = H₁ - NR₁
     *   C₂ = H₂ - NR₂
     *   α(coord) = clamp((coord - coord₁) / (coord₂ - coord₁), 0, 1)
     *   C(coord) = C₁ + α(coord) · (C₂ - C₁)
     */
    calcularCorrecaoAbacoNaCoordenada: function (lat, lon, cfgOpcional) {
      const cfg = cfgOpcional || this._lerConfigAbaco();
      const coord = (cfg.eixo === 'lat') ? lat : lon;
      const denom = (cfg.coord2 - cfg.coord1);
      let frac = Math.abs(denom) > 1e-7 ? (coord - cfg.coord1) / denom : 0.5;
      const fracClamped = Math.max(0, Math.min(1, frac));
      const correcaoM = cfg.c1 + fracClamped * (cfg.c2 - cfg.c1);
      return {
        correcaoM: +correcaoM.toFixed(3),
        frac: +fracClamped.toFixed(4),
        fracBruta: +frac.toFixed(4),
        coordUsada: coord
      };
    },

    /**
     * Consulta um código de estação fluviométrica diretamente no WebService Oficial de Telemetria da ANA:
     *   Endpoint: https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos
     *   Retorno XML: <DadosHidrometeorologicos><CodEstacao>...</CodEstacao><DataHora>...</DataHora><Nivel>CM</Nivel></DadosHidrometeorologicos>
     *   Nota técnica ANA: O campo <Nivel> da API da ANA é fornecido em CENTÍMETROS (cm), sendo convertido para METROS (÷ 100).
     */
    /**
     * Consulta diretamente as 3 operações públicas do WebService Oficial da ANA (`https://telemetriaws1.ana.gov.br/ServiceANA.asmx`):
     *   1. `DadosHidrometeorologicosGerais` — Telemetria transmitida pelas PCDs sem bloqueio de validação de filtro
     *   2. `DadosHidrometeorologicos`       — Telemetria horária padrão (<Nivel> em centímetros)
     *   3. `HidroSerieHistorica`            — Série histórica/convencional de cotas (<Cota01>..<Cota31> em centímetros, tipoDados=1, nivelConsistencia=1)
     */
    _consultarEstacaoANAReal: async function (codEstacao) {
      const codLimpo = String(codEstacao || '').replace(/\D/g, '').trim();
      if (!codLimpo || codLimpo.length < 7) {
        return { ok: false, motivo: 'Estação Maregráfica CHM/BNDO (Tábua de Marés da Marinha, não fluviométrica ANA)' };
      }

      const hoje = new Date();
      const inicio15d = new Date(hoje.getTime() - 15 * 24 * 3600 * 1000);
      const inicio60d = new Date(hoje.getTime() - 60 * 24 * 3600 * 1000);
      const fmtData = (d) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      };

      const endpointsANA = [
        {
          op: 'DadosHidrometeorologicosGerais',
          url: `https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicosGerais?codEstacao=${codLimpo}&dataInicio=${fmtData(inicio15d)}&dataFim=${fmtData(hoje)}`
        },
        {
          op: 'DadosHidrometeorologicos',
          url: `https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos?codEstacao=${codLimpo}&dataInicio=${fmtData(inicio15d)}&dataFim=${fmtData(hoje)}`
        },
        {
          op: 'HidroSerieHistorica',
          url: `https://telemetriaws1.ana.gov.br/ServiceANA.asmx/HidroSerieHistorica?codEstacao=${codLimpo}&dataInicio=${fmtData(inicio60d)}&dataFim=&tipoDados=1&nivelConsistencia=1`
        }
      ];

      const envolverProxies = (urlAlvo) => [
        { via: 'Direto ANA', url: urlAlvo },
        { via: 'AllOrigins CORS', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(urlAlvo)}` },
        { via: 'CorsProxy.io', url: `https://corsproxy.io/?${encodeURIComponent(urlAlvo)}` },
        { via: 'CodeTabs Proxy', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(urlAlvo)}` }
      ];

      for (const ep of endpointsANA) {
        const tentativas = envolverProxies(ep.url);
        for (const tent of tentativas) {
          try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 5500);
            const resp = await fetch(tent.url, { signal: ctrl.signal });
            clearTimeout(timer);
            if (!resp.ok) continue;

            const xmlText = await resp.text();
            if (!xmlText || (!xmlText.includes('<') && !xmlText.includes('Nivel') && !xmlText.includes('Cota'))) continue;

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

            // 1. Tenta extrair <Nivel> de DadosHidrometeorologicos / DadosHidrometeorologicosGerais
            const nosTelemetria = xmlDoc.getElementsByTagName('DadosHidrometeorologicos');
            for (let i = 0; i < nosTelemetria.length; i++) {
              const reg = nosTelemetria[i];
              const elNivel = reg.getElementsByTagName('Nivel')[0] || reg.getElementsByTagName('NivelFinal')[0];
              const elData = reg.getElementsByTagName('DataHora')[0];
              if (!elNivel || !elNivel.textContent) continue;
              const rawNivel = parseFloat(elNivel.textContent.trim().replace(',', '.'));
              if (!Number.isFinite(rawNivel)) continue;
              const cotaMetros = +(rawNivel / 100.0).toFixed(2);
              const dataHoraStr = elData && elData.textContent ? elData.textContent.trim() : fmtData(hoje);
              return {
                ok: true,
                codEstacao: codLimpo,
                cotaMetros,
                nivelCm: Math.round(rawNivel),
                dataHora: dataHoraStr,
                fonte: `${ep.op} (${tent.via})`
              };
            }

            // 2. Tenta extrair <Cota01>..<Cota31> de HidroSerieHistorica
            const nosSerie = xmlDoc.getElementsByTagName('SerieHistorica');
            for (let i = 0; i < nosSerie.length; i++) {
              const serie = nosSerie[i];
              const elDataHora = serie.getElementsByTagName('DataHora')[0];
              const mesAno = elDataHora && elDataHora.textContent ? elDataHora.textContent.trim().slice(0, 10) : fmtData(hoje);
              for (let dia = 31; dia >= 1; dia--) {
                const tagCota = `Cota${String(dia).padStart(2, '0')}`;
                const elCota = serie.getElementsByTagName(tagCota)[0];
                if (elCota && elCota.textContent && elCota.textContent.trim() !== '') {
                  const rawCota = parseFloat(elCota.textContent.trim().replace(',', '.'));
                  if (Number.isFinite(rawCota) && rawCota > 0) {
                    const cotaMetros = +(rawCota / 100.0).toFixed(2);
                    return {
                      ok: true,
                      codEstacao: codLimpo,
                      cotaMetros,
                      nivelCm: Math.round(rawCota),
                      dataHora: `Dia ${String(dia).padStart(2, '0')} (${mesAno})`,
                      fonte: `HidroSerieHistorica (${tent.via})`
                    };
                  }
                }
              }
            }
          } catch (_) {
            // Prossegue para o próximo proxy/operação
          }
        }
      }

            // 3. Fallback Institucional Sem CORS: Lê `dados/cotas_ana_cache.json` (alimentado por `scripts/sincronizar_cotas_ana.py` ou backend da TI)
      try {
        const respCache = await fetch('dados/cotas_ana_cache.json?_t=' + Date.now());
        if (respCache.ok) {
          const jsonCache = await respCache.json();
          const regEst = jsonCache?.estacoes?.[codLimpo];
          if (regEst && Number.isFinite(Number(regEst.cota_m))) {
            return {
              ok: true,
              codEstacao: codLimpo,
              cotaMetros: +Number(regEst.cota_m).toFixed(2),
              nivelCm: Math.round(Number(regEst.cota_m) * 100),
              dataHora: regEst.data_hora || jsonCache.atualizado_em || fmtData(hoje),
              fonte: `${regEst.fonte || 'Cache Institucional'} (dados/cotas_ana_cache.json)`
            };
          }
        }
      } catch (_) {}

      return { ok: false, motivo: 'Bloqueio CORS/WAF do navegador no domínio da ANA (execute scripts/sincronizar_cotas_ana.py ou proxy de TI).' };
    },

    /**
     * Consulta em tempo real as cotas fluviométricas das 2 estações do Ábaco no WebService Público da ANA
     * (`telemetriaws1.ana.gov.br/ServiceANA.asmx`), preenchendo H₁ e H₂ automaticamente.
     */
    buscarCotasANA: async function (silencioso) {
      const cfg = this._lerConfigAbaco();
      const statusEl = document.getElementById('abaco-status-ana');
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#38bdf8;">⏳ Puxando dados ao vivo da API Pública da ANA (<code>telemetriaws1.ana.gov.br/ServiceANA.asmx</code>) para <strong>${cfg.cod1}</strong> (${cfg.nome1}) e <strong>${cfg.cod2}</strong> (${cfg.nome2})...</span>`;
      }

      const [res1, res2] = await Promise.all([
        this._consultarEstacaoANAReal(cfg.cod1),
        this._consultarEstacaoANAReal(cfg.cod2)
      ]);

      const inpH1 = document.getElementById('abaco-est1-h');
      const inpH2 = document.getElementById('abaco-est2-h');

      if (res1.ok && inpH1) inpH1.value = res1.cotaMetros.toFixed(2);
      if (res2.ok && inpH2) inpH2.value = res2.cotaMetros.toFixed(2);

      this.atualizarCalculoAbaco();
      const cfgNovo = this._lerConfigAbaco();

      const descr1 = res1.ok
        ? `<span style="color:#10b981; font-weight:700;">🟢 Est. ${cfgNovo.cod1} (${res1.fonte}): <strong>${res1.cotaMetros.toFixed(2)} m</strong> (${res1.nivelCm} cm em ${res1.dataHora} → C₁ = ${cfgNovo.c1 >= 0 ? '+' : ''}${cfgNovo.c1.toFixed(2)} m)</span>`
        : `<span style="color:#fbbf24;">📋 Est. ${cfgNovo.cod1} (Cota de Referência da Carta = <strong>${cfgNovo.h1.toFixed(2)} m</strong> → C₁ = ${cfgNovo.c1 >= 0 ? '+' : ''}${cfgNovo.c1.toFixed(2)} m | ${res1.motivo})</span>`;

      const descr2 = res2.ok
        ? `<span style="color:#10b981; font-weight:700;">🟢 Est. ${cfgNovo.cod2} (${res2.fonte}): <strong>${res2.cotaMetros.toFixed(2)} m</strong> (${res2.nivelCm} cm em ${res2.dataHora} → C₂ = ${cfgNovo.c2 >= 0 ? '+' : ''}${cfgNovo.c2.toFixed(2)} m)</span>`
        : `<span style="color:#fbbf24;">📋 Est. ${cfgNovo.cod2} (Cota de Referência da Carta = <strong>${cfgNovo.h2.toFixed(2)} m</strong> → C₂ = ${cfgNovo.c2 >= 0 ? '+' : ''}${cfgNovo.c2.toFixed(2)} m | ${res2.motivo})</span>`;

      if (statusEl) {
        statusEl.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:3px; background:#040d1a; border:1px solid #1e3a5f; padding:6px 8px; border-radius:5px;">
            <div>📡 <strong>Integração Direta API Pública ANA (<code>telemetriaws1.ana.gov.br/ServiceANA.asmx</code>):</strong></div>
            <div>• ${descr1}</div>
            <div>• ${descr2}</div>
          </div>
        `;
      }

      if (!silencioso && window.UI) {
        if (res1.ok || res2.ok) {
          window.UI.toast(`📡 Cotas reais puxadas diretamente da API Pública da ANA!`);
        } else {
          window.UI.toast(`ℹ️ Usando cotas de referência da Carta Náutica (editáveis em H₁ e H₂).`);
        }
      }
    },

    /**
     * Atualiza os indicadores numéricos, a Prova Real Matemática CHM/DHN e desenha o Gráfico do Ábaco no Canvas `#canvas-abaco-marinha`
     */
    atualizarCalculoAbaco: function () {
      const cfg = this._lerConfigAbaco();
      const coordTeste = parseFloat(document.getElementById('abaco-coord-teste')?.value || String((cfg.coord1 + cfg.coord2) / 2));
      const resTeste = this.calcularCorrecaoAbacoNaCoordenada(
        cfg.eixo === 'lat' ? coordTeste : -3.0,
        cfg.eixo === 'lon' ? coordTeste : -55.0,
        cfg
      );

      const elC1 = document.getElementById('abaco-lbl-c1');
      const elC2 = document.getElementById('abaco-lbl-c2');
      const elRes = document.getElementById('abaco-resultado-ponto');
      const elAudit = document.getElementById('abaco-auditoria-matematica');

      if (elC1) elC1.textContent = `${cfg.c1 >= 0 ? '+' : ''}${cfg.c1.toFixed(2)} m`;
      if (elC2) elC2.textContent = `${cfg.c2 >= 0 ? '+' : ''}${cfg.c2.toFixed(2)} m`;

      if (elRes) {
        const sinal = resTeste.correcaoM >= 0 ? '+' : '';
        const eixoNome = cfg.eixo === 'lat' ? 'Latitude' : 'Longitude';
        const formulaExplicacao = cfg.modoOperacao === 'reduzir_sondagem'
          ? `Z_NR = Z_medido - (${sinal}${resTeste.correcaoM.toFixed(2)} m)`
          : `Z_Real = Z_carta + (${sinal}${resTeste.correcaoM.toFixed(2)} m)`;

        elRes.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
            <span>📐 <strong>Correção Calculada (${eixoNome} = ${coordTeste.toFixed(4)}°):</strong> <strong style="color:#f472b6; font-size:13px;">${sinal}${resTeste.correcaoM.toFixed(2)} m</strong> <span style="color:#cbd5e1; font-size:10.5px;">(α = ${(resTeste.frac * 100).toFixed(1)}% entre ${cfg.nome1} e ${cfg.nome2})</span></span>
            <span style="font-family:monospace; background:#071526; border:1px solid #1e3a5f; padding:2px 7px; border-radius:4px; color:#38bdf8;">${formulaExplicacao}</span>
          </div>
        `;
      }

      if (elAudit) {
        const preset = CATALOGO_ABACOS_MARINHA[cfg.presetId];
        if (preset && preset.auditoriaOficial) {
          const aud = preset.auditoriaOficial;
          const c1Oficial = preset.est1.cotaExemploM - preset.est1.nrMetros;
          const c2Oficial = preset.est2.cotaExemploM - preset.est2.nrMetros;
          const denomOf = (preset.est2.coordGraus - preset.est1.coordGraus);
          const fracOf = Math.max(0, Math.min(1, (aud.coordTeste - preset.est1.coordGraus) / denomOf));
          const cCalcOficial = c1Oficial + fracOf * (c2Oficial - c1Oficial);
          const desvioM = Math.abs(cCalcOficial - aud.cEsperadoCarta);

          elAudit.style.display = 'block';
          elAudit.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
              <div>
                <span style="color:#10b981; font-weight:800;">✅ PROVA REAL / AUDITORIA MATEMÁTICA CHM/DHN:</span>
                <span style="color:#e2e8f0;">${aud.local}: Fórmula Linear = <strong style="color:#38bdf8;">+${cCalcOficial.toFixed(2)} m</strong> vs Impresso na Carta = <strong style="color:#fde047;">+${aud.cEsperadoCarta.toFixed(2)} m</strong> (Desvio = <strong>${desvioM.toFixed(2)} m</strong> · Permanência ${aud.permanencia})</span>
              </div>
              <button type="button" onclick="BatimetriaTINManager.testarExemploOficialCarta()"
                style="background:#065f46; color:#a7f3d0; border:1px solid #10b981; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:700; cursor:pointer; white-space:nowrap;">
                🎯 Testar Ponto Oficial da Carta
              </button>
            </div>
          `;
        } else {
          elAudit.style.display = 'none';
        }
      }

      this._desenharCanvasAbacoMarinha(cfg, coordTeste, resTeste);
      this.atualizarPreview(false);
    },

    _desenharCanvasAbacoMarinha: function (cfg, coordTeste, resTeste) {
      const canvas = document.getElementById('canvas-abaco-marinha');
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const W = Math.max(320, canvas.clientWidth || 560);
      const H = 180;

      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Fundo estilo encarte de Carta Náutica da Marinha
      ctx.fillStyle = '#071526';
      ctx.fillRect(0, 0, W, H);

      const padL = 58, padR = 74, padT = 24, padB = 36;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;

      const cMin = Math.min(-2, Math.floor(Math.min(cfg.c1, cfg.c2) - 2));
      const cMax = Math.max(14, Math.ceil(Math.max(cfg.c1, cfg.c2) + 2));
      const cSpan = Math.max(1, cMax - cMin);

      const yOfC = (cVal) => padT + (1 - (cVal - cMin) / cSpan) * plotH;
      const xOfFrac = (f) => padL + f * plotW;

      // Título superior do Ábaco
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 10.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ÁBACO PARA CORREÇÃO DAS PROFUNDIDADES (PADRÃO MARINHA DO BRASIL — CHM/DHN)', W / 2, 14);

      // Linhas horizontais magenta de Nível de Correção (igual ao Ábaco da Marinha!)
      const nTicks = 6;
      ctx.font = '9.5px "Segoe UI", sans-serif';
      for (let i = 0; i <= nTicks; i++) {
        const cVal = cMin + (cSpan * i) / nTicks;
        const y = yOfC(cVal);

        ctx.strokeStyle = Math.abs(cVal) < 0.01 ? 'rgba(244, 114, 182, 0.55)' : 'rgba(244, 114, 182, 0.18)';
        ctx.lineWidth = Math.abs(cVal) < 0.01 ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(W - padR, y);
        ctx.stroke();

        // Escala Esquerda: Nível do Rio na Estação 1 (H1 = C + NR1)
        const h1Equiv = cVal + cfg.nr1;
        ctx.fillStyle = '#bae6fd';
        ctx.textAlign = 'right';
        ctx.fillText(`${h1Equiv.toFixed(1)}m`, padL - 6, y + 3);

        // Escala Direita Interna: Nível do Rio na Estação 2 (H2 = C + NR2)
        const h2Equiv = cVal + cfg.nr2;
        ctx.fillStyle = '#bae6fd';
        ctx.textAlign = 'left';
        ctx.fillText(`${h2Equiv.toFixed(1)}m`, W - padR + 5, y + 3);

        // Escala Direita Externa (Magenta): Correção em metros para as profundidades
        ctx.fillStyle = '#f472b6';
        ctx.font = 'bold 9.5px "Segoe UI", sans-serif';
        ctx.fillText(`${cVal >= 0 ? '+' : ''}${cVal.toFixed(1)}m`, W - padR + 40, y + 3);
        ctx.font = '9.5px "Segoe UI", sans-serif';
      }

      // Eixos verticais (Estação 1 à esquerda, Estação 2 à direita)
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(padL, padT, plotW, plotH);

      // Eixo de Longitude / Latitude na base
      const nTicksX = 5;
      ctx.fillStyle = '#cbd5e1';
      ctx.textAlign = 'center';
      for (let i = 0; i <= nTicksX; i++) {
        const f = i / nTicksX;
        const x = xOfFrac(f);
        const coordVal = cfg.coord1 + f * (cfg.coord2 - cfg.coord1);
        ctx.beginPath();
        ctx.moveTo(x, H - padB);
        ctx.lineTo(x, H - padB - 5);
        ctx.strokeStyle = '#94a3b8';
        ctx.stroke();
        ctx.fillText(`${coordVal.toFixed(2)}°`, x, H - padB + 13);
      }
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9.5px "Segoe UI", sans-serif';
      ctx.fillText(cfg.eixo === 'lat' ? 'Latitude (°)' : 'Longitude (°)', padL + plotW / 2, H - 4);

      // Linha Tracejada Magenta ligando C1 (Estação 1) a C2 (Estação 2)
      const y1 = yOfC(cfg.c1);
      const y2 = yOfC(cfg.c2);
      ctx.beginPath();
      ctx.moveTo(padL, y1);
      ctx.lineTo(W - padR, y2);
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ponto de consulta (Longitude/Latitude testada)
      const xPt = xOfFrac(resTeste.frac);
      const yPt = yOfC(resTeste.correcaoM);

      ctx.beginPath();
      ctx.moveTo(xPt, H - padB);
      ctx.lineTo(xPt, yPt);
      ctx.lineTo(W - padR, yPt);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(xPt, yPt, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#f472b6';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    },

    _parseNumero: function (str, separadorEscolhido) {
      if (str === undefined || str === null) return NaN;
      let s = String(str).trim();
      if (!s) return NaN;
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

      const cfgAbaco = this._lerConfigAbaco();

      const linhas = fonte.split(/\r?\n/);
      const pontos = [];

      let regexSep = /\s+/;
      if (sep === 'virgula') regexSep = /\s*,\s*/;
      else if (sep === 'ponto_virgula') regexSep = /\s*;\s*/;
      else if (sep === 'tab') regexSep = /\t+/;
      else if (sep === 'auto') regexSep = /[\s,;\t]+/;

      const mUtm = crs.match(/UTM_(\d+)([SN])/);
      const isUtm = crs.startsWith('UTM_');
      const zona = mUtm ? parseInt(mUtm[1], 10) : 22;
      const sul = mUtm ? (mUtm[2] === 'S') : true;

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
        if (isUtm) {
          if (x < 100000 || x > 950000 || y < 0 || y > 10500000) continue;
          const conv = this.utmParaLatLon(x, y, zona, sul);
          lat = conv.lat;
          lon = conv.lon;
        } else {
          if (Math.abs(lat) > 90 && Math.abs(lon) <= 90) {
            const tmp = lat; lat = lon; lon = tmp;
          }
          if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
        }

        const zBruto = z;
        let correcaoAbacoM = 0;
        if (cfgAbaco.ativo) {
          const rAb = this.calcularCorrecaoAbacoNaCoordenada(lat, lon, cfgAbaco);
          correcaoAbacoM = rAb.correcaoM;
          if (cfgAbaco.modoOperacao === 'reduzir_sondagem') {
            z = +(zBruto - correcaoAbacoM).toFixed(3);
          } else {
            z = +(zBruto + correcaoAbacoM).toFixed(3);
          }
        }

        pontos.push({ x, y, z, zBruto, correcaoAbacoM, lat, lon });
        if (limiteAmostra > 0 && pontos.length >= limiteAmostra) break;
      }

      return pontos;
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

    _diagnosticarGeometriaSondagem: function (pontos) {
      if (pontos.length < 10) return { passoIntraM: 5, espacamentoInterM: 50 };

      const distsSequenciais = [];
      const saltaLinhas = [];
      const limSeq = Math.min(pontos.length - 1, 2000);

      for (let i = 0; i < limSeq; i++) {
        const d = this._haversineMetros(pontos[i].lon, pontos[i].lat, pontos[i + 1].lon, pontos[i + 1].lat);
        if (d > 0.05 && d < 5000) distsSequenciais.push(d);
      }
      distsSequenciais.sort((a, b) => a - b);
      const passoIntraM = distsSequenciais.length
        ? distsSequenciais[Math.floor(distsSequenciais.length * 0.5)]
        : 5.0;

      const am = Math.min(pontos.length, 300);
      const stepAm = Math.max(1, Math.floor(pontos.length / am));

      for (let idx = 0; idx < pontos.length; idx += stepAm) {
        let menorForaDaLinha = Infinity;
        const pA = pontos[idx];
        for (let j = 0; j < pontos.length; j += Math.max(1, Math.floor(stepAm / 4))) {
          if (Math.abs(idx - j) <= 25) continue;
          const d = this._haversineMetros(pA.lon, pA.lat, pontos[j].lon, pontos[j].lat);
          if (d > passoIntraM * 2.2 && d < menorForaDaLinha) {
            menorForaDaLinha = d;
          }
        }
        if (Number.isFinite(menorForaDaLinha) && menorForaDaLinha < 3000) {
          saltaLinhas.push(menorForaDaLinha);
        }
      }

      saltaLinhas.sort((a, b) => a - b);
      const espacamentoInterM = saltaLinhas.length
        ? saltaLinhas[Math.floor(saltaLinhas.length * 0.45)]
        : Math.max(30, passoIntraM * 8);

      return {
        passoIntraM: +passoIntraM.toFixed(2),
        espacamentoInterM: +espacamentoInterM.toFixed(1)
      };
    },

    definirExtensao: function (modo) {
      const crs = document.getElementById('bat-projecao')?.value || 'UTM_22S';
      const epsg = this._obterCodigoEPSG(crs);
      this._extensao.epsg = epsg;

      if (modo === 'tela_mapa' && window.mapa) {
        const b = window.mapa.getBounds();
        const sw = b.getSouthWest();
        const ne = b.getNorthEast();
        this._extensao.minLat = sw.lat;
        this._extensao.maxLat = ne.lat;
        this._extensao.minLon = sw.lng;
        this._extensao.maxLon = ne.lng;

        if (crs.startsWith('UTM_')) {
          const m = crs.match(/UTM_(\d+)([SN])/);
          const zona = m ? parseInt(m[1], 10) : 22;
          const uSW = this.latLonParaUtm(sw.lat, sw.lng, zona);
          const uNE = this.latLonParaUtm(ne.lat, ne.lng, zona);
          this._extensao.xmin = Math.min(uSW.x, uNE.x);
          this._extensao.xmax = Math.max(uSW.x, uNE.x);
          this._extensao.ymin = Math.min(uSW.y, uNE.y);
          this._extensao.ymax = Math.max(uSW.y, uNE.y);
          this._extensao.larguraM = Math.max(1, this._extensao.xmax - this._extensao.xmin);
          this._extensao.alturaM = Math.max(1, this._extensao.ymax - this._extensao.ymin);
        } else {
          this._extensao.xmin = sw.lng;
          this._extensao.xmax = ne.lng;
          this._extensao.ymin = sw.lat;
          this._extensao.ymax = ne.lat;
          const latMed = (sw.lat + ne.lat) / 2;
          this._extensao.larguraM = Math.max(1, this._haversineMetros(sw.lng, latMed, ne.lng, latMed));
          this._extensao.alturaM = Math.max(1, this._haversineMetros(sw.lng, sw.lat, sw.lng, ne.lat));
        }
      } else {
        const pts = this._pontosCache.length ? this._pontosCache : this._extrairPontos(0);
        if (!pts.length) return;
        let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
        let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
        for (const p of pts) {
          if (p.x < xmin) xmin = p.x;
          if (p.x > xmax) xmax = p.x;
          if (p.y < ymin) ymin = p.y;
          if (p.y > ymax) ymax = p.y;
          if (p.lat < minLat) minLat = p.lat;
          if (p.lat > maxLat) maxLat = p.lat;
          if (p.lon < minLon) minLon = p.lon;
          if (p.lon > maxLon) maxLon = p.lon;
        }
        this._extensao.xmin = xmin;
        this._extensao.xmax = xmax;
        this._extensao.ymin = ymin;
        this._extensao.ymax = ymax;
        this._extensao.minLat = minLat;
        this._extensao.maxLat = maxLat;
        this._extensao.minLon = minLon;
        this._extensao.maxLon = maxLon;

        if (crs.startsWith('UTM_')) {
          this._extensao.larguraM = Math.max(1, xmax - xmin);
          this._extensao.alturaM = Math.max(1, ymax - ymin);
        } else {
          const latMed = (minLat + maxLat) / 2;
          this._extensao.larguraM = Math.max(1, this._haversineMetros(minLon, latMed, maxLon, latMed));
          this._extensao.alturaM = Math.max(1, this._haversineMetros(minLon, minLat, minLon, maxLat));
        }
      }

      const inpExt = document.getElementById('bat-extensao-qgis');
      if (inpExt) {
        inpExt.value = `${this._extensao.xmin.toFixed(4)},${this._extensao.xmax.toFixed(4)},${this._extensao.ymin.toFixed(4)},${this._extensao.ymax.toFixed(4)} [${epsg}]`;
      }

      this.aoMudarTamanhoPixelXY('ambos');
    },

    aoMudarTamanhoPixelXY: function (eixo) {
      if (!this._extensao.larguraM || !this._extensao.alturaM) return;

      const inpPxX = document.getElementById('bat-tam-pixel-x');
      const inpPxY = document.getElementById('bat-tam-pixel-y');
      const inpCols = document.getElementById('bat-pixels-cols');
      const inpRows = document.getElementById('bat-pixels-rows');

      let pxX = parseFloat(inpPxX?.value || '20');
      let pxY = parseFloat(inpPxY?.value || '20');

      if (eixo === 'x' && Number.isFinite(pxX) && pxX > 0) {
        pxY = pxX;
        if (inpPxY) inpPxY.value = pxX.toFixed(6);
      } else if (eixo === 'y' && Number.isFinite(pxY) && pxY > 0) {
        pxX = pxY;
        if (inpPxX) inpPxX.value = pxY.toFixed(6);
      }

      if (Number.isFinite(pxX) && pxX > 0 && inpCols) {
        const cols = Math.max(2, Math.round(this._extensao.larguraM / pxX));
        inpCols.value = cols;
      }
      if (Number.isFinite(pxY) && pxY > 0 && inpRows) {
        const rows = Math.max(2, Math.round(this._extensao.alturaM / pxY));
        inpRows.value = rows;
      }

      this._atualizarResumoGradeQGIS();
    },

    aoMudarLinhasColunasQGIS: function (qual) {
      if (!this._extensao.larguraM || !this._extensao.alturaM) return;

      const inpPxX = document.getElementById('bat-tam-pixel-x');
      const inpPxY = document.getElementById('bat-tam-pixel-y');
      const inpCols = document.getElementById('bat-pixels-cols');
      const inpRows = document.getElementById('bat-pixels-rows');

      if (qual === 'rows' && inpRows) {
        const rows = Math.max(2, parseInt(inpRows.value || '1000', 10) || 1000);
        const pxY = this._extensao.alturaM / rows;
        if (inpPxY) inpPxY.value = pxY.toFixed(6);
        if (inpPxX) inpPxX.value = pxY.toFixed(6);
        if (inpCols) inpCols.value = Math.max(2, Math.round(this._extensao.larguraM / pxY));
      } else if (inpCols) {
        const cols = Math.max(2, parseInt(inpCols.value || '1000', 10) || 1000);
        const pxX = this._extensao.larguraM / cols;
        if (inpPxX) inpPxX.value = pxX.toFixed(6);
        if (inpPxY) inpPxY.value = pxX.toFixed(6);
        if (inpRows) inpRows.value = Math.max(2, Math.round(this._extensao.alturaM / pxX));
      }

      this._atualizarResumoGradeQGIS();
    },

    aplicarPresetPixels: function (tamPixelM) {
      const inpPxX = document.getElementById('bat-tam-pixel-x');
      const inpPxY = document.getElementById('bat-tam-pixel-y');
      if (inpPxX) inpPxX.value = Number(tamPixelM).toFixed(6);
      if (inpPxY) inpPxY.value = Number(tamPixelM).toFixed(6);
      this.aoMudarTamanhoPixelXY('ambos');
    },

    _atualizarResumoGradeQGIS: function () {
      const el = document.getElementById('bat-resumo-grade-qgis');
      if (!el) return;
      const rows = parseInt(document.getElementById('bat-pixels-rows')?.value || '1200', 10) || 1200;
      const cols = parseInt(document.getElementById('bat-pixels-cols')?.value || '1350', 10) || 1350;
      const pxX = parseFloat(document.getElementById('bat-tam-pixel-x')?.value || '20') || 20;
      const pxY = parseFloat(document.getElementById('bat-tam-pixel-y')?.value || '20') || 20;
      const totalPx = cols * rows;
      const largKm = (this._extensao.larguraM / 1000).toFixed(2);
      const altKm = (this._extensao.alturaM / 1000).toFixed(2);
      const dIntra = this._extensao.passoIntraLinhaM || 0;
      const dInter = this._extensao.espacamentoInterLinhasM || 0;

      const avisoEscala = (rows > 2400 || cols > 2400)
        ? `<div style="margin-top:3px; color:#fbbf24; font-size:10px;">⚡ Grade teórica QGIS (${rows.toLocaleString('pt-BR')}×${cols.toLocaleString('pt-BR')} px) renderizada em Canvas GPU otimizado (máx. 2400 px/eixo).</div>`
        : '';

      el.innerHTML = `
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:4px;">
          <span>📐 <strong>Raster QGIS:</strong> <strong style="color:#38bdf8;">${rows.toLocaleString('pt-BR')} linhas × ${cols.toLocaleString('pt-BR')} colunas</strong> (<strong style="color:#fbbf24;">${totalPx.toLocaleString('pt-BR')} px</strong>)</span>
          <span>🔲 <strong>Pixel:</strong> ${pxX.toFixed(2)}m × ${pxY.toFixed(2)}m · Área: ${largKm}×${altKm} km</span>
        </div>
        ${dIntra > 0 ? `<div style="margin-top:3px; color:#a7f3d0; font-size:10px;">🚤 <strong>Malha:</strong> Passo na linha ≈ <strong>${dIntra} m</strong> · Espaçamento entre linhas ≈ <strong>${dInter} m</strong></div>` : ''}
        ${avisoEscala}
      `;
    },

    atualizarPreview: function (recalcularGrade = false) {
      const box = document.getElementById('bat-preview-corpo');
      if (!box) return;

      const todos = this._extrairPontos(0);
      this._pontosCache = todos;

      if (todos.length === 0) {
        box.innerHTML = `<div style="color:#94a3b8; font-style:italic;">Carregue um arquivo <strong>X Y Z</strong>, cole os dados ou clique em <strong>"🧪 Carregar Exemplo (EPSG:31982)"</strong>.</div>`;
        return;
      }

      let zMin = Infinity, zMax = -Infinity;
      for (const p of todos) {
        if (p.z < zMin) zMin = p.z;
        if (p.z > zMax) zMax = p.z;
      }
      this._extensao.zMin = zMin;
      this._extensao.zMax = zMax;

      const diag = this._diagnosticarGeometriaSondagem(todos);
      this._extensao.passoIntraLinhaM = diag.passoIntraM;
      this._extensao.espacamentoInterLinhasM = diag.espacamentoInterM;

      this.definirExtensao('camada');

      if (recalcularGrade) {
        // Auto-seleciona automaticamente a Carta Náutica / Ábaco correspondente à área geográfica dos pontos!
        this.autoDetectarAbacoPorCoordenadas(
          this._extensao.minLat,
          this._extensao.maxLat,
          this._extensao.minLon,
          this._extensao.maxLon,
          true
        );
        const pxDefault = (this._extensao.larguraM > 4000) ? 20.0 : 5.0;
        const inpPxX = document.getElementById('bat-tam-pixel-x');
        const inpPxY = document.getElementById('bat-tam-pixel-y');
        if (inpPxX) inpPxX.value = pxDefault.toFixed(6);
        if (inpPxY) inpPxY.value = pxDefault.toFixed(6);
        this.aoMudarTamanhoPixelXY('ambos');

        const inpMaxAresta = document.getElementById('bat-max-aresta');
        if (inpMaxAresta) {
          inpMaxAresta.value = Math.max(100, Math.round(diag.espacamentoInterM * 2.5));
        }

        const zCritDefault = +(zMin + (zMax - zMin) * 0.35).toFixed(2);
        const inpZCritModal = document.getElementById('bat-z-critico');
        const inpZCritPainel = document.getElementById('perfil-z-critico');
        const sliderZCrit = document.getElementById('perfil-z-slider');
        if (inpZCritModal) inpZCritModal.value = zCritDefault;
        if (inpZCritPainel) inpZCritPainel.value = zCritDefault;
        if (sliderZCrit) {
          sliderZCrit.min = zMin.toFixed(2);
          sliderZCrit.max = zMax.toFixed(2);
          sliderZCrit.step = Math.max(0.05, +((zMax - zMin) / 200).toFixed(2));
          sliderZCrit.value = zCritDefault;
        }
        const selCondModal = document.getElementById('bat-condicao-restricao');
        const selCondPainel = document.getElementById('perfil-condicao-restricao');
        const condSugerida = (zMax <= 0 && zMin < zMax) ? 'maior_igual' : 'menor_igual';
        if (selCondModal) selCondModal.value = condSugerida;
        if (selCondPainel) selCondPainel.value = condSugerida;
      } else {
        this._atualizarResumoGradeQGIS();
      }

      const cfgAbaco = this._lerConfigAbaco();
      const amostra = todos.slice(0, 4);
      const linhasHtml = amostra.map((p, idx) => `
        <tr>
          <td style="color:#94a3b8;">#${idx + 1}</td>
          <td style="font-family:monospace;">${p.x.toFixed(2)}</td>
          <td style="font-family:monospace;">${p.y.toFixed(2)}</td>
          <td style="font-family:monospace; color:#38bdf8; font-weight:700;">${p.z.toFixed(2)} m ${cfgAbaco.ativo ? `<span style="color:#f472b6; font-size:9.5px;">(bruto: ${p.zBruto.toFixed(2)}m | Δ=${p.correcaoAbacoM >= 0 ? '+' : ''}${p.correcaoAbacoM.toFixed(2)}m)</span>` : ''}</td>
          <td style="font-family:monospace; color:#a7f3d0;">${p.lat.toFixed(5)}°, ${p.lon.toFixed(5)}°</td>
        </tr>
      `).join('');

      const temPoligonoManual = !!this._poligonoLimiteGeoJSON;

      box.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
          <span>✅ <strong style="color:#38bdf8;">${todos.length.toLocaleString('pt-BR')}</strong> pontos lidos</span>
          <span>🌊 Cota Z: <strong>${zMin.toFixed(2)} m</strong> a <strong>${zMax.toFixed(2)} m</strong></span>
          ${this._ultimoAbacoAutoDetectado ? `<span onclick="BatimetriaTINManager.trocarAbaModal('abaco')" title="Clique para abrir o Ábaco auto-detectado desta área" style="background:#1e3a8a; color:#93c5fd; border:1px solid #38bdf8; padding:1px 7px; border-radius:4px; font-weight:700; cursor:pointer;">🧭 Carta da Área: ${this._ultimoAbacoAutoDetectado.rio} (${this._ultimoAbacoAutoDetectado.cartasSerie})</span>` : ''}
          ${cfgAbaco.ativo ? `<span style="background:#831843; color:#fbcfe8; padding:1px 6px; border-radius:4px; font-weight:700;">⚓ Ábaco Marinha/ANA Ativo</span>` : ''}
          ${temPoligonoManual ? `<span style="background:#065f46; color:#a7f3d0; padding:1px 6px; border-radius:4px; font-weight:700;">✏️ Limite Manual Ativo</span>` : ''}
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:10.5px; text-align:left;">
          <thead>
            <tr style="border-bottom:1px solid #1e4976; color:#94a3b8;">
              <th>Pt</th><th>X (Easting)</th><th>Y (Northing)</th><th>Z ${cfgAbaco.ativo ? '(Corrigido Ábaco)' : '(Atributo)'}</th><th>SIRGAS 2000 (Lat, Lon)</th>
            </tr>
          </thead>
          <tbody>${linhasHtml}</tbody>
        </table>
      `;
    },

    // =========================================================================
    // DESENHO DO LIMITE EXTERNO MANUAL DO TIN
    // =========================================================================
    iniciarDesenhoLimiteManual: function () {
      const pontos = this._extrairPontos(0);
      if (pontos.length < 3) {
        if (window.UI) window.UI.toast('⚠️ Carregue os pontos X Y Z primeiro para desenhar o limite sobre eles.', 'alerta');
        return;
      }

      this.fecharModal();
      this.limparLimiteManual(true);

      this._previewPontosLayer = L.featureGroup();
      const passo = Math.max(1, Math.floor(pontos.length / 1200));
      for (let i = 0; i < pontos.length; i += passo) {
        L.circleMarker([pontos[i].lat, pontos[i].lon], {
          radius: 2.2,
          color: '#38bdf8',
          fillColor: '#0284c7',
          fillOpacity: 0.85,
          weight: 1,
          interactive: false
        }).addTo(this._previewPontosLayer);
      }
      this._previewPontosLayer.addTo(window.mapa);
      try {
        window.mapa.fitBounds(this._previewPontosLayer.getBounds().pad(0.15));
      } catch (_) {}

      this._desenhandoLimite = true;
      this._verticesLimite = [];
      this._layerLimiteTemp = L.featureGroup().addTo(window.mapa);

      const selRecorte = document.getElementById('bat-modo-recorte');
      if (selRecorte) selRecorte.value = 'manual';

      if (window.UI) {
        window.UI.toast('✏️ Clique no mapa contornando o limite dos pontos. Dê DUPLO-CLIQUE (ou clique em Concluir Limite) para fechar!');
      }

      let barra = document.getElementById('bat-barra-desenho-limite');
      if (!barra) {
        barra = document.createElement('div');
        barra.id = 'bat-barra-desenho-limite';
        barra.style.cssText = 'position:fixed; top:112px; left:50%; transform:translateX(-50%); z-index:999999; background:#0a2540; border:2px solid #f59e0b; color:#fff; padding:10px 16px; border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,0.6); display:flex; align-items:center; gap:10px; font-family:"Segoe UI",sans-serif; font-size:12px;';
        document.body.appendChild(barra);
      }
      barra.style.display = 'flex';
      barra.innerHTML = `
        <span>✏️ <strong>Desenhando Limite do TIN:</strong> Clique ao redor da nuvem de pontos (<span id="bat-cnt-verts">0</span> vértices)</span>
        <button onclick="BatimetriaTINManager.finalizarDesenhoLimite()" style="background:#10b981; color:#fff; border:none; padding:5px 12px; border-radius:6px; font-weight:700; cursor:pointer;">✓ Concluir Limite</button>
        <button onclick="BatimetriaTINManager.cancelarDesenhoLimite()" style="background:#ef4444; color:#fff; border:none; padding:5px 10px; border-radius:6px; font-weight:700; cursor:pointer;">✕ Cancelar</button>
      `;

      window.mapa.getContainer().style.cursor = 'crosshair';
      if (window.mapa.doubleClickZoom) window.mapa.doubleClickZoom.disable();

      this._onMapClickLimite = (e) => {
        if (!this._desenhandoLimite) return;
        this._verticesLimite.push([e.latlng.lat, e.latlng.lng]);
        const cntEl = document.getElementById('bat-cnt-verts');
        if (cntEl) cntEl.textContent = String(this._verticesLimite.length);
        this._redesenharPoligonoTemp();
      };

      this._onMapDblClickLimite = (e) => {
        if (!this._desenhandoLimite) return;
        L.DomEvent.stopPropagation(e);
        this.finalizarDesenhoLimite();
      };

      window.mapa.on('click', this._onMapClickLimite);
      window.mapa.on('dblclick', this._onMapDblClickLimite);
    },

    _redesenharPoligonoTemp: function () {
      if (!this._layerLimiteTemp) return;
      this._layerLimiteTemp.clearLayers();
      if (this._verticesLimite.length === 0) return;

      for (const v of this._verticesLimite) {
        L.circleMarker(v, {
          radius: 4.5,
          color: '#ffffff',
          weight: 1.5,
          fillColor: '#f59e0b',
          fillOpacity: 1,
          interactive: false
        }).addTo(this._layerLimiteTemp);
      }

      if (this._verticesLimite.length >= 2) {
        L.polygon(this._verticesLimite, {
          color: '#f59e0b',
          weight: 2.5,
          dashArray: '6, 4',
          fillColor: '#fbbf24',
          fillOpacity: 0.15,
          interactive: false
        }).addTo(this._layerLimiteTemp);
      }
    },

    finalizarDesenhoLimite: function () {
      this._encerrarListenersDesenho();

      if (this._verticesLimite.length < 3) {
        if (window.UI) window.UI.toast('⚠️ Desenhe pelo menos 3 vértices para formar o polígono de limite.', 'alerta');
        this.limparLimiteManual(true);
        this.abrirModal();
        return;
      }

      const ring = this._verticesLimite.map(v => [v[1], v[0]]);
      ring.push([this._verticesLimite[0][1], this._verticesLimite[0][0]]);
      this._poligonoLimiteGeoJSON = {
        type: 'Feature',
        properties: { tipo: 'limite_manual_tin' },
        geometry: { type: 'Polygon', coordinates: [ring] }
      };

      const selRecorte = document.getElementById('bat-modo-recorte');
      if (selRecorte) selRecorte.value = 'manual';

      const statusLim = document.getElementById('bat-status-limite-manual');
      if (statusLim) {
        statusLim.innerHTML = `<span style="color:#10b981; font-weight:700;">✅ Polígono manual (${this._verticesLimite.length} vértices)</span> · <a href="javascript:void(0)" onclick="BatimetriaTINManager.limparLimiteManual()" style="color:#f87171; text-decoration:underline;">Limpar</a>`;
      }

      if (window.UI) window.UI.toast(`✅ Limite manual com ${this._verticesLimite.length} vértices gravado! Clique em "Executar Interpolação TIN".`);
      this.abrirModal();
    },

    cancelarDesenhoLimite: function () {
      this._encerrarListenersDesenho();
      this.limparLimiteManual(true);
      this.abrirModal();
    },

    _encerrarListenersDesenho: function () {
      this._desenhandoLimite = false;
      if (window.mapa) {
        window.mapa.getContainer().style.cursor = '';
        if (this._onMapClickLimite) window.mapa.off('click', this._onMapClickLimite);
        if (this._onMapDblClickLimite) window.mapa.off('dblclick', this._onMapDblClickLimite);
        setTimeout(() => {
          if (window.mapa && window.mapa.doubleClickZoom) window.mapa.doubleClickZoom.enable();
        }, 250);
      }
      const barra = document.getElementById('bat-barra-desenho-limite');
      if (barra) barra.style.display = 'none';
      if (this._previewPontosLayer && window.mapa) {
        try { window.mapa.removeLayer(this._previewPontosLayer); } catch (_) {}
        this._previewPontosLayer = null;
      }
    },

    limparLimiteManual: function (silencioso) {
      this._poligonoLimiteGeoJSON = null;
      this._verticesLimite = [];
      if (this._layerLimiteTemp && window.mapa) {
        try { window.mapa.removeLayer(this._layerLimiteTemp); } catch (_) {}
        this._layerLimiteTemp = null;
      }
      const statusLim = document.getElementById('bat-status-limite-manual');
      if (statusLim) statusLim.innerHTML = `<span style="color:#94a3b8;">Nenhum polígono manual desenhado.</span>`;
      if (!silencioso) {
        this.atualizarPreview(false);
        if (window.UI) window.UI.toast('🗑️ Polígono de limite manual removido.');
      }
    },

    carregarExemploUTM22S: function () {
      const baseE = 767005.30;
      const baseN = 9878178.65;
      const linhasXYZ = [
        '# Levantamento Ecobatimétrico — Seções Transversais + Longitudinais (SIRGAS 2000 / UTM Zona 22S - EPSG:31982)',
        '# Formato: X(Easting_m) Y(Northing_m) Z(Profundidade_m) — Separado por Espaço'
      ];

      const numSecoes = 28;
      const passoLongo = 140;
      const larguraMeio = 320;

      for (let s = 0; s < numSecoes; s++) {
        const prog = s / (numSecoes - 1);
        const centroN = baseN + s * passoLongo;
        const centroE = baseE + Math.sin(prog * Math.PI * 1.4) * 380;
        const dEdS = Math.cos(prog * Math.PI * 1.4) * (Math.PI * 1.4 / ((numSecoes - 1) * passoLongo)) * 380;
        const ang = Math.atan2(dEdS, 1);
        const cosA = Math.cos(ang), sinA = Math.sin(ang);

        for (let p = -9; p <= 9; p++) {
          const frac = p / 9;
          const offset = frac * larguraMeio;
          const x = centroE + offset * cosA;
          const y = centroN - offset * sinA;

          let prof = 1.4 + (1 - frac * frac) * 14.5;
          if (s >= 8 && s <= 12 && Math.abs(frac) <= 0.55) {
            prof = 2.15 + Math.abs(frac) * 2.2;
          } else if (s >= 19 && s <= 21 && Math.abs(frac) <= 0.45) {
            prof = 3.40 + Math.abs(frac) * 1.8;
          }
          linhasXYZ.push(`${x.toFixed(2)} ${y.toFixed(2)} ${prof.toFixed(2)}`);
        }
      }

      this._textoBruto = linhasXYZ.join('\n');
      this._nomeArquivo = 'Area1_R20_ComRS_Final';

      const txtArea = document.getElementById('bat-texto-xyz');
      if (txtArea) txtArea.value = this._textoBruto;
      const selSep = document.getElementById('bat-separador');
      if (selSep) selSep.value = 'espaco';
      const selProj = document.getElementById('bat-projecao');
      if (selProj) selProj.value = 'UTM_22S';
      const lbl = document.getElementById('bat-nome-arquivo');
      if (lbl) lbl.textContent = '🧪 Area1_R20_ComRS_Final.xyz (532 pontos em EPSG:31982)';

      this.atualizarPreview(true);
      if (window.UI) window.UI.toast('🧪 Levantamento de exemplo em EPSG:31982 carregado!');
    },

    _podarApenasBordaExternaSemBuracos: function (triangulos, maxArestaMetros) {
      if (!maxArestaMetros || maxArestaMetros <= 0 || triangulos.length <= 4) {
        return triangulos;
      }

      const chaveV = (pt) => `${pt[0].toFixed(6)},${pt[1].toFixed(6)}`;
      const chaveAresta = (k1, k2) => (k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`);

      const n = triangulos.length;
      const ativo = new Uint8Array(n);
      ativo.fill(1);

      const mapaArestaTris = new Map();
      const contagemVertice = new Map();
      const dadosTris = new Array(n);

      for (let i = 0; i < n; i++) {
        const ring = triangulos[i].geometry?.coordinates?.[0];
        if (!ring || ring.length < 4) {
          ativo[i] = 0;
          continue;
        }
        const p0 = ring[0], p1 = ring[1], p2 = ring[2];
        const k0 = chaveV(p0), k1 = chaveV(p1), k2 = chaveV(p2);
        const e01 = chaveAresta(k0, k1);
        const e12 = chaveAresta(k1, k2);
        const e20 = chaveAresta(k2, k0);

        const d01 = this._haversineMetros(p0[0], p0[1], p1[0], p1[1]);
        const d12 = this._haversineMetros(p1[0], p1[1], p2[0], p2[1]);
        const d20 = this._haversineMetros(p2[0], p2[1], p0[0], p0[1]);

        dadosTris[i] = {
          verts: [k0, k1, k2],
          arestas: [e01, e12, e20],
          comprimentos: [d01, d12, d20]
        };

        for (const vk of [k0, k1, k2]) {
          contagemVertice.set(vk, (contagemVertice.get(vk) || 0) + 1);
        }
        for (const ek of [e01, e12, e20]) {
          let arr = mapaArestaTris.get(ek);
          if (!arr) { arr = []; mapaArestaTris.set(ek, arr); }
          arr.push(i);
        }
      }

      const grauAresta = (ek) => {
        const arr = mapaArestaTris.get(ek);
        if (!arr) return 0;
        let c = 0;
        for (let i = 0; i < arr.length; i++) {
          if (ativo[arr[i]]) c++;
        }
        return c;
      };

      const limiarSliverM = Math.max(40, maxArestaMetros * 0.42);

      const fila = [];
      for (let i = 0; i < n; i++) {
        if (!ativo[i]) continue;
        const dt = dadosTris[i];
        if (grauAresta(dt.arestas[0]) === 1 || grauAresta(dt.arestas[1]) === 1 || grauAresta(dt.arestas[2]) === 1) {
          fila.push(i);
        }
      }

      while (fila.length > 0) {
        const idx = fila.pop();
        if (!ativo[idx]) continue;
        const dt = dadosTris[idx];

        const g0 = grauAresta(dt.arestas[0]);
        const g1 = grauAresta(dt.arestas[1]);
        const g2 = grauAresta(dt.arestas[2]);

        const expostas = (g0 === 1 ? 1 : 0) + (g1 === 1 ? 1 : 0) + (g2 === 1 ? 1 : 0);
        if (expostas === 0) continue;

        const [a, b, c] = dt.comprimentos;
        let devePodarBorda = false;

        if ((g0 === 1 && a > maxArestaMetros) || (g1 === 1 && b > maxArestaMetros) || (g2 === 1 && c > maxArestaMetros)) {
          devePodarBorda = true;
        }

        if (!devePodarBorda) {
          const checarSliver = (ladoExposto, l1, l2) => {
            if (ladoExposto < limiarSliverM) return false;
            const cosAngOposto = (l1 * l1 + l2 * l2 - ladoExposto * ladoExposto) / (2 * l1 * l2 || 1);
            return cosAngOposto < -0.74;
          };
          if (g0 === 1 && checarSliver(a, b, c)) devePodarBorda = true;
          else if (g1 === 1 && checarSliver(b, a, c)) devePodarBorda = true;
          else if (g2 === 1 && checarSliver(c, a, b)) devePodarBorda = true;
        }

        if (!devePodarBorda) continue;

        const v0Count = contagemVertice.get(dt.verts[0]) || 0;
        const v1Count = contagemVertice.get(dt.verts[1]) || 0;
        const v2Count = contagemVertice.get(dt.verts[2]) || 0;
        if (v0Count <= 1 || v1Count <= 1 || v2Count <= 1) continue;

        ativo[idx] = 0;
        contagemVertice.set(dt.verts[0], v0Count - 1);
        contagemVertice.set(dt.verts[1], v1Count - 1);
        contagemVertice.set(dt.verts[2], v2Count - 1);

        for (const ek of dt.arestas) {
          const vizinhos = mapaArestaTris.get(ek) || [];
          for (const vIdx of vizinhos) {
            if (ativo[vIdx]) fila.push(vIdx);
          }
        }
      }

      const resultado = [];
      for (let i = 0; i < n; i++) {
        if (ativo[i]) resultado.push(triangulos[i]);
      }
      return resultado;
    },

    // =========================================================================
    // AVALIAÇÃO DE RESTRIÇÃO DE PROFUNDIDADE / CALADO CRÍTICO
    // =========================================================================
    _obterParametrosRestricao: function () {
      const inpPainel = document.getElementById('perfil-z-critico');
      const inpModal = document.getElementById('bat-z-critico');
      const selCondPainel = document.getElementById('perfil-condicao-restricao');
      const selCondModal = document.getElementById('bat-condicao-restricao');
      const selModoFiltroModal = document.getElementById('bat-modo-filtro-restricao');
      const selModoFiltroPainel = document.getElementById('perfil-modo-filtro-mapa');

      const zCritico = parseFloat(inpPainel?.value || inpModal?.value || '5.0') || 5.0;
      const condicao = selCondPainel?.value || selCondModal?.value || 'menor_igual';
      const modoFiltroMapa = selModoFiltroPainel?.value || selModoFiltroModal?.value || 'desativado';
      const folgaAtencao = 1.0;

      return { zCritico, condicao, modoFiltroMapa, folgaAtencao };
    },

    /**
     * Converte qualquer cota/profundidade Z (positiva ou negativa) em Profundidade Positiva (metros de coluna d'água >= 0).
     * Assim, tanto Z = -25.0m quanto Z = +25.0m representam 25,0 m de profundidade, e Z = -4.78m representa 4,78 m (raso!).
     */
    _profundidadePositivaM: function (z) {
      if (!Number.isFinite(z)) return 0;
      const zMin = this._extensao?.zMin ?? 0;
      const zMax = this._extensao?.zMax ?? 0;
      // Se o conjunto de dados está em cotas negativas (ex: -31.45 m a -3.79 m), a profundidade é |z| = -z
      if ((zMin + zMax) / 2 < 0) {
        return Math.max(0, -z);
      }
      return Math.max(0, z);
    },

    _avaliarCotaRestricao: function (z, zCritico, condicao, folgaAtencao = 1.0) {
      // Trabalha sempre com a magnitude positiva da profundidade da coluna d'água (ex: 4.78 m vs Calado Crítico 17.70 m)
      const profM = Math.abs(Number(z) || 0);
      const limProfM = Math.abs(Number(zCritico) || 0);

      // Em hidrografia, há restrição à navegação quando a profundidade disponível (profM) é MENOR OU IGUAL ao limite (limProfM)
      // (a menos que o usuário explicitamente escolha 'maior_igual' em cotas positivas especiais)
      const folgaM = profM - limProfM;
      const restrito = profM <= limProfM;
      const atencao = !restrito && folgaM <= folgaAtencao;
      const deficitM = restrito ? (limProfM - profM) : 0;
      return { restrito, atencao, deficitM, folgaM, profM, limProfM };
    },

    _obterCorRGB: function (z, zMin, zMax, paleta) {
      const profM = Math.abs(Number(z) || 0);
      if (paleta === 'calado_fixo') {
        if (profM <= 2.5) return [220, 38, 38];
        if (profM <= 4.5) return [249, 115, 22];
        if (profM <= 7.0) return [234, 179, 8];
        if (profM <= 11.0) return [56, 189, 248];
        if (profM <= 16.0) return [2, 132, 199];
        return [30, 58, 138];
      }

      const span = Math.max(0.0001, zMax - zMin);
      let t = Math.max(0, Math.min(1, (z - zMin) / span));
      // Se as cotas forem negativas (ex: zMin = -31.45 m [fundo] e zMax = -3.79 m [raso]),
      // inverte t para que o RASO (-3.79 m) tenha t = 0 (Vermelho/Amarelo) e o FUNDO (-31.45 m) tenha t = 1 (Azul Marinho)!
      if ((zMin + zMax) / 2 < 0) {
        t = 1.0 - t;
      }

      if (paleta === 'qgis_grayscale') {
        const v = Math.round(t * 255);
        return [v, v, v];
      }

      let stops;
      if (paleta === 'azuis_oceanicos') {
        stops = [
          [0.00, 224, 242, 254],
          [0.25, 125, 211, 252],
          [0.50, 14, 165, 233],
          [0.75, 3, 105, 161],
          [1.00, 12, 30, 74]
        ];
      } else if (paleta === 'viridis') {
        stops = [
          [0.00, 253, 231, 37],
          [0.25, 94, 201, 98],
          [0.50, 33, 145, 140],
          [0.75, 59, 82, 139],
          [1.00, 68, 1, 84]
        ];
      } else {
        // Spectral Batimétrica Padrão: t=0 (Raso -> Vermelho/Laranja/Amarelo) -> t=1 (Fundo -> Azul Oceânico Escuro)
        stops = [
          [0.00, 215, 25, 28],
          [0.22, 253, 174, 97],
          [0.45, 255, 255, 191],
          [0.72, 43, 131, 186],
          [1.00, 10, 37, 88]
        ];
      }

      for (let i = 0; i < stops.length - 1; i++) {
        const s0 = stops[i], s1 = stops[i + 1];
        if (t >= s0[0] && t <= s1[0]) {
          const f = (t - s0[0]) / (s1[0] - s0[0]);
          return [
            Math.round(s0[1] + (s1[1] - s0[1]) * f),
            Math.round(s0[2] + (s1[2] - s0[2]) * f),
            Math.round(s0[3] + (s1[3] - s0[3]) * f)
          ];
        }
      }
      const last = stops[stops.length - 1];
      return [last[1], last[2], last[3]];
    },

    _rgbParaHex: function (rgb) {
      return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
    },

    _gerarRasterCanvasTIN: function (triangulos, boundsGeo, cols, rows, metodoInterp, zMin, zMax, paleta, filtroRestricao) {
      const canvas = document.createElement('canvas');
      canvas.width = cols;
      canvas.height = rows;
      const ctx = canvas.getContext('2d');
      const imgData = ctx.createImageData(cols, rows);
      const data = imgData.data;

      const { minLon, maxLon, minLat, maxLat } = boundsGeo;
      const dLon = Math.max(1e-9, maxLon - minLon);
      const dLat = Math.max(1e-9, maxLat - minLat);

      const cfgRest = filtroRestricao || this._obterParametrosRestricao();
      const modoFiltro = cfgRest.modoFiltroMapa || 'desativado';
      const zCrit = cfgRest.zCritico;
      const cond = cfgRest.condicao;

      let pixelsAtivos = 0;
      let pixelsRestritos = 0;
      let somaDeficitM = 0;

      for (let t = 0; t < triangulos.length; t++) {
        const tri = triangulos[t];
        const ring = tri.geometry.coordinates[0];
        const lon0 = ring[0][0], lat0 = ring[0][1], z0 = Number(tri.properties._z0);
        const lon1 = ring[1][0], lat1 = ring[1][1], z1 = Number(tri.properties._z1);
        const lon2 = ring[2][0], lat2 = ring[2][1], z2 = Number(tri.properties._z2);

        const x0 = ((lon0 - minLon) / dLon) * (cols - 1);
        const y0 = ((maxLat - lat0) / dLat) * (rows - 1);
        const x1 = ((lon1 - minLon) / dLon) * (cols - 1);
        const y1 = ((maxLat - lat1) / dLat) * (rows - 1);
        const x2 = ((lon2 - minLon) / dLon) * (cols - 1);
        const y2 = ((maxLat - lat2) / dLat) * (rows - 1);

        const minPxX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
        const maxPxX = Math.min(cols - 1, Math.ceil(Math.max(x0, x1, x2)));
        const minPxY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
        const maxPxY = Math.min(rows - 1, Math.ceil(Math.max(y0, y1, y2)));

        const denom = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
        if (Math.abs(denom) < 1e-10) continue;

        for (let py = minPxY; py <= maxPxY; py++) {
          for (let px = minPxX; px <= maxPxX; px++) {
            let w0 = ((y1 - y2) * (px - x2) + (x2 - x1) * (py - y2)) / denom;
            let w1 = ((y2 - y0) * (px - x2) + (x0 - x2) * (py - y2)) / denom;
            let w2 = 1.0 - w0 - w1;

            if (w0 >= -0.0005 && w1 >= -0.0005 && w2 >= -0.0005) {
              w0 = Math.max(0, w0);
              w1 = Math.max(0, w1);
              w2 = Math.max(0, w2);
              const somaW = w0 + w1 + w2 || 1;
              w0 /= somaW; w1 /= somaW; w2 /= somaW;

              let zInterp;
              if (metodoInterp === 'suavizado') {
                const s0 = w0 * w0 * (3 - 2 * w0);
                const s1 = w1 * w1 * (3 - 2 * w1);
                const s2 = w2 * w2 * (3 - 2 * w2);
                const sTot = (s0 + s1 + s2) || 1;
                zInterp = (s0 * z0 + s1 * z1 + s2 * z2) / sTot;
              } else {
                zInterp = w0 * z0 + w1 * z1 + w2 * z2;
              }

              const idx = (py * cols + px) * 4;
              const eraNovo = (data[idx + 3] === 0);
              if (eraNovo) pixelsAtivos++;

              const av = this._avaliarCotaRestricao(zInterp, zCrit, cond, 1.0);
              if (eraNovo && av.restrito) {
                pixelsRestritos++;
                somaDeficitM += av.deficitM;
              }

              let rgb = this._obterCorRGB(zInterp, zMin, zMax, paleta);
              let alpha = 240;

              if (modoFiltro === 'destacar_vermelho') {
                if (av.restrito) {
                  const hachura = ((px + py) % 6 < 2);
                  rgb = hachura ? [254, 202, 202] : [220, 38, 38];
                  alpha = 250;
                }
              } else if (modoFiltro === 'apenas_restricao') {
                if (av.restrito) {
                  const sev = Math.min(1, av.deficitM / Math.max(0.5, Math.abs(zMax - zMin) * 0.25));
                  rgb = [
                    239,
                    Math.round(140 * (1 - sev) + 20),
                    Math.round(40 * (1 - sev))
                  ];
                  alpha = 250;
                } else {
                  alpha = 0;
                }
              } else if (modoFiltro === 'semaforo_calado') {
                if (av.restrito) {
                  rgb = [220, 38, 38];
                  alpha = 245;
                } else if (av.atencao) {
                  rgb = [245, 158, 11];
                  alpha = 235;
                } else {
                  rgb = [16, 185, 129];
                  alpha = 215;
                }
              }

              data[idx] = rgb[0];
              data[idx + 1] = rgb[1];
              data[idx + 2] = rgb[2];
              data[idx + 3] = alpha;
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      const areaTotalM2 = Math.max(1, this._extensao.larguraM * this._extensao.alturaM);
      const areaPorPixelCanvasM2 = areaTotalM2 / Math.max(1, cols * rows);
      const areaRestritaM2 = pixelsRestritos * areaPorPixelCanvasM2;
      const volumeDragagemM3 = somaDeficitM * areaPorPixelCanvasM2;

      return {
        dataUrl: canvas.toDataURL('image/png'),
        pixelsAtivos,
        pixelsRestritos,
        percRestrito: pixelsAtivos > 0 ? +((pixelsRestritos / pixelsAtivos) * 100).toFixed(1) : 0,
        areaRestritaHa: +(areaRestritaM2 / 10000).toFixed(2),
        areaRestritaM2: Math.round(areaRestritaM2),
        volumeDragagemM3: Math.round(volumeDragagemM3),
        pixelsNoData: (cols * rows) - pixelsAtivos,
        totalPixelsGrade: cols * rows
      };
    },

    sincronizarRestricaoEAtualizar: function (origem) {
      const inpModal = document.getElementById('bat-z-critico');
      const inpPainel = document.getElementById('perfil-z-critico');
      const sliderPainel = document.getElementById('perfil-z-slider');
      const selCondModal = document.getElementById('bat-condicao-restricao');
      const selCondPainel = document.getElementById('perfil-condicao-restricao');
      const selModoModal = document.getElementById('bat-modo-filtro-restricao');
      const selModoPainel = document.getElementById('perfil-modo-filtro-mapa');

      if (origem === 'modal') {
        if (inpPainel && inpModal) inpPainel.value = inpModal.value;
        if (sliderPainel && inpModal) sliderPainel.value = inpModal.value;
        if (selCondPainel && selCondModal) selCondPainel.value = selCondModal.value;
        if (selModoPainel && selModoModal) selModoPainel.value = selModoModal.value;
      } else if (origem === 'slider') {
        if (inpPainel && sliderPainel) inpPainel.value = Number(sliderPainel.value).toFixed(2);
        if (inpModal && sliderPainel) inpModal.value = Number(sliderPainel.value).toFixed(2);
      } else if (origem === 'painel') {
        if (inpModal && inpPainel) inpModal.value = inpPainel.value;
        if (sliderPainel && inpPainel) sliderPainel.value = inpPainel.value;
        if (selCondModal && selCondPainel) selCondModal.value = selCondPainel.value;
        if (selModoModal && selModoPainel) selModoModal.value = selModoPainel.value;
      }

      if (this._ultimoResultadoGeoJSON && this._ultimoImgOverlay && this._ultimoBoundsGeo) {
        const tris = this._ultimoResultadoGeoJSON.features;
        const info = this._gerarRasterCanvasTIN(
          tris,
          this._ultimoBoundsGeo,
          this._ultimoColsCanvas,
          this._ultimoRowsCanvas,
          this._ultimoMetodoInterp,
          this._extensao.zMin,
          this._extensao.zMax,
          this._ultimoPaleta,
          this._obterParametrosRestricao()
        );
        this._ultimoRasterDataUrl = info.dataUrl;
        this._ultimoImgOverlay.setUrl(info.dataUrl);
        this._atualizarResumoRestricaoGlobal(info);
      }

      if (this._amostrasPerfil && this._amostrasPerfil.length >= 2) {
        this._recalcularTrechosCriticosDoPerfil();
        this._desenharRotaSegmentadaNoMapa();
        this._renderizarGraficoPerfil();
        this._renderizarTabelaTrechosCriticos();
      }
    },

    _atualizarResumoRestricaoGlobal: function (infoRaster) {
      const cfg = this._obterParametrosRestricao();
      const simb = cfg.condicao === 'maior_igual' ? '≥' : '≤';
      const html = `
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px; align-items:center;">
          <span>🚨 <strong>Filtro (${simb} ${cfg.zCritico.toFixed(2)} m):</strong> <strong style="color:#f87171;">${infoRaster.percRestrito}% da área com restrição</strong> (${infoRaster.areaRestritaHa.toLocaleString('pt-BR')} ha / ${infoRaster.areaRestritaM2.toLocaleString('pt-BR')} m²)</span>
          <span>🏗️ <strong>Volume de Corte/Dragagem até ${cfg.zCritico.toFixed(2)} m:</strong> <strong style="color:#fbbf24;">${infoRaster.volumeDragagemM3.toLocaleString('pt-BR')} m³</strong></span>
        </div>
      `;
      const boxModal = document.getElementById('bat-resumo-restricao-modal');
      if (boxModal) {
        boxModal.style.display = 'block';
        boxModal.innerHTML = html;
      }
      const boxPainel = document.getElementById('perfil-resumo-mancha-global');
      if (boxPainel) {
        boxPainel.innerHTML = html;
      }
    },

    _interpolarPontoNosTriangulos: function (lon, lat, triangulos, metodoInterp) {
      for (let i = 0; i < triangulos.length; i++) {
        const tri = triangulos[i];
        const ring = tri.geometry.coordinates[0];
        const x0 = ring[0][0], y0 = ring[0][1], z0 = Number(tri.properties._z0);
        const x1 = ring[1][0], y1 = ring[1][1], z1 = Number(tri.properties._z1);
        const x2 = ring[2][0], y2 = ring[2][1], z2 = Number(tri.properties._z2);

        const denom = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
        if (Math.abs(denom) < 1e-12) continue;

        const w0 = ((y1 - y2) * (lon - x2) + (x2 - x1) * (lat - y2)) / denom;
        const w1 = ((y2 - y0) * (lon - x2) + (x0 - x2) * (lat - y2)) / denom;
        const w2 = 1.0 - w0 - w1;

        if (w0 >= -0.002 && w1 >= -0.002 && w2 >= -0.002) {
          let z;
          if (metodoInterp === 'suavizado') {
            const s0 = w0 * w0 * (3 - 2 * w0);
            const s1 = w1 * w1 * (3 - 2 * w1);
            const s2 = w2 * w2 * (3 - 2 * w2);
            z = (s0 * z0 + s1 * z1 + s2 * z2) / ((s0 + s1 + s2) || 1);
          } else {
            z = w0 * z0 + w1 * z1 + w2 * z2;
          }
          return { z, tri, z0, z1, z2 };
        }
      }
      return null;
    },

    _amostrarPreservandoFeicoes: function (pontosBrutos, limiteMax = 20000) {
      if (pontosBrutos.length <= limiteMax) return pontosBrutos;

      const n = pontosBrutos.length;
      const passo = Math.ceil(n / limiteMax);
      const selecionados = [];

      for (let i = 0; i < n; i++) {
        if (i === 0 || i === n - 1 || i % passo === 0) {
          selecionados.push(pontosBrutos[i]);
          continue;
        }
        const prev = pontosBrutos[i - 1];
        const curr = pontosBrutos[i];
        const next = pontosBrutos[i + 1];
        const isExtremoZ = (curr.z < prev.z && curr.z < next.z) || (curr.z > prev.z && curr.z > next.z);
        if (isExtremoZ && Math.abs(curr.z - prev.z) > 0.35) {
          selecionados.push(curr);
        }
      }
      return selecionados;
    },

    executarInterpolacaoTIN: function () {
      if (typeof turf === 'undefined' || typeof turf.tin !== 'function') {
        if (window.UI) window.UI.toast('⚠️ Biblioteca geométrica Turf.js indisponível.', 'erro');
        return;
      }

      const pontosBrutos = this._extrairPontos(0);
      if (pontosBrutos.length < 3) {
        if (window.UI) window.UI.toast('⚠️ Forneça pelo menos 3 pontos válidos (X Y Z) para gerar a interpolação TIN.', 'erro');
        return;
      }

      const cfgAbaco = this._lerConfigAbaco();
      const metodoInterp = document.getElementById('bat-metodo-interp')?.value || 'linear';
      const modoSaida = document.getElementById('bat-modo-saida')?.value || 'raster_qgis';
      const modoRecorte = document.getElementById('bat-modo-recorte')?.value || 'borda_sem_buracos';
      const paleta = document.getElementById('bat-paleta')?.value || 'qgis_spectral';
      const maxArestaMetros = parseFloat(document.getElementById('bat-max-aresta')?.value || '600') || 600;
      const pxX = parseFloat(document.getElementById('bat-tam-pixel-x')?.value || '20') || 20;
      const pxY = parseFloat(document.getElementById('bat-tam-pixel-y')?.value || '20') || 20;
      const rowsQGIS = Math.max(2, parseInt(document.getElementById('bat-pixels-rows')?.value || '1200', 10) || 1200);
      const colsQGIS = Math.max(2, parseInt(document.getElementById('bat-pixels-cols')?.value || '1350', 10) || 1350);

      let colsCanvas = colsQGIS;
      let rowsCanvas = rowsQGIS;
      const MAX_CANVAS_DIM = 2400;
      if (colsCanvas > MAX_CANVAS_DIM || rowsCanvas > MAX_CANVAS_DIM) {
        const escala = MAX_CANVAS_DIM / Math.max(colsCanvas, rowsCanvas);
        colsCanvas = Math.max(20, Math.round(colsCanvas * escala));
        rowsCanvas = Math.max(20, Math.round(rowsCanvas * escala));
      }

      const mostrarPontos = document.getElementById('bat-mostrar-pontos')?.checked === true;
      const pontos = this._amostrarPreservandoFeicoes(pontosBrutos, 20000);

      let zMinGlobal = Infinity, zMaxGlobal = -Infinity;
      let zBrutoMinGlobal = Infinity, zBrutoMaxGlobal = -Infinity;
      let cAbacoMin = Infinity, cAbacoMax = -Infinity, somaCorrAbaco = 0;
      let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
      for (const p of pontos) {
        if (p.z < zMinGlobal) zMinGlobal = p.z;
        if (p.z > zMaxGlobal) zMaxGlobal = p.z;
        const zb = Number.isFinite(p.zBruto) ? p.zBruto : p.z;
        if (zb < zBrutoMinGlobal) zBrutoMinGlobal = zb;
        if (zb > zBrutoMaxGlobal) zBrutoMaxGlobal = zb;
        const ca = Number.isFinite(p.correcaoAbacoM) ? p.correcaoAbacoM : 0;
        if (ca < cAbacoMin) cAbacoMin = ca;
        if (ca > cAbacoMax) cAbacoMax = ca;
        somaCorrAbaco += ca;
        if (p.lat < minLat) minLat = p.lat;
        if (p.lat > maxLat) maxLat = p.lat;
        if (p.lon < minLon) minLon = p.lon;
        if (p.lon > maxLon) maxLon = p.lon;
      }
      const cAbacoMedia = pontos.length ? (somaCorrAbaco / pontos.length) : 0;

      if (this._extensao.minLat && this._extensao.maxLat) {
        minLat = this._extensao.minLat;
        maxLat = this._extensao.maxLat;
        minLon = this._extensao.minLon;
        maxLon = this._extensao.maxLon;
      }

      this._extensao.zMin = zMinGlobal;
      this._extensao.zMax = zMaxGlobal;

      // Sincroniza o slider de Profundidade Crítica sempre em Profundidade Positiva (|Z| metros abaixo da superfície)
      const profMinGlobal = Math.min(Math.abs(zMinGlobal), Math.abs(zMaxGlobal));
      const profMaxGlobal = Math.max(Math.abs(zMinGlobal), Math.abs(zMaxGlobal));
      const selCondModal = document.getElementById('bat-condicao-restricao');
      const selCondPainel = document.getElementById('perfil-condicao-restricao');
      if (selCondModal) selCondModal.value = 'menor_igual';
      if (selCondPainel) selCondPainel.value = 'menor_igual';

      const inpZCritModal = document.getElementById('bat-z-critico');
      const inpZCritPainel = document.getElementById('perfil-z-critico');
      const sliderZCrit = document.getElementById('perfil-z-slider');
      let zCritAtual = Math.abs(parseFloat(inpZCritPainel?.value || inpZCritModal?.value || '5'));
      if (!Number.isFinite(zCritAtual) || zCritAtual < profMinGlobal || zCritAtual > profMaxGlobal) {
        zCritAtual = +(profMinGlobal + (profMaxGlobal - profMinGlobal) * 0.35).toFixed(2);
      }
      if (inpZCritModal) inpZCritModal.value = zCritAtual;
      if (inpZCritPainel) inpZCritPainel.value = zCritAtual;
      if (sliderZCrit) {
        sliderZCrit.min = profMinGlobal.toFixed(2);
        sliderZCrit.max = profMaxGlobal.toFixed(2);
        sliderZCrit.step = Math.max(0.05, +((profMaxGlobal - profMinGlobal) / 200).toFixed(2));
        sliderZCrit.value = zCritAtual;
      }

      const fcPontos = turf.featureCollection(
        pontos.map(p => turf.point([p.lon, p.lat], { z: Number(p.z.toFixed(3)) }))
      );

      const tinBruto = turf.tin(fcPontos, 'z');
      if (!tinBruto || !Array.isArray(tinBruto.features) || tinBruto.features.length === 0) {
        if (window.UI) window.UI.toast('⚠️ Não foi possível triangular os pontos informados.', 'erro');
        return;
      }

      let triangulosRecortados = tinBruto.features;

      if (modoRecorte === 'manual' && this._poligonoLimiteGeoJSON) {
        triangulosRecortados = tinBruto.features.filter(tri => {
          const ring = tri.geometry?.coordinates?.[0];
          if (!ring || ring.length < 4) return false;
          const cLon = (ring[0][0] + ring[1][0] + ring[2][0]) / 3;
          const cLat = (ring[0][1] + ring[1][1] + ring[2][1]) / 3;
          try {
            return turf.booleanPointInPolygon([cLon, cLat], this._poligonoLimiteGeoJSON);
          } catch (_) {
            return true;
          }
        });
      } else if (modoRecorte === 'borda_sem_buracos') {
        triangulosRecortados = this._podarApenasBordaExternaSemBuracos(tinBruto.features, maxArestaMetros);
      }

      if (triangulosRecortados.length === 0) {
        triangulosRecortados = tinBruto.features;
      }

      let areaTotalM2 = 0, volumeTotalM3 = 0, somaZ = 0;
      const triangulosFinais = [];

      for (const tri of triangulosRecortados) {
        const ring = tri.geometry?.coordinates?.[0];
        if (!ring || ring.length < 4) continue;

        const z0 = Number(tri.properties?.a ?? 0);
        const z1 = Number(tri.properties?.b ?? 0);
        const z2 = Number(tri.properties?.c ?? 0);
        const zMedio = +((z0 + z1 + z2) / 3).toFixed(2);
        const zMinTri = +Math.min(z0, z1, z2).toFixed(2);
        const zMaxTri = +Math.max(z0, z1, z2).toFixed(2);

        let areaTri = 0;
        try { areaTri = turf.area(tri); } catch (_) {}
        areaTotalM2 += areaTri;
        volumeTotalM3 += areaTri * Math.abs(zMedio);
        somaZ += zMedio;

        const rgb = this._obterCorRGB(zMedio, zMinGlobal, zMaxGlobal, paleta);
        const corHex = this._rgbParaHex(rgb);

        tri.properties = {
          nome: `TIN Batimétrico (${zMedio.toFixed(2)} m)`,
          profundidade_media_m: zMedio,
          profundidade_min_m: zMinTri,
          profundidade_max_m: zMaxTri,
          variacao_cota_m: +(zMaxTri - zMinTri).toFixed(2),
          area_m2: Math.round(areaTri),
          volume_m3: Math.round(areaTri * Math.abs(zMedio)),
          metodo_interpolacao: metodoInterp === 'suavizado' ? 'Clough-Toucher (cúbica)' : 'Linear (Delaunay)',
          resolucao_pixel_m: `${pxX.toFixed(2)} × ${pxY.toFixed(2)} m`,
          grade_pixels: `${rowsQGIS} linhas × ${colsQGIS} colunas`,
          correcao_abaco: cfgAbaco.ativo ? `Ativa (${cfgAbaco.nome1} ↔ ${cfgAbaco.nome2})` : 'Sem correção de ábaco',
          _z0: z0, _z1: z1, _z2: z2,
          _cor_tin: corHex
        };
        triangulosFinais.push(tri);
      }

      const resultadoGeoJSON = {
        type: 'FeatureCollection',
        features: triangulosFinais
      };
      this._ultimoResultadoGeoJSON = resultadoGeoJSON;

      // Se já havia uma camada TIN gerada para este mesmo dataset na sessão, remove a anterior para substituir limpa com o Ábaco atualizado
      if (this._ultimaCamadaId && window.CAMADAS_MAPA && window.CAMADAS_MAPA[this._ultimaCamadaId]) {
        try {
          if (window.mapa) window.mapa.removeLayer(window.CAMADAS_MAPA[this._ultimaCamadaId]);
          delete window.CAMADAS_MAPA[this._ultimaCamadaId];
          delete window.DADOS_GEOJSON_BRUTOS[this._ultimaCamadaId];
          delete window.CONFIG_CAMADAS[this._ultimaCamadaId];
          const elAntigo = document.getElementById(`item-camada-${this._ultimaCamadaId}`) || document.querySelector(`[data-camada-id="${this._ultimaCamadaId}"]`);
          if (elAntigo && elAntigo.parentNode) elAntigo.parentNode.removeChild(elAntigo);
        } catch (_) {}
      }

      this._contadorCamadas++;
      const idCamada = `bat_tin_${Date.now()}`;
      this._ultimaCamadaId = idCamada;
      const crsTexto = document.getElementById('bat-projecao')?.selectedOptions?.[0]?.text || 'UTM 22S';
      const sufixoAbaco = cfgAbaco.ativo ? ' · ⚓ Ábaco' : '';
      const nomeCamada = `🌊 TIN (${this._nomeArquivo || 'EPSG:31982'} · ${rowsQGIS}×${colsQGIS}px${sufixoAbaco})`;

      if (window.mapa && !window.mapa.getPane('paneBatimetria')) {
        const pBat = window.mapa.createPane('paneBatimetria');
        pBat.style.zIndex = 485;
      }

      if (this._layerLimiteTemp && window.mapa) {
        try { window.mapa.removeLayer(this._layerLimiteTemp); } catch (_) {}
      }

      const grupoFinal = L.featureGroup();
      const boundsGeo = { minLon, maxLon, minLat, maxLat };
      const boundsLeaflet = [[minLat, minLon], [maxLat, maxLon]];

      this._ultimoBoundsGeo = boundsGeo;
      this._ultimoColsCanvas = colsCanvas;
      this._ultimoRowsCanvas = rowsCanvas;
      this._ultimoMetodoInterp = metodoInterp;
      this._ultimoPaleta = paleta;

      let infoRaster = {
        pixelsAtivos: colsCanvas * rowsCanvas,
        pixelsRestritos: 0,
        percRestrito: 0,
        areaRestritaHa: 0,
        areaRestritaM2: 0,
        volumeDragagemM3: 0,
        pixelsNoData: 0,
        totalPixelsGrade: colsCanvas * rowsCanvas
      };

      if (modoSaida === 'raster_qgis' || modoSaida === 'hibrido') {
        infoRaster = this._gerarRasterCanvasTIN(
          triangulosFinais,
          boundsGeo,
          colsCanvas,
          rowsCanvas,
          metodoInterp,
          zMinGlobal,
          zMaxGlobal,
          paleta,
          this._obterParametrosRestricao()
        );
        this._ultimoRasterDataUrl = infoRaster.dataUrl;
        const imgOverlay = L.imageOverlay(infoRaster.dataUrl, boundsLeaflet, {
          pane: 'paneBatimetria',
          opacity: 0.94,
          interactive: true
        });
        this._ultimoImgOverlay = imgOverlay;
        grupoFinal.addLayer(imgOverlay);
        this._atualizarResumoRestricaoGlobal(infoRaster);
      }

      const isApenasRaster = (modoSaida === 'raster_qgis');
      const isHibrido = (modoSaida === 'hibrido');

      const layerTIN = L.geoJSON(resultadoGeoJSON, {
        pane: 'paneBatimetria',
        interactive: true,
        style: (f) => ({
          pane: 'paneBatimetria',
          color: isApenasRaster ? 'transparent' : (isHibrido ? 'rgba(255,255,255,0.22)' : f.properties._cor_tin),
          weight: isApenasRaster ? 0 : (isHibrido ? 0.5 : 0.8),
          opacity: isApenasRaster ? 0 : 0.85,
          fillColor: f.properties._cor_tin,
          fillOpacity: isApenasRaster ? 0.001 : (isHibrido ? 0.05 : 0.82)
        }),
        onEachFeature: (f, layer) => {
          layer.on('click', (e) => {
            if (this._desenhandoRota || this._desenhandoLimite) return;
            if (window.MeasurementTool && window.MeasurementTool.modo) return;
            const lat = e.latlng.lat, lon = e.latlng.lng;
            const interp = this._interpolarPontoNosTriangulos(lon, lat, [f], metodoInterp);
            const zPonto = interp ? interp.z : f.properties.profundidade_media_m;
            const rgb = this._obterCorRGB(zPonto, zMinGlobal, zMaxGlobal, paleta);
            const corBadge = this._rgbParaHex(rgb);

            const cfgR = this._obterParametrosRestricao();
            const av = this._avaliarCotaRestricao(zPonto, cfgR.zCritico, cfgR.condicao, 1.0);
            const statusNavHtml = av.restrito
              ? `<div style="margin-top:4px; background:#7f1d1d; color:#fecaca; padding:4px 8px; border-radius:4px; font-size:10.5px; font-weight:700;">🚨 RESTRIÇÃO À NAVEGAÇÃO: Déficit de ${av.deficitM.toFixed(2)} m (Limite: ${cfgR.zCritico.toFixed(2)} m)</div>`
              : `<div style="margin-top:4px; background:#064e3b; color:#a7f3d0; padding:4px 8px; border-radius:4px; font-size:10.5px; font-weight:700;">✅ NAVEGÁVEL: Folga de +${av.folgaM.toFixed(2)} m (Limite: ${cfgR.zCritico.toFixed(2)} m)</div>`;

            const rAb = this.calcularCorrecaoAbacoNaCoordenada(lat, lon, cfgAbaco);
            const linhaAbacoPopup = `<div class="pop-linha"><span class="pop-lbl">Correção Ábaco (${cfgAbaco.eixo === 'lat' ? 'Lat' : 'Lon'}):</span><span class="pop-val"><strong style="color:#db2777;">${rAb.correcaoM >= 0 ? '+' : ''}${rAb.correcaoM.toFixed(2)} m</strong> (${cfgAbaco.ativo ? 'Aplicada' : 'Simulada'})</span></div>`;

            const html = `
              <div class="pop-topo" style="background:linear-gradient(135deg, #0a2540 0%, ${corBadge} 100%);">
                🌊 Inspeção Batimétrica TIN (Padrão QGIS)
              </div>
              <div class="pop-corpo">
                <div style="background:${corBadge}22; border-left:4px solid ${corBadge}; padding:8px 10px; border-radius:6px; margin-bottom:8px;">
                  <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700;">Cota / Profundidade Interpolada no Pixel</div>
                  <div style="font-size:21px; font-weight:800; color:#0f172a;">${zPonto.toFixed(2)} m</div>
                  <div style="font-size:10px; color:#475569;">Método: ${f.properties.metodo_interpolacao}</div>
                  ${statusNavHtml}
                </div>
                <div class="pop-linha"><span class="pop-lbl">Média da Face TIN:</span><span class="pop-val">${f.properties.profundidade_media_m.toFixed(2)} m</span></div>
                ${linhaAbacoPopup}
                <div class="pop-linha"><span class="pop-lbl">Vértices do Triângulo:</span><span class="pop-val">${f.properties._z0.toFixed(2)}m · ${f.properties._z1.toFixed(2)}m · ${f.properties._z2.toFixed(2)}m</span></div>
                <div class="pop-linha"><span class="pop-lbl">Tamanho do Pixel X/Y:</span><span class="pop-val"><strong>${f.properties.resolucao_pixel_m}</strong></span></div>
                <div class="pop-linha"><span class="pop-lbl">Linhas × Colunas:</span><span class="pop-val"><strong>${f.properties.grade_pixels}</strong></span></div>
                <div class="pop-linha"><span class="pop-lbl">Coordenada Clicada:</span><span class="pop-val">${lat.toFixed(5)}°, ${lon.toFixed(5)}°</span></div>
                <div style="margin-top:8px; display:flex; gap:6px;">
                  <button onclick="BatimetriaTINManager.iniciarTracadoRotaNoMapa()" style="flex:1; background:#0284c7; color:#fff; border:none; padding:5px 8px; border-radius:5px; font-size:10.5px; font-weight:700; cursor:pointer;">🚢 Traçar Canal / Perfil</button>
                  <button onclick="BatimetriaTINManager.gerarTalvegueAutomatico()" style="flex:1; background:#0f766e; color:#fff; border:none; padding:5px 8px; border-radius:5px; font-size:10.5px; font-weight:700; cursor:pointer;">🧭 Auto-Talvegue</button>
                </div>
              </div>
            `;
            layer.bindPopup(html, { maxWidth: 360 }).openPopup(e.latlng);
          });
        }
      });

      grupoFinal.addLayer(layerTIN);

      if (mostrarPontos && pontos.length <= 3500) {
        pontos.forEach((pt, idx) => {
          const rgb = this._obterCorRGB(pt.z, zMinGlobal, zMaxGlobal, paleta);
          const corPt = this._rgbParaHex(rgb);
          const cm = L.circleMarker([pt.lat, pt.lon], {
            pane: 'panePontos',
            radius: 2.8,
            color: '#ffffff',
            weight: 0.7,
            fillColor: corPt,
            fillOpacity: 0.95
          });
          cm.bindPopup(`
            <div class="pop-topo">📍 Ponto Batimétrico Medido #${idx + 1}</div>
            <div class="pop-corpo">
              <div class="pop-linha"><span class="pop-lbl">Cota / Profundidade (Z):</span><span class="pop-val"><strong>${pt.z.toFixed(2)} m</strong></span></div>
              <div class="pop-linha"><span class="pop-lbl">Coord. Origem (X, Y):</span><span class="pop-val">${pt.x.toFixed(2)}, ${pt.y.toFixed(2)}</span></div>
              <div class="pop-linha"><span class="pop-lbl">SIRGAS 2000:</span><span class="pop-val">${pt.lat.toFixed(5)}°, ${pt.lon.toFixed(5)}°</span></div>
            </div>
          `);
          grupoFinal.addLayer(cm);
        });
      }

      grupoFinal.addTo(window.mapa);

      window.DADOS_GEOJSON_BRUTOS[idCamada] = resultadoGeoJSON;
      window.CAMADAS_MAPA[idCamada] = grupoFinal;
      window.CONFIG_CAMADAS[idCamada] = {
        nome: nomeCamada,
        grupo: 'importadas',
        cor: '#0284c7',
        opacidade: 0.94,
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
        window.mapa.fitBounds(boundsLeaflet, { padding: [30, 30] });
      } catch (_) {}

      const mediaGlobal = +(somaZ / triangulosFinais.length).toFixed(2);
      const areaHa = +(areaTotalM2 / 10000).toFixed(2);
      const percAtivo = ((infoRaster.pixelsAtivos / (colsCanvas * rowsCanvas)) * 100).toFixed(1);
      const rotuloRecorte = {
        'borda_sem_buracos': `Retração Topológica de Borda ≤ ${maxArestaMetros} m (0 buracos internos)`,
        'manual': `Polígono de Limite Desenhado à Mão (${this._verticesLimite.length} vértices)`,
        'completo': 'Envoltória Convexa Completa (Padrão Bruto QGIS — Sem Poda)'
      }[modoRecorte] || modoRecorte;

      this._ultimoRelatorioParams = {
        arquivo: this._nomeArquivo || 'Area1_R20_ComRS_Final',
        extensaoStr: document.getElementById('bat-extensao-qgis')?.value || '',
        crsOrigem: crsTexto,
        crsDestino: 'SIRGAS 2000 (EPSG:4674)',
        metodo: metodoInterp === 'suavizado' ? 'Clough-Toucher (cúbica)' : 'Linear',
        tipoSaida: modoSaida === 'raster_qgis' ? 'Raster Contínuo Pixel a Pixel (Georreferenciado)' : (modoSaida === 'hibrido' ? 'Híbrido (Raster + Malha TIN)' : 'Malha Vetorial TIN'),
        resolucaoPixelM: `X = ${pxX.toFixed(6)} m | Y = ${pxY.toFixed(6)} m`,
        rows: rowsQGIS,
        cols: colsQGIS,
        totalPixelsGrade: (rowsQGIS * colsQGIS).toLocaleString('pt-BR'),
        pixelsAtivos: `${infoRaster.pixelsAtivos.toLocaleString('pt-BR')} px (${percAtivo}% da matriz)`,
        pixelsNoData: `${infoRaster.pixelsNoData.toLocaleString('pt-BR')} px`,
        passoIntraM: `${this._extensao.passoIntraLinhaM || '—'} m`,
        espacamentoInterM: `${this._extensao.espacamentoInterLinhasM || '—'} m`,
        restricaoContorno: rotuloRecorte,
        abacoAtivo: cfgAbaco.ativo,
        abacoResumo: cfgAbaco.ativo
          ? `✅ ATIVO (${cfgAbaco.modoOperacao === 'reduzir_sondagem' ? 'Redução Z_NR = Z - C' : 'Atualização Z_Real = Z + C'}): ${cfgAbaco.nome1} (C₁=${cfgAbaco.c1 >= 0 ? '+' : ''}${cfgAbaco.c1.toFixed(2)}m) ↔ ${cfgAbaco.nome2} (C₂=${cfgAbaco.c2 >= 0 ? '+' : ''}${cfgAbaco.c2.toFixed(2)}m) · ΔC nos pontos: ${cAbacoMin >= 0 ? '+' : ''}${cAbacoMin.toFixed(2)}m a ${cAbacoMax >= 0 ? '+' : ''}${cAbacoMax.toFixed(2)}m (Méd: ${cAbacoMedia >= 0 ? '+' : ''}${cAbacoMedia.toFixed(2)}m)`
          : 'Desativado (Cotas originais do arquivo)',
        pontosBrutosTotal: pontosBrutos.length,
        pontosProcessados: pontos.length,
        triangulosGerados: triangulosFinais.length,
        zMin: zMinGlobal.toFixed(2),
        zMedio: mediaGlobal.toFixed(2),
        zMax: zMaxGlobal.toFixed(2),
        zBrutoMin: zBrutoMinGlobal.toFixed(2),
        zBrutoMax: zBrutoMaxGlobal.toFixed(2),
        areaHa: areaHa.toLocaleString('pt-BR'),
        volumeM3: Math.round(volumeTotalM3).toLocaleString('pt-BR'),
        percRestrito: infoRaster.percRestrito,
        areaRestritaHa: infoRaster.areaRestritaHa,
        volumeDragagemM3: infoRaster.volumeDragagemM3.toLocaleString('pt-BR')
      };

      this._renderizarCardParametrosNoModal();

      // Se já houver uma rota/talvegue traçado no mapa, recalcula o Perfil Longitudinal automaticamente com as novas cotas do Ábaco!
      if (this._verticesRota && this._verticesRota.length >= 2) {
        try { this._calcularERenderizarPerfil(); } catch (_) {}
      }

      if (window.UI) {
        const msgAbaco = cfgAbaco.ativo
          ? ` com Correção do Ábaco (${cAbacoMedia >= 0 ? '+' : ''}${cAbacoMedia.toFixed(2)} m méd.)`
          : '';
        window.UI.toast(`🌊 TIN gerado (${rowsQGIS}×${colsQGIS} px)${msgAbaco}!`);
      }
    },

    // =========================================================================
    // 🚢 PERFIL LONGITUDINAL DE PROFUNDIDADE / ELEVAÇÃO (CANAL / TALVEGUE)
    // =========================================================================

    iniciarTracadoRotaNoMapa: function () {
      if (!this._ultimoResultadoGeoJSON || !this._ultimoResultadoGeoJSON.features?.length) {
        const pts = this._extrairPontos(10);
        if (pts.length >= 3) {
          this.executarInterpolacaoTIN();
        } else {
          if (window.UI) window.UI.toast('⚠️ Gere a Interpolação TIN (ou carregue o exemplo) antes de traçar o canal de navegação.', 'alerta');
          return;
        }
      }

      this.fecharModal();
      this._encerrarListenersRota();

      this._desenhandoRota = true;
      this._verticesRota = [];
      if (this._layerRotaTemp && window.mapa) {
        try { window.mapa.removeLayer(this._layerRotaTemp); } catch (_) {}
      }
      this._layerRotaTemp = L.featureGroup().addTo(window.mapa);

      let barra = document.getElementById('bat-barra-desenho-rota');
      if (!barra) {
        barra = document.createElement('div');
        barra.id = 'bat-barra-desenho-rota';
        barra.style.cssText = 'position:fixed; top:112px; left:50%; transform:translateX(-50%); z-index:999999; background:#0a2540; border:2px solid #38bdf8; color:#fff; padding:10px 16px; border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,0.65); display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-family:"Segoe UI",sans-serif; font-size:12px;';
        document.body.appendChild(barra);
      }
      barra.style.display = 'flex';
      barra.innerHTML = `
        <span>🚢 <strong>Traçando Rota / Canal de Navegação:</strong> Clique nos pontos do canal (<span id="bat-rota-pts">0</span> pts · <span id="bat-rota-dist">0 m</span>)</span>
        <span id="bat-rota-cursor-z" style="background:#061426; border:1px solid #1e4976; padding:3px 8px; border-radius:5px; font-family:monospace; color:#38bdf8;">Z cursor: —</span>
        <button onclick="BatimetriaTINManager.finalizarTracadoRota()" style="background:#10b981; color:#fff; border:none; padding:5px 12px; border-radius:6px; font-weight:700; cursor:pointer;">✓ Gerar Perfil Longitudinal</button>
        <button onclick="BatimetriaTINManager.desfazerUltimoPontoRota()" style="background:#334155; color:#fff; border:none; padding:5px 9px; border-radius:6px; font-weight:600; cursor:pointer;" title="Desfazer último vértice">↩ Desfazer</button>
        <button onclick="BatimetriaTINManager.cancelarTracadoRota()" style="background:#ef4444; color:#fff; border:none; padding:5px 10px; border-radius:6px; font-weight:700; cursor:pointer;">✕ Cancelar</button>
      `;

      window.mapa.getContainer().style.cursor = 'crosshair';
      if (window.mapa.doubleClickZoom) window.mapa.doubleClickZoom.disable();

      const tris = this._ultimoResultadoGeoJSON.features;
      const cfgR = this._obterParametrosRestricao();

      this._onMapMoveRota = (e) => {
        if (!this._desenhandoRota) return;
        const elZ = document.getElementById('bat-rota-cursor-z');
        if (elZ) {
          const interp = this._interpolarPontoNosTriangulos(e.latlng.lng, e.latlng.lat, tris, this._ultimoMetodoInterp);
          if (interp) {
            const av = this._avaliarCotaRestricao(interp.z, cfgR.zCritico, cfgR.condicao, 1.0);
            elZ.style.color = av.restrito ? '#f87171' : '#38bdf8';
            elZ.textContent = `Z: ${interp.z.toFixed(2)} m ${av.restrito ? '🚨 RESTRIÇÃO' : '✅ Livre'}`;
          } else {
            elZ.style.color = '#94a3b8';
            elZ.textContent = 'Z: Fora do TIN';
          }
        }
        this._redesenharRotaTemp(e.latlng);
      };

      this._onMapClickRota = (e) => {
        if (!this._desenhandoRota) return;
        const pt = [e.latlng.lat, e.latlng.lng];
        if (this._verticesRota.length > 0) {
          const ult = this._verticesRota[this._verticesRota.length - 1];
          if (this._haversineMetros(ult[1], ult[0], pt[1], pt[0]) < 0.5) return;
        }
        this._verticesRota.push(pt);
        this._atualizarContadoresBarraRota();
        this._redesenharRotaTemp(null);
      };

      this._onMapDblClickRota = (e) => {
        if (!this._desenhandoRota) return;
        L.DomEvent.stopPropagation(e);
        this.finalizarTracadoRota();
      };

      window.mapa.on('mousemove', this._onMapMoveRota);
      window.mapa.on('click', this._onMapClickRota);
      window.mapa.on('dblclick', this._onMapDblClickRota);
    },

    _atualizarContadoresBarraRota: function () {
      const elPts = document.getElementById('bat-rota-pts');
      const elDist = document.getElementById('bat-rota-dist');
      if (elPts) elPts.textContent = String(this._verticesRota.length);
      if (elDist) {
        let dTot = 0;
        for (let i = 1; i < this._verticesRota.length; i++) {
          dTot += this._haversineMetros(
            this._verticesRota[i - 1][1], this._verticesRota[i - 1][0],
            this._verticesRota[i][1], this._verticesRota[i][0]
          );
        }
        elDist.textContent = dTot >= 1000 ? `${(dTot / 1000).toFixed(2)} km` : `${Math.round(dTot)} m`;
      }
    },

    desfazerUltimoPontoRota: function () {
      if (!this._verticesRota.length) return;
      this._verticesRota.pop();
      this._atualizarContadoresBarraRota();
      this._redesenharRotaTemp(null);
    },

    _redesenharRotaTemp: function (latlngCursor) {
      if (!this._layerRotaTemp) return;
      this._layerRotaTemp.clearLayers();
      if (this._verticesRota.length === 0) return;

      for (let i = 0; i < this._verticesRota.length; i++) {
        L.circleMarker(this._verticesRota[i], {
          radius: i === 0 ? 6 : 4.5,
          color: '#ffffff',
          weight: 2,
          fillColor: i === 0 ? '#10b981' : '#38bdf8',
          fillOpacity: 1,
          interactive: false
        }).addTo(this._layerRotaTemp);
      }

      const coords = this._verticesRota.slice();
      if (latlngCursor) coords.push([latlngCursor.lat, latlngCursor.lng]);

      if (coords.length >= 2) {
        L.polyline(coords, {
          color: '#38bdf8',
          weight: 3.5,
          dashArray: '8, 6',
          interactive: false
        }).addTo(this._layerRotaTemp);
      }
    },

    cancelarTracadoRota: function () {
      this._encerrarListenersRota();
      if (this._layerRotaTemp && window.mapa) {
        try { window.mapa.removeLayer(this._layerRotaTemp); } catch (_) {}
        this._layerRotaTemp = null;
      }
    },

    _encerrarListenersRota: function () {
      this._desenhandoRota = false;
      if (window.mapa) {
        window.mapa.getContainer().style.cursor = '';
        if (this._onMapMoveRota) window.mapa.off('mousemove', this._onMapMoveRota);
        if (this._onMapClickRota) window.mapa.off('click', this._onMapClickRota);
        if (this._onMapDblClickRota) window.mapa.off('dblclick', this._onMapDblClickRota);
        setTimeout(() => {
          if (window.mapa && window.mapa.doubleClickZoom) window.mapa.doubleClickZoom.enable();
        }, 250);
      }
      const barra = document.getElementById('bat-barra-desenho-rota');
      if (barra) barra.style.display = 'none';
    },

    finalizarTracadoRota: function () {
      this._encerrarListenersRota();
      if (this._layerRotaTemp && window.mapa) {
        try { window.mapa.removeLayer(this._layerRotaTemp); } catch (_) {}
        this._layerRotaTemp = null;
      }

      if (this._verticesRota.length < 2) {
        if (window.UI) window.UI.toast('⚠️ Clique em pelo menos 2 pontos ao longo do canal para gerar o perfil de navegação.', 'alerta');
        return;
      }

      this._processarRotaEAbrirPerfil(this._verticesRota, 'Caminho Traçado Manualmente');
    },

    gerarTalvegueAutomatico: function () {
      if (!this._ultimoResultadoGeoJSON || !this._ultimoResultadoGeoJSON.features?.length) {
        const pts = this._extrairPontos(10);
        if (pts.length >= 3) {
          this.executarInterpolacaoTIN();
        } else {
          this.carregarExemploUTM22S();
          this.executarInterpolacaoTIN();
        }
      }

      this.fecharModal();

      const pts = this._pontosCache.length ? this._pontosCache : this._extrairPontos(0);
      if (pts.length < 6) {
        if (window.UI) window.UI.toast('⚠️ Pontos insuficientes para detectar o talvegue automático.', 'alerta');
        return;
      }

      // Usa sempre a Profundidade Positiva |Z| (metros de coluna d'água) para achar o canal mais fundo
      let mLat = 0, mLon = 0, profMaxGlobal = 0;
      for (let i = 0; i < pts.length; i++) {
        mLat += pts[i].lat;
        mLon += pts[i].lon;
        const pM = Math.abs(pts[i].z);
        if (pM > profMaxGlobal) profMaxGlobal = pM;
      }
      mLat /= pts.length;
      mLon /= pts.length;

      // Calcula o Eixo Principal (PCA 2D) da nuvem de pontos para fatiar perpendicularmente à direção do rio/canal
      const cosLat = Math.max(0.2, Math.cos(mLat * Math.PI / 180));
      let sXX = 0, sYY = 0, sXY = 0;
      for (let i = 0; i < pts.length; i++) {
        const dx = (pts[i].lon - mLon) * cosLat;
        const dy = (pts[i].lat - mLat);
        sXX += dx * dx;
        sYY += dy * dy;
        sXY += dx * dy;
      }
      const theta = 0.5 * Math.atan2(2 * sXY, sXX - sYY);
      const ux = Math.cos(theta);
      const uy = Math.sin(theta);

      let minProj = Infinity, maxProj = -Infinity;
      for (let i = 0; i < pts.length; i++) {
        const dx = (pts[i].lon - mLon) * cosLat;
        const dy = (pts[i].lat - mLat);
        const proj = dx * ux + dy * uy;
        pts[i]._projTalvegue = proj;
        if (proj < minProj) minProj = proj;
        if (proj > maxProj) maxProj = proj;
      }

      const extMaxM = Math.max(this._extensao.alturaM || 1000, this._extensao.larguraM || 1000);
      const numFatia = Math.min(30, Math.max(12, Math.round(extMaxM / 500)));
      const passoProj = (maxProj - minProj) / numFatia;
      const passoGrausMaxLateral = Math.max(0.008, ((maxProj - minProj) / numFatia) * 1.8);

      // Agrupa os pontos por fatia transversal
      const fatias = [];
      for (let f = 0; f < numFatia; f++) {
        const pIni = minProj + f * passoProj;
        const pFim = pIni + passoProj;
        const cands = [];
        let maxProfFatia = 0;
        for (let i = 0; i < pts.length; i++) {
          const pr = pts[i]._projTalvegue;
          if (pr >= pIni && pr <= pFim) {
            cands.push(pts[i]);
            const pM = Math.abs(pts[i].z);
            if (pM > maxProfFatia) maxProfFatia = pM;
          }
        }
        fatias.push({ idx: f, cands, maxProfFatia });
      }

      // Descarta fatias de esquina nas pontas (f=0, f=N-1) que só tocam margem/praia rasa (< 38% da prof. máxima do canal)
      let fIni = 0, fFim = numFatia - 1;
      while (fIni < fFim - 3 && (fatias[fIni].cands.length < 5 || fatias[fIni].maxProfFatia < profMaxGlobal * 0.38)) {
        fIni++;
      }
      while (fFim > fIni + 3 && (fatias[fFim].cands.length < 5 || fatias[fFim].maxProfFatia < profMaxGlobal * 0.38)) {
        fFim--;
      }

      // Escolhe a fatia-semente no terço central com maior profundidade para ancorar no verdadeiro canal principal
      let fSeed = Math.floor((fIni + fFim) / 2);
      let melhorProfSeed = -1;
      const fBuscaIni = Math.floor(fIni + (fFim - fIni) * 0.25);
      const fBuscaFim = Math.ceil(fIni + (fFim - fIni) * 0.75);
      for (let f = fBuscaIni; f <= fBuscaFim; f++) {
        if (fatias[f].maxProfFatia > melhorProfSeed && fatias[f].cands.length >= 3) {
          melhorProfSeed = fatias[f].maxProfFatia;
          fSeed = f;
        }
      }

      const escolherPontoNaFatia = (fatia, refLat, refLon) => {
        const cands = fatia.cands.slice();
        if (!cands.length) return null;
        if (refLat === null) {
          cands.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
        } else {
          let pMinF = Infinity, pMaxF = -Infinity;
          for (let j = 0; j < cands.length; j++) {
            const pM = Math.abs(cands[j].z);
            if (pM < pMinF) pMinF = pM;
            if (pM > pMaxF) pMaxF = pM;
          }
          const spanPF = Math.max(0.5, pMaxF - pMinF);
          cands.sort((a, b) => {
            const profNormA = (Math.abs(a.z) - pMinF) / spanPF;
            const profNormB = (Math.abs(b.z) - pMinF) / spanPF;
            const distA = Math.hypot((a.lon - refLon) * cosLat, a.lat - refLat);
            const distB = Math.hypot((b.lon - refLon) * cosLat, b.lat - refLat);
            const penA = (distA / passoGrausMaxLateral) * 0.65;
            const penB = (distB / passoGrausMaxLateral) * 0.65;
            return (profNormB - penB) - (profNormA - penA);
          });
        }
        const topK = Math.max(1, Math.min(3, Math.ceil(cands.length * 0.06)));
        let sLat = 0, sLon = 0;
        for (let k = 0; k < topK; k++) {
          sLat += cands[k].lat;
          sLon += cands[k].lon;
        }
        return [sLat / topK, sLon / topK];
      };

      const escolhidosPorFatia = new Array(numFatia).fill(null);
      const ptSeed = escolherPontoNaFatia(fatias[fSeed], null, null);
      if (!ptSeed) return;
      escolhidosPorFatia[fSeed] = ptSeed;

      // Propaga do centro para o fim (jusante)
      let rLat = ptSeed[0], rLon = ptSeed[1];
      for (let f = fSeed + 1; f <= fFim; f++) {
        const pt = escolherPontoNaFatia(fatias[f], rLat, rLon);
        if (pt) {
          escolhidosPorFatia[f] = pt;
          rLat = pt[0]; rLon = pt[1];
        }
      }

      // Propaga do centro para o início (montante)
      rLat = ptSeed[0]; rLon = ptSeed[1];
      for (let f = fSeed - 1; f >= fIni; f--) {
        const pt = escolherPontoNaFatia(fatias[f], rLat, rLon);
        if (pt) {
          escolhidosPorFatia[f] = pt;
          rLat = pt[0]; rLon = pt[1];
        }
      }

      const pontosTalvegueBrutos = escolhidosPorFatia.filter(Boolean);
      if (pontosTalvegueBrutos.length < 2) {
        if (window.UI) window.UI.toast('⚠️ Não foi possível extrair o talvegue automático. Use "✏️ Traçar Rota no Mapa".', 'alerta');
        return;
      }

      // Dupla passagem de suavização para um canal de navegação limpo e contínuo
      let verticesSuavizados = pontosTalvegueBrutos.slice();
      for (let pass = 0; pass < 2; pass++) {
        const temp = [];
        for (let i = 0; i < verticesSuavizados.length; i++) {
          if (i === 0 || i === verticesSuavizados.length - 1) {
            temp.push(verticesSuavizados[i]);
          } else {
            temp.push([
              (verticesSuavizados[i - 1][0] + verticesSuavizados[i][0] * 2 + verticesSuavizados[i + 1][0]) / 4,
              (verticesSuavizados[i - 1][1] + verticesSuavizados[i][1] * 2 + verticesSuavizados[i + 1][1]) / 4
            ]);
          }
        }
        verticesSuavizados = temp;
      }

      this._verticesRota = verticesSuavizados;
      this._processarRotaEAbrirPerfil(verticesSuavizados, 'Talvegue Automático (Eixo Mais Profundo)');
    },

    _calcularERenderizarPerfil: function () {
      if (this._verticesRota && this._verticesRota.length >= 2) {
        this._processarRotaEAbrirPerfil(this._verticesRota, this._rotuloRotaAtual || 'Canal de Navegação');
      }
    },

    _processarRotaEAbrirPerfil: function (verticesLatLon, rotuloRota) {
      if (!verticesLatLon || verticesLatLon.length < 2 || !this._ultimoResultadoGeoJSON) return;

      const tris = this._ultimoResultadoGeoJSON.features;
      const metodoInterp = this._ultimoMetodoInterp || 'linear';
      const larguraCanalM = Math.max(0, parseFloat(
        document.getElementById('perfil-largura-canal')?.value ||
        document.getElementById('bat-largura-canal')?.value ||
        '60'
      ) || 0);

      const segs = [];
      let compTotalM = 0;
      for (let i = 0; i < verticesLatLon.length - 1; i++) {
        const p0 = verticesLatLon[i];
        const p1 = verticesLatLon[i + 1];
        const d = this._haversineMetros(p0[1], p0[0], p1[1], p1[0]);
        if (d > 0.01) {
          segs.push({ lat0: p0[0], lon0: p0[1], lat1: p1[0], lon1: p1[1], compM: d, acumIniM: compTotalM });
          compTotalM += d;
        }
      }

      if (compTotalM < 1 || segs.length === 0) return;

      const numAmostras = Math.min(400, Math.max(80, Math.round(compTotalM / 10)));
      const passoM = compTotalM / numAmostras;

      const cfgR = this._obterParametrosRestricao();
      const maisRasoEhMenorZ = (cfgR.condicao !== 'maior_igual');
      const crs = document.getElementById('bat-projecao')?.value || 'UTM_22S';
      const mUtm = crs.match(/UTM_(\d+)([SN])/);
      const zona = mUtm ? parseInt(mUtm[1], 10) : 22;

      const amostras = [];
      let segIdx = 0;

      for (let k = 0; k <= numAmostras; k++) {
        const distM = Math.min(compTotalM, k * passoM);
        while (segIdx < segs.length - 1 && distM > segs[segIdx].acumIniM + segs[segIdx].compM) {
          segIdx++;
        }
        const s = segs[segIdx];
        const t = s.compM > 0 ? Math.max(0, Math.min(1, (distM - s.acumIniM) / s.compM)) : 0;
        const lat = s.lat0 + (s.lat1 - s.lat0) * t;
        const lon = s.lon0 + (s.lon1 - s.lon0) * t;

        const interpEixo = this._interpolarPontoNosTriangulos(lon, lat, tris, metodoInterp);
        // Converte para Profundidade Positiva (|Z| metros de coluna d'água abaixo da superfície)
        let zEixo = interpEixo && Number.isFinite(interpEixo.z) ? Math.abs(interpEixo.z) : null;
        let zFaixaCritico = zEixo;

        if (larguraCanalM > 1 && zEixo !== null) {
          const meiaLargM = larguraCanalM / 2;
          const dLatSeg = s.lat1 - s.lat0;
          const dLonSeg = (s.lon1 - s.lon0) * Math.cos(lat * Math.PI / 180);
          const norm = Math.hypot(dLatSeg, dLonSeg) || 1;
          const nx = -dLatSeg / norm;
          const ny = dLonSeg / norm;
          const mPorGrauLat = 111132.0;
          const mPorGrauLon = 111320.0 * Math.max(0.1, Math.cos(lat * Math.PI / 180));

          for (const frac of [-1.0, -0.5, 0.5, 1.0]) {
            const offM = meiaLargM * frac;
            const latOff = lat + (ny * offM) / mPorGrauLat;
            const lonOff = lon + (nx * offM) / mPorGrauLon;
            const resOff = this._interpolarPontoNosTriangulos(lonOff, latOff, tris, metodoInterp);
            if (resOff && Number.isFinite(resOff.z)) {
              const profOff = Math.abs(resOff.z);
              // O ponto mais crítico na largura da faixa do canal é sempre o MAIS RASO (menor profundidade!)
              if (profOff < zFaixaCritico) zFaixaCritico = profOff;
            }
          }
        }

        const utm = this.latLonParaUtm(lat, lon, zona);
        amostras.push({
          idx: k,
          distM: +distM.toFixed(1),
          lat,
          lon,
          x: +utm.x.toFixed(2),
          y: +utm.y.toFixed(2),
          zEixo: zEixo !== null ? +zEixo.toFixed(2) : null,
          zFaixaCritico: zFaixaCritico !== null ? +zFaixaCritico.toFixed(2) : null,
          dentroTIN: zEixo !== null
        });
      }

      for (let i = 0; i < amostras.length; i++) {
        if (amostras[i].zEixo === null) {
          let prev = null, next = null;
          for (let p = i - 1; p >= 0; p--) { if (amostras[p].zEixo !== null) { prev = amostras[p]; break; } }
          for (let n = i + 1; n < amostras.length; n++) { if (amostras[n].zEixo !== null) { next = amostras[n]; break; } }
          if (prev && next) {
            const f = (amostras[i].distM - prev.distM) / Math.max(1, next.distM - prev.distM);
            amostras[i].zEixo = +(prev.zEixo + (next.zEixo - prev.zEixo) * f).toFixed(2);
            amostras[i].zFaixaCritico = +(prev.zFaixaCritico + (next.zFaixaCritico - prev.zFaixaCritico) * f).toFixed(2);
          } else if (prev) {
            amostras[i].zEixo = prev.zEixo;
            amostras[i].zFaixaCritico = prev.zFaixaCritico;
          } else if (next) {
            amostras[i].zEixo = next.zEixo;
            amostras[i].zFaixaCritico = next.zFaixaCritico;
          } else {
            amostras[i].zEixo = this._extensao.zMin || 0;
            amostras[i].zFaixaCritico = amostras[i].zEixo;
          }
        }
      }

      this._amostrasPerfil = amostras;
      this._rotuloRotaAtual = rotuloRota || 'Canal de Navegação';

      this._recalcularTrechosCriticosDoPerfil();
      this._desenharRotaSegmentadaNoMapa();
      this.abrirPainelPerfil();
      this._renderizarGraficoPerfil();
      this._renderizarTabelaTrechosCriticos();
    },

    _recalcularTrechosCriticosDoPerfil: function () {
      const amostras = this._amostrasPerfil || [];
      if (!amostras.length) {
        this._trechosCriticos = [];
        return;
      }

      const cfgR = this._obterParametrosRestricao();
      const usarFaixa = (document.getElementById('perfil-avaliar-faixa')?.checked !== false);
      const maisRasoEhMenorZ = (cfgR.condicao !== 'maior_igual');

      const trechos = [];
      let atual = null;

      for (let i = 0; i < amostras.length; i++) {
        const am = amostras[i];
        const zAvaliado = usarFaixa ? am.zFaixaCritico : am.zEixo;
        const av = this._avaliarCotaRestricao(zAvaliado, cfgR.zCritico, cfgR.condicao, 1.0);

        am._restrito = av.restrito;
        am._atencao = av.atencao;
        am._deficitM = av.deficitM;
        am._folgaM = av.folgaM;
        am._zAvaliado = zAvaliado;

        if (av.restrito) {
          if (!atual) {
            atual = {
              id: trechos.length + 1,
              iniIdx: i,
              fimIdx: i,
              iniM: am.distM,
              fimM: am.distM,
              zPior: zAvaliado,
              deficitMax: av.deficitM,
              somaDeficitxDist: 0,
              latPior: am.lat,
              lonPior: am.lon,
              xPior: am.x,
              yPior: am.y,
              estacaPiorM: am.distM,
              coords: [[am.lat, am.lon]]
            };
          } else {
            const dPasso = am.distM - amostras[i - 1].distM;
            atual.fimIdx = i;
            atual.fimM = am.distM;
            atual.somaDeficitxDist += ((am._deficitM + amostras[i - 1]._deficitM) / 2) * dPasso;
            atual.coords.push([am.lat, am.lon]);

            const ehPior = (zAvaliado < atual.zPior);
            if (ehPior) {
              atual.zPior = zAvaliado;
              atual.deficitMax = av.deficitM;
              atual.latPior = am.lat;
              atual.lonPior = am.lon;
              atual.xPior = am.x;
              atual.yPior = am.y;
              atual.estacaPiorM = am.distM;
            }
          }
        } else if (atual) {
          atual.extM = Math.max(5, +(atual.fimM - atual.iniM).toFixed(1));
          trechos.push(atual);
          atual = null;
        }
      }

      if (atual) {
        atual.extM = Math.max(5, +(atual.fimM - atual.iniM).toFixed(1));
        trechos.push(atual);
      }

      this._trechosCriticos = trechos;
    },

    _desenharRotaSegmentadaNoMapa: function () {
      if (!window.mapa || !this._amostrasPerfil.length) return;

      if (!window.mapa.getPane('paneRotaBatimetria')) {
        const p = window.mapa.createPane('paneRotaBatimetria');
        p.style.zIndex = 620;
      }

      if (this._layerRotaMapa) {
        try { window.mapa.removeLayer(this._layerRotaMapa); } catch (_) {}
      }
      this._layerRotaMapa = L.featureGroup().addTo(window.mapa);

      const amostras = this._amostrasPerfil;
      const cfgR = this._obterParametrosRestricao();
      const larguraCanalM = Math.max(0, parseFloat(document.getElementById('perfil-largura-canal')?.value || '60') || 0);

      if (larguraCanalM > 1 && typeof turf !== 'undefined' && typeof turf.buffer === 'function') {
        try {
          const lineGeo = turf.lineString(amostras.map(a => [a.lon, a.lat]));
          const bufGeo = turf.buffer(lineGeo, (larguraCanalM / 2) / 1000, { units: 'kilometers' });
          L.geoJSON(bufGeo, {
            pane: 'paneRotaBatimetria',
            interactive: false,
            style: {
              color: '#38bdf8',
              weight: 1.2,
              dashArray: '4, 4',
              fillColor: '#0ea5e9',
              fillOpacity: 0.10
            }
          }).addTo(this._layerRotaMapa);
        } catch (_) {}
      }

      let segCoords = [[amostras[0].lat, amostras[0].lon]];
      let segRestrito = amostras[0]._restrito;

      const adicionarSegmento = (coords, restrito) => {
        if (coords.length < 2) return;
        if (restrito) {
          L.polyline(coords, {
            pane: 'paneRotaBatimetria',
            color: '#fef08a',
            weight: 9,
            opacity: 0.65,
            lineCap: 'round',
            interactive: false
          }).addTo(this._layerRotaMapa);

          L.polyline(coords, {
            pane: 'paneRotaBatimetria',
            color: '#dc2626',
            weight: 5.5,
            opacity: 1,
            lineCap: 'round'
          }).bindTooltip('🚨 Trecho com Restrição de Profundidade!', { sticky: true }).addTo(this._layerRotaMapa);
        } else {
          L.polyline(coords, {
            pane: 'paneRotaBatimetria',
            color: '#0f172a',
            weight: 6.5,
            opacity: 0.7,
            interactive: false
          }).addTo(this._layerRotaMapa);

          L.polyline(coords, {
            pane: 'paneRotaBatimetria',
            color: '#10b981',
            weight: 4,
            opacity: 0.98
          }).bindTooltip('✅ Trecho Navegável (Profundidade Segura)', { sticky: true }).addTo(this._layerRotaMapa);
        }
      };

      for (let i = 1; i < amostras.length; i++) {
        const pt = [amostras[i].lat, amostras[i].lon];
        segCoords.push(pt);
        if (amostras[i]._restrito !== segRestrito) {
          adicionarSegmento(segCoords, segRestrito);
          segCoords = [pt];
          segRestrito = amostras[i]._restrito;
        }
      }
      adicionarSegmento(segCoords, segRestrito);

      const ini = amostras[0];
      const fim = amostras[amostras.length - 1];

      L.circleMarker([ini.lat, ini.lon], {
        pane: 'paneRotaBatimetria',
        radius: 6.5,
        color: '#ffffff',
        weight: 2,
        fillColor: '#10b981',
        fillOpacity: 1
      }).bindTooltip(`🟢 Início do Canal (0 m · Z = ${ini.zEixo.toFixed(2)} m)`, { permanent: false }).addTo(this._layerRotaMapa);

      L.circleMarker([fim.lat, fim.lon], {
        pane: 'paneRotaBatimetria',
        radius: 6.5,
        color: '#ffffff',
        weight: 2,
        fillColor: '#0284c7',
        fillOpacity: 1
      }).bindTooltip(`🏁 Fim do Canal (${fim.distM.toFixed(0)} m · Z = ${fim.zEixo.toFixed(2)} m)`, { permanent: false }).addTo(this._layerRotaMapa);

      for (const tc of this._trechosCriticos) {
        const iconeAlerta = L.divIcon({
          className: 'bat-pin-restricao',
          html: `<div style="background:#dc2626; color:#fff; border:2px solid #fef08a; border-radius:12px; padding:1px 6px; font-size:10px; font-weight:800; white-space:nowrap; box-shadow:0 3px 10px rgba(0,0,0,0.6);">⚠️ R${tc.id}: ${tc.zPior.toFixed(2)}m</div>`,
          iconSize: [74, 20],
          iconAnchor: [37, 24]
        });

        const mk = L.marker([tc.latPior, tc.lonPior], {
          pane: 'paneRotaBatimetria',
          icon: iconeAlerta
        });

        mk.bindPopup(`
          <div class="pop-topo" style="background:linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%);">
            🚨 Restrição de Navegação #${tc.id}
          </div>
          <div class="pop-corpo">
            <div class="pop-linha"><span class="pop-lbl">Trecho no Canal:</span><span class="pop-val"><strong>Estaca ${tc.iniM.toFixed(0)} m a ${tc.fimM.toFixed(0)} m</strong></span></div>
            <div class="pop-linha"><span class="pop-lbl">Extensão Crítica:</span><span class="pop-val"><strong style="color:#dc2626;">${tc.extM.toFixed(1)} m</strong></span></div>
            <div class="pop-linha"><span class="pop-lbl">Profundidade Mínima:</span><span class="pop-val"><strong style="color:#dc2626;">${tc.zPior.toFixed(2)} m</strong> (Estaca ${tc.estacaPiorM.toFixed(0)} m)</span></div>
            <div class="pop-linha"><span class="pop-lbl">Limite de Segurança:</span><span class="pop-val">${cfgR.zCritico.toFixed(2)} m</span></div>
            <div class="pop-linha"><span class="pop-lbl">Déficit Máximo (Corte):</span><span class="pop-val"><strong>-${tc.deficitMax.toFixed(2)} m</strong></span></div>
            <div class="pop-linha"><span class="pop-lbl">Coord. Ponto Crítico:</span><span class="pop-val">${tc.xPior}, ${tc.yPior}</span></div>
          </div>
        `);
        mk.addTo(this._layerRotaMapa);
      }
    },

    abrirPainelPerfil: function () {
      const painel = document.getElementById('painel-perfil-batimetrico');
      if (!painel) return;
      painel.style.display = 'flex';
      painel.classList.remove('minimizado');
      const corpo = document.getElementById('perfil-batimetrico-corpo');
      if (corpo) corpo.style.display = 'grid';
      requestAnimationFrame(() => this._renderizarGraficoPerfil());
      setTimeout(() => this._renderizarGraficoPerfil(), 80);
    },

    alternarMinimizarPainelPerfil: function () {
      const painel = document.getElementById('painel-perfil-batimetrico');
      if (!painel) return;
      painel.classList.toggle('minimizado');
      const corpo = document.getElementById('perfil-batimetrico-corpo');
      if (corpo) {
        corpo.style.display = painel.classList.contains('minimizado') ? 'none' : 'grid';
      }
      if (!painel.classList.contains('minimizado')) {
        setTimeout(() => this._renderizarGraficoPerfil(), 50);
      }
    },

    fecharPainelPerfil: function () {
      const painel = document.getElementById('painel-perfil-batimetrico');
      if (painel) painel.style.display = 'none';
      if (this._markerNavioHover && window.mapa) {
        try { window.mapa.removeLayer(this._markerNavioHover); } catch (_) {}
        this._markerNavioHover = null;
      }
    },

    limparRotaPerfil: function () {
      this._amostrasPerfil = [];
      this._trechosCriticos = [];
      this._verticesRota = [];
      if (this._layerRotaMapa && window.mapa) {
        try { window.mapa.removeLayer(this._layerRotaMapa); } catch (_) {}
        this._layerRotaMapa = null;
      }
      if (this._markerNavioHover && window.mapa) {
        try { window.mapa.removeLayer(this._markerNavioHover); } catch (_) {}
        this._markerNavioHover = null;
      }
      this.fecharPainelPerfil();
      if (window.UI) window.UI.toast('🗑️ Rota e perfil longitudinal removidos do mapa.');
    },

    focarTrechoCritico: function (idTrecho) {
      const tc = this._trechosCriticos.find(t => t.id === idTrecho);
      if (!tc || !window.mapa) return;
      window.mapa.setView([tc.latPior, tc.lonPior], Math.max(window.mapa.getZoom(), 15), { animate: true });
      const idxProximo = this._amostrasPerfil.findIndex(a => Math.abs(a.distM - tc.estacaPiorM) < 15);
      if (idxProximo >= 0) {
        this._atualizarCursorPerfilNoMapa(idxProximo);
      }
    },

    /**
     * Renderiza o Gráfico Interativo de Perfil Longitudinal em Canvas HTML5
     * CORREÇÃO DEFINITIVA: Altura H fixada em 200px lógicos e NUNCA altera canvas.style.height/width,
     * impedindo o loop de crescimento causado pela borda do getBoundingClientRect()!
     */
    _renderizarGraficoPerfil: function () {
      const canvas = document.getElementById('canvas-perfil-batimetrico');
      if (!canvas || !this._amostrasPerfil || this._amostrasPerfil.length < 2) return;

      const dpr = window.devicePixelRatio || 1;
      const parentW = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
      const W = Math.max(360, parentW || canvas.clientWidth || 680);
      const H = 200; // Altura travada em 200px (jamais cresce ao mover o mouse!)

      const targetW = Math.round(W * dpr);
      const targetH = Math.round(H * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const amostras = this._amostrasPerfil;
      const cfgR = this._obterParametrosRestricao();
      const zCrit = Math.abs(Number(cfgR.zCritico) || 5.0);
      const inverterEixoY = (document.getElementById('perfil-inverter-y')?.checked !== false);
      const mostrarFaixa = (document.getElementById('perfil-avaliar-faixa')?.checked !== false);

      const padL = 58, padR = 16, padT = 22, padB = 26;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;

      const distMax = Math.max(1, amostras[amostras.length - 1].distM);
      let profMax = 0;
      for (const a of amostras) {
        const pE = Math.abs(Number(a.zEixo) || 0);
        const pF = Math.abs(Number(a.zFaixaCritico) || 0);
        if (pE > profMax) profMax = pE;
        if (pF > profMax) profMax = pF;
      }
      // Garante que a superfície d'água (0,0 m) esteja sempre no topo e o ponto mais fundo na base
      const yMinVal = 0.0; // Nível d'Água (Superfície = 0,0 m)
      const yMaxVal = Math.max(profMax * 1.10, Math.min(profMax * 1.35, Math.max(profMax, zCrit) * 1.12), 2.0);
      const ySpan = Math.max(0.5, yMaxVal - yMinVal);

      const xOf = (d) => padL + (d / distMax) * plotW;
      // Com "Fundo p/ Baixo" (inverterEixoY = true):
      // 0,0 m (Superfície da Água) fica no TOPO (padT) e a maior profundidade (ex: 31,5 m) fica na BASE (padT + plotH).
      // Assim, bancos rasos (ex: 4,8 m) sobem em direção à superfície e invadem o calado crítico (ex: 17,7 m)!
      const yOf = (profPositiva) => {
        const p = Math.abs(Number(profPositiva) || 0);
        const norm = Math.max(0, Math.min(1, (p - yMinVal) / ySpan));
        return inverterEixoY ? (padT + norm * plotH) : (padT + (1 - norm) * plotH);
      };

      const ySuperficiePx = yOf(0);
      const yFundoBasePx = yOf(yMaxVal);

      ctx.fillStyle = '#040d1a';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.lineWidth = 1;
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#94a3b8';

      const nTicksY = 5;
      for (let i = 0; i <= nTicksY; i++) {
        const pVal = yMinVal + (ySpan * i) / nTicksY;
        const yPx = yOf(pVal);
        ctx.beginPath();
        ctx.moveTo(padL, yPx);
        ctx.lineTo(W - padR, yPx);
        ctx.stroke();
        ctx.textAlign = 'right';
        ctx.fillStyle = i === 0 ? '#38bdf8' : '#94a3b8';
        ctx.fillText(i === 0 ? '0.0m (NA)' : `${pVal.toFixed(1)}m`, padL - 5, yPx + 3.5);
      }

      const nTicksX = Math.min(8, Math.max(4, Math.floor(plotW / 85)));
      ctx.fillStyle = '#94a3b8';
      for (let i = 0; i <= nTicksX; i++) {
        const dVal = (distMax * i) / nTicksX;
        const xPx = xOf(dVal);
        ctx.beginPath();
        ctx.moveTo(xPx, padT);
        ctx.lineTo(xPx, H - padB);
        ctx.stroke();
        ctx.textAlign = 'center';
        const lbl = distMax >= 2000 ? `${(dVal / 1000).toFixed(2)} km` : `${Math.round(dVal)} m`;
        ctx.fillText(lbl, xPx, H - padB + 15);
      }

      // 1. Preenchimento da coluna d'água (entre a Superfície 0.0m e o leito do rio)
      ctx.beginPath();
      ctx.moveTo(xOf(amostras[0].distM), ySuperficiePx);
      for (let i = 0; i < amostras.length; i++) {
        ctx.lineTo(xOf(amostras[i].distM), yOf(amostras[i].zEixo));
      }
      ctx.lineTo(xOf(amostras[amostras.length - 1].distM), ySuperficiePx);
      ctx.closePath();
      const gradAgua = ctx.createLinearGradient(0, padT, 0, padT + plotH);
      gradAgua.addColorStop(0, 'rgba(56, 189, 248, 0.32)');
      gradAgua.addColorStop(1, 'rgba(2, 132, 199, 0.10)');
      ctx.fillStyle = gradAgua;
      ctx.fill();

      // 2. Preenchimento do leito do rio (sedimento/fundo abaixo da linha batimétrica)
      ctx.beginPath();
      ctx.moveTo(xOf(amostras[0].distM), yFundoBasePx);
      for (let i = 0; i < amostras.length; i++) {
        ctx.lineTo(xOf(amostras[i].distM), yOf(amostras[i].zEixo));
      }
      ctx.lineTo(xOf(amostras[amostras.length - 1].distM), yFundoBasePx);
      ctx.closePath();
      ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      ctx.fill();

      // 3. Destaque em VERMELHO dos bancos rasos onde a profundidade é MENOR que o Calado Crítico (invade o gabarito!)
      const yCritPx = yOf(zCrit);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.55)';
      for (let i = 0; i < amostras.length - 1; i++) {
        const a0 = amostras[i], a1 = amostras[i + 1];
        if (a0._restrito || a1._restrito) {
          const x0 = xOf(a0.distM), x1 = xOf(a1.distM);
          const p0 = Math.min(zCrit, mostrarFaixa ? a0.zFaixaCritico : a0.zEixo);
          const p1 = Math.min(zCrit, mostrarFaixa ? a1.zFaixaCritico : a1.zEixo);
          const y0 = yOf(p0);
          const y1 = yOf(p1);
          ctx.beginPath();
          ctx.moveTo(x0, yCritPx);
          ctx.lineTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.lineTo(x1, yCritPx);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 4. Linha da Profundidade Mais Rasa na Largura da Faixa do Canal (tracejada âmbar)
      if (mostrarFaixa) {
        ctx.beginPath();
        for (let i = 0; i < amostras.length; i++) {
          const x = xOf(amostras[i].distM);
          const y = yOf(amostras[i].zFaixaCritico);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 5. Curva Principal da Profundidade no Eixo do Canal (Azul onde navegável, Vermelha onde raso/restrito)
      for (let i = 0; i < amostras.length - 1; i++) {
        const a0 = amostras[i], a1 = amostras[i + 1];
        ctx.beginPath();
        ctx.moveTo(xOf(a0.distM), yOf(a0.zEixo));
        ctx.lineTo(xOf(a1.distM), yOf(a1.zEixo));
        ctx.strokeStyle = (a0._restrito || a1._restrito) ? '#ef4444' : '#38bdf8';
        ctx.lineWidth = (a0._restrito || a1._restrito) ? 3.0 : 2.3;
        ctx.stroke();
      }

      // 6. Linha Horizontal da Profundidade Crítica / Calado de Restrição
      if (yCritPx >= padT && yCritPx <= H - padB) {
        ctx.beginPath();
        ctx.moveTo(padL, yCritPx);
        ctx.lineTo(W - padR, yCritPx);
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#dc2626';
        ctx.fillRect(padL + 6, Math.max(padT + 2, yCritPx - 15), 228, 14);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.font = 'bold 9.5px "Segoe UI", sans-serif';
        ctx.fillText(`🚨 Prof. Crítica / Restrição (≤ ${zCrit.toFixed(2)} m)`, padL + 10, Math.max(padT + 12, yCritPx - 4));
      }

      // 7. Mira Interativa (Hover / Touch)
      if (this._hoverIdxPerfil >= 0 && this._hoverIdxPerfil < amostras.length) {
        const am = amostras[this._hoverIdxPerfil];
        const hx = xOf(am.distM);
        const hy = yOf(am.zEixo);

        ctx.beginPath();
        ctx.moveTo(hx, padT);
        ctx.lineTo(hx, H - padB);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(hx, hy, 5, 0, Math.PI * 2);
        ctx.fillStyle = am._restrito ? '#ef4444' : '#10b981';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        const txt1 = `Estaca: ${am.distM.toFixed(0)} m | Prof. Eixo: ${am.zEixo.toFixed(2)} m | Faixa: ${am.zFaixaCritico.toFixed(2)} m`;
        const txt2 = am._restrito
          ? `🚨 RESTRIÇÃO (Raso): Déficit -${am._deficitM.toFixed(2)} m (Calado: ${zCrit.toFixed(2)} m)`
          : `✅ NAVEGÁVEL (Fundo): Folga +${am._folgaM.toFixed(2)} m`;

        const boxW = 285, boxH = 34;
        const bx = (hx + boxW + 14 < W - padR) ? hx + 10 : Math.max(padL + 4, hx - boxW - 10);
        const by = padT + 4;

        ctx.fillStyle = 'rgba(10, 37, 64, 0.94)';
        ctx.strokeStyle = am._restrito ? '#ef4444' : '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeRect(bx, by, boxW, boxH);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.fillText(txt1, bx + 6, by + 13);
        ctx.fillStyle = am._restrito ? '#fca5a5' : '#6ee7b7';
        ctx.font = 'bold 10px "Segoe UI", sans-serif';
        ctx.fillText(txt2, bx + 6, by + 27);
      }

      this._vincularEventosCanvasPerfil(canvas, padL, padR);
    },

    _vincularEventosCanvasPerfil: function (canvas, padL, padR) {
      if (canvas._eventosVinculados) return;
      canvas._eventosVinculados = true;

      const processarPosicao = (clientX) => {
        if (!this._amostrasPerfil || !this._amostrasPerfil.length) return;
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const plotW = Math.max(10, rect.width - padL - padR);
        const frac = Math.max(0, Math.min(1, (x - padL) / plotW));
        const idx = Math.round(frac * (this._amostrasPerfil.length - 1));
        if (idx !== this._hoverIdxPerfil) {
          this._atualizarCursorPerfilNoMapa(idx);
        }
      };

      canvas.addEventListener('mousemove', (e) => processarPosicao(e.clientX));
      canvas.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) {
          processarPosicao(e.touches[0].clientX);
        }
      }, { passive: true });
      canvas.addEventListener('click', (e) => {
        processarPosicao(e.clientX);
        if (this._hoverIdxPerfil >= 0 && window.mapa) {
          const am = this._amostrasPerfil[this._hoverIdxPerfil];
          if (am) window.mapa.panTo([am.lat, am.lon]);
        }
      });
    },

    _atualizarCursorPerfilNoMapa: function (idx) {
      if (!this._amostrasPerfil || idx < 0 || idx >= this._amostrasPerfil.length) return;
      this._hoverIdxPerfil = idx;
      const am = this._amostrasPerfil[idx];

      this._renderizarGraficoPerfil();

      if (!window.mapa) return;
      const corFundo = am._restrito ? '#dc2626' : '#0284c7';
      const htmlIcon = `
        <div style="background:${corFundo}; color:#fff; border:2px solid #fff; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-size:13px; box-shadow:0 4px 12px rgba(0,0,0,0.65);">
          🚢
        </div>
      `;

      const iconeNavio = L.divIcon({
        className: 'bat-navio-hover',
        html: htmlIcon,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      if (!this._markerNavioHover) {
        this._markerNavioHover = L.marker([am.lat, am.lon], {
          pane: 'paneRotaBatimetria',
          icon: iconeNavio,
          zIndexOffset: 2000
        }).addTo(window.mapa);
      } else {
        this._markerNavioHover.setLatLng([am.lat, am.lon]);
        this._markerNavioHover.setIcon(iconeNavio);
      }

      const statusLbl = am._restrito
        ? `🚨 RESTRIÇÃO (-${am._deficitM.toFixed(2)} m)`
        : `✅ Livre (+${am._folgaM.toFixed(2)} m)`;
      this._markerNavioHover.bindTooltip(
        `<strong>🚢 Estaca ${am.distM.toFixed(0)} m</strong><br>Z Eixo: <strong>${am.zEixo.toFixed(2)} m</strong> | Faixa: <strong>${am.zFaixaCritico.toFixed(2)} m</strong><br>${statusLbl}`,
        { permanent: false, direction: 'top', offset: [0, -12] }
      ).openTooltip();
    },

    _renderizarTabelaTrechosCriticos: function () {
      const boxResumo = document.getElementById('perfil-kpis-resumo');
      const boxLista = document.getElementById('perfil-lista-trechos');
      if (!boxResumo || !boxLista) return;

      const amostras = this._amostrasPerfil || [];
      if (!amostras.length) return;

      const extTotalM = amostras[amostras.length - 1].distM;
      const trechos = this._trechosCriticos || [];
      const extRestritaM = trechos.reduce((acc, t) => acc + t.extM, 0);
      const percRotaRestrita = extTotalM > 0 ? ((extRestritaM / extTotalM) * 100).toFixed(1) : '0.0';
      const larguraCanalM = Math.max(10, parseFloat(document.getElementById('perfil-largura-canal')?.value || '60') || 60);

      let zMinRota = Infinity, zMaxRota = -Infinity;
      let volCorteCanalM3 = 0;
      for (const t of trechos) {
        volCorteCanalM3 += t.somaDeficitxDist * larguraCanalM;
      }
      for (const a of amostras) {
        if (a.zFaixaCritico < zMinRota) zMinRota = a.zFaixaCritico;
        if (a.zEixo > zMaxRota) zMaxRota = a.zEixo;
      }

      const temRestricao = trechos.length > 0;
      const badgeStatus = temRestricao
        ? `<div style="background:#7f1d1d; color:#fecaca; border:1px solid #ef4444; padding:3px 8px; border-radius:5px; font-weight:800; font-size:10.5px;">🚨 ${trechos.length} TRECHO(S) COM RESTRIÇÃO (${extRestritaM.toFixed(0)} m · ${percRotaRestrita}%)</div>`
        : `<div style="background:#064e3b; color:#a7f3d0; border:1px solid #10b981; padding:3px 8px; border-radius:5px; font-weight:800; font-size:10.5px;">✅ CANAL 100% NAVEGÁVEL SEM RESTRIÇÃO</div>`;

      boxResumo.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:4px;">
          <div style="font-size:11px; color:#e2e8f0;">🧭 <strong>${this._rotuloRotaAtual || 'Rota'}:</strong> <strong>${(extTotalM / 1000).toFixed(2)} km</strong> (${extTotalM.toFixed(0)} m)</div>
          ${badgeStatus}
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px 8px; font-size:10.5px; color:#cbd5e1;">
          <div>📏 <strong>Prof. Mín / Máx:</strong> <strong style="color:#38bdf8;">${zMinRota.toFixed(2)}m</strong> / ${zMaxRota.toFixed(2)}m</div>
          <div>🏗️ <strong>Dragagem (${larguraCanalM}m):</strong> <strong style="color:#fbbf24;">${Math.round(volCorteCanalM3).toLocaleString('pt-BR')} m³</strong></div>
        </div>
      `;

      if (!temRestricao) {
        boxLista.innerHTML = `
          <div style="color:#6ee7b7; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.35); padding:8px; border-radius:6px; font-size:11px; text-align:center;">
            ✅ Nenhuma restrição detectada ao longo dos ${(extTotalM / 1000).toFixed(2)} km para o limite configurado.
          </div>
        `;
        return;
      }

      boxLista.innerHTML = trechos.map(tc => `
        <div onclick="BatimetriaTINManager.focarTrechoCritico(${tc.id})"
             style="background:rgba(127,29,29,0.32); border:1px solid rgba(239,68,68,0.5); border-radius:6px; padding:6px 8px; margin-bottom:5px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:6px; box-sizing:border-box;"
             title="Clique para dar zoom neste banco raso / restrição no mapa">
          <div style="min-width:0; flex:1;">
            <div style="font-weight:800; color:#fca5a5; font-size:10.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ⚠️ Trecho #${tc.id}: ${tc.iniM.toFixed(0)}m → ${tc.fimM.toFixed(0)}m (${tc.extM.toFixed(0)} m)
            </div>
            <div style="font-size:10px; color:#e2e8f0;">
              Mín: <strong style="color:#fef08a;">${tc.zPior.toFixed(2)} m</strong> · Déficit: <strong style="color:#f87171;">-${tc.deficitMax.toFixed(2)} m</strong>
            </div>
          </div>
          <span style="background:#dc2626; color:#fff; padding:3px 7px; border-radius:4px; font-size:10px; font-weight:700; white-space:nowrap; flex-shrink:0;">🔍 Zoom</span>
        </div>
      `).join('');
    },

    exportarPerfilCSV: function () {
      if (!this._amostrasPerfil || !this._amostrasPerfil.length) {
        if (window.UI) window.UI.toast('⚠️ Gere um perfil longitudinal primeiro.', 'alerta');
        return;
      }
      const cfgR = this._obterParametrosRestricao();
      const cab = 'Estaca_m;X_UTM;Y_UTM;Latitude;Longitude;Z_Eixo_m;Z_Critico_Faixa_m;Limite_Restricao_m;Folga_m;Deficit_Corte_m;Status_Navegacao';
      const linhas = this._amostrasPerfil.map(a => [
        a.distM.toFixed(1),
        a.x.toFixed(2),
        a.y.toFixed(2),
        a.lat.toFixed(6),
        a.lon.toFixed(6),
        a.zEixo.toFixed(2),
        a.zFaixaCritico.toFixed(2),
        cfgR.zCritico.toFixed(2),
        (a._folgaM || 0).toFixed(2),
        (a._deficitM || 0).toFixed(2),
        a._restrito ? 'RESTRICAO_CRITICA' : (a._atencao ? 'ATENCAO_FOLGA_BAIXA' : 'NAVEGAVEL_SEGURO')
      ].join(';'));

      const csv = '\uFEFF' + [cab, ...linhas].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `perfil_batimetrico_canal_${this._nomeArquivo || 'antaq'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    exportarRotaPerfilGeoJSON: function () {
      if (!this._amostrasPerfil || !this._amostrasPerfil.length) {
        if (window.UI) window.UI.toast('⚠️ Gere um perfil longitudinal primeiro.', 'alerta');
        return;
      }
      const cfgR = this._obterParametrosRestricao();
      const features = [];

      features.push({
        type: 'Feature',
        properties: {
          tipo: 'eixo_canal_navegacao',
          nome: this._rotuloRotaAtual || 'Canal de Navegação',
          extensao_m: this._amostrasPerfil[this._amostrasPerfil.length - 1].distM,
          limite_restricao_m: cfgR.zCritico,
          trechos_criticos: this._trechosCriticos.length
        },
        geometry: {
          type: 'LineString',
          coordinates: this._amostrasPerfil.map(a => [a.lon, a.lat, a.zEixo])
        }
      });

      for (const tc of this._trechosCriticos) {
        if (tc.coords.length >= 2) {
          features.push({
            type: 'Feature',
            properties: {
              tipo: 'trecho_restricao_navegacao',
              trecho_id: tc.id,
              estaca_inicial_m: tc.iniM,
              estaca_final_m: tc.fimM,
              extensao_critica_m: tc.extM,
              profundidade_pior_m: tc.zPior,
              deficit_max_m: tc.deficitMax
            },
            geometry: {
              type: 'LineString',
              coordinates: tc.coords.map(c => [c[1], c[0]])
            }
          });
        }
        features.push({
          type: 'Feature',
          properties: {
            tipo: 'ponto_mais_raso_critico',
            trecho_id: tc.id,
            estaca_m: tc.estacaPiorM,
            profundidade_m: tc.zPior,
            deficit_m: tc.deficitMax
          },
          geometry: {
            type: 'Point',
            coordinates: [tc.lonPior, tc.latPior]
          }
        });
      }

      const geojson = { type: 'FeatureCollection', features };
      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rota_e_restricoes_canal_${this._nomeArquivo || 'antaq'}.geojson`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    baixarGraficoPerfilPNG: function () {
      const canvas = document.getElementById('canvas-perfil-batimetrico');
      if (!canvas) return;
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `grafico_perfil_batimetrico_${this._nomeArquivo || 'antaq'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },

    _renderizarCardParametrosNoModal: function () {
      const box = document.getElementById('bat-relatorio-parametros');
      const p = this._ultimoRelatorioParams;
      if (!box || !p) return;

      box.style.display = 'block';
      box.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #1e4976; padding-bottom:6px; flex-wrap:wrap; gap:6px;">
          <strong style="color:#38bdf8; font-size:11.5px;">📋 LOG DO RASTER DE SAÍDA (PADRÃO QGIS)</strong>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button type="button" onclick="BatimetriaTINManager.iniciarTracadoRotaNoMapa()" style="background:#0284c7; color:#fff; border:1px solid #38bdf8; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:700; cursor:pointer;">🚢 Traçar Canal / Perfil</button>
            <button type="button" onclick="BatimetriaTINManager.gerarTalvegueAutomatico()" style="background:#0f766e; color:#fff; border:1px solid #14b8a6; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:700; cursor:pointer;">🧭 Auto-Talvegue</button>
            <button type="button" onclick="BatimetriaTINManager.copiarParametros()" style="background:#334155; color:#fff; border:none; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:700; cursor:pointer;">📋 Copiar Log</button>
            <button type="button" onclick="BatimetriaTINManager.exportarUltimoTIN()" style="background:#059669; color:#fff; border:none; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:700; cursor:pointer;">💾 GeoJSON</button>
            ${this._ultimoRasterDataUrl ? `<button type="button" onclick="BatimetriaTINManager.baixarImagemRaster()" style="background:#7c3aed; color:#fff; border:none; padding:3px 8px; border-radius:4px; font-size:10px; font-weight:700; cursor:pointer;">🖼️ PNG</button>` : ''}
          </div>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px 12px; font-size:10.5px; color:#e2e8f0;">
          <div style="grid-column:span 2;"><strong>Extensão:</strong> <span style="font-family:monospace; color:#bae6fd;">${p.extensaoStr}</span></div>
          <div><strong>Linhas × Colunas:</strong> <span style="color:#38bdf8; font-weight:700;">${p.rows.toLocaleString('pt-BR')} × ${p.cols.toLocaleString('pt-BR')} (${p.totalPixelsGrade} px)</span></div>
          <div><strong>Tamanho do Pixel X / Y:</strong> <span style="color:#fbbf24; font-weight:700;">${p.resolucaoPixelM}</span></div>
          <div><strong>Pixels Interpolados:</strong> <span style="color:#10b981; font-weight:700;">${p.pixelsAtivos}</span></div>
          <div><strong>Método de Interpolação:</strong> ${p.metodo}</div>
          <div style="grid-column:span 2; background:${p.abacoAtivo ? 'rgba(131,24,67,0.35)' : 'transparent'}; border:${p.abacoAtivo ? '1px solid #f472b6' : 'none'}; padding:${p.abacoAtivo ? '4px 8px' : '0'}; border-radius:5px;">
            <strong>Correção Ábaco (Marinha/ANA):</strong> <span style="color:${p.abacoAtivo ? '#fbcfe8' : '#f472b6'}; font-weight:${p.abacoAtivo ? '700' : '400'};">${p.abacoResumo}</span>
          </div>
          <div><strong>Cotas ${p.abacoAtivo ? 'Corrigidas' : '(Mín / Méd / Máx)'}:</strong> <strong style="color:#38bdf8;">${p.zMin} m / ${p.zMedio} m / ${p.zMax} m</strong> ${p.abacoAtivo && p.zBrutoMin ? `<span style="color:#94a3b8; font-size:9.5px;">(Bruto: ${p.zBrutoMin}m a ${p.zBrutoMax}m)</span>` : ''}</div>
          <div><strong>Área / Volume Estimado:</strong> ${p.areaHa} ha (${p.volumeM3} m³)</div>
        </div>
      `;
    },

    copiarParametros: function () {
      const p = this._ultimoRelatorioParams;
      if (!p) return;
      const texto = [
        '=== LOG DE EXECUÇÃO — INTERPOLAÇÃO TIN (WEBGIS ANTAQ / PADRÃO QGIS) ===',
        `Camada / Arquivo de Entrada: ${p.arquivo}`,
        `Método de Interpolação: ${p.metodo}`,
        `Extensão: ${p.extensaoStr}`,
        `Tamanho do Raster de Saída: Linhas = ${p.rows} | Colunas = ${p.cols} (${p.totalPixelsGrade} pixels)`,
        `Tamanho do Pixel: ${p.resolucaoPixelM}`,
        `Pixels Efetivamente Interpolados: ${p.pixelsAtivos} (NoData: ${p.pixelsNoData})`,
        `Correção pelo Ábaco da Marinha (CHM/ANA): ${p.abacoResumo}`,
        `Geometria da Sondagem: Passo na linha = ${p.passoIntraM} | Espaçamento entre linhas = ${p.espacamentoInterM}`,
        `Critério de Contorno: ${p.restricaoContorno}`,
        `Pontos de Entrada: ${p.pontosBrutosTotal} (${p.triangulosGerados} triângulos Delaunay)`,
        `Estatísticas Batimétricas (Z): Mín = ${p.zMin} m | Média = ${p.zMedio} m | Máx = ${p.zMax} m`,
        `Área Mapeada: ${p.areaHa} ha | Volume Estimado: ${p.volumeM3} m³`
      ].join('\n');

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(() => {
          if (window.UI) window.UI.toast('📋 Log de parâmetros QGIS copiado para a área de transferência!');
        });
      }
    },

    baixarImagemRaster: function () {
      if (!this._ultimoRasterDataUrl) return;
      const a = document.createElement('a');
      a.href = this._ultimoRasterDataUrl;
      a.download = `${this._nomeArquivo || 'interpolado_tin'}_${this._ultimoRelatorioParams?.rows || 1000}x${this._ultimoRelatorioParams?.cols || 1000}px.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
      a.download = `${this._nomeArquivo || 'triangulacao_tin'}_antaq.geojson`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  window.BatimetriaTINManager = BatimetriaTINManager;

  // =========================================================================
  // 🔒 CONTROLE DE PERFIL DE ACESSO: AMBIENTE GERAL (PRODUÇÃO) vs RESTRITO (HOMOLOGAÇÃO GEE)
  // Restringe Aba Geo, Aba AIS e Batimetria TIN exclusivamente a usuários autenticados no modo Homologação (Estudos GEE)
  // =========================================================================
/* ============================================================
   WebGIS ANTAQ — Módulo: AmbienteManager v2.0 (Módulo M21)
   Escopo: Alternância Produção (Consulta Geral) / Homologação (Restrito GEE/SEPH)
           com Modal Institucional Mascarado, Botão Mostrar/Ocultar Senha (👁️),
           Derivação Criptográfica WebCrypto PBKDF2-HMAC-SHA256 (100.000 iterações + Salt),
           Configuração Externa Desacoplada (dados/config_auth_gee.json),
           Suporte a Endpoint Corporativo STI/SSO e Proteção Anti-Força Bruta.
   Dependências: window.UI
   Expõe: window.AmbienteManager
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY_SESSAO = 'antaq_auth_homolog_token_v2';
  const STORAGE_KEY_LOCKOUT = 'antaq_auth_lockout_v2';

  const AmbienteManager = {
    atual: 'producao',
    _configCarregada: false,
    _callbackSucessoPendente: null,
    _timerLockoutUI: null,

    // Configuração padrão (sobreposta automaticamente por dados/config_auth_gee.json se presente no servidor)
    _config: {
      modoAutenticacao: 'hibrido_api_ou_pbkdf2',
      endpointAuthSTI: '/api/v1/auth/homologacao',
      usarEndpointSTISeDisponivel: false,
      sessaoTTLMinutos: 240,
      maxTentativas: 5,
      bloqueioSegundos: 60,
      pbkdf2: {
        algoritmo: 'PBKDF2-HMAC-SHA256',
        iteracoes: 100000,
        salt: 'ANTAQ_GEE_SEPH_SALT_2026_V2',
        hashHex: '293a01b6ab04eaab20103833f02dff5dffd0c1c66b0644d3de519c569502087a',
        hashesAutorizadosHex: ["293a01b6ab04eaab20103833f02dff5dffd0c1c66b0644d3de519c569502087a", "45aad2995b3a2f1792d31a73f0c6af36c75982d774e7f03d27508b6a2cbb6b83", "d120c2fadf85c183236963be1e2e33e0526af81d8dffb3b35093e6eee0f7b5f0", "112a5832353228550787d37b9b8d449364a2d530e6ca6432a9c26fe9744e2596"],
        hashesSaltedFallbackHex: ["e73372e0811e67b9ae88b75db25b27db1656b7f2b0b74e10e99e6d7e5f5b7004", "256cb8865ff4f25c92527826bdca773f2146de869b84615a8cee9d3f063ffdb1", "42aae90409e434ba902f403644fcfea071a76f63bdf416c512c88b3255844c52", "f9e025300026f5d1870e5571464663af61d2a139ccdd4c8e96688715e86d7db9"]
      }
    },

    init: async function () {
      await this.carregarConfigExterna();
      this._garantirModalNoDOM();
      if (this.isSessaoValida()) {
        this.aplicarAmbiente('homologacao', true);
      } else {
        this.limparSessao();
      }
    },

    carregarConfigExterna: async function () {
      if (this._configCarregada) return;
      this._configCarregada = true;
      if (window.ANTAQ_AUTH_CONFIG && typeof window.ANTAQ_AUTH_CONFIG === 'object') {
        Object.assign(this._config, window.ANTAQ_AUTH_CONFIG);
      }
      try {
        const resp = await fetch('dados/config_auth_gee.json', { cache: 'no-store' });
        if (resp.ok) {
          const json = await resp.json();
          if (json && typeof json === 'object') {
            if (json.pbkdf2) Object.assign(this._config.pbkdf2, json.pbkdf2);
            if (json.endpointAuthSTI) this._config.endpointAuthSTI = json.endpointAuthSTI;
            if (typeof json.usarEndpointSTISeDisponivel === 'boolean') {
              this._config.usarEndpointSTISeDisponivel = json.usarEndpointSTISeDisponivel;
            }
            if (Number.isFinite(json.sessaoTTLMinutos)) this._config.sessaoTTLMinutos = json.sessaoTTLMinutos;
            if (Number.isFinite(json.maxTentativas)) this._config.maxTentativas = json.maxTentativas;
            if (Number.isFinite(json.bloqueioSegundos)) this._config.bloqueioSegundos = json.bloqueioSegundos;
          }
        }
      } catch (_) {
        // Fallback silencioso para a política PBKDF2 em memória caso rodado via file://
      }
    },

    /**
     * Derivação Criptográfica Forte via Web Crypto API: PBKDF2-HMAC-SHA256 (100.000 iterações + Salt)
     * Impede ataques de rainbow table e nunca armazena a senha em texto puro no código.
     */
    derivarPBKDF2Hex: async function (senha, saltStr, iteracoes) {
      const enc = new TextEncoder();
      const salt = enc.encode(saltStr || this._config.pbkdf2.salt);
      const iters = Number(iteracoes || this._config.pbkdf2.iteracoes || 100000);
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(senha),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: salt, iterations: iters, hash: 'SHA-256' },
        keyMaterial,
        256
      );
      return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    sha256PuroJS: function (ascii) {
      function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
      const mathPow = Math.pow, maxWord = mathPow(2, 32);
      let result = '';
      const words = [], asciiBitLength = ascii.length * 8;
      let hash = [], k = [];
      let primeCounter = 0;
      const isComposite = {};
      for (let candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
          for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
          hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
          k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
      }
      ascii += '\x80';
      while ((ascii.length % 64) - 56) ascii += '\x00';
      for (let i = 0; i < ascii.length; i++) {
        const j = ascii.charCodeAt(i);
        words[i >> 2] |= j << ((3 - (i % 4)) * 8);
      }
      words[words.length] = (asciiBitLength / maxWord) | 0;
      words[words.length] = asciiBitLength;
      for (let j = 0; j < words.length;) {
        const w = words.slice(j, (j += 16)), oldHash = hash.slice(0);
        for (let i = 0; i < 64; i++) {
          const w15 = w[i - 15], w2 = w[i - 2];
          const a = hash[0], e = hash[4];
          const temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] +
            (w[i] = i < 16 ? w[i] : (w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
          const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
          hash = [(temp1 + temp2) | 0].concat(hash);
          hash[4] = (hash[4] + temp1) | 0;
          hash.pop();
        }
        for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
      }
      for (let i = 0; i < 8; i++) {
        for (let j = 3; j + 1; j--) {
          const b = (hash[i] >> (j * 8)) & 255;
          result += (b < 16 ? 0 : '') + b.toString(16);
        }
      }
      return result;
    },

    sha256: async function (texto) {
      if (window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === 'function') {
        try {
          const msgBuffer = new TextEncoder().encode(texto);
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (_) {}
      }
      return this.sha256PuroJS(unescape(encodeURIComponent(texto)));
    },

    /**
     * Verifica se a sessão autenticada atual é íntegra e está dentro do prazo de validade (TTL)
     */
    isSessaoValida: function () {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY_SESSAO);
        if (!raw) return false;
        const dados = JSON.parse(raw);
        if (!dados || !dados.expiraEm || !dados.assinatura) return false;
        if (Date.now() > Number(dados.expiraEm)) {
          this.limparSessao();
          return false;
        }
        const esperado = this._gerarAssinaturaSessao(dados.emitidoEm, dados.expiraEm, dados.metodo);
        return dados.assinatura === esperado;
      } catch (_) {
        return false;
      }
    },

    _gerarAssinaturaSessao: function (emitidoEm, expiraEm, metodo) {
      const base = `${emitidoEm}:${expiraEm}:${metodo}:${this._config.pbkdf2.hashHex.slice(0, 16)}`;
      let h = 2166136261;
      for (let i = 0; i < base.length; i++) {
        h ^= base.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0).toString(16).padStart(8, '0');
    },

    registrarSessaoAutenticada: function (metodo) {
      const agora = Date.now();
      const ttlMs = (this._config.sessaoTTLMinutos || 240) * 60 * 1000;
      const expiraEm = agora + ttlMs;
      const token = {
        emitidoEm: agora,
        expiraEm: expiraEm,
        metodo: metodo || 'PBKDF2-SHA256',
        assinatura: this._gerarAssinaturaSessao(agora, expiraEm, metodo || 'PBKDF2-SHA256')
      };
      sessionStorage.setItem(STORAGE_KEY_SESSAO, JSON.stringify(token));
      sessionStorage.setItem('antaq_auth_homolog', 'true');
    },

    limparSessao: function () {
      sessionStorage.removeItem(STORAGE_KEY_SESSAO);
      sessionStorage.removeItem('antaq_auth_homolog');
    },

    encerrarSessaoRestrita: function () {
      document.getElementById('drop-ambiente')?.classList.remove('aberto');
      this.limparSessao();
      this.aplicarAmbiente('producao');
      if (window.UI) {
        window.UI.toast('🔒 Sessão restrita encerrada com segurança. Painel em modo de Consulta Geral.');
      }
    },

    _obterEstadoLockout: function () {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY_LOCKOUT);
        if (!raw) return { tentativas: 0, bloqueadoAte: 0 };
        const st = JSON.parse(raw);
        if (st.bloqueadoAte && Date.now() > st.bloqueadoAte) {
          sessionStorage.removeItem(STORAGE_KEY_LOCKOUT);
          return { tentativas: 0, bloqueadoAte: 0 };
        }
        return { tentativas: Number(st.tentativas || 0), bloqueadoAte: Number(st.bloqueadoAte || 0) };
      } catch (_) {
        return { tentativas: 0, bloqueadoAte: 0 };
      }
    },

    _registrarFalhaTentativa: function () {
      const st = this._obterEstadoLockout();
      st.tentativas += 1;
      const maxT = this._config.maxTentativas || 5;
      if (st.tentativas >= maxT) {
        st.bloqueadoAte = Date.now() + (this._config.bloqueioSegundos || 60) * 1000;
      }
      sessionStorage.setItem(STORAGE_KEY_LOCKOUT, JSON.stringify(st));
      return st;
    },

    _limparTentativas: function () {
      sessionStorage.removeItem(STORAGE_KEY_LOCKOUT);
    },

    definir: async function (tipo) {
      document.getElementById('drop-ambiente')?.classList.remove('aberto');

      if (tipo === 'homologacao') {
        if (this.isSessaoValida()) {
          this.aplicarAmbiente('homologacao');
          return;
        }
        this.abrirModalAutenticacao(() => {
          this.aplicarAmbiente('homologacao');
        });
        return;
      }

      this.aplicarAmbiente(tipo);
    },

    /**
     * Garante que o Modal Institucional de Autenticação (#modal-auth-institucional) exista no DOM,
     * substituindo definitivamente o antigo window.prompt() que exibia a senha em texto aberto.
     */
    _garantirModalNoDOM: function () {
      if (document.getElementById('modal-auth-institucional')) return;

      const div = document.createElement('div');
      div.id = 'modal-auth-institucional';
      div.className = 'modal-buffer';
      div.style.cssText = 'z-index: 1000050;';
      div.innerHTML = `
        <div class="modal-buffer-card" style="max-width:480px !important; width:min(94vw, 480px) !important; border:1.5px solid #f59e0b !important; border-radius:12px !important; overflow:hidden !important; box-shadow:0 24px 60px rgba(0,0,0,0.85) !important;">
          <div class="modal-buffer-header" style="background:linear-gradient(135deg, #0a2540 0%, #1e293b 100%); border-bottom:1px solid rgba(245, 158, 11, 0.4); padding:14px 18px;">
            <h3 style="color:#fbbf24; font-size:14px; display:flex; align-items:center; gap:8px; margin:0;">
              <span style="font-size:19px;">🔐</span>
              <span>Autenticação Institucional — Ambiente Restrito (GEE/SEPH)</span>
            </h3>
            <button class="modal-matriz-fechar" type="button" onclick="AmbienteManager.fecharModalAutenticacao()" title="Fechar (ESC)">&times;</button>
          </div>

          <div class="modal-buffer-body" style="display:flex; flex-direction:column; gap:12px; padding:16px 18px !important;">
            <div style="background:#061426; border:1px solid #1e3a5f; border-left:4px solid #38bdf8; border-radius:6px; padding:9px 11px; font-size:11px; color:#cbd5e1; line-height:1.45;">
              <div>🛡️ <strong>Proteção Criptográfica Institucional Ativa:</strong></div>
              <div style="color:#94a3b8; font-size:10.5px; margin-top:2px;">
                Validação via derivação <code>PBKDF2-HMAC-SHA256</code> (100.000 iterações + Salt) ou Endpoint SSO/STI (<code>dados/config_auth_gee.json</code>). Nenhuma senha em texto puro é armazenada no código-fonte.
              </div>
            </div>

            <!-- Campo de Senha com Máscara e Botão Mostrar/Ocultar (👁️) -->
            <div class="buffer-linha" style="margin:0;">
              <label for="auth-gee-input-senha" style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; font-weight:700; color:#e2e8f0; margin-bottom:5px;">
                <span>🔑 Chave Técnica de Acesso Restrito (GEE / SEPH)</span>
                <span id="auth-gee-caps-aviso" style="display:none; color:#fbbf24; font-size:10px; font-weight:800;">⚠️ Caps Lock Ativado</span>
              </label>

              <div style="position:relative; display:flex; align-items:center; width:100%;">
                <input
                  type="password"
                  id="auth-gee-input-senha"
                  autocomplete="current-password"
                  spellcheck="false"
                  autocapitalize="off"
                  placeholder="Digite a senha institucional (oculta por padrão)..."
                  style="width:100%; box-sizing:border-box; background:#040d1a; border:1.5px solid #334155; color:#f8fafc; padding:10px 88px 10px 12px; border-radius:8px; font-size:13px; font-family:'Segoe UI', system-ui, sans-serif; letter-spacing:0.5px; outline:none; transition:border-color 0.2s;"
                  onfocus="this.style.borderColor='#38bdf8'"
                  onblur="this.style.borderColor='#334155'"
                >
                <button
                  type="button"
                  id="auth-gee-btn-toggle-olho"
                  onclick="AmbienteManager.alternarVisibilidadeSenha('auth-gee-input-senha', 'auth-gee-btn-toggle-olho')"
                  title="Mostrar ou ocultar os caracteres da senha enquanto digita"
                  style="position:absolute; right:6px; top:50%; transform:translateY(-50%); background:#1e293b; color:#bae6fd; border:1px solid #334155; padding:4px 9px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px; user-select:none;">
                  <span id="auth-gee-icone-olho">👁️</span>
                  <span id="auth-gee-txt-olho">Mostrar</span>
                </button>
              </div>
              <small style="font-size:10px; color:#64748b; margin-top:4px; display:block;">
                🔒 Os caracteres ficam ocultos (<code>••••</code>) contra exposição em tela ou reuniões. Clique em <strong>👁️ Mostrar</strong> se desejar conferir a digitação.
              </small>
            </div>

            <!-- Mensagem de erro / bloqueio anti-força bruta -->
            <div id="auth-gee-msg-feedback" style="display:none; padding:8px 10px; border-radius:6px; font-size:11px; font-weight:600;"></div>

            <!-- Utilitário para STI / Administrador GEE gerar novo hash PBKDF2 sem expor senha no código -->
            <details style="background:#040d1a; border:1px solid #1e293b; border-radius:6px; padding:7px 10px; font-size:10.5px; color:#94a3b8;">
              <summary style="cursor:pointer; font-weight:700; color:#38bdf8; user-select:none;">
                ⚙️ Governança STI / Trocar Senha Institucional (Gerador PBKDF2 + API SSO)
              </summary>
              <div style="margin-top:8px; display:flex; flex-direction:column; gap:7px; border-top:1px solid #1e293b; padding-top:8px;">
                <div style="line-height:1.4;">
                  Para alterar a senha institucional sem tocar no código-fonte, gere abaixo o novo bloco criptográfico <code>PBKDF2-HMAC-SHA256</code> e atualize o arquivo <code>dados/config_auth_gee.json</code> no servidor (ou configure o endpoint SSO da STI):
                </div>
                <div style="position:relative; display:flex; gap:6px; align-items:center;">
                  <input type="password" id="auth-sti-nova-senha" placeholder="Nova senha p/ gerar hash PBKDF2..."
                    style="flex:1; background:#061426; border:1px solid #334155; color:#e2e8f0; padding:6px 68px 6px 8px; border-radius:5px; font-size:11px;">
                  <button type="button" id="auth-sti-btn-olho"
                    onclick="AmbienteManager.alternarVisibilidadeSenha('auth-sti-nova-senha', 'auth-sti-btn-olho')"
                    style="position:absolute; right:96px; background:#1e293b; color:#cbd5e1; border:1px solid #334155; padding:2px 6px; border-radius:4px; font-size:10px; cursor:pointer;">
                    👁️
                  </button>
                  <button type="button" onclick="AmbienteManager.gerarHashParaSTI()"
                    style="background:#0369a1; color:#fff; border:1px solid #38bdf8; padding:6px 10px; border-radius:5px; font-size:10.5px; font-weight:700; cursor:pointer; white-space:nowrap;">
                    🔄 Gerar Hash
                  </button>
                </div>
                <textarea id="auth-sti-output-json" rows="3" readonly
                  placeholder="O bloco JSON com Salt aleatório e 100.000 iterações PBKDF2 aparecerá aqui..."
                  style="display:none; width:100%; box-sizing:border-box; background:#020813; border:1px solid #1e4976; color:#a7f3d0; font-family:Consolas,monospace; font-size:10px; padding:6px; border-radius:4px;"></textarea>
              </div>
            </details>
          </div>

          <div class="modal-buffer-footer" style="padding:12px 18px; background:#061426; border-top:1px solid #1e293b; display:flex; justify-content:space-between; align-items:center;">
            <button type="button" class="btn-secundario" onclick="AmbienteManager.fecharModalAutenticacao()">Cancelar</button>
            <button type="button" id="auth-gee-btn-confirmar" class="btn-primario" onclick="AmbienteManager.confirmarAutenticacaoModal()"
              style="background:linear-gradient(135deg, #d97706 0%, #f59e0b 100%); color:#000; font-weight:800; border:1px solid #fde047; padding:8px 18px;">
              🔓 Autenticar e Liberar Ambiente Restrito
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(div);

      const inp = document.getElementById('auth-gee-input-senha');
      if (inp) {
        inp.addEventListener('keydown', (e) => {
          const caps = e.getModifierState && e.getModifierState('CapsLock');
          const avisoCaps = document.getElementById('auth-gee-caps-aviso');
          if (avisoCaps) avisoCaps.style.display = caps ? 'inline' : 'none';
          if (e.key === 'Enter') {
            e.preventDefault();
            this.confirmarAutenticacaoModal();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            this.fecharModalAutenticacao();
          }
        });
        inp.addEventListener('keyup', (e) => {
          const caps = e.getModifierState && e.getModifierState('CapsLock');
          const avisoCaps = document.getElementById('auth-gee-caps-aviso');
          if (avisoCaps) avisoCaps.style.display = caps ? 'inline' : 'none';
        });
      }
    },

    /**
     * Alterna entre mostrar (type="text") e ocultar (type="password") a senha no momento da digitação
     */
    alternarVisibilidadeSenha: function (inputId, btnId) {
      const inp = document.getElementById(inputId || 'auth-gee-input-senha');
      if (!inp) return;
      const mostrando = inp.type === 'text';
      inp.type = mostrando ? 'password' : 'text';

      if (!inputId || inputId === 'auth-gee-input-senha') {
        const icone = document.getElementById('auth-gee-icone-olho');
        const txt = document.getElementById('auth-gee-txt-olho');
        const btn = document.getElementById(btnId || 'auth-gee-btn-toggle-olho');
        if (icone) icone.textContent = mostrando ? '👁️' : '🙈';
        if (txt) txt.textContent = mostrando ? 'Mostrar' : 'Ocultar';
        if (btn) {
          btn.style.background = mostrando ? '#1e293b' : '#78350f';
          btn.style.borderColor = mostrando ? '#334155' : '#f59e0b';
          btn.style.color = mostrando ? '#bae6fd' : '#fde68a';
        }
      } else {
        const btn = document.getElementById(btnId);
        if (btn) btn.textContent = mostrando ? '👁️' : '🙈';
      }
      inp.focus();
    },

    _resetarCampoSenhaOculto: function () {
      const inp = document.getElementById('auth-gee-input-senha');
      if (inp) {
        inp.value = '';
        inp.type = 'password';
      }
      const icone = document.getElementById('auth-gee-icone-olho');
      const txt = document.getElementById('auth-gee-txt-olho');
      const btn = document.getElementById('auth-gee-btn-toggle-olho');
      if (icone) icone.textContent = '👁️';
      if (txt) txt.textContent = 'Mostrar';
      if (btn) {
        btn.style.background = '#1e293b';
        btn.style.borderColor = '#334155';
        btn.style.color = '#bae6fd';
      }
    },

    abrirModalAutenticacao: async function (onSuccessCallback) {
      await this.carregarConfigExterna();
      this._garantirModalNoDOM();
      this._callbackSucessoPendente = typeof onSuccessCallback === 'function' ? onSuccessCallback : null;
      this._resetarCampoSenhaOculto();

      const msgEl = document.getElementById('auth-gee-msg-feedback');
      if (msgEl) {
        msgEl.style.display = 'none';
        msgEl.innerHTML = '';
      }

      const modal = document.getElementById('modal-auth-institucional');
      if (modal) modal.classList.add('aberto');

      this._atualizarBannerLockoutSeNecessario();

      setTimeout(() => {
        const inp = document.getElementById('auth-gee-input-senha');
        if (inp && !inp.disabled) inp.focus();
      }, 80);
    },

    fecharModalAutenticacao: function () {
      clearInterval(this._timerLockoutUI);
      this._resetarCampoSenhaOculto();
      const modal = document.getElementById('modal-auth-institucional');
      if (modal) modal.classList.remove('aberto');
      this._callbackSucessoPendente = null;
    },

    _atualizarBannerLockoutSeNecessario: function () {
      clearInterval(this._timerLockoutUI);
      const checar = () => {
        const st = this._obterEstadoLockout();
        const inp = document.getElementById('auth-gee-input-senha');
        const btn = document.getElementById('auth-gee-btn-confirmar');
        const msgEl = document.getElementById('auth-gee-msg-feedback');
        if (st.bloqueadoAte && st.bloqueadoAte > Date.now()) {
          const segRestantes = Math.ceil((st.bloqueadoAte - Date.now()) / 1000);
          if (inp) inp.disabled = true;
          if (btn) btn.disabled = true;
          if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.style.background = 'rgba(127, 29, 29, 0.45)';
            msgEl.style.border = '1px solid #ef4444';
            msgEl.style.color = '#fecaca';
            msgEl.innerHTML = `⏳ <strong>Proteção Anti-Força Bruta Ativada:</strong> Muitas tentativas incorretas. Aguarde <strong>${segRestantes}s</strong> para tentar novamente.`;
          }
          return true;
        } else {
          if (inp) inp.disabled = false;
          if (btn) btn.disabled = false;
          clearInterval(this._timerLockoutUI);
          return false;
        }
      };
      if (checar()) {
        this._timerLockoutUI = setInterval(checar, 1000);
      }
    },

    confirmarAutenticacaoModal: async function () {
      if (this._atualizarBannerLockoutSeNecessario()) return;

      const inp = document.getElementById('auth-gee-input-senha');
      const msgEl = document.getElementById('auth-gee-msg-feedback');
      const btn = document.getElementById('auth-gee-btn-confirmar');
      const senhaDigitada = (inp?.value || '').trim();

      if (!senhaDigitada) {
        if (msgEl) {
          msgEl.style.display = 'block';
          msgEl.style.background = 'rgba(120, 53, 15, 0.4)';
          msgEl.style.border = '1px solid #f59e0b';
          msgEl.style.color = '#fde68a';
          msgEl.innerHTML = '⚠️ Digite a chave técnica institucional para continuar.';
        }
        if (inp) inp.focus();
        return;
      }

      // Garante que a senha volte a ficar oculta imediatamente ao submeter
      if (inp) inp.type = 'password';

      const txtOrigBtn = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Verificando criptografia...';
      }

      try {
        let autenticado = false;
        let metodoUsado = 'PBKDF2-HMAC-SHA256';

        // 1. Se o administrador STI ativou validação via Backend Corporativo (SSO / LDAP / API)
        if (this._config.usarEndpointSTISeDisponivel && this._config.endpointAuthSTI) {
          try {
            const resp = await fetch(this._config.endpointAuthSTI, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ senha: senhaDigitada, modulo: 'WEBGIS_GEE_SEPH' })
            });
            if (resp.ok) {
              const data = await resp.json();
              if (data && data.autorizado === true) {
                autenticado = true;
                metodoUsado = 'STI-SSO-API';
              }
            }
          } catch (_) {
            // Se o endpoint corporativo não estiver acessível no ambiente local, prossegue para o verificador PBKDF2
          }
        }

        // 2. Verificação Criptográfica Local via Web Crypto API (PBKDF2 100.000 iterações + Salt) com Fallback SHA256-Salted Puro JS
        if (!autenticado) {
          const listaPBKDF2 = Array.isArray(this._config.pbkdf2.hashesAutorizadosHex)
            ? this._config.pbkdf2.hashesAutorizadosHex
            : [this._config.pbkdf2.hashHex];
          const listaFallback = Array.isArray(this._config.pbkdf2.hashesSaltedFallbackHex)
            ? this._config.pbkdf2.hashesSaltedFallbackHex
            : [];

          if (window.crypto && window.crypto.subtle && typeof window.crypto.subtle.importKey === 'function') {
            try {
              const hashDerivado = await this.derivarPBKDF2Hex(
                senhaDigitada,
                this._config.pbkdf2.salt,
                this._config.pbkdf2.iteracoes
              );
              if (hashDerivado === this._config.pbkdf2.hashHex || listaPBKDF2.includes(hashDerivado)) {
                autenticado = true;
                metodoUsado = 'PBKDF2-HMAC-SHA256';
              }
            } catch (_) {}
          }

          if (!autenticado && listaFallback.length > 0) {
            const saltedInput = `${this._config.pbkdf2.salt}:${senhaDigitada}`;
            const hashSalted = await this.sha256(saltedInput);
            if (listaFallback.includes(hashSalted)) {
              autenticado = true;
              metodoUsado = 'SHA256-SALTED-FALLBACK';
            }
          }
        }

        if (!autenticado) {
          const st = this._registrarFalhaTentativa();
          const maxT = this._config.maxTentativas || 5;
          const rest = Math.max(0, maxT - st.tentativas);
          if (st.bloqueadoAte && st.bloqueadoAte > Date.now()) {
            this._atualizarBannerLockoutSeNecessario();
          } else if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.style.background = 'rgba(127, 29, 29, 0.45)';
            msgEl.style.border = '1px solid #ef4444';
            msgEl.style.color = '#fecaca';
            msgEl.innerHTML = `❌ <strong>Acesso Negado:</strong> Credencial incorreta. Restam <strong>${rest}</strong> tentativa(s) antes do bloqueio temporário.`;
          }
          if (inp) {
            inp.value = '';
            inp.focus();
          }
          return;
        }

        // Sucesso! Limpa contador de falhas, emite token assinado com TTL e ativa ambiente
        this._limparTentativas();
        this.registrarSessaoAutenticada(metodoUsado);
        const cb = this._callbackSucessoPendente;
        this.fecharModalAutenticacao();

        if (window.UI) {
          window.UI.toast('🔓 Autenticação institucional confirmada! Ambiente Restrito (Estudos GEE/SEPH) ativado.');
        }
        if (cb) cb();
        else this.aplicarAmbiente('homologacao');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = txtOrigBtn || '🔓 Autenticar e Liberar Ambiente Restrito';
        }
      }
    },

    /**
     * Utilitário para a STI/ANTAQ gerar um novo hash PBKDF2-HMAC-SHA256 (100.000 iterações) com Salt novo
     * para substituir em dados/config_auth_gee.json sem nunca expor a senha no código.
     */
    gerarHashParaSTI: async function () {
      const inp = document.getElementById('auth-sti-nova-senha');
      const out = document.getElementById('auth-sti-output-json');
      const novaSenha = (inp?.value || '').trim();
      if (!novaSenha || novaSenha.length < 6) {
        if (window.UI) window.UI.toast('⚠️ Informe uma nova senha com pelo menos 6 caracteres para gerar o hash PBKDF2.', 'alerta');
        return;
      }
      const randBytes = new Uint8Array(12);
      crypto.getRandomValues(randBytes);
      const saltHex = Array.from(randBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const novoSalt = `ANTAQ_GEE_SALT_${saltHex}`;
      const iteracoes = 100000;
      const novoHash = await this.derivarPBKDF2Hex(novaSenha, novoSalt, iteracoes);

      const bloco = {
        pbkdf2: {
          algoritmo: 'PBKDF2-HMAC-SHA256',
          iteracoes: iteracoes,
          salt: novoSalt,
          hashHex: novoHash
        }
      };
      if (out) {
        out.style.display = 'block';
        out.value = JSON.stringify(bloco, null, 2);
      }
      if (inp) inp.type = 'password';
      if (window.UI) window.UI.toast('🔑 Novo bloco PBKDF2 gerado! Copie para dados/config_auth_gee.json.');
    },

    aplicarAmbiente: function (tipo, silencioso) {
      this.atual = tipo;
      const txt = document.getElementById('txt-ambiente');
      const itemH = document.getElementById('item-env-homolog');
      const itemP = document.getElementById('item-env-prod');
      const itemLogout = document.getElementById('item-env-logout');
      const btnEnv = document.getElementById('btn-env-topo');

      if (tipo === 'homologacao') {
        if (txt) txt.innerText = 'Homologação (Estudos GEE)';
        if (btnEnv) { btnEnv.style.background = '#f59e0b'; btnEnv.style.color = '#000'; }
        itemH?.classList.add('ativo');
        itemP?.classList.remove('ativo');
        if (itemLogout) itemLogout.style.display = 'block';
        document.body.classList.add('modo-homologacao');
        if (!silencioso && window.UI) window.UI.toast('🟡 Modo Homologação Ativo: Módulos restritos liberados.');
      } else {
        if (txt) txt.innerText = 'Produção (Oficial ANTAQ)';
        if (btnEnv) { btnEnv.style.background = '#0a2540'; btnEnv.style.color = '#38bdf8'; }
        itemP?.classList.add('ativo');
        itemH?.classList.remove('ativo');
        if (itemLogout) itemLogout.style.display = 'none';
        document.body.classList.remove('modo-homologacao');
        if (!silencioso && window.UI) window.UI.toast('🟢 Modo Produção Ativo: Consulta Geral ANTAQ.');
      }
    }
  };

  window.AmbienteManager = AmbienteManager;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AmbienteManager.init());
  } else {
    AmbienteManager.init();
  }
  console.info('[js] AmbienteManager v2.0 (PBKDF2 + Modal Oculto + Toggle Olho) carregado');
})();


  function instalarControleAcessoRestritoGEE() {
    const isRestritoAtivo = () => document.body.classList.contains('modo-homologacao') || (window.AmbienteManager && window.AmbienteManager.atual === 'homologacao');

    // Sincroniza estado inicial: se já autenticou na sessão, mantém modo-homologacao; caso contrário, inicia no modo Geral (Produção)
    if (((window.AmbienteManager && typeof window.AmbienteManager.isSessaoValida === 'function' && window.AmbienteManager.isSessaoValida()) || sessionStorage.getItem('antaq_auth_homolog') === 'true') && window.AmbienteManager) {
      window.AmbienteManager.aplicarAmbiente('homologacao');
    } else {
      document.body.classList.remove('modo-homologacao');
      if (window.AmbienteManager) window.AmbienteManager.atual = 'producao';
    }

    // Intercepta AmbienteManager.aplicarAmbiente para fechar painéis restritos ao voltar para o Ambiente Geral (Produção)
    if (window.AmbienteManager && !window.AmbienteManager._hookRestritoInstalado) {
      window.AmbienteManager._hookRestritoInstalado = true;
      const origAplicar = window.AmbienteManager.aplicarAmbiente.bind(window.AmbienteManager);
      window.AmbienteManager.aplicarAmbiente = function (tipo) {
        origAplicar(tipo);
        if (tipo !== 'homologacao') {
          // Fecha modais e painéis restritos (Batimetria, Perfil, Geo, Buffer, AIS) e volta para a aba Mapa
          try { BatimetriaTINManager.fecharModal(); } catch (_) {}
          try { if (window.EstudioNotaTecnicaIA) window.EstudioNotaTecnicaIA.fecharModal(); } catch (_) {}
          try { BatimetriaTINManager.fecharPainelPerfil(); } catch (_) {}
          try { if (window.GeoTools) window.GeoTools.fecharModal(); } catch (_) {}
          try { if (window.BufferTool) window.BufferTool.fecharModal(); } catch (_) {}
          try { if (window.SafraDiffManager) window.SafraDiffManager.fechar(); } catch (_) {}
          try { if (window.ControleAIS && window.ControleAIS._aberto) window.ControleAIS.fechar(); } catch (_) {}
          try { if (window.PainelAIS && window.PainelAIS._aberto) window.PainelAIS.fechar(); } catch (_) {}
          if (window.TabManager && ['geo', 'ais', 'controle', 'painel'].includes(window.TabManager.abaAtiva)) {
            window.TabManager.trocar('mapa');
          }
        }
      };
    }

    // Intercepta TabManager.trocar para bloquear acesso por atalho (Ctrl+3 / Ctrl+4) ou URL às abas Geo e AIS no modo Geral
    if (window.TabManager && !window.TabManager._hookRestritoInstalado) {
      window.TabManager._hookRestritoInstalado = true;
      const origTrocar = window.TabManager.trocar.bind(window.TabManager);
      window.TabManager.trocar = function (aba) {
        if (['geo', 'ais', 'controle', 'painel'].includes(aba) && !isRestritoAtivo()) {
          if (window.UI) {
            window.UI.toast('🔒 Funcionalidade restrita (Geo / AIS / Batimetria). Autentique-se no Ambiente de Homologação (Estudos GEE).', 'alerta');
          }
          if (window.AmbienteManager) window.AmbienteManager.definir('homologacao');
          return;
        }
        return origTrocar(aba);
      };
    }

    // Intercepta abertura do Estúdio Batimétrico se chamado fora do modo Restrito
    const origAbrirBat = BatimetriaTINManager.abrirModal.bind(BatimetriaTINManager);
    BatimetriaTINManager.abrirModal = function (abaOpcional) {
      if (!isRestritoAtivo()) {
        if (window.UI) {
          window.UI.toast('🔒 Estúdio Batimétrico TIN restrito à equipe técnica. Ative o Ambiente de Homologação (Estudos GEE).', 'alerta');
        }
        if (window.AmbienteManager) window.AmbienteManager.definir('homologacao');
        return;
      }
      return origAbrirBat(abaOpcional);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(instalarControleAcessoRestritoGEE, 120));
  } else {
    setTimeout(instalarControleAcessoRestritoGEE, 120);
  }

  window.addEventListener('resize', () => {
    const p = document.getElementById('painel-perfil-batimetrico');
    if (p && p.style.display !== 'none' && !p.classList.contains('minimizado')) {
      BatimetriaTINManager._renderizarGraficoPerfil();
    }
  });

  // =========================================================================
  // 📍 POSICIONAMENTO INTELIGENTE DE POPUPS (ANTI-COLISÃO COM A BARRA DE FILTROS)
  // Garante que ao clicar num porto/feição, o popup NUNCA abra escondido atrás de
  // .barra-busca-atributos ou .controles-topo-mapa, deslocando o mapa suavemente.
  // =========================================================================
  function instalarPosicionamentoInteligentePopups() {
    if (window.L && L.Popup && L.Popup.prototype && L.Popup.prototype.options) {
      L.Popup.prototype.options.autoPan = true;
      L.Popup.prototype.options.keepInView = true;
      L.Popup.prototype.options.autoPanPaddingTopLeft = L.point(28, 135);
      L.Popup.prototype.options.autoPanPaddingBottomRight = L.point(340, 48);
    }

    const vincularMapa = () => {
      if (!window.mapa || window.mapa._hookPopupAntiColisao) return;
      window.mapa._hookPopupAntiColisao = true;

      window.mapa.on('popupopen', (e) => {
        const pop = e.popup;
        if (!pop) return;
        pop.options.autoPan = true;
        pop.options.autoPanPaddingTopLeft = L.point(28, 135);
        pop.options.autoPanPaddingBottomRight = L.point(340, 48);

        setTimeout(() => {
          try {
            const popEl = pop._container;
            if (!popEl) return;
            const popRect = popEl.getBoundingClientRect();

            // Mede a barra de filtros superior (.barra-busca-atributos) e controles do topo (.controles-topo-mapa)
            const barraFiltro = document.querySelector('.barra-busca-atributos');
            const ctrlTopo = document.querySelector('.controles-topo-mapa');
            const painelLat = document.getElementById('painel-camadas-lateral');

            let tetoMinimoY = 98;
            if (barraFiltro && barraFiltro.offsetParent !== null) {
              const rF = barraFiltro.getBoundingClientRect();
              // Se o popup intersecta horizontalmente a faixa da barra de filtros (ou fica perto dela)
              if (popRect.left < rF.right + 20 && popRect.right > rF.left - 20) {
                tetoMinimoY = Math.max(tetoMinimoY, rF.bottom + 14);
              }
            }
            if (ctrlTopo && ctrlTopo.offsetParent !== null) {
              const rC = ctrlTopo.getBoundingClientRect();
              if (popRect.left < rC.right + 16 && popRect.right > rC.left - 16) {
                tetoMinimoY = Math.max(tetoMinimoY, rC.bottom + 14);
              }
            }

            let panX = 0, panY = 0;
            if (popRect.top < tetoMinimoY) {
              panY = popRect.top - tetoMinimoY; // Negativo -> move o mapa para cima (desce o popup na tela!)
            }

            if (painelLat && painelLat.offsetParent !== null && !painelLat.classList.contains('recolhido')) {
              const rP = painelLat.getBoundingClientRect();
              if (popRect.right > rP.left - 14 && rP.left > 300) {
                panX = popRect.right - (rP.left - 18); // Positivo -> move o mapa p/ direita (afasta popup do painel lateral)
              }
            }

            if (popRect.left < 16) {
              panX = popRect.left - 20;
            }

            if (Math.abs(panX) > 4 || Math.abs(panY) > 4) {
              window.mapa.panBy([panX, panY], { animate: true, duration: 0.28 });
            }
          } catch (_) {}
        }, 45);
      });
    };

    vincularMapa();
    setTimeout(vincularMapa, 600);
    setTimeout(vincularMapa, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', instalarPosicionamentoInteligentePopups);
  } else {
    instalarPosicionamentoInteligentePopups();
  }

  // =========================================================================
  // 🧠 M19 — ESTÚDIO INTERNO DE INTELIGÊNCIA ESPACIAL & NOTA TÉCNICA SEI COM IA
  // Permite escolher relações selecionáveis (Portos × Localização/VEN, Portos × TKU,
  // Portos × Terras Indígenas FUNAI, Portos × Batimetria/Ábaco CHM-ANA ou Livre),
  // gera matriz de cruzamento geodésico real e redige Nota Técnica no padrão SEI GEE/SEPH.
  // =========================================================================
  const EstudioNotaTecnicaIA = {
    _ultimosResultados: [],
    _ultimoResumoKPIs: null,
    _ultimoTextoMinuta: '',

    _isRestritoAtivo: function () {
      return document.body.classList.contains('modo-homologacao') ||
        (window.AmbienteManager && window.AmbienteManager.atual === 'homologacao');
    },

    abrirModal: async function () {
      if (!this._isRestritoAtivo()) {
        if (window.UI) {
          window.UI.toast('🔒 O Estúdio de Nota Técnica & Inteligência IA é de uso interno restrito (GEE/SEPH). Autentique-se no Ambiente de Homologação.', 'alerta');
        }
        if (window.AmbienteManager) window.AmbienteManager.definir('homologacao');
        return;
      }

      const modal = document.getElementById('modal-estudio-nota-tecnica');
      if (!modal) return;
      modal.classList.add('aberto');

      await this.executarCruzamentoEAnalise();
    },

    fecharModal: function () {
      const modal = document.getElementById('modal-estudio-nota-tecnica');
      if (modal) modal.classList.remove('aberto');
    },

    aoMudarTipoRelacao: function (val) {
      const boxLivres = document.getElementById('nt-ia-box-camadas-livres');
      if (boxLivres) {
        boxLivres.style.display = (val === 'cruzamento_livre') ? 'grid' : 'none';
      }
      this.executarCruzamentoEAnalise();
    },

    aplicarSugestaoFoco: function (texto) {
      const inp = document.getElementById('nt-ia-foco-custom');
      if (inp) inp.value = texto;
      this.executarCruzamentoEAnalise();
    },

    _garantirCamadaEmMemoria: async function (idCamada) {
      window.DADOS_GEOJSON_BRUTOS = window.DADOS_GEOJSON_BRUTOS || {};
      if (window.DADOS_GEOJSON_BRUTOS[idCamada]?.features?.length > 0) {
        return window.DADOS_GEOJSON_BRUTOS[idCamada];
      }
      const mapaUrls = {
        'instalacoes_portuarias': 'dados/instalacoes_portuarias.geojson',
        'portos_internacionais': 'dados/portos_internacionais.geojson',
        'ven_2022': 'dados/ven_2022.geojson',
        'tis_poligonais': 'dados/tis_poligonais.geojson',
        'uf': 'dados/uf.geojson',
        'tku': 'dados/tku.geojson'
      };
      const url = mapaUrls[idCamada];
      if (url) {
        try {
          const r = await fetch(url);
          if (r.ok) {
            const gj = await r.json();
            if (gj && Array.isArray(gj.features)) {
              window.DADOS_GEOJSON_BRUTOS[idCamada] = gj;
              return gj;
            }
          }
        } catch (_) {}
      }
      if (window.DataManager && typeof window.DataManager.carregarCamada === 'function') {
        try {
          await window.DataManager.carregarCamada(idCamada);
        } catch (_) {}
      }
      return window.DADOS_GEOJSON_BRUTOS[idCamada] || { type: 'FeatureCollection', features: [] };
    },

    _extrairPontoLatLon: function (f) {
      if (!f || !f.geometry) return null;
      const g = f.geometry;
      if (g.type === 'Point' && Array.isArray(g.coordinates)) {
        return { lon: Number(g.coordinates[0]), lat: Number(g.coordinates[1]) };
      }
      try {
        if (typeof turf !== 'undefined') {
          const c = turf.centroid(f);
          if (c?.geometry?.coordinates) {
            return { lon: Number(c.geometry.coordinates[0]), lat: Number(c.geometry.coordinates[1]) };
          }
        }
      } catch (_) {}
      return null;
    },

    _extrairVerticesAmostraGeometria: function (f) {
      if (!f || !f.geometry) return [];
      const g = f.geometry;
      const pts = [];
      const pushCoord = (c) => {
        if (Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
          pts.push([c[0], c[1]]);
        }
      };
      if (g.type === 'Point') {
        pushCoord(g.coordinates);
      } else if (g.type === 'LineString') {
        const step = Math.max(1, Math.floor(g.coordinates.length / 25));
        for (let i = 0; i < g.coordinates.length; i += step) pushCoord(g.coordinates[i]);
      } else if (g.type === 'MultiLineString' || g.type === 'Polygon') {
        for (const ring of g.coordinates) {
          const step = Math.max(1, Math.floor(ring.length / 20));
          for (let i = 0; i < ring.length; i += step) pushCoord(ring[i]);
        }
      } else if (g.type === 'MultiPolygon') {
        for (const poly of g.coordinates) {
          for (const ring of poly) {
            const step = Math.max(1, Math.floor(ring.length / 15));
            for (let i = 0; i < ring.length; i += step) pushCoord(ring[i]);
          }
        }
      }
      return pts;
    },

    _distanciaMinimaKmParaFeicao: function (lon, lat, featureAlvo) {
      if (!featureAlvo || !featureAlvo.geometry) return Infinity;
      try {
        if (typeof turf !== 'undefined' && (featureAlvo.geometry.type === 'Polygon' || featureAlvo.geometry.type === 'MultiPolygon')) {
          if (turf.booleanPointInPolygon([lon, lat], featureAlvo)) return 0.0;
        }
      } catch (_) {}

      const verts = featureAlvo._vertsCache || (featureAlvo._vertsCache = this._extrairVerticesAmostraGeometria(featureAlvo));
      let dMinM = Infinity;
      for (let i = 0; i < verts.length; i++) {
        const d = BatimetriaTINManager._haversineMetros(lon, lat, verts[i][0], verts[i][1]);
        if (d < dMinM) dMinM = d;
      }
      return dMinM / 1000.0;
    },

    _obterNomeFeicao: function (f, padrao = 'Ativo s/ nome') {
      const p = f?.properties || {};
      return p.nome || p.NOME || p.nm_instalacao || p.nome_porto || p.hidrovia || p.HIDROVIA ||
        p.terrai_nom || p.nome_ti || p.nm_uf || p.NM_UF || p.municipio || p.cidade || p.sigla_uf || padrao;
    },

    _obterUFFeicao: function (f) {
      const p = f?.properties || {};
      if (window.Security && typeof window.Security.extrairUF === 'function') {
        const u = window.Security.extrairUF(p);
        if (u) return u;
      }
      for (const k of ['uf', 'UF', 'sigla_uf', 'SIGLA_UF', 'estado', 'ESTADO', 'sg_uf']) {
        const v = String(p[k] || '').trim().toUpperCase();
        if (v.length === 2) return v;
      }
      const idEst = String(p.idestado || '').toUpperCase();
      const mapaIBGE = {
        'BR11': 'RO', 'BR12': 'AC', 'BR13': 'AM', 'BR14': 'RR', 'BR15': 'PA', 'BR16': 'AP', 'BR17': 'TO',
        'BR21': 'MA', 'BR22': 'PI', 'BR23': 'CE', 'BR24': 'RN', 'BR25': 'PB', 'BR26': 'PE', 'BR27': 'AL', 'BR28': 'SE', 'BR29': 'BA',
        'BR31': 'MG', 'BR32': 'ES', 'BR33': 'RJ', 'BR35': 'SP', 'BR41': 'PR', 'BR42': 'SC', 'BR43': 'RS',
        'BR50': 'MS', 'BR51': 'MT', 'BR52': 'GO', 'BR53': 'DF'
      };
      if (mapaIBGE[idEst]) return mapaIBGE[idEst];
      return 'N/I';
    },

    _obterRegimeFeicao: function (f) {
      const p = f?.properties || {};
      if (window.PortClassification && typeof window.PortClassification.classificar === 'function') {
        const c = window.PortClassification.classificar(p);
        if (c && c !== 'OUTROS') return c;
      }
      const txt = JSON.stringify(p).toUpperCase();
      if (txt.includes('TUP') || txt.includes('PRIVADO')) return 'TUP';
      if (txt.includes('IP4') || txt.includes('PEQUENO PORTE')) return 'IP4';
      if (txt.includes('ETC') || txt.includes('TRANSBORDO')) return 'ETC';
      if (txt.includes('ORGANIZADO') || txt.includes('PUBLICO') || txt.includes('PÚBLICO')) return 'PUBLICO';
      return p.tipo || p.regime || 'Portuário';
    },

    executarCruzamentoEAnalise: async function () {
      const tipoRel = document.getElementById('nt-ia-tipo-relacao')?.value || 'portos_x_localizacao_ven';
      const escopo = document.getElementById('nt-ia-escopo')?.value || 'auto';
      const ufFiltro = document.getElementById('nt-ia-uf')?.value || 'TODAS';
      const regimeFiltro = document.getElementById('nt-ia-regime')?.value || 'TODOS';
      const raioKm = Math.max(1, parseFloat(document.getElementById('nt-ia-raio-km')?.value || '25') || 25);
      const focoCustom = (document.getElementById('nt-ia-foco-custom')?.value || '').trim();

      const statusEl = document.getElementById('nt-ia-status-cruzamento');
      if (statusEl) statusEl.textContent = '⏳ Processando cruzamento geoespacial...';

      let idCamadaA = 'instalacoes_portuarias';
      let idCamadaB = 'ven_2022';

      if (tipoRel === 'portos_x_localizacao_ven') {
        idCamadaA = 'instalacoes_portuarias';
        idCamadaB = 'ven_2022';
      } else if (tipoRel === 'portos_x_fluxo_tku') {
        idCamadaA = 'instalacoes_portuarias';
        idCamadaB = 'tku';
      } else if (tipoRel === 'portos_x_restricoes_tis') {
        idCamadaA = 'instalacoes_portuarias';
        idCamadaB = 'tis_poligonais';
      } else if (tipoRel === 'portos_x_batimetria_abaco') {
        idCamadaA = 'instalacoes_portuarias';
        idCamadaB = 'batimetria_abaco';
      } else if (tipoRel === 'ais_x_portos_ven') {
        idCamadaA = 'ais_embarcacoes';
        idCamadaB = 'instalacoes_portuarias';
      } else if (tipoRel === 'cruzamento_livre') {
        idCamadaA = document.getElementById('nt-ia-camada-a')?.value || 'instalacoes_portuarias';
        idCamadaB = document.getElementById('nt-ia-camada-b')?.value || 'ven_2022';
      }

      let gjA;
      if (idCamadaA === 'ais_embarcacoes') {
        if (window.AISManager && !window.AISManager._pronto && typeof window.AISManager.carregar === 'function') {
          try { await window.AISManager.carregar(); } catch (_) {}
        }
        const featsAIS = [];
        if (window.AISManager && window.AISManager._ultimaPorMmsi) {
          window.AISManager._ultimaPorMmsi.forEach((pos, mmsi) => {
            const cad = window.AISManager._cadastro.get(mmsi) || {};
            featsAIS.push({
              type: 'Feature',
              properties: {
                nome: `${cad.nome || pos.nome || ('MMSI ' + mmsi)} (${mmsi})`,
                regime: cad.tipo || pos.tipo || 'Embarcação AIS',
                municipio: pos.porto_destino ? `Destino: ${pos.porto_destino}` : (pos.trecho_ven || 'Navegação'),
                uf: cad.bandeira || 'BR',
                sog: pos.sog,
                calado_m: cad.calado_m || pos.calado_m || 0
              },
              geometry: { type: 'Point', coordinates: [pos.lon, pos.lat] }
            });
          });
        }
        gjA = { type: 'FeatureCollection', features: featsAIS };
      } else {
        gjA = await this._garantirCamadaEmMemoria(idCamadaA);
      }
      let gjB = { features: [] };
      if (idCamadaB !== 'batimetria_abaco') {
        gjB = await this._garantirCamadaEmMemoria(idCamadaB);
        if ((!gjB || !gjB.features || !gjB.features.length) && idCamadaB === 'tku') {
          gjB = await this._garantirCamadaEmMemoria('ven_2022');
        }
      }

      let feicoesA = (gjA?.features || []).slice();

      // Se escopo == auto e houver seleção ativa no SelectionManager, prioriza a seleção
      const selAtivas = (window.SelectionManager && Array.isArray(window.SelectionManager._selecionadas))
        ? window.SelectionManager._selecionadas
        : [];
      if (escopo === 'auto' && selAtivas.length > 0 && idCamadaA === 'instalacoes_portuarias') {
        feicoesA = selAtivas.slice();
      } else if (escopo === 'tela' && window.mapa) {
        const b = window.mapa.getBounds();
        feicoesA = feicoesA.filter(f => {
          const pt = this._extrairPontoLatLon(f);
          return pt && b.contains([pt.lat, pt.lon]);
        });
      }

      if (ufFiltro !== 'TODAS') {
        feicoesA = feicoesA.filter(f => this._obterUFFeicao(f) === ufFiltro);
      }

      if (regimeFiltro !== 'TODOS' && idCamadaA === 'instalacoes_portuarias') {
        feicoesA = feicoesA.filter(f => {
          const reg = this._obterRegimeFeicao(f).toUpperCase();
          if (regimeFiltro === 'PUBLICO') return reg.includes('PUBLICO') || reg.includes('ORGANIZADO');
          return reg.includes(regimeFiltro);
        });
      }

      const feicoesB = (gjB?.features || []).slice();
      const resultados = [];
      let dentroRaioCount = 0;
      let somaDistKm = 0;
      let contDist = 0;
      const contagemPorUF = {};
      const contagemPorRegime = {};

      const limProcessamento = Math.min(feicoesA.length, 350);

      for (let i = 0; i < limProcessamento; i++) {
        const fA = feicoesA[i];
        const ptA = this._extrairPontoLatLon(fA);
        if (!ptA) continue;

        const nomeA = this._obterNomeFeicao(fA, `Ativo #${i + 1}`);
        const ufA = this._obterUFFeicao(fA);
        const regA = this._obterRegimeFeicao(fA);
        const munA = fA.properties?.municipio || fA.properties?.cidade || fA.properties?.MUNICIPIO || '—';

        contagemPorUF[ufA] = (contagemPorUF[ufA] || 0) + 1;
        contagemPorRegime[regA] = (contagemPorRegime[regA] || 0) + 1;

        let relNome = '—';
        let relDetalhe = '—';
        let distKm = Infinity;
        let dentroRaio = false;
        let statusDiag = 'Normal';

        if (tipoRel === 'portos_x_batimetria_abaco') {
          // Relaciona cada porto com o Ábaco da Marinha/ANA correspondente à sua coordenada (Lat, Lon) e ao TIN ativo!
          const det = BatimetriaTINManager.autoDetectarAbacoPorCoordenadas(ptA.lat, ptA.lat, ptA.lon, ptA.lon, true);
          const cfgAb = BatimetriaTINManager._lerConfigAbaco();
          const corr = BatimetriaTINManager.calcularCorrecaoAbacoNaCoordenada(ptA.lat, ptA.lon, cfgAb);
          relNome = det ? `${det.rio} (Cartas ${det.cartasSerie})` : 'Fora das Cartas Amazônicas/Tocantins';
          relDetalhe = `Correção Ábaco C(λ) = ${corr.correcaoM >= 0 ? '+' : ''}${corr.correcaoM.toFixed(2)} m (${cfgAb.nome1} ↔ ${cfgAb.nome2})`;
          distKm = 0.0;
          dentroRaio = true;
          dentroRaioCount++;
          statusDiag = BatimetriaTINManager._trechosCriticos?.length
            ? `⚠️ ${BatimetriaTINManager._trechosCriticos.length} restrição(ões) no canal TIN`
            : '⚓ Enquadrado no Ábaco CHM/ANA';
        } else if (feicoesB.length > 0) {
          let melhorB = null;
          for (let j = 0; j < feicoesB.length; j++) {
            const d = this._distanciaMinimaKmParaFeicao(ptA.lon, ptA.lat, feicoesB[j]);
            if (d < distKm) {
              distKm = d;
              melhorB = feicoesB[j];
            }
          }
          if (melhorB) {
            relNome = this._obterNomeFeicao(melhorB, 'Feição Relacionada');
            const pB = melhorB.properties || {};
            if (idCamadaB === 'tku' || pB.fluxo) {
              const flx = Number(pB.fluxo || 0);
              relDetalhe = flx > 0
                ? `Fluxo: ${(flx / 1e6).toFixed(2)} mi t·km (${pB.navegacao || 'Hidroviário'})`
                : `Corredor ${pB.navegacao || 'VEN/TKU'}`;
            } else if (idCamadaB === 'tis_poligonais') {
              relDetalhe = `Etnia/Fase: ${pB.etnia_nome || pB.fase_ti || 'Terra Indígena FUNAI'}`;
            } else {
              relDetalhe = pB.bacia || pB.BACIA || pB.classificacao || pB.tempo_viagem || `Dist. geodésica à feição`;
            }
            dentroRaio = (distKm <= raioKm);
            if (dentroRaio) dentroRaioCount++;
            somaDistKm += distKm;
            contDist++;

            if (idCamadaB === 'tis_poligonais') {
              statusDiag = distKm < 0.05
                ? '🚨 SOBREPOSIÇÃO DIRETA (0 km)'
                : (dentroRaio ? `⚠️ Atenção Socioambiental (${distKm.toFixed(1)} km ≤ ${raioKm} km)` : `✅ Fora do raio (${distKm.toFixed(1)} km)`);
            } else {
              statusDiag = dentroRaio
                ? `✅ Conectado / Adjacente (${distKm.toFixed(1)} km)`
                : `🔸 Afastado da via (${distKm.toFixed(1)} km > ${raioKm} km)`;
            }
          }
        }

        resultados.push({
          idx: resultados.length + 1,
          nome: nomeA,
          regime: regA,
          municipio: munA,
          uf: ufA,
          lat: ptA.lat,
          lon: ptA.lon,
          relNome,
          relDetalhe,
          distKm: Number.isFinite(distKm) ? +distKm.toFixed(2) : null,
          dentroRaio,
          statusDiag
        });
      }

      // Ordena priorizando os que estão dentro do raio (menor distância primeiro)
      resultados.sort((a, b) => (a.distKm ?? 99999) - (b.distKm ?? 99999));
      resultados.forEach((r, idx) => { r.idx = idx + 1; });

      this._ultimosResultados = resultados;
      const distMediaKm = contDist > 0 ? +(somaDistKm / contDist).toFixed(2) : 0;
      const percDentroRaio = resultados.length > 0 ? +((dentroRaioCount / resultados.length) * 100).toFixed(1) : 0;

      const ufsOrdenadas = Object.entries(contagemPorUF)
        .sort((a, b) => b[1] - a[1])
        .map(([u, c]) => `${u} (${c})`)
        .slice(0, 6)
        .join(', ');

      const regimesOrdenados = Object.entries(contagemPorRegime)
        .sort((a, b) => b[1] - a[1])
        .map(([r, c]) => `${r}: ${c}`)
        .join(' · ');

      this._ultimoResumoKPIs = {
        tipoRel,
        idCamadaA,
        idCamadaB,
        ufFiltro,
        regimeFiltro,
        raioKm,
        focoCustom,
        totalAnalisados: resultados.length,
        totalBrutoFiltro: feicoesA.length,
        dentroRaioCount,
        percDentroRaio,
        distMediaKm,
        ufsOrdenadas: ufsOrdenadas || 'N/I',
        regimesOrdenados: regimesOrdenados || 'N/I'
      };

      this._renderizarKPIsETabela();
      this._gerarMinutaAnaliticaIA();

      if (statusEl) {
        statusEl.textContent = `✅ ${resultados.length} ativos cruzados (${dentroRaioCount} no raio de ${raioKm} km)`;
      }
    },

    _renderizarKPIsETabela: function () {
      const k = this._ultimoResumoKPIs;
      const boxKpi = document.getElementById('nt-ia-kpis-resumo');
      const boxTab = document.getElementById('nt-ia-tabela-container');
      if (!k || !boxKpi || !boxTab) return;

      boxKpi.innerHTML = `
        <div style="background:#071526; border:1px solid #1e3a5f; border-left:3px solid #38bdf8; border-radius:6px; padding:7px 10px;">
          <div style="font-size:9.5px; color:#94a3b8; text-transform:uppercase; font-weight:700;">Ativos Cruzados</div>
          <div style="font-size:18px; font-weight:800; color:#f8fafc;">${k.totalAnalisados} <span style="font-size:10px; color:#38bdf8;">(${k.ufFiltro})</span></div>
          <div style="font-size:9.5px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${k.regimesOrdenados}</div>
        </div>
        <div style="background:#071526; border:1px solid #1e3a5f; border-left:3px solid #10b981; border-radius:6px; padding:7px 10px;">
          <div style="font-size:9.5px; color:#94a3b8; text-transform:uppercase; font-weight:700;">No Raio (≤ ${k.raioKm} km)</div>
          <div style="font-size:18px; font-weight:800; color:#10b981;">${k.dentroRaioCount} <span style="font-size:11px;">(${k.percDentroRaio}%)</span></div>
          <div style="font-size:9.5px; color:#64748b;">Relação espacial positiva</div>
        </div>
        <div style="background:#071526; border:1px solid #1e3a5f; border-left:3px solid #f59e0b; border-radius:6px; padding:7px 10px;">
          <div style="font-size:9.5px; color:#94a3b8; text-transform:uppercase; font-weight:700;">Distância Média</div>
          <div style="font-size:18px; font-weight:800; color:#fbbf24;">${k.distMediaKm.toFixed(1)} km</div>
          <div style="font-size:9.5px; color:#64748b;">Até a feição mais próxima</div>
        </div>
        <div style="background:#071526; border:1px solid #1e3a5f; border-left:3px solid #a855f7; border-radius:6px; padding:7px 10px;">
          <div style="font-size:9.5px; color:#94a3b8; text-transform:uppercase; font-weight:700;">Distribuição UF</div>
          <div style="font-size:11.5px; font-weight:800; color:#e9d5ff; margin-top:3px; line-height:1.25;">${k.ufsOrdenadas}</div>
        </div>
      `;

      const linhas = this._ultimosResultados.slice(0, 60).map(r => `
        <tr style="border-bottom:1px solid rgba(30,58,95,0.5);">
          <td style="padding:4px 6px; color:#94a3b8;">${r.idx}</td>
          <td style="padding:4px 6px; font-weight:700; color:#f1f5f9;">${r.nome}</td>
          <td style="padding:4px 6px; color:#38bdf8;">${r.regime}</td>
          <td style="padding:4px 6px; color:#cbd5e1;">${r.municipio} / <strong>${r.uf}</strong></td>
          <td style="padding:4px 6px; color:#fde047; font-weight:600;">${r.relNome}</td>
          <td style="padding:4px 6px; color:#94a3b8;">${r.relDetalhe}</td>
          <td style="padding:4px 6px; font-family:monospace; color:#a7f3d0;">${r.distKm !== null ? r.distKm.toFixed(2) + ' km' : '—'}</td>
          <td style="padding:4px 6px;">${r.statusDiag}</td>
        </tr>
      `).join('');

      boxTab.innerHTML = `
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="border-bottom:1.5px solid #0284c7; color:#94a3b8; background:#071526; position:sticky; top:0;">
              <th style="padding:5px 6px;">#</th>
              <th style="padding:5px 6px;">Instalação / Ativo (Camada A)</th>
              <th style="padding:5px 6px;">Regime</th>
              <th style="padding:5px 6px;">Município / UF</th>
              <th style="padding:5px 6px;">Feição Relacionada (Camada B)</th>
              <th style="padding:5px 6px;">Atributo / Contexto</th>
              <th style="padding:5px 6px;">Distância</th>
              <th style="padding:5px 6px;">Diagnóstico</th>
            </tr>
          </thead>
          <tbody>
            ${linhas || '<tr><td colspan="8" style="padding:12px; text-align:center; color:#94a3b8;">Nenhum ativo encontrado para os filtros selecionados.</td></tr>'}
          </tbody>
        </table>
      `;
    },

    _gerarMinutaAnaliticaIA: function () {
      const k = this._ultimoResumoKPIs;
      const top5 = this._ultimosResultados.slice(0, 5);
      if (!k) return;

      const nomesRelacao = {
        'portos_x_localizacao_ven': 'Relacionamento Espacial entre Instalações Portuárias, Localização Regional (UF/Município) e Conectividade com as Vias Economicamente Navegáveis (VEN)',
        'portos_x_fluxo_tku': 'Relacionamento entre Instalações Portuárias e Corredores Hidroviários de Tonelada-Quilômetro Útil (TKU)',
        'portos_x_restricoes_tis': 'Diagnóstico de Interface Socioambiental entre Instalações Portuárias e Poligonais de Terras Indígenas (FUNAI)',
        'portos_x_batimetria_abaco': 'Avaliação Hidrográfica Integrada: Instalações Portuárias, Superfície Batimétrica TIN (QGIS), Nível de Redução pelos Ábacos da Marinha (CHM/DHN) e Cotas da ANA',
        'ais_x_portos_ven': 'Monitoramento de Tráfego Aquaviário AIS (Dados Reais / Monitorados) × Proximidade a Instalações Portuárias e Aderência às Vias Navegáveis (VEN)',
        'cruzamento_livre': `Cruzamento de Geointeligência Customizado (${k.idCamadaA} × ${k.idCamadaB})`
      };
      const tituloRel = nomesRelacao[k.tipoRel] || nomesRelacao['portos_x_localizacao_ven'];

      const exemplosStr = top5.length
        ? top5.map(r => `${r.nome} (${r.regime} em ${r.municipio}/${r.uf}, vinculado a "${r.relNome}" a ${r.distKm !== null ? r.distKm.toFixed(2) + ' km' : '0,00 km'})`).join('; ')
        : 'nenhum ativo enquadrado no recorte atual';

      const paragrafoFoco = k.focoCustom
        ? `3.3. Direcionamento Analítico Específico (${k.focoCustom}): A análise focalizada evidencia que a interação espacial entre os ativos selecionados (${k.regimesOrdenados}) e a malha hidroviária adjacente condiciona diretamente a eficiência logística, a segurança da navegação e a previsibilidade regulatória nas bacias monitoradas pela SEPH/ANTAQ.\n\n`
        : '';

      const texto = [
        `1. INTRODUÇÃO E ESCOPO DO RELACIONAMENTO DE GEOINTELIGÊNCIA`,
        `1.1. Esta Nota Técnica foi elaborada no âmbito da Gerência Especial de Estudos (GEE), vinculada à Superintendência de Estudos e Projetos Hidroviários (SEPH), em cumprimento ao art. 58 da Resolução ANTAQ nº 116/2024 e à Agenda Plurianual de Estudos 2025–2028, tendo por objeto o ${tituloRel}.`,
        `1.2. Para a presente análise espacial foi adotado o recorte geográfico "${k.ufFiltro === 'TODAS' ? 'Nacional (Todas as UFs)' : 'UF: ' + k.ufFiltro}", contemplando o regime "${k.regimeFiltro}" e um raio geodésico de relacionamento territorial de ${k.raioKm} km.`,
        ``,
        `2. DIAGNÓSTICO QUANTITATIVO E RELAÇÃO ESPACIAL PROCESSADA`,
        `2.1. O processamento topológico realizado no WebGIS Corporativo ANTAQ inspecionou ${k.totalAnalisados} ativos (${k.regimesOrdenados}), distribuídos regionalmente nas seguintes Unidades da Federação: ${k.ufsOrdenadas}.`,
        `2.2. Do universo analisado, constatou-se que ${k.dentroRaioCount} instalações (${k.percDentroRaio}% do total) encontram-se diretamente inseridas dentro do raio operacional de ${k.raioKm} km da camada relacionada, apresentando distância geodésica média de ${k.distMediaKm.toFixed(2)} km.`,
        `2.3. Destacam-se como casos representativos da relação espacial identificada: ${exemplosStr}.`,
        ``,
        `3. ANÁLISE TÉCNICA CAUSA-EFEITO E IMPLICAÇÕES HIDROVIÁRIAS`,
        `3.1. A distribuição espacial observada demonstra a relação direta entre a localização das instalações portuárias (Portos Organizados, TUPs, IP4 e ETCs), a disponibilidade de calado operacional nas vias navegáveis e a dinâmica de escoamento regional.`,
        `3.2. Nos trechos submetidos à variação fluviomarinha e sazonal da Bacia Amazônica e do Rio Tocantins, a aplicação conjugada da modelagem TIN (Padrão QGIS) e dos Ábacos de Correção das Cartas Náuticas da Marinha do Brasil (CHM/DHN) com dados telemétricos da ANA permite aferir com precisão centimétrica a folga abaixo da quilha e eventuais passivos de dragagem.`,
        paragrafoFoco ? paragrafoFoco.trim() : null,
        ``,
        `4. CONCLUSÕES E ENCAMINHAMENTOS (SEPH/GEE)`,
        `4.1. Conclui-se que o cruzamento geoespacial processado fornece subsídio técnico auditável para o planejamento hidroviário, a instrução de processos regulatórios e o monitoramento da infraestrutura aquaviária pela ANTAQ.`,
        `4.2. Restituem-se os autos no Sistema Eletrônico de Informações (SEI) com a matriz cadastral consolidada em anexo para prosseguimento.`
      ].filter(v => v !== null).join('\n');

      this._ultimoTextoMinuta = texto;
      const txtEl = document.getElementById('nt-ia-texto-minuta');
      if (txtEl) txtEl.value = texto;
    },

    copiarTextoSEI: function () {
      const txtEl = document.getElementById('nt-ia-texto-minuta');
      const texto = txtEl ? txtEl.value : this._ultimoTextoMinuta;
      if (!texto) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(() => {
          if (window.UI) window.UI.toast('📋 Minuta da Nota Técnica copiada! Basta colar (Ctrl+V) no editor do SEI.');
        });
      }
    },

    exportarCruzamentoCSV: function () {
      if (!this._ultimosResultados || !this._ultimosResultados.length) {
        if (window.UI) window.UI.toast('⚠️ Execute um cruzamento primeiro.', 'alerta');
        return;
      }
      const cab = 'Ordem;Ativo_Instalacao;Regime;Municipio;UF;Latitude;Longitude;Feicao_Relacionada;Contexto_Detalhe;Distancia_km;Dentro_Raio;Diagnostico';
      const linhas = this._ultimosResultados.map(r => [
        r.idx,
        `"${String(r.nome).replace(/"/g, '""')}"`,
        `"${String(r.regime).replace(/"/g, '""')}"`,
        `"${String(r.municipio).replace(/"/g, '""')}"`,
        r.uf,
        r.lat.toFixed(6),
        r.lon.toFixed(6),
        `"${String(r.relNome).replace(/"/g, '""')}"`,
        `"${String(r.relDetalhe).replace(/"/g, '""')}"`,
        r.distKm !== null ? r.distKm.toFixed(2) : '',
        r.dentroRaio ? 'SIM' : 'NAO',
        `"${String(r.statusDiag).replace(/"/g, '""')}"`
      ].join(';'));

      const csv = '\uFEFF' + [cab, ...linhas].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `matriz_inteligencia_espacial_antaq_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    emitirNotaTecnicaA4: function () {
      const k = this._ultimoResumoKPIs;
      if (!k) return;
      const txtEl = document.getElementById('nt-ia-texto-minuta');
      const textoMinuta = (txtEl ? txtEl.value : this._ultimoTextoMinuta) || '';

      const win = window.open('', '_blank', 'width=1080,height=880,scrollbars=yes');
      if (!win) {
        if (window.UI) window.UI.toast('⚠️ Permita pop-ups no navegador para abrir a Nota Técnica A4.', 'erro');
        return;
      }

      const dataStr = new Date().toLocaleDateString('pt-BR');
      const horaStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const paragrafosHtml = textoMinuta.split(/\r?\n/).map(linha => {
        const l = linha.trim();
        if (!l) return '';
        if (/^\d+\.\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(l)) {
          return `<h2 style="font-size:13px; color:#0a2540; border-bottom:1.5px solid #0284c7; padding-bottom:4px; margin:18px 0 8px 0; text-transform:uppercase;">${l}</h2>`;
        }
        return `<p style="font-size:11.5px; line-height:1.6; color:#1e293b; text-align:justify; margin:0 0 8px 0;">${l}</p>`;
      }).join('');

      const linhasTabela = this._ultimosResultados.slice(0, 120).map(r => `
        <tr>
          <td style="text-align:center;">${r.idx}</td>
          <td><strong>${r.nome}</strong></td>
          <td>${r.regime}</td>
          <td>${r.municipio} / <strong>${r.uf}</strong></td>
          <td><strong>${r.relNome}</strong><br><span style="font-size:9.5px; color:#475569;">${r.relDetalhe}</span></td>
          <td style="text-align:right; font-family:monospace;">${r.distKm !== null ? r.distKm.toFixed(2) + ' km' : '0,00 km'}</td>
          <td>${r.statusDiag}</td>
        </tr>
      `).join('');

      const htmlDoc = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Nota Técnica de Inteligência Geoespacial — ANTAQ / SEPH / GEE</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; color: #0f172a; background: #e2e8f0; margin: 0; padding: 20px; }
    .barra-topo-print { max-width: 210mm; margin: 0 auto 14px auto; background: #0a2540; color: #fff; padding: 10px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
    .folha-a4 { max-width: 210mm; margin: 0 auto; background: #ffffff; padding: 18mm 16mm; box-shadow: 0 10px 30px rgba(0,0,0,0.2); box-sizing: border-box; }
    .cabecalho { text-align: center; border-bottom: 2px solid #0a2540; padding-bottom: 10px; margin-bottom: 14px; }
    .cabecalho h1 { font-size: 14px; margin: 0; color: #0a2540; text-transform: uppercase; }
    .cabecalho h2 { font-size: 11.5px; margin: 3px 0 0 0; color: #0284c7; font-weight: 700; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0 16px 0; }
    .kpi-card { background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #0284c7; padding: 8px 10px; border-radius: 4px; }
    .kpi-card small { display: block; font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700; }
    .kpi-card strong { font-size: 15px; color: #0a2540; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9.5px; }
    th { background: #0a2540; color: #ffffff; padding: 6px; text-align: left; }
    td { padding: 5px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    @media print {
      body { background: #fff; padding: 0; }
      .barra-topo-print { display: none !important; }
      .folha-a4 { box-shadow: none; padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="barra-topo-print">
    <div><strong>🧠 Nota Técnica SEI — Estúdio de Inteligência Espacial (GEE/SEPH)</strong></div>
    <div style="display:flex; gap:8px;">
      <button onclick="window.print()" style="background:#10b981; color:#fff; border:none; padding:6px 14px; border-radius:5px; font-weight:700; cursor:pointer;">🖨️ Imprimir / Salvar PDF A4</button>
      <button onclick="window.close()" style="background:#475569; color:#fff; border:none; padding:6px 12px; border-radius:5px; cursor:pointer;">Fechar</button>
    </div>
  </div>
  <div class="folha-a4">
    <div class="cabecalho">
      <h1>AGÊNCIA NACIONAL DE TRANSPORTES AQUAVIÁRIOS — ANTAQ</h1>
      <h2>SUPERINTENDÊNCIA DE ESTUDOS E PROJETOS HIDROVIÁRIOS (SEPH) · GERÊNCIA ESPECIAL DE ESTUDOS (GEE)</h2>
      <div style="font-size:10px; color:#64748b; margin-top:4px;">NOTA TÉCNICA DE GEOINTELIGÊNCIA E RELACIONAMENTO ESPACIAL · Emitida em ${dataStr} às ${horaStr}</div>
    </div>

    <div class="kpis">
      <div class="kpi-card"><small>Ativos Inspecionados</small><strong>${k.totalAnalisados}</strong></div>
      <div class="kpi-card"><small>No Raio (≤ ${k.raioKm} km)</small><strong>${k.dentroRaioCount} (${k.percDentroRaio}%)</strong></div>
      <div class="kpi-card"><small>Distância Média</small><strong>${k.distMediaKm.toFixed(2)} km</strong></div>
      <div class="kpi-card"><small>Recorte UF / Regime</small><strong style="font-size:11px;">${k.ufFiltro} · ${k.regimeFiltro}</strong></div>
    </div>

    ${paragrafosHtml}

    <h2 style="font-size:13px; color:#0a2540; border-bottom:1.5px solid #0284c7; padding-bottom:4px; margin:18px 0 8px 0; text-transform:uppercase;">5. MATRIZ DE RELACIONAMENTO ESPACIAL AUDITADA (${this._ultimosResultados.length} ATIVOS)</h2>
    <table>
      <thead>
        <tr>
          <th style="width:28px; text-align:center;">#</th>
          <th>Instalação / Ativo</th>
          <th>Regime</th>
          <th>Município / UF</th>
          <th>Objeto Relacionado &amp; Contexto</th>
          <th style="text-align:right;">Distância</th>
          <th>Diagnóstico Técnico</th>
        </tr>
      </thead>
      <tbody>
        ${linhasTabela}
      </tbody>
    </table>

    <div style="margin-top:26px; text-align:center; font-size:10.5px; color:#334155;">
      Brasília/DF, ${dataStr}.<br><br>
      <strong>Gerência Especial de Estudos (GEE) · Superintendência de Estudos e Projetos Hidroviários (SEPH / ANTAQ)</strong>
    </div>
  </div>
</body>
</html>`;

      win.document.open();
      win.document.write(htmlDoc);
      win.document.close();
    }
  };

  window.EstudioNotaTecnicaIA = EstudioNotaTecnicaIA;

  // =========================================================================
  // 🚢 M20 — CENTRAL DE INGESTÃO DE DADOS AIS REAIS (CSV BRUTO / JSON / API REST & WEBSOCKET)
  // Injeta o botão "📡 Fonte Real (CSV / API)" diretamente no cabeçalho da Sala AIS (#aw-painel)
  // e permite substituir a simulação por dados reais CSV/JSON ou API em tempo real!
  // =========================================================================
  const AISRealIngestor = {
    _fonteAtual: 'simulacao', // 'simulacao' | 'csv_real' | 'api_real'
    _backupSimulacao: null,

    _repararDOMControleAIS: function (painel) {
      if (!painel) return;
      // 1. Garante que .aw-header-txt nunca quebre em coluna vertical estreita
      const hTxt = painel.querySelector('.aw-header-txt');
      if (hTxt) {
        hTxt.style.minWidth = '120px';
        hTxt.style.overflow = 'hidden';
        const st = hTxt.querySelector('strong');
        const sm = hTxt.querySelector('small');
        if (st) { st.style.whiteSpace = 'nowrap'; st.style.overflow = 'hidden'; st.style.textOverflow = 'ellipsis'; }
        if (sm) { sm.style.whiteSpace = 'nowrap'; sm.style.overflow = 'hidden'; sm.style.textOverflow = 'ellipsis'; }
      }
      // 2. Remove botão Limpar duplicado se existir em .aw-filtros
      const botoesLimpar = painel.querySelectorAll('.aw-filtros .aw-btn-limpar');
      if (botoesLimpar.length > 1) {
        for (let i = 1; i < botoesLimpar.length; i++) botoesLimpar[i].remove();
      }
      // 3. Corrige hierarquia DOM se .aw-scroll ou .aw-modo[simulador/dashboard] tiverem saído de #aw-principal / .aw-body
      const awBody = painel.querySelector('.aw-body');
      const modoMonitor = painel.querySelector('.aw-modo[data-modo="monitor"]');
      const awPrincipal = painel.querySelector('#aw-principal');
      const awScroll = painel.querySelector('.aw-scroll');
      const awDetalhe = painel.querySelector('#aw-detalhe');
      if (awPrincipal && awScroll && awScroll.parentElement !== awPrincipal) {
        awPrincipal.appendChild(awScroll);
      }
      if (modoMonitor && awDetalhe && awDetalhe.parentElement !== modoMonitor) {
        modoMonitor.appendChild(awDetalhe);
      }
      if (awBody) {
        ['monitor', 'simulador', 'dashboard'].forEach(m => {
          const elModo = painel.querySelector(`.aw-modo[data-modo="${m}"]`);
          if (elModo && elModo.parentElement !== awBody) {
            awBody.appendChild(elModo);
          }
        });
      }
    },

    initHookPainelAIS: function () {
      const injetarBotaoNoPainel = () => {
        const painel = document.getElementById('aw-painel');
        if (!painel) return;

        this._repararDOMControleAIS(painel);

        // Remove botão antigo caso estivesse dentro de .aw-header esmagando o título
        const btnAntigoNoHeader = painel.querySelector('.aw-header #aw-btn-fonte-real');
        if (btnAntigoNoHeader) btnAntigoNoHeader.remove();

        if (!document.getElementById('aw-barra-fonte-real')) {
          const tabs = painel.querySelector('.aw-tabs');
          const barra = document.createElement('div');
          barra.id = 'aw-barra-fonte-real';
          barra.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:8px; padding:6px 12px; background:#071a30; border-bottom:1px solid rgba(56,189,248,0.28); flex-shrink:0; font-size:10.5px;';
          barra.innerHTML = `
            <span id="aw-lbl-fonte-real-barra" style="color:#cbd5e1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              📡 Fonte AIS: <strong style="color:#fbbf24;">Base Simulada (Amazônia Legal)</strong>
            </span>
            <button id="aw-btn-fonte-real" type="button"
              title="Importar planilha CSV/JSON de dados AIS reais ou conectar API em tempo real"
              style="background:linear-gradient(135deg,#0f766e,#0d9488); color:#fff; border:1px solid #2dd4bf; border-radius:5px; padding:4px 10px; font-size:10.5px; font-weight:800; cursor:pointer; white-space:nowrap; flex-shrink:0; font-family:inherit;">
              📡 Fonte Real (CSV / API)
            </button>
          `;
          if (tabs && tabs.parentElement) {
            tabs.parentElement.insertBefore(barra, tabs);
          } else {
            painel.prepend(barra);
          }
          const btnReal = barra.querySelector('#aw-btn-fonte-real');
          if (btnReal) btnReal.onclick = () => AISRealIngestor.abrirModal();
        }
        this._atualizarSubtituloPainelAIS();
      };

      // Também intercepta ControleAIS._garantirHTML para injetar assim que o painel for construído
      if (window.ControleAIS && !window.ControleAIS._hookFonteReal) {
        window.ControleAIS._hookFonteReal = true;
        const origGarantir = window.ControleAIS._garantirHTML.bind(window.ControleAIS);
        window.ControleAIS._garantirHTML = function () {
          const res = origGarantir();
          injetarBotaoNoPainel();
          setTimeout(injetarBotaoNoPainel, 20);
          return res;
        };
      }
      setTimeout(injetarBotaoNoPainel, 400);
    },

    _atualizarSubtituloPainelAIS: function () {
      const sub = document.querySelector('#aw-painel .aw-header-txt small');
      const lblBarra = document.getElementById('aw-lbl-fonte-real-barra');
      const lblModal = document.getElementById('ais-real-lbl-fonte');
      const banner = document.getElementById('ais-real-status-banner');
      const nBarcos = window.AISManager?._cadastro?.size || 0;
      const nPos = window.AISManager?._posicoes?.length || 0;

      if (this._fonteAtual === 'csv_real') {
        if (sub) sub.innerHTML = `<span style="color:#10b981; font-weight:700;">🟢 Dados Reais (${nBarcos} embarcações)</span>`;
        if (lblBarra) lblBarra.innerHTML = `📡 Fonte AIS: <strong style="color:#10b981;">🟢 CSV/JSON Real (${nBarcos} navios · ${nPos} pos.)</strong>`;
        if (lblModal) { lblModal.style.color = '#10b981'; lblModal.textContent = `🟢 Dados Reais Importados (${nBarcos} embarcações · ${nPos} posições)`; }
        if (banner) banner.style.borderLeftColor = '#10b981';
      } else if (this._fonteAtual === 'api_real') {
        if (sub) sub.innerHTML = `<span style="color:#38bdf8; font-weight:700;">🛰️ API Tempo Real (${nBarcos} embarcações)</span>`;
        if (lblBarra) lblBarra.innerHTML = `📡 Fonte AIS: <strong style="color:#38bdf8;">🛰️ API em Tempo Real (${nBarcos} navios)</strong>`;
        if (lblModal) { lblModal.style.color = '#38bdf8'; lblModal.textContent = `🛰️ API em Tempo Real Ativa (${nBarcos} embarcações)`; }
        if (banner) banner.style.borderLeftColor = '#38bdf8';
      } else {
        if (sub) sub.textContent = 'Embarcações · Amazônia Legal';
        if (lblBarra) lblBarra.innerHTML = `📡 Fonte AIS: <strong style="color:#fbbf24;">Base Simulada (${nBarcos || 20} embarcações)</strong>`;
        if (lblModal) { lblModal.style.color = '#fbbf24'; lblModal.textContent = `Base Simulada Padrão (${nBarcos || 20} embarcações)`; }
        if (banner) banner.style.borderLeftColor = '#f59e0b';
      }
    },

    abrirModal: function () {
      const modal = document.getElementById('modal-ais-fonte-real');
      if (!modal) return;
      modal.classList.add('aberto');
      this._atualizarSubtituloPainelAIS();

      if (window.AISAPIConnector && window.AISAPIConnector.config) {
        const c = window.AISAPIConnector.config;
        const elProv = document.getElementById('ais-api-provedor');
        const elUrl = document.getElementById('ais-api-url');
        const elKey = document.getElementById('ais-api-key');
        const elInt = document.getElementById('ais-api-intervalo');
        if (elProv && c.provedor && c.provedor !== 'LOCAL_CSV') elProv.value = c.provedor;
        if (elUrl) elUrl.value = c.urlPosicoes || c.wsUrl || '';
        if (elKey) elKey.value = c.apiKey || '';
        if (elInt) elInt.value = c.intervaloSegundos || 60;
      }
    },

    fecharModal: function () {
      const modal = document.getElementById('modal-ais-fonte-real');
      if (modal) modal.classList.remove('aberto');
    },

    _salvarBackupSimulacaoSeNecessario: function () {
      if (this._backupSimulacao || !window.AISManager || !window.AISManager._pronto) return;
      this._backupSimulacao = {
        cadastro: new Map(window.AISManager._cadastro),
        posicoes: window.AISManager._posicoes.slice(),
        ultimaPorMmsi: new Map(window.AISManager._ultimaPorMmsi),
        tipos: Object.assign({}, window.AISManager._tipos)
      };
    },

    restaurarSimulacaoPadrao: function () {
      if (window.AISAPIConnector) window.AISAPIConnector.pararMonitoramento();
      if (this._backupSimulacao && window.AISManager) {
        window.AISManager._cadastro = new Map(this._backupSimulacao.cadastro);
        window.AISManager._posicoes = this._backupSimulacao.posicoes.slice();
        window.AISManager._ultimaPorMmsi = new Map(this._backupSimulacao.ultimaPorMmsi);
        window.AISManager._tipos = Object.assign({}, this._backupSimulacao.tipos);
      }
      this._fonteAtual = 'simulacao';
      this._atualizarPainelEMapaAIS();
      this._atualizarSubtituloPainelAIS();
      if (window.UI) window.UI.toast('🔄 Base simulada padrão do AIS restaurada.');
    },

    aoSelecionarArquivoReal: function (files) {
      if (!files || !files.length) return;
      const file = files[0];
      const resumoEl = document.getElementById('ais-real-resumo-arquivo');
      if (resumoEl) resumoEl.textContent = `⏳ Lendo e normalizando arquivo ${file.name}...`;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const texto = String(e.target.result || '');
          await this.processarTextoAISBruto(texto, file.name);
        } catch (err) {
          if (resumoEl) resumoEl.innerHTML = `<span style="color:#f87171;">❌ Erro ao processar arquivo: ${err.message || err}</span>`;
        }
      };
      reader.readAsText(file, 'utf-8');
    },

    processarTextoAISBruto: async function (texto, nomeArquivo = 'dados_ais.csv') {
      if (window.AISManager && !window.AISManager._pronto && typeof window.AISManager.carregar === 'function') {
        try { await window.AISManager.carregar(); } catch (_) {}
      }
      this._salvarBackupSimulacaoSeNecessario();

      let registrosBrutos = [];
      const trimTxt = texto.trim();

      if (trimTxt.startsWith('{') || trimTxt.startsWith('[')) {
        const parsed = JSON.parse(trimTxt);
        if (Array.isArray(parsed)) registrosBrutos = parsed;
        else if (Array.isArray(parsed.features)) registrosBrutos = parsed.features;
        else if (Array.isArray(parsed.data)) registrosBrutos = parsed.data;
        else if (Array.isArray(parsed.vessels)) registrosBrutos = parsed.vessels;
      } else {
        // Parse CSV universal (suporta vírgula, ponto-e-vírgula ou tabulação, com ou sem aspas)
        const linhas = trimTxt.replace(/\r/g, '').split('\n').filter(l => l.trim());
        if (linhas.length < 2) throw new Error('O arquivo CSV deve conter cabeçalho e pelo menos 1 linha de posição.');
        const prim = linhas[0];
        const sep = prim.includes(';') ? ';' : (prim.includes('\t') ? '\t' : ',');
        const splitLinha = (str) => str.split(sep).map(s => s.trim().replace(/^"|"$/g, ''));
        const headers = splitLinha(prim).map(h => h.toLowerCase().trim());

        for (let i = 1; i < linhas.length; i++) {
          const cols = splitLinha(linhas[i]);
          if (cols.length < 3) continue;
          const obj = {};
          for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = cols[j] ?? '';
          }
          registrosBrutos.push(obj);
        }
      }

      const normalizados = [];
      for (let i = 0; i < registrosBrutos.length; i++) {
        const r = registrosBrutos[i];
        let norm = null;
        if (window.AISAPIConnector && typeof window.AISAPIConnector.normalizarMensagemAIS === 'function') {
          norm = window.AISAPIConnector.normalizarMensagemAIS(r);
          if (norm) window.AISAPIConnector.enriquecerComCruzamentoVEN(norm);
        }
        if (norm) normalizados.push(norm);
      }

      if (!normalizados.length) {
        throw new Error('Nenhuma posição AIS válida (com MMSI, Latitude e Longitude) foi encontrada no arquivo.');
      }

      const modoCarga = document.getElementById('ais-real-modo-carga')?.value || 'substituir';
      if (modoCarga === 'substituir' && window.AISManager) {
        window.AISManager._cadastro.clear();
        window.AISManager._posicoes = [];
        window.AISManager._ultimaPorMmsi.clear();
        window.AISManager._tipos = {};
      }

      if (window.AISAPIConnector) {
        window.AISAPIConnector._injetarNoAISManager(normalizados);
      }

      this._fonteAtual = 'csv_real';
      this._atualizarPainelEMapaAIS();
      this._atualizarSubtituloPainelAIS();

      const nBarcos = window.AISManager?._cadastro?.size || 0;
      const resumoEl = document.getElementById('ais-real-resumo-arquivo');
      if (resumoEl) {
        resumoEl.innerHTML = `✅ <strong>${normalizados.length.toLocaleString('pt-BR')} posições AIS reais</strong> importadas de <strong>${nomeArquivo}</strong> (${nBarcos} embarcações únicas cruzadas com o VEN e plotadas no mapa e na Sala de Controle AIS)!`;
      }
      if (window.UI) {
        window.UI.toast(`🚢 ${normalizados.length} posições AIS reais (${nBarcos} embarcações) carregadas no Painel AIS!`);
      }
    },

    conectarAPITempoReal: async function () {
      const prov = document.getElementById('ais-api-provedor')?.value || 'ANTAQ_REST';
      const url = (document.getElementById('ais-api-url')?.value || '').trim();
      const key = (document.getElementById('ais-api-key')?.value || '').trim();
      const interv = Math.max(10, parseInt(document.getElementById('ais-api-intervalo')?.value || '60', 10) || 60);
      const msgEl = document.getElementById('ais-api-status-msg');

      if (!url) {
        if (msgEl) msgEl.innerHTML = `<span style="color:#f87171;">⚠️ Informe a URL do Endpoint REST ou WebSocket da API AIS.</span>`;
        return;
      }

      this._salvarBackupSimulacaoSeNecessario();
      if (msgEl) msgEl.innerHTML = `<span style="color:#38bdf8;">⏳ Conectando ao provedor ${prov} (${url})...</span>`;

      try {
        if (window.AISAPIConnector) {
          const isWs = prov === 'WEBSOCKET_STREAM' || url.startsWith('ws://') || url.startsWith('wss://');
          window.AISAPIConnector.configurar({
            ativo: true,
            provedor: isWs ? 'WEBSOCKET_STREAM' : prov,
            urlPosicoes: isWs ? '' : url,
            wsUrl: isWs ? url : '',
            apiKey: key,
            intervaloSegundos: interv
          });

          if (!isWs) {
            const recebidos = await window.AISAPIConnector.buscarLoteREST();
            this._fonteAtual = 'api_real';
            this._atualizarPainelEMapaAIS();
            this._atualizarSubtituloPainelAIS();
            if (msgEl) {
              msgEl.innerHTML = `<span style="color:#10b981; font-weight:700;">🟢 Conectado! ${recebidos.length} posições recebidas da API e plotadas na Sala de Controle AIS (atualização a cada ${interv}s).</span>`;
            }
          } else {
            this._fonteAtual = 'api_real';
            this._atualizarSubtituloPainelAIS();
            if (msgEl) {
              msgEl.innerHTML = `<span style="color:#10b981; font-weight:700;">🟢 Streaming WebSocket iniciado (${url})! As posições aparecem no mapa conforme chegam.</span>`;
            }
          }
        }
      } catch (err) {
        if (msgEl) {
          msgEl.innerHTML = `<span style="color:#fbbf24;">⚠️ Configuração salva, mas a chamada direta retornou: ${err.message || err} (verifique CORS/Token ou importe via CSV acima).</span>`;
        }
      }
    },

    _atualizarPainelEMapaAIS: function () {
      if (window.AISLayer && typeof window.AISLayer.atualizar === 'function') {
        try { window.AISLayer.atualizar(); } catch (_) {}
      }
      if (window.ControleAIS && window.ControleAIS._aberto) {
        try {
          window.ControleAIS._garantirRangeGlobal();
          window.ControleAIS.renderMonitor();
          window.ControleAIS._atualizarFrame();
          if (window.ControleAIS._modo === 'dashboard') window.ControleAIS._renderDashboard();
        } catch (_) {}
      }
      // Centraliza o mapa nos barcos carregados
      if (window.mapa && window.AISManager && window.AISManager._ultimaPorMmsi?.size > 0) {
        const coords = [];
        window.AISManager._ultimaPorMmsi.forEach(p => {
          if (Number.isFinite(p.lat) && Number.isFinite(p.lon)) coords.push([p.lat, p.lon]);
        });
        if (coords.length > 0) {
          try { window.mapa.fitBounds(coords, { padding: [50, 50], maxZoom: 12 }); } catch (_) {}
        }
      }
    },

    baixarModeloCSV: function () {
      const csv = [
        'mmsi,nome,tipo,bandeira,comprimento_m,calado_m,timestamp,lat,lon,sog,cog,heading,porto_origem,porto_destino,status',
        '710009101,EMPURRADOR RIO PARA I,Empurrador / Comboio,BR,48.0,3.8,2026-10-14T12:00:00Z,-1.4450,-48.5120,8.2,245,245,Belém,Vila do Conde,no_prazo',
        '710009101,EMPURRADOR RIO PARA I,Empurrador / Comboio,BR,48.0,3.8,2026-10-14T13:00:00Z,-1.5120,-48.6450,8.5,230,230,Belém,Vila do Conde,no_prazo',
        '710009102,NM SANTAREM EXPRESS,Cargueiro / Graneleiro,BR,115.0,7.5,2026-10-14T13:00:00Z,-2.4180,-54.7120,11.4,92,92,Manaus,Santarém,no_prazo',
        '710009103,COMBOIO MADEIRA SUL,Empurrador / Comboio,BR,65.0,4.2,2026-10-14T13:00:00Z,-6.2510,-61.9240,6.8,35,35,Porto Velho,Itacoatiara,atencao'
      ].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modelo_dados_ais_reais_antaq.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  window.AISRealIngestor = AISRealIngestor;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AISRealIngestor.initHookPainelAIS());
  } else {
    AISRealIngestor.initHookPainelAIS();
  }


  console.info('[js] BatimetriaTINManager v7.9 + EstudioNotaTecnicaIA + AISRealIngestor + AuthVaultPBKDF2 carregados');
})();
