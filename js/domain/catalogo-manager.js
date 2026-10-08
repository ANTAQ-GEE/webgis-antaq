/* ============================================================
   WebGIS ANTAQ — Módulo: CatalogoManager
   Escopo: catálogo de camadas (retirar / adicionar do painel)
   Dependências: window.CONFIG_CAMADAS, window.UI
   Referências "lazy": window.toggleCamada (função global inline)
   Expõe: window.CatalogoManager
   ============================================================ */
(function () {
  'use strict';

  const CatalogoManager = {
    storageKey: 'antaq_webgis_camadas_ocultas',

    obterOcultas: function () {
      try {
        const s = localStorage.getItem(this.storageKey);
        return s ? JSON.parse(s) : [];
      } catch (e) { return []; }
    },

    salvarOcultas: function (lista) {
      try { localStorage.setItem(this.storageKey, JSON.stringify(lista)); } catch (e) {}
    },

    ocultarCamada: function (id, opcoes) {
      opcoes = opcoes || {};
      const cfg = CONFIG_CAMADAS[id];
      const nome = cfg ? cfg.nome : id;
      const chk = document.getElementById(`chk-${id}`);
      const estavaLigada = chk ? chk.checked : false;

      if (!opcoes.semHistorico && window.ActionHistory) {
        const self = this;
        window.ActionHistory.registrar({
          tipo: 'ocultar-camada',
          descricao: `Retirar camada "${nome}" do painel`,
          undo: () => {
            self.adicionarCamadaAoPainel(id, { semHistorico: true });
            if (estavaLigada) {
              const c = document.getElementById(`chk-${id}`);
              if (c && !c.checked) {
                c.checked = true;
                if (typeof window.toggleCamada === 'function') {
                  window.toggleCamada(id, true, { semHistorico: true });
                }
              }
            }
          },
          redo: () => self.ocultarCamada(id, { semHistorico: true })
        });
      }

      if (chk && chk.checked) {
        chk.checked = false;
        if (typeof window.toggleCamada === 'function') {
          window.toggleCamada(id, false, { semHistorico: true });
        }
      }

      const el = document.getElementById(`item-camada-${id}`);
      if (el) el.style.display = 'none';

      const ocultas = this.obterOcultas();
      if (!ocultas.includes(id)) {
        ocultas.push(id);
        this.salvarOcultas(ocultas);
      }
      if (window.UI) window.UI.toast(`Camada "${nome}" retirada. Readicione em "➕ Adicionar".`);
    },

    adicionarCamadaAoPainel: function (id, opcoes) {
      opcoes = opcoes || {};
      const cfg = CONFIG_CAMADAS[id];
      const nome = cfg ? cfg.nome : id;

      if (!opcoes.semHistorico && window.ActionHistory) {
        const self = this;
        window.ActionHistory.registrar({
          tipo: 'adicionar-camada',
          descricao: `Readicionar camada "${nome}" ao painel`,
          undo: () => self.ocultarCamada(id, { semHistorico: true }),
          redo: () => self.adicionarCamadaAoPainel(id, { semHistorico: true })
        });
      }

      const el = document.getElementById(`item-camada-${id}`);
      if (el) el.style.display = 'flex';
      const ocultas = this.obterOcultas().filter(x => x !== id);
      this.salvarOcultas(ocultas);
      this.renderizarCatalogo();
      if (window.UI) window.UI.toast('Camada readicionada ao painel!');
    },

    mostrarTodas: function () {
      this.salvarOcultas([]);
      for (const id of Object.keys(CONFIG_CAMADAS)) {
        const el = document.getElementById(`item-camada-${id}`);
        if (el) el.style.display = 'flex';
      }
      this.renderizarCatalogo();
      if (window.UI) window.UI.toast('Todas as camadas visíveis!');
    },

    abrirModal: function () {
      const m = document.getElementById('modal-catalogo-camadas');
      if (!m) return;
      m.classList.add('aberto');
      this.renderizarCatalogo();
    },

    fecharModal: function () {
      const m = document.getElementById('modal-catalogo-camadas');
      if (m) m.classList.remove('aberto');
    },
    /**
     * Exclui PERMANENTEMENTE uma camada gerada (buffer, importada).
     * Diferente de ocultarCamada(), remove do mapa, memória e painel.
     * NÃO funciona em camadas do sistema (infra, limites, etc.).
     */
    excluirPermanentemente: function (id) {
      const cfg = CONFIG_CAMADAS[id];
      if (!cfg) return;

      // ✅ Só permite excluir camadas geradas
      const ehGerada = cfg._isBuffer || cfg.grupo === 'importadas' || id.startsWith('imp_') || id.startsWith('buffer_');
      if (!ehGerada) {
        if (window.UI) window.UI.toast('⚠️ Esta camada é do sistema e não pode ser excluída.');
        return;
      }

      const nome = cfg.nome || id;
      if (!confirm(`Excluir permanentemente "${nome}"?\n\nEsta ação remove a camada do mapa, do painel e da memória. Não pode ser desfeita.`)) {
        return;
      }

      // 1. Remove do mapa
      if (CAMADAS_MAPA[id]) {
        try { window.mapa.removeLayer(CAMADAS_MAPA[id]); } catch (e) {}
        delete CAMADAS_MAPA[id];
      }

      // 2. Remove dos dados brutos
      delete DADOS_GEOJSON_BRUTOS[id];

      // 3. Remove da config
      delete CONFIG_CAMADAS[id];

      // 4. Remove do localStorage (se estava oculta)
      const ocultas = this.obterOcultas().filter(x => x !== id);
      this.salvarOcultas(ocultas);

      // 5. Remove do DOM
      const item = document.getElementById(`item-camada-${id}`);
      if (item) item.remove();

      // 6. Remove do painel do copiloto (se aparecer lá)
      if (window.FilterManager) {
        try { window.FilterManager.atualizarSeletorCamadas(); } catch (e) {}
      }

      // 7. Atualiza legenda
      if (window.Styler) {
        try { window.Styler.atualizarLegenda(); } catch (e) {}
      }

      // 8. Re-renderiza catálogo (se estiver aberto)
      this.renderizarCatalogo();

      console.info(`[Catálogo] Camada "${nome}" excluída permanentemente.`);
      if (window.UI) window.UI.toast(`🗑️ Camada "${nome}" excluída permanentemente.`);
    },

    /**
     * Exclui TODAS as camadas geradas de uma vez.
     */
    excluirTodasGeradas: function () {
      const geradas = Object.keys(CONFIG_CAMADAS).filter(id => {
        const cfg = CONFIG_CAMADAS[id];
        return cfg._isBuffer || id.startsWith('imp_') || id.startsWith('buffer_') || cfg.grupo === 'importadas';
      });

      if (geradas.length === 0) {
        if (window.UI) window.UI.toast('Nenhuma camada gerada para excluir.');
        return;
      }

      if (!confirm(`Excluir permanentemente ${geradas.length} camada(s) gerada(s)?\n\nEsta ação não pode ser desfeita.`)) {
        return;
      }

      for (const id of geradas) {
        // Remove sem confirmar individualmente
        const cfg = CONFIG_CAMADAS[id];
        if (!cfg) continue;

        if (CAMADAS_MAPA[id]) {
          try { window.mapa.removeLayer(CAMADAS_MAPA[id]); } catch (e) {}
          delete CAMADAS_MAPA[id];
        }
        delete DADOS_GEOJSON_BRUTOS[id];
        delete CONFIG_CAMADAS[id];

        const item = document.getElementById(`item-camada-${id}`);
        if (item) item.remove();
      }

      this.salvarOcultas([]);

      if (window.FilterManager) window.FilterManager.atualizarSeletorCamadas();
      if (window.Styler) window.Styler.atualizarLegenda();
      this.renderizarCatalogo();

      if (window.UI) window.UI.toast(`🗑️ ${geradas.length} camada(s) excluída(s).`);
    },
    renderizarCatalogo: function () {
      const container = document.getElementById('catalogo-conteudo-grupos');
      if (!container) return;

      const gruposInfo = {
        infra: { titulo: "⚓ Infraestrutura Aquaviária & Portuária" },
        multimodal: { titulo: "🚚 Transporte Multimodal (Ferrovias & Rodovias)" },
        limites: { titulo: "🗺️ Limites Territoriais & Bacias" },
        restricoes: { titulo: "🌿 Restrições Socioambientais & Territoriais" },
        importadas: { titulo: "📁 Camadas Importadas / Personalizadas" }
      };

      const ocultas = this.obterOcultas();
      let htmlGrupos = '';

      for (const [grpId, grpMeta] of Object.entries(gruposInfo)) {
        const camadasGrupo = Object.entries(CONFIG_CAMADAS).filter(([id, c]) => c.grupo === grpId && !id.startsWith('ven_'));
        if (!camadasGrupo.length) continue;

        let itensHTML = '';
        for (const [id, cfg] of camadasGrupo) {
          const estaOculta = ocultas.includes(id);
          const statusBadge = estaOculta
            ? '<span style="font-size:9px; color:#94a3b8; background:#334155; padding:2px 6px; border-radius:4px;">Oculta do Painel</span>'
            : '<span style="font-size:9px; color:#34d399; background:rgba(16,185,129,0.2); padding:2px 6px; border-radius:4px;">No Painel</span>';

          const botaoAcao = estaOculta
            ? `<button class="btn-catalogo-acao btn-catalogo-add" onclick="CatalogoManager.adicionarCamadaAoPainel('${id}')">+ Adicionar</button>`
            : `<button class="btn-catalogo-acao btn-catalogo-rem" onclick="CatalogoManager.ocultarCamada('${id}'); CatalogoManager.renderizarCatalogo();">✕ Retirar</button>`;

          itensHTML += `
            <div class="catalogo-item">
              <div style="display:flex; flex-direction:column; gap:3px;">
                <div class="catalogo-item-nome">
                  <span style="width:10px; height:10px; border-radius:2px; background:${cfg.cor}; display:inline-block;"></span>
                  <span>${cfg.nome}</span>
                </div>
                <div>${statusBadge}</div>
              </div>
              ${botaoAcao}
            </div>`;
        }

        htmlGrupos += `
          <div class="catalogo-grupo-bloco">
            <div class="catalogo-grupo-header">${grpMeta.titulo}</div>
            <div class="catalogo-grid">${itensHTML}</div>
          </div>`;
      }

      container.innerHTML = htmlGrupos;
    }
  };

  window.CatalogoManager = CatalogoManager;
  console.info('[js] CatalogoManager carregado');
})();