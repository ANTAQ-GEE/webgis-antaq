/* ============================================================
   WebGIS ANTAQ — Módulo: LayerMetadata (M3)
   Escopo: modal de metadados da camada (fonte, escala, changelog, hash)
   Dependências: window.CONFIG_CAMADAS, window.METADADOS_CAMADAS,
                 window.DADOS_GEOJSON_BRUTOS, window.Security, window.UI
   Expõe: window.LayerMetadata
   ============================================================ */
(function () {
  'use strict';

  const LayerMetadata = {
    camadaAtualId: null,

    abrir: async function (id) {
      this.camadaAtualId = id;

      // ✅ Carrega sob demanda (pra mostrar contagem real de feições)
      if (!DADOS_GEOJSON_BRUTOS[id]?.features?.length) {
        try {
          if (window.UI) window.UI.toast(`⏳ Carregando ${CONFIG_CAMADAS[id]?.nome || id}...`);
          await window.DataManager.carregarCamada(id);
        } catch (e) {
          // Não bloqueia — metadados funcionam mesmo sem feições
          console.warn('[M3] Falha ao carregar camada para metadados:', e);
        }
      }

      const cfg = CONFIG_CAMADAS[id] || {};
      const meta = METADADOS_CAMADAS[id] || {};

      const titulo = document.getElementById('meta-nome-camada');
      if (titulo) titulo.innerText = cfg.nome || id;

      const corpo = document.getElementById('meta-corpo');
      if (!corpo) return;

      const naoInformado = '<span style="color:#64748b; font-style:italic;">Não informado</span>';
      const esc = (v) => v ? window.Security.escapeHTML(String(v)) : naoInformado;

      let changelogHTML = '';
      if (meta.changelog && meta.changelog.length) {
        changelogHTML = '<ul class="meta-changelog">' +
          meta.changelog.map(c => `<li>${window.Security.escapeHTML(c)}</li>`).join('') +
          '</ul>';
      } else {
        changelogHTML = '<p class="meta-descricao" style="color:#64748b; font-style:italic;">Nenhum registro de alteração.</p>';
      }

      const numFeatures = DADOS_GEOJSON_BRUTOS[id]?.features?.length;
      const numFeatTexto = numFeatures
        ? `<strong>${numFeatures.toLocaleString('pt-BR')}</strong> feições carregadas`
        : (meta.numero_features || 'Não informado');

      corpo.innerHTML = `
        <div class="meta-bloco">
          <div class="meta-titulo">📋 Descrição</div>
          <p class="meta-descricao">${esc(meta.descricao)}</p>
        </div>

        <div class="meta-bloco">
          <div class="meta-titulo">🗂️ Origem e Procedência</div>
          <div class="meta-linha"><span class="rotulo">Fonte</span><span class="valor">${esc(meta.fonte)}</span></div>
          <div class="meta-linha"><span class="rotulo">Escala Cartográfica</span><span class="valor">${esc(meta.escala)}</span></div>
          <div class="meta-linha"><span class="rotulo">Datum</span><span class="valor">${esc(meta.datum)}</span></div>
          <div class="meta-linha"><span class="rotulo">Processo / Referência</span><span class="valor">${esc(meta.processo)}</span></div>
        </div>

        <div class="meta-bloco">
          <div class="meta-titulo">🔄 Atualização e Governança</div>
          <div class="meta-linha"><span class="rotulo">Periodicidade</span><span class="valor">${esc(meta.atualizacao)}</span></div>
          <div class="meta-linha"><span class="rotulo">Responsável Técnico</span><span class="valor">${esc(meta.responsavel)}</span></div>
          <div class="meta-linha"><span class="rotulo">Volume</span><span class="valor">${numFeatTexto}</span></div>
          <div class="meta-linha"><span class="rotulo">Tipo Geométrico</span><span class="valor">${esc(cfg.tipoGeo || 'auto')}</span></div>
        </div>

        <div class="meta-bloco">
          <div class="meta-titulo">📜 Changelog</div>
          ${changelogHTML}
        </div>

        <div class="meta-bloco">
          <div class="meta-titulo">🔐 Integridade</div>
          <div class="meta-hash">
            <span id="meta-hash-valor">${this._gerarHashFake(id)}</span>
            <button onclick="LayerMetadata._copiarHash()">Copiar</button>
          </div>
          <p class="meta-descricao" style="font-size:10.5px; color:#64748b; margin-top:8px;">
            Hash de referência da versão carregada. Em produção, será substituído pelo SHA-256 real do arquivo GeoJSON.
          </p>
        </div>
      `;

      document.getElementById('modal-metadados').classList.add('aberto');
    },

    fechar: function () {
      document.getElementById('modal-metadados').classList.remove('aberto');
    },

    _gerarHashFake: function (id) {
      let h = 0;
      for (let i = 0; i < id.length; i++) {
        h = ((h << 5) - h) + id.charCodeAt(i);
        h |= 0;
      }
      const base = Math.abs(h).toString(16).padStart(8, '0');
      return (base + base + base + base).slice(0, 32);
    },

    _copiarHash: function () {
      const el = document.getElementById('meta-hash-valor');
      if (!el) return;
      navigator.clipboard.writeText(el.textContent).then(() => {
        if (window.UI) window.UI.toast('📋 Hash copiado para a área de transferência.');
      }).catch(() => {
        if (window.UI) window.UI.toast('⚠️ Não foi possível copiar o hash.');
      });
    }
  };

  window.LayerMetadata = LayerMetadata;
  console.info('[js] LayerMetadata carregado');
})();