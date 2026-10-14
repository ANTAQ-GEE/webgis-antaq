-- ============================================================================
-- WEBGIS CORPORATIVO ANTAQ — SCHEMA ESPACIAL POSTGRESQL 16 + POSTGIS 3.4
-- Superintendência de Estudos e Projetos Hidroviários (SEPH / GEE)
-- Padrão Cartográfico Oficial: SIRGAS 2000 (EPSG:4674) / WGS 84 (EPSG:4326)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. SCHEMAS ORGANIZACIONAIS
CREATE SCHEMA IF NOT EXISTS infra;      -- Instalações Portuárias (Lei 12.815/2013)
CREATE SCHEMA IF NOT EXISTS hidro;      -- Malha Hidroviária (VEN e Travessias)
CREATE SCHEMA IF NOT EXISTS logistica;  -- Esforço Logístico (TKU e Matrizes O/D)
CREATE SCHEMA IF NOT EXISTS ais;        -- Telemetria AIS em Tempo Real e Histórico

-- ============================================================================
-- 2. INFRAESTRUTURA PORTUÁRIA (Lei Federal nº 12.815/2013)
-- ============================================================================
CREATE TABLE IF NOT EXISTS infra.instalacoes_portuarias (
    id_instalacao       SERIAL PRIMARY KEY,
    codigo_antaq        VARCHAR(32) UNIQUE,
    nome                VARCHAR(255) NOT NULL,
    regime_outorga      VARCHAR(40) NOT NULL CHECK (regime_outorga IN ('ORGANIZADO', 'TUP', 'IP4', 'ETC', 'PUBLICO', 'OUTROS')),
    tipo_original       VARCHAR(120),
    modalidade          VARCHAR(80),
    companhia_operadora VARCHAR(255),
    cnpj                VARCHAR(20),
    municipio           VARCHAR(120),
    uf                  CHAR(2) NOT NULL,
    regiao_hidrografica VARCHAR(120),
    calado_max_m        NUMERIC(5,2),
    situacao            VARCHAR(50) DEFAULT 'Ativo',
    legislacao_outorga  VARCHAR(255),
    geom                GEOMETRY(Point, 4326) NOT NULL,
    atualizado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portos_geom ON infra.instalacoes_portuarias USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_portos_regime_uf ON infra.instalacoes_portuarias (regime_outorga, uf);
CREATE INDEX IF NOT EXISTS idx_portos_nome_trgm ON infra.instalacoes_portuarias USING GIN (nome gin_trgm_ops);

-- ============================================================================
-- 3. VIAS ECONOMICAMENTE NAVEGADAS (VEN — Série Histórica 2013–2024)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hidro.ven_trechos (
    id_trecho           SERIAL PRIMARY KEY,
    safra_ano           SMALLINT NOT NULL CHECK (safra_ano IN (2013, 2018, 2020, 2022, 2024)),
    id_hidrovia         VARCHAR(64),
    nome_rio            VARCHAR(180),
    bacia_hidrografica  VARCHAR(150),
    mun_origem          VARCHAR(120),
    uf_origem           CHAR(2),
    mun_destino         VARCHAR(120),
    uf_destino          CHAR(2),
    extensao_km         NUMERIC(10,2) NOT NULL,
    tempo_viagem_h      NUMERIC(8,2),
    velocidade_media_kmh NUMERIC(6,2),
    calado_min_m        NUMERIC(5,2),
    calado_max_m        NUMERIC(5,2),
    nome_eclusa         VARCHAR(150),
    geom                GEOMETRY(MultiLineString, 4326) NOT NULL,
    atualizado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ven_geom ON hidro.ven_trechos USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_ven_safra ON hidro.ven_trechos (safra_ano);

-- ============================================================================
-- 4. LINHAS DE TRAVESSIAS INTERESTADUAIS E INTERNACIONAIS
-- ============================================================================
CREATE TABLE IF NOT EXISTS hidro.linhas_travessias (
    id_travessia        SERIAL PRIMARY KEY,
    nome_travessia      VARCHAR(255) NOT NULL,
    municipio_origem    VARCHAR(120),
    uf_origem           CHAR(2),
    municipio_destino   VARCHAR(120),
    uf_destino          CHAR(2),
    corpo_hidrico       VARCHAR(150),
    natureza_servico    VARCHAR(100) DEFAULT 'Passageiros e Veículos',
    empresa_autorizada  VARCHAR(255),
    termo_autorizacao   VARCHAR(100),
    extensao_km         NUMERIC(8,2),
    geom                GEOMETRY(MultiLineString, 4326) NOT NULL,
    atualizado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travessias_geom ON hidro.linhas_travessias USING GIST (geom);

-- ============================================================================
-- 5. MODELO DE TONELADA-QUILÔMETRO ÚTIL (TKU — 2021, 2023, 2025)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistica.fluxo_tku (
    id_fluxo            SERIAL PRIMARY KEY,
    ano_referencia      SMALLINT NOT NULL CHECK (ano_referencia IN (2021, 2023, 2025)),
    tipo_navegacao      VARCHAR(40) NOT NULL CHECK (tipo_navegacao IN ('Interior', 'Cabotagem', 'Longo Curso')),
    nome_trecho         VARCHAR(255),
    carga_t             NUMERIC(16,2),
    extensao_km         NUMERIC(10,2),
    tku_total           NUMERIC(18,2) NOT NULL,
    classe_intensidade  VARCHAR(40),
    geom                GEOMETRY(MultiLineString, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tku_geom ON logistica.fluxo_tku USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_tku_ano_nav ON logistica.fluxo_tku (ano_referencia, tipo_navegacao);

-- ============================================================================
-- 6. TELEMETRIA AIS (Preparado para API Externa: ANTAQ, SISTRAM, MarineTraffic, Spire)
-- ============================================================================

-- 6.1 Cadastro Mestre de Embarcações Monitoradas
CREATE TABLE IF NOT EXISTS ais.embarcacoes_cadastro (
    mmsi                BIGINT PRIMARY KEY,
    imo                 VARCHAR(20),
    nome                VARCHAR(180) NOT NULL,
    tipo_codigo_itu     SMALLINT DEFAULT 70,
    tipo_descricao      VARCHAR(80) DEFAULT 'Carga Geral',
    operador            VARCHAR(180),
    bandeira            VARCHAR(10) DEFAULT 'BR',
    comprimento_m       NUMERIC(6,2),
    calado_projeto_m    NUMERIC(5,2),
    ano_construcao      SMALLINT,
    atualizado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- 6.2 Tabela Quente: Última Posição Conhecida por Embarcação (Leitura Sub-Milissegundo para o Mapa)
CREATE TABLE IF NOT EXISTS ais.ultimas_posicoes (
    mmsi                BIGINT PRIMARY KEY REFERENCES ais.embarcacoes_cadastro(mmsi) ON DELETE CASCADE,
    timestamp_utc       TIMESTAMPTZ NOT NULL,
    sog_knots           NUMERIC(5,2) DEFAULT 0,
    cog_deg             NUMERIC(5,2) DEFAULT 0,
    heading_deg         NUMERIC(5,2) DEFAULT 0,
    nav_status          SMALLINT DEFAULT 0,
    calado_atual_m      NUMERIC(5,2),
    porto_origem        VARCHAR(120),
    porto_destino       VARCHAR(120),
    eta_programada      TIMESTAMPTZ,
    trecho_ven_proximo  VARCHAR(180),
    dist_ven_km         NUMERIC(8,2) DEFAULT 0,
    classificacao_ven   VARCHAR(20) DEFAULT 'dentro' CHECK (classificacao_ven IN ('dentro', 'atencao', 'fora')),
    provedor_api        VARCHAR(40) DEFAULT 'API_EXTERNA',
    geom                GEOMETRY(Point, 4326) NOT NULL,
    recebido_em         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ais_ultimas_geom ON ais.ultimas_posicoes USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_ais_ultimas_ts ON ais.ultimas_posicoes (timestamp_utc DESC);

-- 6.3 Tabela Fria / Série Temporal: Histórico de Trajetórias (Rastro AIS)
CREATE TABLE IF NOT EXISTS ais.historico_posicoes (
    id_posicao          BIGSERIAL PRIMARY KEY,
    mmsi                BIGINT NOT NULL,
    timestamp_utc       TIMESTAMPTZ NOT NULL,
    sog_knots           NUMERIC(5,2),
    cog_deg             NUMERIC(5,2),
    heading_deg         NUMERIC(5,2),
    dist_ven_km         NUMERIC(8,2),
    classificacao_ven   VARCHAR(20),
    geom                GEOMETRY(Point, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ais_hist_mmsi_ts ON ais.historico_posicoes (mmsi, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_ais_hist_geom ON ais.historico_posicoes USING GIST (geom);

-- ============================================================================
-- 7. FUNÇÃO STORED PROCEDURE: INGESTÃO AUTOMÁTICA DE LOTE DA API AIS + CRUZAMENTO VEN
-- ============================================================================
-- Recebe um JSON Array da API AIS, faz upsert no cadastro, calcula a distância
-- até o eixo oficial do VEN 2024 via operador espacial KNN (<->) e atualiza o mapa.
CREATE OR REPLACE FUNCTION ais.fn_ingerir_lote_ais(payload_json JSONB, nome_provedor VARCHAR DEFAULT 'API_AIS')
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    item JSONB;
    v_mmsi BIGINT;
    v_lat DOUBLE PRECISION;
    v_lon DOUBLE PRECISION;
    v_geom GEOMETRY(Point, 4326);
    v_trecho VARCHAR(180);
    v_dist_km NUMERIC(8,2);
    v_class VARCHAR(20);
    v_count INTEGER := 0;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(payload_json)
    LOOP
        v_mmsi := (item->>'mmsi')::BIGINT;
        v_lat  := (item->>'lat')::DOUBLE PRECISION;
        v_lon  := (item->>'lon')::DOUBLE PRECISION;

        IF v_mmsi IS NOT NULL AND v_lat IS NOT NULL AND v_lon IS NOT NULL THEN
            v_geom := ST_SetSRID(ST_MakePoint(v_lon, v_lat), 4326);

            -- 1. Garante cadastro da embarcação
            INSERT INTO ais.embarcacoes_cadastro (mmsi, imo, nome, tipo_descricao, bandeira)
            VALUES (
                v_mmsi,
                COALESCE(item->>'imo', ''),
                COALESCE(item->>'nome', 'MMSI ' || v_mmsi::TEXT),
                COALESCE(item->>'tipo', 'Carga Geral'),
                COALESCE(item->>'bandeira', 'BR')
            )
            ON CONFLICT (mmsi) DO UPDATE
            SET nome = EXCLUDED.nome,
                atualizado_em = NOW();

            -- 2. Cruzamento espacial instantâneo com a malha VEN 2024 (KNN Index)
            SELECT
                v.nome_rio,
                ROUND((ST_Distance(v.geom::geography, v_geom::geography) / 1000.0)::NUMERIC, 2)
            INTO v_trecho, v_dist_km
            FROM hidro.ven_trechos v
            WHERE v.safra_ano = 2024
            ORDER BY v.geom <-> v_geom
            LIMIT 1;

            v_dist_km := COALESCE(v_dist_km, 0);
            v_class := CASE
                WHEN v_dist_km <= 2.0 THEN 'dentro'
                WHEN v_dist_km <= 5.0 THEN 'atencao'
                ELSE 'fora'
            END;

            -- 3. Upsert na tabela quente (ais.ultimas_posicoes)
            INSERT INTO ais.ultimas_posicoes (
                mmsi, timestamp_utc, sog_knots, cog_deg, heading_deg,
                porto_destino, trecho_ven_proximo, dist_ven_km, classificacao_ven,
                provedor_api, geom, recebido_em
            )
            VALUES (
                v_mmsi,
                COALESCE((item->>'timestamp')::TIMESTAMPTZ, NOW()),
                COALESCE((item->>'sog')::NUMERIC, 0),
                COALESCE((item->>'cog')::NUMERIC, 0),
                COALESCE((item->>'heading')::NUMERIC, 0),
                COALESCE(item->>'porto_destino', ''),
                COALESCE(v_trecho, 'Hidrovia Nacional'),
                v_dist_km,
                v_class,
                nome_provedor,
                v_geom,
                NOW()
            )
            ON CONFLICT (mmsi) DO UPDATE
            SET timestamp_utc      = EXCLUDED.timestamp_utc,
                sog_knots          = EXCLUDED.sog_knots,
                cog_deg            = EXCLUDED.cog_deg,
                heading_deg        = EXCLUDED.heading_deg,
                porto_destino      = EXCLUDED.porto_destino,
                trecho_ven_proximo = EXCLUDED.trecho_ven_proximo,
                dist_ven_km        = EXCLUDED.dist_ven_km,
                classificacao_ven  = EXCLUDED.classificacao_ven,
                provedor_api       = EXCLUDED.provedor_api,
                geom               = EXCLUDED.geom,
                recebido_em        = NOW();

            -- 4. Insere no histórico de rastro
            INSERT INTO ais.historico_posicoes (
                mmsi, timestamp_utc, sog_knots, cog_deg, heading_deg,
                dist_ven_km, classificacao_ven, geom
            )
            VALUES (
                v_mmsi,
                COALESCE((item->>'timestamp')::TIMESTAMPTZ, NOW()),
                COALESCE((item->>'sog')::NUMERIC, 0),
                COALESCE((item->>'cog')::NUMERIC, 0),
                COALESCE((item->>'heading')::NUMERIC, 0),
                v_dist_km,
                v_class,
                v_geom
            );

            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$;
