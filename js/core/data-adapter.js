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
