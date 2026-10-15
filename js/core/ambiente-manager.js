/* ============================================================
   WebGIS ANTAQ — Módulo: AmbienteManager v2.0 (Módulo M21)
   Escopo: Alternância Produção (Consulta Geral) / Homologação (Restrito GEE/SEPH)
           com Modal Institucional Mascarado, Botão Mostrar/Ocultar Senha (👁️),
           Derivação Criptográfica WebCrypto PBKDF2-HMAC-SHA256 (100.000 iterações + Salt),
           Configuração Externa Desacoplada (dados/config_auth_gee.json),
           Suporte a Endpoint Corporativo STI/SSO e Proteção Anti-Força Bruta.
   Dependências: window.UI
   Expõe: window.AmbienteManager
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY_SESSAO = 'antaq_auth_homolog_token_v2';
  const STORAGE_KEY_LOCKOUT = 'antaq_auth_lockout_v2';

  const AmbienteManager = {
    atual: 'producao',
    _configCarregada: false,
    _callbackSucessoPendente: null,
    _timerLockoutUI: null,

    // Configuração padrão (sobreposta automaticamente por dados/config_auth_gee.json se presente no servidor)
    _config: {
      modoAutenticacao: 'hibrido_api_ou_pbkdf2',
      endpointAuthSTI: '/api/v1/auth/homologacao',
      usarEndpointSTISeDisponivel: false,
      sessaoTTLMinutos: 240,
      maxTentativas: 5,
      bloqueioSegundos: 60,
      pbkdf2: {
        algoritmo: 'PBKDF2-HMAC-SHA256',
        iteracoes: 100000,
        salt: 'ANTAQ_GEE_SEPH_SALT_2026_V2',
        hashHex: '293a01b6ab04eaab20103833f02dff5dffd0c1c66b0644d3de519c569502087a',
        hashesAutorizadosHex: ["293a01b6ab04eaab20103833f02dff5dffd0c1c66b0644d3de519c569502087a", "45aad2995b3a2f1792d31a73f0c6af36c75982d774e7f03d27508b6a2cbb6b83", "d120c2fadf85c183236963be1e2e33e0526af81d8dffb3b35093e6eee0f7b5f0", "112a5832353228550787d37b9b8d449364a2d530e6ca6432a9c26fe9744e2596"],
        hashesSaltedFallbackHex: ["e73372e0811e67b9ae88b75db25b27db1656b7f2b0b74e10e99e6d7e5f5b7004", "256cb8865ff4f25c92527826bdca773f2146de869b84615a8cee9d3f063ffdb1", "42aae90409e434ba902f403644fcfea071a76f63bdf416c512c88b3255844c52", "f9e025300026f5d1870e5571464663af61d2a139ccdd4c8e96688715e86d7db9"]
      }
    },

    init: async function () {
      await this.carregarConfigExterna();
      this._garantirModalNoDOM();
      if (this.isSessaoValida()) {
        this.aplicarAmbiente('homologacao', true);
      } else {
        this.limparSessao();
      }
    },

    carregarConfigExterna: async function () {
      if (this._configCarregada) return;
      this._configCarregada = true;
      if (window.ANTAQ_AUTH_CONFIG && typeof window.ANTAQ_AUTH_CONFIG === 'object') {
        Object.assign(this._config, window.ANTAQ_AUTH_CONFIG);
      }
      try {
        const resp = await fetch('dados/config_auth_gee.json', { cache: 'no-store' });
        if (resp.ok) {
          const json = await resp.json();
          if (json && typeof json === 'object') {
            if (json.pbkdf2) Object.assign(this._config.pbkdf2, json.pbkdf2);
            if (json.endpointAuthSTI) this._config.endpointAuthSTI = json.endpointAuthSTI;
            if (typeof json.usarEndpointSTISeDisponivel === 'boolean') {
              this._config.usarEndpointSTISeDisponivel = json.usarEndpointSTISeDisponivel;
            }
            if (Number.isFinite(json.sessaoTTLMinutos)) this._config.sessaoTTLMinutos = json.sessaoTTLMinutos;
            if (Number.isFinite(json.maxTentativas)) this._config.maxTentativas = json.maxTentativas;
            if (Number.isFinite(json.bloqueioSegundos)) this._config.bloqueioSegundos = json.bloqueioSegundos;
          }
        }
      } catch (_) {
        // Fallback silencioso para a política PBKDF2 em memória caso rodado via file://
      }
    },

    /**
     * Derivação Criptográfica Forte via Web Crypto API: PBKDF2-HMAC-SHA256 (100.000 iterações + Salt)
     * Impede ataques de rainbow table e nunca armazena a senha em texto puro no código.
     */
    derivarPBKDF2Hex: async function (senha, saltStr, iteracoes) {
      const enc = new TextEncoder();
      const salt = enc.encode(saltStr || this._config.pbkdf2.salt);
      const iters = Number(iteracoes || this._config.pbkdf2.iteracoes || 100000);
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(senha),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: salt, iterations: iters, hash: 'SHA-256' },
        keyMaterial,
        256
      );
      return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    sha256PuroJS: function (ascii) {
      function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
      const mathPow = Math.pow, maxWord = mathPow(2, 32);
      let result = '';
      const words = [], asciiBitLength = ascii.length * 8;
      let hash = [], k = [];
      let primeCounter = 0;
      const isComposite = {};
      for (let candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
          for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
          hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
          k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
      }
      ascii += '\x80';
      while ((ascii.length % 64) - 56) ascii += '\x00';
      for (let i = 0; i < ascii.length; i++) {
        const j = ascii.charCodeAt(i);
        words[i >> 2] |= j << ((3 - (i % 4)) * 8);
      }
      words[words.length] = (asciiBitLength / maxWord) | 0;
      words[words.length] = asciiBitLength;
      for (let j = 0; j < words.length;) {
        const w = words.slice(j, (j += 16)), oldHash = hash.slice(0);
        for (let i = 0; i < 64; i++) {
          const w15 = w[i - 15], w2 = w[i - 2];
          const a = hash[0], e = hash[4];
          const temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] +
            (w[i] = i < 16 ? w[i] : (w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
          const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
          hash = [(temp1 + temp2) | 0].concat(hash);
          hash[4] = (hash[4] + temp1) | 0;
          hash.pop();
        }
        for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
      }
      for (let i = 0; i < 8; i++) {
        for (let j = 3; j + 1; j--) {
          const b = (hash[i] >> (j * 8)) & 255;
          result += (b < 16 ? 0 : '') + b.toString(16);
        }
      }
      return result;
    },

    sha256: async function (texto) {
      if (window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === 'function') {
        try {
          const msgBuffer = new TextEncoder().encode(texto);
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (_) {}
      }
      return this.sha256PuroJS(unescape(encodeURIComponent(texto)));
    },

    /**
     * Verifica se a sessão autenticada atual é íntegra e está dentro do prazo de validade (TTL)
     */
    isSessaoValida: function () {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY_SESSAO);
        if (!raw) return false;
        const dados = JSON.parse(raw);
        if (!dados || !dados.expiraEm || !dados.assinatura) return false;
        if (Date.now() > Number(dados.expiraEm)) {
          this.limparSessao();
          return false;
        }
        const esperado = this._gerarAssinaturaSessao(dados.emitidoEm, dados.expiraEm, dados.metodo);
        return dados.assinatura === esperado;
      } catch (_) {
        return false;
      }
    },

    _gerarAssinaturaSessao: function (emitidoEm, expiraEm, metodo) {
      const base = `${emitidoEm}:${expiraEm}:${metodo}:${this._config.pbkdf2.hashHex.slice(0, 16)}`;
      let h = 2166136261;
      for (let i = 0; i < base.length; i++) {
        h ^= base.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0).toString(16).padStart(8, '0');
    },

    registrarSessaoAutenticada: function (metodo) {
      const agora = Date.now();
      const ttlMs = (this._config.sessaoTTLMinutos || 240) * 60 * 1000;
      const expiraEm = agora + ttlMs;
      const token = {
        emitidoEm: agora,
        expiraEm: expiraEm,
        metodo: metodo || 'PBKDF2-SHA256',
        assinatura: this._gerarAssinaturaSessao(agora, expiraEm, metodo || 'PBKDF2-SHA256')
      };
      sessionStorage.setItem(STORAGE_KEY_SESSAO, JSON.stringify(token));
      sessionStorage.setItem('antaq_auth_homolog', 'true');
    },

    limparSessao: function () {
      sessionStorage.removeItem(STORAGE_KEY_SESSAO);
      sessionStorage.removeItem('antaq_auth_homolog');
    },

    encerrarSessaoRestrita: function () {
      document.getElementById('drop-ambiente')?.classList.remove('aberto');
      this.limparSessao();
      this.aplicarAmbiente('producao');
      if (window.UI) {
        window.UI.toast('🔒 Sessão restrita encerrada com segurança. Painel em modo de Consulta Geral.');
      }
    },

    _obterEstadoLockout: function () {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY_LOCKOUT);
        if (!raw) return { tentativas: 0, bloqueadoAte: 0 };
        const st = JSON.parse(raw);
        if (st.bloqueadoAte && Date.now() > st.bloqueadoAte) {
          sessionStorage.removeItem(STORAGE_KEY_LOCKOUT);
          return { tentativas: 0, bloqueadoAte: 0 };
        }
        return { tentativas: Number(st.tentativas || 0), bloqueadoAte: Number(st.bloqueadoAte || 0) };
      } catch (_) {
        return { tentativas: 0, bloqueadoAte: 0 };
      }
    },

    _registrarFalhaTentativa: function () {
      const st = this._obterEstadoLockout();
      st.tentativas += 1;
      const maxT = this._config.maxTentativas || 5;
      if (st.tentativas >= maxT) {
        st.bloqueadoAte = Date.now() + (this._config.bloqueioSegundos || 60) * 1000;
      }
      sessionStorage.setItem(STORAGE_KEY_LOCKOUT, JSON.stringify(st));
      return st;
    },

    _limparTentativas: function () {
      sessionStorage.removeItem(STORAGE_KEY_LOCKOUT);
    },

    definir: async function (tipo) {
      document.getElementById('drop-ambiente')?.classList.remove('aberto');

      if (tipo === 'homologacao') {
        if (this.isSessaoValida()) {
          this.aplicarAmbiente('homologacao');
          return;
        }
        this.abrirModalAutenticacao(() => {
          this.aplicarAmbiente('homologacao');
        });
        return;
      }

      this.aplicarAmbiente(tipo);
    },

    /**
     * Garante que o Modal Institucional de Autenticação (#modal-auth-institucional) exista no DOM,
     * substituindo definitivamente o antigo window.prompt() que exibia a senha em texto aberto.
     */
    _garantirModalNoDOM: function () {
      if (document.getElementById('modal-auth-institucional')) return;

      const div = document.createElement('div');
      div.id = 'modal-auth-institucional';
      div.className = 'modal-buffer';
      div.style.cssText = 'z-index: 1000050;';
      div.innerHTML = `
        <div class="modal-buffer-card" style="max-width:480px !important; width:min(94vw, 480px) !important; border:1.5px solid #f59e0b !important; border-radius:12px !important; overflow:hidden !important; box-shadow:0 24px 60px rgba(0,0,0,0.85) !important;">
          <div class="modal-buffer-header" style="background:linear-gradient(135deg, #0a2540 0%, #1e293b 100%); border-bottom:1px solid rgba(245, 158, 11, 0.4); padding:14px 18px;">
            <h3 style="color:#fbbf24; font-size:14px; display:flex; align-items:center; gap:8px; margin:0;">
              <span style="font-size:19px;">🔐</span>
              <span>Autenticação Institucional — Ambiente Restrito (GEE/SEPH)</span>
            </h3>
            <button class="modal-matriz-fechar" type="button" onclick="AmbienteManager.fecharModalAutenticacao()" title="Fechar (ESC)">&times;</button>
          </div>

          <div class="modal-buffer-body" style="display:flex; flex-direction:column; gap:12px; padding:16px 18px !important;">
            <div style="background:#061426; border:1px solid #1e3a5f; border-left:4px solid #38bdf8; border-radius:6px; padding:9px 11px; font-size:11px; color:#cbd5e1; line-height:1.45;">
              <div>🛡️ <strong>Proteção Criptográfica Institucional Ativa:</strong></div>
              <div style="color:#94a3b8; font-size:10.5px; margin-top:2px;">
                Validação via derivação <code>PBKDF2-HMAC-SHA256</code> (100.000 iterações + Salt) ou Endpoint SSO/STI (<code>dados/config_auth_gee.json</code>). Nenhuma senha em texto puro é armazenada no código-fonte.
              </div>
            </div>

            <!-- Campo de Senha com Máscara e Botão Mostrar/Ocultar (👁️) -->
            <div class="buffer-linha" style="margin:0;">
              <label for="auth-gee-input-senha" style="display:flex; justify-content:space-between; align-items:center; font-size:11.5px; font-weight:700; color:#e2e8f0; margin-bottom:5px;">
                <span>🔑 Chave Técnica de Acesso Restrito (GEE / SEPH)</span>
                <span id="auth-gee-caps-aviso" style="display:none; color:#fbbf24; font-size:10px; font-weight:800;">⚠️ Caps Lock Ativado</span>
              </label>

              <div style="position:relative; display:flex; align-items:center; width:100%;">
                <input
                  type="password"
                  id="auth-gee-input-senha"
                  autocomplete="current-password"
                  spellcheck="false"
                  autocapitalize="off"
                  placeholder="Digite a senha institucional (oculta por padrão)..."
                  style="width:100%; box-sizing:border-box; background:#040d1a; border:1.5px solid #334155; color:#f8fafc; padding:10px 88px 10px 12px; border-radius:8px; font-size:13px; font-family:'Segoe UI', system-ui, sans-serif; letter-spacing:0.5px; outline:none; transition:border-color 0.2s;"
                  onfocus="this.style.borderColor='#38bdf8'"
                  onblur="this.style.borderColor='#334155'"
                >
                <button
                  type="button"
                  id="auth-gee-btn-toggle-olho"
                  onclick="AmbienteManager.alternarVisibilidadeSenha('auth-gee-input-senha', 'auth-gee-btn-toggle-olho')"
                  title="Mostrar ou ocultar os caracteres da senha enquanto digita"
                  style="position:absolute; right:6px; top:50%; transform:translateY(-50%); background:#1e293b; color:#bae6fd; border:1px solid #334155; padding:4px 9px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px; user-select:none;">
                  <span id="auth-gee-icone-olho">👁️</span>
                  <span id="auth-gee-txt-olho">Mostrar</span>
                </button>
              </div>
              <small style="font-size:10px; color:#64748b; margin-top:4px; display:block;">
                🔒 Os caracteres ficam ocultos (<code>••••</code>) contra exposição em tela ou reuniões. Clique em <strong>👁️ Mostrar</strong> se desejar conferir a digitação.
              </small>
            </div>

            <!-- Mensagem de erro / bloqueio anti-força bruta -->
            <div id="auth-gee-msg-feedback" style="display:none; padding:8px 10px; border-radius:6px; font-size:11px; font-weight:600;"></div>

            <!-- Utilitário para STI / Administrador GEE gerar novo hash PBKDF2 sem expor senha no código -->
            <details style="background:#040d1a; border:1px solid #1e293b; border-radius:6px; padding:7px 10px; font-size:10.5px; color:#94a3b8;">
              <summary style="cursor:pointer; font-weight:700; color:#38bdf8; user-select:none;">
                ⚙️ Governança STI / Trocar Senha Institucional (Gerador PBKDF2 + API SSO)
              </summary>
              <div style="margin-top:8px; display:flex; flex-direction:column; gap:7px; border-top:1px solid #1e293b; padding-top:8px;">
                <div style="line-height:1.4;">
                  Para alterar a senha institucional sem tocar no código-fonte, gere abaixo o novo bloco criptográfico <code>PBKDF2-HMAC-SHA256</code> e atualize o arquivo <code>dados/config_auth_gee.json</code> no servidor (ou configure o endpoint SSO da STI):
                </div>
                <div style="position:relative; display:flex; gap:6px; align-items:center;">
                  <input type="password" id="auth-sti-nova-senha" placeholder="Nova senha p/ gerar hash PBKDF2..."
                    style="flex:1; background:#061426; border:1px solid #334155; color:#e2e8f0; padding:6px 68px 6px 8px; border-radius:5px; font-size:11px;">
                  <button type="button" id="auth-sti-btn-olho"
                    onclick="AmbienteManager.alternarVisibilidadeSenha('auth-sti-nova-senha', 'auth-sti-btn-olho')"
                    style="position:absolute; right:96px; background:#1e293b; color:#cbd5e1; border:1px solid #334155; padding:2px 6px; border-radius:4px; font-size:10px; cursor:pointer;">
                    👁️
                  </button>
                  <button type="button" onclick="AmbienteManager.gerarHashParaSTI()"
                    style="background:#0369a1; color:#fff; border:1px solid #38bdf8; padding:6px 10px; border-radius:5px; font-size:10.5px; font-weight:700; cursor:pointer; white-space:nowrap;">
                    🔄 Gerar Hash
                  </button>
                </div>
                <textarea id="auth-sti-output-json" rows="3" readonly
                  placeholder="O bloco JSON com Salt aleatório e 100.000 iterações PBKDF2 aparecerá aqui..."
                  style="display:none; width:100%; box-sizing:border-box; background:#020813; border:1px solid #1e4976; color:#a7f3d0; font-family:Consolas,monospace; font-size:10px; padding:6px; border-radius:4px;"></textarea>
              </div>
            </details>
          </div>

          <div class="modal-buffer-footer" style="padding:12px 18px; background:#061426; border-top:1px solid #1e293b; display:flex; justify-content:space-between; align-items:center;">
            <button type="button" class="btn-secundario" onclick="AmbienteManager.fecharModalAutenticacao()">Cancelar</button>
            <button type="button" id="auth-gee-btn-confirmar" class="btn-primario" onclick="AmbienteManager.confirmarAutenticacaoModal()"
              style="background:linear-gradient(135deg, #d97706 0%, #f59e0b 100%); color:#000; font-weight:800; border:1px solid #fde047; padding:8px 18px;">
              🔓 Autenticar e Liberar Ambiente Restrito
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(div);

      const inp = document.getElementById('auth-gee-input-senha');
      if (inp) {
        inp.addEventListener('keydown', (e) => {
          const caps = e.getModifierState && e.getModifierState('CapsLock');
          const avisoCaps = document.getElementById('auth-gee-caps-aviso');
          if (avisoCaps) avisoCaps.style.display = caps ? 'inline' : 'none';
          if (e.key === 'Enter') {
            e.preventDefault();
            this.confirmarAutenticacaoModal();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            this.fecharModalAutenticacao();
          }
        });
        inp.addEventListener('keyup', (e) => {
          const caps = e.getModifierState && e.getModifierState('CapsLock');
          const avisoCaps = document.getElementById('auth-gee-caps-aviso');
          if (avisoCaps) avisoCaps.style.display = caps ? 'inline' : 'none';
        });
      }
    },

    /**
     * Alterna entre mostrar (type="text") e ocultar (type="password") a senha no momento da digitação
     */
    alternarVisibilidadeSenha: function (inputId, btnId) {
      const inp = document.getElementById(inputId || 'auth-gee-input-senha');
      if (!inp) return;
      const mostrando = inp.type === 'text';
      inp.type = mostrando ? 'password' : 'text';

      if (!inputId || inputId === 'auth-gee-input-senha') {
        const icone = document.getElementById('auth-gee-icone-olho');
        const txt = document.getElementById('auth-gee-txt-olho');
        const btn = document.getElementById(btnId || 'auth-gee-btn-toggle-olho');
        if (icone) icone.textContent = mostrando ? '👁️' : '🙈';
        if (txt) txt.textContent = mostrando ? 'Mostrar' : 'Ocultar';
        if (btn) {
          btn.style.background = mostrando ? '#1e293b' : '#78350f';
          btn.style.borderColor = mostrando ? '#334155' : '#f59e0b';
          btn.style.color = mostrando ? '#bae6fd' : '#fde68a';
        }
      } else {
        const btn = document.getElementById(btnId);
        if (btn) btn.textContent = mostrando ? '👁️' : '🙈';
      }
      inp.focus();
    },

    _resetarCampoSenhaOculto: function () {
      const inp = document.getElementById('auth-gee-input-senha');
      if (inp) {
        inp.value = '';
        inp.type = 'password';
      }
      const icone = document.getElementById('auth-gee-icone-olho');
      const txt = document.getElementById('auth-gee-txt-olho');
      const btn = document.getElementById('auth-gee-btn-toggle-olho');
      if (icone) icone.textContent = '👁️';
      if (txt) txt.textContent = 'Mostrar';
      if (btn) {
        btn.style.background = '#1e293b';
        btn.style.borderColor = '#334155';
        btn.style.color = '#bae6fd';
      }
    },

    abrirModalAutenticacao: async function (onSuccessCallback) {
      await this.carregarConfigExterna();
      this._garantirModalNoDOM();
      this._callbackSucessoPendente = typeof onSuccessCallback === 'function' ? onSuccessCallback : null;
      this._resetarCampoSenhaOculto();

      const msgEl = document.getElementById('auth-gee-msg-feedback');
      if (msgEl) {
        msgEl.style.display = 'none';
        msgEl.innerHTML = '';
      }

      const modal = document.getElementById('modal-auth-institucional');
      if (modal) modal.classList.add('aberto');

      this._atualizarBannerLockoutSeNecessario();

      setTimeout(() => {
        const inp = document.getElementById('auth-gee-input-senha');
        if (inp && !inp.disabled) inp.focus();
      }, 80);
    },

    fecharModalAutenticacao: function () {
      clearInterval(this._timerLockoutUI);
      this._resetarCampoSenhaOculto();
      const modal = document.getElementById('modal-auth-institucional');
      if (modal) modal.classList.remove('aberto');
      this._callbackSucessoPendente = null;
    },

    _atualizarBannerLockoutSeNecessario: function () {
      clearInterval(this._timerLockoutUI);
      const checar = () => {
        const st = this._obterEstadoLockout();
        const inp = document.getElementById('auth-gee-input-senha');
        const btn = document.getElementById('auth-gee-btn-confirmar');
        const msgEl = document.getElementById('auth-gee-msg-feedback');
        if (st.bloqueadoAte && st.bloqueadoAte > Date.now()) {
          const segRestantes = Math.ceil((st.bloqueadoAte - Date.now()) / 1000);
          if (inp) inp.disabled = true;
          if (btn) btn.disabled = true;
          if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.style.background = 'rgba(127, 29, 29, 0.45)';
            msgEl.style.border = '1px solid #ef4444';
            msgEl.style.color = '#fecaca';
            msgEl.innerHTML = `⏳ <strong>Proteção Anti-Força Bruta Ativada:</strong> Muitas tentativas incorretas. Aguarde <strong>${segRestantes}s</strong> para tentar novamente.`;
          }
          return true;
        } else {
          if (inp) inp.disabled = false;
          if (btn) btn.disabled = false;
          clearInterval(this._timerLockoutUI);
          return false;
        }
      };
      if (checar()) {
        this._timerLockoutUI = setInterval(checar, 1000);
      }
    },

    confirmarAutenticacaoModal: async function () {
      if (this._atualizarBannerLockoutSeNecessario()) return;

      const inp = document.getElementById('auth-gee-input-senha');
      const msgEl = document.getElementById('auth-gee-msg-feedback');
      const btn = document.getElementById('auth-gee-btn-confirmar');
      const senhaDigitada = (inp?.value || '').trim();

      if (!senhaDigitada) {
        if (msgEl) {
          msgEl.style.display = 'block';
          msgEl.style.background = 'rgba(120, 53, 15, 0.4)';
          msgEl.style.border = '1px solid #f59e0b';
          msgEl.style.color = '#fde68a';
          msgEl.innerHTML = '⚠️ Digite a chave técnica institucional para continuar.';
        }
        if (inp) inp.focus();
        return;
      }

      // Garante que a senha volte a ficar oculta imediatamente ao submeter
      if (inp) inp.type = 'password';

      const txtOrigBtn = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Verificando criptografia...';
      }

      try {
        let autenticado = false;
        let metodoUsado = 'PBKDF2-HMAC-SHA256';

        // 1. Se o administrador STI ativou validação via Backend Corporativo (SSO / LDAP / API)
        if (this._config.usarEndpointSTISeDisponivel && this._config.endpointAuthSTI) {
          try {
            const resp = await fetch(this._config.endpointAuthSTI, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ senha: senhaDigitada, modulo: 'WEBGIS_GEE_SEPH' })
            });
            if (resp.ok) {
              const data = await resp.json();
              if (data && data.autorizado === true) {
                autenticado = true;
                metodoUsado = 'STI-SSO-API';
              }
            }
          } catch (_) {
            // Se o endpoint corporativo não estiver acessível no ambiente local, prossegue para o verificador PBKDF2
          }
        }

        // 2. Verificação Criptográfica Local via Web Crypto API (PBKDF2 100.000 iterações + Salt) com Fallback SHA256-Salted Puro JS
        if (!autenticado) {
          const listaPBKDF2 = Array.isArray(this._config.pbkdf2.hashesAutorizadosHex)
            ? this._config.pbkdf2.hashesAutorizadosHex
            : [this._config.pbkdf2.hashHex];
          const listaFallback = Array.isArray(this._config.pbkdf2.hashesSaltedFallbackHex)
            ? this._config.pbkdf2.hashesSaltedFallbackHex
            : [];

          if (window.crypto && window.crypto.subtle && typeof window.crypto.subtle.importKey === 'function') {
            try {
              const hashDerivado = await this.derivarPBKDF2Hex(
                senhaDigitada,
                this._config.pbkdf2.salt,
                this._config.pbkdf2.iteracoes
              );
              if (hashDerivado === this._config.pbkdf2.hashHex || listaPBKDF2.includes(hashDerivado)) {
                autenticado = true;
                metodoUsado = 'PBKDF2-HMAC-SHA256';
              }
            } catch (_) {}
          }

          if (!autenticado && listaFallback.length > 0) {
            const saltedInput = `${this._config.pbkdf2.salt}:${senhaDigitada}`;
            const hashSalted = await this.sha256(saltedInput);
            if (listaFallback.includes(hashSalted)) {
              autenticado = true;
              metodoUsado = 'SHA256-SALTED-FALLBACK';
            }
          }
        }

        if (!autenticado) {
          const st = this._registrarFalhaTentativa();
          const maxT = this._config.maxTentativas || 5;
          const rest = Math.max(0, maxT - st.tentativas);
          if (st.bloqueadoAte && st.bloqueadoAte > Date.now()) {
            this._atualizarBannerLockoutSeNecessario();
          } else if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.style.background = 'rgba(127, 29, 29, 0.45)';
            msgEl.style.border = '1px solid #ef4444';
            msgEl.style.color = '#fecaca';
            msgEl.innerHTML = `❌ <strong>Acesso Negado:</strong> Credencial incorreta. Restam <strong>${rest}</strong> tentativa(s) antes do bloqueio temporário.`;
          }
          if (inp) {
            inp.value = '';
            inp.focus();
          }
          return;
        }

        // Sucesso! Limpa contador de falhas, emite token assinado com TTL e ativa ambiente
        this._limparTentativas();
        this.registrarSessaoAutenticada(metodoUsado);
        const cb = this._callbackSucessoPendente;
        this.fecharModalAutenticacao();

        if (window.UI) {
          window.UI.toast('🔓 Autenticação institucional confirmada! Ambiente Restrito (Estudos GEE/SEPH) ativado.');
        }
        if (cb) cb();
        else this.aplicarAmbiente('homologacao');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = txtOrigBtn || '🔓 Autenticar e Liberar Ambiente Restrito';
        }
      }
    },

    /**
     * Utilitário para a STI/ANTAQ gerar um novo hash PBKDF2-HMAC-SHA256 (100.000 iterações) com Salt novo
     * para substituir em dados/config_auth_gee.json sem nunca expor a senha no código.
     */
    gerarHashParaSTI: async function () {
      const inp = document.getElementById('auth-sti-nova-senha');
      const out = document.getElementById('auth-sti-output-json');
      const novaSenha = (inp?.value || '').trim();
      if (!novaSenha || novaSenha.length < 6) {
        if (window.UI) window.UI.toast('⚠️ Informe uma nova senha com pelo menos 6 caracteres para gerar o hash PBKDF2.', 'alerta');
        return;
      }
      const randBytes = new Uint8Array(12);
      crypto.getRandomValues(randBytes);
      const saltHex = Array.from(randBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const novoSalt = `ANTAQ_GEE_SALT_${saltHex}`;
      const iteracoes = 100000;
      const novoHash = await this.derivarPBKDF2Hex(novaSenha, novoSalt, iteracoes);

      const bloco = {
        pbkdf2: {
          algoritmo: 'PBKDF2-HMAC-SHA256',
          iteracoes: iteracoes,
          salt: novoSalt,
          hashHex: novoHash
        }
      };
      if (out) {
        out.style.display = 'block';
        out.value = JSON.stringify(bloco, null, 2);
      }
      if (inp) inp.type = 'password';
      if (window.UI) window.UI.toast('🔑 Novo bloco PBKDF2 gerado! Copie para dados/config_auth_gee.json.');
    },

    aplicarAmbiente: function (tipo, silencioso) {
      this.atual = tipo;
      const txt = document.getElementById('txt-ambiente');
      const itemH = document.getElementById('item-env-homolog');
      const itemP = document.getElementById('item-env-prod');
      const itemLogout = document.getElementById('item-env-logout');
      const btnEnv = document.getElementById('btn-env-topo');

      if (tipo === 'homologacao') {
        if (txt) txt.innerText = 'Homologação (Estudos GEE)';
        if (btnEnv) { btnEnv.style.background = '#f59e0b'; btnEnv.style.color = '#000'; }
        itemH?.classList.add('ativo');
        itemP?.classList.remove('ativo');
        if (itemLogout) itemLogout.style.display = 'block';
        document.body.classList.add('modo-homologacao');
        if (!silencioso && window.UI) window.UI.toast('🟡 Modo Homologação Ativo: Módulos restritos liberados.');
      } else {
        if (txt) txt.innerText = 'Produção (Oficial ANTAQ)';
        if (btnEnv) { btnEnv.style.background = '#0a2540'; btnEnv.style.color = '#38bdf8'; }
        itemP?.classList.add('ativo');
        itemH?.classList.remove('ativo');
        if (itemLogout) itemLogout.style.display = 'none';
        document.body.classList.remove('modo-homologacao');
        if (!silencioso && window.UI) window.UI.toast('🟢 Modo Produção Ativo: Consulta Geral ANTAQ.');
      }
    }
  };

  window.AmbienteManager = AmbienteManager;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AmbienteManager.init());
  } else {
    AmbienteManager.init();
  }
  console.info('[js] AmbienteManager v2.0 (PBKDF2 + Modal Oculto + Toggle Olho) carregado');
})();
