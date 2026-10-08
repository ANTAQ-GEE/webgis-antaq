/* ============================================================
   WebGIS ANTAQ — Módulo: Styler
   Escopo: presets de paleta, estilo de camadas, legenda dinâmica
   Dependências: window.CONFIG_CAMADAS, window.CAMADAS_MAPA,
                 window.PortClassification, window.ActionHistory,
                 window.PopupRenderer, window.Security, window.mapa
   Referências "lazy" (só em runtime, com guard):
                 window.CopilotoIA, window.SelectionManager
   Expõe: window.Styler
   ============================================================ */
(function () {
  'use strict';

  const Styler = {
    presets: {
      padrao_antaq: {
        nome: "Padrão Institucional ANTAQ (Oficial)",
        cores: { instalacoes_portuarias: "#0284c7", vias_navegadas: "#00e5ff", linhas_travessias: "#f59e0b", embarcacoes: "#38bdf8", rodovias: "#f97316", ferrovias: "#a855f7", snv_1973: "#94a3b8", uf: "#60a5fa", regioes: "#818cf8", pais: "#cbd5e1", tis_poligonais: "#ef4444", estados_amazonia_legal: "#059669", ucs_federais: "#15803d", ucs_todas_mma: "#047857" },
        coresPortos: { ORGANIZADO: "#0284c7", PUBLICO: "#06b6d4", TUP: "#10b981", IP4: "#f59e0b", ETC: "#8b5cf6", OUTROS: "#64748b" }
      },
      neon_satellite: {
        nome: "Neon Satellite (NASA High-Contrast)",
        cores: { instalacoes_portuarias: "#00f0ff", vias_navegadas: "#00ffff", linhas_travessias: "#ff00ff", embarcacoes: "#ffff00", rodovias: "#ffaa00", ferrovias: "#ff00bb", snv_1973: "#888888", uf: "#38bdf8", regioes: "#a855f7", pais: "#ffffff", tis_poligonais: "#ff0055", estados_amazonia_legal: "#10b981", ucs_federais: "#00ff66", ucs_todas_mma: "#00dd77" },
        coresPortos: { ORGANIZADO: "#00f0ff", PUBLICO: "#00a8ff", TUP: "#39ff14", IP4: "#ffe600", ETC: "#d600ff", OUTROS: "#94a3b8" }
      },
      classica: {
        nome: "Cartografia Clássica (IBGE / USGS)",
        cores: { instalacoes_portuarias: "#003366", vias_navegadas: "#1e3a8a", linhas_travessias: "#b45309", embarcacoes: "#0369a1", rodovias: "#c2410c", ferrovias: "#581c87", snv_1973: "#64748b", uf: "#374151", regioes: "#6b7280", pais: "#1f2937", tis_poligonais: "#b91c1c", estados_amazonia_legal: "#15803d", ucs_federais: "#166534", ucs_todas_mma: "#065f46" },
        coresPortos: { ORGANIZADO: "#003366", PUBLICO: "#336699", TUP: "#2e7d32", IP4: "#e65100", ETC: "#6a1b9a", OUTROS: "#546e7a" }
      },
      acessibilidade: {
        nome: "Acessibilidade Universal (Viridis)",
        cores: { instalacoes_portuarias: "#440154", vias_navegadas: "#3b528b", linhas_travessias: "#5ec962", embarcacoes: "#440154", rodovias: "#fde725", ferrovias: "#7ad151", snv_1973: "#414487", uf: "#31688e", regioes: "#26828e", pais: "#fde725", tis_poligonais: "#d95f02", estados_amazonia_legal: "#1f968b", ucs_federais: "#2a788e", ucs_todas_mma: "#22a884" },
        coresPortos: { ORGANIZADO: "#440154", PUBLICO: "#3b528b", TUP: "#21918c", IP4: "#5ec962", ETC: "#90d743", OUTROS: "#737373" }
      }
    },

    aplicarPresetGlobal: function (chave) {
      const preset = this.presets[chave];
      if (!preset) return;

      for (const [id, cfg] of Object.entries(CONFIG_CAMADAS)) {
        let cor = preset.cores[id];

        if (!cor && id.startsWith('ven_')) cor = preset.cores.vias_navegadas;

        if (!cor) {
          if (cfg.grupo === 'restricoes') cor = preset.cores.ucs_federais || '#15803d';
          else if (cfg.grupo === 'infra') cor = preset.cores.vias_navegadas || preset.cores.instalacoes_portuarias || '#0284c7';
          else if (cfg.grupo === 'limites') cor = preset.cores.uf || '#60a5fa';
          else cor = '#06b6d4';
        }
        cfg.cor = cor;

        const ind = document.getElementById(`indicador-cor-${id}`);
        if (ind && id !== 'instalacoes_portuarias') ind.style.backgroundColor = cor;
        const picker = document.getElementById(`color-picker-${id}`);
        if (picker) picker.value = cor;

        if (CAMADAS_MAPA[id] && id !== 'instalacoes_portuarias') {
          const isLinha = cfg.tipoGeo === 'linha' || cfg.tipoGeo === 'linha_tracejada';
          const estilo = isLinha ? { color: cor } : { color: cor, fillColor: cor };
          if (CAMADAS_MAPA[id].setStyle) CAMADAS_MAPA[id].setStyle(estilo);
          else if (CAMADAS_MAPA[id].eachLayer) CAMADAS_MAPA[id].eachLayer(l => { if (l.setStyle) l.setStyle(estilo); });
        }
      }

      if (preset.coresPortos) {
        for (const [tKey, cor] of Object.entries(preset.coresPortos)) {
          if (window.PortClassification.tipos[tKey]) {
            window.PortClassification.tipos[tKey].cor = cor;
            const inputColor = document.getElementById(`subcolor-${tKey}`);
            if (inputColor) inputColor.value = cor;
            if (window.SUBGRUPOS_PORTOS && window.SUBGRUPOS_PORTOS[tKey]) {
              window.SUBGRUPOS_PORTOS[tKey].eachLayer(m => {
                if (m.setIcon) m.setIcon(window.MapSymbols.ancora(cor, 26));
              });
            }
          }
        }
      }

      this.atualizarLegenda();
      if (window.UI && UI.toast) UI.toast(`Paleta aplicada: ${preset.nome}`);
    },
    /**
     * M12 — Opções específicas da camada TKU (choropleth linear).
     * Espessura e cor proporcionais ao campo `fluxo`.
     */
    _obterOpcoesTKU: function (cfg) {
      // Cache das faixas (calculado 1× na primeira chamada)
      if (!this._tkuFaixas) {
        this._tkuFaixas = this._calcularFaixasTKU();
      }

      const calcularPeso = (fluxo) => {
        if (!fluxo || fluxo <= 0) return 1;
        if (fluxo > this._tkuFaixas.p90) return 10;   // mais intenso — mais grosso
        if (fluxo > this._tkuFaixas.p70) return 8;
        if (fluxo > this._tkuFaixas.p50) return 6;
        if (fluxo > this._tkuFaixas.p30) return 4;
        return 2.5;
      };

      const calcularCor = (fluxo) => {
        if (!fluxo || fluxo <= 0) return '#94a3b8';   // cinza (sem fluxo)
        if (fluxo > this._tkuFaixas.p90) return '#dc2626';   // vermelho (mais intenso)
        if (fluxo > this._tkuFaixas.p70) return '#f97316';   // laranja
        if (fluxo > this._tkuFaixas.p50) return '#f59e0b';   // âmbar
        if (fluxo > this._tkuFaixas.p30) return '#84cc16';   // verde claro
        return '#10b981';   // verde (menor fluxo)
      };

      return {
        pane: 'paneLinhas',
        interactive: true,
        style: (f) => {
          const fluxo = Number(f.properties?.fluxo) || 0;
          return {
            pane: 'paneLinhas',
            color: calcularCor(fluxo),
            weight: calcularPeso(fluxo),
            opacity: 0.85,
            fill: false,
            lineCap: 'round'
          };
        },
        onEachFeature: (f, layer) => {
          // Popup customizado com info TKU
          const p = f.properties || {};
          const fluxoFmt = p.fluxo >= 1000
            ? `${(p.fluxo / 1000).toFixed(0)} mil`
            : (p.fluxo || 0).toFixed(0);
          const fluxoBruto = p.fluxo ? Number(p.fluxo).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '—';

          const badgeCor = calcularCor(Number(p.fluxo) || 0);

          const linhas = `
            <div class="pop-linha"><span class="pop-lbl">Ano:</span><span class="pop-val"><strong>${p.ano || '—'}</strong></span></div>
            <div class="pop-linha"><span class="pop-lbl">Navegação:</span><span class="pop-val">${window.Security.escapeHTML(p.navegacao || '—')}</span></div>
            <div class="pop-linha"><span class="pop-lbl">Trecho:</span><span class="pop-val">${window.Security.escapeHTML(p.nome || '—')}</span></div>
            <div class="pop-linha"><span class="pop-lbl">OD:</span><span class="pop-val">${window.Security.escapeHTML((p.municipio_origem || '?') + '/' + (p.uf_origem || '?'))} → ${window.Security.escapeHTML((p.municipio_destino || '—') + (p.uf_destino ? '/' + p.uf_destino : ''))}</span></div>
            <div class="pop-linha"><span class="pop-lbl">Rio:</span><span class="pop-val">${window.Security.escapeHTML(p.nome_rio || '—')}</span></div>
            <div class="pop-linha"><span class="pop-lbl">Extensão:</span><span class="pop-val">${p.extensao ? p.extensao.toFixed(1) + ' km' : '—'}</span></div>
            <div class="pop-linha"><span class="pop-lbl">Velocidade:</span><span class="pop-val">${p.velocidade ? p.velocidade + ' km/h' : '—'}</span></div>
          `;

          const html = `
            <div class="pop-topo" style="background:linear-gradient(135deg, #0a2540 0%, ${badgeCor} 100%);">
              🚢 TKU · Tonelada-Quilômetro Útil
            </div>
            <div class="pop-corpo">
              <div style="background:${badgeCor}22;border-left:4px solid ${badgeCor};padding:10px 12px;border-radius:6px;margin-bottom:10px;">
                <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Fluxo de Carga</div>
                <div style="font-size:22px;color:${badgeCor};font-weight:800;font-family:Consolas,monospace;margin-top:2px;">
                  ${fluxoFmt} <span style="font-size:11px;opacity:0.7;">t·km</span>
                </div>
                <div style="font-size:10.5px;color:#64748b;font-family:Consolas,monospace;">${fluxoBruto}</div>
              </div>
              ${linhas}
            </div>
            <div class="pop-rodape-auditoria">
              <span>Fonte: ANTAQ / Mercante</span>
              <span>Verificado: ${new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          `;

          layer.bindPopup(html);

          // Tooltip
          if (p.nome) {
            layer.bindTooltip(
              `<strong>${window.Security.escapeHTML(p.nome.slice(0, 40))}</strong><br>
               <small style="color:${badgeCor};">${p.ano} · ${window.Security.escapeHTML(p.navegacao || '')} · ${fluxoFmt} t·km</small>`,
              { sticky: true, className: 'rotulo-hover-feicao' }
            );
          }
        }
      };
    },

    /**
     * Calcula os percentis do fluxo TKU (p30, p50, p70, p90).
     */
    _calcularFaixasTKU: function () {
      const dados = window.DADOS_GEOJSON_BRUTOS['tku'];
      if (!dados?.features?.length) {
        return { p30: 100000, p50: 300000, p70: 600000, p90: 900000 };
      }

      const fluxos = dados.features
        .map(f => Number(f.properties?.fluxo) || 0)
        .filter(v => v > 0)
        .sort((a, b) => a - b);

      const p = (n) => fluxos[Math.floor(fluxos.length * n)] || 0;

      const faixas = {
        p30: p(0.30),
        p50: p(0.50),
        p70: p(0.70),
        p90: p(0.90)
      };

      console.info('[M12] Faixas TKU calculadas:', faixas);
      return faixas;
    },
    obterOpcoes: function (id) {
      const cfg = CONFIG_CAMADAS[id] || {};
      // ══════════════════════════════════════════════════════════════
      // M12 — TKU: choropleth linear por intensidade de fluxo
      // ══════════════════════════════════════════════════════════════
      if (id === 'tku') {
        return this._obterOpcoesTKU(cfg);
      }      
      let paneAlvo = 'overlayPane';
      if (id === 'instalacoes_portuarias' || cfg.tipoGeo === 'ponto') paneAlvo = 'panePontos';
      else if (cfg.tipoGeo === 'linha' || cfg.tipoGeo === 'linha_tracejada' || cfg.grupo === 'infra') paneAlvo = 'paneLinhas';
      else if (cfg.grupo === 'restricoes') paneAlvo = 'paneRestricoes';
      else if (cfg.grupo === 'limites') paneAlvo = 'paneLimites';

      // ✅ Limita interatividade pra features pesadas (melhora pan/mousemove)
      const ehLimiteDeFundo = (id === 'pais' || id === 'regioes' || id === 'estados_amazonia_legal');
      const ehPesadaLeve = (id === 'tis_poligonais' || id === 'ucs_federais');
      const modoCompleto = window._modoInterativo === true;   // toggle global

      // Só é interativa se NÃO for limite de fundo E (não for pesada OU modo completo ativo)
      const ehInterativa = !ehLimiteDeFundo && (!ehPesadaLeve || modoCompleto);

      return {
        pane: paneAlvo,
        interactive: ehInterativa,
        style: f => {
          const s = { pane: paneAlvo, color: cfg.cor, weight: cfg.peso, opacity: cfg.opacidade, fillColor: cfg.cor, fillOpacity: cfg.opacidade };
          if (cfg.tipoGeo === 'linha_tracejada') { s.dashArray = '6, 6'; s.fill = false; }
          else if (cfg.tipoGeo === 'poligono_linha' || cfg.tipoGeo === 'linha') { s.fill = false; }
          return s;
        },
        pointToLayer: (f, latlng) => {
          if (id === 'instalacoes_portuarias') {
            const cat = window.PortClassification.classificar(f.properties);
            const usarIcone = false;   // ✅ SEMPRE circleMarker
            if (usarIcone) {
              const m = L.marker(latlng, {
                pane: 'panePontos',
                icon: window.MapSymbols.ancora(cat.cor, 26)
                // ✅ riseOnHover removido
              });
              m._portoCatId = cat.id;
              return m;
            }
            return L.circleMarker(latlng, {
              pane: 'panePontos',
              radius: cat.raio || 5,
              fillColor: cat.cor,
              color: '#ffffff',
              weight: 2,
              fillOpacity: 0.95
            });
          }
          // ✅ Embarcações / AIS → barco apenas em zoom alto
          if (id === 'embarcacoes') {
            const usarIcone = false;
            if (usarIcone) {
              return L.marker(latlng, {
                pane: 'panePontos',
                icon: window.MapSymbols.barco(cfg.cor || '#38bdf8', 24),
                riseOnHover: true
              });
            }
            
            return L.circleMarker(latlng, {
              pane: 'panePontos',
              radius: 5,
              fillColor: cfg.cor || '#38bdf8',
              color: '#ffffff',
              weight: 1.5,
              fillOpacity: 0.9
            });
          }
          
          // ✅ Outros pontos → círculo padrão (comportamento antigo)
          return L.circleMarker(latlng, {
            pane: (cfg.grupo === 'restricoes') ? 'paneRestricoes' : 'panePontos',
            radius: cfg.peso || 5, fillColor: cfg.cor,
            color: '#ffffff', weight: 1.5, fillOpacity: cfg.opacidade
          });
        },
        onEachFeature: (f, layer) => {
          if (f.properties) {
            // ✅ Camadas pesadas só ganham popup se modo interativo estiver ligado
            const ehPesada = (id === 'tis_poligonais' || id === 'ucs_federais');
            if (!ehPesada || window._modoInterativo === true) {
              layer.bindPopup(window.PopupRenderer.gerar(id, f.properties));
            } else {
              // Popup leve: só nome + tipo (sem todos os atributos)
              const nome = f.properties.nome || f.properties.terrai_nom || f.properties.NOME_UC || 'Feição';
              layer.bindPopup(`<div class="pop-topo">${window.Security.escapeHTML(nome)}</div><div class="pop-corpo"><p style="color:#64748b;font-size:10.5px;">Ative o modo interativo para ver atributos completos.</p></div>`);
            }

            // Travessias: marker de ponte anexado ao layer
            if (id === 'linhas_travessias' && f.geometry && f.geometry.type === 'LineString') {
              try {
                const coords = f.geometry.coordinates;
                const meio = coords[Math.floor(coords.length / 2)];
                const latM = meio[1];
                const lngM = meio[0];
                const corPonte = '#f59e0b';
                const iconPonte = window.MapSymbols.ponte(corPonte, 22);
                layer._ponteMarker = L.marker([latM, lngM], {
                  pane: 'panePontos',
                  icon: iconPonte,
                  interactive: false
                });
              } catch (e) { /* ignora */ }
            }
            const p = f.properties;
            const nomeFeicao = p.nome || p.NOME_INSTALACAO || p.NOME_UC || p.terrai_nom || p.NOME_RIO || p.SIGLA_UF || cfg.nome;
            // ✅ Só bindTooltip em zoom alto E para camadas leves
            const zoomAtual = window.mapa.getZoom();
            const camadasLeves = ['linhas_travessias', 'embarcacoes', 'instalacoes_portuarias'];
            const temPoucasFeicoes = (DADOS_GEOJSON_BRUTOS[id]?.features?.length || 0) < 500;
            const podeTerTooltip = camadasLeves.includes(id) || temPoucasFeicoes;

            if (nomeFeicao && id !== 'uf' && !ehLimiteDeFundo && zoomAtual >= 10 && podeTerTooltip) {
              layer.bindTooltip(`<strong>${window.Security.escapeHTML(nomeFeicao)}</strong><br><small style="color:#0284c7;">${cfg.nome}</small>`, { sticky: true, className: 'rotulo-hover-feicao' });
            } else if (id === 'uf') {
              const sigla = window.Security.escapeHTML(p.SIGLA_UF || p.sigla || p.UF || p.nome);
              if (sigla) layer.bindTooltip(sigla, { permanent: true, direction: 'center', className: 'rotulo-uf' });
            }
            if (!ehLimiteDeFundo && id !== 'instalacoes_portuarias') {
              layer.on({
                mouseover: e => {
                  const l = e.target;
                  if (l.setStyle) {
                    l._origStyle = Object.assign({}, l.options);
                    l.setStyle({ color: '#f59e0b', weight: (l.options.weight || 2) + 2.5, fillOpacity: Math.min(0.9, (l.options.fillOpacity || 0.35) + 0.3) });
                  }
                },
                mouseout: e => {
                  const l = e.target;
                  if (l.setStyle && l._origStyle) l.setStyle(l._origStyle);
                },
                click: e => {
                  if (window.MeasurementTool && window.MeasurementTool.modo) return;
                  if (window.CopilotoIA) window.CopilotoIA.ultimoAtivoInspecionado = f;
                  if (window.CopilotoIA) window.CopilotoIA.ultimoAtivoInspecionado = f;

                  if (e.originalEvent && (e.originalEvent.ctrlKey || e.originalEvent.metaKey)) {
                    if (window.SelectionManager) window.SelectionManager.toggle(f, id);
                    return;
                  }
                  if (window.SelectionManager && window.SelectionManager.temSelecao()) {
                    window.SelectionManager.limpar(true);
                  }
                  if (window.CAMADA_DESTAQUE) mapa.removeLayer(window.CAMADA_DESTAQUE);
                  if (e.target.getBounds) {
                    window.CAMADA_DESTAQUE = L.polyline(e.target.getLatLngs ? e.target.getLatLngs() : [], {
                      color: '#f59e0b', weight: 4, opacity: 0.9, dashArray: '4, 4'
                    }).addTo(mapa);
                  }
                }
              });
            }
          }
        }
      };
    },

    atualizar: function (id, prop, valor, opcoes) {
      opcoes = opcoes || {};
      if (!CONFIG_CAMADAS[id]) return;

      const valorAnterior = CONFIG_CAMADAS[id][prop];
      CONFIG_CAMADAS[id][prop] = valor;

      if (!opcoes.semHistorico && valorAnterior !== valor && ['cor', 'opacidade', 'peso'].includes(prop) && window.ActionHistory) {
        const nome = CONFIG_CAMADAS[id]?.nome || id;
        const rotulos = { cor: 'cor', opacidade: 'opacidade', peso: 'peso' };
        const self = this;
        window.ActionHistory.registrar({
          tipo: 'estilo',
          descricao: `Alterar ${rotulos[prop]} de "${nome}"`,
          undo: () => self.atualizar(id, prop, valorAnterior, { semHistorico: true }),
          redo: () => self.atualizar(id, prop, valor, { semHistorico: true })
        });
      }

      const ind = document.getElementById(`indicador-cor-${id}`);
      if (ind && prop === 'cor' && id !== 'instalacoes_portuarias') ind.style.backgroundColor = valor;

      if (CAMADAS_MAPA[id]) {
        CAMADAS_MAPA[id].eachLayer(l => {
          if (id === 'instalacoes_portuarias') {
            if (prop === 'peso' && l.setRadius) l.setRadius(valor);
            else if (prop === 'opacidade' && l.setStyle) l.setStyle({ fillOpacity: valor });
          } else if (l.setStyle) {
            const s = {};
            if (prop === 'cor') { s.color = valor; s.fillColor = valor; }
            if (prop === 'opacidade') { s.fillOpacity = valor; }
            if (prop === 'peso') { s.weight = valor; }
            l.setStyle(s);
          }
        });
      }
      this.atualizarLegenda();
    },

    atualizarSubcamadaUC: function (esfId, cor) {
      if (!window.SUBGRUPOS_UCS || !window.SUBGRUPOS_UCS[esfId]) return;
      window.SUBGRUPOS_UCS[esfId].eachLayer(m => { if (m.setStyle) m.setStyle({ color: cor, fillColor: cor }); });
      this.atualizarLegenda();
    },

    atualizarSubcamadaPorto: function (tKey, novaCor) {
      if (!window.PortClassification.tipos[tKey]) return;
      window.PortClassification.tipos[tKey].cor = novaCor;
      if (window.SUBGRUPOS_PORTOS && window.SUBGRUPOS_PORTOS[tKey]) {
        window.SUBGRUPOS_PORTOS[tKey].eachLayer(m => {
          // ✅ Redesenha a âncora com a nova cor
          if (m.setIcon) m.setIcon(window.MapSymbols.ancora(novaCor, 26));
        });
      }
      this.atualizarLegenda();
    },

    atualizarLegenda: function () {
      const corpo = document.getElementById('corpo-legenda');
      if (!corpo) return;
      corpo.innerHTML = '';

      for (const [id, cfg] of Object.entries(CONFIG_CAMADAS)) {
        const estaAtiva = (CAMADAS_MAPA[id] && mapa.hasLayer(CAMADAS_MAPA[id])) || (!CAMADAS_MAPA[id] && cfg.ativa);
        if (!estaAtiva) continue;

        const l = document.createElement('div');
        l.style.marginBottom = '6px';
        l.style.width = '100%';

        if (id === 'instalacoes_portuarias') {
          let subItensHTML = '';
          for (const [tKey, cat] of Object.entries(window.PortClassification.tipos)) {
            const chkSub = document.getElementById(`chk-sub-${tKey}`);
            const subAtiva = chkSub ? chkSub.checked : true;
            if (subAtiva) {
              subItensHTML += `<div class="item-legenda-linha"><span style="display:inline-block; margin-right:2px;">${window.MapSymbols.html('ancora', cat.cor, 16)}</span><span>${cat.nome}</span></div>`;
            }
          }
          if (subItensHTML) {
            l.innerHTML = `<div style="display:flex; flex-direction:column; gap:4px; width:100%; border-bottom:1px dashed #cbd5e1; padding-bottom:6px;"><span style="font-weight:700; color:#0f172a; font-size:11px;">Instalações Portuárias:</span>${subItensHTML}</div>`;
            corpo.appendChild(l);
          }
          
        } else if (cfg.tipoGeo === 'linha' || cfg.tipoGeo === 'linha_tracejada') {
          // Travessias usam ícone de ponte
          if (id === 'linhas_travessias') {
            l.innerHTML = `<div class="item-legenda-linha"><span style="display:inline-block;">${window.MapSymbols.html('ponte', cfg.cor, 16)}</span><span>${cfg.nome}</span></div>`;
          } else {
            l.innerHTML = `<div class="item-legenda-linha"><span class="simbolo-linha" style="background:${cfg.cor};"></span><span>${cfg.nome}</span></div>`;
          }
          corpo.appendChild(l);
        } else if (cfg.tipoGeo === 'ponto') {
          // Embarcações usam barco
          if (id === 'embarcacoes') {
            l.innerHTML = `<div class="item-legenda-linha"><span style="display:inline-block;">${window.MapSymbols.html('barco', cfg.cor, 16)}</span><span>${cfg.nome}</span></div>`;
          } else {
            l.innerHTML = `<div class="item-legenda-linha"><span class="simbolo-ponto" style="background:${cfg.cor};"></span><span>${cfg.nome}</span></div>`;
          }
          corpo.appendChild(l);
        }
      }
    }
  };

  window.Styler = Styler;
  console.info('[js] Styler carregado');
})();