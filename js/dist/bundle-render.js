/* ============================================================
 * WebGIS Corporativo ANTAQ — Renderização, Estilos & Simbologia
 * Arquivo: js/dist/bundle-render.js
 * Descrição: Popups, ícones vetoriais SVG, estilização de camadas e AIS
 * Gerado em: 11/10/2026 20:23:35
 * Módulos inclusos:
 *   - js/render/popup-renderer.js
 *   - js/render/map-symbols.js
 *   - js/render/styler.js
 *   - js/render/port-symbology.js
 *   - js/render/styler-tku.js
 *   - js/render/ais-layer.js
 * ============================================================ */


/* --- INÍCIO: js/render/popup-renderer.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: PopupRenderer
   Escopo: geração de HTML dos popups de feições
   Dependências: Security, CONFIG_CAMADAS
   Expõe: window.PopupRenderer
   ============================================================ */
(function () {
  'use strict';

  const PopupRenderer = {
    gerar: function (id, properties) {
      const p = properties || {};
      const cfg = CONFIG_CAMADAS[id] || {};
      const titulo = Security.escapeHTML(
        p.nome || p.NOME_INSTALACAO || p.NOME_RIO || p.nome_rio || p.SIGLA_UF || 'Ativo Aquaviário'
      );

      let cardTempo = '';
      if (p.tempo || p.vel_cional || p.extensao || p.mun_origem || p.mun_estino) {
        const tempoFormatado = Security.escapeHTML(p.tempo || 'Não informado');
        const extNum = p.extensao ? Number(p.extensao).toFixed(1) + ' km' : '-';
        const velNum = p.vel_cional ? p.vel_cional + ' km/h' : '-';
        const orig = (p.mun_origem || '-') + (p.est_origem ? `/${p.est_origem}` : '');
        const dest = (p.mun_estino || '-') + (p.est_estino ? `/${p.est_estino}` : '');

        cardTempo = `
          <div style="background: linear-gradient(135deg, rgba(2, 132, 199, 0.25) 0%, rgba(11, 25, 44, 0.8) 100%); border: 1px solid #38bdf8; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="font-size:11px; text-transform:uppercase; color:#94a3b8; font-weight:700;">⏱️ Tempo de Percurso Estimado</span>
              <span class="badge-tempo-destaque badge-tempo-medio">${tempoFormatado}</span>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; font-size:11px; color:#f1f5f9;">
              <div>📏 <strong>Extensão:</strong> ${extNum}</div>
              <div>⚡ <strong>Velocidade:</strong> ${velNum}</div>
              <div style="grid-column: span 2;">📍 <strong>Trecho OD:</strong> ${Security.escapeHTML(orig)} ➔ ${Security.escapeHTML(dest)}</div>
              ${p.nom_eclusa ? `<div style="grid-column: span 2; color:#a7f3d0;">🚪 <strong>Eclusa:</strong> ${Security.escapeHTML(p.nom_eclusa)}</div>` : ''}
              ${(p.pro_de_min || p.pro_de_max) ? `<div style="grid-column: span 2; font-size:10px; color:#94a3b8;">🌊 <strong>Profundidade / Calado:</strong> ${p.pro_de_min || '-'}m a ${p.pro_de_max || '-'}m</div>` : ''}
            </div>
          </div>
        `;
      }

      let linhas = '';
      for (const [chave, valor] of Object.entries(p)) {
        if (['geom', 'geometry', 'id', 'gid', 'objectid'].includes(chave.toLowerCase())) continue;
        if (cfg && cfg.camposVisiveis && cfg.camposVisiveis.length > 0 && !cfg.camposVisiveis.includes(chave)) continue;
        if (Security.ehValido(valor)) {
          linhas += `<div class="pop-linha"><span class="pop-lbl">${Security.escapeHTML(chave)}:</span><span class="pop-val">${Security.escapeHTML(valor)}</span></div>`;
        }
      }

      const dataAuditoria = new Date().toLocaleDateString('pt-BR');
      return `
        <div class="pop-topo">${titulo}</div>
        <div class="pop-corpo">${cardTempo}${linhas || '<p style="color:#64748b;">Nenhum atributo ativo.</p>'}</div>
        <div class="pop-rodape-auditoria">
          <span>Fonte: ANTAQ/GEE</span>
          <span>Verificado: ${dataAuditoria}</span>
        </div>
      `;
    }
  };

  window.PopupRenderer = PopupRenderer;
  console.info('[js] PopupRenderer carregado');
})();
/* --- FIM: js/render/popup-renderer.js --- */

/* --- INÍCIO: js/render/map-symbols.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: MapSymbols
   Escopo: ícones SVG institucionais para markers no mapa
           (âncora, ponte, barco)
   Dependências: nenhuma
   Expõe: window.MapSymbols
   ============================================================ */
(function () {
  'use strict';

  /**
   * Gera um L.divIcon com SVG inline.
   * @param {string} svgInterno - conteúdo SVG (paths)
   * @param {string} cor - cor CSS (hex)
   * @param {number} tamanho - tamanho em px
   * @param {string} [extraClass] - classe CSS adicional
   */
  function criarDivIcon(svgInterno, cor, tamanho, extraClass) {
    const tam = tamanho || 28;
    const strokeColor = '#ffffff';
    const strokeWidth = 2;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
           width="${tam}" height="${tam}" fill="none"
           stroke="${strokeColor}" stroke-width="${strokeWidth}"
           stroke-linecap="round" stroke-linejoin="round"
           style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));">
        <circle cx="12" cy="12" r="10" fill="${cor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" opacity="0.95"/>
        <g transform="scale(0.55) translate(10, 10)">
          ${svgInterno}
        </g>
      </svg>
    `;

    return L.divIcon({
      className: 'marker-symbol ' + (extraClass || ''),
      html: svg,
      iconSize: [tam, tam],
      iconAnchor: [tam / 2, tam / 2],
      popupAnchor: [0, -tam / 2]
    });
  }

  /* ---------- SVGs base (desenhados no viewBox 0 0 24 24) ---------- */

  // ⚓ Âncora — círculo superior + haste + cruz + base curva
  const SVG_ANCORA = `
    <circle cx="12" cy="4" r="2.8"/>
    <line x1="12" y1="6.8" x2="12" y2="21"/>
    <line x1="6.5" y1="11" x2="17.5" y2="11"/>
    <path d="M4 14 Q4 21 12 21 Q20 21 20 14"/>
  `;

  // 🌉 Ponte — vão de arco + tabuleiro
  const SVG_PONTE = `
    <path d="M2 14 Q12 4 22 14"/>
    <line x1="2" y1="14" x2="22" y2="14"/>
    <line x1="6" y1="14" x2="6" y2="9"/>
    <line x1="18" y1="14" x2="18" y2="9"/>
    <line x1="12" y1="14" x2="12" y2="6"/>
  `;

  // 🚢 Barco — vela + casco
  const SVG_BARCO = `
    <path d="M12 2 L12 13 L20 13 Z"/>
    <line x1="12" y1="2" x2="12" y2="13"/>
    <path d="M3 15 L21 15 L19 21 L5 21 Z"/>
  `;

  const MapSymbols = {
    /**
     * Marcador de âncora (Instalações Portuárias).
     * @param {string} cor — cor do regime (hex)
     * @param {number} [tamanho=28]
     */
    ancora: function (cor, tamanho) {
      return criarDivIcon(SVG_ANCORA, cor || '#10b981', tamanho || 28, 'marker-ancora');
    },

    /**
     * Marcador de ponte (Travessias).
     */
    ponte: function (cor, tamanho) {
      return criarDivIcon(SVG_PONTE, cor || '#f59e0b', tamanho || 26, 'marker-ponte');
    },

    /**
     * Marcador de barco (Embarcações/AIS).
     */
    barco: function (cor, tamanho) {
      return criarDivIcon(SVG_BARCO, cor || '#38bdf8', tamanho || 26, 'marker-barco');
    },

    /**
     * Utilitário: retorna o HTML do SVG pra usar em legendas.
     */
    html: function (tipo, cor, tamanho) {
      tamanho = tamanho || 18;
      const svgs = { ancora: SVG_ANCORA, ponte: SVG_PONTE, barco: SVG_BARCO };
      const svgInterno = svgs[tipo];
      if (!svgInterno) return '';

      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
             width="${tamanho}" height="${tamanho}" fill="none"
             stroke="#ffffff" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: middle;">
          <circle cx="12" cy="12" r="10" fill="${cor}" opacity="0.95"/>
          <g transform="scale(0.55) translate(10, 10)">
            ${svgInterno}
          </g>
        </svg>
      `;
    },
    /**
     * HTML do cluster com ícone temático + número.
     * @param {string} tipo — 'ancora' | 'ponte' | 'barco'
     * @param {string} cor — cor hex
     * @param {number} count — número no cluster
     * @param {number} dim — diâmetro em px
     */
    clusterHtml: function (tipo, cor, count, dim) {
      dim = dim || 40;
      return `<div style="
        background:${cor};color:#fff;
        width:${dim}px;height:${dim}px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        border:3px solid rgba(255,255,255,0.92);
        box-shadow:0 2px 6px rgba(0,0,0,0.35);
        font-family:'Segoe UI',sans-serif;font-weight:700;
        font-size:${Math.round(dim * 0.35)}px;
      ">${count}</div>`;
    },
  };

  window.MapSymbols = MapSymbols;
  console.info('[js] MapSymbols carregado (âncora, ponte, barco)');
})();
/* --- FIM: js/render/map-symbols.js --- */

/* --- INÍCIO: js/render/styler.js --- */
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
/* --- FIM: js/render/styler.js --- */

/* --- INÍCIO: js/render/port-symbology.js --- */
/* ============================================================
   PortSymbology v2 — Decora portos com âncoras SEM quebrar handlers
   Abordagem: overlay não-interativo sobre circleMarker invisível
   ============================================================ */
(function () {
  'use strict';

  function obterConfig(chave) {
    const k = String(chave || '').toUpperCase();
    const MAP = {
      ORGANIZADO: 'ORGANIZADO', PUBLICO: 'PUBLICO', TUP: 'TUP',
      ETC: 'ETC', IP4: 'IP4', OUTROS: 'OUTROS'
    };
    const TAMANHOS = {
      ORGANIZADO: { minZoom: 3,  size: 22 },
      PUBLICO:    { minZoom: 6,  size: 18 },
      TUP:        { minZoom: 7,  size: 16 },
      ETC:        { minZoom: 8,  size: 15 },
      IP4:        { minZoom: 9,  size: 13 },
      OUTROS:     { minZoom: 11, size: 10 }
    };
    let cor = '#64748b';
    try {
      const kpc = MAP[k] || k;
      const item = window.PortClassification?.tipos?.[kpc]
                || window.PortClassification?.tipos?.[k];
      if (item && item.cor) cor = item.cor;
    } catch (e) {}
    const t = TAMANHOS[k] || { minZoom: 10, size: 12 };
    return { minZoom: t.minZoom, size: t.size, cor };
  }

  function anchorSVG(cor, size) {
    return `
      <svg viewBox="0 0 24 24" width="${size}" height="${size}"
           xmlns="http://www.w3.org/2000/svg" style="display:block;">
        <circle cx="12" cy="12" r="11" fill="#ffffff"
                stroke="${cor}" stroke-width="1.5"/>
        <path d="M12 4a2 2 0 0 0-2 2c0 .9.6 1.7 1.5 1.9V9H9.5v1.5h2v7.3c-2.6-.3-4.7-2.3-5-4.8H8L5.5 10.5 3 13h1.5c.4 3.9 3.7 7 7.5 7s7.1-3.1 7.5-7H21L18.5 10.5 16 13h1.5c-.3 2.5-2.4 4.5-5 4.8v-7.3h2V9h-2V7.9c.9-.2 1.5-1 1.5-1.9a2 2 0 0 0-2-2z"
              fill="${cor}"/>
      </svg>`;
  }

  function criarIcone(cfg) {
    return L.divIcon({
      className: 'port-anchor-marker',
      html: anchorSVG(cfg.cor, cfg.size),
      iconSize: [cfg.size, cfg.size],
      iconAnchor: [cfg.size / 2, cfg.size / 2]
    });
  }

  const PortSymbology = {
    _mapa: null,
    _zoomListener: null,
    _aplicado: false,

    init(mapa) {
      if (!mapa) return;
      this._mapa = mapa;
      this._injetarCSS();

      this._zoomListener = () => this._aplicarVisibilidadePorZoom();
      mapa.on('zoomend', this._zoomListener);

      const self = this;
      let tentativas = 0;
      const check = setInterval(() => {
        tentativas++;
        if (window.SUBGRUPOS_PORTOS) {
          clearInterval(check);
          setTimeout(() => self.aplicar(), 400);
        }
        if (tentativas > 60) clearInterval(check);
      }, 500);

      mapa.on('layeradd', () => {
        if (this._aplicado) setTimeout(() => this._aplicarVisibilidadePorZoom(), 100);
      });

      console.info('[PortSymbology] v2 pronto');
    },

    /* ------------------------------------------------------------
       Aplica âncoras SOBRE os circleMarkers (que ficam invisíveis)
       ------------------------------------------------------------ */
    aplicar() {
      const subgrupos = window.SUBGRUPOS_PORTOS;
      if (!subgrupos) return;

      let total = 0;
      Object.keys(subgrupos).forEach(chave => {
        const fg = subgrupos[chave];
        if (!fg || !fg.getLayers) return;
        const cfg = obterConfig(chave);

        [...fg.getLayers()].forEach(m => {
          if (m._portSymAplicado) return;
          if (!(m instanceof L.CircleMarker)) return;

            // Torna invisível E remove a interatividade do SVG original
            try {
                m.setStyle({ opacity: 0, fillOpacity: 0, weight: 0 });
                // Aguarda o SVG ser renderizado e desativa pointer-events
                setTimeout(() => {
                    if (m._path) m._path.style.pointerEvents = 'none';
                    if (m._container) m._container.style.pointerEvents = 'none';
                }, 50);
            } catch (e) { }

          // 2. Âncora overlay não-interativa (cliques passam por baixo)
          const anchor = L.marker(m.getLatLng(), {
            icon: criarIcone(cfg),
            zIndexOffset: 150,
            interactive: true,
            keyboard: false
          });
          anchor._portMinZoom = cfg.minZoom;
          anchor._origem = m;
            // Copia os handlers de click (menos o interno do popup)
            if (m._events && m._events.click) {
                m._events.click.forEach(handler => {
                    const src = handler.fn.toString();
                    if (src.includes('this._popup&&this._map') || src.includes('this._popup && this._map')) return;
                    try { anchor.on('click', handler.fn, handler.ctx); } catch (e) { }
                });
            }

            // Rebind do popup no anchor
            if (m.getPopup && m.getPopup()) {
                anchor.bindPopup(m.getPopup().getContent(), {
                    maxWidth: m.getPopup().options?.maxWidth || 320,
                    className: m.getPopup().options?.className || ''
                });
            }
            if (m.getTooltip && m.getTooltip()) {
                anchor.bindTooltip(m.getTooltip().getContent(), {
                    direction: 'top', offset: [0, -12], className: 'port-anchor-tooltip'
                });
            }
          fg.addLayer(anchor);

          m._portSymAplicado = true;
          m._portSymAnchor = anchor;
          total++;
        });
      });

      this._aplicado = true;
      this._aplicarVisibilidadePorZoom();
      console.log('[PortSymbology] ' + total + ' portos decorados');
    },

    _aplicarVisibilidadePorZoom() {
      if (!this._mapa) return;
      const zoom = this._mapa.getZoom();

      const processar = (fg) => {
        if (!fg || !fg.getLayers) return;
        fg.getLayers().forEach(m => {
          if (!m._portSymAplicado || !m._portSymAnchor) return;
          const anchor = m._portSymAnchor;
          const el = anchor.getElement ? anchor.getElement() : null;
          if (!el) return;

          const minZ = anchor._portMinZoom || 10;
          if (zoom >= minZ) {
            el.style.display = '';
            el.style.opacity = '1';
          } else {
            el.style.display = 'none';
            el.style.opacity = '0';
          }
        });
      };

      if (window.SUBGRUPOS_PORTOS) {
        Object.values(window.SUBGRUPOS_PORTOS).forEach(processar);
      }
    },

    _injetarCSS() {
      if (document.getElementById('port-symbology-css')) return;
      const style = document.createElement('style');
      style.id = 'port-symbology-css';
      style.textContent = `
        .port-anchor-marker {
          background: transparent !important;
          border: none !important;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
        }
      `;
      document.head.appendChild(style);
    },

    refresh() { this._aplicado = false; this.aplicar(); }
  };

  window.PortSymbology = PortSymbology;

  const tentarInit = () => {
    if (window.mapa) PortSymbology.init(window.mapa);
    else setTimeout(tentarInit, 300);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tentarInit);
  } else {
    tentarInit();
  }
})();
/* --- FIM: js/render/port-symbology.js --- */

/* --- INÍCIO: js/render/styler-tku.js --- */
/* ============================================================
   WebGIS ANTAQ — Módulo: StylerTKU (M12 — extensão)
   Escopo: adiciona suporte a TKU ao Styler sem modificar o original
   Dependências: window.Styler, window.DADOS_GEOJSON_BRUTOS,
                 window.Security, turf (global)
   Expõe: (estende window.Styler)
   ============================================================ */
(function () {
  'use strict';

  if (!window.Styler) {
    console.error('[M12] Styler não carregado. Verifique a ordem dos scripts.');
    return;
  }

  const Styler = window.Styler;

  /* ============================================================
     1. FAIXAS DO TKU (percentis)
     ============================================================ */
  Styler._calcularFaixasTKU = function () {
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
  };

  /* ============================================================
     2. OPÇÕES DA CAMADA TKU
     ============================================================ */
  Styler._obterOpcoesTKU = function (cfg) {
    if (!this._tkuFaixas) {
      this._tkuFaixas = this._calcularFaixasTKU();
    }

    const calcPeso = (fluxo) => {
      if (!fluxo || fluxo <= 0) return 1;
      if (fluxo > this._tkuFaixas.p90) return 10;
      if (fluxo > this._tkuFaixas.p70) return 8;
      if (fluxo > this._tkuFaixas.p50) return 6;
      if (fluxo > this._tkuFaixas.p30) return 4;
      return 2.5;
    };

    const calcCor = (fluxo) => {
      if (!fluxo || fluxo <= 0) return '#94a3b8';
      if (fluxo > this._tkuFaixas.p90) return '#dc2626';
      if (fluxo > this._tkuFaixas.p70) return '#f97316';
      if (fluxo > this._tkuFaixas.p50) return '#f59e0b';
      if (fluxo > this._tkuFaixas.p30) return '#84cc16';
      return '#10b981';
    };

    return {
      pane: 'paneLinhas',
      interactive: true,
      style: (f) => {
        const fluxo = Number(f.properties?.fluxo) || 0;
        return {
          pane: 'paneLinhas',
          color: calcCor(fluxo),
          weight: calcPeso(fluxo),
          opacity: 0.85,
          fill: false,
          lineCap: 'round'
        };
      },
      onEachFeature: (f, layer) => {
        const p = f.properties || {};
        const fluxoFmt = p.fluxo >= 1000
          ? `${(p.fluxo / 1000).toFixed(0)} mil`
          : (p.fluxo || 0).toFixed(0);
        const fluxoBruto = p.fluxo
          ? Number(p.fluxo).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
          : '—';
        const badgeCor = calcCor(Number(p.fluxo) || 0);

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

        if (p.nome) {
          layer.bindTooltip(
            `<strong>${window.Security.escapeHTML(p.nome.slice(0, 40))}</strong><br>
             <small style="color:${badgeCor};">${p.ano} · ${window.Security.escapeHTML(p.navegacao || '')} · ${fluxoFmt} t·km</small>`,
            { sticky: true, className: 'rotulo-hover-feicao' }
          );
        }
      }
    };
  };

  /* ============================================================
     3. INTERCEPTA obterOpcoes pra retornar as opções TKU quando for id='tku'
     ============================================================ */
  const obterOpcoesOriginal = Styler.obterOpcoes;
  Styler.obterOpcoes = function (id) {
    if (id === 'tku') {
      return this._obterOpcoesTKU(window.CONFIG_CAMADAS[id] || {});
    }
    return obterOpcoesOriginal.apply(this, arguments);
  };

  /* ============================================================
     4. ESTENDE atualizarLegenda pra incluir o gradiente TKU
     ============================================================ */
  const atualizarLegendaOriginal = Styler.atualizarLegenda;
  Styler.atualizarLegenda = function () {
    // Chama a versão original (que já lida com todas as outras camadas)
    atualizarLegendaOriginal.apply(this, arguments);

    // ✅ Adiciona bloco especial do TKU SE estiver ativo
    const cfg = window.CONFIG_CAMADAS['tku'];
    if (!cfg) return;

    const estaAtiva = (window.CAMADAS_MAPA['tku'] && window.mapa.hasLayer(window.CAMADAS_MAPA['tku']))
                   || (!window.CAMADAS_MAPA['tku'] && cfg.ativa);
    if (!estaAtiva) return;

    const corpo = document.getElementById('corpo-legenda');
    if (!corpo) return;

    // Verifica se já foi adicionado (evita duplicação)
    if (corpo.querySelector('[data-tku-legend]')) return;

    const div = document.createElement('div');
    div.setAttribute('data-tku-legend', '1');
    div.style.marginBottom = '6px';
    div.style.width = '100%';
    div.innerHTML = `
      <div style="font-weight:700; color:#0f172a; font-size:11px; margin-bottom:4px;">📦 TKU — Intensidade de Carga</div>
      <div style="display:flex; flex-direction:column; gap:3px;">
        <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#10b981; height:2.5px; width:24px;"></span><span>Muito baixo (&lt; p30)</span></div>
        <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#84cc16; height:4px; width:24px;"></span><span>Baixo (p30-p50)</span></div>
        <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#f59e0b; height:6px; width:24px;"></span><span>Médio (p50-p70)</span></div>
        <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#f97316; height:8px; width:24px;"></span><span>Alto (p70-p90)</span></div>
        <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#dc2626; height:10px; width:24px;"></span><span>Muito alto (&gt; p90)</span></div>
      </div>
    `;
    corpo.appendChild(div);
  };

  /* ============================================================
     5. LEGENDA — modo "por ano" (alternativo ao gradiente de fluxo)
     ============================================================ */
  const atualizarLegendaBase = Styler.atualizarLegenda;
  Styler.atualizarLegenda = function () {
    atualizarLegendaBase.apply(this, arguments);

    const cfg = window.CONFIG_CAMADAS['tku'];
    if (!cfg) return;

    const estaAtiva = (window.CAMADAS_MAPA['tku'] && window.mapa.hasLayer(window.CAMADAS_MAPA['tku']))
                   || (!window.CAMADAS_MAPA['tku'] && cfg.ativa);
    if (!estaAtiva) return;

    const corpo = document.getElementById('corpo-legenda');
    if (!corpo) return;

    // Remove legenda antiga do TKU (vai ser re-adicionada no modo atual)
    const antiga = corpo.querySelector('[data-tku-legend]');
    if (antiga) antiga.remove();

    const modoAno = window.TKUManager && window.TKUManager.modoCor === 'ano';

    const div = document.createElement('div');
    div.setAttribute('data-tku-legend', '1');
    div.style.marginBottom = '6px';
    div.style.width = '100%';

    if (modoAno) {
      // Modo ANO: 3 cores fixas
      div.innerHTML = `
        <div style="font-weight:700; color:#0f172a; font-size:11px; margin-bottom:4px;">📦 TKU — por Ano</div>
        <div style="display:flex; flex-direction:column; gap:3px;">
          <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#3b82f6; height:4px; width:24px;"></span><span>2021</span></div>
          <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#f59e0b; height:4px; width:24px;"></span><span>2023</span></div>
          <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#dc2626; height:4px; width:24px;"></span><span>2025</span></div>
        </div>
      `;
    } else {
      // Modo FLUXO: gradiente
      div.innerHTML = `
        <div style="font-weight:700; color:#0f172a; font-size:11px; margin-bottom:4px;">📦 TKU — Intensidade de Carga</div>
        <div style="display:flex; flex-direction:column; gap:3px;">
          <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#10b981; height:2.5px; width:24px;"></span><span>Muito baixo (&lt; p30)</span></div>
          <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#84cc16; height:4px; width:24px;"></span><span>Baixo (p30-p50)</span></div>
          <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#f59e0b; height:6px; width:24px;"></span><span>Médio (p50-p70)</span></div>
          <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#f97316; height:8px; width:24px;"></span><span>Alto (p70-p90)</span></div>
          <div class="item-legenda-linha"><span class="simbolo-linha" style="background:#dc2626; height:10px; width:24px;"></span><span>Muito alto (&gt; p90)</span></div>
        </div>
      `;
    }
    corpo.appendChild(div);
  };

  console.info('[js] StylerTKU carregado (M12 — extensão do Styler)');
})();
/* --- FIM: js/render/styler-tku.js --- */

/* --- INÍCIO: js/render/ais-layer.js --- */
/* ============================================================
   M15 — AIS Layer v6 (animação fluida, markers persistentes)
   - Ícones persistem entre frames (não recriam)
   - Interpolação entre 2 pontos por frame
   - Popup estilo MarineTraffic
   ============================================================ */
(function () {
  'use strict';

  const CORES_STATUS = { no_prazo: '#10b981', atencao: '#f59e0b', atrasado: '#ef4444', neutro: '#94a3b8' };
  const CORES_TIPO = {
    'Carga Geral': '#2563eb', 'Carga Perigosa (Hazmat)': '#dc2626',
    'Tanque': '#ea580c', 'Passageiros': '#7c3aed',
    'Rebocador': '#059669', 'Empurrador': '#0891b2',
    'Balsa': '#475569', 'Pesca': '#15803d', '_default': '#64748b'
  };

  function corDoTipo(t) { return CORES_TIPO[t] || CORES_TIPO['_default']; }
  function corDoStatus(s) { return CORES_STATUS[s] || CORES_STATUS.neutro; }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371.0;
    const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function splitPontos(pontos) {
    if (pontos.length < 2) return [pontos];
    const segs = []; let atual = [pontos[0]];
    for (let i = 1; i < pontos.length; i++) {
      const prev = pontos[i - 1], cur = pontos[i];
      if (haversineKm(prev.lat, prev.lon, cur.lat, cur.lon) > 20) {
        if (atual.length > 1) segs.push(atual);
        atual = [];
      }
      atual.push(cur);
    }
    if (atual.length > 1) segs.push(atual);
    return segs;
  }

  /* ---------- Silhuetas (vista top-down) ---------- */
  function silhueta(tipo, cor) {
    const s = '#0f172a', w = 1.2;
    switch (tipo) {
      case 'Carga Geral':
      case 'Carga Perigosa (Hazmat)':
        return `<path d="M12 1.5 L20 7.5 L20 21.5 L17.5 22.5 L6.5 22.5 L4 21.5 L4 7.5 Z" fill="${cor}" stroke="${s}" stroke-width="${w}" stroke-linejoin="round"/>
                <rect x="6" y="17" width="12" height="3" fill="#f1f5f9" opacity="0.95"/>
                <rect x="8" y="6.5" width="8" height="2" fill="${s}" opacity="0.5"/>
                <rect x="8" y="9.5" width="8" height="2" fill="${s}" opacity="0.5"/>
                <rect x="8" y="12.5" width="8" height="2" fill="${s}" opacity="0.5"/>`;
      case 'Tanque':
        return `<path d="M12 1.5 L20 7 L20 22 L17 23 L7 23 L4 22 L4 7 Z" fill="${cor}" stroke="${s}" stroke-width="${w}" stroke-linejoin="round"/>
                <rect x="6" y="18" width="12" height="2.5" fill="#f1f5f9" opacity="0.95"/>
                <circle cx="12" cy="9" r="2.6" fill="${s}" opacity="0.45"/>
                <circle cx="12" cy="14.5" r="2.6" fill="${s}" opacity="0.45"/>`;
      case 'Passageiros':
        return `<path d="M12 1 L20 6.5 L20 22 L17 23 L7 23 L4 22 L4 6.5 Z" fill="${cor}" stroke="${s}" stroke-width="${w}" stroke-linejoin="round"/>
                <rect x="6" y="5.5" width="12" height="16" fill="#f1f5f9" opacity="0.9" rx="1"/>
                <rect x="7.5" y="7" width="3" height="2.4" fill="${cor}" opacity="0.6"/>
                <rect x="13.5" y="7" width="3" height="2.4" fill="${cor}" opacity="0.6"/>
                <rect x="7.5" y="11" width="3" height="2.4" fill="${cor}" opacity="0.6"/>
                <rect x="13.5" y="11" width="3" height="2.4" fill="${cor}" opacity="0.6"/>
                <rect x="7.5" y="15" width="3" height="2.4" fill="${cor}" opacity="0.6"/>
                <rect x="13.5" y="15" width="3" height="2.4" fill="${cor}" opacity="0.6"/>
                <rect x="9.5" y="20.5" width="5" height="2" fill="${s}" opacity="0.65"/>`;
      case 'Rebocador':
      case 'Empurrador':
        return `<path d="M12 3 L19 8 L19 21 L16.5 22.5 L7.5 22.5 L5 21 L5 8 Z" fill="${cor}" stroke="${s}" stroke-width="${w}" stroke-linejoin="round"/>
                <rect x="7.5" y="5" width="9" height="5" fill="#f1f5f9" opacity="0.9" rx="0.8"/>
                <rect x="9" y="14" width="6" height="6" fill="${s}" opacity="0.5"/>`;
      case 'Balsa':
        return `<rect x="3" y="4" width="18" height="17" fill="${cor}" stroke="${s}" stroke-width="${w}" rx="0.5"/>
                <line x1="3" y1="9" x2="21" y2="9" stroke="${s}" stroke-width="0.7" opacity="0.55"/>
                <line x1="3" y1="14" x2="21" y2="14" stroke="${s}" stroke-width="0.7" opacity="0.55"/>
                <line x1="3" y1="19" x2="21" y2="19" stroke="${s}" stroke-width="0.7" opacity="0.55"/>
                <rect x="8" y="1.5" width="8" height="2.5" fill="#f1f5f9" opacity="0.9"/>`;
      case 'Pesca':
        return `<path d="M12 2 L18.5 7 L18.5 20 L16 22 L8 22 L5.5 20 L5.5 7 Z" fill="${cor}" stroke="${s}" stroke-width="${w}" stroke-linejoin="round"/>
                <rect x="8" y="5" width="8" height="4.5" fill="#f1f5f9" opacity="0.9" rx="0.6"/>
                <line x1="4" y1="15" x2="20" y2="15" stroke="${s}" stroke-width="0.7" opacity="0.65"/>
                <line x1="4" y1="18" x2="20" y2="18" stroke="${s}" stroke-width="0.7" opacity="0.65"/>`;
      default:
        return `<path d="M12 3 L19 8 L19 20 L17 22 L7 22 L5 20 L5 8 Z" fill="${cor}" stroke="${s}" stroke-width="${w}" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" fill="#f1f5f9" opacity="0.85"/>`;
    }
  }

  const ICON = 24;

  function criarIcone(tipo, status, cog, destaque) {
    const cor = corDoTipo(tipo);
    const sc = corDoStatus(status);
    const rot = Number(cog) || 0;
    const ring = destaque
      ? `<circle cx="${ICON / 2}" cy="${ICON / 2}" r="${ICON / 2 - 1}" fill="none" stroke="#38bdf8" stroke-width="2"/>`
      : '';
    return L.divIcon({
      className: 'ais-marker',
      html: `
        <div style="position:relative;width:${ICON}px;height:${ICON}px;
                    filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));">
          <svg viewBox="0 0 24 24" width="${ICON}" height="${ICON}"
               xmlns="http://www.w3.org/2000/svg"
               style="transform:rotate(${rot}deg);
                      transform-origin:${ICON / 2}px ${ICON / 2}px;
                      display:block;transition:transform 0.4s ease;">
            ${silhueta(tipo, cor)}
            ${ring}
          </svg>
          <span style="position:absolute;top:-1px;right:-1px;
                       width:8px;height:8px;border-radius:50%;
                       background:${sc};border:1.5px solid #0f172a;
                       box-shadow:0 1px 2px rgba(0,0,0,0.5);"></span>
        </div>`,
      iconSize: [ICON, ICON],
      iconAnchor: [ICON / 2, ICON / 2],
      popupAnchor: [0, -ICON / 2 - 2]
    });
  }

  /* ---------- Popup estilo MarineTraffic ---------- */
  function popupHTML(pos) {
    const c = pos.cadastro || {};
    const status = pos.status || 'neutro';
    const cor = corDoStatus(status);
    const corTipo = corDoTipo(c.tipo);
    const label = { no_prazo: 'NO PRAZO', atencao: 'ATENÇÃO', atrasado: 'ATRASADO' }[status] || '—';
    const atraso = (pos.atraso_h ?? null) !== null ? `+${Number(pos.atraso_h).toFixed(1)}h` : '—';

    return `
      <div style="font-family:'Segoe UI',sans-serif;min-width:280px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;
                    padding-bottom:10px;border-bottom:1px solid #e2e8f0;">
          <div style="width:32px;height:32px;border-radius:6px;background:${corTipo};
                      display:flex;align-items:center;justify-content:center;
                      color:#fff;font-size:16px;font-weight:800;">🚢</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:700;color:#0f172a;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${c.nome || 'MMSI ' + pos.mmsi}
            </div>
            <div style="font-size:10.5px;color:#64748b;margin-top:1px;">
              ${c.tipo || '—'} · ${c.bandeira || 'BR'}
            </div>
          </div>
          <span style="background:${cor};color:#fff;font-size:8.5px;font-weight:800;
                       letter-spacing:0.5px;padding:3px 8px;border-radius:10px;">
            ${label}
          </span>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;
                    font-size:10.5px;color:#475569;margin-bottom:10px;">
          <div><span style="color:#94a3b8;">MMSI</span><br><b style="color:#0f172a;">${pos.mmsi}</b></div>
          <div><span style="color:#94a3b8;">Atraso</span><br><b style="color:${cor};">${atraso}</b></div>
          <div><span style="color:#94a3b8;">Velocidade</span><br><b style="color:#0f172a;">${pos.sog || 0} nós</b></div>
          <div><span style="color:#94a3b8;">Rumo</span><br><b style="color:#0f172a;">${pos.cog || 0}°</b></div>
        </div>

        <div style="font-size:11px;color:#334155;
                    border-top:1px solid #e2e8f0;padding-top:8px;">
          ${pos.porto_origem ? `<div style="margin-bottom:3px;">🛫 <b>De:</b> ${pos.porto_origem}</div>` : ''}
          ${pos.porto_destino ? `<div style="margin-bottom:3px;">🛬 <b>Para:</b> ${pos.porto_destino}</div>` : ''}
          ${pos.porto_proximo ? `<div>⚓ <b>Próximo:</b> ${pos.porto_proximo}</div>` : ''}
        </div>

        <div style="margin-top:8px;font-size:9.5px;color:#94a3b8;text-align:right;">
          Última atualização: ${new Date(pos.timestamp).toLocaleString('pt-BR')}
        </div>
      </div>`;
  }

  /* ============================================================
     AIS LAYER — markers persistentes
     ============================================================ */
  const AISLayer = {
    _mapa: null,
    _markers: new Map(),        // mmsi → L.Marker
    _trailGroup: null,          // LayerGroup das trilhas
    _trailCache: new Map(),     // mmsi → array de coords (pra não redesenhar)
    _destacado: null,
    _trilhaDestaque: null,

    init(mapa) {
      this._mapa = mapa;
      this._trailGroup = L.layerGroup();
      console.log('[AISLayer] pronto v6');
    },

    mostrar() {
      if (!this._mapa) return;
      if (!this._mapa.hasLayer(this._trailGroup)) this._trailGroup.addTo(this._mapa);
      this._markers.forEach(m => { if (!this._mapa.hasLayer(m)) m.addTo(this._mapa); });
    },

    esconder() {
      if (!this._mapa) return;
      if (this._mapa.hasLayer(this._trailGroup)) this._mapa.removeLayer(this._trailGroup);
      this._markers.forEach(m => { if (this._mapa.hasLayer(m)) this._mapa.removeLayer(m); });

      // ✅ Limpa trilha de destaque (tracejado azul) também
      this.limparTrilha();
    },

    limpar() {
      this._markers.forEach(m => { if (this._mapa.hasLayer(m)) this._mapa.removeLayer(m); });
      this._markers.clear();
      this._trailGroup.clearLayers();
      this._trailCache.clear();
    },

    /* ------------------------------------------------------------
       ATUALIZA MARKERS — cria novos, atualiza existentes
       Não destrói nada. Apenas move lat/lng.
       ------------------------------------------------------------ */
    _sincronizarMarkers(posicoes) {
      const ativos = new Set();

      posicoes.forEach(pos => {
        ativos.add(pos.mmsi);
        const cad = pos.cadastro || window.AISManager.getCadastro(pos.mmsi) || {};
        const destaque = this._destacado === pos.mmsi;
        const icon = criarIcone(cad.tipo, pos.status, pos.cog, destaque);
        let m = this._markers.get(pos.mmsi);

        if (m) {
          // Atualiza posição e ícone
          m.setLatLng([pos.lat, pos.lon]);
          m.setIcon(icon);
          m._popupData = pos;
        } else {
          // Cria novo
          m = L.marker([pos.lat, pos.lon], { icon, zIndexOffset: 500, riseOnHover: true });
          m.bindPopup(popupHTML({ ...pos, cadastro: cad }), {
            maxWidth: 340, className: 'ais-popup'
          });
          m.bindTooltip(`<b>${cad.nome || 'MMSI ' + pos.mmsi}</b> · ${pos.sog || 0} nós`,
            { direction: 'top', offset: [0, -14], className: 'ais-tooltip' });
          m._mmsi = pos.mmsi;
          m.on('click', (e) => {
            if (e && e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
            if (window.ControleAIS && window.ControleAIS._aberto) {
              setTimeout(() => window.ControleAIS.selecionar(pos.mmsi), 60);
            }
          });
          this._markers.set(pos.mmsi, m);
          if (this._mapa && !this._mapa.hasLayer(m)) m.addTo(this._mapa);
        }
        // Atualiza popup
        const popup = m.getPopup();
        if (popup) popup.setContent(popupHTML({ ...pos, cadastro: cad }));
      });

      // Remove markers que não estão mais ativos
      this._markers.forEach((m, mmsi) => {
        if (!ativos.has(mmsi)) {
          if (this._mapa.hasLayer(m)) this._mapa.removeLayer(m);
          this._markers.delete(mmsi);
        }
      });
    },

    /* ------------------------------------------------------------
       DESENHA TRILHA — só se ainda não foi desenhada pra esse MMSI
       ------------------------------------------------------------ */
    _desenharTrilhasUmaVez(posicoes) {
      const porMmsi = new Map();
      posicoes.forEach(p => {
        if (!porMmsi.has(p.mmsi)) porMmsi.set(p.mmsi, []);
        porMmsi.get(p.mmsi).push(p);
      });

      porMmsi.forEach((arr, mmsi) => {
        if (this._trailCache.has(mmsi)) return; // já desenhada
        arr.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
        const ult = arr[arr.length - 1];
        const cor = corDoStatus(ult.status);
        const grupo = L.layerGroup();
        splitPontos(arr).forEach(seg => {
          if (seg.length < 2) return;
          L.polyline(seg.map(p => [p.lat, p.lon]), {
            color: cor, weight: 2.4, opacity: 0.7,
            lineCap: 'round', lineJoin: 'round', smoothFactor: 0.4
          }).addTo(grupo);
        });
        grupo.addTo(this._trailGroup);
        this._trailCache.set(mmsi, grupo);
      });
    },

    _limparTrilhas() {
      this._trailCache.forEach(g => this._trailGroup.removeLayer(g));
      this._trailCache.clear();
    },

    /* ------------------------------------------------------------
       MODO PONTO (última posição)
       ------------------------------------------------------------ */
    renderizar(posicoes) {
      this._limparTrilhas();
      this._sincronizarMarkers(posicoes);
    },

    /* ------------------------------------------------------------
       MODO TRILHA ESTÁTICA
       ------------------------------------------------------------ */
    renderizarTrilhas(posicoes) {
      this._limparTrilhas();
      this._desenharTrilhasUmaVez(posicoes);

      // Só o último de cada MMSI como marker
      const ultimos = new Map();
      posicoes.forEach(p => {
        const t = new Date(p.timestamp).getTime();
        const at = ultimos.get(p.mmsi);
        if (!at || new Date(at.timestamp).getTime() < t) ultimos.set(p.mmsi, p);
      });
      this._sincronizarMarkers([...ultimos.values()]);
    },

    /* ------------------------------------------------------------
       MODO PROGRESSIVO — frame a frame
       Mostra posição interpolada entre as duas últimas até tAtualMs
       ------------------------------------------------------------ */
    renderizarProgressivo(todasPosicoes, tAtualMs, janelaH) {
      const janelaMs = (janelaH || 24) * 3600 * 1000;
      const tMin = tAtualMs - janelaMs;

      // Agrupa por MMSI filtrando até tAtual
      const porMmsi = new Map();
      todasPosicoes.forEach(p => {
        const t = new Date(p.timestamp).getTime();
        if (t > tAtualMs) return;
        if (!porMmsi.has(p.mmsi)) porMmsi.set(p.mmsi, []);
        porMmsi.get(p.mmsi).push(p);
      });

      const atuais = [];

      porMmsi.forEach((arr, mmsi) => {
        arr.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        if (!arr.length) return;

        const ult = arr[arr.length - 1];
        const tUlt = new Date(ult.timestamp).getTime();

        // Interpolação: se há próximo ponto, calcula posição suave
        let lat = ult.lat, lon = ult.lon, cog = ult.cog;
        // Não interpola com ponto futuro (arr só tem passado)
        // A suavidade vem do requestAnimationFrame + passo pequeno

        atuais.push({
          ...ult,
          lat, lon, cog,
          cadastro: window.AISManager.getCadastro(mmsi) || {}
        });
      });

      this._sincronizarMarkers(atuais);
    },

    /* ------------------------------------------------------------
       DESTAQUE DE TRILHA
       ------------------------------------------------------------ */
    _destacarTrilha(mmsi) {
      this._destacado = mmsi;
      const pontos = window.AISManager.getTrilha(mmsi);
      if (pontos.length < 2) return;

      if (this._trilhaDestaque) this._mapa.removeLayer(this._trilhaDestaque);
      const grupo = L.layerGroup();
      splitPontos(pontos).forEach(seg => {
        if (seg.length < 2) return;
        const coords = seg.map(p => [p.lat, p.lon]);
        L.polyline(coords, { color: '#38bdf8', weight: 10, opacity: 0.18, lineCap: 'round' }).addTo(grupo);
        L.polyline(coords, {
          color: '#38bdf8', weight: 2.5, opacity: 0.95,
          dashArray: '6 4', lineCap: 'round'
        }).addTo(grupo);
      });
      grupo.addTo(this._mapa);
      this._trilhaDestaque = grupo;

      try {
        const b = L.latLngBounds(pontos.map(p => [p.lat, p.lon]));
        if (b.isValid()) this._mapa.fitBounds(b, { padding: [60, 60], maxZoom: 11 });
      } catch (e) { }

      // Atualiza ícone com anel
      const m = this._markers.get(mmsi);
      if (m) {
        const cad = window.AISManager.getCadastro(mmsi) || {};
        m.setIcon(criarIcone(cad.tipo, m._popupData?.status, m._popupData?.cog, true));
      }
    },

    limparTrilha() {
      if (this._trilhaDestaque && this._mapa.hasLayer(this._trilhaDestaque)) {
        this._mapa.removeLayer(this._trilhaDestaque);
      }
      this._trilhaDestaque = null;
      this._destacado = null;
      // Remove anel dos ícones
      this._markers.forEach((m, mmsi) => {
        if (m._popupData) {
          const cad = window.AISManager.getCadastro(mmsi) || {};
          m.setIcon(criarIcone(cad.tipo, m._popupData.status, m._popupData.cog, false));
        }
      });
    }
  };

  /* ---------- CSS ---------- */
  (function () {
    if (document.getElementById('ais-layer-css-v6')) return;
    const s = document.createElement('style');
    s.id = 'ais-layer-css-v6';
    s.textContent = `
      .ais-marker { background:transparent !important; border:none !important; cursor:pointer; }
      .ais-marker svg { transition: transform 0.5s linear; }
      .ais-tooltip {
        background: rgba(11,25,44,0.96) !important;
        color:#f1f5f9 !important;
        border:1px solid #38bdf8 !important;
        border-radius:6px !important;
        font-family:'Segoe UI',sans-serif !important;
        font-size:11px !important; padding:4px 9px !important;
        box-shadow:0 4px 12px rgba(0,0,0,0.5) !important;
      }
      .ais-tooltip::before { display:none !important; }
      .ais-popup .leaflet-popup-content-wrapper {
        border-radius:12px !important;
        box-shadow:0 12px 40px rgba(0,0,0,0.45) !important;
        padding:0 !important;
      }
      .ais-popup .leaflet-popup-content { margin:14px 16px !important; }
    `;
    document.head.appendChild(s);
  })();

  window.AISLayer = AISLayer;
})();
/* --- FIM: js/render/ais-layer.js --- */
