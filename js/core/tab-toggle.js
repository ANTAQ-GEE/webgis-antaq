/* ============================================================
   TabToggle — Arquitetura master WebGIS ANTAQ
   - MAPA · ANÁLISE · GEO · SIMULADOR: abas com toggle
   - AIS: toggle de camada (não muda de aba)
   - CONTROLE: overlay lateral (coexiste com AIS)
   - PAINEL: overlay tela cheia (coexiste com AIS)
   - CONTROLE e PAINEL são mutuamente exclusivos
   ============================================================ */
(function () {
    'use strict';

    const TabToggle = {

        clicar: function (aba) {
            switch (aba) {
                case 'mapa':
                case 'analise':
                case 'simulador':
                    this._toggleAba(aba);
                    break;
                case 'geo':
                    this._toggleGeo();
                    break;
                case 'ais':
                    this._toggleAIS();
                    break;
                case 'painel':
                    this._togglePainel();
                    break;
                default:
                    console.warn('[TabToggle] aba desconhecida:', aba);
            }
        },

        /* ------------------------------------------------------------
           MAPA · ANÁLISE · GEO · SIMULADOR
           ------------------------------------------------------------ */
        _toggleAba: function (aba) {
            if (!window.TabManager) return;

            // Fecha overlays (Controle / Painel) ao trocar de aba normal
            this._fecharOverlays();

            const atual = window.TabManager.abaAtiva;

            if (atual === aba && aba !== 'mapa') {
                if (atual === 'analise') this._fecharAnalise();
                window.TabManager.trocar('mapa');
                return;
            }
            if (atual === aba) return;

            if (aba === 'analise') this._limparResiduosAnalise();

            window.TabManager.trocar(aba);
        },

        /* ------------------------------------------------------------
           AIS — toggle de camada (não muda de aba)
           ------------------------------------------------------------ */
        _toggleAIS: function () {
            if (!window.ControleAIS) {
              console.warn('[TabToggle] ControleAIS indisponível');
              return;
            }
            if (window.ControleAIS._aberto) {
              window.ControleAIS.fechar();
            } else {
              window.ControleAIS.abrir();
            }
        },

        /* ------------------------------------------------------------
           CONTROLE — overlay lateral
           ------------------------------------------------------------ */
        _toggleControle: function () {
            if (!window.ControleAIS) return;

            if (window.ControleAIS._aberto) {
                window.ControleAIS.fechar();
                this._destaqueAba('controle', false);
            } else {
                // Fecha Painel se estiver aberto (mutuamente exclusivos)
                if (window.PainelAIS && window.PainelAIS._aberto) {
                    window.PainelAIS.fechar();
                    this._destaqueAba('painel', false);
                }
                window.ControleAIS.abrir();
                this._destaqueAba('controle', true);
            }
        },

        /* ------------------------------------------------------------
           PAINEL — overlay tela cheia
           ------------------------------------------------------------ */
        _togglePainel: function () {
            if (!window.PainelAIS) return;

            if (window.PainelAIS._aberto) {
                window.PainelAIS.fechar();
                this._destaqueAba('painel', false);
            } else {
                // Fecha Controle se estiver aberto (mutuamente exclusivos)
                if (window.ControleAIS && window.ControleAIS._aberto) {
                    window.ControleAIS.fechar();
                    this._destaqueAba('controle', false);
                }
                window.PainelAIS.abrir();
                this._destaqueAba('painel', true);
            }
        },

        /* ------------------------------------------------------------
           Helpers
           ------------------------------------------------------------ */
        _destaqueAba: function (aba, ativo) {
            const btn = document.querySelector('.aba-btn[data-aba="' + aba + '"]');
            if (!btn) return;
            if (ativo) btn.classList.add('ativo');
            else btn.classList.remove('ativo', 'ativa', 'active');
        },

        _fecharOverlays: function () {
            try {
                if (window.ControleAIS && window.ControleAIS._aberto) {
                    window.ControleAIS.fechar();
                    this._destaqueAba('controle', false);
                }
                if (window.PainelAIS && window.PainelAIS._aberto) {
                    window.PainelAIS.fechar();
                    this._destaqueAba('painel', false);
                }
            } catch (e) {
                console.warn('[TabToggle] erro ao fechar overlays:', e);
            }
        },

        _fecharAnalise: function () {
            const painel = document.getElementById('painel-graficos');
            if (painel) {
                painel.classList.remove('aberto');
                painel.style.display = 'none';
            }
            const btn = document.getElementById('btn-flutuante-painel');
            if (btn) btn.style.display = 'none';
            const pc = document.getElementById('painel-camadas-lateral');
            if (pc) pc.style.display = '';
        },
        _toggleGeo: function () {
            this._fecharOverlays();
            if (!window.GeoTools) {
                if (window.UI) window.UI.toast('⚠️ Módulo de geoprocessamento não carregado');
                return;
            }
            try {
                window.GeoTools.abrirModal();
            } catch (e) {
                console.error('[TabToggle] erro ao abrir GeoTools:', e);
                if (window.UI) window.UI.toast('❌ Falha ao abrir Geoprocessamento');
            }
        },
        _limparResiduosAnalise: function () {
            const painel = document.getElementById('painel-graficos');
            if (!painel) return;
            painel.style.display = '';
            painel.classList.remove('aberto');

            painel.querySelectorAll('[style*="display: none"], [style*="display:none"]').forEach(el => {
                const cls = String(el.className || '');
                if (/aba-.*-conteudo/.test(cls) && !/(ativa|active|aberto|selecionada|visivel)/.test(cls)) return;
                el.style.display = '';
            });
        },

        /* ------------------------------------------------------------
           Remove FAB roxo "Geo"
           ------------------------------------------------------------ */
        _removerFabRoxo: function () {
            if (!document.getElementById('tabtoggle-fab-css')) {
                const style = document.createElement('style');
                style.id = 'tabtoggle-fab-css';
                style.textContent = `
          .btn-geo { display: none !important; }
          button.btn-geo { display: none !important; }
          #btn-geo { display: none !important; }
        `;
                document.head.appendChild(style);
            }
            document.querySelectorAll('.btn-geo, #btn-geo, button.btn-geo').forEach(el => {
                el.style.display = 'none';
                el.setAttribute('aria-hidden', 'true');
            });
        },

        /* ------------------------------------------------------------
           Init
           ------------------------------------------------------------ */
        init: function () {
            this._removerFabRoxo();
            setTimeout(() => this._removerFabRoxo(), 500);
            setTimeout(() => this._removerFabRoxo(), 2000);

            // Intercepta clique nas abas
            document.addEventListener('click', (e) => {
                const btn = e.target.closest('.aba-btn');
                if (!btn) return;
                const aba = btn.dataset.aba;
                if (!aba) return;
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.clicar(aba);
            }, true);

            console.info('[TabToggle] arquitetura master pronta');
        }
    };

    window.TabToggle = TabToggle;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => TabToggle.init());
    } else {
        TabToggle.init();
    }
})();