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