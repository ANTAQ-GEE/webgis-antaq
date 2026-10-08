/* ============================================================
   WebGIS ANTAQ — Módulo: TKUManager (M12)
   Escopo: filtros específicos do TKU (ano + navegação + colorir por ano)
   Dependências: window.DADOS_GEOJSON_BRUTOS, window.CAMADAS_MAPA,
                 window.CONFIG_CAMADAS, window.UI, window.Styler
   Expõe: window.TKUManager
   ============================================================ */
(function () {
  'use strict';

  const TKUManager = {
    modoCor: 'fluxo',   // 'fluxo' | 'ano'

    /* ============================================================
       FILTRO POR ANO + NAVEGAÇÃO
       ============================================================ */
    aplicarFiltro: function () {
      const anos = [];
      if (document.getElementById('tku-ano-2021')?.checked) anos.push(2021);
      if (document.getElementById('tku-ano-2023')?.checked) anos.push(2023);
      if (document.getElementById('tku-ano-2025')?.checked) anos.push(2025);

      const navs = [];
      if (document.getElementById('tku-nav-cabotagem')?.checked) navs.push('Cabotagem');
      if (document.getElementById('tku-nav-interior')?.checked) navs.push('Interior');
      if (document.getElementById('tku-nav-longo')?.checked) navs.push('Longo Curso');

      const dados = window.DADOS_GEOJSON_BRUTOS['tku'];
      if (!dados?.features?.length) return;

      const filtradas = dados.features.filter(f => {
        const p = f.properties || {};
        return anos.includes(Number(p.ano)) && navs.includes(p.navegacao);
      });

      const camada = window.CAMADAS_MAPA['tku'];
      if (camada) {
        camada.clearLayers();
        camada.addData({
          type: 'FeatureCollection',
          features: filtradas
        });

        // Reaplica modo de cor (se estiver em modo 'ano')
        if (this.modoCor === 'ano') {
          this._aplicarCorPorAno(camada);
        }
      }

      const cnt = document.getElementById('cnt-tku');
      if (cnt) cnt.innerText = `(${filtradas.length}/${dados.features.length})`;

      if (window.UI) {
        window.UI.toast(`📦 TKU: ${filtradas.length} de ${dados.features.length} trechos visíveis.`);
      }
    },

    /* ============================================================
       MODO: COLORIR POR FLUXO vs POR ANO
       ============================================================ */
    alternarModoCor: function () {
      this.modoCor = this.modoCor === 'fluxo' ? 'ano' : 'fluxo';
      this._atualizarBotaoModo();
      this._reaplicarEstilo();
    },

    _atualizarBotaoModo: function () {
      const btn = document.getElementById('btn-tku-modo-cor');
      if (!btn) return;
      if (this.modoCor === 'ano') {
        btn.innerHTML = '🎨 Cor por: ANO';
        btn.style.background = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
      } else {
        btn.innerHTML = '🎨 Cor por: FLUXO';
        btn.style.background = 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)';
      }
    },

    _reaplicarEstilo: function () {
      const camada = window.CAMADAS_MAPA['tku'];
      if (!camada) return;

      // Aplica modo 'fluxo' (default do styler)
      if (this.modoCor === 'fluxo') {
        const faixas = window.Styler._tkuFaixas || window.Styler._calcularFaixasTKU();

        camada.eachLayer(layer => {
          if (!layer.feature || !layer.setStyle) return;
          const fluxo = Number(layer.feature.properties?.fluxo) || 0;

          let peso = 2.5, cor = '#10b981';
          if (fluxo > faixas.p90) { peso = 10; cor = '#dc2626'; }
          else if (fluxo > faixas.p70) { peso = 8; cor = '#f97316'; }
          else if (fluxo > faixas.p50) { peso = 6; cor = '#f59e0b'; }
          else if (fluxo > faixas.p30) { peso = 4; cor = '#84cc16'; }

          layer.setStyle({ color: cor, weight: peso, opacity: 0.85 });
        });
      } else {
        // Aplica modo 'ano'
        this._aplicarCorPorAno(camada);
      }

      if (window.Styler) window.Styler.atualizarLegenda();
    },

    _aplicarCorPorAno: function (camada) {
      camada.eachLayer(layer => {
        if (!layer.feature || !layer.setStyle) return;
        const ano = Number(layer.feature.properties?.ano);
        const cor = this._corPorAno(ano);
        layer.setStyle({ color: cor, weight: 4, opacity: 0.9 });
      });
    },

    _corPorAno: function (ano) {
      if (ano === 2021) return '#3b82f6';   // azul
      if (ano === 2023) return '#f59e0b';   // âmbar
      if (ano === 2025) return '#dc2626';   // vermelho
      return '#94a3b8';
    },

    /* ============================================================
       ATALHOS RÁPIDOS
       ============================================================ */
    filtrarAno: function (ano) {
      // Desmarca todos e marca só o ano solicitado
      ['2021', '2023', '2025'].forEach(a => {
        const chk = document.getElementById(`tku-ano-${a}`);
        if (chk) chk.checked = (String(ano) === a);
      });
      // Mantém todas as navegações
      ['cabotagem', 'interior', 'longo'].forEach(n => {
        const chk = document.getElementById(`tku-nav-${n}`);
        if (chk) chk.checked = true;
      });
      this.aplicarFiltro();
    },

    mostrarTodos: function () {
      ['2021', '2023', '2025'].forEach(a => {
        const chk = document.getElementById(`tku-ano-${a}`);
        if (chk) chk.checked = true;
      });
      ['cabotagem', 'interior', 'longo'].forEach(n => {
        const chk = document.getElementById(`tku-nav-${n}`);
        if (chk) chk.checked = true;
      });
      this.aplicarFiltro();
    }
  };

  window.TKUManager = TKUManager;
  console.info('[js] TKUManager carregado (M12)');
})();