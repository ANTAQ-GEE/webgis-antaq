/* ============================================================
   WebGIS ANTAQ — Módulo: GeoTools (M10)
   Escopo: geoprocessamento (intersecção, diferença, união, pontos em polígono)
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

      // Radios visuais controlam o select oculto E forçam refresh do preview
      document.querySelectorAll('input[name="geo-op"]').forEach(radio => {
        if (radio._geoListeners) return;
        radio.addEventListener('change', (e) => {
          if (selOp) selOp.value = e.target.value;
          setTimeout(() => this._atualizarPreview(), 10);
        });
        radio._geoListeners = true;
      });

      // Click nos labels dos radios também garante seleção e dispara preview
      document.querySelectorAll('.geo-op-opcao').forEach(label => {
        if (label._geoLabelListeners) return;
        label.addEventListener('click', () => {
          const radio = label.querySelector('input[name="geo-op"]');
          if (radio) {
            radio.checked = true;
            if (selOp) selOp.value = radio.value;
          }
          setTimeout(() => this._atualizarPreview(), 10);
        });
        label._geoLabelListeners = true;
      });

      const chkDis = document.getElementById('geo-dissolve');
      if (chkDis && !chkDis._geoListeners) {
        chkDis.addEventListener('change', () => this._atualizarPreview());
        chkDis._geoListeners = true;
      }

      // Fechamento amigável pelo backdrop e tecla ESC
      const modal = document.getElementById('modal-geo');
      if (modal && !modal._backdropListener) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.fecharModal();
        });
        modal._backdropListener = true;
      }
      if (!this._escListener) {
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            const m = document.getElementById('modal-geo');
            if (m && m.classList.contains('aberto')) this.fecharModal();
          }
        });
        this._escListener = true;
      }
    },

    _popularSelects: function () {
      const selA = document.getElementById('geo-camada-a');
      const selB = document.getElementById('geo-camada-b');
      if (!selA || !selB) return;

      const candidatas = [];
      const config = window.CONFIG_CAMADAS || {};
      const brutos = window.DADOS_GEOJSON_BRUTOS || {};

      for (const [id, cfg] of Object.entries(config)) {
        if (id.startsWith('geo_')) continue; // Permite usar camadas de Buffer e Importadas no Geoprocessamento!

        const carregada = brutos[id]?.features?.length || 0;
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
      const checkedRadio = document.querySelector('input[name="geo-op"]:checked');
      const op = checkedRadio?.value || selOp?.value || 'intersecao';
      if (selOp && selOp.value !== op) selOp.value = op;

      const chkDis = document.getElementById('geo-dissolve');
      if (chkDis) {
        if (op === 'pontos_em') {
          chkDis.disabled = true;
          chkDis.checked = false;
          if (chkDis.parentElement) chkDis.parentElement.style.opacity = '0.5';
        } else {
          chkDis.disabled = false;
          if (chkDis.parentElement) chkDis.parentElement.style.opacity = '1';
        }
      }

      if (!idA || !idB) {
        preview.innerHTML = '<em style="color:#64748b;">Selecione duas camadas.</em>';
        return;
      }
      if (idA === idB) {
        preview.innerHTML = '<em style="color:#f59e0b;">⚠️ Selecione camadas diferentes para A e B.</em>';
        return;
      }

      const brutos = window.DADOS_GEOJSON_BRUTOS || {};
      const config = window.CONFIG_CAMADAS || {};
      const nA = brutos[idA]?.features?.length || 0;
      const nB = brutos[idB]?.features?.length || 0;
      const nomeA = config[idA]?.nome || idA;
      const nomeB = config[idB]?.nome || idB;

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

      const inferirTipo = (id) => {
        if (brutos[id]?.features?.length && this._detectarTipoGeom) {
          const t = this._detectarTipoGeom(brutos[id].features);
          if (t && t !== 'desconhecido') return t;
        }
        const cfg = config[id];
        if (cfg?.tipoGeo) {
          const tg = String(cfg.tipoGeo).toLowerCase();
          if (tg.includes('ponto')) return 'ponto';
          if (tg.includes('linha')) return 'linha';
          if (tg.includes('poli')) return 'poligono';
        }
        return 'desconhecido';
      };

      const tipoA = inferirTipo(idA);
      const tipoB = inferirTipo(idB);
      const tipoLabel = { ponto: 'pontos', linha: 'linhas', poligono: 'polígonos', desconhecido: '?' };

      let avisoTipo = '';
      if (op === 'pontos_em') {
        const valido = (tipoA === 'ponto' && tipoB === 'poligono') || (tipoA === 'poligono' && tipoB === 'ponto');
        if (!valido && tipoA !== 'desconhecido' && tipoB !== 'desconhecido') {
          avisoTipo = `<div style="margin-top:8px;padding:6px 10px;background:rgba(239,68,68,0.15);border-left:3px solid #ef4444;border-radius:4px;font-size:10.5px;color:#fca5a5;">
            ⚠️ <strong>Combinação inválida.</strong> Esta operação precisa de <strong>pontos × polígonos</strong>.
            Você tem ${tipoLabel[tipoA] || '?'} × ${tipoLabel[tipoB] || '?'}.
          </div>`;
        } else {
          avisoTipo = `<div style="margin-top:8px;padding:6px 10px;background:rgba(16,185,129,0.15);border-left:3px solid #10b981;border-radius:4px;font-size:10.5px;color:#a7f3d0;">
            ✅ <strong>Compatível.</strong> ${tipoLabel[tipoA] || '?'} em ${tipoLabel[tipoB] || '?'}.
          </div>`;
        }
      } else if (op === 'intersecao') {
        if ((tipoA === 'ponto') !== (tipoB === 'ponto') && tipoA !== 'desconhecido' && tipoB !== 'desconhecido') {
          avisoTipo = `<div style="margin-top:8px;padding:6px 10px;background:rgba(245,158,11,0.15);border-left:3px solid #f59e0b;border-radius:4px;font-size:10.5px;color:#fde68a;">
            ℹ️ Ponto × não-ponto: utilize <strong>🎯 Pontos em</strong> se desejar filtrar pontos contidos em polígonos.
          </div>`;
        }
      }

      const tiposTexto = `<div style="font-size:10px;color:#64748b;margin-bottom:6px;">
        A: <strong>${tipoLabel[tipoA] || '?'}</strong> · B: <strong>${tipoLabel[tipoB] || '?'}</strong>
      </div>`;

      const escape = (val) => (window.Security && window.Security.escapeHTML) ? window.Security.escapeHTML(val) : String(val ?? '');

      preview.innerHTML = `
        <div style="font-size:11.5px;color:#cbd5e1;line-height:1.5;">
          <div style="font-weight:700;color:#fbbf24;margin-bottom:6px;">${nomeOp}</div>
          ${tiposTexto}
          <div>
            <strong style="color:#38bdf8;">${carregadaA ? nA.toLocaleString('pt-BR') : '?'}</strong>
            feições de <span style="color:#e2e8f0;">${escape(nomeA)}</span>
            ${!carregadaA ? '<span style="color:#f59e0b;"> (será carregada)</span>' : ''}
          </div>
          <div>
            <strong style="color:#38bdf8;">${carregadaB ? nB.toLocaleString('pt-BR') : '?'}</strong>
            feições de <span style="color:#e2e8f0;">${escape(nomeB)}</span>
            ${!carregadaB ? '<span style="color:#f59e0b;"> (será carregada)</span>' : ''}
          </div>
          ${(carregadaA && carregadaB) ? `
            <div style="margin-top:8px;font-size:10.5px;color:#64748b;">
              Pares a testar: <strong>${pares.toLocaleString('pt-BR')}</strong>
              ${pesado ? '<span style="color:#f59e0b;"> — otimizado com bounding box</span>' : ''}
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
      const checkedRadio = document.querySelector('input[name="geo-op"]:checked');
      const op = checkedRadio?.value || selOp?.value || 'intersecao';
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

      const brutos = window.DADOS_GEOJSON_BRUTOS || {};
      const config = window.CONFIG_CAMADAS || {};

      // Carrega camadas sob demanda
      try {
        if (!brutos[idA]?.features?.length) {
          if (window.UI) window.UI.toast(`⏳ Carregando ${config[idA]?.nome || idA}...`);
          if (window.DataManager && window.DataManager.carregarCamada) {
            await window.DataManager.carregarCamada(idA);
          }
        }
        if (!brutos[idB]?.features?.length) {
          if (window.UI) window.UI.toast(`⏳ Carregando ${config[idB]?.nome || idB}...`);
          if (window.DataManager && window.DataManager.carregarCamada) {
            await window.DataManager.carregarCamada(idB);
          }
        }
      } catch (e) {
        console.error('[M10] Falha ao carregar camadas:', e);
      }

      const dadosA = brutos[idA];
      const dadosB = brutos[idB];
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

        // Dissolve só é aplicável para polígonos resultantes de interseção/diferença
        if (dissolve && resultadoFeatures.length > 1 && op !== 'uniao' && op !== 'pontos_em') {
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
      const featsA = (dadosA.features || []).filter(f => f && f.geometry);
      const featsB = (dadosB.features || []).filter(f => f && f.geometry);
      let processados = 0;

      // Pré-calcula Bounding Box de B
      const bComBbox = [];
      for (const fB of featsB) {
        let bbox = null;
        if (typeof turf !== 'undefined' && turf.bbox) {
          try { bbox = turf.bbox(fB); } catch (e) {}
        }
        let bounds = null;
        if (typeof L !== 'undefined' && L.geoJSON) {
          try { bounds = L.geoJSON(fB).getBounds(); } catch (e) {}
        }
        bComBbox.push({ feature: fB, bbox, bounds: (bounds && bounds.isValid()) ? bounds : null });
      }

      for (const fA of featsA) {
        let bboxA = null;
        if (typeof turf !== 'undefined' && turf.bbox) {
          try { bboxA = turf.bbox(fA); } catch (e) {}
        }
        let boundsA = null;
        if (typeof L !== 'undefined' && L.geoJSON) {
          try { boundsA = L.geoJSON(fA).getBounds(); } catch (e) {}
        }
        if (!boundsA || !boundsA.isValid()) continue;

        for (const itemB of bComBbox) {
          const { feature: fB, bbox: bboxB, bounds: boundsB } = itemB;
          if (bboxA && bboxB) {
            if (bboxA[2] < bboxB[0] || bboxA[0] > bboxB[2] || bboxA[3] < bboxB[1] || bboxA[1] > bboxB[3]) continue;
          } else if (boundsB) {
            if (!boundsA.intersects(boundsB)) continue;
          }

          try {
            const tipoA = fA.geometry.type;
            const tipoB = fB.geometry.type;
            let intersec = null;

            // Caso 1: Polígono × Polígono
            if (tipoA.includes('Polygon') && tipoB.includes('Polygon')) {
              intersec = turf.intersect(fA, fB);
            }
            // Caso 2: Ponto × Polígono
            else if (tipoA.includes('Point') && tipoB.includes('Polygon')) {
              const coordA = fA.geometry.coordinates;
              if (turf.booleanPointInPolygon(coordA, fB) || turf.booleanPointInPolygon(fA, fB)) {
                intersec = JSON.parse(JSON.stringify(fA));
              }
            }
            // Caso 3: Polígono × Ponto
            else if (tipoA.includes('Polygon') && tipoB.includes('Point')) {
              const coordB = fB.geometry.coordinates;
              if (turf.booleanPointInPolygon(coordB, fA) || turf.booleanPointInPolygon(fB, fA)) {
                intersec = JSON.parse(JSON.stringify(fB));
              }
            }
            // Caso 4: Linha × Polígono
            else if (tipoA.includes('LineString') && tipoB.includes('Polygon')) {
              if (turf.booleanIntersects(fA, fB)) {
                intersec = JSON.parse(JSON.stringify(fA));
              }
            }
            // Caso 5: Polígono × Linha
            else if (tipoA.includes('Polygon') && tipoB.includes('LineString')) {
              if (turf.booleanIntersects(fB, fA)) {
                intersec = JSON.parse(JSON.stringify(fB));
              }
            }

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
                if (intersec.geometry.type.includes('Polygon')) {
                  const areaM2 = turf.area(intersec);
                  propsFinal._area_m2 = Math.round(areaM2);
                  propsFinal._area_km2 = +(areaM2 / 1_000_000).toFixed(3);
                } else if (intersec.geometry.type.includes('LineString')) {
                  const compKm = turf.length(intersec, { units: 'kilometers' });
                  propsFinal._extensao_km = +compKm.toFixed(3);
                }
              } catch (e) { /* ignora */ }

              intersec.properties = propsFinal;
              resultado.push(intersec);
            }
          } catch (e) { /* ignora */ }
        }

        processados++;
        if (processados % 100 === 0) await new Promise(r => setTimeout(r, 0));
      }

      return resultado;
    },

    /* ---------- Diferença (A - B) ---------- */
    _processarDiferenca: async function (dadosA, dadosB) {
      const resultado = [];
      const featsA = (dadosA.features || []).filter(f => f && f.geometry);
      const featsB = (dadosB.features || []).filter(f => f && f.geometry);
      let processados = 0;

      const bComBbox = [];
      for (const fB of featsB) {
        let bbox = null;
        if (typeof turf !== 'undefined' && turf.bbox) {
          try { bbox = turf.bbox(fB); } catch (e) {}
        }
        let bounds = null;
        if (typeof L !== 'undefined' && L.geoJSON) {
          try { bounds = L.geoJSON(fB).getBounds(); } catch (e) {}
        }
        bComBbox.push({ feature: fB, bbox, bounds: (bounds && bounds.isValid()) ? bounds : null });
      }

      for (const fA of featsA) {
        let atual = fA;
        let bboxA = null;
        if (typeof turf !== 'undefined' && turf.bbox) {
          try { bboxA = turf.bbox(fA); } catch (e) {}
        }
        let boundsA = null;
        if (typeof L !== 'undefined' && L.geoJSON) {
          try { boundsA = L.geoJSON(fA).getBounds(); } catch (e) {}
        }
        if (!boundsA || !boundsA.isValid()) continue;

        let sofreuRecorte = false;

        for (const itemB of bComBbox) {
          const { feature: fB, bbox: bboxB, bounds: boundsB } = itemB;
          if (bboxA && bboxB) {
            if (bboxA[2] < bboxB[0] || bboxA[0] > bboxB[2] || bboxA[3] < bboxB[1] || bboxA[1] > bboxB[3]) continue;
          } else if (boundsB) {
            if (!boundsA.intersects(boundsB)) continue;
          }

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

        processados++;
        if (processados % 100 === 0) await new Promise(r => setTimeout(r, 0));
      }

      return resultado;
    },

    /* ---------- Detecção de tipo geométrico ---------- */
    _detectarTipoGeom: function (features) {
      if (!Array.isArray(features) || !features.length) return 'desconhecido';
      const counts = { ponto: 0, linha: 0, poligono: 0 };
      const lim = Math.min(50, features.length);
      for (let i = 0; i < lim; i++) {
        const t = features[i]?.geometry?.type || '';
        if (t.includes('Point')) counts.ponto++;
        else if (t.includes('LineString')) counts.linha++;
        else if (t.includes('Polygon')) counts.poligono++;
      }
      if (counts.ponto > 0 && counts.ponto >= counts.linha && counts.ponto >= counts.poligono) return 'ponto';
      if (counts.linha > 0 && counts.linha >= counts.poligono) return 'linha';
      if (counts.poligono > 0) return 'poligono';
      return 'desconhecido';
    },

    /* ---------- Pontos em Polígono (spatial join) ---------- */
    _processarPontosEm: async function (dadosA, dadosB) {
      const tipoA = this._detectarTipoGeom(dadosA.features);
      const tipoB = this._detectarTipoGeom(dadosB.features);

      console.info(`[M10] pontos_em: A=${tipoA}, B=${tipoB}`);

      let pontos, poligonos, invertido = false;

      if (tipoA === 'ponto' && (tipoB === 'poligono' || tipoB === 'desconhecido')) {
        pontos = (dadosA.features || []).filter(f => f && f.geometry);
        poligonos = (dadosB.features || []).filter(f => f && f.geometry);
      } else if (tipoB === 'ponto' && (tipoA === 'poligono' || tipoA === 'desconhecido')) {
        pontos = (dadosB.features || []).filter(f => f && f.geometry);
        poligonos = (dadosA.features || []).filter(f => f && f.geometry);
        invertido = true;
      } else {
        throw new Error(`Combinação incompatível (A=${tipoA} × B=${tipoB}). Preciso de ponto × polígono.`);
      }

      // Pré-calcula bounding boxes dos polígonos
      const polysComBbox = [];
      for (const poly of poligonos) {
        if (!poly || !poly.geometry) continue;
        try {
          let bbox = null;
          if (typeof turf !== 'undefined' && turf.bbox) {
            try { bbox = turf.bbox(poly); } catch (e) {}
          }
          let bounds = null;
          if (typeof L !== 'undefined' && L.geoJSON) {
            try { bounds = L.geoJSON(poly).getBounds(); } catch (e) {}
          }
          polysComBbox.push({
            feature: poly,
            bbox: bbox,
            bounds: (bounds && bounds.isValid()) ? bounds : null
          });
        } catch (e) { /* ignora */ }
      }

      console.info(`[M10] ${pontos.length} pontos × ${polysComBbox.length} polígonos preparados com bbox`);

      const resultado = [];
      let processados = 0;

      for (const p of pontos) {
        processados++;
        if (processados % 100 === 0) await new Promise(r => setTimeout(r, 0));

        let pontoGeo;
        try {
          if (p.geometry?.type === 'Point') {
            pontoGeo = p.geometry;
          } else if (p.geometry?.type === 'MultiPoint' && p.geometry.coordinates?.length > 0) {
            pontoGeo = { type: 'Point', coordinates: p.geometry.coordinates[0] };
          } else {
            continue;
          }
        } catch (e) { continue; }

        if (!pontoGeo || !Array.isArray(pontoGeo.coordinates) || pontoGeo.coordinates.length < 2) continue;

        const lng = pontoGeo.coordinates[0];
        const lat = pontoGeo.coordinates[1];
        if (isNaN(lat) || isNaN(lng)) continue;
        const ptLatLng = (typeof L !== 'undefined') ? L.latLng(lat, lng) : null;

        let contenedor = null;

        for (const item of polysComBbox) {
          const { feature, bbox, bounds } = item;
          // BBox numérico rápido: [minLng, minLat, maxLng, maxLat]
          if (bbox) {
            if (lng < bbox[0] || lat < bbox[1] || lng > bbox[2] || lat > bbox[3]) continue;
          } else if (bounds && ptLatLng) {
            if (!bounds.contains(ptLatLng)) continue;
          }

          try {
            if (turf.booleanPointInPolygon([lng, lat], feature) || turf.booleanPointInPolygon(pontoGeo, feature)) {
              contenedor = feature;
              break;
            }
          } catch (e) { /* ignora */ }
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
      const todas = [...(dadosA.features || []), ...(dadosB.features || [])].filter(f => f && f.geometry);
      if (!todas.length) return [];
      let acumulado = todas[0];

      for (let i = 1; i < todas.length; i++) {
        const f = todas[i];
        try {
          const u = turf.union(acumulado, f);
          if (u) acumulado = u;
        } catch (e) { /* ignora */ }

        if (i % 20 === 0) await new Promise(r => setTimeout(r, 0));
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
      const validas = (features || []).filter(f => f && f.geometry);
      if (!validas.length) return features;
      let acumulado = validas[0];

      for (let i = 1; i < validas.length; i++) {
        try {
          const u = turf.union(acumulado, validas[i]);
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
      const config = window.CONFIG_CAMADAS || {};
      const brutos = window.DADOS_GEOJSON_BRUTOS || {};
      const camadasMapa = window.CAMADAS_MAPA || {};

      const nomeA = config[idA]?.nome || idA;
      const nomeB = config[idB]?.nome || idB;
      const opsNomes = { intersecao: '∩', diferenca: '−', uniao: '∪', pontos_em: '🎯' };
      const opSimbolo = opsNomes[op] || op;
      const nome = `Geo ${opSimbolo} · ${nomeA.split(' ')[0]} × ${nomeB.split(' ')[0]}${dissolve ? ' (unificado)' : ''}`;
      const id = `geo_${Date.now()}_${op}_${idA}_${idB}`;

      const cor = (window.LayerRegistry && typeof window.LayerRegistry.corAleatoria === 'function')
        ? window.LayerRegistry.corAleatoria()
        : '#a855f7';

      // Salva dados GeoJSON
      const geojson = { type: 'FeatureCollection', features };
      brutos[id] = geojson;

      let tipoGeo = (op === 'pontos_em') ? 'ponto' : 'poligono';
      if (window.GeomTypeDetector && typeof window.GeomTypeDetector.detectar === 'function') {
        try {
          tipoGeo = window.GeomTypeDetector.detectar(geojson) || tipoGeo;
        } catch (e) { /* fallback */ }
      }

      config[id] = {
        nome: nome,
        grupo: 'importadas',
        arquivos: [],
        cor: cor,
        opacidade: 0.4,
        peso: 2,
        tipoGeo: tipoGeo,
        ativa: true,
        camposVisiveis: [],
        _isGeo: true,
        _operacao: op
      };

      // Garante panes dedicadas no Leaflet de forma segura
      if (window.mapa && typeof window.mapa.createPane === 'function') {
        let pBuf = window.mapa.getPane && window.mapa.getPane('paneBuffer');
        if (!pBuf) {
          pBuf = window.mapa.createPane('paneBuffer');
        }
        if (pBuf && pBuf.style) {
          pBuf.style.zIndex = 650;
          pBuf.style.pointerEvents = 'auto';
        }

        let pPts = window.mapa.getPane && window.mapa.getPane('panePontos');
        if (!pPts) {
          pPts = window.mapa.createPane('panePontos');
        }
        if (pPts && pPts.style) {
          pPts.style.zIndex = 600;
          pPts.style.pointerEvents = 'auto';
        }
      }

      camadasMapa[id] = L.geoJSON(geojson, {
        pane: (tipoGeo === 'ponto') ? 'panePontos' : 'paneBuffer',
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
        // Pontos viram círculos destacados
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {
          pane: 'panePontos',
          radius: 7,
          color: '#ffffff',
          weight: 2,
          fillColor: cor,
          fillOpacity: 0.95
        }),
        onEachFeature: (f, layer) => {
          const p = f.properties || {};
          const escape = (val) => (window.Security && window.Security.escapeHTML) ? window.Security.escapeHTML(val) : String(val ?? '');
          const linhas = Object.entries(p)
            .filter(([k]) => !['geom','geometry'].includes(k.toLowerCase()))
            .slice(0, 15)
            .map(([k, v]) =>
              `<div class="pop-linha"><span class="pop-lbl">${escape(k)}:</span><span class="pop-val">${escape(v)}</span></div>`
            ).join('');

          const html = `
            <div class="pop-topo">⚙️ Resultado Geoprocessamento</div>
            <div class="pop-corpo">${linhas || '<p style="color:#64748b;">Sem atributos.</p>'}</div>
            <div class="pop-rodape-auditoria">
              <span>${opSimbolo} ${escape(nomeA.slice(0, 20))} × ${escape(nomeB.slice(0, 20))}</span>
              <span>Turf.js</span>
            </div>
          `;
          layer.bindPopup(html);
        }
      });

      if (window.mapa) {
        camadasMapa[id].addTo(window.mapa);
      }

      const grupoEl = document.getElementById('grupo-importadas');
      const msgVazio = document.getElementById('msg-sem-importadas');
      if (msgVazio) msgVazio.style.display = 'none';

      if (grupoEl) {
        grupoEl.classList.remove('fechado');
        if (typeof window.construirItemCamada === 'function') {
          window.construirItemCamada(id, config[id], grupoEl);
        }
        const cntBadge = document.getElementById(`cnt-${id}`);
        if (cntBadge) cntBadge.innerText = `(${features.length})`;

        setTimeout(() => {
          const item = document.getElementById(`item-camada-${id}`);
          if (item) {
            item.style.display = 'flex';
            const painelCorpo = document.querySelector('#painel-camadas-lateral .painel-corpo') || grupoEl;
            if (painelCorpo && item.offsetTop) painelCorpo.scrollTop = item.offsetTop;
          }
        }, 50);
      }

      try {
        if (camadasMapa[id] && window.mapa) {
          const bounds = camadasMapa[id].getBounds();
          if (bounds && bounds.isValid()) {
            window.mapa.fitBounds(bounds, { padding: [40, 40] });
          }
        }
      } catch (e) { /* ignora */ }

      if (window.Styler && typeof window.Styler.atualizarStyle === 'function') window.Styler.atualizarStyle();
      if (window.Styler && typeof window.Styler.atualizarLegenda === 'function') window.Styler.atualizarLegenda();
      if (window.FilterManager && typeof window.FilterManager.atualizarSeletorCamadas === 'function') window.FilterManager.atualizarSeletorCamadas();
    }
  };

  window.GeoTools = GeoTools;
  console.info('[js] GeoTools carregado (M10)');
})();