/* ============================================================
   WebGIS Corporativo ANTAQ — Módulo: BatimetriaTINManager
   Escopo: Upload de nuvens de pontos batimétricos (X Y Z),
           escolha de separador (Espaço, Vírgula, Ponto-e-Vírgula, Tab),
           conversão geodésica UTM -> SIRGAS 2000 / WGS84 (padrão UTM 22S)
           e Interpolação TIN (Triangulated Irregular Network) restrita
           à área dos pontos (ancorada das extremidades para o interior).
   Dependências: window.mapa, window.CAMADAS_MAPA, window.CONFIG_CAMADAS,
                 window.DADOS_GEOJSON_BRUTOS, window.UI, turf (global)
   Expõe: window.BatimetriaTINManager
   ============================================================ */
(function () {
  'use strict';

  const BatimetriaTINManager = {
    _textoBruto: '',
    _nomeArquivo: '',
    _contadorCamadas: 0,
    _ultimoResultadoGeoJSON: null,

    // Tabela de faixas batimétricas (metros)
    FAIXAS_CORES: [
      { max: 2.5,  cor: '#dc2626', rotulo: 'Crítico / Banco (< 2,5 m)' },
      { max: 4.5,  cor: '#f97316', rotulo: 'Atenção / Raso (2,5 – 4,5 m)' },
      { max: 7.0,  cor: '#eab308', rotulo: 'Transição / Talude (4,5 – 7,0 m)' },
      { max: 11.0, cor: '#38bdf8', rotulo: 'Canal Operacional (7,0 – 11,0 m)' },
      { max: 16.0, cor: '#0284c7', rotulo: 'Canal Profundo (11,0 – 16,0 m)' },
      { max: Infinity, cor: '#1e3a8a', rotulo: 'Calha / Talvegue (> 16,0 m)' }
    ],

    abrirModal: function () {
      const modal = document.getElementById('modal-batimetria-tin');
      if (!modal) return;
      modal.classList.add('aberto');
      this.atualizarPreview();
    },

    fecharModal: function () {
      const modal = document.getElementById('modal-batimetria-tin');
      if (modal) modal.classList.remove('aberto');
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
          // Mostra até os primeiros 15.000 caracteres na caixa de texto para não travar o DOM em arquivos gigantes
          txtArea.value = this._textoBruto.length > 15000
            ? this._textoBruto.slice(0, 15000) + `\n# ... [Arquivo completo em memória: ${this._textoBruto.split(/\r?\n/).length} linhas]`
            : this._textoBruto;
        }
        this.autoDetectarSeparador(this._textoBruto);
        this.atualizarPreview();
      };
      reader.readAsText(file, 'utf-8');
    },

    aoDigitarTexto: function (val) {
      if (!val.includes('# ... [Arquivo completo em memória:')) {
        this._textoBruto = val;
      }
      this.atualizarPreview();
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

    /**
     * Conversão Geodésica Analítica (Série de Redfearn / Snyder)
     * Converte coordenadas planas UTM (Easting X, Northing Y) em SIRGAS 2000 / WGS84 (Elipsoide GRS80)
     * para Latitude e Longitude em graus decimais com precisão submilimétrica.
     */
    utmParaLatLon: function (easting, northing, zona, hemisferioSul) {
      const a = 6378137.0; // Semi-eixo maior GRS80 / SIRGAS 2000
      const f = 1 / 298.257222101;
      const k0 = 0.9996;
      const eSq = f * (2 - f);
      const ePrimeSq = eSq / (1 - eSq);
      const e1 = (1 - Math.sqrt(1 - eSq)) / (1 + Math.sqrt(1 - eSq));

      const x = easting - 500000.0;
      const y = hemisferioSul ? (northing - 10000000.0) : northing;

      const lonOrigin = (zona - 1) * 6 - 180 + 3; // Meridiano central da zona UTM

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

      const lat = latRad * (180 / Math.PI);
      const lon = lonOrigin + lonRad * (180 / Math.PI);
      return { lat, lon };
    },

    _parseNumero: function (str, separadorEscolhido) {
      if (str === undefined || str === null) return NaN;
      let s = String(str).trim();
      if (!s) return NaN;
      // Se o separador de colunas NÃO for vírgula, aceita vírgula como separador decimal (ex: 684320,45)
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

      const linhas = fonte.split(/\r?\n/);
      const pontos = [];

      let regexSep = /\s+/;
      if (sep === 'virgula') regexSep = /\s*,\s*/;
      else if (sep === 'ponto_virgula') regexSep = /\s*;\s*/;
      else if (sep === 'tab') regexSep = /\t+/;
      else if (sep === 'auto') regexSep = /[\s,;\t]+/;

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
        if (crs.startsWith('UTM_')) {
          // Ex: UTM_22S ou UTM_22N
          const m = crs.match(/UTM_(\d+)([SN])/);
          const zona = m ? parseInt(m[1], 10) : 22;
          const sul = m ? (m[2] === 'S') : true;
          if (x < 100000 || x > 950000 || y < 0 || y > 10500000) continue;
          const conv = this.utmParaLatLon(x, y, zona, sul);
          lat = conv.lat;
          lon = conv.lon;
        } else {
          // Geográfico (SIRGAS 2000 / WGS84)
          if (Math.abs(lat) > 90 && Math.abs(lon) <= 90) {
            const tmp = lat; lat = lon; lon = tmp;
          }
          if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
        }

        pontos.push({ x, y, z, lat, lon });
        if (limiteAmostra > 0 && pontos.length >= limiteAmostra) break;
      }

      return pontos;
    },

    atualizarPreview: function () {
      const box = document.getElementById('bat-preview-corpo');
      if (!box) return;

      const todos = this._extrairPontos(0);
      if (todos.length === 0) {
        box.innerHTML = `<div style="color:#94a3b8; font-style:italic;">Carregue um arquivo <strong>X Y Z</strong>, cole os dados abaixo ou clique em <strong>"🧪 Carregar Exemplo UTM 22S"</strong> para visualizar a conversão.</div>`;
        return;
      }

      const amostra = todos.slice(0, 4);
      let zMin = Infinity, zMax = -Infinity;
      for (const p of todos) {
        if (p.z < zMin) zMin = p.z;
        if (p.z > zMax) zMax = p.z;
      }

      const linhasHtml = amostra.map((p, idx) => `
        <tr>
          <td style="color:#94a3b8;">#${idx + 1}</td>
          <td style="font-family:monospace;">${p.x.toFixed(2)}</td>
          <td style="font-family:monospace;">${p.y.toFixed(2)}</td>
          <td style="font-family:monospace; color:#38bdf8; font-weight:700;">${p.z.toFixed(2)} m</td>
          <td style="font-family:monospace; color:#a7f3d0;">${p.lat.toFixed(5)}°, ${p.lon.toFixed(5)}°</td>
        </tr>
      `).join('');

      box.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
          <span>✅ <strong style="color:#38bdf8;">${todos.length.toLocaleString('pt-BR')}</strong> pontos batimétricos válidos reconhecidos</span>
          <span>🌊 Profundidade: <strong>${zMin.toFixed(2)} m</strong> a <strong>${zMax.toFixed(2)} m</strong></span>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:10.5px; text-align:left;">
          <thead>
            <tr style="border-bottom:1px solid #1e4976; color:#94a3b8;">
              <th>Pt</th><th>X (Original)</th><th>Y (Original)</th><th>Z (Prof.)</th><th>Convertido (SIRGAS 2000 Lat/Lon)</th>
            </tr>
          </thead>
          <tbody>${linhasHtml}</tbody>
        </table>
      `;
    },

    /**
     * Gera um conjunto realista de batimetria ecobatimétrica em UTM 22 Sul (EPSG:31982)
     * separado por espaço (X Y Z), simulando um trecho de canal hidroviário sinuoso com
     * margens rasas (extremidades), talude e canal profundo (talvegue) + banco raso (pedral).
     */
    carregarExemploUTM22S: function () {
      // Coordenadas UTM 22S (região hidroviária Tocantins / Pará - Meridiano Central -51°)
      const baseE = 668000;
      const baseN = 9715000;
      const linhasXYZ = [
        '# Levantamento Ecobatimétrico — Seções Transversais (Projeção: SIRGAS 2000 / UTM Zona 22S)',
        '# Formato: X(Easting_m) Y(Northing_m) Z(Profundidade_m) — Separado por Espaço'
      ];

      // 18 seções transversais ao longo de 2,4 km de rio sinuoso, cada seção com 9 pontos (da margem esquerda à margem direita)
      const numSecoes = 18;
      const passoLongo = 140; // 140m entre seções
      const larguraMeio = 220; // 440m de largura total do canal

      for (let s = 0; s < numSecoes; s++) {
        const prog = s / (numSecoes - 1);
        const centroN = baseN + s * passoLongo;
        // Curva suave (meandro) em X
        const centroE = baseE + Math.sin(prog * Math.PI * 1.4) * 320;
        // Direção tangente e normal para orientar a seção transversal
        const dEdS = Math.cos(prog * Math.PI * 1.4) * (Math.PI * 1.4 / ((numSecoes - 1) * passoLongo)) * 320;
        const ang = Math.atan2(dEdS, 1);
        const cosA = Math.cos(ang), sinA = Math.sin(ang);

        for (let p = -4; p <= 4; p++) {
          const frac = p / 4; // -1 (extremidade esquerda) até +1 (extremidade direita)
          const offset = frac * larguraMeio;
          const x = centroE + offset * cosA;
          const y = centroN - offset * sinA;

          // Perfil transversal parabólico (margens rasas ~1.2m nas extremidades -> talvegue ~13.5m no centro)
          let prof = 1.2 + (1 - frac * frac) * 12.5;

          // Simula um alto-fundo / pedral crítico entre as seções 7 e 10
          if (s >= 7 && s <= 10 && Math.abs(frac) <= 0.5) {
            prof = 2.1 + Math.abs(frac) * 1.8;
          }

          linhasXYZ.push(`${x.toFixed(2)} ${y.toFixed(2)} ${prof.toFixed(2)}`);
        }
      }

      this._textoBruto = linhasXYZ.join('\n');
      this._nomeArquivo = 'batimetria_canal_utm22s';

      const txtArea = document.getElementById('bat-texto-xyz');
      if (txtArea) txtArea.value = this._textoBruto;
      const selSep = document.getElementById('bat-separador');
      if (selSep) selSep.value = 'espaco';
      const selProj = document.getElementById('bat-projecao');
      if (selProj) selProj.value = 'UTM_22S';
      const lbl = document.getElementById('bat-nome-arquivo');
      if (lbl) lbl.textContent = '🧪 batimetria_canal_utm22s.xyz (162 pontos em UTM 22S)';

      this.atualizarPreview();
      if (window.UI) window.UI.toast('🧪 Dados de exemplo em UTM 22S (X Y Z separados por espaço) carregados!');
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

    /**
     * Identifica os pontos das extremidades (borda côncava / perímetro da nuvem)
     * e densifica os segmentos da borda externa para ancorar a triangulação
     * das extremidades para dentro da geometria.
     */
    _ancorarExtremidadesParaDentro: function (pontos, maxArestaMetros) {
      if (pontos.length < 6 || typeof turf === 'undefined') return pontos;

      try {
        const fcPts = turf.featureCollection(
          pontos.map((p, idx) => turf.point([p.lon, p.lat], { z: p.z, idx }))
        );

        // Calcula envoltória côncava (ou convexa como fallback) para capturar o perímetro externo
        let hull = null;
        try {
          hull = turf.concave(fcPts, { maxEdge: Math.max(0.3, (maxArestaMetros * 1.5) / 1000), units: 'kilometers' });
        } catch (_) {}
        if (!hull || !hull.geometry) {
          try { hull = turf.convex(fcPts); } catch (_) {}
        }
        if (!hull || !hull.geometry) return pontos;

        const coordsBorda = hull.geometry.type === 'Polygon'
          ? hull.geometry.coordinates[0]
          : (hull.geometry.type === 'MultiPolygon' ? hull.geometry.coordinates[0][0] : []);

        if (!coordsBorda || coordsBorda.length < 4) return pontos;

        // Para cada segmento da extremidade (borda), se a distância entre dois vértices de borda
        // for grande mas menor que maxArestaMetros, insere um ponto sintético de costura na borda
        // com Z interpolado entre os dois vértices da extremidade (forçando os triângulos a crescerem da borda para dentro)
        const pontosExtrasBorda = [];
        const passoDensificacao = Math.max(40, maxArestaMetros * 0.45);

        const acharZMaisProximo = (lon, lat) => {
          let melhorZ = pontos[0].z;
          let menorD = Infinity;
          for (let i = 0; i < pontos.length; i++) {
            const d = (pontos[i].lon - lon) * (pontos[i].lon - lon) + (pontos[i].lat - lat) * (pontos[i].lat - lat);
            if (d < menorD) {
              menorD = d;
              melhorZ = pontos[i].z;
            }
          }
          return melhorZ;
        };

        for (let i = 0; i < coordsBorda.length - 1; i++) {
          const [lon1, lat1] = coordsBorda[i];
          const [lon2, lat2] = coordsBorda[i + 1];
          const distM = this._haversineMetros(lon1, lat1, lon2, lat2);

          if (distM > passoDensificacao && distM <= maxArestaMetros * 1.15) {
            const z1 = acharZMaisProximo(lon1, lat1);
            const z2 = acharZMaisProximo(lon2, lat2);
            const nSub = Math.min(4, Math.floor(distM / passoDensificacao));
            for (let k = 1; k <= nSub; k++) {
              const t = k / (nSub + 1);
              pontosExtrasBorda.push({
                x: 0,
                y: 0,
                lon: lon1 + (lon2 - lon1) * t,
                lat: lat1 + (lat2 - lat1) * t,
                z: z1 + (z2 - z1) * t,
                _bordaCostura: true
              });
            }
          }
        }

        return pontos.concat(pontosExtrasBorda);
      } catch (e) {
        return pontos;
      }
    },

    _corPorProfundidade: function (z) {
      for (const faixa of this.FAIXAS_CORES) {
        if (z <= faixa.max) return faixa.cor;
      }
      return '#1e3a8a';
    },

    _rotuloFaixa: function (z) {
      for (const faixa of this.FAIXAS_CORES) {
        if (z <= faixa.max) return faixa.rotulo;
      }
      return 'Calha / Talvegue (> 16,0 m)';
    },

    /**
     * Executa a Interpolação TIN restrita à área dos pontos (das extremidades para o interior)
     * e adiciona como camada interativa no mapa e no Painel de Camadas.
     */
    executarInterpolacaoTIN: function () {
      if (typeof turf === 'undefined' || typeof turf.tin !== 'function') {
        if (window.UI) window.UI.toast('⚠️ Biblioteca geométrica Turf.js indisponível.', 'erro');
        return;
      }

      const pontosBrutos = this._extrairPontos(0);
      if (pontosBrutos.length < 3) {
        if (window.UI) window.UI.toast('⚠️ Forneça pelo menos 3 pontos válidos (X Y Z) para gerar a malha TIN.', 'erro');
        return;
      }

      // Se a nuvem tiver mais de 6.000 pontos, faz decimação inteligente preservando extremos
      let pontos = pontosBrutos;
      if (pontosBrutos.length > 6000) {
        const passo = Math.ceil(pontosBrutos.length / 6000);
        pontos = pontosBrutos.filter((_, idx) => idx % passo === 0 || idx === pontosBrutos.length - 1);
      }

      // Calcula espaçamento característico dos pontos para definir o raio máximo de restrição de borda (Alpha-Shape)
      const inputMaxAresta = parseFloat(document.getElementById('bat-max-aresta')?.value || '0');
      let maxArestaMetros = inputMaxAresta;

      if (!maxArestaMetros || maxArestaMetros <= 0) {
        // Estima automaticamente a distância típica entre pontos vizinhos
        const dists = [];
        const am = Math.min(pontos.length, 120);
        for (let i = 0; i < am; i++) {
          let menor = Infinity;
          for (let j = 0; j < pontos.length; j++) {
            if (i === j) continue;
            const d = this._haversineMetros(pontos[i].lon, pontos[i].lat, pontos[j].lon, pontos[j].lat);
            if (d > 0.1 && d < menor) menor = d;
          }
          if (Number.isFinite(menor)) dists.push(menor);
        }
        dists.sort((a, b) => a - b);
        const mediana = dists.length ? dists[Math.floor(dists.length * 0.75)] : 150;
        maxArestaMetros = Math.max(80, Math.min(2500, mediana * 2.8));
      }

      // 1. Ancora as extremidades para dentro da geometria (densificação de borda côncava)
      const pontosAncorados = this._ancorarExtremidadesParaDentro(pontos, maxArestaMetros);

      // 2. Monta FeatureCollection para turf.tin
      const fcPontos = turf.featureCollection(
        pontosAncorados.map(p => turf.point([p.lon, p.lat], { z: Number(p.z.toFixed(3)) }))
      );

      // 3. Gera a Triangulação de Delaunay (TIN)
      const tinBruto = turf.tin(fcPontos, 'z');
      if (!tinBruto || !Array.isArray(tinBruto.features) || tinBruto.features.length === 0) {
        if (window.UI) window.UI.toast('⚠️ Não foi possível triangular os pontos informados.', 'erro');
        return;
      }

      // 4. Restringe a malha à área estrita dos pontos (remove triângulos espúrios que cruzam margens secas)
      const triangulosValidos = [];
      let areaTotalM2 = 0;
      let zMinGlobal = Infinity, zMaxGlobal = -Infinity, somaZ = 0;
      let qtdCriticos = 0;

      for (const tri of tinBruto.features) {
        const ring = tri.geometry?.coordinates?.[0];
        if (!ring || ring.length < 4) continue;

        const d1 = this._haversineMetros(ring[0][0], ring[0][1], ring[1][0], ring[1][1]);
        const d2 = this._haversineMetros(ring[1][0], ring[1][1], ring[2][0], ring[2][1]);
        const d3 = this._haversineMetros(ring[2][0], ring[2][1], ring[0][0], ring[0][1]);
        const maiorLado = Math.max(d1, d2, d3);

        // Poda de borda (Alpha-Shape / Concave Restriction): descarta triângulos com aresta > maxArestaMetros
        if (maiorLado > maxArestaMetros) continue;

        const zA = Number(tri.properties?.a ?? 0);
        const zB = Number(tri.properties?.b ?? 0);
        const zC = Number(tri.properties?.c ?? 0);
        const zMedio = +((zA + zB + zC) / 3).toFixed(2);
        const zMinTri = +Math.min(zA, zB, zC).toFixed(2);
        const zMaxTri = +Math.max(zA, zB, zC).toFixed(2);
        const desnivel = +(zMaxTri - zMinTri).toFixed(2);

        if (zMinTri < zMinGlobal) zMinGlobal = zMinTri;
        if (zMaxTri > zMaxGlobal) zMaxGlobal = zMaxTri;
        somaZ += zMedio;
        if (zMedio <= 2.5) qtdCriticos++;

        let areaTri = 0;
        try { areaTri = turf.area(tri); } catch (_) {}
        areaTotalM2 += areaTri;

        const cor = this._corPorProfundidade(zMedio);
        const classificacao = this._rotuloFaixa(zMedio);

        tri.properties = {
          nome: `Face Batimétrica TIN (${zMedio.toFixed(2)} m)`,
          profundidade_media_m: zMedio,
          profundidade_min_m: zMinTri,
          profundidade_max_m: zMaxTri,
          variacao_cota_m: desnivel,
          classificacao_calado: classificacao,
          maior_aresta_m: +maiorLado.toFixed(1),
          area_m2: Math.round(areaTri),
          _cor_tin: cor
        };

        triangulosValidos.push(tri);
      }

      if (triangulosValidos.length === 0) {
        if (window.UI) {
          window.UI.toast(`⚠️ Todos os triângulos excederam a aresta máxima (${Math.round(maxArestaMetros)} m). Aumente o valor de Aresta Máxima.`, 'alerta');
        }
        return;
      }

      const mostrarPontos = document.getElementById('bat-mostrar-pontos')?.checked !== false;
      const resultadoGeoJSON = {
        type: 'FeatureCollection',
        features: triangulosValidos
      };
      this._ultimoResultadoGeoJSON = resultadoGeoJSON;

      // 5. Cria e plota a camada no Leaflet e registra no Painel de Camadas
      this._contadorCamadas++;
      const idCamada = `bat_tin_${Date.now()}`;
      const crsLabel = document.getElementById('bat-projecao')?.selectedOptions?.[0]?.text?.split('—')?.[0]?.trim() || 'UTM 22S';
      const nomeCamada = `🌊 TIN Batimétrico (${this._nomeArquivo || crsLabel})`;

      if (window.mapa && !window.mapa.getPane('paneBatimetria')) {
        const pBat = window.mapa.createPane('paneBatimetria');
        pBat.style.zIndex = 485;
      }

      const grupoFinal = L.featureGroup();

      const layerTIN = L.geoJSON(resultadoGeoJSON, {
        pane: 'paneBatimetria',
        interactive: true,
        style: (f) => ({
          pane: 'paneBatimetria',
          color: f.properties._cor_tin,
          weight: 0.7,
          opacity: 0.85,
          fillColor: f.properties._cor_tin,
          fillOpacity: 0.78
        }),
        onEachFeature: (f, layer) => {
          const p = f.properties;
          const html = `
            <div class="pop-topo" style="background:linear-gradient(135deg, #0a2540 0%, ${p._cor_tin} 100%);">
              🌊 Superfície Batimétrica TIN
            </div>
            <div class="pop-corpo">
              <div style="background:${p._cor_tin}22; border-left:4px solid ${p._cor_tin}; padding:8px 10px; border-radius:6px; margin-bottom:8px;">
                <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700;">Profundidade Interpolada (Face TIN)</div>
                <div style="font-size:20px; font-weight:800; color:${p._cor_tin};">${p.profundidade_media_m.toFixed(2)} m</div>
                <div style="font-size:10.5px; color:#334155; font-weight:600;">${p.classificacao_calado}</div>
              </div>
              <div class="pop-linha"><span class="pop-lbl">Vértice Mínimo:</span><span class="pop-val">${p.profundidade_min_m.toFixed(2)} m</span></div>
              <div class="pop-linha"><span class="pop-lbl">Vértice Máximo:</span><span class="pop-val">${p.profundidade_max_m.toFixed(2)} m</span></div>
              <div class="pop-linha"><span class="pop-lbl">Desnível na Face:</span><span class="pop-val">${p.variacao_cota_m.toFixed(2)} m</span></div>
              <div class="pop-linha"><span class="pop-lbl">Maior Aresta:</span><span class="pop-val">${p.maior_aresta_m} m</span></div>
              <div class="pop-linha"><span class="pop-lbl">Área do Triângulo:</span><span class="pop-val">${p.area_m2.toLocaleString('pt-BR')} m²</span></div>
            </div>
          `;
          layer.bindPopup(html, { maxWidth: 320 });
          layer.on('click', (e) => {
            if (window.MeasurementTool && window.MeasurementTool.modo) return;
            try { if (!layer.isPopupOpen()) layer.openPopup(e.latlng); } catch (_) {}
            if (window.SelectionManager && typeof window.SelectionManager.selecionarUnica === 'function') {
              window.SelectionManager.selecionarUnica(f, idCamada);
            }
          });
        }
      });

      grupoFinal.addLayer(layerTIN);

      // Opcionalmente adiciona os pontos de sondagem originais sobre a malha TIN
      if (mostrarPontos && pontos.length <= 1500) {
        pontos.forEach((pt, idx) => {
          const corPt = this._corPorProfundidade(pt.z);
          const cm = L.circleMarker([pt.lat, pt.lon], {
            pane: 'panePontos',
            radius: 3.5,
            color: '#ffffff',
            weight: 1,
            fillColor: corPt,
            fillOpacity: 0.95
          });
          cm.bindPopup(`
            <div class="pop-topo">📍 Ponto de Sondagem #${idx + 1}</div>
            <div class="pop-corpo">
              <div class="pop-linha"><span class="pop-lbl">Profundidade (Z):</span><span class="pop-val"><strong>${pt.z.toFixed(2)} m</strong></span></div>
              <div class="pop-linha"><span class="pop-lbl">Coord. Origem (X, Y):</span><span class="pop-val">${pt.x.toFixed(2)}, ${pt.y.toFixed(2)}</span></div>
              <div class="pop-linha"><span class="pop-lbl">SIRGAS 2000:</span><span class="pop-val">${pt.lat.toFixed(5)}°, ${pt.lon.toFixed(5)}°</span></div>
            </div>
          `);
          grupoFinal.addLayer(cm);
        });
      }

      grupoFinal.addTo(window.mapa);

      // Registra no estado global para funcionar na Tabela de Atributos, Exportação, Seleção e Nota Técnica
      window.DADOS_GEOJSON_BRUTOS[idCamada] = resultadoGeoJSON;
      window.CAMADAS_MAPA[idCamada] = grupoFinal;
      window.CONFIG_CAMADAS[idCamada] = {
        nome: nomeCamada,
        grupo: 'importadas',
        cor: '#0284c7',
        opacidade: 0.80,
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
        const bounds = layerTIN.getBounds();
        if (bounds && bounds.isValid()) {
          window.mapa.fitBounds(bounds.pad(0.15));
        }
      } catch (_) {}

      const mediaGlobal = (somaZ / triangulosValidos.length).toFixed(2);
      const areaHa = (areaTotalM2 / 10000).toFixed(1);

      this.fecharModal();
      if (window.UI) {
        window.UI.toast(`🌊 Malha TIN gerada: ${triangulosValidos.length} triângulos (${areaHa} ha) | Prof. média: ${mediaGlobal} m (${qtdCriticos} faces críticas ≤ 2,5 m).`);
      }
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
      a.download = `${this._nomeArquivo || 'batimetria_tin'}_antaq.geojson`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  window.BatimetriaTINManager = BatimetriaTINManager;
  console.info('[js] BatimetriaTINManager carregado (Upload XYZ + Conversão UTM -> SIRGAS 2000 + Interpolação TIN)');
})();
