/* ============================================================
   WebGIS ANTAQ — Módulo: LayerRegistry
   Escopo: paleta, geração de IDs, registro de camadas, manifesto
   Dependências: window.CONFIG_CAMADAS, window.FetchManager
   Expõe: window.LayerRegistry
   ============================================================ */
(function () {
  'use strict';

  const LayerRegistry = {
    paleta: ['#0ea5e9','#f59e0b','#10b981','#8b5cf6','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1','#14b8a6','#a855f7'],

    corAleatoria: function () {
      return this.paleta[Math.floor(Math.random() * this.paleta.length)];
    },

    gerarId: function (nome) {
      return String(nome || 'camada').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    },

    registrar: function (item) {
      const id = item.id || this.gerarId(item.nome || item.arquivo);
      if (id === 'unidades_conservacao' || (item.arquivo && item.arquivo.includes('unidades_conservacao'))) return null;
      if (CONFIG_CAMADAS[id]) return id;

      CONFIG_CAMADAS[id] = {
        nome: item.nome || id,
        grupo: item.grupo || 'importadas',
        arquivos: [item.arquivo],
        cor: item.cor || this.corAleatoria(),
        opacidade: item.opacidade !== undefined ? item.opacidade : 0.85,
        peso: item.peso || 5,
        tipoGeo: item.tipoGeo || null,
        ativa: item.ativa !== false,
        camposVisiveis: item.camposVisiveis || []
      };
      return id;
    },

    carregarManifest: async function () {
      const caminhos = ['dados/manifest.json', 'manifest.json', 'dados/manifest_teste.json', 'manifest_teste.json'];
      for (const c of caminhos) {
        try {
          const r = await window.FetchManager.fetchComRetry(c, {
            tentativas: 2,
            timeoutMs: 8000
          });
          if (r.ok) {
            const txt = await r.text();
            const limpo = txt.replace(/^\ufeff/, '').trim();
            const m = JSON.parse(limpo);
            const lista = m.camadas || m.layers || [];
            for (const item of lista) this.registrar(item);
            console.info(`✓ Manifesto carregado de [${c}]: ${lista.length} camadas.`);
            return;
          }
        } catch (e) { /* tenta o próximo */ }
      }
      console.info('Nenhum manifesto externo. Operando com catálogo padrão.');
    }
  };

  window.LayerRegistry = LayerRegistry;
  console.info('[js] LayerRegistry carregado');
})();