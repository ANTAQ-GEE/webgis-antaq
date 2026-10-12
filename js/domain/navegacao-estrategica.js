/* ============================================================
   WebGIS ANTAQ — Módulo: NavegacaoEstrategica
   Escopo: navegação executiva por corredores estratégicos (Arco Norte,
           Tietê-Paraná, Rio Paraguai, Santos) e modo apresentação.
   Dependências: window.mapa, window.UI, window.DataManager, window.CAMADAS_MAPA
   Expõe: window.NavegacaoEstrategica
   ============================================================ */
(function () {
  'use strict';

  const CORREDORES = {
    'arco-norte': {
      nome: 'Arco Norte (Bacia Amazônica)',
      subtitulo: 'Barcarena, Santarém, Rio Madeira e Manaus',
      centro: [-2.9, -55.5],
      zoom: 6,
      camadasRecomendadas: ['ven_2024', 'instalacoes_portuarias'],
      descricao: '🚢 Arco Norte: Corredor hidroviário estratégico para escoamento de grãos e cabotagem'
    },
    'tiete-parana': {
      nome: 'Hidrovia Tietê-Paraná',
      subtitulo: 'Eixo multimodal SP / MS / PR / GO',
      centro: [-21.2, -50.8],
      zoom: 7,
      camadasRecomendadas: ['ven_2024'],
      descricao: '🌾 Hidrovia Tietê-Paraná: Eixo hidroviário de alta integração intermodal'
    },
    'rio-paraguai': {
      nome: 'Corredor do Rio Paraguai',
      subtitulo: 'Corumbá, Ladário e Porto Murtinho',
      centro: [-19.2, -57.6],
      zoom: 7,
      camadasRecomendadas: ['ven_2024', 'instalacoes_portuarias'],
      descricao: '⛰️ Rio Paraguai: Corredor de minério de ferro, manganês e grãos'
    },
    'santos': {
      nome: 'Complexo Portuário de Santos',
      subtitulo: 'Baixada Santista e Terminais Arrendados/TUP',
      centro: [-23.96, -46.30],
      zoom: 12,
      camadasRecomendadas: ['instalacoes_portuarias'],
      descricao: '⚓ Santos: Maior complexo portuário do Hemisfério Sul'
    },
    'brasil': {
      nome: 'Visão Nacional Completa',
      subtitulo: 'Malha hidroviária e portuária brasileira',
      centro: [-14.235, -51.925],
      zoom: 4,
      camadasRecomendadas: [],
      descricao: '🇧🇷 Panorama Nacional: 14 camadas regulatórias da ANTAQ'
    }
  };

  const NavegacaoEstrategica = {
    _modoApresentacaoAtivo: false,

    toggleMenu: function (ev) {
      if (ev) ev.stopPropagation();
      const menu = document.getElementById('dropdown-corredores');
      if (!menu) return;
      const aberto = menu.style.display === 'block';
      menu.style.display = aberto ? 'none' : 'block';
    },

    fecharMenu: function () {
      const menu = document.getElementById('dropdown-corredores');
      if (menu) menu.style.display = 'none';
    },

    voarPara: function (idCorredor) {
      this.fecharMenu();
      const c = CORREDORES[idCorredor];
      if (!c || !window.mapa) return;

      // 1. Voa suavemente até o centro do corredor
      window.mapa.flyTo(c.centro, c.zoom, {
        animate: true,
        duration: 1.6,
        easeLinearity: 0.25
      });

      // 2. Garante que as camadas estratégicas estejam ativas
      if (Array.isArray(c.camadasRecomendadas)) {
        c.camadasRecomendadas.forEach(idCamada => {
          if (window.CAMADAS_MAPA && !window.CAMADAS_MAPA[idCamada]) {
            if (typeof window.toggleCamada === 'function') {
              try { window.toggleCamada(idCamada); } catch (e) {}
            }
          }
        });
      }

      // 3. Feedback executivo discreto
      if (window.UI && typeof window.UI.toast === 'function') {
        window.UI.toast(c.descricao);
      }
    },

    toggleModoApresentacao: function () {
      this._modoApresentacaoAtivo = !this._modoApresentacaoAtivo;
      document.body.classList.toggle('modo-apresentacao', this._modoApresentacaoAtivo);

      const btn = document.getElementById('btn-modo-apresentacao');
      const ico = document.getElementById('ico-apresentacao');
      const painel = document.getElementById('painel-camadas-lateral');

      if (this._modoApresentacaoAtivo) {
        if (btn) btn.style.background = '#0284c7';
        if (ico) ico.textContent = '📺';

        // Recolhe o painel lateral para foco no mapa
        if (painel && !painel.classList.contains('recolhido')) {
          painel.classList.add('recolhido');
          document.body.classList.add('painel-lateral-recolhido');
        }

        // Tenta tela cheia se suportado e permitido
        try {
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } catch (e) {}

        if (window.UI) {
          window.UI.toast('🖥️ Modo Apresentação Ativado — Foco no mapa e telão executivo.');
        }
      } else {
        if (btn) btn.style.background = '#1e293b';
        if (ico) ico.textContent = '🖥️';

        if (painel && painel.classList.contains('recolhido')) {
          painel.classList.remove('recolhido');
          document.body.classList.remove('painel-lateral-recolhido');
        }

        try {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } catch (e) {}

        if (window.UI) {
          window.UI.toast('Modo Apresentação desativado.');
        }
      }

      // Reajusta o mapa Leaflet
      setTimeout(() => {
        if (window.mapa && window.mapa.invalidateSize) {
          window.mapa.invalidateSize();
        }
      }, 300);
    }
  };

  // Fecha o dropdown ao clicar fora
  document.addEventListener('click', (ev) => {
    const container = document.querySelector('.menu-corredores-container');
    if (container && !container.contains(ev.target)) {
      NavegacaoEstrategica.fecharMenu();
    }
  });

  // Atalho F10 para alternar Modo Apresentação
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'F10') {
      ev.preventDefault();
      NavegacaoEstrategica.toggleModoApresentacao();
    }
  });

  window.NavegacaoEstrategica = NavegacaoEstrategica;
  console.info('[js] NavegacaoEstrategica carregado');
})();
