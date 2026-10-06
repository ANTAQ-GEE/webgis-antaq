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