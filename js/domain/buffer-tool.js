/* ============================================================
   WebGIS ANTAQ — Módulo: BufferTool (M9)
   Escopo: criação de buffers geodésicos em camadas vetoriais
   Dependências: window.DADOS_GEOJSON_BRUTOS, window.CONFIG_CAMADAS,
                 window.CAMADAS_MAPA, window.Styler, window.UI,
                 window.Security, window.LayerRegistry, window.FilterManager,
                 window.mapa, turf (global)
   Expõe: window.BufferTool
   ============================================================ */
(function () {
  'use strict';

  const BufferTool = {
    _contador: 0,

    /* ============================================================
       UI
       ============================================================ */
    abrirModal: function () {
      const modal = document.getElementById('modal-buffer');
      if (!modal) return;

      this._popularSelectCamadas();
      this._atualizarPreview();

      modal.classList.add('aberto');

      // Listener pra atualizar preview
      const selCamada = document.getElementById('buffer-camada');
      const inpRaio = document.getElementById('buffer-raio');
      const chkDissolve = document.getElementById('buffer-dissolve');

      if (selCamada && !selCamada._bufferListeners) {
        selCamada.addEventListener('change', () => this._atualizarPreview());
        selCamada._bufferListeners = true;
      }
      if (inpRaio && !inpRaio._bufferListeners) {
        inpRaio.addEventListener('input', () => this._atualizarPreview());
        inpRaio._bufferListeners = true;
      }
      if (chkDissolve && !chkDissolve._bufferListeners) {
        chkDissolve.addEventListener('change', () => this._atualizarPreview());
        chkDissolve._bufferListeners = true;
      }
    },

    fecharModal: function () {
      const modal = document.getElementById('modal-buffer');
      if (modal) modal.classList.remove('aberto');
    },

    _popularSelectCamadas: function () {
      const sel = document.getElementById('buffer-camada');
      if (!sel) return;

      const valAtual = sel.value;
      sel.innerHTML = '';

      // Lista todas as camadas carregadas com features
      const candidatas = [];
      for (const [id, dados] of Object.entries(DADOS_GEOJSON_BRUTOS)) {
        if (!dados?.features?.length) continue;
        const nome = window.CONFIG_CAMADAS[id]?.nome || id;
        candidatas.push({ id, nome, n: dados.features.length });
      }

      // Ordena por nome
      candidatas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      if (candidatas.length === 0) {
        sel.innerHTML = '<option value="">(Nenhuma camada carregada)</option>';
        return;
      }

      for (const c of candidatas) {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.nome} (${c.n.toLocaleString('pt-BR')})`;
        sel.appendChild(opt);
      }

      // Restaura seleção ou pega a primeira
      if (valAtual && candidatas.find(c => c.id === valAtual)) {
        sel.value = valAtual;
      }
    },

    _atualizarPreview: function () {
      const selCamada = document.getElementById('buffer-camada');
      const inpRaio = document.getElementById('buffer-raio');
      const preview = document.getElementById('buffer-preview');

      if (!selCamada || !inpRaio || !preview) return;

      const camadaId = selCamada.value;
      const raio = parseFloat(inpRaio.value) || 50;

      if (!camadaId) {
        preview.innerHTML = '<em style="color:#64748b;">Selecione uma camada para ver o preview.</em>';
        return;
      }

      const n = DADOS_GEOJSON_BRUTOS[camadaId]?.features?.length || 0;
      const nome = window.CONFIG_CAMADAS[camadaId]?.nome || camadaId;

      preview.innerHTML = `
        <div style="font-size:11px;color:#94a3b8;line-height:1.5;">
          Serão processadas <strong style="color:#38bdf8;">${n.toLocaleString('pt-BR')}</strong> feições
          de <strong style="color:#e2e8f0;">${window.Security.escapeHTML(nome)}</strong>,<br>
          criando buffers de <strong style="color:#f59e0b;">${raio} km</strong>
          em torno de cada uma.
        </div>
      `;
    },

    /* ============================================================
       PROCESSAMENTO
       ============================================================ */
    criar: async function () {
      const selCamada = document.getElementById('buffer-camada');
      const inpRaio = document.getElementById('buffer-raio');
      const chkDissolve = document.getElementById('buffer-dissolve');
      const btnCriar = document.getElementById('btn-buffer-criar');

      if (!selCamada || !inpRaio) return;

      const camadaId = selCamada.value;
      const raioKm = parseFloat(inpRaio.value) || 50;
      const dissolve = chkDissolve ? chkDissolve.checked : false;

      if (!camadaId) {
        if (window.UI) window.UI.toast('⚠️ Selecione uma camada de origem.');
        return;
      }

      const dados = DADOS_GEOJSON_BRUTOS[camadaId];
      if (!dados?.features?.length) {
        if (window.UI) window.UI.toast('⚠️ Camada sem feições.');
        return;
      }

      if (typeof turf === 'undefined') {
        if (window.UI) window.UI.toast('⚠️ Turf.js indisponível. Recarregue a página.');
        return;
      }

      // Desabilita botão durante processamento
      if (btnCriar) {
        btnCriar.disabled = true;
        btnCriar.innerHTML = '⏳ Processando...';
      }

      const inicio = performance.now();

      try {
        const resultado = await this._processarBuffer(dados, raioKm, dissolve);

        const duracao = ((performance.now() - inicio) / 1000).toFixed(1);
        console.info(`[M9] Buffer criado em ${duracao}s: ${resultado.features.length} polígono(s)`);

        // Adiciona como nova camada
        this._criarCamadaBuffer(camadaId, raioKm, dissolve, resultado);

        this.fecharModal();

        if (window.UI) {
          window.UI.toast(`✓ Buffer de ${raioKm} km criado (${resultado.features.length} feição(ões) em ${duracao}s).`);
        }
      } catch (e) {
        console.error('[M9] Falha ao criar buffer:', e);
        if (window.UI) window.UI.toast('⚠️ Falha ao criar buffer: ' + (e.message || e));
      } finally {
        if (btnCriar) {
          btnCriar.disabled = false;
          btnCriar.innerHTML = '⭕ Criar Buffer';
        }
      }
    },

    _processarBuffer: async function (dados, raioKm, dissolve) {
      // Converte km → graus (aproximação; turf.buffer aceita km direto)
      const steps = 12;   // 12 segmentos = bom equilíbrio entre precisão e performance

      // Processa em chunks pra não travar a UI
      const buffers = [];
      const features = dados.features.filter(f => f.geometry);
      const chunkSize = 100;

      for (let i = 0; i < features.length; i++) {
        const f = features[i];
        try {
          const buffered = turf.buffer(f, raioKm, { units: 'kilometers', steps });
          if (buffered) buffers.push(buffered);
        } catch (e) { /* ignora feição inválida */ }

        // Yield a cada chunk pra UI respirar
        if (i > 0 && i % chunkSize === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      if (buffers.length === 0) throw new Error('Nenhum buffer foi gerado');

      // Se dissolve, une todos numa só feature
      if (dissolve && buffers.length > 1) {
        try {
          // turf.union aceita 2 por vez — reduz iterativamente
          let acumulado = buffers[0];
          for (let i = 1; i < buffers.length; i++) {
            acumulado = turf.union(acumulado, buffers[i]);
            // Yield a cada 20 uniões
            if (i % 20 === 0) await new Promise(r => setTimeout(r, 0));
          }
          return {
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: { _dissolved: true, _count: buffers.length }, geometry: acumulado.geometry }]
          };
        } catch (e) {
          console.warn('[M9] Dissolve falhou, retornando buffers individuais:', e);
        }
      }

      return { type: 'FeatureCollection', features: buffers };
    },

    _criarCamadaBuffer: function (camadaOrigemId, raioKm, dissolve, geojson) {
      this._contador++;
      const nomeBase = window.CONFIG_CAMADAS[camadaOrigemId]?.nome || camadaOrigemId;
      const nome = `Buffer ${raioKm}km · ${nomeBase}${dissolve ? ' (unificado)' : ''}`;
      const id = `buffer_${this._contador}_${raioKm}km_${camadaOrigemId}`;

      // Cor aleatória distinta
      const cor = window.LayerRegistry.corAleatoria();

      // Registra em CONFIG_CAMADAS
      CONFIG_CAMADAS[id] = {
        nome: nome,
        grupo: 'importadas',   // reaproveita a seção "Camadas Importadas" do painel
        arquivos: [],
        cor: cor,
        opacidade: 0.25,
        peso: 1.5,
        tipoGeo: 'poligono',
        ativa: true,
        camposVisiveis: [],
        _isBuffer: true,
        _camadaOrigem: camadaOrigemId,
        _raioKm: raioKm,
        _dissolve: dissolve
      };

      // Salva dados
      DADOS_GEOJSON_BRUTOS[id] = geojson;

      // Renderiza no mapa
      CAMADAS_MAPA[id] = L.geoJSON(geojson, {
        pane: 'paneRestricoes',
        style: {
          color: cor,
          weight: 2,
          opacity: 0.8,
          fillColor: cor,
          fillOpacity: 0.25,
          dashArray: '5, 5'
        },
        onEachFeature: (f, layer) => {
          const p = f.properties || {};

          // ✅ Calcula área do buffer
          let areaKm2 = 0;
          try {
            const areaM2 = turf.area(f);
            areaKm2 = areaM2 / 1_000_000;
          } catch (e) { /* ignora */ }

          const props = p._dissolved
            ? {
                Nome: `Buffer unificado · ${raioKm} km`,
                Origem: nomeBase,
                'Feições origem': p._count,
                'Raio': `${raioKm} km`,
                'Área total': areaKm2 >= 1000
                  ? `${(areaKm2 / 1000).toFixed(2)} mil km²`
                  : `${areaKm2.toFixed(2)} km²`
              }
            : {
                Nome: `Buffer · ${raioKm} km`,
                Origem: nomeBase,
                'Raio': `${raioKm} km`,
                'Área': areaKm2 >= 1
                  ? `${areaKm2.toFixed(2)} km²`
                  : `${(areaKm2 * 100).toFixed(2)} ha`
              };

          // ✅ Constrói popup próprio (mais limpo que o genérico)
          const linhas = Object.entries(props).map(([k, v]) =>
            `<div class="pop-linha">
              <span class="pop-lbl">${window.Security.escapeHTML(k)}:</span>
              <span class="pop-val">${window.Security.escapeHTML(v)}</span>
            </div>`
          ).join('');

          const html = `
            <div class="pop-topo">⭕ Buffer Geodésico</div>
            <div class="pop-corpo">${linhas}</div>
            <div class="pop-rodape-auditoria">
              <span>Origem: ${window.Security.escapeHTML(nomeBase)}</span>
              <span>Turf.js · ${new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          `;
          // ✅ Popup abre no centroide (posição consistente)
          layer.getPopupAnchor = () => [0, 0];
          layer.on('click', (e) => {
            // Recalcula o centro do buffer pra centralizar o popup
            try {
              const centro = layer.getBounds().getCenter();
              layer.setLatLng && layer.setLatLng(centro);   // só pra polígono
            } catch (e) { /* ignora */ }
          });
          layer.bindPopup(html);

          // ✅ Tooltip ao passar o mouse
          layer.bindTooltip(`⭕ Buffer ${raioKm} km`, {
            sticky: true,
            className: 'rotulo-hover-feicao'
          });
        }
      });

      CAMADAS_MAPA[id].addTo(window.mapa);

      // Adiciona no painel lateral
      const grupoEl = document.getElementById('grupo-importadas');
      const msgVazio = document.getElementById('msg-sem-importadas');
      if (msgVazio) msgVazio.style.display = 'none';

      if (grupoEl) {
        grupoEl.classList.remove('fechado');
        if (typeof window.construirItemCamada === 'function') {
          window.construirItemCamada(id, CONFIG_CAMADAS[id], grupoEl);
        }
        const cntBadge = document.getElementById(`cnt-${id}`);
        if (cntBadge) cntBadge.innerText = `(${geojson.features.length})`;
        setTimeout(() => {
          const item = document.getElementById(`item-camada-${id}`);
          if (item) item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);
      }

      // Ajusta zoom pro resultado
      try {
        const bounds = CAMADAS_MAPA[id].getBounds();
        if (bounds.isValid()) window.mapa.fitBounds(bounds, { padding: [40, 40] });
      } catch (e) { /* ignora */ }

      // Atualiza selects e legenda
      if (window.Styler) window.Styler.atualizarLegenda();
      if (window.FilterManager) window.FilterManager.atualizarSeletorCamadas();
    }
  };

  window.BufferTool = BufferTool;
  console.info('[js] BufferTool carregado (M9)');
})();