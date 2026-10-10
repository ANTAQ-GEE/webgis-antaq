/* ============================================================
   WebGIS ANTAQ — Módulo: TabManager (M11)
   Escopo: sistema de abas (Mapa, Análise, Geo, AIS)
           Cada aba esconde/mostra módulos da UI sem recarregar o mapa.
   Dependências: window.UI
   Expõe: window.TabManager
   ============================================================ */
(function () {
  'use strict';

  const TabManager = {
    abaAtiva: 'mapa',
    _listeners: {},

    /**
     * Troca pra uma aba específica.
     * @param {string} aba — 'mapa' | 'analise' | 'geo' | 'ais'
     */
    trocar: function (aba) {
      if (!['mapa', 'analise', 'geo', 'ais', 'controle', 'painel'].includes(aba)) {
        console.warn('[TabManager] Aba inválida:', aba);
        return;
      }

      if (aba === this.abaAtiva) return;

      console.info(`[TabManager] ${this.abaAtiva} → ${aba}`);

      // 1. Marca botão ativo
      document.querySelectorAll('.aba-btn').forEach(btn => {
        btn.classList.toggle('ativo', btn.dataset.aba === aba);
      });

      // 2. Aplica visibilidade por aba
      document.body.setAttribute('data-aba-ativa', aba);

      // 3. Esconde/mostra painéis e ferramentas conforme a aba
      this._aplicarVisibilidade(aba);

      // 4. Avisa o resto do app (pra módulos reagirem)
      this.abaAtiva = aba;
      window.dispatchEvent(new CustomEvent('tabmudou', { detail: { aba } }));
      // ✅ Salva preferência do usuário
      try { localStorage.setItem('antaq_aba_ativa', aba); } catch (e) {}
      // 5. Auto-abre painéis específicos
      if (aba === 'analise') {
        const painel = document.getElementById('painel-graficos');
        if (painel && !painel.classList.contains('aberto')) {
          painel.classList.add('aberto');
        }
        // 1 frame de espera só pro Chart.js medir o tamanho do canvas
        requestAnimationFrame(() => {
          if (window.Analytics) {
            window.Analytics.atualizarSeletores();
            window.Analytics.trocarAba(window.Analytics.abaAtiva);
          }
        });
      }

      // M14 — Liga/desliga a camada AIS de verdade
      if (aba === 'ais') {
        const chkAis = document.getElementById('chk-ais');
        const deveLigar = !window.AISManager._visivel;
        if (chkAis) chkAis.checked = deveLigar;
        window.AISManager.toggle();
      }
      
    },
    _configurarAtalhos: function () {
      document.addEventListener('keydown', (ev) => {
        const alvo = ev.target;
        if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT')) return;

        // Ctrl+1 → Mapa
        if ((ev.ctrlKey || ev.metaKey) && ev.key === '1') {
          ev.preventDefault();
          this.trocar('mapa');
        }
        // Ctrl+2 → Análise
        if ((ev.ctrlKey || ev.metaKey) && ev.key === '2') {
          ev.preventDefault();
          this.trocar('analise');
        }
        // Ctrl+3 → Geo
        if ((ev.ctrlKey || ev.metaKey) && ev.key === '3') {
          ev.preventDefault();
          this.trocar('geo');
        }
        // Ctrl+4 → AIS
        if ((ev.ctrlKey || ev.metaKey) && ev.key === '4') {
          ev.preventDefault();
          this.trocar('ais');
        }
      });
    },    

    /**
     * Aplica a visibilidade dos painéis conforme a aba.
     */
    _aplicarVisibilidade: function (aba) {
      // Elementos que SEMPRE aparecem (global)
      // — mapa, header, barra de abas, rodapé, notificações, legenda

      // Elementos específicos por aba
      // ✅ O copiloto NUNCA é escondido por aba (é global)
const regras = {
  mapa: {
    mostrar: [
      'painel-camadas-lateral',
      'btn-flutuante-abrir-painel',
      'barra-busca-atributos',
      'toolbar-medicao',
      'caixa-legenda',
      'painel-tabela'
    ],
    esconder: [
      'painel-graficos',
      'btn-header-matriz-ven',
      'btn-header-comparar-safras',
      'btn-header-painel-analitico'
    ]
  },
  analise: {
    mostrar: [
      'painel-graficos',
      'painel-camadas-lateral',
      'btn-flutuante-abrir-painel',
      'btn-header-matriz-ven',
      'btn-header-comparar-safras',
      'btn-header-painel-analitico'
    ],
    esconder: [
      'barra-busca-atributos',
      'toolbar-medicao',
      'caixa-legenda',
      'painel-tabela'
    ]
  },
  geo: {
    mostrar: [
      'painel-camadas-lateral',
      'btn-flutuante-abrir-painel',
      'toolbar-medicao',
      'caixa-legenda'
    ],
    esconder: [
      'barra-busca-atributos',
      'painel-graficos',
      'painel-tabela',
      'btn-header-matriz-ven',
      'btn-header-comparar-safras',
      'btn-header-painel-analitico'
    ]
  },
  controle: {
    mostrar: [
      'painel-camadas-lateral'
    ]
  },
  ais: {
    mostrar: [
      'painel-camadas-lateral',
      'btn-flutuante-abrir-painel'
    ],
    esconder: [
      'barra-busca-atributos',
      'toolbar-medicao',
      'caixa-legenda',
      'painel-graficos',
      'painel-tabela',
      'btn-header-matriz-ven',
      'btn-header-comparar-safras',
      'btn-header-painel-analitico'
    ]
  }
};

      const regra = regras[aba] || regras.mapa;

      // Esconde tudo primeiro
      const todos = new Set([...regra.mostrar, ...regra.esconder]);

      for (const id of todos) {
        const el = document.getElementById(id);
        if (!el) continue;

        // ✅ Copiloto é global — nunca é escondido por aba
        if (id === 'painel-copiloto') continue;

        const deveMostrar = regra.mostrar.includes(id);
        if (deveMostrar) {
          el.style.display = '';
          el.removeAttribute('hidden');
        } else {
          el.style.display = 'none';
        }
      }

      // Ajusta o mapa se necessário (painéis laterais alteram espaço)
      setTimeout(() => {
        if (window.mapa && window.mapa.invalidateSize) {
          window.mapa.invalidateSize();
        }
      }, 250);
    },

    /**
     * Retorna a aba atual.
     */
    obter: function () {
      return this.abaAtiva;
    },

    /**
     * Verifica se uma aba está ativa.
     */
    ehAtiva: function (aba) {
      return this.abaAtiva === aba;
    },

    /**
     * Registra um callback que roda quando a aba mudar.
     */
    onMudar: function (callback) {
      if (typeof callback === 'function') {
        window.addEventListener('tabmudou', (e) => callback(e.detail.aba));
      }
    },

    /**
     * Inicialização: seta a aba inicial como 'mapa'.
     */
    init: function () {
      // ✅ Restaura última aba usada (ou 'mapa')
      let abaInicial = 'mapa';
      try {
        const salva = localStorage.getItem('antaq_aba_ativa');
        if (salva && ['mapa', 'analise', 'geo', 'ais'].includes(salva)) {
          abaInicial = salva;
        }
      } catch (e) {}

      // Marca botão ativo
      document.querySelectorAll('.aba-btn').forEach(btn => {
        btn.classList.toggle('ativo', btn.dataset.aba === abaInicial);
      });

      document.body.setAttribute('data-aba-ativa', abaInicial);
      this.abaAtiva = abaInicial;

      this._aplicarVisibilidade(abaInicial);
      this._configurarAtalhos();

      console.info(`[M11] TabManager pronto. Aba inicial: ${abaInicial}`);
      console.info('[M11] Atalhos: Ctrl+1 (Mapa), Ctrl+2 (Análise), Ctrl+3 (Geo), Ctrl+4 (AIS)');
    }
  };

  window.TabManager = TabManager;
  console.info('[js] TabManager carregado (M11)');
})();