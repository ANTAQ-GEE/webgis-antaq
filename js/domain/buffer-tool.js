/* ============================================================
   WebGIS ANTAQ — Módulo: BufferTool (M9)
   Escopo: criação de buffers geodésicos em camadas vetoriais
   Dependências: window.DADOS_GEOJSON_BRUTOS, window.CONFIG_CAMADAS,
                 window.CAMADAS_MAPA, window.Styler, window.UI,
                 window.Security, window.LayerRegistry, window.FilterManager,
                 window.mapa, turf (global)
   Expõe: window.BufferTool
   ============================================================ */
(function () {
  'use strict';

  const BufferTool = {
    _contador: 0,
    _filtrosAcumulados: [],       // [{ campo, valor }]
    _modoSel: 'filtro',           // 'filtro' | 'individuais' | 'mapa'
    _feicoesSelecionadas: new Set(),
    _buscaFeicao: '',
    /**
     * Adiciona o valor selecionado no dropdown atual à lista de filtros acumulados.
     * Evita duplicatas.
     */
    adicionarFiltroAtual: function () {
      const selFiltro = document.getElementById('buffer-filtro');
      if (!selFiltro) return;

      const valor = selFiltro.value;
      if (!valor || valor === 'TODOS') {
        if (window.UI) window.UI.toast('⚠️ Selecione um valor no dropdown antes de adicionar.');
        return;
      }

      const [campo, valorCampo] = valor.split('::');
      if (!campo || !valorCampo) return;

      // Evita duplicata
      const jaExiste = this._filtrosAcumulados.some(f =>
        f.campo === campo && f.valor === valorCampo
      );
      if (jaExiste) {
        if (window.UI) window.UI.toast('⚠️ Este filtro já está aplicado.');
        return;
      }

      // Mesmo campo: substitui valor anterior (evita AND contraditório)
      const mesmoCampo = this._filtrosAcumulados.findIndex(f => f.campo === campo);
      if (mesmoCampo >= 0) {
        this._filtrosAcumulados[mesmoCampo] = { campo, valor: valorCampo };
      } else {
        this._filtrosAcumulados.push({ campo, valor: valorCampo });
      }

      // Reseta o dropdown pra "TODOS" (força o usuário a escolher o próximo)
      selFiltro.value = 'TODOS';

      this._renderizarChips();
      this._atualizarPreview();
    },

    /**
     * Remove um filtro da lista pelo índice.
     */
    removerFiltro: function (idx) {
      if (idx >= 0 && idx < this._filtrosAcumulados.length) {
        this._filtrosAcumulados.splice(idx, 1);
        this._renderizarChips();
        this._atualizarPreview();
      }
    },

    /**
     * Limpa todos os filtros acumulados.
     */
    limparFiltrosAcumulados: function () {
      this._filtrosAcumulados = [];
      this._renderizarChips();
      this._atualizarPreview();
    },

    /**
     * Renderiza os chips no DOM.
     */
    _renderizarChips: function () {
      const container = document.getElementById('buffer-filtros-ativos');
      if (!container) return;

      if (this._filtrosAcumulados.length === 0) {
        container.innerHTML = '<em style="color:#64748b;font-size:10.5px;">Nenhum filtro acumulado</em>';
        return;
      }

      container.innerHTML = this._filtrosAcumulados.map((f, i) =>
        `<span class="buffer-chip">
           ${window.Security.escapeHTML(f.campo)} = "${window.Security.escapeHTML(f.valor)}"
           <button class="buffer-chip-remover" onclick="BufferTool.removerFiltro(${i})" title="Remover filtro">×</button>
         </span>`
      ).join('') +
      `<button class="btn-acao-chip btn-excluir" style="font-size:9.5px;padding:2px 6px;" onclick="BufferTool.limparFiltrosAcumulados()" title="Limpar todos">
         🗑️ Limpar
       </button>`;
    },
    /* ============================================================
       M9.4 — SELEÇÃO DE FEIÇÕES INDIVIDUAIS
       ============================================================ */

    mudarModoSel: function (modo) {
      this._modoSel = modo;

      const elFiltro = document.getElementById('buffer-modo-filtro');
      const elInd = document.getElementById('buffer-modo-individuais');
      const elMapa = document.getElementById('buffer-modo-mapa');

      if (elFiltro) elFiltro.style.display = (modo === 'filtro') ? '' : 'none';
      if (elInd) elInd.style.display = (modo === 'individuais') ? '' : 'none';
      if (elMapa) elMapa.style.display = (modo === 'mapa') ? '' : 'none';

      if (modo === 'individuais') this._renderizarListaFeicoes();
      if (modo === 'mapa') {
        // ✅ Sempre atualiza a contagem da seleção atual ao entrar no modo mapa
        this._atualizarStatusMapa();
      }

      this._atualizarPreview();
    },

    _chaveFeicao: function (f) {
      const p = f.properties || {};
      let id = p.idhidrovia || p.idseq || p.id || p.ID ||
               p.gid || p.GID || p.objectid || p.codigo || p.CODIGO ||
               p.id_trecho_ || p.objectid_1 ||
               p.idm_origem || p.terrai_cod || p.cd_uc || p.codigo_uc;

      if (!id) {
        const nome = p.nome || p.NOME || p.NOME_INSTALACAO ||
                     p.nome_rio || p.NOME_RIO || p.terrai_nom || '';
        const geoHash = JSON.stringify(f.geometry || '').substring(0, 200);
        id = `${nome}::${geoHash}`;
      }
      return String(id);
    },

    _nomeFeicao: function (f) {
      const p = f.properties || {};
      return p.nome || p.NOME || p.NOME_INSTALACAO || p.cidade ||
             p.nome_rio || p.NOME_RIO || p.terrai_nom || p.nome_uc ||
             p.NOME_UC || p.municipio || `Feição #${this._chaveFeicao(f).slice(0, 12)}`;
    },

    _atualizarContadorFeicoes: function () {
      const el = document.getElementById('buffer-contador-feicoes');
      if (!el) return;
      const n = this._feicoesSelecionadas.size;
      el.textContent = n === 0 ? '0 selecionadas' : `${n} selecionada${n !== 1 ? 's' : ''}`;
    },
    /**
     * Extrai a UF de uma feição (mesma lógica do CopilotoIA).
     */
    _extrairUF: function (f) {
      const p = f.properties || {};

      // 1) Sigla direta
      for (const k of ['SIGLA_UF', 'sigla_uf', 'uf', 'UF', 'est_uf', 'sg_uf',
                       'est_origem', 'EST_ORIGEM', 'est_destino', 'EST_DESTINO']) {
        const v = p[k];
        if (v && String(v).trim().length === 2) return String(v).trim().toUpperCase();
      }

      // 2) Município no formato "Cidade/UF"
      for (const k of ['municipio', 'MUNICIPIO', 'nome_municipio']) {
        const v = p[k];
        if (v && String(v).includes('/')) {
          const partes = String(v).split('/');
          if (partes.length > 1) {
            const uf = partes[1].trim().toUpperCase();
            if (uf.length === 2) return uf;
          }
        }
      }

      // 3) Estado por extenso
      const mapa = {
        'acre':'AC','alagoas':'AL','amapa':'AP','amazonas':'AM','bahia':'BA',
        'ceara':'CE','distrito federal':'DF','espirito santo':'ES','goias':'GO',
        'maranhao':'MA','mato grosso':'MT','mato grosso do sul':'MS',
        'minas gerais':'MG','para':'PA','paraiba':'PB','parana':'PR',
        'pernambuco':'PE','piaui':'PI','rio de janeiro':'RJ',
        'rio grande do norte':'RN','rio grande do sul':'RS','rondonia':'RO',
        'roraima':'RR','santa catarina':'SC','sao paulo':'SP','sergipe':'SE','tocantins':'TO'
      };
      for (const k of ['estado', 'ESTADO', 'Estado']) {
        const v = p[k];
        if (!v) continue;
        const norm = String(v).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (mapa[norm]) return mapa[norm];
        if (norm.length === 2) return norm.toUpperCase();
      }

      return '';
    },    
    _renderizarListaFeicoes: function () {
      const container = document.getElementById('buffer-lista-feicoes');
      if (!container) return;

      const selCamada = document.getElementById('buffer-camada');
      const camadaId = selCamada?.value;

      if (!camadaId) {
        container.innerHTML = '<em style="color:#64748b;font-size:10.5px;padding:20px;display:block;text-align:center;">Escolha uma camada primeiro</em>';
        return;
      }

      const dados = DADOS_GEOJSON_BRUTOS[camadaId];
      if (!dados?.features?.length) {
        container.innerHTML = '<em style="color:#64748b;font-size:10.5px;padding:20px;display:block;text-align:center;">Camada sem feições carregadas</em>';
        return;
      }

      const busca = (this._buscaFeicao || '').toLowerCase().trim();
      let features = dados.features;

      if (busca.length >= 2) {
        features = features.filter(f => {
          const nome = this._nomeFeicao(f).toLowerCase();
          if (nome.includes(busca)) return true;
          const uf = this._extrairUF(f) || '';
          return uf.toLowerCase().includes(busca);
        });
      }

      const LIMITE_VISUAL = 300;
      const visiveis = features.slice(0, LIMITE_VISUAL);

      if (visiveis.length === 0) {
        container.innerHTML = '<em style="color:#64748b;font-size:10.5px;padding:20px;display:block;text-align:center;">Nenhuma feição encontrada</em>';
        return;
      }

      let html = '';
      visiveis.forEach(f => {
        const chave = this._chaveFeicao(f);
        const selecionada = this._feicoesSelecionadas.has(chave);
        const nome = this._nomeFeicao(f);
        const uf = this._extrairUF(f) || '';
        const chaveEsc = window.Security.escapeHTML(chave).replace(/'/g, "\\'");

        html += `<div class="buffer-feicao-item ${selecionada ? 'selecionada' : ''}" onclick="BufferTool.toggleFeicao('${chaveEsc}', event)">
          <input type="checkbox" ${selecionada ? 'checked' : ''} onclick="event.stopPropagation(); BufferTool.toggleFeicao('${chaveEsc}')">
          <span class="buffer-feicao-nome" title="${window.Security.escapeHTML(nome)}">${window.Security.escapeHTML(nome)}</span>
          ${uf ? `<span class="buffer-feicao-uf">${window.Security.escapeHTML(uf)}</span>` : ''}
        </div>`;
      });

      if (features.length > LIMITE_VISUAL) {
        html += `<div style="padding:8px 10px;text-align:center;font-size:10px;color:#64748b;background:#0b1f33;">
          Mostrando ${LIMITE_VISUAL} de ${features.length} feições. Refine a busca.
        </div>`;
      }

      container.innerHTML = html;
      this._atualizarContadorFeicoes();
    },

    toggleFeicao: function (chave, evento) {
      if (evento) evento.stopPropagation();

      console.log('[Buffer] toggleFeicao recebeu chave:', chave);
      console.log('[Buffer] Estava selecionada?', this._feicoesSelecionadas.has(chave));

      if (this._feicoesSelecionadas.has(chave)) {
        this._feicoesSelecionadas.delete(chave);
      } else {
        this._feicoesSelecionadas.add(chave);
      }

      console.log('[Buffer] Set agora tem:', this._feicoesSelecionadas.size, 'itens');

      this._renderizarListaFeicoes();
      this._atualizarPreview();
    },

    selecionarTodasVisiveis: function (selecionar) {
      const selCamada = document.getElementById('buffer-camada');
      const camadaId = selCamada?.value;
      if (!camadaId) return;

      const dados = DADOS_GEOJSON_BRUTOS[camadaId];
      if (!dados?.features?.length) return;

      let features = dados.features;
      const busca = (this._buscaFeicao || '').toLowerCase().trim();

      if (busca.length >= 2) {
        features = features.filter(f => {
          const nome = this._nomeFeicao(f).toLowerCase();
          if (nome.includes(busca)) return true;
          const uf = this._extrairUF(f) || '';
          return uf.toLowerCase().includes(busca);
        });
      }

      for (const f of features) {
        const chave = this._chaveFeicao(f);
        if (selecionar) this._feicoesSelecionadas.add(chave);
        else this._feicoesSelecionadas.delete(chave);
      }

      this._renderizarListaFeicoes();
      this._atualizarPreview();
    },

    filtrarListaFeicoes: function (termo) {
      this._buscaFeicao = termo;
      this._renderizarListaFeicoes();
    },

    usarSelecaoDoMapa: function () {
      if (!window.SelectionManager) {
        if (window.UI) window.UI.toast('⚠️ Módulo de seleção indisponível.');
        return;
      }

      const selecionadas = window.SelectionManager.obterSelecionadas();
      if (!selecionadas?.length) {
        if (window.UI) window.UI.toast('⚠️ Nenhuma feição selecionada. Use Ctrl+Clique no mapa.');
        return;
      }

      // ✅ Só atualiza a UI — o filtro lê direto do SelectionManager
      this._atualizarStatusMapa();
      this._atualizarPreview();
      if (window.UI) window.UI.toast(`🎯 ${selecionadas.length} feição(ões) prontas para buffer.`);
    },

    _atualizarStatusMapa: function () {
      const el = document.getElementById('buffer-selecao-mapa-status');
      if (!el) return;

      const sel = window.SelectionManager?.obterSelecionadas?.() || [];
      const qtd = sel.length;

      if (qtd === 0) {
        el.innerHTML = '<em style="color:#94a3b8;">Nenhuma feição selecionada no mapa.<br>Use <kbd>Ctrl+Clique</kbd> sobre feições para selecioná-las.</em>';
        return;
      }

      el.innerHTML = `
        <div style="color:#fbbf24;font-weight:700;font-size:12px;">🎯 ${qtd} feição(ões) selecionada(s) no mapa</div>
        <div style="font-size:10.5px;color:#94a3b8;margin-top:4px;">Ao clicar em "Criar Buffer", o buffer será gerado sobre essas feições.</div>
      `;
    },      
    /* ============================================================
       UI
       ============================================================ */
    abrirModal: function () {
      const modal = document.getElementById('modal-buffer');
      if (!modal) return;

      // ✅ Sempre reseta os filtros acumulados ao abrir
      this._filtrosAcumulados = [];

      this._popularSelectCamadas();
      this._popularSelectFiltros();
      this._renderizarChips();
      this._renderizarListaFeicoes();   // ✅ M9.4
      this._atualizarContadorFeicoes(); // ✅ M9.4
      this._atualizarPreview();

      modal.classList.add('aberto');

      const selCamada = document.getElementById('buffer-camada');
      const inpRaio = document.getElementById('buffer-raio');
      const chkDissolve = document.getElementById('buffer-dissolve');
      const selFiltro = document.getElementById('buffer-filtro');
      const chkFiltroAtivo = document.getElementById('buffer-usar-filtro-ativo');

      if (selCamada && !selCamada._bufferListeners) {
        selCamada.addEventListener('change', async () => {
          this._filtrosAcumulados = [];
          this._feicoesSelecionadas = new Set();
          this._buscaFeicao = '';
          const inpBusca = document.getElementById('buffer-busca-feicao');
          if (inpBusca) inpBusca.value = '';

          // ✅ Carrega sob demanda
          const camadaId = selCamada.value;
          if (camadaId && !DADOS_GEOJSON_BRUTOS[camadaId]?.features?.length) {
            if (window.UI) window.UI.toast(`⏳ Carregando ${CONFIG_CAMADAS[camadaId]?.nome || camadaId}...`);
            try {
              await window.DataManager.carregarCamada(camadaId);
            } catch (e) {
              console.warn('[M9] Falha ao carregar:', e);
            }
          }

          this._renderizarChips();
          this._popularSelectFiltros();
          this._renderizarListaFeicoes();
          this._atualizarContadorFeicoes();
          this._atualizarPreview();
        });
        selCamada._bufferListeners = true;
      }
      if (inpRaio && !inpRaio._bufferListeners) {
        inpRaio.addEventListener('input', () => this._atualizarPreview());
        inpRaio._bufferListeners = true;
      }
      if (chkDissolve && !chkDissolve._bufferListeners) {
        chkDissolve.addEventListener('change', () => this._atualizarPreview());
        chkDissolve._bufferListeners = true;
      }
      if (selFiltro && !selFiltro._bufferListeners) {
        selFiltro.addEventListener('change', () => this._atualizarPreview());
        selFiltro._bufferListeners = true;
      }
      const inpLote = document.getElementById('buffer-raios-lote');
      if (inpLote && !inpLote._bufferListeners) {
        inpLote.addEventListener('input', () => this._atualizarPreview());
        inpLote._bufferListeners = true;
      }      
      if (chkFiltroAtivo && !chkFiltroAtivo._bufferListeners) {
        chkFiltroAtivo.addEventListener('change', () => {
          if (selFiltro) selFiltro.disabled = chkFiltroAtivo.checked;
          this._atualizarPreview();
        });
        chkFiltroAtivo._bufferListeners = true;
      }
    },

    fecharModal: function () {
      const modal = document.getElementById('modal-buffer');
      if (modal) modal.classList.remove('aberto');
    },

    _popularSelectCamadas: function () {
      const sel = document.getElementById('buffer-camada');
      if (!sel) return;

      const valAtual = sel.value;
      sel.innerHTML = '';

      // ✅ Lista TODAS as camadas do CONFIG (mesmo não carregadas)
      const candidatas = [];
      for (const [id, cfg] of Object.entries(CONFIG_CAMADAS)) {
        // Ignora camadas geradas
        if (id.startsWith('buffer_') || id.startsWith('geo_') || id.startsWith('imp_')) continue;

        const n = DADOS_GEOJSON_BRUTOS[id]?.features?.length || 0;
        const nome = cfg.nome || id;
        candidatas.push({ id, nome, n });
      }
      candidatas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      if (candidatas.length === 0) {
        sel.innerHTML = '<option value="">(Nenhuma camada carregada)</option>';
        return;
      }

      for (const c of candidatas) {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.nome} (${c.n.toLocaleString('pt-BR')})`;
        sel.appendChild(opt);
      }

      // ✅ Restaura seleção, ou força a primeira como default
      if (valAtual && candidatas.find(c => c.id === valAtual)) {
        sel.value = valAtual;
      } else if (candidatas.length > 0) {
        sel.value = candidatas[0].id;
      }

      console.log('[M9.4] Select populado. Valor:', sel.value, '| Opções:', candidatas.length);
    },
    _popularSelectFiltros: function () {
      const selCamada = document.getElementById('buffer-camada');
      const selFiltro = document.getElementById('buffer-filtro');
      if (!selCamada || !selFiltro) return;

      const camadaId = selCamada.value;
      const dados = DADOS_GEOJSON_BRUTOS[camadaId];

      // ✅ MAPA DE FILTROS POR CAMADA (definitivo — baseado nos dados reais)
      const FILTROS_POR_CAMADA = {
        rodovias: [
          { campo: 'sg_uf', rotulo: 'UF' },
          { campo: 'nm_tipo_tr', rotulo: 'Tipo de Trecho' },
          { campo: 'ds_jurisdi', rotulo: 'Jurisdição' },
          { campo: 'ds_superfi', rotulo: 'Superfície' },
          { campo: 'ds_legenda', rotulo: 'Legenda' },
          { campo: 'leg_multim', rotulo: 'Multimodalidade' }
        ],
        ferrovias: [
          { campo: 'uf', rotulo: 'UF' },
          { campo: 'tip_situac', rotulo: 'Situação' },
          { campo: 'bitola', rotulo: 'Bitola' },
          { campo: 'municipio', rotulo: 'Município' }
        ],
        instalacoes_portuarias: [
          { campo: 'estado', rotulo: 'Estado' },
          { campo: 'tipo', rotulo: 'Tipo' },
          { campo: 'modalidade', rotulo: 'Modalidade' },
          { campo: 'situacao', rotulo: 'Situação' },
          { campo: 'gestao', rotulo: 'Gestão' },
          { campo: 'fonte', rotulo: 'Fonte' }
        ],
        ucs_federais: [
          { campo: 'esfera', rotulo: 'Esfera' },
          { campo: 'categoria', rotulo: 'Categoria' },
          { campo: 'grupo', rotulo: 'Grupo' },
          { campo: 'uf', rotulo: 'UF' },
          { campo: 'nome', rotulo: 'Nome' }
        ],
        tis_poligonais: [
          { campo: 'modalidade', rotulo: 'Modalidade' },
          { campo: 'fase', rotulo: 'Fase' },
          { campo: 'etnia_nom', rotulo: 'Etnia' },
          { campo: 'uf', rotulo: 'UF' }
        ],
        linhas_travessias: [
          { campo: 'est_origem', rotulo: 'UF Origem' },
          { campo: 'est_destino', rotulo: 'UF Destino' },
          { campo: 'tipo', rotulo: 'Tipo' }
        ],
        ven_2022: [
          { campo: 'navegacao', rotulo: 'Navegação' },
          { campo: 'tipo', rotulo: 'Tipo' },
          { campo: 'nome_rio', rotulo: 'Rio' },
          { campo: 'nome', rotulo: 'Nome' }
        ],
        ven_2024: [
          { campo: 'navegacao', rotulo: 'Navegação' },
          { campo: 'tipo', rotulo: 'Tipo' },
          { campo: 'nome_rio', rotulo: 'Rio' },
          { campo: 'nome', rotulo: 'Nome' }
        ],
        ven_2020: [
          { campo: 'navegacao', rotulo: 'Navegação' },
          { campo: 'tipo', rotulo: 'Tipo' },
          { campo: 'nome_rio', rotulo: 'Rio' }
        ],
        ven_2018: [
          { campo: 'navegacao', rotulo: 'Navegação' },
          { campo: 'tipo', rotulo: 'Tipo' },
          { campo: 'nome_rio', rotulo: 'Rio' }
        ],
        ven_2013: [
          { campo: 'navegacao', rotulo: 'Navegação' },
          { campo: 'tipo', rotulo: 'Tipo' },
          { campo: 'nome_rio', rotulo: 'Rio' }
        ],
        embarcacoes: [
          { campo: 'tipo', rotulo: 'Tipo' },
          { campo: 'tipo_embarcacao', rotulo: 'Tipo de Embarcação' },
          { campo: 'uf', rotulo: 'UF' }
        ],
        uf: [
          { campo: 'SIGLA_UF', rotulo: 'Sigla' },
          { campo: 'nome', rotulo: 'Nome' },
          { campo: 'regiao', rotulo: 'Região' }
        ]
      };

      // Fallback genérico: se camada não estiver no mapa acima, procura automaticamente
      const campos = FILTROS_POR_CAMADA[camadaId] || this._detectarCamposAutomaticamente(dados);

      const opcoes = [];

      if (dados?.features?.length) {
        for (const { campo, rotulo } of campos) {
          const valores = new Set();
          let totalComValor = 0;

          for (const f of dados.features) {
            let v = f.properties?.[campo];
            if (v === null || v === undefined || v === '') continue;

            v = String(v).trim();
            if (v.length === 0 || v.length > 80) continue;

            // Ignora URLs/emails/CNPJ
            if (/^https?:\/\//i.test(v)) continue;
            if (/^www\./i.test(v)) continue;
            if (/@/.test(v) && !v.includes(' ')) continue;
            if (/^\d{6,}$/.test(v)) continue;

            valores.add(v);
            totalComValor++;
          }

          const proporcao = dados.features.length > 0 ? totalComValor / dados.features.length : 0;

          if (valores.size >= 2 && valores.size <= 60 && proporcao >= 0.3) {
            opcoes.push({ campo, rotulo, valores: Array.from(valores).sort() });
          }
        }
      }

      // ✅ LIMPEZA TOTAL antes de popular
      while (selFiltro.firstChild) selFiltro.removeChild(selFiltro.firstChild);

      if (opcoes.length === 0) {
        selFiltro.disabled = true;
        const opt = document.createElement('option');
        opt.value = 'TODOS';
        opt.textContent = '(esta camada não tem filtros disponíveis)';
        selFiltro.appendChild(opt);
        console.warn(`[M9] Nenhum filtro encontrado para "${camadaId}"`);
        return;
      }

      selFiltro.disabled = false;

      const optDefault = document.createElement('option');
      optDefault.value = 'TODOS';
      optDefault.textContent = 'Todas as feições';
      selFiltro.appendChild(optDefault);

      for (const op of opcoes) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = op.rotulo || op.campo;

        for (const v of op.valores) {
          const opt = document.createElement('option');
          opt.value = `${op.campo}::${v}`;
          opt.textContent = v;
          optgroup.appendChild(opt);
        }
        selFiltro.appendChild(optgroup);
      }

      console.info(`[M9] ${opcoes.length} filtro(s) para "${camadaId}":`, opcoes.map(o => o.campo).join(', '));
    },

    /**
     * Fallback: detecta campos automaticamente se a camada não tem filtros mapeados.
     */
    _detectarCamposAutomaticamente: function (dados) {
      if (!dados?.features?.length) return [];

      const candidatos = {};
      const amostra = dados.features.slice(0, 200);

      for (const f of amostra) {
        for (const [k, v] of Object.entries(f.properties || {})) {
          if (v === null || v === undefined || v === '') continue;
          const s = String(v).trim();
          if (s.length === 0 || s.length > 80) continue;
          if (/^https?:\/\//i.test(s)) continue;
          if (/@/.test(s) && !s.includes(' ')) continue;

          candidatos[k] = candidatos[k] || new Set();
          candidatos[k].add(s);
        }
      }

      const resultado = [];
      for (const [campo, valores] of Object.entries(candidatos)) {
        if (valores.size >= 2 && valores.size <= 60) {
          resultado.push({ campo, rotulo: campo });
        }
      }
      return resultado;
    },
    _atualizarPreview: function () {
      const selCamada = document.getElementById('buffer-camada');
      const inpRaio = document.getElementById('buffer-raio');
      const preview = document.getElementById('buffer-preview');

      if (!selCamada || !inpRaio || !preview) return;

      const camadaId = selCamada.value;
      const raio = parseFloat(inpRaio.value) || 50;

      if (!camadaId) {
        preview.innerHTML = '<em style="color:#64748b;">Selecione uma camada para ver o preview.</em>';
        return;
      }

      const dados = DADOS_GEOJSON_BRUTOS[camadaId];
      const n = dados?.features?.length || 0;
      const nome = window.CONFIG_CAMADAS[camadaId]?.nome || camadaId;

      // ✅ Aplica filtros e conta
      const { filtradas, filtroTexto } = this._aplicarFiltros(dados);
      const nFiltrado = filtradas.length;

      const pct = n > 0 ? ((nFiltrado / n) * 100).toFixed(0) : 0;

      // ✅ Verifica modo (único ou lote)
      const modo = this._obterModoRaio();
      const comparativoEl = document.getElementById('buffer-comparativo');
      let textoRaios = '';

      if (modo === 'lote') {
        const inpLote = document.getElementById('buffer-raios-lote');
        const raios = this._parseRaiosLote(inpLote?.value || '');
        if (raios.length === 0) {
          preview.innerHTML = '<em style="color:#ef4444;">⚠️ Informe ao menos 1 raio válido separado por vírgula.</em>';
          if (comparativoEl) comparativoEl.style.display = 'none';
          return;
        }
        textoRaios = raios.map(r => `${r} km`).join(', ');

        // ✅ Tabela comparativa (teórica — área π·r²)
        this._renderizarComparativo(raios);
        if (comparativoEl) comparativoEl.style.display = 'block';
      } else {
        textoRaios = `${raio} km`;
        if (comparativoEl) comparativoEl.style.display = 'none';
      }

      preview.innerHTML = `
        <div style="font-size:11px;color:#94a3b8;line-height:1.5;">
          Serão processadas <strong style="color:#38bdf8;">${nFiltrado.toLocaleString('pt-BR')}</strong>
          ${nFiltrado !== n ? `<span style="color:#64748b;">de ${n.toLocaleString('pt-BR')} (${pct}%)</span>` : ''}
          feições de <strong style="color:#e2e8f0;">${window.Security.escapeHTML(nome)}</strong>,<br>
          criando buffers de <strong style="color:#f59e0b;">${textoRaios}</strong> em torno de cada uma.
          ${filtroTexto ? `<br><br><span style="color:#fbbf24;font-size:10px;">🔍 Filtro: ${window.Security.escapeHTML(filtroTexto)}</span>` : ''}
        </div>
      `;
    },

    /**
     * Renderiza tabela comparativa (área teórica por raio).
     */
    _renderizarComparativo: function (raios) {
      const tbody = document.getElementById('buffer-comparativo-corpo');
      if (!tbody) return;

      const linhas = raios.map(r => {
        const area = Math.PI * r * r;
        return `<tr>
          <td>${r}</td>
          <td>π·${r}²</td>
          <td>${area >= 1000 ? (area / 1000).toFixed(1) + ' mil km²' : area.toFixed(0) + ' km²'}</td>
        </tr>`;
      }).join('');

      tbody.innerHTML = linhas;
    },
    /**
     * Aplica os filtros selecionados no modal.
     * Retorna { filtradas, filtroTexto }.
     */
    _aplicarFiltros: function (dados) {
      if (!dados?.features?.length) {
        return { filtradas: [], filtroTexto: '' };
      }

      const selCamada = document.getElementById('buffer-camada');
      const selFiltro = document.getElementById('buffer-filtro');
      const chkFiltroAtivo = document.getElementById('buffer-usar-filtro-ativo');

      const camadaId = selCamada ? selCamada.value : '';

      // ✅ Modo 1: usa filtro ativo do painel principal
      if (chkFiltroAtivo && chkFiltroAtivo.checked) {
        const filtroTexto = this._obterFiltroAtivoTexto(camadaId);
        const filtradas = this._aplicarFiltroAtivo(dados, camadaId);
        return { filtradas, filtroTexto };
      }

      // ✅ Modo 2: usa filtro do dropdown do modal
      if (!selFiltro || selFiltro.value === 'TODOS') {
        return { filtradas: dados.features, filtroTexto: '' };
      }

      const [campo, valor] = selFiltro.value.split('::');
      const filtradas = dados.features.filter(f => {
        const v = f.properties?.[campo];
        return v !== undefined && v !== null && String(v).trim() === valor;
      });

      return {
        filtradas,
        filtroTexto: `${campo} = "${valor}"`
      };
    },

    /**
     * Retorna texto descritivo do filtro ativo no painel principal.
     */
    _obterFiltroAtivoTexto: function (camadaId) {
      if (camadaId === 'instalacoes_portuarias') {
        const filtro = window.FILTRO_PORTO_ATUAL || 'TODOS';
        if (filtro !== 'TODOS') {
          const cat = window.PortClassification?.tipos?.[filtro];
          return `Regime = ${cat?.nome || filtro}`;
        }
      }

      if (camadaId === 'ucs_todas_mma') {
        const filtro = window.FILTRO_UC_ATUAL || 'TODOS';
        if (filtro !== 'TODOS') return `Esfera = ${filtro}`;
      }

      const selSub = document.getElementById('filtro-subtipo-dinamico');
      const selCamada = document.getElementById('sel-camada-busca');
      if (selSub && selSub.value && selSub.value !== 'TODOS' && selCamada && selCamada.value === camadaId) {
        return `Filtro ativo = ${selSub.value}`;
      }

      return '';
    },

    /**
     * Aplica os filtros selecionados no modal.
     * Prioridade:
     *   1. Filtros acumulados (chips) — se houver
     *   2. Checkbox "usar filtro ativo do painel principal"
     *   3. Dropdown do modal (filtro único, sem +)
     */
    _aplicarFiltros: function (dados) {
      if (!dados?.features?.length) {
        return { filtradas: [], filtroTexto: '' };
      }

      const selCamada = document.getElementById('buffer-camada');
      const selFiltro = document.getElementById('buffer-filtro');
      const chkFiltroAtivo = document.getElementById('buffer-usar-filtro-ativo');
      const camadaId = selCamada ? selCamada.value : '';

      // ============================================================
      // MODO A: feições individuais
      //   - MODO "individuais": usa o Set local (_feicoesSelecionadas)
      //   - MODO "mapa": lê SEMPRE do SelectionManager (evita estado antigo)
      // ============================================================
      if (this._modoSel === 'individuais' || this._modoSel === 'mapa') {
        let chavesParaFiltrar;

        if (this._modoSel === 'mapa') {
          // ✅ Modo mapa: lê direto da seleção ativa no mapa
          if (!window.SelectionManager) {
            return { filtradas: [], filtroTexto: '⚠️ SelectionManager indisponível' };
          }
          const selecionadas = window.SelectionManager.obterSelecionadas();
          if (!selecionadas?.length) {
            return { filtradas: [], filtroTexto: '⚠️ Nenhuma feição selecionada no mapa' };
          }
          chavesParaFiltrar = new Set();
          for (const s of selecionadas) {
            chavesParaFiltrar.add(this._chaveFeicao(s.feature));
          }
          console.log('[Buffer] MODO MAPA — lendo', selecionadas.length, 'feições direto do SelectionManager');
        } else {
          // Modo individuais: usa o Set local
          chavesParaFiltrar = this._feicoesSelecionadas;
          console.log('[Buffer] MODO INDIVIDUAIS — Set local tem', chavesParaFiltrar.size, 'chaves');
        }

        if (chavesParaFiltrar.size === 0) {
          return { filtradas: [], filtroTexto: '⚠️ Nenhuma feição selecionada' };
        }

        const filtradas = dados.features.filter(f =>
          chavesParaFiltrar.has(this._chaveFeicao(f))
        );

        console.log('[Buffer] Features matching:', filtradas.length);
        return {
          filtradas,
          filtroTexto: `${filtradas.length} feição(ões) selecionada(s)`
        };
      }

      // ============================================================
      // MODO B: filtros acumulados (chips)
      // ============================================================
      if (this._filtrosAcumulados.length > 0) {
        let filtradas = dados.features;
        const aplicados = [];

        for (const { campo, valor } of this._filtrosAcumulados) {
          filtradas = filtradas.filter(f => {
            const v = f.properties?.[campo];
            if (v === null || v === undefined) return false;
            return String(v).trim() === String(valor).trim();
          });
          aplicados.push(`${campo} = "${valor}"`);
        }

        return {
          filtradas,
          filtroTexto: aplicados.join(' E ')
        };
      }

      // ============================================================
      // MODO C: filtro ativo do painel principal
      // ============================================================
      if (chkFiltroAtivo && chkFiltroAtivo.checked) {
        const filtroTexto = this._obterFiltroAtivoTexto(camadaId);
        const filtradas = this._aplicarFiltroAtivo(dados, camadaId);
        return { filtradas, filtroTexto };
      }

      // ============================================================
      // MODO D: filtro do dropdown (único)
      // ============================================================
      if (!selFiltro || selFiltro.value === 'TODOS') {
        console.log('[Buffer] MODO D (sem filtro) — retornando TODAS as', dados.features.length, 'feições');
        return { filtradas: dados.features, filtroTexto: '' };
      }

      const [campo, valor] = selFiltro.value.split('::');
      const filtradas = dados.features.filter(f => {
        const v = f.properties?.[campo];
        return v !== undefined && v !== null && String(v).trim() === valor;
      });

      return {
        filtradas,
        filtroTexto: `${campo} = "${valor}"`
      };
    },
      mudarModo: function (modo) {
      const unicoW = document.getElementById('buffer-raio-unico-wrapper');
      const loteW = document.getElementById('buffer-raio-lote-wrapper');

      if (unicoW) unicoW.style.display = (modo === 'unico') ? '' : 'none';
      if (loteW) loteW.style.display = (modo === 'lote') ? '' : 'none';

      this._atualizarPreview();
    },

    _obterModoRaio: function () {
      const sel = document.querySelector('input[name="buffer-modo"]:checked');
      return sel ? sel.value : 'unico';
    },

    _parseRaiosLote: function (texto) {
      return String(texto || '')
        .split(',')
        .map(s => parseFloat(s.trim()))
        .filter(n => Number.isFinite(n) && n > 0 && n <= 1000)
        .slice(0, 6);   // máximo 6 raios
    },  
    /* ============================================================
       PROCESSAMENTO
       ============================================================ */
    criar: async function () {
      const selCamada = document.getElementById('buffer-camada');
      const inpRaio = document.getElementById('buffer-raio');
      const inpLote = document.getElementById('buffer-raios-lote');
      const chkDissolve = document.getElementById('buffer-dissolve');
      const btnCriar = document.getElementById('btn-buffer-criar');

      if (!selCamada || !inpRaio) return;

      const camadaId = selCamada.value;
      const dissolve = chkDissolve ? chkDissolve.checked : false;

      // ✅ Verifica modo
      const modo = this._obterModoRaio();
      let raios = [];

      if (modo === 'lote') {
        raios = this._parseRaiosLote(inpLote?.value || '');
        if (raios.length === 0) {
          if (window.UI) window.UI.toast('⚠️ Informe ao menos 1 raio válido no campo de lote.');
          return;
        }
      } else {
        raios = [parseFloat(inpRaio.value) || 50];
      }

      // ✅ Carrega sob demanda
      if (!DADOS_GEOJSON_BRUTOS[camadaId]?.features?.length) {
        if (window.UI) window.UI.toast(`⏳ Carregando ${CONFIG_CAMADAS[camadaId]?.nome || camadaId}...`);
        try {
          await window.DataManager.carregarCamada(camadaId);
        } catch (e) {
          if (window.UI) window.UI.toast(`⚠️ Falha ao carregar: ${e.message || e}`);
          if (btnCriar) { btnCriar.disabled = false; btnCriar.innerHTML = '⭕ Criar Buffer'; }
          return;
        }
      }

      const dadosBrutos = DADOS_GEOJSON_BRUTOS[camadaId];
      if (!dadosBrutos?.features?.length) {
        if (window.UI) window.UI.toast('⚠️ Camada sem feições.');
        if (btnCriar) { btnCriar.disabled = false; btnCriar.innerHTML = '⭕ Criar Buffer'; }
        return;
      }

      // ✅ Aplica filtros ANTES de processar
      const { filtradas, filtroTexto } = this._aplicarFiltros(dadosBrutos);
      if (filtradas.length === 0) {
        let msg = '⚠️ Nenhuma feição corresponde ao filtro.';
        if (this._modoSel === 'individuais' || this._modoSel === 'mapa') {
          msg = '⚠️ Selecione ao menos 1 feição.';
        }
        if (window.UI) window.UI.toast(msg);
        return;
      }

      const dados = { type: 'FeatureCollection', features: filtradas };

      if (typeof turf === 'undefined') {
        if (window.UI) window.UI.toast('⚠️ Turf.js indisponível. Recarregue a página.');
        return;
      }
      console.info(`[M9] Processando ${filtradas.length} feição(ões)${filtroTexto ? ` (${filtroTexto})` : ''}`);      

      // Desabilita botão durante processamento
      if (btnCriar) {
        btnCriar.disabled = true;
        const qtd = raios.length;
        btnCriar.innerHTML = qtd > 1 ? `⏳ Processando ${qtd} raios...` : '⏳ Processando...';
      }

      const inicio = performance.now();
      let sucessos = 0;
      let erros = 0;

      try {
        // ✅ Loop pelos raios
        for (const raioKm of raios) {
          try {
            const resultado = await this._processarBuffer(dados, raioKm, dissolve);

            // Marca o filtro no geojson pra aparecer no nome da camada
            if (filtroTexto) resultado._filtroTexto = filtroTexto;

            // Adiciona como nova camada
            this._criarCamadaBuffer(camadaId, raioKm, dissolve, resultado);
            sucessos++;

            // Yield pra UI entre raios
            if (raios.length > 1) await new Promise(r => setTimeout(r, 100));
          } catch (e) {
            console.warn(`[M9] Falha no raio ${raioKm}km:`, e);
            erros++;
          }
        }

        const duracao = ((performance.now() - inicio) / 1000).toFixed(1);
        console.info(`[M9] ${sucessos} buffer(s) criado(s) em ${duracao}s${erros > 0 ? ` (${erros} com erro)` : ''}`);

        this.fecharModal();

        if (window.UI) {
          const msg = sucessos === 1
            ? `✓ Buffer de ${raios[0]} km criado em ${duracao}s.`
            : `✓ ${sucessos} buffers criados em ${duracao}s${erros > 0 ? ` (${erros} falha(s))` : ''}.`;
          window.UI.toast(msg);
        }
      } catch (e) {
        console.error('[M9] Falha crítica ao criar buffer:', e);
        if (window.UI) window.UI.toast('⚠️ Falha ao criar buffer: ' + (e.message || e));
      } finally {
        if (btnCriar) {
          btnCriar.disabled = false;
          btnCriar.innerHTML = '⭕ Criar Buffer';
        }
      }
    },

    _processarBuffer: async function (dados, raioKm, dissolve) {
      // Converte km → graus (aproximação; turf.buffer aceita km direto)
      const steps = 12;   // 12 segmentos = bom equilíbrio entre precisão e performance

      // Processa em chunks pra não travar a UI
      const buffers = [];
      const features = dados.features.filter(f => f.geometry);
      const chunkSize = 100;

      for (let i = 0; i < features.length; i++) {
        const f = features[i];
        try {
          const buffered = turf.buffer(f, raioKm, { units: 'kilometers', steps });
          if (buffered) {
            // ✅ Preserva as properties da feição original
            const propsOrigem = f.properties || {};
            const propsLimpas = {};
            const IGNORAR = ['geom', 'geometry', 'shape', 'shape_leng', 'shape_area', 'objectid_1', 'marcador'];
            for (const [k, v] of Object.entries(propsOrigem)) {
              if (IGNORAR.includes(k.toLowerCase())) continue;
              if (v === null || v === undefined) continue;
              propsLimpas[k] = v;
            }

            // Calcula área deste buffer individual
            let areaM2 = 0;
            try { areaM2 = turf.area(buffered); } catch (e) { /* ignora */ }

            // ✅ Adiciona campos do buffer (prefixo _)
            buffered.properties = Object.assign({}, {
              _buffer_raio_km: raioKm,
              _buffer_area_km2: +(areaM2 / 1_000_000).toFixed(2),
              _buffer_area_m2: Math.round(areaM2),
              _buffer_gerado_em: new Date().toLocaleString('pt-BR')
            }, propsLimpas);

            buffers.push(buffered);
          }
        } catch (e) { /* ignora feição inválida */ }

        // Yield a cada chunk pra UI respirar
        if (i > 0 && i % chunkSize === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      if (buffers.length === 0) throw new Error('Nenhum buffer foi gerado');

      // Se dissolve, une todos numa só feature
      if (dissolve && buffers.length > 1) {
        try {
          let acumulado = buffers[0];
          for (let i = 1; i < buffers.length; i++) {
            acumulado = turf.union(acumulado, buffers[i]);
            if (i % 20 === 0) await new Promise(r => setTimeout(r, 0));
          }

          // ✅ Herda propriedades da primeira feição original + métricas úteis
          const propsOrigem = dados.features[0]?.properties || {};
          const propsLimpas = {};
          // Copia só campos "úteis" (não geométricos)
          const IGNORAR = ['geom', 'geometry', 'shape', 'shape_leng', 'shape_area', 'objectid_1', 'marcador'];
          for (const [k, v] of Object.entries(propsOrigem)) {
            if (IGNORAR.includes(k.toLowerCase())) continue;
            if (v === null || v === undefined) continue;
            propsLimpas[k] = v;
          }

          // Calcula área total (m²)
          let areaM2 = 0;
          try { areaM2 = turf.area(acumulado); } catch (e) { /* ignora */ }

          const propsDissolve = Object.assign({}, propsLimpas, {
            _dissolved: true,
            _count: buffers.length,
            _area_total_m2: Math.round(areaM2),
            _area_total_km2: +(areaM2 / 1_000_000).toFixed(2),
            _gerado_por: 'M9 · Buffer + Dissolve',
            _data_geracao: new Date().toLocaleString('pt-BR')
          });

          return {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: propsDissolve,
              geometry: acumulado.geometry
            }]
          };
        } catch (e) {
          console.warn('[M9] Dissolve falhou, retornando buffers individuais:', e);
        }
      }

      return { type: 'FeatureCollection', features: buffers };
    },

    _criarCamadaBuffer: function (camadaOrigemId, raioKm, dissolve, geojson) {
      this._contador++;

      // ✅ Garante que o pane dedicado do buffer existe e recebe cliques
      if (!window.mapa.getPane('paneBuffer')) {
        window.mapa.createPane('paneBuffer');
        window.mapa.getPane('paneBuffer').style.zIndex = 650;      // entre pontos (600) e seleção (700)
        window.mapa.getPane('paneBuffer').style.pointerEvents = 'auto';
      }
      const nomeBase = window.CONFIG_CAMADAS[camadaOrigemId]?.nome || camadaOrigemId;
      const filtroTexto = geojson._filtroTexto || '';
      const nome = `Buffer ${raioKm}km · ${nomeBase}${filtroTexto ? ` [${filtroTexto}]` : ''}${dissolve ? ' (unificado)' : ''}`;
      const id = `buffer_${Date.now()}_${raioKm}km_${camadaOrigemId}`;

      // Cor aleatória distinta
      const cor = window.LayerRegistry.corAleatoria();

      // Registra em CONFIG_CAMADAS
      CONFIG_CAMADAS[id] = {
        nome: nome,
        grupo: 'importadas',   // reaproveita a seção "Camadas Importadas" do painel
        arquivos: [],
        cor: cor,
        opacidade: 0.25,
        peso: 1.5,
        tipoGeo: 'poligono',
        ativa: true,
        camposVisiveis: [],
        _isBuffer: true,
        _camadaOrigem: camadaOrigemId,
        _raioKm: raioKm,
        _dissolve: dissolve
      };

      // Salva dados
      DADOS_GEOJSON_BRUTOS[id] = geojson;

      // Renderiza no mapa
      CAMADAS_MAPA[id] = L.geoJSON(geojson, {
        pane: 'paneBuffer',         // ✅ pane dedicada (650) — recebe cliques
        interactive: true,
        bubblingMouseEvents: false,
        style: {
          color: cor,
          weight: 2,
          opacity: 0.8,
          fillColor: cor,
          fillOpacity: 0.25,
          dashArray: '5, 5'
        },
        onEachFeature: (f, layer) => {
          const p = f.properties || {};

          // ✅ Calcula área do buffer
          let areaKm2 = 0;
          try {
            const areaM2 = turf.area(f);
            areaKm2 = areaM2 / 1_000_000;
          } catch (e) { /* ignora */ }

          const props = p._dissolved
            ? {
                Nome: `Buffer unificado · ${raioKm} km`,
                Origem: nomeBase,
                'Feições origem': p._count,
                'Raio': `${raioKm} km`,
                'Área total': areaKm2 >= 1000
                  ? `${(areaKm2 / 1000).toFixed(2)} mil km²`
                  : `${areaKm2.toFixed(2)} km²`
              }
            : {
                Nome: `Buffer · ${raioKm} km`,
                Origem: nomeBase,
                'Raio': `${raioKm} km`,
                'Área': areaKm2 >= 1
                  ? `${areaKm2.toFixed(2)} km²`
                  : `${(areaKm2 * 100).toFixed(2)} ha`
              };

          // ✅ Constrói popup próprio (mais limpo que o genérico)
          const linhas = Object.entries(props).map(([k, v]) =>
            `<div class="pop-linha">
              <span class="pop-lbl">${window.Security.escapeHTML(k)}:</span>
              <span class="pop-val">${window.Security.escapeHTML(v)}</span>
            </div>`
          ).join('');

          const html = `
            <div class="pop-topo">⭕ Buffer Geodésico</div>
            <div class="pop-corpo">${linhas}</div>
            <div class="pop-rodape-auditoria">
              <span>Origem: ${window.Security.escapeHTML(nomeBase)}</span>
              <span>Turf.js · ${new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          `;
          // ✅ Popup abre no centroide (posição consistente)
          layer.getPopupAnchor = () => [0, 0];
          layer.on('click', (e) => {
            // Recalcula o centro do buffer pra centralizar o popup
            try {
              const centro = layer.getBounds().getCenter();
              layer.setLatLng && layer.setLatLng(centro);   // só pra polígono
            } catch (e) { /* ignora */ }
          });
          layer.bindPopup(html);

          // ✅ Tooltip ao passar o mouse
          layer.bindTooltip(`⭕ Buffer ${raioKm} km`, {
            sticky: true,
            className: 'rotulo-hover-feicao'
          });
        }
      });

      CAMADAS_MAPA[id].addTo(window.mapa);

      // Adiciona no painel lateral
      const grupoEl = document.getElementById('grupo-importadas');
      const msgVazio = document.getElementById('msg-sem-importadas');
      if (msgVazio) msgVazio.style.display = 'none';

      if (grupoEl) {
        grupoEl.classList.remove('fechado');
        if (typeof window.construirItemCamada === 'function') {
          window.construirItemCamada(id, CONFIG_CAMADAS[id], grupoEl);
        }
        const cntBadge = document.getElementById(`cnt-${id}`);
        if (cntBadge) cntBadge.innerText = `(${geojson.features.length})`;
        setTimeout(() => {
          const item = document.getElementById(`item-camada-${id}`);
          if (item) {
            item.style.display = 'flex';   // ✅ Força visível mesmo se estava "oculta"
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          // ✅ Confirma que o item foi criado
          console.log('[Buffer] Item criado:', !!item, '| ID:', id);
        }, 50);
      }

      // Ajusta zoom pro resultado
      try {
        const bounds = CAMADAS_MAPA[id].getBounds();
        if (bounds.isValid()) window.mapa.fitBounds(bounds, { padding: [40, 40] });
      } catch (e) { /* ignora */ }

      // Atualiza selects e legenda
      if (window.Styler) window.Styler.atualizarLegenda();
      if (window.FilterManager) window.FilterManager.atualizarSeletorCamadas();
    }
  };

  window.BufferTool = BufferTool;
  console.info('[js] BufferTool carregado (M9)');
})();