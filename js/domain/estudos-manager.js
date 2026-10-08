/* ============================================================
   WebGIS ANTAQ — Módulo: EstudosManager (M13)
   Escopo: gestão de estudos/PDFs publicados no WebGIS
   Dependências: window.Security, window.UI, window.NotificationManager
   Expõe: window.EstudosManager
   ============================================================ */
(function () {
  'use strict';

  const EstudosManager = {
    _estudos: [],
    _filtroCategoria: 'TODOS',
    _busca: '',
    _storageKey: 'antaq_estudos_sessao',
    _carregado: false,

    /* ============================================================
       CARREGAMENTO
       ============================================================ */
    carregar: async function () {
      if (this._carregado) return this._estudos;

      try {
        const res = await fetch('docs/estudos/manifest.json?_t=' + Date.now());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        this._estudos = Array.isArray(data.estudos) ? data.estudos : [];
        console.info(`[M13] ${this._estudos.length} estudo(s) carregado(s)`);
      } catch (e) {
        console.warn('[M13] Falha ao carregar manifest:', e.message);
        this._estudos = [];
      }

      // ✅ Adiciona estudos salvos na sessão (localStorage)
      try {
        const salvos = JSON.parse(localStorage.getItem(this._storageKey) || '[]');
        for (const s of salvos) {
          if (!this._estudos.find(e => e.id === s.id)) {
            this._estudos.push(s);
          }
        }
      } catch (e) { /* ignora */ }

      this._carregado = true;
      return this._estudos;
    },

    /* ============================================================
       RENDERIZAÇÃO DA ABA
       ============================================================ */
    renderizar: async function () {
      const container = document.getElementById('estudos-lista');
      if (!container) return;

      await this.carregar();

      // Aplica filtros
      let lista = this._estudos.slice();
      if (this._filtroCategoria !== 'TODOS') {
        lista = lista.filter(e => e.categoria === this._filtroCategoria);
      }
      if (this._busca) {
        const t = this._busca.toLowerCase();
        lista = lista.filter(e =>
          (e.titulo || '').toLowerCase().includes(t) ||
          (e.descricao || '').toLowerCase().includes(t) ||
          (e.autores || '').toLowerCase().includes(t) ||
          (e.tags || []).some(tag => tag.toLowerCase().includes(t))
        );
      }

      // Ordena por ano (mais recente primeiro)
      lista.sort((a, b) => (b.ano || 0) - (a.ano || 0));

      this._atualizarContador(lista.length);

      if (lista.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding:30px 20px; color:#64748b;">
            <div style="font-size:32px; margin-bottom:8px;">📭</div>
            <div style="font-size:12px; font-weight:600;">Nenhum estudo encontrado</div>
            <div style="font-size:10.5px; margin-top:4px;">${this._busca || this._filtroCategoria !== 'TODOS' ? 'Tente ajustar os filtros' : 'Clique em "Adicionar Estudo" para começar'}</div>
          </div>
        `;
        return;
      }

      container.innerHTML = lista.map(e => this._renderizarCard(e)).join('');
    },

    _renderizarCard: function (estudo) {
      const corCat = {
        'VEN': { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', emoji: '🌊' },
        'TKU': { bg: '#ffedd5', border: '#fdba74', text: '#9a3412', emoji: '📦' },
        'Geral': { bg: '#e0e7ff', border: '#a5b4fc', text: '#3730a3', emoji: '📚' }
      }[estudo.categoria] || { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', emoji: '📄' };

      const tagsHTML = (estudo.tags || []).slice(0, 4).map(t =>
        `<span style="display:inline-block; background:#0f172a; color:#7dd3fc; font-size:9px; padding:2px 6px; border-radius:3px; margin-right:3px;">${window.Security.escapeHTML(t)}</span>`
      ).join('');

      const idEsc = window.Security.escapeHTML(estudo.id);

      return `
        <div class="estudo-card" data-categoria="${window.Security.escapeHTML(estudo.categoria || 'Geral')}"
             style="background:linear-gradient(135deg, ${corCat.bg} 0%, #fff 100%); border:1px solid ${corCat.border}; border-radius:8px; padding:12px 14px; margin-bottom:10px; transition:all 0.15s ease;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
              <span style="font-size:20px; flex-shrink:0;">${corCat.emoji}</span>
              <div style="min-width:0; flex:1;">
                <div style="font-size:12.5px; font-weight:800; color:#0f172a; line-height:1.3; word-break:break-word;">
                  ${window.Security.escapeHTML(estudo.titulo)}
                </div>
                <div style="font-size:10px; color:${corCat.text}; margin-top:3px; font-weight:600;">
                  <span style="background:${corCat.border}55; padding:1px 6px; border-radius:3px; font-size:9.5px; text-transform:uppercase; letter-spacing:0.4px;">${window.Security.escapeHTML(estudo.categoria || 'Geral')}</span>
                  ${estudo.ano ? `<span style="margin-left:6px;">📅 ${estudo.ano}</span>` : ''}
                  ${estudo.autores ? `<span style="margin-left:6px;">👥 ${window.Security.escapeHTML(estudo.autores)}</span>` : ''}
                </div>
              </div>
            </div>
          </div>

          ${estudo.descricao ? `
            <p style="font-size:11px; color:#475569; line-height:1.5; margin:0 0 8px 0;">
              ${window.Security.escapeHTML(estudo.descricao)}
            </p>
          ` : ''}

          ${tagsHTML ? `<div style="margin-bottom:8px;">${tagsHTML}</div>` : ''}

          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button type="button" onclick="EstudosManager.abrirPDF('${idEsc}')"
                    style="flex:1; min-width:120px; background:${corCat.text}; color:#fff; border:none; padding:6px 10px; border-radius:5px; font-size:10.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">
              📄 Abrir PDF
            </button>
            <button type="button" onclick="EstudosManager.baixarPDF('${idEsc}')"
                    style="background:#fff; color:${corCat.text}; border:1px solid ${corCat.border}; padding:6px 10px; border-radius:5px; font-size:10.5px; font-weight:700; cursor:pointer;">
              ⬇️ Baixar
            </button>
            ${estudo._local ? `
              <button type="button" onclick="EstudosManager.removerEstudo('${idEsc}')"
                      title="Remover (só em sessão local)"
                      style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; padding:6px 10px; border-radius:5px; font-size:10.5px; font-weight:700; cursor:pointer;">
                🗑️
              </button>
            ` : ''}
          </div>

          ${estudo.processo ? `
            <div style="font-size:9.5px; color:#64748b; margin-top:6px; font-family:Consolas,monospace;">
              📎 ${window.Security.escapeHTML(estudo.processo)}
            </div>
          ` : ''}
        </div>
      `;
    },

    _atualizarContador: function (n) {
      const el = document.getElementById('estudos-contador');
      if (el) el.textContent = `${n} estudo${n !== 1 ? 's' : ''}`;
    },

    /* ============================================================
       AÇÕES
       ============================================================ */
    abrirPDF: function (id) {
      const estudo = this._estudos.find(e => e.id === id);
      if (!estudo) return;

      // ✅ Tipo 1: link externo (gov.br, SEI, etc)
      if (estudo.tipo === 'externo' && estudo.url) {
        window.open(estudo.url, '_blank', 'noopener');
        if (window.UI) window.UI.toast('🔗 Abrindo link externo...');
        return;
      }

      // ✅ Tipo 2: upload local na sessão atual
      if (estudo._blobUrl) {
        window.open(estudo._blobUrl, '_blank');
        return;
      }

      // ✅ Tipo 3: PDF no repo (docs/estudos/xxx.pdf)
      if (estudo.arquivo) {
        window.open(estudo.arquivo, '_blank');
        return;
      }

      if (window.UI) window.UI.toast('⚠️ Arquivo não disponível nesta sessão. Publique em docs/estudos/ para acesso permanente.');
    },

    baixarPDF: function (id) {
      const estudo = this._estudos.find(e => e.id === id);
      if (!estudo) return;

      let url, nome;

      if (estudo.tipo === 'externo' && estudo.url) {
        url = estudo.url;
        nome = url.split('/').pop() || `${estudo.id}.pdf`;
      } else if (estudo._blobUrl) {
        url = estudo._blobUrl;
        nome = estudo._fileName || `${estudo.id}.pdf`;
      } else if (estudo.arquivo) {
        url = estudo.arquivo;
        nome = url.split('/').pop();
      } else {
        if (window.UI) window.UI.toast('⚠️ Arquivo não disponível.');
        return;
      }

      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (window.UI) window.UI.toast('⬇️ Download iniciado.');
    },

    removerEstudo: function (id) {
      if (!confirm('Remover este estudo da sessão local?')) return;

      this._estudos = this._estudos.filter(e => e.id !== id);

      // Salva de volta no localStorage
      const paraSalvar = this._estudos.filter(e => e._local).map(e => ({
        id: e.id,
        titulo: e.titulo,
        categoria: e.categoria,
        ano: e.ano,
        autores: e.autores,
        descricao: e.descricao,
        tags: e.tags,
        processo: e.processo,
        _local: true
      }));
      try { localStorage.setItem(this._storageKey, JSON.stringify(paraSalvar)); } catch (e) {}

      this.renderizar();
      if (window.UI) window.UI.toast('🗑️ Estudo removido.');
    },

    /* ============================================================
       FILTROS
       ============================================================ */
    filtrarPorCategoria: function (cat) {
      this._filtroCategoria = cat;
      // Atualiza botões
      document.querySelectorAll('[data-estudo-cat]').forEach(btn => {
        btn.classList.toggle('ativo', btn.dataset.estudoCat === cat);
      });
      this.renderizar();
    },

    buscar: function (termo) {
      this._busca = termo || '';
      this.renderizar();
    },

    /* ============================================================
       INICIALIZAÇÃO
       ============================================================ */
    init: function () {
      // Reagir quando o usuário abrir a aba "Estudos"
      window.addEventListener('tabmudou', async (e) => {
        if (e.detail.aba !== 'analise') return;
        // Só renderiza se a aba interna for "relatorios"
        setTimeout(() => {
          const abaRel = document.getElementById('aba-relatorios');
          if (abaRel && abaRel.style.display !== 'none') {
            this.renderizar();
          }
        }, 200);
      });

      // Primeira renderização (quando a aba Estudos abrir)
      const btnRel = document.getElementById('tab-btn-relatorios');
      if (btnRel) {
        btnRel.addEventListener('click', () => setTimeout(() => this.renderizar(), 100));
      }
    },  
    /* ============================================================
       M13 — MODAL DE ADICIONAR ESTUDO
       ============================================================ */

    abrirModalAdicionar: function () {
      const modal = document.getElementById('modal-estudo');
      if (!modal) {
        console.error('[M13] Modal #modal-estudo não encontrado');
        if (window.UI) window.UI.toast('⚠️ Modal de adicionar estudo indisponível.');
        return;
      }

      // Reset do formulário
      const campos = ['estudo-titulo', 'estudo-autores', 'estudo-descricao', 'estudo-tags', 'estudo-processo', 'estudo-url'];
      campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      const inpAno = document.getElementById('estudo-ano');
      if (inpAno) inpAno.value = new Date().getFullYear();
      const inpArq = document.getElementById('estudo-arquivo');
      if (inpArq) inpArq.value = '';
      const preview = document.getElementById('estudo-arquivo-preview');
      if (preview) preview.innerHTML = '';

      // Reset do radio
      const radioExterno = document.querySelector('input[name="estudo-fonte"][value="externo"]');
      if (radioExterno) radioExterno.checked = true;
      this.mudarFonte('externo');

      // Validação de arquivo
      if (inpArq && !inpArq._listener) {
        inpArq.addEventListener('change', () => this._previewArquivo());
        inpArq._listener = true;
      }

      modal.classList.add('aberto');
      setTimeout(() => document.getElementById('estudo-titulo')?.focus(), 100);
    },

    fecharModalAdicionar: function () {
      const modal = document.getElementById('modal-estudo');
      if (modal) modal.classList.remove('aberto');
    },

    mudarFonte: function (tipo) {
      const campoExterno = document.getElementById('estudo-fonte-externo-campo');
      const campoLocal = document.getElementById('estudo-fonte-local-campo');

      if (campoExterno) campoExterno.style.display = (tipo === 'externo') ? '' : 'none';
      if (campoLocal) campoLocal.style.display = (tipo === 'local') ? '' : 'none';
    },

    _previewArquivo: function () {
      const inp = document.getElementById('estudo-arquivo');
      const preview = document.getElementById('estudo-arquivo-preview');
      if (!inp || !preview) return;

      const file = inp.files?.[0];
      if (!file) { preview.innerHTML = ''; return; }

      const tamanhoMB = file.size / (1024 * 1024);
      const excede = tamanhoMB > 50;

      preview.innerHTML = `
        <div style="background:${excede ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}; border-left:3px solid ${excede ? '#ef4444' : '#10b981'}; border-radius:4px; padding:6px 10px; font-size:10.5px; color:${excede ? '#fecaca' : '#a7f3d0'};">
          ${excede ? '⚠️' : '✅'} <strong>${window.Security.escapeHTML(file.name)}</strong> · ${tamanhoMB.toFixed(1)} MB
          ${excede ? '<br>Arquivo maior que 50MB — use link externo' : ''}
        </div>
      `;
    },

    salvarEstudo: function () {
      const titulo = document.getElementById('estudo-titulo')?.value.trim();
      const categoria = document.getElementById('estudo-categoria')?.value || 'Geral';
      const ano = parseInt(document.getElementById('estudo-ano')?.value, 10) || new Date().getFullYear();
      const autores = document.getElementById('estudo-autores')?.value.trim() || '';
      const descricao = document.getElementById('estudo-descricao')?.value.trim() || '';
      const processo = document.getElementById('estudo-processo')?.value.trim() || '';
      const tagsRaw = document.getElementById('estudo-tags')?.value.trim() || '';
      const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

      const fonte = document.querySelector('input[name="estudo-fonte"]:checked')?.value || 'externo';

      // Validação
      if (!titulo) {
        if (window.UI) window.UI.toast('⚠️ Informe o título do estudo.');
        return;
      }

      const id = `est_${Date.now()}_${window.LayerRegistry?.gerarId?.(titulo) || titulo.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

      const estudo = {
        id,
        titulo,
        categoria,
        ano,
        autores,
        descricao,
        tags,
        processo,
        publicado: new Date().toISOString().slice(0, 10),
        _local: true
      };

      if (fonte === 'externo') {
        const url = document.getElementById('estudo-url')?.value.trim();
        if (!url) {
          if (window.UI) window.UI.toast('⚠️ Informe a URL do arquivo.');
          return;
        }
        estudo.tipo = 'externo';
        estudo.url = url;
      } else {
        const inp = document.getElementById('estudo-arquivo');
        const file = inp?.files?.[0];
        if (!file) {
          if (window.UI) window.UI.toast('⚠️ Selecione um arquivo PDF ou ZIP.');
          return;
        }
        if (file.size > 50 * 1024 * 1024) {
          if (window.UI) window.UI.toast('⚠️ Arquivo maior que 50MB. Use link externo.');
          return;
        }
        estudo.tipo = 'local';
        estudo.arquivo = `docs/estudos/${id}.pdf`;
        estudo._fileName = file.name;
        estudo._size = file.size;

        // Cria blob URL pra abrir na sessão
        try {
          estudo._blobUrl = URL.createObjectURL(file);
        } catch (e) {}
      }

      // Adiciona à lista em memória
      this._estudos.push(estudo);

      // Persiste no localStorage (sem o blob URL, que não sobrevive)
      const paraSalvar = this._estudos
        .filter(e => e._local)
        .map(e => ({
          id: e.id,
          titulo: e.titulo,
          categoria: e.categoria,
          ano: e.ano,
          autores: e.autores,
          descricao: e.descricao,
          tags: e.tags,
          processo: e.processo,
          publicado: e.publicado,
          tipo: e.tipo,
          url: e.url,
          arquivo: e.arquivo,
          _local: true
        }));
      try { localStorage.setItem(this._storageKey, JSON.stringify(paraSalvar)); } catch (e) {}

      // Atualiza UI
      this.fecharModalAdicionar();
      this.renderizar();

      if (window.UI) {
        window.UI.toast(`✅ Estudo "${window.Security.escapeHTML(titulo)}" adicionado.`);
      }
    },
  };

  window.EstudosManager = EstudosManager;
  console.info('[js] EstudosManager carregado (M13)');
})();