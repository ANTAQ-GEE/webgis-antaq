/* ============================================================
   WebGIS ANTAQ — Módulo: TabelaManager
   Escopo: tabela de atributos com paginação e filtros
   Dependências: window.CONFIG_CAMADAS, window.DADOS_GEOJSON_BRUTOS,
                 window.PortClassification, window.Security,
                 window.UI, window.SearchEngine, window.FilterManager
   Expõe: window.TabelaManager
   ============================================================ */
(function () {
  'use strict';

  const TabelaManager = {
    camadaAtualId: null,
    features: [],
    filtradas: [],
    colunas: [],
    pagina: 1,
    porPagina: 50,
    filtroPorto: 'TODOS',
    termoBusca: '',

    abrirFiltrado: function (id, featuresFiltradas) {
      const g = DADOS_GEOJSON_BRUTOS[id];
      if (!g || !g.features || !g.features.length) {
        if (window.UI) window.UI.toast("Nenhum dado carregado para esta camada.");
        return;
      }

      this.camadaAtualId = id;
      this.features = featuresFiltradas;
      this.filtradas = featuresFiltradas.slice();
      this.pagina = 1;
      this.termoBusca = '';

      const inp = document.getElementById('filtro-busca-tabela');
      if (inp) inp.value = '';
      const selPorto = document.getElementById('filtro-porto-tabela');
      if (selPorto) selPorto.style.display = 'none';
      this.filtroPorto = 'TODOS';

      const amostra = featuresFiltradas[0].properties || {};
      this.colunas = Object.keys(amostra)
        .filter(c => !['geom', 'geometry', 'id', '_gpkgtable'].includes(c.toLowerCase()))
        .slice(0, 15);

      document.getElementById('painel-tabela').classList.add('aberto');

      const titEl = document.getElementById('titulo-tabela-camada');
      if (titEl) titEl.textContent = `Tabela Filtrada: ${CONFIG_CAMADAS[id]?.nome || id} (seleção)`;

      this.renderizar();
    },

    abrir: function (id) {
      const g = DADOS_GEOJSON_BRUTOS[id];
      if (!g || !g.features || !g.features.length) {
        if (window.UI) window.UI.toast("Nenhum dado carregado para esta camada.");
        return;
      }

      this.camadaAtualId = id;
      this.features = g.features;
      this.pagina = 1;
      this.termoBusca = '';

      const inp = document.getElementById('filtro-busca-tabela');
      if (inp) inp.value = '';

      const selPorto = document.getElementById('filtro-porto-tabela');
      if (id === 'instalacoes_portuarias') {
        if (selPorto) {
          selPorto.style.display = 'inline-block';
          const CATEGORIAS_VALIDAS = ['TODOS', 'ORGANIZADO', 'PUBLICO', 'TUP', 'IP4', 'ETC', 'OUTROS'];
          let valAtual = window.FILTRO_PORTO_ATUAL;
          if (!CATEGORIAS_VALIDAS.includes(valAtual)) {
            valAtual = 'TODOS';
            window.FILTRO_PORTO_ATUAL = 'TODOS';
          }
          selPorto.value = valAtual;
          this.filtroPorto = valAtual;
        }
      } else {
        if (selPorto) selPorto.style.display = 'none';
        this.filtroPorto = 'TODOS';
      }

      const amostra = g.features[0].properties || {};
      this.colunas = Object.keys(amostra)
        .filter(c => !['geom', 'geometry', 'id', '_gpkgtable'].includes(c.toLowerCase()))
        .slice(0, 15);

      this.aplicarFiltrosInternos();
      document.getElementById('painel-tabela').classList.add('aberto');
      this.renderizar();
    },

    aoMudarFiltroPorto: function (tipo) {
      this.filtroPorto = tipo;
      this.pagina = 1;
      const selSub = document.getElementById('filtro-subtipo-dinamico');
      if (selSub && selSub.value !== tipo) {
        selSub.value = tipo;
        if (window.FilterManager) window.FilterManager.aoMudarSubfiltro(tipo);
      }
      this.aplicarFiltrosInternos();
      this.renderizar();
    },

    filtrar: function (termo) {
      this.termoBusca = (termo || '').toLowerCase().trim();
      this.pagina = 1;
      this.aplicarFiltrosInternos();
      this.renderizar();
    },

    aplicarFiltrosInternos: function () {
      let base = this.features;

      if (this.camadaAtualId === 'instalacoes_portuarias' && this.filtroPorto && this.filtroPorto !== 'TODOS') {
        base = base.filter(f => window.PortClassification.classificar(f.properties || {}).id === this.filtroPorto);
      }

      if (this.termoBusca) {
        base = base.filter(f => {
          const p = f.properties || {};
          for (const c of this.colunas) {
            if (String(p[c] || '').toLowerCase().includes(this.termoBusca)) return true;
          }
          return false;
        });
      }

      this.filtradas = base;
    },

    anterior: function () {
      if (this.pagina > 1) { this.pagina--; this.renderizar(); }
    },

    proximo: function () {
      const totalPag = Math.max(1, Math.ceil(this.filtradas.length / this.porPagina));
      if (this.pagina < totalPag) { this.pagina++; this.renderizar(); }
    },

    renderizar: function () {
      const nomeCamada = CONFIG_CAMADAS[this.camadaAtualId]?.nome || this.camadaAtualId;
      const total = this.filtradas.length;
      const totalGeral = this.features.length;
      const totalPag = Math.max(1, Math.ceil(total / this.porPagina));
      if (this.pagina > totalPag) this.pagina = totalPag;

      const inicio = (this.pagina - 1) * this.porPagina;
      const fim = Math.min(inicio + this.porPagina, total);
      const dadosPagina = this.filtradas.slice(inicio, fim);

      const titEl = document.getElementById('titulo-tabela-camada');
      if (titEl) {
        let extra = '';
        if (this.camadaAtualId === 'instalacoes_portuarias' && this.filtroPorto !== 'TODOS') {
          extra = ` [${window.PortClassification.tipos[this.filtroPorto]?.nome || this.filtroPorto}]`;
        }
        titEl.innerText = total !== totalGeral
          ? `Tabela: ${nomeCamada}${extra} (${total} de ${totalGeral} itens)`
          : `Tabela: ${nomeCamada}${extra} (${totalGeral} itens)`;
      }

      const infoEl = document.getElementById('info-paginacao-tabela');
      if (infoEl) {
        infoEl.innerText = total > 0
          ? `${inicio + 1}–${fim} de ${total} (Pág ${this.pagina}/${totalPag})`
          : `0 de 0`;
      }

      const thead = document.getElementById('thead-atributos');
      let th = '<tr><th style="width:50px; text-align:center;">Zoom</th>';
      this.colunas.forEach(c => th += `<th>${window.Security.escapeHTML(c)}</th>`);
      thead.innerHTML = th + '</tr>';

      const tbody = document.getElementById('tbody-atributos');
      if (!dadosPagina.length) {
        tbody.innerHTML = `<tr><td colspan="${this.colunas.length + 1}" style="text-align:center; padding:18px; color:#64748b;">Nenhum registro.</td></tr>`;
        return;
      }

      let linhasHTML = '';
      dadosPagina.forEach((f, idx) => {
        const globalIdx = inicio + idx;
        linhasHTML += `<tr><td style="text-align:center;"><button style="background:#0284c7; color:#fff; border:none; padding:2px 6px; border-radius:3px; cursor:pointer;" onclick="TabelaManager.aproximar(${globalIdx})">📍</button></td>`;
        this.colunas.forEach(c => {
          linhasHTML += `<td>${window.Security.escapeHTML(f.properties ? f.properties[c] : '')}</td>`;
        });
        linhasHTML += '</tr>';
      });
      tbody.innerHTML = linhasHTML;
    },

    aproximar: function (idx) {
      const f = this.filtradas[idx];
      if (f && window.SearchEngine) window.SearchEngine.aproximar(f);
    }
  };

  window.TabelaManager = TabelaManager;
  console.info('[js] TabelaManager carregado');
})();