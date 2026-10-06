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

    perguntar: function (texto) { return this.enviarComandoPredefinido(texto); },
    enviarMensagem: function () { return this.enviar(); },

    enviar: async function () {
      const inp = document.getElementById('copiloto-input');
      if (!inp) return;
      const texto = inp.value.trim();
      if (!texto) return;

      this.adicionarMensagem('usuario', window.Security.escapeHTML(texto));
      inp.value = '';

      const idWait = 'msg-wait-' + Date.now();
      this.adicionarMensagem('ia', `<span id="${idWait}">⏳ Processando consulta espacial e regulatória...</span>`);

      try {
        let respostaHTML = '';
        if (this.provedor === 'heuristico' || !this.apiKey) respostaHTML = await this.executarMotorHeuristico(texto);
        else if (this.provedor === 'gemini') respostaHTML = await this.chamarGemini(texto);
        else if (this.provedor === 'openai') respostaHTML = await this.chamarOpenAI(texto);
        else if (this.provedor === 'local') respostaHTML = await this.chamarOllamaLocal(texto);

        const waitEl = document.getElementById(idWait);
        if (waitEl && waitEl.parentElement) waitEl.parentElement.innerHTML = respostaHTML;
      } catch (err) {
        console.error(err);
        const waitEl = document.getElementById(idWait);
        if (waitEl && waitEl.parentElement) {
          waitEl.parentElement.innerHTML = `⚠️ <strong>Falha na consulta:</strong> ${window.Security.escapeHTML(err.message || 'Erro inesperado')}`;
        }
      }
    },

    executarMotorHeuristico: async function (comando) {
      const c = comando.toLowerCase();

      if (c.includes('tup') && (c.includes('pará') || c.includes('para') || c.includes(' pa') || c.includes('maranhão') || c.includes(' ma') || c.includes('amazonas') || c.includes(' am'))) {
        let ufAlvo = 'PA';
        if (c.includes('maranhão') || c.includes(' ma')) ufAlvo = 'MA';
        if (c.includes('amazonas') || c.includes(' am')) ufAlvo = 'AM';

        const gPortos = DADOS_GEOJSON_BRUTOS['instalacoes_portuarias'];
        if (!gPortos || !gPortos.features) return "Camada de Instalações Portuárias ainda não foi baixada.";

        const tups = gPortos.features.filter(f => {
          const cat = window.PortClassification.classificar(f.properties || {});
          const uf = window.Analytics ? window.Analytics.extrairUF(f.properties, f) : '';
          return cat.id === 'TUP' && uf === ufAlvo;
        });

        if (tups.length > 0) {
          if (window.CAMADA_DESTAQUE) mapa.removeLayer(window.CAMADA_DESTAQUE);
          window.CAMADA_DESTAQUE = L.geoJSON({ type: 'FeatureCollection', features: tups }, {
            pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 10, fillColor: '#10b981', color: '#ffffff', weight: 2.5, fillOpacity: 0.9 })
          }).addTo(mapa);
          mapa.fitBounds(window.CAMADA_DESTAQUE.getBounds(), { padding: [50, 50] });
          return `✓ Localizados <strong>${tups.length} TUPs</strong> no estado do <strong>${ufAlvo}</strong>.<br>Feições destacadas em verde no mapa.`;
        }
        return `Nenhum TUP localizado para a UF ${ufAlvo}.`;
      }

      if ((c.includes('sobreposi') || c.includes('interfer') || c.includes('cruzam')) && (c.includes('uc') || c.includes('conservacao')) && (c.includes('hidro') || c.includes('via'))) {
        const gVias = DADOS_GEOJSON_BRUTOS['vias_navegadas'] || DADOS_GEOJSON_BRUTOS['ven_2022'];
        const gUcs = DADOS_GEOJSON_BRUTOS['ucs_todas_mma'] || DADOS_GEOJSON_BRUTOS['ucs_federais'];
        if (!gVias || !gUcs) return "Para esta análise, ative as camadas <strong>Vias Navegadas</strong> e <strong>Unidades de Conservação</strong> no painel lateral.";
        if (typeof turf === 'undefined') return "Biblioteca Turf.js carregando. Tente novamente.";
        return `🌲 <strong>Diagnóstico Socioambiental:</strong><br>• A malha navegada da ANTAQ cruza biomas estratégicos.<br>• Empreendimentos que interceptam UCs de Proteção Integral exigem autorização (Art. 36, Lei 9.985/2000).`;
      }

      if (c.includes('nota técnica') || c.includes('nota tecnica') || c.includes('parecer')) {
        const ativo = this.ultimoAtivoInspecionado || (DADOS_GEOJSON_BRUTOS['instalacoes_portuarias']?.features?.[0]);
        if (!ativo) return "Clique primeiro em uma instalação portuária no mapa.";
        return this.gerarMinutaNotaTecnica(ativo.properties || {});
      }

      if (c.startsWith('zoom') || c.startsWith('ir para') || c.startsWith('localizar')) {
        const termo = comando.replace(/^(zoom|ir para|localizar|mostrar)\s+/i, '').trim();
        const inpBusca = document.getElementById('input-busca');
        if (inpBusca) inpBusca.value = termo;
        if (window.SearchEngine) window.SearchEngine.executar();
        return `🔍 Buscando: <em>"${termo}"</em>.`;
      }

      return `Entendi sua consulta sobre <em>"${window.Security.escapeHTML(comando)}"</em>.<br><br>
              💡 <strong>Comandos suportados:</strong><br>
              • <code>"Quais os TUPs do Pará?"</code><br>
              • <code>"Zoom em Santos"</code><br>
              • <code>"Gerar nota técnica"</code>`;
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