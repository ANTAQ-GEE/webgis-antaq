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

  function normalizar(texto) {
    if (!texto) return '';
    return String(texto)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  const SearchEngine = {
    debounceTimer: null,

    _resolverCamadaDeDados: function (idCamada) {
      if (idCamada === 'ven') {
        const selSub = document.getElementById('filtro-subtipo-dinamico');
        if (selSub && selSub.value && selSub.value.startsWith('ven_')) {
          return selSub.value;
        }
        return (window.VENUnifiedManager && window.VENUnifiedManager.anoAtivo)
          ? window.VENUnifiedManager.anoAtivo
          : 'ven_2024';
      }
      return idCamada;
    },

    _gerarRotulo: function (f, idCamada) {
      const p = f.properties || {};
      const id = idCamada || '';

      // Vias Navegadas (VEN)
      if (id.startsWith('ven_') || id === 'ven') {
        const nomeHidrovia = p.nome || 'Hidrovia';
        const rio = p.nome_rio || p.NOME_RIO || '';
        const orig = p.mun_origem || p.municipio_origem || '';
        const dest = p.mun_estino || p.mun_destino || p.municipio_destino || '';
        let od = '';
        if (orig || dest) {
          od = ` · ${orig || '—'} → ${dest || '—'}`;
        }
        if (rio) {
          return `${nomeHidrovia} (${rio})${od}`;
        }
        return `${nomeHidrovia}${od}`;
      }

      // Instalações Portuárias
      if (id === 'instalacoes_portuarias') {
        const nome = p.nome || p.NOME_INSTALACAO || p.nome_instalacao || 'Instalação Portuária';
        const mun = p.municipio || p.MUNICIPIO || p.mun_origem || '';
        const uf = p.uf || p.UF || p.sigla_uf || p.SIGLA_UF || '';
        const loc = (mun || uf) ? ` (${mun}${mun && uf ? '/' : ''}${uf})` : '';
        return `${nome}${loc}`;
      }

      // Travessias
      if (id.includes('travess')) {
        const nome = p.nom_vessia || p.nome_travessia || p.nome || 'Travessia';
        const mun = p.municipio || p.mun_origem || '';
        return `${nome}${mun ? ` (${mun})` : ''}`;
      }

      // Unidades de Conservação / Terras Indígenas
      if (p.NOME_UC || p.nome_uc) return `UC · ${p.NOME_UC || p.nome_uc}`;
      if (p.terrai_nom) return `TI · ${p.terrai_nom}`;

      // Rodovias / Ferrovias
      if (p.snv || p.vl_codigo) return `Trecho ${p.snv || p.vl_codigo}${p.nome ? ' · ' + p.nome : ''}`;

      // Padrão genérico
      const generico = p.nome || p.NOME || p.descricao || p.DESCRICAO || p.sigla_uf || p.SIGLA_UF || '';
      if (generico) return String(generico);

      // Fallback para primeiro valor alfanumérico não-geométrico
      for (const [k, v] of Object.entries(p)) {
        if (['geom', 'geometry', 'id', 'gid', 'objectid', '_gpkgtable'].includes(k.toLowerCase())) continue;
        if (v && typeof v === 'string' && v.trim().length > 1) {
          return `${k}: ${v.trim()}`;
        }
      }
      return 'Feição ' + (p.id || p.gid || '');
    },

    onInput: function (val) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.filtrar(val), 180);
    },

    filtrar: async function (termo) {
      const listaEl = document.getElementById('resultados-busca');
      if (!listaEl) return;

      if (!termo || termo.trim().length < 1) {
        listaEl.style.display = 'none';
        listaEl.innerHTML = '';
        return;
      }

      const idCamadaVirtual = document.getElementById('sel-camada-busca')?.value || 'instalacoes_portuarias';
      const termoNorm = normalizar(termo);
      const matches = [];

      // Caso 1: Busca em TODAS as camadas visíveis
      if (idCamadaVirtual === 'TODAS_VISIVEIS') {
        const camadasAlvo = [];
        for (const [id, layer] of Object.entries(window.CAMADAS_MAPA || {})) {
          if (window.mapa && window.mapa.hasLayer(layer)) {
            camadasAlvo.push(id);
          }
        }

        for (const idC of camadasAlvo) {
          const fc = window.DADOS_GEOJSON_BRUTOS?.[idC];
          if (!fc || !fc.features) continue;

          for (const f of fc.features) {
            if (matches.length >= 10) break;
            const p = f.properties || {};
            let achou = false;

            for (const [k, v] of Object.entries(p)) {
              if (['geom', 'geometry', 'id', 'gid', 'objectid', '_gpkgtable'].includes(k.toLowerCase())) continue;
              if (v !== undefined && v !== null && normalizar(v).includes(termoNorm)) {
                achou = true;
                break;
              }
            }

            if (achou) {
              const rotulo = this._gerarRotulo(f, idC);
              const nomeCamada = window.CONFIG_CAMADAS?.[idC]?.nome || idC;
              matches.push({
                nome: rotulo,
                subtitulo: nomeCamada,
                feature: f,
                camadaId: idC
              });
            }
          }
          if (matches.length >= 10) break;
        }
      }
      // Caso 2: Busca na camada selecionada
      else {
        const idCamada = this._resolverCamadaDeDados(idCamadaVirtual);
        let geojson = window.DADOS_GEOJSON_BRUTOS?.[idCamada];

        // Se a camada não estiver carregada na memória, carrega sob demanda
        if (!geojson || !geojson.features?.length) {
          if (window.DataManager && typeof window.DataManager.carregarCamada === 'function') {
            try {
              listaEl.innerHTML = '<div class="item-resultado" style="color:#38bdf8;">⏳ Carregando dados da camada…</div>';
              listaEl.style.display = 'block';
              geojson = await window.DataManager.carregarCamada(idCamada);
            } catch (e) {
              console.warn('[SearchEngine] Falha ao carregar camada sob demanda:', e);
            }
          }
        }

        if (geojson && geojson.features) {
          for (const f of geojson.features) {
            if (matches.length >= 10) break;
            const p = f.properties || {};
            let achou = false;

            for (const [k, v] of Object.entries(p)) {
              if (['geom', 'geometry', 'id', 'gid', 'objectid', '_gpkgtable'].includes(k.toLowerCase())) continue;
              if (v !== undefined && v !== null && normalizar(v).includes(termoNorm)) {
                achou = true;
                break;
              }
            }

            if (achou) {
              const rotulo = this._gerarRotulo(f, idCamada);
              matches.push({
                nome: rotulo,
                subtitulo: '',
                feature: f,
                camadaId: idCamada
              });
            }
          }
        }
      }

      listaEl.innerHTML = '';
      if (matches.length === 0) {
        listaEl.innerHTML = '<div class="item-resultado" style="color:#94a3b8;">Nenhum ativo localizado.</div>';
      } else {
        matches.slice(0, 8).forEach(m => {
          const d = document.createElement('div');
          d.className = 'item-resultado';
          d.style.display = 'flex';
          d.style.flexDirection = 'column';
          d.style.gap = '2px';

          const titulo = document.createElement('span');
          titulo.innerText = m.nome;
          titulo.style.fontWeight = '600';
          titulo.style.color = '#f1f5f9';
          d.appendChild(titulo);

          if (m.subtitulo) {
            const sub = document.createElement('span');
            sub.innerText = m.subtitulo;
            sub.style.fontSize = '10px';
            sub.style.color = '#38bdf8';
            d.appendChild(sub);
          }

          d.onclick = () => {
            const inp = document.getElementById('input-busca');
            if (inp) inp.value = m.nome;
            listaEl.style.display = 'none';
            this.aproximar(m.feature, m.camadaId);
          };
          listaEl.appendChild(d);
        });
      }
      listaEl.style.display = 'block';
    },

    aproximar: function (feature, camadaId) {
      if (window.CopilotoIA) window.CopilotoIA.ultimoAtivoInspecionado = feature;
      if (window.CAMADA_DESTAQUE && window.mapa) {
        try { window.mapa.removeLayer(window.CAMADA_DESTAQUE); } catch (e) {}
      }

      const idAtualVirtual = document.getElementById('sel-camada-busca')?.value || 'instalacoes_portuarias';
      const idAtual = camadaId || this._resolverCamadaDeDados(idAtualVirtual);

      window.CAMADA_DESTAQUE = L.geoJSON(feature, {
        style: { color: '#f59e0b', weight: 6, opacity: 0.95, fillOpacity: 0.5 },
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {
          radius: 12,
          fillColor: '#f59e0b',
          color: '#ffffff',
          weight: 3,
          fillOpacity: 1
        })
      }).addTo(window.mapa);

      try {
        const bounds = window.CAMADA_DESTAQUE.getBounds();
        if (bounds.isValid()) {
          if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
            window.mapa.flyTo(bounds.getCenter(), 14, { animate: true, duration: 1.2 });
          } else {
            window.mapa.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
          }
        }
      } catch (e) { /* ignora */ }

      if (window.PopupRenderer && typeof window.PopupRenderer.gerar === 'function') {
        const popupHtml = window.PopupRenderer.gerar(idAtual, feature.properties);
        window.CAMADA_DESTAQUE.bindPopup(popupHtml).openPopup();
      }
    },

    executar: async function () {
      const inp = document.getElementById('input-busca');
      const v = (inp ? inp.value : '').trim();
      if (!v) {
        if (window.UI) window.UI.toast("Digite o nome ou código de um ativo para aproximar.");
        return;
      }

      const idCamadaVirtual = document.getElementById('sel-camada-busca')?.value || 'instalacoes_portuarias';
      const idCamada = this._resolverCamadaDeDados(idCamadaVirtual);
      let geojson = window.DADOS_GEOJSON_BRUTOS?.[idCamada];

      if (!geojson || !geojson.features?.length) {
        if (window.DataManager && typeof window.DataManager.carregarCamada === 'function') {
          if (window.UI) window.UI.toast(`⏳ Carregando dados de ${idCamada}...`);
          try {
            geojson = await window.DataManager.carregarCamada(idCamada);
          } catch (e) {}
        }
      }

      if (!geojson || !geojson.features) {
        if (window.UI) window.UI.toast("Aguarde o carregamento dos dados da camada.");
        return;
      }

      const termoNorm = normalizar(v);
      let matchExato = null;
      let primeiroMatch = null;

      for (const f of geojson.features) {
        const p = f.properties || {};
        for (const [k, val] of Object.entries(p)) {
          if (['geom', 'geometry', 'id', 'gid', 'objectid', '_gpkgtable'].includes(k.toLowerCase())) continue;
          const strNorm = normalizar(val);
          if (strNorm === termoNorm) {
            matchExato = f;
            break;
          }
          if (!primeiroMatch && strNorm.includes(termoNorm)) {
            primeiroMatch = f;
          }
        }
        if (matchExato) break;
      }

      const alvo = matchExato || primeiroMatch;

      if (alvo) {
        const listaEl = document.getElementById('resultados-busca');
        if (listaEl) listaEl.style.display = 'none';
        this.aproximar(alvo, idCamada);
        const p = alvo.properties || {};
        const rotulo = this._gerarRotulo(alvo, idCamada);
        if (window.UI) window.UI.toast(`📍 Zoom realizado em: ${rotulo}`);
      } else {
        // Busca global em outras camadas carregadas
        let achouOutro = null;
        for (const [idOutro, g] of Object.entries(window.DADOS_GEOJSON_BRUTOS || {})) {
          if (g && g.features) {
            for (const f of g.features) {
              const p = f.properties || {};
              for (const [k, val] of Object.entries(p)) {
                if (['geom', 'geometry', 'id', 'gid', 'objectid', '_gpkgtable'].includes(k.toLowerCase())) continue;
                if (normalizar(val).includes(termoNorm)) {
                  achouOutro = { feature: f, camada: idOutro };
                  break;
                }
              }
              if (achouOutro) break;
            }
          }
          if (achouOutro) break;
        }

        if (achouOutro) {
          const selCam = document.getElementById('sel-camada-busca');
          if (selCam) {
            selCam.value = achouOutro.camada;
            if (window.FilterManager && typeof window.FilterManager.aoMudarCamada === 'function') {
              window.FilterManager.aoMudarCamada(achouOutro.camada);
            }
          }
          const listaEl = document.getElementById('resultados-busca');
          if (listaEl) listaEl.style.display = 'none';
          this.aproximar(achouOutro.feature, achouOutro.camada);
          const nomeC = window.CONFIG_CAMADAS?.[achouOutro.camada]?.nome || achouOutro.camada;
          if (window.UI) window.UI.toast(`📍 Ativo localizado na camada [${nomeC}].`);
        } else {
          if (window.UI) window.UI.toast(`Nenhum ativo localizado para "${v}".`);
        }
      }
    }
  };

  window.SearchEngine = SearchEngine;
  console.info('[js] SearchEngine carregado');
})();
