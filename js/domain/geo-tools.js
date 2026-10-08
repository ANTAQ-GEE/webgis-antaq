/* ============================================================
   WebGIS ANTAQ — Módulo: GeoTools (M10)
   Escopo: geoprocessamento (intersecção, diferença, união)
   Dependências: window.DADOS_GEOJSON_BRUTOS, window.CONFIG_CAMADAS,
                 window.CAMADAS_MAPA, window.LayerRegistry, window.UI,
                 window.Security, window.Styler, window.FilterManager,
                 window.mapa, window.DataManager, turf (global)
   Expõe: window.GeoTools
   ============================================================ */
(function () {
  'use strict';

  const GeoTools = {
    _contador: 0,

    /* ============================================================
       UI — ABRIR / FECHAR MODAL
       ============================================================ */
    abrirModal: function () {
      const modal = document.getElementById('modal-geo');
      if (!modal) {
        console.error('[M10] Modal #modal-geo não encontrado no DOM');
        return;
      }

      this._popularSelects();
      this._configurarListeners();
      this._atualizarPreview();

      modal.classList.add('aberto');
    },

    fecharModal: function () {
      const modal = document.getElementById('modal-geo');
      if (modal) modal.classList.remove('aberto');
    },

    _configurarListeners: function () {
      const selA = document.getElementById('geo-camada-a');
      const selB = document.getElementById('geo-camada-b');
      const selOp = document.getElementById('geo-operacao');

      if (selA && !selA._geoListeners) {
        selA.addEventListener('change', () => this._atualizarPreview());
        selA._geoListeners = true;
      }
      if (selB && !selB._geoListeners) {
        selB.addEventListener('change', () => this._atualizarPreview());
        selB._geoListeners = true;
      }
      if (selOp && !selOp._geoListeners) {
        selOp.addEventListener('change', () => this._atualizarPreview());
        selOp._geoListeners = true;
      }

      // ✅ Radios visuais controlam o select oculto E forçam refresh do preview
      document.querySelectorAll('input[name="geo-op"]').forEach(radio => {
        if (radio._geoListeners) return;
        radio.addEventListener('change', (e) => {
          if (selOp) selOp.value = e.target.value;
          // Força reprocessamento mesmo se o value não mudou (edge case)
          setTimeout(() => this._atualizarPreview(), 10);
        });
        radio._geoListeners = true;
      });
      // ✅ Click nos labels dos radios também dispara preview
      document.querySelectorAll('.geo-op-opcao').forEach(label => {
        if (label._geoLabelListeners) return;
        label.addEventListener('click', () => {
          setTimeout(() => this._atualizarPreview(), 20);
        });
        label._geoLabelListeners = true;
      });
      const chkDis = document.getElementById('geo-dissolve');
      if (chkDis && !chkDis._geoListeners) {
        chkDis.addEventListener('change', () => this._atualizarPreview());
        chkDis._geoListeners = true;
      }
    },

    _popularSelects: function () {
      const selA = document.getElementById('geo-camada-a');
      const selB = document.getElementById('geo-camada-b');
      if (!selA || !selB) return;

      // Lista TODAS as camadas do CONFIG (mesmo não carregadas)
      const candidatas = [];
      for (const [id, cfg] of Object.entries(CONFIG_CAMADAS)) {
        // Ignora buffers/geos/importadas (evita selects poluídos)
        if (id.startsWith('buffer_') || id.startsWith('geo_') || id.startsWith('imp_')) continue;

        const carregada = DADOS_GEOJSON_BRUTOS[id]?.features?.length || 0;
        const nome = cfg.nome || id;
        const marca = carregada > 0 ? `(${carregada.toLocaleString('pt-BR')})` : '(carregar)';
        candidatas.push({ id, nome, n: carregada, label: `${nome} ${marca}` });
      }
      candidatas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      const valA = selA.value;
      const valB = selB.value;

      selA.innerHTML = '';
      selB.innerHTML = '';

      if (candidatas.length === 0) {
        selA.innerHTML = '<option value="">(Nenhuma camada disponível)</option>';
        selB.innerHTML = '<option value="">(Nenhuma camada disponível)</option>';
        return;
      }

      for (const c of candidatas) {
        const optA = document.createElement('option');
        optA.value = c.id;
        optA.textContent = c.label;
        selA.appendChild(optA);

        const optB = document.createElement('option');
        optB.value = c.id;
        optB.textContent = c.label;
        selB.appendChild(optB);
      }

      // Restaura ou escolhe defaults diferentes
      if (valA && candidatas.find(c => c.id === valA)) selA.value = valA;
      else selA.value = candidatas[0].id;

      if (valB && candidatas.find(c => c.id === valB) && valB !== selA.value) selB.value = valB;
      else {
        const outro = candidatas.find(c => c.id !== selA.value);
        selB.value = outro ? outro.id : candidatas[0].id;
      }

      console.log(`[M10] ${candidatas.length} camadas no select | A=${selA.value} B=${selB.value}`);
    },

    _atualizarPreview: function () {
      const preview = document.getElementById('geo-preview');
      if (!preview) return;

      const selA = document.getElementById('geo-camada-a');
      const selB = document.getElementById('geo-camada-b');
      const selOp = document.getElementById('geo-operacao');

      const idA = selA ? selA.value : '';
      const idB = selB ? selB.value : '';
      const op = (selOp && selOp.value) ? selOp.value : 'intersecao';

      if (!idA || !idB) {
        preview.innerHTML = '<em style="color:#64748b;">Selecione duas camadas.</em>';
        return;
      }
      if (idA === idB) {
        preview.innerHTML = '<em style="color:#f59e0b;">⚠️ Selecione camadas diferentes para A e B.</em>';
        return;
      }

      const nA = DADOS_GEOJSON_BRUTOS[idA]?.features?.length || 0;
      const nB = DADOS_GEOJSON_BRUTOS[idB]?.features?.length || 0;
      const nomeA = window.CONFIG_CAMADAS[idA]?.nome || idA;
      const nomeB = window.CONFIG_CAMADAS[idB]?.nome || idB;

      const operacoes = {
        'intersecao': '🔷 Intersecção',
        'diferenca': '🔶 Diferença (A - B)',
        'uniao': '🔗 União',
        'pontos_em': '🎯 Pontos em Polígono'
      };
      const nomeOp = operacoes[op] || '🔷 Intersecção';

      const pares = nA * nB;
      const pesado = pares > 50000;
      const carregadaA = nA > 0;
      const carregadaB = nB > 0;

      // ✅ Detecta tipos geométricos pra avisar incompatibilidades
      let avisoTipo = '';
      let tipoA = '?';
      let tipoB = '?';
      if (carregadaA && carregadaB && this._detectarTipoGeom) {
        tipoA = this._detectarTipoGeom(DADOS_GEOJSON_BRUTOS[idA].features);
        tipoB = this._detectarTipoGeom(DADOS_GEOJSON_BRUTOS[idB].features);

        const tipoLabel = { ponto: 'pontos', linha: 'linhas', poligono: 'polígonos', desconhecido: '?' };

        // Avisos específicos por operação
        if (op === 'pontos_em') {
          const valido = (tipoA === 'ponto' && tipoB === 'poligono') || (tipoA === 'poligono' && tipoB === 'ponto');
          if (!valido) {
            avisoTipo = `<div style="margin-top:8px;padding:6px 10px;background:rgba(239,68,68,0.15);border-left:3px solid #ef4444;border-radius:4px;font-size:10.5px;color:#fca5a5;">
              ⚠️ <strong>Combinação inválida.</strong> Esta operação precisa de <strong>pontos × polígonos</strong>.
              Você tem ${tipoLabel[tipoA] || '?'} × ${tipoLabel[tipoB] || '?'}.
            </div>`;
          } else {
            avisoTipo = `<div style="margin-top:8px;padding:6px 10px;background:rgba(16,185,129,0.15);border-left:3px solid #10b981;border-radius:4px;font-size:10.5px;color:#a7f3d0;">
              ✅ <strong>Compatível.</strong> ${tipoLabel[tipoA]} em ${tipoLabel[tipoB]}.
            </div>`;
          }
        } else if (op === 'intersecao') {
          if ((tipoA === 'ponto') !== (tipoB === 'ponto')) {
            avisoTipo = `<div style="margin-top:8px;padding:6px 10px;background:rgba(245,158,11,0.15);border-left:3px solid #f59e0b;border-radius:4px;font-size:10.5px;color:#fde68a;">
              ℹ️ Ponto × não-ponto <strong>não funciona com <code>turf.intersect</code></strong>.
              Use <strong>🎯 Pontos em</strong> se quiser filtrar pontos dentro de polígonos.
            </div>`;
          }
        }
      }

      const tipoLabel = { ponto: 'pontos', linha: 'linhas', poligono: 'polígonos', desconhecido: '?' };
      const tiposTexto = (carregadaA && carregadaB)
        ? `<div style="font-size:10px;color:#64748b;margin-bottom:6px;">
             A: <strong>${tipoLabel[tipoA] || '?'}</strong> · B: <strong>${tipoLabel[tipoB] || '?'}</strong>
           </div>`
        : '';

      preview.innerHTML = `
        <div style="font-size:11.5px;color:#cbd5e1;line-height:1.5;">
          <div style="font-weight:700;color:#fbbf24;margin-bottom:6px;">${nomeOp}</div>
          ${tiposTexto}
          <div>
            <strong style="color:#38bdf8;">${carregadaA ? nA.toLocaleString('pt-BR') : '?'}</strong>
            feições de <span style="color:#e2e8f0;">${window.Security.escapeHTML(nomeA)}</span>
            ${!carregadaA ? '<span style="color:#f59e0b;"> (será carregada)</span>' : ''}
          </div>
          <div>
            <strong style="color:#38bdf8;">${carregadaB ? nB.toLocaleString('pt-BR') : '?'}</strong>
            feições de <span style="color:#e2e8f0;">${window.Security.escapeHTML(nomeB)}</span>
            ${!carregadaB ? '<span style="color:#f59e0b;"> (será carregada)</span>' : ''}
          </div>
          ${carregadaA && carregadaB ? `
            <div style="margin-top:8px;font-size:10.5px;color:#64748b;">
              Pares a testar: <strong>${pares.toLocaleString('pt-BR')}</strong>
              ${pesado ? '<span style="color:#f59e0b;"> — pode demorar</span>' : ''}
            </div>
          ` : ''}
          ${avisoTipo}
        </div>
      `;
    },

    /* ============================================================
       MOTOR DE CÁLCULO
       ============================================================ */
    calcular: async function () {
      const selA = document.getElementById('geo-camada-a');
      const selB = document.getElementById('geo-camada-b');
      const selOp = document.getElementById('geo-operacao');
      const chkDissolve = document.getElementById('geo-dissolve');
      const btn = document.getElementById('btn-geo-calcular');

      const idA = selA?.value;
      const idB = selB?.value;
      const op = (selOp && selOp.value) ? selOp.value : 'intersecao';
      const dissolve = chkDissolve ? chkDissolve.checked : false;

      if (!idA || !idB) {
        if (window.UI) window.UI.toast('⚠️ Selecione as duas camadas.');
        return;
      }
      if (idA === idB) {
        if (window.UI) window.UI.toast('⚠️ Escolha camadas diferentes.');
        return;
      }

      if (typeof turf === 'undefined') {
        if (window.UI) window.UI.toast('⚠️ Turf.js indisponível.');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Calculando...';
      }

      // Carrega camadas sob demanda
      try {
        if (!DADOS_GEOJSON_BRUTOS[idA]?.features?.length) {
          if (window.UI) window.UI.toast(`⏳ Carregando ${CONFIG_CAMADAS[idA]?.nome || idA}...`);
          await window.DataManager.carregarCamada(idA);
        }
        if (!DADOS_GEOJSON_BRUTOS[idB]?.features?.length) {
          if (window.UI) window.UI.toast(`⏳ Carregando ${CONFIG_CAMADAS[idB]?.nome || idB}...`);
          await window.DataManager.carregarCamada(idB);
        }
      } catch (e) {
        console.error('[M10] Falha ao carregar camadas:', e);
      }

      const dadosA = DADOS_GEOJSON_BRUTOS[idA];
      const dadosB = DADOS_GEOJSON_BRUTOS[idB];
      if (!dadosA?.features?.length || !dadosB?.features?.length) {
        if (window.UI) window.UI.toast('⚠️ Uma das camadas não pôde ser carregada.');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '⚙️ Calcular';
        }
        return;
      }

      const inicio = performance.now();

      try {
        let resultadoFeatures = [];

        if (op === 'intersecao') {
          resultadoFeatures = await this._processarIntersecao(dadosA, dadosB);
        } else if (op === 'diferenca') {
          resultadoFeatures = await this._processarDiferenca(dadosA, dadosB);
        } else if (op === 'uniao') {
          resultadoFeatures = await this._processarUniao(dadosA, dadosB);
        } else if (op === 'pontos_em') {
          resultadoFeatures = await this._processarPontosEm(dadosA, dadosB);
        }

        if (resultadoFeatures.length === 0) {
          if (window.UI) window.UI.toast('⚠️ Nenhuma feição resultou da operação.');
          return;
        }

        if (dissolve && resultadoFeatures.length > 1 && op !== 'uniao') {
          resultadoFeatures = await this._dissolver(resultadoFeatures);
        }

        const duracao = ((performance.now() - inicio) / 1000).toFixed(1);
        console.info(`[M10] ${resultadoFeatures.length} feição(ões) em ${duracao}s`);

        this._criarCamadaResultado(idA, idB, op, resultadoFeatures, dissolve);

        this.fecharModal();

        if (window.UI) {
          window.UI.toast(`✓ ${resultadoFeatures.length} feição(ões) geradas em ${duracao}s.`);
        }
      } catch (e) {
        console.error('[M10] Erro:', e);
        if (window.UI) window.UI.toast('⚠️ Falha: ' + (e.message || e));
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '⚙️ Calcular';
        }
      }
    },

    /* ---------- Intersecção ---------- */
    _processarIntersecao: async function (dadosA, dadosB) {
      const resultado = [];
      const featsA = dadosA.features.filter(f => f.geometry);
      const featsB = dadosB.features.filter(f => f.geometry);
      let processados = 0;

      for (const fA of featsA) {
        let boundsA;
        try { boundsA = L.geoJSON(fA).getBounds(); } catch (e) { continue; }
        if (!boundsA.isValid()) continue;

        for (const fB of featsB) {
          let boundsB;
          try { boundsB = L.geoJSON(fB).getBounds(); } catch (e) { continue; }
          if (!boundsB.isValid()) continue;

          if (!boundsA.intersects(boundsB)) continue;

          try {
            const intersec = turf.intersect(fA, fB);
            if (intersec) {
              const propsA = fA.properties || {};
              const propsB = fB.properties || {};
              const propsFinal = {};

              for (const [k, v] of Object.entries(propsA)) {
                if (['geom','geometry','shape_leng','shape_area'].includes(k.toLowerCase())) continue;
                propsFinal[`A_${k}`] = v;
              }
              for (const [k, v] of Object.entries(propsB)) {
                if (['geom','geometry','shape_leng','shape_area'].includes(k.toLowerCase())) continue;
                propsFinal[`B_${k}`] = v;
              }

              try {
                const areaM2 = turf.area(intersec);
                propsFinal._area_m2 = Math.round(areaM2);
                propsFinal._area_km2 = +(areaM2 / 1_000_000).toFixed(3);
              } catch (e) { /* ignora */ }

              intersec.properties = propsFinal;
              resultado.push(intersec);
            }
          } catch (e) { /* ignora */ }

          processados++;
          if (processados % 200 === 0) await new Promise(r => setTimeout(r, 0));
        }
      }

      return resultado;
    },

    /* ---------- Diferença (A - B) ---------- */
    _processarDiferenca: async function (dadosA, dadosB) {
      const resultado = [];
      const featsA = dadosA.features.filter(f => f.geometry);
      const featsB = dadosB.features.filter(f => f.geometry);
      let processados = 0;

      for (const fA of featsA) {
        let atual = fA;
        let boundsA;
        try { boundsA = L.geoJSON(fA).getBounds(); } catch (e) { continue; }
        if (!boundsA.isValid()) continue;

        let sofreuRecorte = false;

        for (const fB of featsB) {
          let boundsB;
          try { boundsB = L.geoJSON(fB).getBounds(); } catch (e) { continue; }
          if (!boundsB.isValid()) continue;
          if (!boundsA.intersects(boundsB)) continue;

          try {
            const diff = turf.difference(atual, fB);
            if (diff) {
              atual = diff;
              sofreuRecorte = true;
            } else {
              atual = null;
              break;
            }
          } catch (e) { /* ignora */ }

          processados++;
          if (processados % 200 === 0) await new Promise(r => setTimeout(r, 0));
        }

        if (atual) {
          const propsOrig = fA.properties || {};
          const propsLimpas = {};
          for (const [k, v] of Object.entries(propsOrig)) {
            if (['geom','geometry'].includes(k.toLowerCase())) continue;
            propsLimpas[k] = v;
          }
          propsLimpas._recortada = sofreuRecorte;

          try {
            const areaM2 = turf.area(atual);
            propsLimpas._area_m2 = Math.round(areaM2);
            propsLimpas._area_km2 = +(areaM2 / 1_000_000).toFixed(3);
          } catch (e) { /* ignora */ }

          atual.properties = propsLimpas;
          resultado.push(atual);
        }
      }

      return resultado;
    },
    /* ---------- Pontos em Polígono (spatial join) ---------- */
    _detectarTipoGeom: function (features) {
      if (!features?.length) return 'desconhecido';
      const counts = { ponto: 0, linha: 0, poligono: 0 };
      for (let i = 0; i < Math.min(50, features.length); i++) {
        const t = features[i].geometry?.type || '';
        if (t.includes('Point')) counts.ponto++;
        else if (t.includes('LineString')) counts.linha++;
        else if (t.includes('Polygon')) counts.poligono++;
      }
      if (counts.ponto >= counts.linha && counts.ponto >= counts.poligono) return 'ponto';
      if (counts.linha >= counts.poligono) return 'linha';
      return 'poligono';
    },

    _processarPontosEm: async function (dadosA, dadosB) {
      const tipoA = this._detectarTipoGeom(dadosA.features);
      const tipoB = this._detectarTipoGeom(dadosB.features);

      console.info(`[M10] pontos_em: A=${tipoA}, B=${tipoB}`);

      let pontos, poligonos, invertido = false;

      if (tipoA === 'ponto' && tipoB === 'poligono') {
        pontos = dadosA.features;
        poligonos = dadosB.features;
      } else if (tipoB === 'ponto' && tipoA === 'poligono') {
        pontos = dadosB.features;
        poligonos = dadosA.features;
        invertido = true;
      } else {
        throw new Error(`Combinação incompatível (A=${tipoA} × B=${tipoB}). Preciso de ponto × polígono.`);
      }

      // Pré-calcula bounding boxes dos polígonos (otimização)
      const polysComBbox = [];
      for (const poly of poligonos) {
        if (!poly.geometry) continue;
        try {
          const bounds = L.geoJSON(poly).getBounds();
          if (bounds.isValid()) polysComBbox.push({ feature: poly, bounds: bounds });
        } catch (e) { /* ignora */ }
      }

      console.info(`[M10] ${pontos.length} pontos × ${polysComBbox.length} polígonos com bbox`);

      const resultado = [];
      let processados = 0;

      for (const p of pontos) {
        let pontoGeo;
        try {
          if (p.geometry?.type === 'Point') {
            pontoGeo = p.geometry;
          } else if (p.geometry?.type === 'MultiPoint' && p.geometry.coordinates.length > 0) {
            pontoGeo = { type: 'Point', coordinates: p.geometry.coordinates[0] };
          } else {
            continue;
          }
        } catch (e) { continue; }

        const lat = pontoGeo.coordinates[1];
        const lng = pontoGeo.coordinates[0];
        const ptLatLng = L.latLng(lat, lng);

        let contenedor = null;

        for (const { feature, bounds } of polysComBbox) {
          if (!bounds.contains(ptLatLng)) continue;

          try {
            if (turf.booleanPointInPolygon(pontoGeo, feature)) {
              contenedor = feature;
              break;
            }
          } catch (e) { /* ignora */ }

          processados++;
          if (processados % 500 === 0) await new Promise(r => setTimeout(r, 0));
        }

        if (contenedor) {
          const propsP = p.properties || {};
          const propsPoly = contenedor.properties || {};
          const propsFinal = {};

          const prefixoP = invertido ? 'B_' : 'A_';
          const prefixoPoly = invertido ? 'A_' : 'B_';

          for (const [k, v] of Object.entries(propsP)) {
            if (['geom', 'geometry'].includes(k.toLowerCase())) continue;
            propsFinal[`${prefixoP}${k}`] = v;
          }
          for (const [k, v] of Object.entries(propsPoly)) {
            if (['geom', 'geometry'].includes(k.toLowerCase())) continue;
            propsFinal[`${prefixoPoly}${k}`] = v;
          }

          propsFinal._contido_em = invertido ? 'A' : 'B';

          resultado.push({
            type: 'Feature',
            properties: propsFinal,
            geometry: pontoGeo
          });
        }
      }

      return resultado;
    },
    /* ---------- União ---------- */
    _processarUniao: async function (dadosA, dadosB) {
      const todas = [...dadosA.features, ...dadosB.features];
      let acumulado = null;

      for (let i = 0; i < todas.length; i++) {
        const f = todas[i];
        if (!f.geometry) continue;

        try {
          if (!acumulado) {
            acumulado = f;
          } else {
            const u = turf.union(acumulado, f);
            if (u) acumulado = u;
          }
        } catch (e) { /* ignora */ }

        if (i > 0 && i % 20 === 0) await new Promise(r => setTimeout(r, 0));
      }

      if (!acumulado) return [];

      try {
        const areaM2 = turf.area(acumulado);
        acumulado.properties = Object.assign({}, acumulado.properties || {}, {
          _uniao_origem: `${dadosA.features.length} + ${dadosB.features.length} feições`,
          _area_m2: Math.round(areaM2),
          _area_km2: +(areaM2 / 1_000_000).toFixed(3)
        });
      } catch (e) { /* ignora */ }

      return [acumulado];
    },

    /* ---------- Dissolve ---------- */
    _dissolver: async function (features) {
      let acumulado = features[0];
      for (let i = 1; i < features.length; i++) {
        try {
          const u = turf.union(acumulado, features[i]);
          if (u) acumulado = u;
        } catch (e) { /* ignora */ }
        if (i % 20 === 0) await new Promise(r => setTimeout(r, 0));
      }

      try {
        const areaM2 = turf.area(acumulado);
        acumulado.properties = Object.assign({}, acumulado.properties || {}, {
          _dissolved: true,
          _count: features.length,
          _area_km2: +(areaM2 / 1_000_000).toFixed(3)
        });
      } catch (e) { /* ignora */ }

      return [acumulado];
    },

    /* ---------- Cria camada resultado ---------- */
    _criarCamadaResultado: function (idA, idB, op, features, dissolve) {
      this._contador++;
      const nomeA = window.CONFIG_CAMADAS[idA]?.nome || idA;
      const nomeB = window.CONFIG_CAMADAS[idB]?.nome || idB;
      const opsNomes = { intersecao: '∩', diferenca: '−', uniao: '∪', pontos_em: '🎯' };
      const opSimbolo = opsNomes[op] || op;
      const nome = `Geo ${opSimbolo} · ${nomeA.split(' ')[0]} × ${nomeB.split(' ')[0]}${dissolve ? ' (unificado)' : ''}`;
      const id = `geo_${Date.now()}_${op}_${idA}_${idB}`;

      const cor = window.LayerRegistry.corAleatoria();

      CONFIG_CAMADAS[id] = {
        nome: nome,
        grupo: 'importadas',
        arquivos: [],
        cor: cor,
        opacidade: 0.4,
        peso: 2,
        tipoGeo: 'poligono',
        ativa: true,
        camposVisiveis: [],
        _isGeo: true,
        _operacao: op
      };

      const geojson = { type: 'FeatureCollection', features };
      DADOS_GEOJSON_BRUTOS[id] = geojson;

      // Garante pane dedicada
      if (!window.mapa.getPane('paneBuffer')) {
        window.mapa.createPane('paneBuffer');
        window.mapa.getPane('paneBuffer').style.zIndex = 650;
        window.mapa.getPane('paneBuffer').style.pointerEvents = 'auto';
      }

      CAMADAS_MAPA[id] = L.geoJSON(geojson, {
        pane: 'paneBuffer',
        interactive: true,
        bubblingMouseEvents: false,
        style: {
          color: cor,
          weight: 2.5,
          opacity: 0.9,
          fillColor: cor,
          fillOpacity: 0.35,
          dashArray: op === 'diferenca' ? '8, 6' : null
        },
        // ✅ Pontos viram círculos destacados (não markers padrão)
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {
          pane: 'panePontos',       // z-index 600 — acima dos outros layers
          radius: 8,
          color: '#ffffff',
          weight: 2,
          fillColor: cor,
          fillOpacity: 1
        }),
        onEachFeature: (f, layer) => {
          const p = f.properties || {};
          const linhas = Object.entries(p)
            .filter(([k]) => !['geom','geometry'].includes(k.toLowerCase()))
            .slice(0, 15)
            .map(([k, v]) =>
              `<div class="pop-linha"><span class="pop-lbl">${window.Security.escapeHTML(k)}:</span><span class="pop-val">${window.Security.escapeHTML(v)}</span></div>`
            ).join('');

          const html = `
            <div class="pop-topo">⚙️ Resultado Geoprocessamento</div>
            <div class="pop-corpo">${linhas || '<p style="color:#64748b;">Sem atributos.</p>'}</div>
            <div class="pop-rodape-auditoria">
              <span>${opSimbolo} ${nomeA.slice(0, 20)} × ${nomeB.slice(0, 20)}</span>
              <span>Turf.js</span>
            </div>
          `;
          layer.bindPopup(html);
        }
      });

      CAMADAS_MAPA[id].addTo(window.mapa);

      const grupoEl = document.getElementById('grupo-importadas');
      const msgVazio = document.getElementById('msg-sem-importadas');
      if (msgVazio) msgVazio.style.display = 'none';

      if (grupoEl) {
        grupoEl.classList.remove('fechado');
        if (typeof window.construirItemCamada === 'function') {
          window.construirItemCamada(id, CONFIG_CAMADAS[id], grupoEl);
        }
        const cntBadge = document.getElementById(`cnt-${id}`);
        if (cntBadge) cntBadge.innerText = `(${features.length})`;

        setTimeout(() => {
          const item = document.getElementById(`item-camada-${id}`);
          if (item) {
            item.style.display = 'flex';
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 50);
      }

      try {
        const bounds = CAMADAS_MAPA[id].getBounds();
        if (bounds.isValid()) window.mapa.fitBounds(bounds, { padding: [40, 40] });
      } catch (e) { /* ignora */ }

      if (window.Styler) window.Styler.atualizarStyle?.();
      if (window.Styler) window.Styler.atualizarLegenda();
      if (window.FilterManager) window.FilterManager.atualizarSeletorCamadas();
    }
  };

  window.GeoTools = GeoTools;
  console.info('[js] GeoTools carregado (M10)');
})();