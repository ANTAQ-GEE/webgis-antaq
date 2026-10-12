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
      const cfg = (window.CONFIG_CAMADAS && window.CONFIG_CAMADAS[id]) || {};

      const titulo = Security.escapeHTML(
        Security.getProp(p, 'nome', 'NOME', 'nome_instalacao', 'NOME_INSTALACAO', 'nome_rio', 'NOME_RIO', 'sigla_uf', 'SIGLA_UF', 'ds_nome') || 'Ativo Aquaviário'
      );

      let cardTempo = '';
      const tempo = Security.getProp(p, 'tempo', 'TEMPO', 'tempo_viagem');
      const vel = Security.getProp(p, 'vel_cional', 'VEL_CIONAL', 'velocidade', 'VELOCIDADE');
      const ext = Security.getProp(p, 'extensao', 'EXTENSAO', 'extensao_km');
      const origMun = Security.getProp(p, 'mun_origem', 'MUN_ORIGEM', 'municipio_origem');
      const origUf = Security.getProp(p, 'est_origem', 'EST_ORIGEM', 'uf_origem');
      const destMun = Security.getProp(p, 'mun_estino', 'mun_destino', 'MUN_DESTINO', 'municipio_destino');
      const destUf = Security.getProp(p, 'est_estino', 'est_destino', 'EST_DESTINO', 'uf_destino');
      const eclusa = Security.getProp(p, 'nom_eclusa', 'NOM_ECLUSA', 'eclusa');
      const profMin = Security.getProp(p, 'pro_de_min', 'PRO_DE_MIN');
      const profMax = Security.getProp(p, 'pro_de_max', 'PRO_DE_MAX');

      if (tempo || vel || ext || origMun || destMun) {
        const tempoFormatado = Security.escapeHTML(tempo || 'Não informado');
        const extNum = ext ? Security.formatarKm(ext, 1) : '-';
        const velNum = vel ? Security.formatarNumero(vel, 1) + ' km/h' : '-';
        const orig = (origMun || '-') + (origUf ? `/${origUf}` : '');
        const dest = (destMun || '-') + (destUf ? `/${destUf}` : '');

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
              ${eclusa ? `<div style="grid-column: span 2; color:#a7f3d0;">🚪 <strong>Eclusa:</strong> ${Security.escapeHTML(eclusa)}</div>` : ''}
              ${(profMin || profMax) ? `<div style="grid-column: span 2; font-size:10px; color:#94a3b8;">🌊 <strong>Profundidade / Calado:</strong> ${profMin || '-'}m a ${profMax || '-'}m</div>` : ''}
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
