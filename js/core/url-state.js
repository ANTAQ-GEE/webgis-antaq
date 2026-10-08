/* ============================================================
   WebGIS ANTAQ — Módulo: URLState (G3)
   Escopo: persistência de estado na URL (compartilhamento de mapas)
   Dependências: window.mapa, window.FilterManager, window.BasemapManager,
                 window.VENUnifiedManager
   Expõe: window.URLState
   ============================================================ */
(function () {
  'use strict';

  const URLState = {
    _timer: null,
    _restaurando: false,
    _inicializado: false,

    init: async function () {
      if (this._inicializado) {
        console.warn('[URLState] init() já foi chamado — ignorando.');
        return;
      }
      this._inicializado = true;
      console.info('[URLState] Inicializando…');

      this._configurarListeners();
      console.info('[URLState] Listeners instalados.');

      await this._restaurar();
      this._salvarAgora();
      console.info('[URLState] Estado inicial gravado na URL.');
    },

    salvar: function () {
      if (this._restaurando) return;
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this._salvarAgora(), 400);
    },

    _salvarAgora: function () {
      try {
        const centro = mapa.getCenter();
        const p = new URLSearchParams();

        p.set('lat', centro.lat.toFixed(5));
        p.set('lng', centro.lng.toFixed(5));
        p.set('z', String(Math.round(mapa.getZoom())));

        const selCamada = document.getElementById('sel-camada-busca');
        if (selCamada && selCamada.value) p.set('camada', selCamada.value);

        if (selCamada && selCamada.value === 'ven' && window.VENUnifiedManager) {
          p.set('safra', window.VENUnifiedManager.anoAtivo);
        }

        const selSub = document.getElementById('filtro-subtipo-dinamico');
        if (selSub && selSub.value && selSub.value !== 'TODOS' && selCamada && selCamada.value !== 'ven') {
          p.set('filtro', selSub.value);
        }

        const radioBase = document.querySelector('input[name="basemap"]:checked');
        if (radioBase && radioBase.value === 'escuro') p.set('base', 'escuro');

        // ✅ M11: salva aba ativa na URL
        if (window.TabManager && window.TabManager.abaAtiva && window.TabManager.abaAtiva !== 'mapa') {
          p.set('aba', window.TabManager.abaAtiva);
        }        

        const qs = p.toString();
        const novaURL = location.pathname + (qs ? '?' + qs : '');

        try {
          history.replaceState(null, '', novaURL);
        } catch (errReplace) {
          console.warn('[URLState] replaceState falhou, tentando pushState…', errReplace);
          try { history.pushState(null, '', novaURL); }
          catch (errPush) {
            console.error('[URLState] Não foi possível atualizar a URL neste ambiente.', errPush);
          }
        }
      } catch (e) {
        console.warn('[URLState] Erro ao salvar estado:', e);
      }
    },

    _restaurar: async function () {
      const params = new URLSearchParams(location.search);
      const keys = [...params.keys()];

      if (!keys.length) {
        console.info('[URLState] Sem parâmetros na URL — nada a restaurar.');
        this._restaurando = false;
        return;
      }

      console.info('[URLState] Restaurando estado da URL:', params.toString());
      this._restaurando = true;

      try {
        const lat = parseFloat(params.get('lat'));
        const lng = parseFloat(params.get('lng'));
        const zRaw = parseFloat(params.get('z'));
        const z = Math.min(Math.max(Math.round(zRaw), 1), 18);

        if (!isNaN(lat) && !isNaN(lng) && !isNaN(zRaw) && z >= 1 && z <= 18) {
          mapa.setView([lat, lng], z);
          console.info(`[URLState] Mapa posicionado em (${lat}, ${lng}) z=${z}`);
        }

        if (params.get('base') === 'escuro') {
          const radio = document.querySelector('input[name="basemap"][value="escuro"]');
          if (radio) {
            radio.checked = true;
            window.BasemapManager.trocar('escuro');
            console.info('[URLState] Basemap restaurado para escuro.');
          }
        }
        
        // ✅ M11: restaura aba ativa
        const abaUrl = params.get('aba');
        if (abaUrl && window.TabManager && ['mapa', 'analise', 'geo', 'ais'].includes(abaUrl)) {
          window.TabManager.trocar(abaUrl);
          console.info(`[URLState] Aba restaurada: ${abaUrl}`);
        }

        const camada = params.get('camada');
        const safra = params.get('safra');
        const filtro = params.get('filtro');

        if (camada) {
          const selCamada = document.getElementById('sel-camada-busca');
          if (selCamada && selCamada.querySelector(`option[value="${camada}"]`)) {
            await window.FilterManager.aoMudarCamada(camada);

            if (camada === 'ven') {
              if (safra && window.VENUnifiedManager && window.VENUnifiedManager.anoAtivo !== safra) {
                await this._aguardar(400);
                await window.VENUnifiedManager.mudarSafra(safra);
              }
            } else if (filtro) {
              await this._aguardar(300);
              const selSub = document.getElementById('filtro-subtipo-dinamico');
              if (selSub) {
                selSub.value = filtro;
                window.FilterManager.aoMudarSubfiltro(filtro);
              }
            }
          }
        }
      } catch (e) {
        console.warn('[URLState] Falha ao restaurar:', e);
      } finally {
        this._restaurando = false;
      }
    },

    _configurarListeners: function () {
      mapa.on('moveend', () => this.salvar());
      mapa.on('zoomend', () => this.salvar());

      const selCamada = document.getElementById('sel-camada-busca');
      if (selCamada) selCamada.addEventListener('change', () => this.salvar());

      const selSub = document.getElementById('filtro-subtipo-dinamico');
      if (selSub) selSub.addEventListener('change', () => this.salvar());

      document.querySelectorAll('input[name="basemap"]').forEach(r => {
        r.addEventListener('change', () => this.salvar());
      });
    },

    obterLinkAtual: function () { return location.href; },

    _aguardar: function (ms) { return new Promise(res => setTimeout(res, ms)); }
  };

  window.URLState = URLState;

  // Rede de segurança: se o IIFE do app esquecer de chamar URLState.init(),
  // auto-inicializa após o boot
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
      if (!URLState._inicializado) {
        console.warn('[URLState] Auto-init acionado (o init() principal não foi chamado).');
        URLState.init();
      }
    }, 1500);
  } else {
    window.addEventListener('load', () => {
      setTimeout(() => {
        if (!URLState._inicializado) {
          console.warn('[URLState] Auto-init acionado (o init() principal não foi chamado).');
          URLState.init();
        }
      }, 1500);
    });
  }

  console.info('[js] URLState carregado');
})();