/* ============================================================
   WebGIS ANTAQ — Módulo: ImportManager
   Escopo: importação multiformato (GeoJSON, SHP, KML, KMZ, GPKG)
   Dependências: window.Security, window.UI, window.LayerRegistry,
                 window.GeomTypeDetector, window.Styler,
                 window.CONFIG_CAMADAS, window.CAMADAS_MAPA,
                 window.DADOS_GEOJSON_BRUTOS, window.mapa,
                 window.NotificationManager, window.FilterManager,
                 window.GeoJSONValidator
   Referências "lazy": window.ImportManager (auto-referência),
                       window.CopilotoIA, window.SelectionManager
   Expõe: window.ImportManager
   ============================================================ */
(function () {
  'use strict';

  const ImportManager = {
    contador: 0,

    abrirSeletor: function () {
      const inp = document.getElementById('input-import');
      if (inp) inp.click();
    },

    processar: async function (files) {
      if (!files || !files.length) return;

      const fnShp = window.shp || (typeof shp !== 'undefined' ? shp : null);
      const listaArquivos = Array.from(files);
      const gruposShp = {};
      const outrosArquivos = [];

      listaArquivos.forEach(f => {
        const nomeSemExt = f.name.replace(/\.[^.]+$/, '');
        const ext = f.name.toLowerCase().split('.').pop();
        if (['shp', 'dbf', 'shx', 'prj', 'cpg'].includes(ext)) {
          if (!gruposShp[nomeSemExt]) gruposShp[nomeSemExt] = {};
          gruposShp[nomeSemExt][ext] = f;
        } else {
          outrosArquivos.push(f);
        }
      });

      // Shapefiles soltos (.shp + .dbf + .shx + .prj)
      for (const [nomeBase, partes] of Object.entries(gruposShp)) {
        try {
          if (!partes.shp) throw new Error(`Falta .shp para "${nomeBase}"`);
          if (!fnShp) throw new Error("Biblioteca shpjs indisponível.");
          if (window.UI) window.UI.toast(`Decodificando Shapefile: ${nomeBase}...`);

          const shpBuf = await partes.shp.arrayBuffer();
          const dbfBuf = partes.dbf ? await partes.dbf.arrayBuffer() : null;
          const prjTxt = partes.prj ? await partes.prj.text() : null;

          let geojson;
          if (dbfBuf) {
            geojson = await fnShp({ shp: shpBuf, dbf: dbfBuf, prj: prjTxt });
          } else {
            geojson = await fnShp({ shp: shpBuf, prj: prjTxt });
          }

          if (Array.isArray(geojson)) {
            geojson.forEach((g, i) => this._adicionar(`${nomeBase}_${i + 1}`, g));
          } else {
            this._adicionar(nomeBase, geojson);
          }
        } catch (e) {
          console.error(e);
          if (window.UI) window.UI.toast(`⚠️ Falha ao importar "${nomeBase}": ` + e.message);
        }
      }

      // Arquivos únicos
      for (const f of outrosArquivos) {
        try {
          await this.importar(f);
        } catch (e) {
          console.error(e);
          if (window.UI) window.UI.toast('⚠️ Erro na importação: ' + e.message);
        }
      }

      const inp = document.getElementById('input-import');
      if (inp) inp.value = '';
    },

    importar: async function (file) {
      const nome = file.name;
      const ext = nome.toLowerCase().split('.').pop();
      if (window.UI) window.UI.toast(`Processando ${nome}...`);

      let geojson = null;
      const fnShp = window.shp || (typeof shp !== 'undefined' ? shp : null);

      if (ext === 'geojson' || ext === 'json') {
        geojson = JSON.parse(await file.text());
      } else if (ext === 'zip') {
        if (!fnShp) throw new Error('Biblioteca shpjs indisponível.');
        let zipBuffer;
        try { zipBuffer = await file.arrayBuffer(); }
        catch (e) { throw new Error('Não foi possível ler o ZIP.'); }
        if (!zipBuffer || zipBuffer.byteLength === 0) throw new Error('O arquivo ZIP está vazio (0 bytes).');
        const view = new Uint8Array(zipBuffer);
        if (view.length < 4 || view[0] !== 0x50 || view[1] !== 0x4B) {
          throw new Error('O arquivo não é um ZIP válido (assinatura "PK" ausente).');
        }
        geojson = await fnShp(zipBuffer);
      } else if (ext === 'kml') {
        geojson = this._kmlDeTexto(await file.text());
      } else if (ext === 'kmz') {
        geojson = await this._lerKMZ(file);
      } else if (ext === 'gpkg' || ext === 'geopackage') {
        geojson = await this._lerGPKG(file);
      } else {
        throw new Error('Formato não suportado: .' + ext);
      }

      if (Array.isArray(geojson)) {
        for (let i = 0; i < geojson.length; i++) {
          this._adicionar(`${nome.replace(/\.[^.]+$/, '')}_${i + 1}`, geojson[i]);
        }
        return;
      }
      this._adicionar(nome.replace(/\.[^.]+$/, ''), geojson);
    },

    _kmlDeTexto: function (texto) {
      if (typeof toGeoJSON === 'undefined') throw new Error('toGeoJSON indisponível.');
      const dom = new DOMParser().parseFromString(texto, 'text/xml');
      return toGeoJSON.kml(dom);
    },

    _lerKMZ: async function (file) {
      if (typeof JSZip === 'undefined') throw new Error('JSZip indisponível.');
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const alvo = Object.keys(zip.files).find(n => n.toLowerCase().endsWith('.kml'));
      if (!alvo) throw new Error('Nenhum .kml no .kmz');
      return this._kmlDeTexto(await zip.files[alvo].async('string'));
    },

    _lerGPKG: async function (file) {
      const gp = window.GeoPackage || (typeof GeoPackage !== 'undefined' ? GeoPackage : null);
      if (!gp || !gp.GeoPackageAPI) throw new Error('GeoPackage indisponível.');
      try {
        if (typeof gp.setSqljsWasmLocateFile === 'function') {
          gp.setSqljsWasmLocateFile(f => `https://cdn.jsdelivr.net/npm/@ngageoint/geopackage@4.2.3/dist/${f}`);
        }
        const buf = await file.arrayBuffer();
        const gpkg = await gp.GeoPackageAPI.open(new Uint8Array(buf));
        const tabelas = gpkg.getFeatureTables();
        const features = [];
        for (const t of tabelas) {
          const fs = gpkg.queryForGeoJSONFeaturesInTable(t);
          if (fs && fs.length) fs.forEach(f => { f._gpkgTable = t; features.push(f); });
        }
        return { type: 'FeatureCollection', features: features };
      } catch (err) {
        throw new Error('Falha no GeoPackage: ' + (err.message || err));
      }
    },

    _adicionar: function (nome, geojson) {
      let relatorio = null;
      let geojsonValidado = null;

      try {
        const resultado = window.GeoJSONValidator.validar(geojson, nome);
        relatorio = resultado.relatorio;
        geojsonValidado = resultado.geojson;
      } catch (e) {
        console.error('[R2] Falha na validação:', e);
        if (window.UI) window.UI.toast('⚠️ Erro inesperado ao validar. Importação cancelada.');
        return;
      }

      if (!relatorio || !geojsonValidado || relatorio.validas === 0) {
        window.GeoJSONValidator.mostrarRelatorio(relatorio);
        return;
      }

      if (relatorio.invalidas === 0 && relatorio.corrigidas === 0) {
        this._adicionarValidado(nome, geojsonValidado, relatorio);
        return;
      }

      const self = this;
      window.GeoJSONValidator.mostrarRelatorio(relatorio, {
        onProsseguir: function () {
          self._adicionarValidado(nome, geojsonValidado, relatorio);
        }
      });
    },

    _adicionarValidado: function (nome, geojson, relatorio) {
      if (!geojson || !geojson.features || !geojson.features.length) {
        if (window.UI) window.UI.toast('⚠️ Nenhuma feição encontrada em ' + nome);
        return;
      }

      this.contador++;
      const id = `imp_${this.contador}_${window.LayerRegistry.gerarId(nome)}`;

      geojson.features.forEach(f => {
        if (f.properties) {
          for (const [k, v] of Object.entries(f.properties)) {
            if (typeof v === 'string') f.properties[k] = window.Security.repararTexto(v);
          }
        }
      });

      const tipoGeo = window.GeomTypeDetector.detectar(geojson);
      const cor = window.LayerRegistry.corAleatoria();
      const cfg = {
        nome: nome, grupo: 'importadas', arquivos: [], cor: cor,
        opacidade: tipoGeo === 'poligono' ? 0.4 : (tipoGeo === 'linha' ? 0.9 : 0.95),
        peso: tipoGeo === 'ponto' ? 5 : (tipoGeo === 'linha' ? 2.5 : 1.5),
        tipoGeo: tipoGeo, ativa: true, camposVisiveis: []
      };

      CONFIG_CAMADAS[id] = cfg;
      DADOS_GEOJSON_BRUTOS[id] = geojson;
      CAMADAS_MAPA[id] = L.geoJSON(geojson, window.Styler.obterOpcoes(id));
      CAMADAS_MAPA[id].addTo(mapa);

      const grupoEl = document.getElementById('grupo-importadas');
      const msgVazio = document.getElementById('msg-sem-importadas');
      if (msgVazio) msgVazio.style.display = 'none';

      if (grupoEl) {
        grupoEl.classList.remove('fechado');
        if (typeof window.construirItemCamada === 'function') {
          window.construirItemCamada(id, cfg, grupoEl);
        } else if (typeof construirItemCamada === 'function') {
          construirItemCamada(id, cfg, grupoEl);
        }

        const cntBadge = document.getElementById(`cnt-${id}`);
        if (cntBadge) cntBadge.innerText = `(${geojson.features.length})`;

        setTimeout(() => {
          const item = document.getElementById(`item-camada-${id}`);
          if (item) {
            item.style.display = 'flex';
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 50);
      }

      if (window.Styler) window.Styler.atualizarLegenda();
      if (window.FilterManager) window.FilterManager.atualizarSeletorCamadas();

      if (relatorio && (relatorio.invalidas > 0 || relatorio.corrigidas > 0)) {
        window.NotificationManager.show({
          tipo: 'alerta',
          titulo: 'Importação com avisos',
          mensagem: `"${window.Security.escapeHTML(nome)}": <strong>${geojson.features.length}</strong> feições importadas` +
                    (relatorio.invalidas > 0 ? ` · ${relatorio.invalidas} descartada(s)` : '') +
                    (relatorio.corrigidas > 0 ? ` · ${relatorio.corrigidas} corrigida(s)` : ''),
          duracao: 8000,
          acoes: [{ texto: '📋 Ver relatório', fn: () => window.GeoJSONValidator.mostrarRelatorio(relatorio) }]
        });
      } else {
        if (window.UI) window.UI.toast(`✓ ${geojson.features.length} feições (${tipoGeo}) importadas de "${nome}"`);
      }

      try {
        const b = CAMADAS_MAPA[id].getBounds();
        if (b.isValid()) mapa.fitBounds(b, { padding: [40, 40], maxZoom: 14 });
      } catch (e) {}
    }
  };

  window.ImportManager = ImportManager;

  // Drag & drop global
  (function () {
    const dz = document.getElementById('dropzone');
    let dragDepth = 0;
    window.addEventListener('dragenter', e => {
      if (!e.dataTransfer) return;
      dragDepth++; if (dz) dz.classList.add('ativo');
    });
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('dragleave', e => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0 && dz) dz.classList.remove('ativo');
    });
    window.addEventListener('drop', e => {
      e.preventDefault();
      dragDepth = 0;
      if (dz) dz.classList.remove('ativo');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        ImportManager.processar(e.dataTransfer.files);
      }
    });
  })();

  console.info('[js] ImportManager carregado');
})();