/* ============================================================
   WebGIS ANTAQ — Módulo: ExportManager
   Escopo: exportação GeoJSON e CSV (com respeito a filtros ativos)
   Dependências: window.DADOS_GEOJSON_BRUTOS, window.CONFIG_CAMADAS,
                 window.PortClassification, window.Security,
                 window.UI, window.FilterManager
   Referências "lazy": window.TabelaManager, window.classificarEsfera
   Expõe: window.ExportManager
   ============================================================ */
(function () {
  'use strict';

  const ExportManager = {
    /**
     * Exporta as feições VISÍVEIS de uma camada (respeitando filtros ativos)
     * como um arquivo .geojson para download.
     */
    exportarGeoJSON: function (idCamada) {
      if (!idCamada) {
        if (window.UI) window.UI.toast('⚠️ Camada inválida para exportação.');
        return;
      }

      const dados = DADOS_GEOJSON_BRUTOS[idCamada];
      if (!dados || !dados.features || !dados.features.length) {
        if (window.UI) window.UI.toast(`⚠️ Camada "${idCamada}" não tem feições.`);
        return;
      }

      let featuresFiltradas = dados.features;

      // Filtro de portos (por regime)
      if (idCamada === 'instalacoes_portuarias') {
        const filtroPorto = window.FILTRO_PORTO_ATUAL || 'TODOS';
        if (filtroPorto !== 'TODOS') {
          featuresFiltradas = featuresFiltradas.filter(f =>
            window.PortClassification.classificar(f.properties || {}).id === filtroPorto
          );
        }
      }

      // Filtro de UCs (por esfera)
      if (idCamada === 'ucs_todas_mma' && typeof window.classificarEsfera === 'function') {
        const filtroUC = window.FILTRO_UC_ATUAL || 'TODOS';
        if (filtroUC !== 'TODOS') {
          featuresFiltradas = featuresFiltradas.filter(f =>
            window.classificarEsfera(f.properties).id === filtroUC
          );
        }
      }

      // Filtro genérico de esfera (outras camadas com dropdown dinâmico)
      const selSub = document.getElementById('filtro-subtipo-dinamico');
      if (selSub && selSub.value && selSub.value !== 'TODOS' &&
          idCamada !== 'instalacoes_portuarias' && idCamada !== 'ucs_todas_mma' &&
          !idCamada.startsWith('ven_') && !idCamada.startsWith('imp_')) {
        const colunaFiltro = window.FilterManager ? window.FilterManager.colunaEsferaAtiva : null;
        if (colunaFiltro) {
          featuresFiltradas = featuresFiltradas.filter(f =>
            String(f.properties?.[colunaFiltro] || '').trim() === selSub.value
          );
        }
      }

      if (!featuresFiltradas.length) {
        if (window.UI) window.UI.toast(`⚠️ Nenhuma feição corresponde ao filtro ativo.`);
        return;
      }

      const fc = { type: 'FeatureCollection', features: featuresFiltradas };
      const json = JSON.stringify(fc, null, 2);
      const blob = new Blob([json], { type: 'application/geo+json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${idCamada}_${featuresFiltradas.length}_feicoes_${new Date().toISOString().slice(0,10)}.geojson`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const nomeCamada = CONFIG_CAMADAS[idCamada]?.nome || idCamada;
      if (window.UI) window.UI.toast(`💾 GeoJSON exportado: ${featuresFiltradas.length} feições de "${nomeCamada}".`);
    },

    /**
     * Exporta a tabela de atributos aberta (TabelaManager) em CSV.
     */
    exportarCSV: function () {
      const T = window.TabelaManager;
      if (!T || !T.camadaAtualId || !T.filtradas || !T.filtradas.length) {
        if (window.UI) window.UI.toast("⚠️ Nenhum dado na tabela para exportar.");
        return;
      }

      const cols = T.colunas;
      const linhas = [];
      linhas.push(cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'));

      T.filtradas.forEach(f => {
        const p = f.properties || {};
        const row = cols.map(c => {
          const v = p[c] !== undefined && p[c] !== null ? p[c] : '';
          return `"${String(v).replace(/"/g, '""')}"`;
        });
        linhas.push(row.join(';'));
      });

      const csvContent = '\uFEFF' + linhas.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const slug = String(T.camadaAtualId).toLowerCase().replace(/[^a-z0-9]+/g, '_');
      a.href = url;
      a.download = `tabela_${slug}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (window.UI) window.UI.toast(`📥 CSV exportado com ${T.filtradas.length} linhas.`);
    },

    /**
     * Placeholder — planilha Excel oficial do VEN (chamada no card VEN e matriz).
     * TODO: implementar geração .xlsx com SheetJS ou similar.
     */
    baixarPlanilhaExcel: function () {
      if (window.UI) {
        window.UI.toast('📊 Exportação para Excel em desenvolvimento. Use "CSV" como alternativa.');
      }
      console.warn('[ExportManager] baixarPlanilhaExcel() ainda não implementado.');
    }
  };

  window.ExportManager = ExportManager;
  console.info('[js] ExportManager carregado');
})();