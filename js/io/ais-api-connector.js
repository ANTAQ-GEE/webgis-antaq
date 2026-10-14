/* ============================================================
   WebGIS Corporativo ANTAQ — Módulo: AISAPIConnector
   Escopo: Conector Universal de Telemetria AIS Multi-Fornecedor
           Preparado para acordos de cooperação técnica ou fornecimento direto:
             1. ANTAQ / PostGIS Interno (REST / GeoJSON)
             2. Marinha do Brasil / SISTRAM (Intercâmbio Governamental)
             3. MarineTraffic API (PS07 / ExportVessels)
             4. Spire Maritime / Orbcomm / VesselFinder (REST / GraphQL / GeoJSON)
             5. WebSocket Stream em Tempo Real (AISStream / Broker Corporativo)
   Dependências: window.AISManager, window.AISLayer, window.DADOS_GEOJSON_BRUTOS, turf (opcional)
   Expõe: window.AISAPIConnector
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY_AIS = 'antaq_webgis_ais_api_config_v1';

  // Mapeamento oficial ITU-R M.1371 (Ship Type Code) para categorias ANTAQ
  function mapearTipoEmbarcacaoITU(codigoOuTexto) {
    if (!codigoOuTexto) return { codigo: 70, nome: 'Carga Geral' };
    const str = String(codigoOuTexto).trim().toUpperCase();
    const num = parseInt(str, 10);

    if (!isNaN(num)) {
      if (num === 31 || num === 32 || num === 52) return { codigo: num, nome: 'Empurrador / Rebocador' };
      if (num >= 60 && num <= 69) return { codigo: num, nome: 'Passageiros / Travessia' };
      if (num >= 70 && num <= 79) return { codigo: num, nome: 'Cargueiro / Graneleiro' };
      if (num >= 80 && num <= 89) return { codigo: num, nome: 'Petroleiro / Tanque' };
      if (num === 30) return { codigo: num, nome: 'Pesqueiro' };
      if (num >= 50 && num <= 59) return { codigo: num, nome: 'Apoio Portuário / Serviço' };
    }

    if (str.includes('EMPURRADOR') || str.includes('COMBOIO') || str.includes('TUG') || str.includes('PUSHER') || str.includes('BARCA')) {
      return { codigo: 31, nome: 'Empurrador / Comboio' };
    }
    if (str.includes('GRANEL') || str.includes('BULK') || str.includes('SOJA') || str.includes('MINER')) {
      return { codigo: 70, nome: 'Graneleiro' };
    }
    if (str.includes('TANQUE') || str.includes('TANKER') || str.includes('PETROL') || str.includes('OIL') || str.includes('QUIM')) {
      return { codigo: 80, nome: 'Petroleiro / Tanque' };
    }
    if (str.includes('CONT') || str.includes('CONTAINER')) {
      return { codigo: 71, nome: 'Porta-Contêineres' };
    }
    if (str.includes('PASSAG') || str.includes('FERRY') || str.includes('LANCHA') || str.includes('MISTO')) {
      return { codigo: 60, nome: 'Passageiros / Misto' };
    }
    return { codigo: 70, nome: String(codigoOuTexto) };
  }

  const AISAPIConnector = {
    // Configuração ativa
    config: {
      ativo: false,
      provedor: 'LOCAL_CSV', // 'LOCAL_CSV' | 'ANTAQ_REST' | 'SISTRAM_MARINHA' | 'MARINETRAFFIC' | 'SPIRE_MARITIME' | 'WEBSOCKET_STREAM'
      urlPosicoes: '',
      urlCadastro: '',
      wsUrl: '',
      apiKey: '',
      authHeader: 'Authorization', // ou 'X-API-Key'
      intervaloSegundos: 60,
      bboxFiltro: [-74.5, -34.0, -32.0, 6.0], // Bbox padrão Brasil + Águas Jurisdicionais
      calcularCruzamentoVEN: true
    },

    _timerPolling: null,
    _ws: null,
    _estatisticas: {
      ultimaSincronizacao: null,
      mensagensRecebidas: 0,
      embarcacoesAtivas: 0,
      errosConsecutivos: 0,
      statusConexao: 'standby_local'
    },

    init: function () {
      try {
        const salvo = localStorage.getItem(STORAGE_KEY_AIS);
        if (salvo) {
          const parsed = JSON.parse(salvo);
          Object.assign(this.config, parsed);
        }
      } catch (e) {}

      if (this.config.ativo && (this.config.urlPosicoes || this.config.wsUrl)) {
        this.iniciarMonitoramento();
      }
      console.info(`[AISAPIConnector] Pronto (Provedor: ${this.config.provedor})`);
    },

    /**
     * Configura o conector para uma API AIS externa ou institucional da ANTAQ.
     * @param {object} novaConfig
     */
    configurar: function (novaConfig) {
      if (!novaConfig) return this.config;
      Object.assign(this.config, novaConfig);
      try {
        localStorage.setItem(STORAGE_KEY_AIS, JSON.stringify(this.config));
      } catch (e) {}

      this.pararMonitoramento();
      if (this.config.ativo && (this.config.urlPosicoes || this.config.wsUrl)) {
        this.iniciarMonitoramento();
      }
      return this.config;
    },

    /**
     * Normalizador universal: aceita JSON de qualquer fornecedor (ANTAQ, SISTRAM,
     * MarineTraffic, Spire, VesselFinder, GeoJSON ou AISStream) e converte para o
     * esquema canônico do WebGIS ANTAQ.
     */
    normalizarMensagemAIS: function (raw) {
      if (!raw) return null;

      // Suporte a Feature GeoJSON
      const props = (raw.type === 'Feature' && raw.properties) ? raw.properties : raw;
      const geomCoords = (raw.type === 'Feature' && raw.geometry && Array.isArray(raw.geometry.coordinates))
        ? raw.geometry.coordinates
        : null;

      // Suporte a envelope AISStream.io (Message.PositionReport + MetaData)
      const meta = raw.MetaData || raw.metadata || {};
      const posReport = (raw.Message && (raw.Message.PositionReport || raw.Message.StandardClassBPositionReport)) || {};

      const mmsi = parseInt(
        props.mmsi ?? props.MMSI ?? props.userid ?? props.vessel_mmsi ?? meta.MMSI ?? posReport.UserID,
        10
      );
      if (!mmsi || isNaN(mmsi)) return null;

      const lat = parseFloat(
        props.lat ?? props.LAT ?? props.latitude ?? props.LATITUDE ??
        meta.latitude ?? posReport.Latitude ?? (geomCoords ? geomCoords[1] : NaN)
      );
      const lon = parseFloat(
        props.lon ?? props.LON ?? props.lng ?? props.longitude ?? props.LONGITUDE ??
        meta.longitude ?? posReport.Longitude ?? (geomCoords ? geomCoords[0] : NaN)
      );
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

      const sog = parseFloat(props.sog ?? props.SOG ?? props.speed ?? props.SPEED ?? posReport.Sog ?? 0) || 0;
      const cog = parseFloat(props.cog ?? props.COG ?? props.course ?? props.COURSE ?? posReport.Cog ?? 0) || 0;
      const heading = parseFloat(props.heading ?? props.HEADING ?? props.true_heading ?? posReport.TrueHeading ?? cog) || 0;
      const navStatus = parseInt(props.nav_status ?? props.NAVSTAT ?? props.navstat ?? posReport.NavigationalStatus ?? 0, 10) || 0;

      const nome = String(
        props.nome ?? props.shipname ?? props.SHIPNAME ?? props.vessel_name ?? props.name ?? meta.ShipName ?? `MMSI ${mmsi}`
      ).trim();

      const infoTipo = mapearTipoEmbarcacaoITU(
        props.tipo ?? props.shiptype ?? props.SHIPTYPE ?? props.vessel_type ?? props.tipo_codigo
      );

      const timestamp = String(
        props.timestamp ?? props.TIMESTAMP ?? props.last_pos_utc ?? props.time_utc ?? meta.time_utc ?? new Date().toISOString()
      );

      return {
        mmsi,
        imo: String(props.imo ?? props.IMO ?? props.imo_number ?? ''),
        nome,
        tipo_codigo: infoTipo.codigo,
        tipo: infoTipo.nome,
        operador: String(props.operador ?? props.operator ?? props.owner ?? ''),
        bandeira: String(props.bandeira ?? props.flag ?? props.FLAG ?? props.country ?? 'BR'),
        comprimento_m: parseFloat(props.comprimento_m ?? props.length ?? props.LENGTH ?? 0) || 0,
        calado_m: parseFloat(props.calado_m ?? props.draught ?? props.DRAUGHT ?? props.draft ?? 0) || 0,
        timestamp,
        lat,
        lon,
        sog,
        cog,
        heading: heading === 511 ? cog : heading, // 511 = não disponível no padrão NMEA AIS
        nav_status: navStatus,
        porto_origem: String(props.porto_origem ?? props.origin ?? props.last_port ?? ''),
        porto_destino: String(props.porto_destino ?? props.destination ?? props.DESTINATION ?? ''),
        porto_proximo: String(props.porto_proximo ?? props.next_port ?? props.porto_destino ?? ''),
        eta: String(props.eta ?? props.ETA ?? props.eta_programada ?? ''),
        atraso_h: parseFloat(props.atraso_h ?? 0) || 0,
        status: String(props.status ?? 'no_prazo'),
        trecho_ven: String(props.trecho_ven ?? ''),
        dist_ven_km: parseFloat(props.dist_ven_km ?? 0) || 0,
        classificacao: String(props.classificacao ?? 'dentro')
      };
    },

    /**
     * Calcula aderência da posição AIS à malha hidroviária oficial do VEN em tempo real.
     */
    enriquecerComCruzamentoVEN: function (pos) {
      if (!this.config.calcularCruzamentoVEN || typeof turf === 'undefined') return pos;
      if (pos.trecho_ven && pos.dist_ven_km > 0) return pos;

      const brutos = window.DADOS_GEOJSON_BRUTOS || {};
      const venGeojson = brutos['ven_2024'] || brutos['ven_2022'];
      if (!venGeojson || !Array.isArray(venGeojson.features) || !venGeojson.features.length) return pos;

      try {
        const pt = turf.point([pos.lon, pos.lat]);
        let menorDist = Infinity;
        let trechoMaisProximo = '';

        for (let i = 0; i < venGeojson.features.length; i++) {
          const f = venGeojson.features[i];
          if (!f.geometry) continue;
          // Filtro rápido por bbox aproximado (2 graus ~ 220km)
          const coords = f.geometry.coordinates;
          if (Array.isArray(coords) && coords.length > 0) {
            const c0 = Array.isArray(coords[0][0]) ? coords[0][0] : coords[0];
            if (Array.isArray(c0) && (Math.abs(c0[0] - pos.lon) > 3 || Math.abs(c0[1] - pos.lat) > 3)) {
              continue;
            }
          }
          const d = turf.pointToLineDistance(pt, f, { units: 'kilometers' });
          if (d < menorDist) {
            menorDist = d;
            const p = f.properties || {};
            trechoMaisProximo = p.nome_rio || p.NOME_RIO || p.hidrovia || p.mun_origem || 'Trecho VEN';
          }
        }

        if (isFinite(menorDist)) {
          pos.dist_ven_km = Number(menorDist.toFixed(2));
          pos.trecho_ven = trechoMaisProximo;
          pos.classificacao = menorDist <= 2.0 ? 'dentro' : (menorDist <= 5.0 ? 'atencao' : 'fora');
        }
      } catch (e) {}
      return pos;
    },

    /**
     * Busca um lote de posições via HTTP REST (ANTAQ, SISTRAM, MarineTraffic, Spire, etc.)
     */
    buscarLoteREST: async function () {
      if (!this.config.urlPosicoes) {
        throw new Error('URL da API AIS não configurada');
      }

      const headers = { 'Accept': 'application/json' };
      if (this.config.apiKey) {
        if (this.config.authHeader.toLowerCase() === 'authorization') {
          headers['Authorization'] = this.config.apiKey.startsWith('Bearer ')
            ? this.config.apiKey
            : `Bearer ${this.config.apiKey}`;
        } else {
          headers[this.config.authHeader] = this.config.apiKey;
        }
      }

      let url = this.config.urlPosicoes;
      if (this.config.bboxFiltro && Array.isArray(this.config.bboxFiltro) && !url.includes('bbox=')) {
        const sep = url.includes('?') ? '&' : '?';
        url = `${url}${sep}bbox=${this.config.bboxFiltro.join(',')}`;
      }

      const res = await fetch(url, { headers, cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} ao consultar API AIS`);

      const payload = await res.json();

      // Extrai lista de registros independente do envelope do fornecedor
      let listaBruta = [];
      if (Array.isArray(payload)) {
        listaBruta = payload;
      } else if (payload.type === 'FeatureCollection' && Array.isArray(payload.features)) {
        listaBruta = payload.features;
      } else if (Array.isArray(payload.data)) {
        listaBruta = payload.data;
      } else if (Array.isArray(payload.vessels)) {
        listaBruta = payload.vessels;
      } else if (Array.isArray(payload.records)) {
        listaBruta = payload.records;
      }

      const normalizados = [];
      for (let i = 0; i < listaBruta.length; i++) {
        const item = this.normalizarMensagemAIS(listaBruta[i]);
        if (item) {
          this.enriquecerComCruzamentoVEN(item);
          normalizados.push(item);
        }
      }

      this._estatisticas.ultimaSincronizacao = new Date().toISOString();
      this._estatisticas.mensagensRecebidas += normalizados.length;
      this._estatisticas.embarcacoesAtivas = new Set(normalizados.map(n => n.mmsi)).size;
      this._estatisticas.errosConsecutivos = 0;
      this._estatisticas.statusConexao = 'conectado_rest';

      this._injetarNoAISManager(normalizados);
      return normalizados;
    },

    /**
     * Injeta posições recebidas em tempo real dentro do AISManager e atualiza o mapa.
     */
    _injetarNoAISManager: function (registros) {
      if (!window.AISManager || !Array.isArray(registros) || !registros.length) return;

      registros.forEach(reg => {
        // Atualiza cadastro se a embarcação for nova
        if (!window.AISManager._cadastro.has(reg.mmsi)) {
          window.AISManager._cadastro.set(reg.mmsi, {
            mmsi: reg.mmsi,
            imo: reg.imo,
            nome: reg.nome,
            tipo_codigo: reg.tipo_codigo,
            tipo: reg.tipo,
            operador: reg.operador,
            bandeira: reg.bandeira,
            comprimento_m: reg.comprimento_m,
            calado_m: reg.calado_m,
            ano_construcao: 0,
            perfil: reg.tipo
          });
          window.AISManager._tipos[reg.mmsi] = reg.tipo;
        }

        // Adiciona ao histórico de posições e atualiza última posição conhecida
        window.AISManager._posicoes.push(reg);
        const atual = window.AISManager._ultimaPorMmsi.get(reg.mmsi);
        if (!atual || reg.timestamp >= atual.timestamp) {
          window.AISManager._ultimaPorMmsi.set(reg.mmsi, reg);
        }
      });

      window.AISManager._pronto = true;
      if (window.AISManager._visivel && typeof window.AISManager._renderizar === 'function') {
        window.AISManager._renderizar();
      }
      window.dispatchEvent(new CustomEvent('ais:telemetria-atualizada', {
        detail: { recebidos: registros.length, totalBarcos: window.AISManager._cadastro.size }
      }));
    },

    /**
     * Inicia o monitoramento contínuo (via Polling REST ou WebSocket Stream).
     */
    iniciarMonitoramento: function () {
      this.pararMonitoramento();

      if (this.config.provedor === 'WEBSOCKET_STREAM' && this.config.wsUrl) {
        try {
          this._ws = new WebSocket(this.config.wsUrl);
          this._estatisticas.statusConexao = 'conectando_ws';

          this._ws.onopen = () => {
            this._estatisticas.statusConexao = 'conectado_ws';
            console.info('[AISAPIConnector] WebSocket AIS conectado:', this.config.wsUrl);
            if (this.config.apiKey) {
              this._ws.send(JSON.stringify({
                APIKey: this.config.apiKey,
                BoundingBoxes: [[
                  [this.config.bboxFiltro[1], this.config.bboxFiltro[0]],
                  [this.config.bboxFiltro[3], this.config.bboxFiltro[2]]
                ]]
              }));
            }
          };

          this._ws.onmessage = (evt) => {
            try {
              const raw = JSON.parse(evt.data);
              const norm = this.normalizarMensagemAIS(raw);
              if (norm) {
                this.enriquecerComCruzamentoVEN(norm);
                this._estatisticas.mensagensRecebidas++;
                this._estatisticas.ultimaSincronizacao = new Date().toISOString();
                this._injetarNoAISManager([norm]);
              }
            } catch (e) {}
          };

          this._ws.onerror = () => {
            this._estatisticas.statusConexao = 'erro_ws';
          };
        } catch (errWs) {
          console.warn('[AISAPIConnector] Falha ao iniciar WebSocket:', errWs);
        }
        return;
      }

      if (this.config.urlPosicoes) {
        const ms = Math.max(10, Number(this.config.intervaloSegundos) || 60) * 1000;
        this.buscarLoteREST().catch(err => {
          this._estatisticas.errosConsecutivos++;
          this._estatisticas.statusConexao = 'fallback_local';
          console.warn('[AISAPIConnector] Polling inicial falhou (mantendo base local):', err.message);
        });

        this._timerPolling = setInterval(() => {
          this.buscarLoteREST().catch(() => {
            this._estatisticas.errosConsecutivos++;
          });
        }, ms);
      }
    },

    pararMonitoramento: function () {
      if (this._timerPolling) {
        clearInterval(this._timerPolling);
        this._timerPolling = null;
      }
      if (this._ws) {
        try { this._ws.close(); } catch (e) {}
        this._ws = null;
      }
      this._estatisticas.statusConexao = 'standby_local';
    },

    obterStatus: function () {
      return {
        config: this.config,
        estatisticas: this._estatisticas
      };
    }
  };

  AISAPIConnector.init();
  window.AISAPIConnector = AISAPIConnector;
})();
