/* ============================================================
   WebGIS ANTAQ — Módulo: SearchEngine
   Escopo: busca por atributos, aproximação e zoom em feições
   Dependências: window.DADOS_GEOJSON_BRUTOS, window.CONFIG_CAMADAS,
                 window.PopupRenderer, window.Security, window.UI,
                 window.FilterManager, window.DataManager, window.mapa
   Referências "lazy": window.VENUnifiedManager, window.CopilotoIA
   Expõe: window.SearchEngine
   ============================================================ */
(function () {
  'use strict';

  const SearchEngine = {
    debounceTimer: null,

    _resolverCamadaDeDados: function (idCamada) {
      if (idCamada === 'ven') {
        return (window.VENUnifiedManager && window.VENUnifiedManager.anoAtivo)
          ? window.VENUnifiedManager.anoAtivo
          : 'ven_2022';
      }
      return idCamada;
    },

    onInput: function (val) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.filtrar(val), 250);
    },

    filtrar: function (termo) {
      const listaEl = document.getElementById('resultados-busca');
      if (!termo || termo.trim().length < 2) { listaEl.style.display = 'none'; return; }

      const idCamadaVirtual = document.getElementById('sel-camada-busca').value;
      const idCamada = this._resolverCamadaDeDados(idCamadaVirtual);
      const geojson = DADOS_GEOJSON_BRUTOS[idCamada];
      if (!geojson || !geojson.features) return;

      const t = termo.toLowerCase();
      const matches = [];
      geojson.features.forEach(f => {
        const p = f.properties || {};
        let rotulo = p.nome || p.NOME_INSTALACAO || p.NOME_UC || p.terrai_nom || p.NOME_RIO || p.SIGLA_UF || p.MUNICIPIO || '';
        let encontrou = false;
        for (const [k, v] of Object.entries(p)) {
          if (['geom', 'geometry', 'id', 'gid', 'objectid', '_gpkgtable'].includes(k.toLowerCase())) continue;
          if (v !== undefined && v !== null && String(v).toLowerCase().includes(t)) {
            encontrou = true;
            if (!rotulo) rotulo = `${k}: ${v}`;
            break;
          }
        }
        if (encontrou) matches.push({ nome: String(rotulo), feature: f });
      });

      listaEl.innerHTML = '';
      if (matches.length === 0) {
        listaEl.innerHTML = '<div class="item-resultado">Nenhum ativo localizado.</div>';
      } else {
        matches.slice(0, 8).forEach(m => {
          const d = document.createElement('div');
          d.className = 'item-resultado';
          d.innerText = m.nome;
          d.onclick = () => {
            document.getElementById('input-busca').value = m.nome;
            listaEl.style.display = 'none';
            this.aproximar(m.feature);
          };
          listaEl.appendChild(d);
        });
      }
      listaEl.style.display = 'block';
    },

    aproximar: function (feature) {
      if (window.CopilotoIA) window.CopilotoIA.ultimoAtivoInspecionado = feature;
      if (window.CAMADA_DESTAQUE) mapa.removeLayer(window.CAMADA_DESTAQUE);

      window.CAMADA_DESTAQUE = L.geoJSON(feature, {
        style: { color: '#f59e0b', weight: 6, fillOpacity: 0.5 },
        pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 12, fillColor: '#f59e0b', color: '#fff', weight: 3, fillOpacity: 1 })
      }).addTo(mapa);

      const bounds = window.CAMADA_DESTAQUE.getBounds();
      if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
        mapa.flyTo(bounds.getCenter(), 14, { animate: true, duration: 1.2 });
      } else {
        mapa.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      }

      const idAtualVirtual = document.getElementById('sel-camada-busca').value;
      const idAtual = this._resolverCamadaDeDados(idAtualVirtual);
      window.CAMADA_DESTAQUE.bindPopup(window.PopupRenderer.gerar(idAtual, feature.properties)).openPopup();
    },

    executar: function () {
      const v = (document.getElementById('input-busca').value || '').trim();
      if (!v) {
        if (window.UI) window.UI.toast("Digite o nome ou código de um ativo para aproximar.");
        return;
      }

      const idCamadaVirtual = document.getElementById('sel-camada-busca').value;
      const idCamada = this._resolverCamadaDeDados(idCamadaVirtual);
      const geojson = DADOS_GEOJSON_BRUTOS[idCamada];
      if (!geojson || !geojson.features) {
        if (window.UI) window.UI.toast("Aguarde o carregamento dos dados da camada.");
        return;
      }

      const termo = v.toLowerCase();
      let matchExato = null, primeiroMatch = null;
      for (const f of geojson.features) {
        const p = f.properties || {};
        const nome = String(p.nome || p.NOME_INSTALACAO || p.NOME_RIO || p.nom_vessia || p.nome_travessia || p.SIGLA_UF || p.MUNICIPIO || '');
        if (nome.toLowerCase() === termo) { matchExato = f; break; }
        if (!primeiroMatch && nome.toLowerCase().includes(termo)) primeiroMatch = f;
      }
      const alvo = matchExato || primeiroMatch;

      if (alvo) {
        document.getElementById('resultados-busca').style.display = 'none';
        this.aproximar(alvo);
        const p = alvo.properties || {};
        if (window.UI) window.UI.toast(`📍 Zoom realizado em: ${p.nome || p.NOME_INSTALACAO || 'Ativo'}`);
      } else {
        let achouOutro = null;
        for (const [idOutro, g] of Object.entries(DADOS_GEOJSON_BRUTOS)) {
          if (g && g.features) {
            for (const f of g.features) {
              const p = f.properties || {};
              const n = String(p.nome || p.NOME_INSTALACAO || p.nom_vessia || '');
              if (n.toLowerCase().includes(termo)) { achouOutro = { feature: f, camada: idOutro }; break; }
            }
          }
          if (achouOutro) break;
        }
        if (achouOutro) {
          document.getElementById('sel-camada-busca').value = achouOutro.camada;
          window.FilterManager.aoMudarCamada(achouOutro.camada);
          document.getElementById('resultados-busca').style.display = 'none';
          this.aproximar(achouOutro.feature);
          if (window.UI) window.UI.toast(`📍 Ativo localizado na camada [${CONFIG_CAMADAS[achouOutro.camada]?.nome}].`);
        } else {
          if (window.UI) window.UI.toast(`Nenhum ativo localizado para "${v}".`);
        }
      }
    }
  };

  window.SearchEngine = SearchEngine;
  console.info('[js] SearchEngine carregado');
})();