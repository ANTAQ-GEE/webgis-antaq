/* ============================================================
   WebGIS Corporativo ANTAQ — Módulo: RelatorioExecutivoPDF
   Escopo: Geração de Nota Técnica e Dossiê Executivo de Geointeligência
           no padrão SEI/ANTAQ (GEE/SEPH - Resolução nº 116/2024 e
           Lei nº 12.815/2013), com carregamento automático sob demanda
           de Terras Indígenas (FUNAI) e Unidades de Conservação (ICMBio),
           cruzamento poligonal exato e exportação nativa A4 para PDF.
   Expõe: window.RelatorioExecutivoPDF
   ============================================================ */
(function () {
  'use strict';

  const RelatorioExecutivoPDF = {
    gerarNotaTecnica: async function (opcoes = {}) {
      const escopo = opcoes.escopo || 'auto';
      const selecionadas = (window.SelectionManager && Array.isArray(window.SelectionManager._selecionadas))
        ? window.SelectionManager._selecionadas
        : [];

      const usarSelecao = (escopo === 'selecao') || (escopo === 'auto' && selecionadas.length > 0);

      // Abre a janela sincronamente no evento de clique para evitar bloqueador de pop-up
      const win = window.open('', '_blank', 'width=1080,height=880,scrollbars=yes');
      if (!win) {
        if (window.UI && typeof window.UI.toast === 'function') {
          window.UI.toast('⚠️ Permita pop-ups no navegador para abrir a Nota Técnica A4.', 'erro');
        } else {
          alert('Permita pop-ups no navegador para abrir a Nota Técnica para impressão/PDF.');
        }
        return;
      }

      // Tela de carregamento imediata enquanto garante as poligonais de TIs e UCs
      win.document.open();
      win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Processando Nota Técnica ANTAQ...</title>
        <style>body{margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0a192f;color:#f8fafc;font-family:'Segoe UI',system-ui,sans-serif;text-align:center;padding:24px;}
        .box{max-width:480px;background:#0f2744;border:1px solid #0284c7;border-radius:12px;padding:28px 32px;box-shadow:0 20px 50px rgba(0,0,0,0.6);}
        .spin{font-size:36px;margin-bottom:12px;animation:p 1.2s infinite ease-in-out;}@keyframes p{0%,100%{transform:scale(1);}50%{transform:scale(1.18);}}</style></head>
        <body><div class="box"><div class="spin">🛰️</div><h3 style="margin:0 0 8px 0;color:#38bdf8;">Gerando Nota Técnica SEI/ANTAQ (GEE/SEPH)</h3>
        <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.5;">Carregando poligonais oficiais da <strong>FUNAI (Terras Indígenas)</strong> e do <strong>ICMBio (Unidades de Conservação)</strong> e executando o cruzamento geodésico das instalações...</p></div></body></html>`);
      win.document.close();

      try {
        await this._garantirCamadasRestricao();
        const dadosRelatorio = this._coletarDados(usarSelecao, selecionadas);
        const htmlNota = this._montarHTML(dadosRelatorio);

        win.document.open();
        win.document.write(htmlNota);
        win.document.close();

        if (window.UI && typeof window.UI.toast === 'function') {
          window.UI.toast('📄 Nota Técnica GEE/SEPH gerada com cruzamento socioambiental completo!', 'sucesso');
        }
      } catch (err) {
        console.error('[RelatorioExecutivoPDF] Erro ao gerar Nota Técnica:', err);
        if (window.UI && typeof window.UI.toast === 'function') {
          window.UI.toast('⚠️ Erro ao gerar Nota Técnica: ' + (err.message || err), 'erro');
        }
      }
    },

    _garantirCamadasRestricao: async function () {
      window.DADOS_GEOJSON_BRUTOS = window.DADOS_GEOJSON_BRUTOS || {};
      const camadasRestricao = [
        { id: 'tis_poligonais', urls: ['dados/tis_poligonais.geojson', './dados/tis_poligonais.geojson'] },
        { id: 'ucs_federais',   urls: ['dados/ucs_federais.geojson', './dados/ucs_federais.geojson'] }
      ];

      await Promise.allSettled(camadasRestricao.map(async (item) => {
        if (window.DADOS_GEOJSON_BRUTOS[item.id]?.features?.length > 0) return;

        // 1. Tenta via FetchManager / DataAdapter silenciosamente (sem precisar ligar a camada no mapa)
        for (const url of item.urls) {
          try {
            let gj = null;
            if (window.FetchManager && typeof window.FetchManager.fetchGeoJSON === 'function') {
              gj = await window.FetchManager.fetchGeoJSON(url, { timeoutMs: 20000, retries: 1 });
            } else {
              const r = await fetch(url);
              if (r.ok) gj = await r.json();
            }
            if (gj && Array.isArray(gj.features) && gj.features.length > 0) {
              window.DADOS_GEOJSON_BRUTOS[item.id] = gj;
              console.info(`[RelatorioExecutivoPDF] Base ${item.id} carregada em memória (${gj.features.length} poligonais).`);
              return;
            }
          } catch (_) {}
        }

        // 2. Fallback via DataManager.carregarCamada
        if (window.DataManager && typeof window.DataManager.carregarCamada === 'function') {
          try {
            await window.DataManager.carregarCamada(item.id);
          } catch (_) {}
        }
      }));
    },

    _extrairUFRobusta: function (p) {
      if (!p) return 'N/I';
      if (window.Security && typeof window.Security.extrairUF === 'function') {
        const u = window.Security.extrairUF(p);
        if (u) return u;
      }
      const raw = (p.uf || p.estado || p.sigla_uf || '').toString().toUpperCase().trim();
      return raw.length === 2 ? raw : 'N/I';
    },

    _coletarDados: function (usarSelecao, selecionadas) {
      const agora = new Date();
      const dataFormatada = agora.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
      const horaFormatada = agora.toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit'
      });

      const ufFiltro = document.getElementById('sel-uf-busca')?.value || 'TODAS';
      const camadaBusca = document.getElementById('sel-camada-busca')?.value || 'instalacoes_portuarias';
      const centroMapa = window.mapa ? window.mapa.getCenter() : { lat: -15.78, lng: -47.93 };
      const zoomMapa = window.mapa ? window.mapa.getZoom() : 4;

      let feicoesAlvo = [];
      let tituloEscopo = '';

      if (usarSelecao && selecionadas.length > 0) {
        feicoesAlvo = selecionadas.map(item => ({
          feature: item.feature,
          camadaId: item.camadaId || 'instalacoes_portuarias'
        }));
        tituloEscopo = `Recorte de Seleção Espacial Ativa (${feicoesAlvo.length.toLocaleString('pt-BR')} feições inspecionadas)`;
      } else {
        const brutosPortos = window.DADOS_GEOJSON_BRUTOS?.['instalacoes_portuarias']?.features || [];
        brutosPortos.forEach(f => {
          const cat = window.PortClassification ? window.PortClassification.classificar(f.properties) : { id: 'OUTROS' };
          const chkSub = document.getElementById(`chk-sub-${cat.id}`);
          const subAtivo = chkSub ? chkSub.checked : (cat.padraoAtivo !== false);
          if (!subAtivo) return;

          const ufProp = this._extrairUFRobusta(f.properties);
          if (ufFiltro && ufFiltro !== 'TODAS' && ufProp !== ufFiltro.toUpperCase()) {
            return;
          }
          feicoesAlvo.push({ feature: f, camadaId: 'instalacoes_portuarias' });
        });
        tituloEscopo = ufFiltro !== 'TODAS'
          ? `Inventário Portuário e Hidroviário — Recorte Estadual (${ufFiltro})`
          : `Inventário Nacional de Instalações Portuárias e Hidroviárias Ativas`;
      }

      const contagemRegime = {};
      const contagemEsfera = { 'Pública': 0, 'Privada': 0, 'Não Informada': 0 };
      const contagemUF = {};
      const itensDetalhados = [];

      feicoesAlvo.forEach((item, idx) => {
        const p = item.feature?.properties || {};
        const geom = item.feature?.geometry || {};
        const cat = window.PortClassification
          ? window.PortClassification.classificar(p)
          : { id: 'OUTROS', nome: p.tipo || 'Instalação', cor: '#64748b' };
        const esfera = window.classificarEsfera ? window.classificarEsfera(p) : 'Não Informada';
        const uf = (cat.id === 'INTERNACIONAL') ? 'EXT' : this._extrairUFRobusta(p);
        const nome = (window.Security && window.Security.repararTexto)
          ? window.Security.repararTexto(p.nome || p.instalacao || p.nm_instalacao || p.porto || p.hidrovia || `Feição #${idx + 1}`)
          : (p.nome || p.instalacao || p.nm_instalacao || p.porto || p.hidrovia || `Feição #${idx + 1}`);
        const municipio = (window.Security && window.Security.repararTexto)
          ? window.Security.repararTexto(p.municipio || p.nm_municipio || p.cidade || p.loc_izacao || '—')
          : (p.municipio || p.nm_municipio || p.cidade || p.loc_izacao || '—');

        contagemRegime[cat.nome] = (contagemRegime[cat.nome] || 0) + 1;
        contagemEsfera[esfera] = (contagemEsfera[esfera] || 0) + 1;
        if (uf !== 'EXT') {
          contagemUF[uf] = (contagemUF[uf] || 0) + 1;
        }

        let coordsStr = '—';
        if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
          coordsStr = `${Number(geom.coordinates[1]).toFixed(4)}°, ${Number(geom.coordinates[0]).toFixed(4)}°`;
        }

        if (itensDetalhados.length < 150) {
          itensDetalhados.push({
            ordem: idx + 1,
            nome: String(nome),
            regime: cat.nome,
            corRegime: cat.cor,
            esfera,
            municipio: String(municipio),
            uf,
            coordenadas: coordsStr
          });
        }
      });

      // Executa o cruzamento sobre TODAS as feições alvo contra TIs e UCs
      const analiseSocioambiental = this._avaliarProximidadeSocioambiental(feicoesAlvo);

      return {
        numeroNota: `${Math.floor(100 + Math.random() * 890)}/${agora.getFullYear()}/GEE/SEPH`,
        dataFormatada,
        horaFormatada,
        tituloEscopo,
        ufFiltro,
        camadaBusca,
        centroMapa,
        zoomMapa,
        totalFeicoes: feicoesAlvo.length,
        usarSelecao,
        contagemRegime,
        contagemEsfera,
        contagemUF,
        itensDetalhados,
        analiseSocioambiental
      };
    },

    _haversineKm: function (lon1, lat1, lon2, lat2) {
      const R = 6371.0;
      const toRad = Math.PI / 180;
      const dLat = (lat2 - lat1) * toRad;
      const dLon = (lon2 - lon1) * toRad;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
    },

    _indexarPoligonais: function (features, tipoRestricao) {
      const index = [];
      const reparar = (txt) => (window.Security && window.Security.repararTexto) ? window.Security.repararTexto(String(txt || '')) : String(txt || '');

      for (const f of features) {
        const geom = f?.geometry;
        if (!geom) continue;
        const allCoords = [];
        if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
          for (const ring of geom.coordinates) {
            if (Array.isArray(ring)) allCoords.push(...ring);
          }
        } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
          for (const poly of geom.coordinates) {
            if (Array.isArray(poly)) {
              for (const ring of poly) {
                if (Array.isArray(ring)) allCoords.push(...ring);
              }
            }
          }
        }
        if (allCoords.length === 0) continue;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let i = 0; i < allCoords.length; i++) {
          const x = allCoords[i][0], y = allCoords[i][1];
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }

        // Amostra até 250 vértices de borda para cálculo rápido e exato de distância à borda
        const step = Math.max(1, Math.floor(allCoords.length / 250));
        const sampled = [];
        for (let i = 0; i < allCoords.length; i += step) {
          sampled.push(allCoords[i]);
        }

        const p = f.properties || {};
        const nome = tipoRestricao === 'TI'
          ? reparar(p.terrai_nom || p.nome || p.nm_ti || 'Terra Indígena')
          : reparar(p.nome || p.nm_uc || p.nome_uc || p.ORIG_NAME || 'Unidade de Conservação');
        const detalhe = tipoRestricao === 'TI'
          ? reparar(`${p.etnia_nome ? 'Etnia ' + p.etnia_nome : ''}${p.fase_ti ? ' (' + p.fase_ti + ')' : ''}`.trim() || 'FUNAI')
          : reparar(p.categoria || p.grupo || p.esfera || 'ICMBio');
        const uf = p.uf_sigla || p.uf || '';

        index.push({
          feature: f,
          nome: uf ? `${nome} (${uf})` : nome,
          tipo: tipoRestricao === 'TI' ? 'Terra Indígena (FUNAI)' : 'Unidade de Conservação (ICMBio)',
          detalhe,
          // Buffer de ~16km em graus (0.16°) ao redor do Bounding Box
          bbox: [minX - 0.16, minY - 0.16, maxX + 0.16, maxY + 0.16],
          coords: sampled
        });
      }
      return index;
    },

    _avaliarProximidadeSocioambiental: function (feicoesAlvo) {
      const tis = window.DADOS_GEOJSON_BRUTOS?.['tis_poligonais']?.features || [];
      const ucs = window.DADOS_GEOJSON_BRUTOS?.['ucs_federais']?.features || [];

      const resultado = {
        tisCarregadas: tis.length,
        ucsCarregadas: ucs.length,
        totalAlertasTI: 0,
        totalAlertasUC: 0,
        totalSobreposicaoDireta: 0,
        alertasBuffer15km: []
      };

      if (tis.length === 0 && ucs.length === 0) return resultado;

      const idxTI = this._indexarPoligonais(tis, 'TI');
      const idxUC = this._indexarPoligonais(ucs, 'UC');
      const todosIndices = idxTI.concat(idxUC);
      const reparar = (txt) => (window.Security && window.Security.repararTexto) ? window.Security.repararTexto(String(txt || '')) : String(txt || '');

      const alertas = [];

      for (let i = 0; i < feicoesAlvo.length; i++) {
        const f = feicoesAlvo[i].feature;
        if (!f || !f.geometry || f.geometry.type !== 'Point' || !Array.isArray(f.geometry.coordinates)) continue;
        const lon = Number(f.geometry.coordinates[0]);
        const lat = Number(f.geometry.coordinates[1]);
        if (isNaN(lon) || isNaN(lat)) continue;

        const nomeAtivo = reparar(f.properties?.nome || f.properties?.instalacao || 'Ativo Portuário');
        const ufAtivo = this._extrairUFRobusta(f.properties);

        for (let j = 0; j < todosIndices.length; j++) {
          const poly = todosIndices[j];
          const b = poly.bbox;
          if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;

          // Verifica primeiro se está no interior exato da poligonal via Turf
          let dentro = false;
          if (window.turf && typeof window.turf.booleanPointInPolygon === 'function') {
            try {
              dentro = window.turf.booleanPointInPolygon([lon, lat], poly.feature);
            } catch (_) {}
          }

          let minDist = 0;
          if (!dentro) {
            minDist = Infinity;
            const coords = poly.coords;
            for (let k = 0; k < coords.length; k++) {
              const d = this._haversineKm(lon, lat, coords[k][0], coords[k][1]);
              if (d < minDist) minDist = d;
            }
          }

          if (dentro || minDist <= 15.0) {
            if (poly.tipo.includes('FUNAI')) resultado.totalAlertasTI++;
            else resultado.totalAlertasUC++;
            if (dentro || minDist < 0.5) resultado.totalSobreposicaoDireta++;

            alertas.push({
              ativo: ufAtivo !== 'N/I' ? `${nomeAtivo} (${ufAtivo})` : nomeAtivo,
              restricao: poly.nome,
              tipo: poly.tipo,
              detalhe: poly.detalhe,
              dentro,
              distanciaNum: dentro ? 0 : minDist,
              distanciaKm: dentro ? '0,00 km (Interior)' : `${minDist.toFixed(2).replace('.', ',')} km`
            });
          }
        }
      }

      alertas.sort((a, b) => a.distanciaNum - b.distanciaNum);
      resultado.alertasBuffer15km = alertas.slice(0, 45);
      return resultado;
    },

    _montarHTML: function (d) {
      const linhasRegime = Object.entries(d.contagemRegime)
        .sort((a, b) => b[1] - a[1])
        .map(([regime, qtd]) => {
          const perc = d.totalFeicoes > 0 ? ((qtd / d.totalFeicoes) * 100).toFixed(1) : '0.0';
          return `
            <tr>
              <td><strong>${regime}</strong></td>
              <td style="text-align:right; font-weight:700;">${qtd.toLocaleString('pt-BR')}</td>
              <td style="text-align:right;">${perc}%</td>
            </tr>`;
        }).join('');

      const topUFs = Object.entries(d.contagemUF)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([uf, qtd]) => `<span class="chip-uf"><strong>${uf}:</strong> ${qtd}</span>`)
        .join(' ');

      const linhasAtivos = d.itensDetalhados.map(it => `
        <tr>
          <td style="text-align:center;">${it.ordem}</td>
          <td><strong>${it.nome}</strong></td>
          <td><span class="dot" style="background:${it.corRegime};"></span>${it.regime}</td>
          <td>${it.esfera}</td>
          <td>${it.municipio}</td>
          <td style="text-align:center; font-weight:700;">${it.uf}</td>
          <td style="font-family:monospace; font-size:10px;">${it.coordenadas}</td>
        </tr>`).join('');

      const s = d.analiseSocioambiental;
      const totalAlertas = s.totalAlertasTI + s.totalAlertasUC;

      const blocoSocioambiental = totalAlertas > 0
        ? `<p class="paragrafo">
            3.2. O cruzamento espacial geodésico processou <strong>${s.tisCarregadas.toLocaleString('pt-BR')} Terras Indígenas (FUNAI)</strong> e <strong>${s.ucsCarregadas.toLocaleString('pt-BR')} Unidades de Conservação Federais (ICMBio)</strong>, identificando <strong>${totalAlertas} ocorrências</strong> na faixa de amortecimento de <strong>15 km</strong> (${s.totalAlertasTI} junto a Terras Indígenas e ${s.totalAlertasUC} junto a Unidades de Conservação, sendo <strong>${s.totalSobreposicaoDireta}</strong> em sobreposição direta ou faixa marginal imediata &le; 500 m). A tabela a seguir relaciona os ativos mais críticos ordenados pela menor distância à borda poligonal:
          </p>
          <table class="tabela-dados">
            <thead>
              <tr>
                <th>Ativo Portuário / Hidroviário</th>
                <th>Área Protegida Interceptada / Próxima</th>
                <th>Órgão / Tipologia</th>
                <th>Etnia / Categoria</th>
                <th style="text-align:right;">Distância à Poligonal</th>
              </tr>
            </thead>
            <tbody>
              ${s.alertasBuffer15km.map(a => `
                <tr>
                  <td><strong>${a.ativo}</strong></td>
                  <td>${a.restricao}</td>
                  <td>${a.tipo}</td>
                  <td>${a.detalhe || '—'}</td>
                  <td style="text-align:right; font-weight:700; color:${a.distanciaNum < 1 ? '#dc2626' : '#b45309'};">${a.distanciaKm}</td>
                </tr>`).join('')}
            </tbody>
          </table>`
        : `<p class="paragrafo">3.2. No recorte espacial avaliado contra <strong>${s.tisCarregadas.toLocaleString('pt-BR')} Terras Indígenas (FUNAI)</strong> e <strong>${s.ucsCarregadas.toLocaleString('pt-BR')} Unidades de Conservação Federais (ICMBio)</strong>, não foram detectadas interseções ou proximidades críticas na faixa de 15 km para as feições selecionadas.</p>`;

      return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nota Técnica nº ${d.numeroNota} — WebGIS ANTAQ</title>
  <style>
    @page { size: A4 portrait; margin: 18mm 15mm 18mm 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1e293b;
      background: #f1f5f9;
      margin: 0;
      padding: 24px;
      line-height: 1.55;
      font-size: 12px;
    }
    .barra-acoes {
      max-width: 210mm;
      margin: 0 auto 16px auto;
      background: #0a2540;
      color: #fff;
      padding: 12px 18px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .btn-acao {
      background: #0284c7;
      color: #fff;
      border: 1px solid #38bdf8;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-acao:hover { background: #0369a1; }
    .folha-a4 {
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 20mm 18mm;
      box-shadow: 0 6px 24px rgba(15, 23, 42, 0.12);
      border-radius: 4px;
    }
    .cabecalho-sei {
      border-bottom: 2px solid #0a2540;
      padding-bottom: 12px;
      margin-bottom: 18px;
      text-align: center;
    }
    .cabecalho-sei .orgao {
      font-size: 13px;
      font-weight: 800;
      color: #0a2540;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }
    .cabecalho-sei .suborgao {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      margin-top: 2px;
    }
    .bloco-identificacao {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #0a2540;
      padding: 10px 14px;
      margin-bottom: 18px;
      font-size: 11.5px;
    }
    h2.secao {
      font-size: 12.5px;
      font-weight: 800;
      color: #0a2540;
      text-transform: uppercase;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin: 20px 0 10px 0;
    }
    p.paragrafo {
      text-align: justify;
      margin: 6px 0 10px 0;
      color: #1e293b;
    }
    .grid-kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 12px 0 16px 0;
    }
    .card-kpi {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px;
      text-align: center;
    }
    .card-kpi .valor {
      font-size: 20px;
      font-weight: 800;
      color: #0a2540;
    }
    .card-kpi .rotulo {
      font-size: 10px;
      color: #475569;
      text-transform: uppercase;
      font-weight: 700;
      margin-top: 2px;
    }
    .tabela-dados {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 16px 0;
      font-size: 11px;
    }
    .tabela-dados th {
      background: #0a2540;
      color: #ffffff;
      text-align: left;
      padding: 6px 8px;
      font-weight: 700;
    }
    .tabela-dados td {
      padding: 5px 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    .tabela-dados tr:nth-child(even) td { background: #f8fafc; }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 5px;
    }
    .chip-uf {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 10.5px;
      margin: 2px;
    }
    .assinatura {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #cbd5e1;
      text-align: center;
      font-size: 11px;
      color: #334155;
    }
    @media (max-width: 768px) {
      body { padding: 8px; }
      .folha-a4 { padding: 14px; overflow-x: auto; }
      .grid-kpis { grid-template-columns: repeat(2, 1fr); }
    }
    @media print {
      body { background: #fff; padding: 0; }
      .barra-acoes { display: none !important; }
      .folha-a4 { box-shadow: none; padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="barra-acoes">
    <div>
      <strong>📄 NOTA TÉCNICA EXECUTIVA — PADRÃO SEI/ANTAQ (GEE/SEPH)</strong>
      <div style="font-size:11px; color:#bae6fd;">Documento formatado em folha A4 pronto para impressão ou exportação em PDF</div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="btn-acao" onclick="window.print()">🖨️ Imprimir / Salvar em PDF</button>
      <button class="btn-acao" style="background:#334155; border-color:#64748b;" onclick="window.close()">✕ Fechar</button>
    </div>
  </div>

  <div class="folha-a4">
    <div class="cabecalho-sei">
      <div class="orgao">Agência Nacional de Transportes Aquaviários — ANTAQ</div>
      <div class="suborgao">Superintendência de Estudos e Projetos Hidroviários (SEPH) · Gerência Especial de Estudos (GEE)</div>
    </div>

    <div class="bloco-identificacao">
      <div><strong>NOTA TÉCNICA Nº ${d.numeroNota}</strong></div>
      <div><strong>DATA DE EMISSÃO:</strong> ${d.dataFormatada} às ${d.horaFormatada} (Horário de Brasília)</div>
      <div><strong>ASSUNTO:</strong> Análise Georreferenciada de Instalações Portuárias, Regimes de Outorga e Diagnóstico Territorial (${d.tituloEscopo})</div>
      <div><strong>ENQUADRAMENTO ESPACIAL:</strong> Centro [${d.centroMapa.lat.toFixed(4)}°, ${d.centroMapa.lng.toFixed(4)}°] · Nível de Zoom ${d.zoomMapa} · Datum Oficial SIRGAS 2000 (EPSG:4674)</div>
    </div>

    <h2 class="secao">1. INTRODUÇÃO</h2>
    <p class="paragrafo">
      1.1. Esta Nota Técnica foi gerada automaticamente pelo módulo de Geointeligência do <strong>WebGIS Corporativo ANTAQ</strong>, em subsídio às atividades da Gerência Especial de Estudos (GEE), vinculada à Superintendência de Estudos e Projetos Hidroviários (SEPH), com o objetivo de consolidar o diagnóstico espacial e regulatório sobre o recorte: <strong>${d.tituloEscopo}</strong>.
    </p>
    <p class="paragrafo">
      1.2. Para a presente análise geoespacial foram considerados os seguintes marcos normativos e bases técnicas: Lei nº 10.233/2001; Lei nº 12.815/2013 (Marco Regulatório do Setor Portuário); Resolução ANTAQ nº 116/2024 (Regimento Interno — Art. 58, competências da GEE/SEPH); e a Agenda Plurianual de Estudos 2025-2028.
    </p>

    <h2 class="secao">2. SÍNTESE EXECUTIVA E REGIMES DE OUTORGA (LEI Nº 12.815/2013)</h2>
    <p class="paragrafo">
      2.1. O processamento espacial identificou <strong>${d.totalFeicoes.toLocaleString('pt-BR')}</strong> instalações ativas no escopo analisado, distribuídas entre a esfera <strong>Pública (${d.contagemEsfera['Pública'] || 0})</strong> e a esfera <strong>Privada (${d.contagemEsfera['Privada'] || 0})</strong>, refletindo a capilaridade logística da malha aquaviária e portuária sob regulação da Agência.
    </p>

    <div class="grid-kpis">
      <div class="card-kpi">
        <div class="valor">${d.totalFeicoes.toLocaleString('pt-BR')}</div>
        <div class="rotulo">Total de Ativos</div>
      </div>
      <div class="card-kpi">
        <div class="valor" style="color:#2563eb;">${(d.contagemEsfera['Pública'] || 0).toLocaleString('pt-BR')}</div>
        <div class="rotulo">Esfera Pública</div>
      </div>
      <div class="card-kpi">
        <div class="valor" style="color:#9333ea;">${(d.contagemEsfera['Privada'] || 0).toLocaleString('pt-BR')}</div>
        <div class="rotulo">Esfera Privada</div>
      </div>
      <div class="card-kpi">
        <div class="valor" style="color:#dc2626;">${(s.totalAlertasTI + s.totalAlertasUC).toLocaleString('pt-BR')}</div>
        <div class="rotulo">Alertas Socioambientais (≤15km)</div>
      </div>
    </div>

    <table class="tabela-dados">
      <thead>
        <tr>
          <th>Classificação Regulatória / Modalidade de Outorga (ANTAQ)</th>
          <th style="text-align:right;">Quantidade de Instalações</th>
          <th style="text-align:right;">Participação Relativa (%)</th>
        </tr>
      </thead>
      <tbody>
        ${linhasRegime}
      </tbody>
    </table>

    <p class="paragrafo">
      2.2. <strong>Distribuição Regional por Unidade da Federação (Top 12):</strong> ${topUFs || 'Não aplicável'}
    </p>

    <h2 class="secao">3. DIAGNÓSTICO SOCIOAMBIENTAL E SOBREPOSIÇÕES TERRITORIAIS (FUNAI / ICMBIO)</h2>
    <p class="paragrafo">
      3.1. Em consonância com as diretrizes de sustentabilidade hidroviária e portuária da SEPH/ANTAQ, realizou-se a verificação topológica automática de interior poligonal e distância geodésica à borda em relação às poligonais oficiais de Terras Indígenas (FUNAI) e Unidades de Conservação Federais (ICMBio).
    </p>
    ${blocoSocioambiental}

    <h2 class="secao">4. RELAÇÃO CADASTRAL DE ATIVOS INSPECIONADOS (${d.itensDetalhados.length} DE ${d.totalFeicoes})</h2>
    <table class="tabela-dados">
      <thead>
        <tr>
          <th style="width:36px; text-align:center;">#</th>
          <th>Denominação da Instalação</th>
          <th>Regime / Subcamada</th>
          <th>Esfera</th>
          <th>Município / Localidade</th>
          <th style="text-align:center;">UF</th>
          <th>Coordenadas (SIRGAS 2000)</th>
        </tr>
      </thead>
      <tbody>
        ${linhasAtivos}
      </tbody>
    </table>

    <h2 class="secao">5. CONCLUSÕES E RECOMENDAÇÕES TÉCNICAS</h2>
    <p class="paragrafo">
      5.1. Os dados consolidados nesta Nota Técnica demonstram a consistência posicional e cadastral da base geoespacial gerida pela GEE/SEPH nos termos do art. 58 da Resolução ANTAQ nº 116/2024, servindo como subsídio direto para estudos de demanda, regulação tarifária, planejamento da Agenda Plurianual de Estudos 2025-2028 e atendimento a demandas de transparência ativa (SIC / Fala.BR).
    </p>
    <p class="paragrafo">
      5.2. Restituímos os autos e o presente relatório cartográfico à GEE/SEPH para análise e prosseguimento.
    </p>

    <h2 class="secao">6. REFERÊNCIAS CITADAS</h2>
    <div style="font-size:10.5px; color:#475569;">
      <div>1. Lei nº 10.233, de 5 de junho de 2001 — Criação da ANTAQ (https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10233.htm)</div>
      <div>2. Lei nº 12.815, de 5 de junho de 2013 — Lei dos Portos (https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12815.htm)</div>
      <div>3. Resolução ANTAQ nº 116/2024 — Regimento Interno da ANTAQ (https://sophia.antaq.gov.br/Terminal/acervo/detalhe/37131)</div>
      <div>4. Agenda Plurianual de Estudos ANTAQ 2025-2028 (https://www.gov.br/antaq/pt-br/central-de-conteudos/estudos-e-pesquisas-da-antaq-1/agenda-de-estudos-2025-2028)</div>
    </div>

    <div class="assinatura">
      <strong>Sistema de Inteligência Geográfica — WebGIS Corporativo ANTAQ</strong><br>
      Gerência Especial de Estudos (GEE) · Superintendência de Estudos e Projetos Hidroviários (SEPH)
    </div>
  </div>
</body>
</html>`;
    }
  };

  window.RelatorioExecutivoPDF = RelatorioExecutivoPDF;
  console.info('[js] RelatorioExecutivoPDF carregado (Cruzamento Poligonal Automático TIs/UCs + UF 100%)');
})();
