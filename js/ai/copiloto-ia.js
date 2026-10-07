/* ============================================================
   WebGIS ANTAQ — Módulo: CopilotoIA
   Escopo: assistente virtual regulatório + IA (local/nuvem)
   Dependências: window.Security, window.UI, window.DADOS_GEOJSON_BRUTOS,
                 window.PortClassification, window.mapa
   Referências "lazy": window.Analytics, window.SearchEngine
   Expõe: window.CopilotoIA
   ============================================================ */
(function () {
  'use strict';

  const CopilotoIA = {
    aberto: false,
    provedor: localStorage.getItem('antaq_ia_provedor') || 'heuristico',
    apiKey: localStorage.getItem('antaq_ia_key') || '',
    urlLocal: localStorage.getItem('antaq_ia_url') || 'http://localhost:11434/v1',
    ultimoAtivoInspecionado: null,

    /* 1e-1: histórico e última resposta */
    _historico: [],
    _maxHistorico: 15,
    _ultimaResposta: null,   // { pergunta, html, textoPlano, features, camadaId, tipo }

    toggle: function () {
      const p = document.getElementById('painel-copiloto');
      if (!p) return;
      this.aberto = !this.aberto;
      p.classList.toggle('aberto', this.aberto);

      if (this.aberto) {
        const inp = document.getElementById('copiloto-input');
        if (inp) inp.focus();
        const sel = document.getElementById('ia-provedor');
        if (sel) sel.value = this.provedor;
        this.onMudarProvedor(this.provedor);
      }
    },

    toggleConfig: function () {
      const b = document.getElementById('copiloto-config-box');
      if (b) b.style.display = (b.style.display === 'none') ? 'block' : 'none';
    },

    onMudarProvedor: function (val) {
      this.provedor = val;
      const boxKey = document.getElementById('box-api-key');
      const boxUrl = document.getElementById('box-url-local');
      if (boxKey) boxKey.style.display = (val === 'gemini' || val === 'openai') ? 'block' : 'none';
      if (boxUrl) boxUrl.style.display = (val === 'local') ? 'block' : 'none';
    },

    salvarConfig: function () {
      const selProv = document.getElementById('ia-provedor');
      this.provedor = selProv ? selProv.value : 'heuristico';
      const inpKey = document.getElementById('ia-api-key');
      this.apiKey = inpKey ? inpKey.value : '';
      const inpUrl = document.getElementById('ia-url-local');
      this.urlLocal = inpUrl ? inpUrl.value : 'http://localhost:11434/v1';

      localStorage.setItem('antaq_ia_provedor', this.provedor);
      localStorage.setItem('antaq_ia_key', this.apiKey);
      localStorage.setItem('antaq_ia_url', this.urlLocal);

      this.toggleConfig();
      if (window.UI) window.UI.toast(`Configurações de IA salvas: [${this.provedor.toUpperCase()}]`);
      this.adicionarMensagem('ia', `Configuração atualizada. Modo ativo: <strong>${this.provedor.toUpperCase()}</strong>.`);
    },

    adicionarMensagem: function (tipo, html) {
      const c = document.getElementById('copiloto-mensagens');
      if (!c) return;
      const div = document.createElement('div');
      div.className = (tipo === 'usuario') ? 'msg-usuario' : 'msg-ia';
      div.innerHTML = html;
      c.appendChild(div);
      c.scrollTop = c.scrollHeight;
    },

    enviarComandoPredefinido: function (texto) {
      const inp = document.getElementById('copiloto-input');
      if (inp) inp.value = texto;
      this.enviar();
    },
    perguntarSeguro: function (texto, botao) {
      // ✅ Dupla proteção: botão E processamento
      if (botao) {
        if (botao.disabled) {
          console.log('[Copiloto] Botão já desabilitado, ignorando.');
          return;
        }
        botao.disabled = true;
        botao.style.opacity = '0.5';
        botao.style.cursor = 'not-allowed';
        setTimeout(() => {
          botao.disabled = false;
          botao.style.opacity = '';
          botao.style.cursor = '';
        }, 2000);   // ← aumenta pra 2s
      }

      if (this._processando) {
        console.log('[Copiloto] Já processando, ignorando clique.');
        return;
      }

      return this.enviarComandoPredefinido(texto);
    },
    perguntar: function (texto) { return this.enviarComandoPredefinido(texto); },
    enviarMensagem: function () { return this.enviar(); },

    enviar: async function () {
      const inp = document.getElementById('copiloto-input');
      if (!inp) return;

      const texto = inp.value.trim();
      if (!texto) return;

      // Normaliza pra comparação (remove espaços múltiplos, tabs)
      const normalizar = (s) => String(s).trim().replace(/\s+/g, ' ');
      const textoNorm = normalizar(texto);
      const container = document.getElementById('copiloto-mensagens');

      // BLOQUEIO 1: mesma pergunta já está no chat?
      if (container) {
        const ultimasUser = container.querySelectorAll('.msg-usuario');
        if (ultimasUser.length > 0) {
          const ultimaPergunta = normalizar(ultimasUser[ultimasUser.length - 1].textContent);
          if (ultimaPergunta === textoNorm) {
            console.log('[Copiloto] Pergunta idêntica já no chat, bloqueando.');
            inp.value = '';
            return;
          }
        }
      }

      // BLOQUEIO 2: já está processando?
      if (this._processando) {
        console.log('[Copiloto] Processando consulta anterior, ignorando.');
        inp.value = '';
        return;
      }

      this._processando = true;
      this._limparBarrasAntigas();

      // Limpa estado
      this._ultimaContagem = null;
      this._ultimoRanking = null;
      this._ultimaFicha = null;
      this._ultimoResultadoGeo = null;
      this._ultimaResposta = null;

      this.adicionarMensagem('usuario', window.Security.escapeHTML(textoNorm));
      inp.value = '';

      const idWait = 'msg-wait-' + Date.now();
      this.adicionarMensagem('ia', '<span id="' + idWait + '">⏳ Processando consulta espacial e regulatória...</span>');

      try {
        let respostaHTML = '';
        if (this.provedor === 'heuristico' || !this.apiKey) respostaHTML = await this.executarMotorHeuristico(texto);
        else if (this.provedor === 'gemini') respostaHTML = await this.chamarGemini(texto);
        else if (this.provedor === 'openai') respostaHTML = await this.chamarOpenAI(texto);
        else if (this.provedor === 'local') respostaHTML = await this.chamarOllamaLocal(texto);

        const waitEl = document.getElementById(idWait);
        if (waitEl && waitEl.parentElement) {
          const msgDiv = waitEl.parentElement;

          // Remove TODAS as barras de ação (inclusive as que chegaram em paralelo)
          document.querySelectorAll('#copiloto-mensagens .copiloto-acoes-resposta')
            .forEach(b => b.remove());

          const acoesHTML = this._montarBarraAcoes(texto, respostaHTML);
          msgDiv.innerHTML = respostaHTML + acoesHTML;
        }

        this._registrarNoHistorico(texto, respostaHTML);
      } catch (err) {
        console.error(err);
        const waitEl = document.getElementById(idWait);
        if (waitEl && waitEl.parentElement) {
          waitEl.parentElement.innerHTML = '⚠️ <strong>Falha na consulta:</strong> ' +
            window.Security.escapeHTML(err.message || 'Erro inesperado');
        }
      } finally {
        this._processando = false;
      }
    },

    executarMotorHeuristico: async function (comando) {
      // 1. Parser classifica a intenção
      const intencao = window.IntentParser.interpretar(comando);
      console.log('[CopilotoIA] Intenção:', intencao);

      // 2. Dispatch por tipo
      try {
        switch (intencao.tipo) {
          case 'contagem':
            
            return await this._responderContagem(intencao);
          case 'agrupamento':
            return await this._responderAgrupamento(intencao);
          case 'contido':
            return await this._responderContido(intencao);

          case 'cruza_uf':
            return await this._responderCruzaUF(intencao);

          case 'buffer_ponto':
            return await this._responderBufferPonto(intencao);
          case 'resumo_ven':
            return this._responderResumoVEN();

          case 'metodologia_ven':
            return this._responderMetodologiaVEN();
          case 'ranking':
            return await this._responderRanking(intencao);

          case 'ficha':
            return await this._responderFicha(intencao);

          case 'geo':
            return await this._responderGeo(intencao);

          case 'comparacao':
            return await this._responderComparacao(intencao);

          case 'zoom':
            document.getElementById('input-busca').value = intencao.termo;
            if (window.SearchEngine) window.SearchEngine.executar();
            return `🔍 Buscando: <em>"${window.Security.escapeHTML(intencao.termo)}"</em>.`;

          case 'nota_tecnica': {
            const ativo = this.ultimoAtivoInspecionado ||
              (DADOS_GEOJSON_BRUTOS['instalacoes_portuarias']?.features?.[0]);
            if (!ativo) return "Clique primeiro em uma instalação portuária no mapa.";
            return this.gerarMinutaNotaTecnica(ativo.properties || {});
          }

          case 'vazio':
            return 'Faça uma pergunta. Ex.: "Quantos portos no Pará?"';

          default:
            return this._respostaGenerica(comando);
        }
      } catch (err) {
        console.error('[CopilotoIA] Erro ao processar intenção:', err);
        return `⚠️ <strong>Erro ao processar:</strong> ${window.Security.escapeHTML(err.message || 'desconhecido')}`;
      }
    },

    _respostaGenerica: function (comando) {
      return `Não consegui classificar sua pergunta: <em>"${window.Security.escapeHTML(comando)}"</em>.<br><br>
              💡 <strong>Tente algo assim:</strong><br>
              • <code>"Quantos portos no Pará?"</code><br>
              • <code>"Top 10 maiores portos"</code><br>
              • <code>"Me fale sobre Santos"</code><br>
              • <code>"Portos a menos de 50km de TIs"</code><br>
              • <code>"O que mudou entre VEN 2022 e 2024?"</code>`;
    },

    /* ============================================================
       HANDLERS ESPECIAIS (perguntas pré-definidas)
       ============================================================ */

    _responderAgrupamento: async function (intencao) {
      const dados = await this._obterDados(intencao.camada);
      if (!dados?.features?.length) return 'Sem dados carregados.';

      if (intencao.agruparPor === 'regime') {
        const contagem = {};
        for (const f of dados.features) {
          const cat = window.PortClassification.classificar(f.properties || {});
          contagem[cat.id] = (contagem[cat.id] || 0) + 1;
        }

        const linhas = Object.entries(contagem)
          .sort((a, b) => b[1] - a[1])
          .map(([id, qtd]) => {
            const cat = window.PortClassification.tipos[id] || { nome: id, cor: '#64748b' };
            return `
              <tr>
                <td style="padding:5px 8px;">
                  <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${cat.cor};border:2px solid #fff;vertical-align:middle;margin-right:6px;"></span>
                  <span style="font-size:11px;color:#e2e8f0;">${window.Security.escapeHTML(cat.nome)}</span>
                </td>
                <td style="padding:5px 8px;color:#38bdf8;font-family:Consolas,monospace;font-size:12px;font-weight:700;text-align:right;">${qtd}</td>
                <td style="padding:5px 8px;color:#94a3b8;font-size:10px;text-align:right;">${((qtd / dados.features.length) * 100).toFixed(1)}%</td>
              </tr>`;
          }).join('');

        this._ultimaContagem = { camadaId: intencao.camada, features: dados.features };

        return `
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
            ⚓ ${dados.features.length.toLocaleString('pt-BR')} ativos por regime
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="border-bottom:1px solid #334155;">
              <th style="text-align:left;padding:4px 8px;color:#94a3b8;font-size:9.5px;">Regime</th>
              <th style="text-align:right;padding:4px 8px;color:#94a3b8;font-size:9.5px;">Qtd</th>
              <th style="text-align:right;padding:4px 8px;color:#94a3b8;font-size:9.5px;">%</th>
            </tr></thead>
            <tbody>${linhas}</tbody>
          </table>
        `;
      }

      return 'Tipo de agrupamento não implementado.';
    },

    _responderResumoVEN: function () {
      return `
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
          🌊 Resumo VEN 2024 & Amazônia
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div style="background:rgba(2,132,199,0.15);border-left:3px solid #38bdf8;padding:8px 10px;border-radius:5px;">
            <div style="font-size:9.5px;color:#94a3b8;text-transform:uppercase;">Extensão total</div>
            <div style="font-size:18px;color:#38bdf8;font-weight:800;font-family:Consolas,monospace;">20.404 km</div>
          </div>
          <div style="background:rgba(16,185,129,0.15);border-left:3px solid #10b981;padding:8px 10px;border-radius:5px;">
            <div style="font-size:9.5px;color:#94a3b8;text-transform:uppercase;">Amazônia</div>
            <div style="font-size:18px;color:#34d399;font-weight:800;font-family:Consolas,monospace;">16.837 km</div>
          </div>
        </div>
        <div style="font-size:11px;color:#cbd5e1;line-height:1.5;">
          📈 <strong>Crescimento vs 2022:</strong> +213 km (+1.06%)<br>
          🌳 <strong>Concentração amazônica:</strong> 82.52% da malha navegável nacional<br>
          ⚙️ <strong>Aderência ao PNV planejado:</strong> 48.91% (41.720 km previstos)
        </div>
        <div style="margin-top:10px;">
          <button onclick="MatrizVENManager.abrirModal()"
                  style="background:#0284c7;color:#fff;border:none;padding:6px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            ⏱️ Abrir Matriz VEN
          </button>
        </div>
      `;
    },

    _responderMetodologiaVEN: function () {
      return `
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
          📚 Metodologia · Matriz VEN
        </div>
        <div style="font-size:11px;color:#cbd5e1;line-height:1.6;">
          A <strong>Matriz de Navegação VEN</strong> é calculada pelo SIGTAQ/SEPH a partir de:<br><br>
          <strong>1. Bases de dados federais:</strong><br>
          &bull; SDP/ANTAQ · atracações e movimentações<br>
          &bull; Sistema Mercante · manifestos de transporte<br>
          &bull; DNIT · calados e dragagens<br><br>
          <strong>2. Modelagem espacial:</strong><br>
          &bull; Caminhos mínimos O/D com eliminação de sobreposições<br>
          &bull; Datum: SIRGAS 2000 (CONCAR)<br>
          &bull; Escalas: 1:1.000.000 e 1:250.000<br><br>
          <strong>3. Indicadores:</strong><br>
          &bull; Extensão por trecho (km)<br>
          &bull; Velocidade comercial média (km/h)<br>
          &bull; Tempo de percurso estimado (dias/horas)<br>
          &bull; Eclusas e restrições físicas
        </div>
        <div style="margin-top:10px;">
          <button onclick="MatrizVENManager.abrirModal()"
                  style="background:#0284c7;color:#fff;border:none;padding:6px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            ⏱️ Ver Matriz Completa
          </button>
        </div>
      `;
    },    
    /* ============================================================
       HANDLERS DE RESPOSTA (Copiloto 1b)
       ============================================================ */

    _responderContagem: async function (intencao) {
      const camadaId = intencao.camada;
      const dados = await this._obterDados(camadaId);

      if (!dados || !dados.features || !dados.features.length) {
        return `Sem dados carregados para <strong>${camadaId}</strong>.`;
      }

      // Aplica filtros
      let features = dados.features;
      const filtroAplicado = [];

      if (intencao.filtro?.uf) {
        features = features.filter(f => {
          const uf = this._extrairUF(f);
          return uf === intencao.filtro.uf;
        });
        filtroAplicado.push(`UF = <strong>${intencao.filtro.uf}</strong>`);
      }

      if (intencao.filtro?.regime && camadaId === 'instalacoes_portuarias') {
        features = features.filter(f => {
          const cat = window.PortClassification.classificar(f.properties || {});
          return cat.id === intencao.filtro.regime;
        });
        const cat = window.PortClassification.tipos[intencao.filtro.regime];
        filtroAplicado.push(`Regime = <strong>${cat?.nome || intencao.filtro.regime}</strong>`);
      }

      if (intencao.filtro?.regiao) {
        const ufsRegiao = {
          'norte': ['AC','AP','AM','PA','RO','RR','TO'],
          'nordeste': ['AL','BA','CE','MA','PB','PE','PI','RN','SE'],
          'centro-oeste': ['DF','GO','MT','MS'],
          'sudeste': ['ES','MG','RJ','SP'],
          'sul': ['PR','RS','SC'],
          'amazonia legal': ['AC','AP','AM','MA','MT','PA','RO','RR','TO']
        }[intencao.filtro.regiao] || [];
        features = features.filter(f => ufsRegiao.includes(this._extrairUF(f)));
        filtroAplicado.push(`Região = <strong>${intencao.filtro.regiao}</strong>`);
      }

      const nomeCamada = window.CONFIG_CAMADAS[camadaId]?.nome || camadaId;
      const total = features.length;
      const totalGeral = dados.features.length;
      const pct = totalGeral > 0 ? ((total / totalGeral) * 100).toFixed(1) : '0';

      const filtrosTexto = filtroAplicado.length > 0
        ? `<br><small style="color:#94a3b8;">Filtros: ${filtroAplicado.join(' · ')}</small>`
        : '';
      // ✅ Guarda as features filtradas pra destacar depois
      this._ultimaContagem = { camadaId, features };
      return `
        <div style="background:rgba(2,132,199,0.15);border-left:3px solid #38bdf8;padding:10px 12px;border-radius:6px;">
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Contagem</div>
          <div style="font-size:22px;color:#38bdf8;font-weight:800;font-family:Consolas,monospace;margin:4px 0;">${total.toLocaleString('pt-BR')}</div>
          <div style="font-size:11.5px;color:#e2e8f0;">${nomeCamada}</div>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:4px;">${pct}% do total (${totalGeral.toLocaleString('pt-BR')} feições)${filtrosTexto}</div>
        </div>
        ${total > 0 ? `<div style="margin-top:8px;font-size:10.5px;">
          <button onclick="CopilotoIA._destacarContagem()"
                  style="background:#0284c7;color:#fff;border:none;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            🗺️ Destacar no mapa
          </button>
        </div>` : ''}
      `;
    },

    _responderRanking: async function (intencao) {
      const camadaId = intencao.camada;
      const dados = await this._obterDados(camadaId);

      if (!dados || !dados.features || !dados.features.length) {
        return `Sem dados carregados para <strong>${camadaId}</strong>.`;
      }

      // ✅ Lista de campos numéricos candidatos (por prioridade)
      const CAMPOS_EXTENSAO = ['extensao', 'EXTENSAO', 'extensao_km', 'comprimento', 'length', 'length_km'];
      const CAMPOS_AREA = ['area_m2', 'AREA_M2', 'area', 'AREA', 'area_km2', 'shape_area', 'Shape_Area', 'area_total'];
      const CAMPOS_OUTROS = ['volume', 'VOLUME', 'carga', 'movimentacao', 'tonelagem'];

      // Inspeciona várias amostras (não só a primeira) pra achar um campo que tenha valor numérico
      const amostraTamanho = Math.min(10, dados.features.length);
      const chavesComuns = {};

      for (let i = 0; i < amostraTamanho; i++) {
        const p = dados.features[i].properties || {};
        for (const [k, v] of Object.entries(p)) {
          const num = parseFloat(v);
          if (Number.isFinite(num) && num > 0 && !chavesComuns[k]) {
            chavesComuns[k] = num;
          }
        }
      }

      const camposNumericos = Object.keys(chavesComuns);
      console.log('[Copiloto] Campos numéricos disponíveis:', camposNumericos);

      // Detecta o melhor campo
      let campo = null;
      let rotulo = '';
      let formatarValor = null;

      for (const c of CAMPOS_EXTENSAO) {
        if (camposNumericos.includes(c)) {
          campo = c;
          rotulo = 'Extensão (km)';
          formatarValor = (v) => `${v.toFixed(2)} km`;
          break;
        }
      }

      if (!campo) {
        for (const c of CAMPOS_AREA) {
          if (camposNumericos.includes(c)) {
            campo = c;
            rotulo = 'Área';
            formatarValor = (v) => v >= 1_000_000
              ? `${(v / 1_000_000).toFixed(2)} km²`
              : `${(v / 10_000).toFixed(2)} ha`;
            break;
          }
        }
      }

      if (!campo) {
        for (const c of CAMPOS_OUTROS) {
          if (camposNumericos.includes(c)) {
            campo = c;
            rotulo = c;
            formatarValor = (v) => v.toLocaleString('pt-BR');
            break;
          }
        }
      }

      // Fallback: usa o primeiro campo numérico achado (exceto IDs/códigos)
      if (!campo) {
        const IGNORAR = [
          'id', 'codigo', 'cep', 'cnpj', 'cdi', 'gid', 'objectid', 'idhidrovia', 'idseq',
          'numero', 'num', 'n_', 'seq', 'cod', 'matricula', 'registro', 'processo'
        ];
        const candidatoFallback = camposNumericos.find(c => {
          const cl = c.toLowerCase();
          return !IGNORAR.some(ig => cl.includes(ig));
        });
        if (candidatoFallback) {
          campo = candidatoFallback;
          rotulo = campo;
          formatarValor = (v) => v.toLocaleString('pt-BR');
        }
      }

      // ✅ Se NÃO há campo numérico útil, agrupa por UF (mais útil que alfabético)
      if (!campo) {
        const porUF = {};
        for (const f of dados.features) {
          const uf = this._extrairUF(f);
          if (!uf) continue;
          porUF[uf] = (porUF[uf] || 0) + 1;
        }

        const rankingUF = Object.entries(porUF)
          .sort((a, b) => intencao.criterio === 'asc' ? a[1] - b[1] : b[1] - a[1])
          .slice(0, intencao.n);

        const nomeCamada2 = window.CONFIG_CAMADAS[camadaId]?.nome || camadaId;
        let linhasUF = '';
        rankingUF.forEach(([uf, qtd], i) => {
          linhasUF += `<tr>
            <td style="text-align:right;color:#64748b;font-family:Consolas,monospace;padding:3px 6px;">${i + 1}º</td>
            <td style="padding:3px 6px;color:#e2e8f0;font-size:11px;font-weight:700;">${uf}</td>
            <td style="padding:3px 6px;color:#38bdf8;font-family:Consolas,monospace;font-size:11px;text-align:right;">${qtd.toLocaleString('pt-BR')}</td>
          </tr>`;
        });

        // ✅ Guarda os dados agrupados pra exportar CSV de UFs
        this._ultimoRanking = {
          camadaId,
          tipo: 'agrupamento_uf',
          agrupamento: rankingUF,
          features: []  // ← vazio: não tem features individuais
        };

        return `
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
            🏆 Top ${intencao.n} UFs · ${nomeCamada2}
          </div>
          <div style="font-size:10px;color:#64748b;margin-bottom:8px;font-style:italic;">
            ℹ️ Os dados de portos não possuem métrica numérica de tamanho. Mostrando ranking por <strong>quantidade de instalações por UF</strong>.
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead><tr style="border-bottom:1px solid #334155;">
              <th style="text-align:right;padding:3px 6px;color:#94a3b8;font-size:9.5px;">#</th>
              <th style="text-align:left;padding:3px 6px;color:#94a3b8;font-size:9.5px;">UF</th>
              <th style="text-align:right;padding:3px 6px;color:#94a3b8;font-size:9.5px;">Instalações</th>
            </tr></thead>
            <tbody>${linhasUF}</tbody>
          </table>
          <div style="margin-top:8px;">
            <button onclick="CopilotoIA._exportarUltimaResposta(this)"
                    style="background:rgba(2,132,199,0.15);border:1px solid rgba(56,189,248,0.35);color:#7dd3fc;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;">
              💾 CSV (UFs)
            </button>
          </div>
        `;
      }

      // Se achou métrica, ordena normalmente
      const ordenado = [...dados.features].sort((a, b) => {
        const va = parseFloat(a.properties?.[campo]) || 0;
        const vb = parseFloat(b.properties?.[campo]) || 0;
        return intencao.criterio === 'asc' ? va - vb : vb - va;
      });

      const topN = ordenado.slice(0, intencao.n);
      const nomeCamada = window.CONFIG_CAMADAS[camadaId]?.nome || camadaId;

      let linhas = '';
      topN.forEach((f, i) => {
        const p = f.properties || {};
        const nome = p.nome || p.NOME_INSTALACAO || p.nome_rio || p.NOME_RIO || p.SIGLA_UF || '—';
        const valor = campo ? parseFloat(p[campo] || 0) : 0;
        const valorFmt = formatarValor ? formatarValor(valor) : '—';
        const uf = this._extrairUF(f) || '—';

        linhas += `<tr>
          <td style="text-align:right;color:#64748b;font-family:Consolas,monospace;padding:3px 6px;">${i + 1}º</td>
          <td style="padding:3px 6px;color:#e2e8f0;font-size:10.5px;">${window.Security.escapeHTML(nome)}</td>
          <td style="padding:3px 6px;color:#38bdf8;font-family:Consolas,monospace;font-size:10.5px;text-align:right;">${valorFmt}</td>
          <td style="padding:3px 6px;color:#94a3b8;font-size:10px;">${uf}</td>
        </tr>`;
      });

      // Salva o ranking pra destacar no mapa
      this._ultimoRanking = { camadaId, features: topN };

      return `
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
          🏆 Top ${intencao.n} · ${nomeCamada} · <span style="color:#38bdf8;">${rotulo}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead><tr style="border-bottom:1px solid #334155;">
            <th style="text-align:right;padding:3px 6px;color:#94a3b8;font-size:9.5px;">#</th>
            <th style="text-align:left;padding:3px 6px;color:#94a3b8;font-size:9.5px;">Nome</th>
            <th style="text-align:right;padding:3px 6px;color:#94a3b8;font-size:9.5px;">${rotulo}</th>
            <th style="text-align:left;padding:3px 6px;color:#94a3b8;font-size:9.5px;">UF</th>
          </tr></thead>
          <tbody>${linhas}</tbody>
        </table>
        <div style="margin-top:8px;">
          <button onclick="CopilotoIA._destacarRanking()"
                  style="background:#0284c7;color:#fff;border:none;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            🗺️ Destacar ${topN.length} no mapa
          </button>
        </div>
      `;
    },

    _responderFicha: async function (intencao) {
      const alvo = intencao.alvo;
      const buscaNorm = alvo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Busca em todas as camadas
      let achado = null;
      for (const [id, dados] of Object.entries(DADOS_GEOJSON_BRUTOS)) {
        if (!dados || !dados.features) continue;
        for (const f of dados.features) {
          const p = f.properties || {};
          const nome = String(p.nome || p.NOME_INSTALACAO || p.nome_rio || p.NOME_RIO || p.terrai_nom || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (nome.includes(buscaNorm)) {
            achado = { feature: f, camadaId: id };
            break;
          }
        }
        if (achado) break;
      }

      if (!achado) {
        return `Não encontrei nada com "<strong>${window.Security.escapeHTML(alvo)}</strong>".<br><br>
                Tente o nome exato de um porto, rio ou travessia.`;
      }

      const p = achado.feature.properties || {};
      const nomeCamada = window.CONFIG_CAMADAS[achado.camadaId]?.nome || achado.camadaId;

      // ✅ Prioriza campos informativos (não corta na 12ª chave)
      const PRIORITARIOS = ['nome', 'tipo', 'modalidade', 'situacao', 'estado', 'cidade', 'endereco', 'bairro', 'companhia', 'cnpj', 'legislacao', 'observacao', 'fonte', 'gestao'];
      const todos = Object.keys(p).filter(k =>
        !['geom', 'geometry', 'id', 'gid', 'objectid'].includes(k.toLowerCase())
      );

      // Ordena: prioritários primeiro (na ordem da lista), depois os outros
      const ordenadas = [
        ...PRIORITARIOS.filter(k => todos.includes(k)),
        ...todos.filter(k => !PRIORITARIOS.includes(k))
      ];

      let linhas = '';
      for (const k of ordenadas.slice(0, 15)) {
        const v = p[k];
        if (v === null || v === undefined || v === '') continue;
        linhas += `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed rgba(148,163,184,0.15);gap:8px;">
          <span style="color:#94a3b8;font-size:10px;font-weight:600;flex-shrink:0;">${window.Security.escapeHTML(k)}</span>
          <span style="color:#e2e8f0;font-size:10.5px;text-align:right;word-break:break-word;">${window.Security.escapeHTML(v)}</span>
        </div>`;
      }
      // ✅ Guarda a feature encontrada pra destacar
      this._ultimaFicha = achado;

      return `
        <div style="font-size:12px;color:#38bdf8;font-weight:800;margin-bottom:6px;">${window.Security.escapeHTML(p.nome || p.NOME_INSTALACAO || p.nome_rio || alvo)}</div>
        <div style="font-size:9.5px;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${nomeCamada}</div>
        ${linhas}
        <div style="margin-top:8px;">
          <button onclick="CopilotoIA._destacarFicha()"
                  style="background:#0284c7;color:#fff;border:none;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            🗺️ Ver no mapa
          </button>
        </div>
      `;
    },

    _responderGeo: async function (intencao) {
      if (!intencao.alvo) {
        return `Preciso saber <strong>perto do quê</strong>. Tente:<br>
                • <code>"Portos a menos de 50km de TIs"</code><br>
                • <code>"Portos a menos de 100km de UCs"</code>`;
      }

      const dadosOrigem = await this._obterDados(intencao.camada);
      const dadosAlvo = await this._obterDados(intencao.alvo);

      if (!dadosOrigem?.features?.length) return `Sem dados em <strong>${intencao.camada}</strong>.`;
      if (!dadosAlvo?.features?.length) return `Sem dados em <strong>${intencao.alvo}</strong>.`;

      if (typeof turf === 'undefined') return 'Biblioteca Turf.js indisponível.';

      const raioKm = intencao.raio;
      const resultados = [];

      for (const f of dadosOrigem.features) {
        const ponto = this._pontoDe(f);
        if (!ponto) continue;

        let achouPerto = false;
        for (const alvo of dadosAlvo.features) {
          const dist = this._distanciaAproximada(ponto, alvo);
          if (dist !== null && dist <= raioKm) {
            achouPerto = true;
            break;
          }
        }
        if (achouPerto) resultados.push(f);
      }

      const nomeOrigem = window.CONFIG_CAMADAS[intencao.camada]?.nome || intencao.camada;
      const nomeAlvo = window.CONFIG_CAMADAS[intencao.alvo]?.nome || intencao.alvo;

      // Guarda resultado pro botão "ver no mapa"
      this._ultimoResultadoGeo = resultados;

      return `
        <div style="background:rgba(16,185,129,0.12);border-left:3px solid #10b981;padding:10px 12px;border-radius:6px;">
          <div style="font-size:11px;color:#a7f3d0;text-transform:uppercase;letter-spacing:0.5px;">Análise geoespacial</div>
          <div style="font-size:22px;color:#34d399;font-weight:800;font-family:Consolas,monospace;margin:4px 0;">${resultados.length.toLocaleString('pt-BR')}</div>
          <div style="font-size:11.5px;color:#e2e8f0;">${nomeOrigem}</div>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:4px;">
            Dentro de <strong>${raioKm} km</strong> de ${nomeAlvo}
          </div>
        </div>
        ${resultados.length > 0 ? `<div style="margin-top:8px;">
          <button onclick="CopilotoIA._destacarGeo()"
                  style="background:#10b981;color:#fff;border:none;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            🗺️ Destacar no mapa
          </button>
        </div>` : ''}
      `;
    },
    /* ============================================================
       1c — HANDLERS GEOGRÁFICOS AVANÇADOS
       ============================================================ */

    _responderContido: async function (intencao) {
      const dadosOrigem = await this._obterDados(intencao.camada);
      if (!dadosOrigem?.features?.length) return `Sem dados em <strong>${intencao.camada}</strong>.`;

      // ✅ Verifica se a camada alvo existe nos dados
      const dadosAlvo = await this._obterDados(intencao.alvo);

      // Se NÃO existe, tenta fallback por região conhecida (ex: Amazônia Legal = lista de UFs)
      if (!dadosAlvo?.features?.length) {
        const regioes = {
          'estados_amazonia_legal': {
            nome: 'Amazônia Legal',
            ufs: ['AC','AP','AM','MA','MT','PA','RO','RR','TO']
          }
        };
        const regiao = regioes[intencao.alvo];
        if (regiao) {
          return this._responderContidoPorUF(intencao, dadosOrigem, regiao);
        }
        return `Camada <strong>${intencao.alvoNome || intencao.alvo}</strong> indisponível.`;
      }

      if (typeof turf === 'undefined') return 'Turf.js indisponível.';

      // Filtra só polígonos do alvo
      const poligonos = dadosAlvo.features.filter(f =>
        f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
      );
      if (!poligonos.length) {
        return `A camada <strong>${intencao.alvoNome || intencao.alvo}</strong> não tem polígonos.`;
      }

      // Testa ponto-em-polígono
      const dentro = [];
      for (const f of dadosOrigem.features) {
        const ponto = this._pontoDe(f);
        if (!ponto) continue;
        const ptGeoJSON = { type: 'Point', coordinates: [ponto[1], ponto[0]] };
        for (const poly of poligonos) {
          try {
            if (turf.booleanPointInPolygon(ptGeoJSON, poly)) {
              dentro.push(f);
              break;
            }
          } catch (e) { /* ignora */ }
        }
      }

      const nomeOrigem = window.CONFIG_CAMADAS[intencao.camada]?.nome || intencao.camada;
      const nomeAlvo = intencao.alvoNome || window.CONFIG_CAMADAS[intencao.alvo]?.nome || intencao.alvo;

      this._ultimaContagem = { camadaId: intencao.camada, features: dentro };

      const pct = dadosOrigem.features.length > 0
        ? ((dentro.length / dadosOrigem.features.length) * 100).toFixed(1)
        : '0';

      return `
        <div style="background:rgba(139,92,246,0.15);border-left:3px solid #8b5cf6;padding:10px 12px;border-radius:6px;">
          <div style="font-size:11px;color:#c4b5fd;text-transform:uppercase;letter-spacing:0.5px;">Análise espacial · contenção</div>
          <div style="font-size:22px;color:#a78bfa;font-weight:800;font-family:Consolas,monospace;margin:4px 0;">${dentro.length.toLocaleString('pt-BR')}</div>
          <div style="font-size:11.5px;color:#e2e8f0;">${nomeOrigem}</div>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:4px;">
            Dentro de <strong>${nomeAlvo}</strong> · ${pct}% do total (${dadosOrigem.features.length.toLocaleString('pt-BR')})
          </div>
        </div>
        ${dentro.length > 0 ? `<div style="margin-top:8px;">
          <button onclick="CopilotoIA._destacarContagem()"
                  style="background:#8b5cf6;color:#fff;border:none;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            🗺️ Destacar no mapa
          </button>
        </div>` : ''}
      `;
    },

    /**
     * Fallback: contenção por lista de UFs (quando camada poligonal não existe).
     */
    /**
     * Fallback: contenção por lista de UFs (quando camada poligonal não existe).
     * Se a feição não tem UF nos atributos, faz lookup geográfico pelo centroide.
     */
    _responderContidoPorUF: async function (intencao, dadosOrigem, regiao) {
      // ✅ Carrega a camada de UFs pra lookup geográfico (fallback)
      const dadosUF = await this._obterDados('uf');
      const poligonosUF = dadosUF?.features?.filter(f =>
        f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
      ) || [];

      // Cache: memoiza UF por feição pra não recalcular
      const cacheUF = new Map();

      const descobrirUF = (f) => {
        // 1) Tenta pelos atributos
        let uf = this._extrairUF(f);
        if (uf) return uf;

        // 2) Fallback geográfico: testa o centroide contra os polígonos de UF
        if (!poligonosUF.length || typeof turf === 'undefined') return '';

        const ponto = this._pontoDe(f);
        if (!ponto) return '';

        const ptGeoJSON = { type: 'Point', coordinates: [ponto[1], ponto[0]] };

        for (const ufFeature of poligonosUF) {
          try {
            if (turf.booleanPointInPolygon(ptGeoJSON, ufFeature)) {
              const p = ufFeature.properties || {};
              const sigla = String(p.SIGLA_UF || p.sigla_uf || p.UF || p.uf || p.CD_UF || '').trim().toUpperCase();
              if (sigla) return sigla;
            }
          } catch (e) { /* ignora */ }
        }
        return '';
      };

      const dentro = [];
      const semUF = [];

      for (const f of dadosOrigem.features) {
        const chave = f.id || JSON.stringify(f.properties || {}).slice(0, 100);
        let uf = cacheUF.get(chave);
        if (uf === undefined) {
          uf = descobrirUF(f);
          cacheUF.set(chave, uf);
        }

        if (uf && regiao.ufs.includes(uf)) {
          dentro.push(f);
        } else if (!uf) {
          semUF.push(f);
        }
      }

      const nomeOrigem = window.CONFIG_CAMADAS[intencao.camada]?.nome || intencao.camada;
      this._ultimaContagem = { camadaId: intencao.camada, features: dentro };

      const pct = dadosOrigem.features.length > 0
        ? ((dentro.length / dadosOrigem.features.length) * 100).toFixed(1)
        : '0';

      // Conta por UF dentro da região
      const porUF = {};
      dentro.forEach(f => {
        const chave = f.id || JSON.stringify(f.properties || {}).slice(0, 100);
        const uf = cacheUF.get(chave);
        if (uf) porUF[uf] = (porUF[uf] || 0) + 1;
      });
      const topUF = Object.entries(porUF).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const linhasUF = topUF.map(([uf, qtd]) =>
        `<tr>
          <td style="padding:2px 6px;color:#e2e8f0;font-size:10.5px;font-weight:700;">${uf}</td>
          <td style="padding:2px 6px;color:#a78bfa;font-family:Consolas,monospace;font-size:10.5px;text-align:right;">${qtd}</td>
        </tr>`
      ).join('');

      const avisoSemUF = semUF.length > 0
        ? `<div style="margin-top:6px;font-size:9.5px;color:#64748b;font-style:italic;">
             ℹ️ ${semUF.length} feição(ões) não puderam ser localizadas geograficamente.
           </div>`
        : '';

      return `
        <div style="background:rgba(139,92,246,0.15);border-left:3px solid #8b5cf6;padding:10px 12px;border-radius:6px;">
          <div style="font-size:11px;color:#c4b5fd;text-transform:uppercase;letter-spacing:0.5px;">Análise por UF</div>
          <div style="font-size:22px;color:#a78bfa;font-weight:800;font-family:Consolas,monospace;margin:4px 0;">${dentro.length.toLocaleString('pt-BR')}</div>
          <div style="font-size:11.5px;color:#e2e8f0;">${nomeOrigem}</div>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:4px;">
            Na <strong>${regiao.nome}</strong> · ${pct}% do total (${dadosOrigem.features.length.toLocaleString('pt-BR')})
          </div>
          ${avisoSemUF}
        </div>
        ${topUF.length > 0 ? `
          <div style="margin-top:10px;font-size:10.5px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
            📍 Top 5 UFs (da região)
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <tbody>${linhasUF}</tbody>
          </table>
        ` : ''}
        ${dentro.length > 0 ? `<div style="margin-top:8px;">
          <button onclick="CopilotoIA._destacarContagem()"
                  style="background:#8b5cf6;color:#fff;border:none;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            🗺️ Destacar no mapa
          </button>
        </div>` : ''}
      `;
    },

    _responderCruzaUF: async function (intencao) {
      const dados = await this._obterDados(intencao.camada);
      if (!dados?.features?.length) return `Sem dados em <strong>${intencao.camada}</strong>.`;

      const cruzam = dados.features.filter(f => {
        const p = f.properties || {};
        const orig = (p.est_origem || p.EST_ORIGEM || p.estado_origem || '').toString().trim().toUpperCase();
        const dest = (p.est_estino || p.EST_DESTINO || p.estado_destino || '').toString().trim().toUpperCase();
        return orig && dest && orig.length === 2 && dest.length === 2 && orig !== dest;
      });

      const nomeCamada = window.CONFIG_CAMADAS[intencao.camada]?.nome || intencao.camada;
      const pct = dados.features.length > 0
        ? ((cruzam.length / dados.features.length) * 100).toFixed(1)
        : '0';

      this._ultimaContagem = { camadaId: intencao.camada, features: cruzam };

      // Monta lista de pares UF (ex: PA-AP, MA-TO)
      const paresUF = {};
      cruzam.forEach(f => {
        const p = f.properties || {};
        const orig = (p.est_origem || p.EST_ORIGEM || '').trim().toUpperCase();
        const dest = (p.est_estino || p.EST_DESTINO || '').trim().toUpperCase();
        if (orig && dest) {
          const par = [orig, dest].sort().join('-');
          paresUF[par] = (paresUF[par] || 0) + 1;
        }
      });

      const topPares = Object.entries(paresUF)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

      let linhasPares = '';
      topPares.forEach(([par, qtd]) => {
        linhasPares += `<tr>
          <td style="padding:3px 8px;color:#e2e8f0;font-size:11px;font-weight:700;">${par}</td>
          <td style="padding:3px 8px;color:#38bdf8;font-family:Consolas,monospace;font-size:11px;text-align:right;">${qtd}</td>
        </tr>`;
      });

      return `
        <div style="background:rgba(236,72,153,0.15);border-left:3px solid #ec4899;padding:10px 12px;border-radius:6px;">
          <div style="font-size:11px;color:#f9a8d4;text-transform:uppercase;letter-spacing:0.5px;">Travessias interestaduais</div>
          <div style="font-size:22px;color:#f472b6;font-weight:800;font-family:Consolas,monospace;margin:4px 0;">${cruzam.length.toLocaleString('pt-BR')}</div>
          <div style="font-size:11.5px;color:#e2e8f0;">${nomeCamada}</div>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:4px;">
            ${pct}% do total (${dados.features.length.toLocaleString('pt-BR')})
          </div>
        </div>
        ${topPares.length > 0 ? `
          <div style="margin-top:10px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
            🔗 Principais conexões entre UFs
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <tbody>${linhasPares}</tbody>
          </table>
        ` : ''}
        ${cruzam.length > 0 ? `<div style="margin-top:8px;">
          <button onclick="CopilotoIA._destacarContagem()"
                  style="background:#ec4899;color:#fff;border:none;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            🗺️ Destacar no mapa
          </button>
        </div>` : ''}
      `;
    },

    _responderBufferPonto: async function (intencao) {
      const ponto = await this._localizarPonto(intencao.pontoNome);
      if (!ponto) {
        return `Não encontrei o local "<strong>${window.Security.escapeHTML(intencao.pontoNome)}</strong>".<br>
                Tente o nome de uma cidade ou porto conhecido.`;
      }

      const dados = await this._obterDados(intencao.camada);
      if (!dados?.features?.length) return `Sem dados em <strong>${intencao.camada}</strong>.`;
      if (typeof turf === 'undefined') return 'Turf.js indisponível.';

      const raioKm = intencao.raio;
      const dentro = [];

      for (const f of dados.features) {
        const p = this._pontoDe(f);
        if (!p) continue;
        try {
          const dist = turf.distance(
            [ponto.lng, ponto.lat],
            [p[1], p[0]],
            { units: 'kilometers' }
          );
          if (dist <= raioKm) dentro.push(f);
        } catch (e) { /* ignora */ }
      }

      const nomeCamada = window.CONFIG_CAMADAS[intencao.camada]?.nome || intencao.camada;

      // Guarda pro botão "Destacar"
      this._ultimaContagem = { camadaId: intencao.camada, features: dentro };
      this._ultimoBufferPonto = { lat: ponto.lat, lng: ponto.lng, raioKm };

      return `
        <div style="background:rgba(245,158,11,0.15);border-left:3px solid #f59e0b;padding:10px 12px;border-radius:6px;">
          <div style="font-size:11px;color:#fcd34d;text-transform:uppercase;letter-spacing:0.5px;">Raio de proximidade</div>
          <div style="font-size:22px;color:#fbbf24;font-weight:800;font-family:Consolas,monospace;margin:4px 0;">${dentro.length.toLocaleString('pt-BR')}</div>
          <div style="font-size:11.5px;color:#e2e8f0;">${nomeCamada}</div>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:4px;">
            Até <strong>${raioKm} km</strong> de <strong>${window.Security.escapeHTML(intencao.pontoNome)}</strong>
          </div>
        </div>
        ${dentro.length > 0 ? `<div style="margin-top:8px;display:flex;gap:6px;">
          <button onclick="CopilotoIA._destacarContagem()"
                  style="background:#f59e0b;color:#000;border:none;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            🗺️ Destacar no mapa
          </button>
          <button onclick="CopilotoIA._desenharCirculoBuffer()"
                  style="background:transparent;color:#fbbf24;border:1px solid #f59e0b;padding:5px 12px;border-radius:4px;font-weight:700;cursor:pointer;font-size:10.5px;">
            ⭕ Mostrar círculo ${raioKm} km
          </button>
        </div>` : ''}
      `;
    },

    /* ---------- Helpers geográficos ---------- */

    /**
     * Localiza um ponto (cidade/porto) nas camadas carregadas.
     * Retorna { lat, lng } ou null.
     */
    _localizarPonto: async function (nome) {
      const alvo = String(nome).trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // 1. Busca nas Instalações Portuárias (mais preciso)
      const portos = DADOS_GEOJSON_BRUTOS['instalacoes_portuarias'];
      if (portos?.features) {
        for (const f of portos.features) {
          const p = f.properties || {};
          const nomeFeicao = String(p.nome || p.NOME_INSTALACAO || p.cidade || p.municipio || '').toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (nomeFeicao.includes(alvo)) {
            const pt = this._pontoDe(f);
            if (pt) return { lat: pt[0], lng: pt[1] };
          }
        }
      }

      // 2. Busca em todas as camadas
      for (const [id, dados] of Object.entries(DADOS_GEOJSON_BRUTOS)) {
        if (id === 'instalacoes_portuarias' || !dados?.features) continue;
        for (const f of dados.features) {
          const p = f.properties || {};
          const nomeFeicao = String(p.nome || p.NOME || p.cidade || p.municipio || '').toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (nomeFeicao.includes(alvo)) {
            const pt = this._pontoDe(f);
            if (pt) return { lat: pt[0], lng: pt[1] };
          }
        }
      }

      // 3. Fallback: geocoding simples (não implementado)
      return null;
    },

    /**
     * Desenha círculo visual do buffer no mapa.
     */
    _desenharCirculoBuffer: function () {
      const buf = this._ultimoBufferPonto;
      if (!buf) return;

      // Remove círculo anterior
      if (this._bufferCircle) {
        try { window.mapa.removeLayer(this._bufferCircle); } catch (e) {}
      }

      this._bufferCircle = L.circle([buf.lat, buf.lng], {
        radius: buf.raioKm * 1000,
        color: '#f59e0b',
        weight: 3,
        fillColor: '#f59e0b',
        fillOpacity: 0.1,
        dashArray: '6, 6',
        pane: 'paneLinhas'
      }).addTo(window.mapa);

      window.mapa.fitBounds(this._bufferCircle.getBounds(), { padding: [40, 40] });
      if (window.UI) window.UI.toast(`⭕ Círculo de ${buf.raioKm} km desenhado no mapa.`);
    },
    _responderComparacao: async function (intencao) {
      if (!window.SafraDiffManager) return 'Módulo de comparação indisponível.';

      return `
        Vou abrir o <strong>comparador de safras VEN</strong>.<br><br>
        Base: <strong>${intencao.safraA.replace('ven_','')}</strong> ·
        Comparada: <strong>${intencao.safraB.replace('ven_','')}</strong>
        <div style="margin-top:8px;">
          <button onclick="SafraDiffManager.abrir(); setTimeout(() => { document.getElementById('diff-safra-a').value='${intencao.safraA}'; document.getElementById('diff-safra-b').value='${intencao.safraB}'; document.getElementById('btn-diff-comparar').click(); }, 500);"
                  style="background:#0369a1;color:#fff;border:none;padding:6px 14px;border-radius:4px;font-weight:700;cursor:pointer;font-size:11px;">
            🔀 Comparar agora
          </button>
        </div>
      `;
    },

    /* ============================================================
       HELPERS
       ============================================================ */

    _obterDados: async function (camadaId) {
      // Resolve VEN virtual → safra ativa
      if (camadaId === 'ven') {
        const ano = window.VENUnifiedManager?.anoAtivo || 'ven_2022';
        camadaId = ano;
      }

      // Já carregado?
      if (DADOS_GEOJSON_BRUTOS[camadaId]) return DADOS_GEOJSON_BRUTOS[camadaId];

      // Carrega sob demanda
      try {
        await window.DataManager.carregarCamada(camadaId);
        return DADOS_GEOJSON_BRUTOS[camadaId];
      } catch (e) {
        return null;
      }
    },

    _extrairUF: function (f) {
      const p = f.properties || {};

      // 1) Sigla direta (2 letras)
      for (const k of ['SIGLA_UF','sigla_uf','uf','UF','est_uf','sg_uf','est_origem','EST_ORIGEM','est_destino','EST_DESTINO']) {
        const v = p[k];
        if (v && String(v).trim().length === 2) return String(v).trim().toUpperCase();
      }

      // 2) Município no formato "Cidade/UF"
      for (const k of ['municipio','MUNICIPIO','nome_municipio']) {
        const v = p[k];
        if (v && String(v).includes('/')) {
          const partes = String(v).split('/');
          if (partes.length > 1) {
            const uf = partes[1].trim().toUpperCase();
            if (uf.length === 2) return uf;
          }
        }
      }

      // 3) ✅ Estado por extenso ("PARÁ", "Amazonas"...) → sigla
      const mapaEstados = {
        'acre':'AC','alagoas':'AL','amapa':'AP','amazonas':'AM','bahia':'BA',
        'ceara':'CE','distrito federal':'DF','espirito santo':'ES','goias':'GO',
        'maranhao':'MA','mato grosso':'MT','mato grosso do sul':'MS',
        'minas gerais':'MG','para':'PA','paraiba':'PB','parana':'PR',
        'pernambuco':'PE','piaui':'PI','rio de janeiro':'RJ',
        'rio grande do norte':'RN','rio grande do sul':'RS','rondonia':'RO',
        'roraima':'RR','santa catarina':'SC','sao paulo':'SP','sergipe':'SE','tocantins':'TO'
      };
      for (const k of ['estado','ESTADO','Estado','uf_nome']) {
        const v = p[k];
        if (!v) continue;
        const norm = String(v).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (mapaEstados[norm]) return mapaEstados[norm];
        if (norm.length === 2) return norm.toUpperCase();
      }

      return '';
    },

    _pontoDe: function (f) {
      // Point
      if (f.geometry?.type === 'Point') {
        const [lng, lat] = f.geometry.coordinates;
        return [lat, lng];
      }
      // LineString → ponto médio
      if (f.geometry?.type === 'LineString' && f.geometry.coordinates.length > 0) {
        const c = f.geometry.coordinates;
        const meio = c[Math.floor(c.length / 2)];
        return [meio[1], meio[0]];
      }
      // Polygon → centroide do primeiro anel
      if (f.geometry?.type === 'Polygon' && f.geometry.coordinates[0]?.length > 0) {
        const anel = f.geometry.coordinates[0];
        const lng = anel.reduce((s, c) => s + c[0], 0) / anel.length;
        const lat = anel.reduce((s, c) => s + c[1], 0) / anel.length;
        return [lat, lng];
      }
      return null;
    },

    _distanciaAproximada: function (ponto, alvoFeature) {
      if (typeof turf === 'undefined') return null;
      const pontoAlvo = this._pontoDe(alvoFeature);
      if (!pontoAlvo) return null;
      try {
        return turf.distance(
          [ponto[1], ponto[0]],
          [pontoAlvo[1], pontoAlvo[0]],
          { units: 'kilometers' }
        );
      } catch (e) {
        return null;
      }
    },

     /* ---------- Ações dos botões ---------- */

    _limparDestaque: function () {
      if (window.CAMADA_DESTAQUE) {
        try { window.mapa.removeLayer(window.CAMADA_DESTAQUE); } catch (e) {}
        window.CAMADA_DESTAQUE = null;
      }
    },

    _desenharDestaque: function (features, cor) {
      cor = cor || '#0284c7';
      if (!features || !features.length) return;

      this._limparDestaque();

      try {
        window.CAMADA_DESTAQUE = L.geoJSON(
          { type: 'FeatureCollection', features },
          {
            pane: 'paneSelecao',
            style: { color: cor, weight: 4, fillOpacity: 0.35, fillColor: cor },
            pointToLayer: (f, latlng) => L.circleMarker(latlng, {
              pane: 'panePontos',
              radius: 9, fillColor: cor, color: '#ffffff', weight: 2.5, fillOpacity: 0.95
            })
          }
        ).addTo(window.mapa);

        const bounds = window.CAMADA_DESTAQUE.getBounds();
        if (bounds.isValid()) {
          window.mapa.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }
        if (window.UI) window.UI.toast(`✓ ${features.length} feições destacadas no mapa.`);
      } catch (e) {
        console.warn('[Copiloto] Erro ao desenhar destaque:', e);
        if (window.UI) window.UI.toast('⚠️ Erro ao destacar no mapa.');
      }
    },

    _destacarContagem: function () {
      const dados = this._ultimaContagem;
      if (!dados || !dados.features || !dados.features.length) {
        if (window.UI) window.UI.toast('Nada para destacar.');
        return;
      }
      this._desenharDestaque(dados.features, '#0284c7');
    },

    _destacarRanking: function () {
      const dados = this._ultimoRanking;
      if (!dados || !dados.features || !dados.features.length) {
        if (window.UI) window.UI.toast('Nada para destacar.');
        return;
      }
      this._desenharDestaque(dados.features, '#38bdf8');
    },

    _destacarFicha: function () {
      const dados = this._ultimaFicha;
      if (!dados || !dados.feature) {
        if (window.UI) window.UI.toast('Nada para destacar.');
        return;
      }
      this._desenharDestaque([dados.feature], '#f59e0b');
    },

    _destacarGeo: function () {
      const features = this._ultimoResultadoGeo;
      if (!features || !features.length) {
        if (window.UI) window.UI.toast('Nada para destacar.');
        return;
      }
      this._desenharDestaque(features, '#10b981');
    },
    /* ============================================================
       1e-1 — HISTÓRICO E AÇÕES DE RESPOSTA
       ============================================================ */
    _limparBarrasAntigas: function () {
      try {
        const container = document.getElementById('copiloto-mensagens');
        if (!container) return;
        const barras = container.querySelectorAll('.copiloto-acoes-resposta');
        barras.forEach(b => b.remove());
        console.log(`[Copiloto] ${barras.length} barra(s) antiga(s) removida(s).`);
      } catch (e) {
        console.warn('[Copiloto] Erro ao limpar barras:', e);
      }
    },
    _montarBarraAcoes: function (pergunta, respostaHTML) {
      // ✅ Se a resposta já trouxe sua própria barra (ex: Top 10 UFs), não adiciona outra
      if (respostaHTML && respostaHTML.includes('copiloto-acoes-resposta')) {
        return '';
      }

      const perguntaEsc = window.Security.escapeHTML(pergunta);

      return `
        <div class="copiloto-acoes-resposta" data-pergunta="${perguntaEsc}">
          <button onclick="CopilotoIA._copiarUltimaResposta(this)" title="Copiar resposta como texto">
            📋 Copiar
          </button>
          <button onclick="CopilotoIA._exportarUltimaResposta(this)" title="Exportar features em CSV">
            💾 CSV
          </button>
          <button onclick="CopilotoIA._compartilharConsulta(this)" title="Copiar link que reabre esta consulta">
            🔗 Compartilhar
          </button>
        </div>
      `;
    },

    _registrarNoHistorico: function (pergunta, respostaHTML) {
      // Salva a resposta como texto plano (remove HTML)
      const textoPlano = String(respostaHTML)
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

      // Guarda a "última resposta" pra ações de CSV
      this._ultimaResposta = {
        pergunta: pergunta,
        html: respostaHTML,
        textoPlano: textoPlano,
        features: (this._ultimaContagem?.features && this._ultimaContagem.features.length > 0) ? this._ultimaContagem.features
               : (this._ultimoRanking?.features && this._ultimoRanking.features.length > 0) ? this._ultimoRanking.features
               : (this._ultimoResultadoGeo && this._ultimoResultadoGeo.length > 0) ? this._ultimoResultadoGeo
               : (this._ultimaFicha?.feature ? [this._ultimaFicha.feature] : null),
        agrupamento: this._ultimoRanking?.agrupamento || null,   // ✅ NOVO
        camadaId: this._ultimaContagem?.camadaId
               || this._ultimoRanking?.camadaId
               || null,
        timestamp: new Date()
      };

      // Adiciona ao histórico (não duplica perguntas idênticas recentes)
      const ultima = this._historico[0];
      if (ultima && ultima.pergunta === pergunta) {
        this._historico[0] = this._ultimaResposta;
      } else {
        this._historico.unshift(this._ultimaResposta);
        if (this._historico.length > this._maxHistorico) {
          this._historico = this._historico.slice(0, this._maxHistorico);
        }
      }

      this._atualizarBotaoHistoricoCopiloto();
    },

    _atualizarBotaoHistoricoCopiloto: function () {
      const btn = document.getElementById('btn-copiloto-historico');
      if (!btn) return;
      if (this._historico.length > 0) {
        btn.classList.add('visivel');
        btn.title = `Histórico (${this._historico.length})`;
      } else {
        btn.classList.remove('visivel');
      }
    },

    _copiarUltimaResposta: function (botao) {
      if (!this._ultimaResposta) {
        if (window.UI) window.UI.toast('⚠️ Nada para copiar.');
        return;
      }

      // Se o botão passado foi de uma resposta antiga, pega a pergunta do data attribute
      const pergunta = botao ? botao.closest('.copiloto-acoes-resposta')?.dataset.pergunta : null;
      const entrada = pergunta
        ? this._historico.find(h => h.pergunta === pergunta) || this._ultimaResposta
        : this._ultimaResposta;

      const texto = `# ${entrada.pergunta}\n\n${entrada.textoPlano}`;

      navigator.clipboard.writeText(texto).then(() => {
        if (window.UI) window.UI.toast('📋 Resposta copiada para a área de transferência.');
      }).catch(() => {
        if (window.UI) window.UI.toast('⚠️ Não foi possível copiar.');
      });
    },

    _exportarUltimaResposta: function (botao) {
      const pergunta = botao ? botao.closest('.copiloto-acoes-resposta')?.dataset.pergunta : null;
      const entrada = pergunta
        ? this._historico.find(h => h.pergunta === pergunta) || this._ultimaResposta
        : this._ultimaResposta;

      // ✅ Caso especial: ranking agrupado por UF → exporta CSV de agrupamento
      if (entrada && entrada.agrupamento && entrada.agrupamento.length > 0) {
        const linhas = ['"UF";"Quantidade"'];
        entrada.agrupamento.forEach(([uf, qtd]) => {
          linhas.push(`"${uf}";"${qtd}"`);
        });
        const csv = '\uFEFF' + linhas.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const slug = String(entrada.pergunta).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
        a.href = url;
        a.download = `copiloto_${slug}_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (window.UI) window.UI.toast(`💾 CSV de agrupamento exportado (${entrada.agrupamento.length} UFs).`);
        return;
      }

      if (!entrada || !entrada.features || !entrada.features.length) {
        if (window.UI) window.UI.toast('⚠️ Esta resposta não tem dados para exportar.');
        return;
      }

      // Coleta todas as chaves únicas
      const chaves = new Set();
      entrada.features.forEach(f => {
        Object.keys(f.properties || {}).forEach(k => {
          if (!['geom', 'geometry'].includes(k.toLowerCase())) chaves.add(k);
        });
      });
      const colunas = [...chaves];

      const linhas = [colunas.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')];
      entrada.features.forEach(f => {
        const p = f.properties || {};
        const row = colunas.map(c => {
          const v = p[c] !== undefined && p[c] !== null ? p[c] : '';
          return `"${String(v).replace(/"/g, '""')}"`;
        });
        linhas.push(row.join(';'));
      });

      const csv = '\uFEFF' + linhas.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const slug = String(entrada.pergunta).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
      a.href = url;
      a.download = `copiloto_${slug}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (window.UI) window.UI.toast(`💾 CSV exportado com ${entrada.features.length} linhas.`);
    },
    /* ============================================================
       1e-2 — URL COMPARTILHÁVEL
       ============================================================ */

    /**
     * Gera URL com `?copiloto=<pergunta>` que reabre a consulta.
     */
    _gerarUrlConsulta: function (pergunta) {
      const url = new URL(location.href);
      // Limpa parâmetros antigos
      url.searchParams.delete('copiloto');
      // Adiciona o novo (URLSearchParams faz o encode automaticamente)
      url.searchParams.set('copiloto', pergunta);
      return url.toString();
    },

    /**
     * Botão "🔗 Compartilhar": copia o link com a consulta.
     */
    _compartilharConsulta: function (botao) {
      const pergunta = botao ? botao.closest('.copiloto-acoes-resposta')?.dataset.pergunta : null;
      if (!pergunta) {
        if (window.UI) window.UI.toast('⚠️ Não foi possível identificar a pergunta.');
        return;
      }

      const url = this._gerarUrlConsulta(pergunta);

      navigator.clipboard.writeText(url).then(() => {
        if (window.UI) {
          window.UI.toast(`🔗 Link copiado! Cole em outra aba ou envie por e-mail.<br><small style="color:#94a3b8;font-size:9px;">${window.Security.escapeHTML(url.slice(0, 80))}${url.length > 80 ? '…' : ''}</small>`);
        }
      }).catch(() => {
        // Fallback: abre prompt pra copiar manualmente
        window.prompt('Copie o link abaixo:', url);
      });
    },

    /**
     * Verifica se a URL tem `?copiloto=...` e executa a consulta automaticamente.
     * Chamado no boot da aplicação.
     */
    verificarConsultaNaUrl: async function () {
      const params = new URLSearchParams(location.search);
      const pergunta = params.get('copiloto');
      if (!pergunta) return;

      console.info('[Copiloto] Consulta detectada na URL:', pergunta);

      // Abre o painel
      if (!this.aberto) this.toggle();

      // Espera o painel estar visível
      await new Promise(r => setTimeout(r, 600));

      // Preenche o input e dispara
      const inp = document.getElementById('copiloto-input');
      if (inp) inp.value = pergunta;

      // Pequeno atraso pro DOM estabilizar
      await new Promise(r => setTimeout(r, 300));

      // Executa a consulta
      this.enviarComandoPredefinido(pergunta);

      // Remove o parâmetro da URL após executar (evita re-rodar ao dar F5)
      try {
        const url = new URL(location.href);
        url.searchParams.delete('copiloto');
        history.replaceState(null, '', url.toString());
      } catch (e) { /* ignora */ }
    },
    /**
     * Executa uma consulta capturada previamente (antes do URLState apagar a URL).
     * Usado pelo boot do app.js.
     */
    _executarConsultaPendente: async function (pergunta) {
      if (!pergunta) return;

      console.info('[Copiloto] Executando consulta pendente:', pergunta);

      // Limpa a flag imediatamente (evita dupla execução)
      window._copilotoConsultaPendente = null;

      // Abre o painel do copiloto
      if (!this.aberto) this.toggle();

      // Espera o painel renderizar
      await new Promise(r => setTimeout(r, 600));

      // Preenche o input
      const inp = document.getElementById('copiloto-input');
      if (inp) inp.value = pergunta;

      // Pequeno atraso pro DOM estabilizar
      await new Promise(r => setTimeout(r, 300));

      // Executa a consulta
      this.enviarComandoPredefinido(pergunta);
    },    
    abrirHistoricoCopiloto: function () {
      const modal = document.getElementById('modal-copiloto-historico');
      if (!modal) return;

      const corpo = document.getElementById('copiloto-historico-corpo');
      if (!corpo) return;

      if (this._historico.length === 0) {
        corpo.innerHTML = '<div class="copiloto-historico-vazio">Nenhuma consulta ainda.</div>';
      } else {
        corpo.innerHTML = this._historico.map((item, idx) => {
          const hora = item.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const data = item.timestamp.toLocaleDateString('pt-BR');
          return `
            <div class="copiloto-historico-item" onclick="CopilotoIA._reabrirConsulta(${idx})">
              <div class="chist-header">
                <span class="chist-hora">${data} · ${hora}</span>
                <span class="chist-badge">${item.features ? item.features.length + ' feições' : 'sem dados'}</span>
              </div>
              <div class="chist-pergunta">${window.Security.escapeHTML(item.pergunta)}</div>
              <div class="chist-preview">${window.Security.escapeHTML(item.textoPlano.slice(0, 120))}${item.textoPlano.length > 120 ? '…' : ''}</div>
            </div>
          `;
        }).join('');
      }

      modal.classList.add('aberto');
    },

    fecharHistoricoCopiloto: function () {
      const modal = document.getElementById('modal-copiloto-historico');
      if (modal) modal.classList.remove('aberto');
    },

    _reabrirConsulta: function (idx) {
      const item = this._historico[idx];
      if (!item) return;

      this.fecharHistoricoCopiloto();

      // ✅ Limpeza agressiva antes de reinjetar
      this._limparBarrasAntigas();

      // Injeta pergunta + resposta no painel
      this.adicionarMensagem('usuario', window.Security.escapeHTML(item.pergunta));
      const div = document.createElement('div');
      div.className = 'msg-ia';
      div.innerHTML = item.html + this._montarBarraAcoes(item.pergunta, item.html);

      const container = document.getElementById('copiloto-mensagens');
      if (container) {
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
      }
    

      // Restaura estado pra ações seguintes
      this._ultimaResposta = item;
    },    
    gerarMinutaNotaTecnica: function (p) {
      const nome = p.nome || p.NOME_INSTALACAO || 'Instalação Portuária';
      const tipo = p.tipo || p.TIPO_INSTALACAO || 'Terminal Portuário';
      const uf = p.SIGLA_UF || p.uf || 'BR';
      const mun = p.municipio || p.MUNICIPIO || 'Não especificado';
      const hoje = new Date().toLocaleDateString('pt-BR');

      return `
        <div style="background:#ffffff; border-left:3px solid #0284c7; padding:8px 10px; margin-top:4px;">
          <div style="font-weight:800; color:#0a2540; font-size:11px; text-transform:uppercase;">MINUTA PRELIMINAR DE NOTA TÉCNICA</div>
          <div style="font-size:9px; color:#64748b; margin-bottom:8px;">ANTAQ • GEE • Data: ${hoje}</div>
          <p><strong>1. OBJETO</strong><br>Instalação <strong>${window.Security.escapeHTML(nome)}</strong>, regime <strong>${window.Security.escapeHTML(tipo)}</strong>, em ${window.Security.escapeHTML(mun)}/${window.Security.escapeHTML(uf)}.</p>
          <p><strong>2. ENQUADRAMENTO (Lei nº 12.815/2013)</strong><br>Sujeita às diretrizes da Lei dos Portos e resoluções ANTAQ.</p>
          <p><strong>3. SOCIOAMBIENTAL</strong><br>Verificar zonas de amortecimento de UCs e Terras Indígenas no RID.</p>
          <p style="color:#0369a1; font-weight:700;">✓ Parecer: Registro regular.</p>
        </div>`;
    },

    chamarGemini: async function (prompt) {
      if (!this.apiKey) throw new Error("Chave Gemini não configurada.");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
      const payload = { contents: [{ parts: [{ text: `Você é o Copiloto Geoespacial da ANTAQ. Responda tecnicamente. Pergunta: ${prompt}` }] }] };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Status ${res.status}: Falha na API Gemini.`);
      const data = await res.json();
      const textoResp = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta.";
      return window.Security.escapeHTML(textoResp).replace(/\n/g, '<br>');
    },

    chamarOpenAI: async function (prompt) {
      if (!this.apiKey) throw new Error("Chave OpenAI não configurada.");
      const url = "https://api.openai.com/v1/chat/completions";
      const payload = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é o Copiloto da ANTAQ. Seja formal e especializado." },
          { role: "user", content: prompt }
        ]
      };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Status ${res.status}: Falha na API OpenAI.`);
      const data = await res.json();
      return window.Security.escapeHTML(data.choices?.[0]?.message?.content || "Sem resposta.").replace(/\n/g, '<br>');
    },

    chamarOllamaLocal: async function (prompt) {
      const url = `${this.urlLocal}/chat/completions`;
      const payload = { model: "llama3", messages: [{ role: "system", content: "Assistente ANTAQ." }, { role: "user", content: prompt }] };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Falha ao conectar no servidor local (${url}).`);
      const data = await res.json();
      return window.Security.escapeHTML(data.choices?.[0]?.message?.content || "Sem resposta.").replace(/\n/g, '<br>');
    }
  };

  window.CopilotoIA = CopilotoIA;
  console.info('[js] CopilotoIA carregado');
})();