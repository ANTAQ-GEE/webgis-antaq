/* ============================================================
   WebGIS ANTAQ — Módulo: AmbienteManager
   Escopo: alternância produção / homologação com autenticação SHA-256
   Dependências: window.UI
   Expõe: window.AmbienteManager
   ============================================================ */
(function () {
  'use strict';

  const AmbienteManager = {
    atual: 'producao',
    hashCorreto: '847ad09d04f991bbc665ab36a7e2cfb55f2e70bf488fad1b615083d999a401fe',

    sha256: async function (texto) {
      const msgBuffer = new TextEncoder().encode(texto);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    definir: async function (tipo) {
      document.getElementById('drop-ambiente')?.classList.remove('aberto');

      if (tipo === 'homologacao') {
        const auth = sessionStorage.getItem('antaq_auth_homolog');
        if (auth !== 'true') {
          const senhaDigitada = prompt("🔒 ACESSO RESTRITO - HOMOLOGAÇÃO GEE/SEPH\n\nDigite a senha técnica institucional:");
          if (!senhaDigitada) return;
          const hashDigitado = await this.sha256(senhaDigitada.trim());
          if (hashDigitado !== this.hashCorreto) {
            alert("❌ Acesso Negado: Senha incorreta.\n\nO ambiente de homologação é restrito à equipe GEE/SEPH.");
            return;
          }
          sessionStorage.setItem('antaq_auth_homolog', 'true');
          if (window.UI) window.UI.toast("🔓 Acesso autorizado! Ambiente de Homologação ativado.");
        }
      }
      this.aplicarAmbiente(tipo);
    },

    aplicarAmbiente: function (tipo) {
      this.atual = tipo;
      const txt = document.getElementById('txt-ambiente');
      const itemH = document.getElementById('item-env-homolog');
      const itemP = document.getElementById('item-env-prod');
      const btnEnv = document.getElementById('btn-env-topo');

      if (tipo === 'homologacao') {
        if (txt) txt.innerText = 'Homologação (Estudos GEE)';
        if (btnEnv) { btnEnv.style.background = '#f59e0b'; btnEnv.style.color = '#000'; }
        itemH?.classList.add('ativo'); itemP?.classList.remove('ativo');
        document.body.classList.add('modo-homologacao');
        if (window.UI) window.UI.toast("🟡 Modo Homologação Ativo: Edição liberada.");
      } else {
        if (txt) txt.innerText = 'Produção (Oficial ANTAQ)';
        if (btnEnv) { btnEnv.style.background = '#0a2540'; btnEnv.style.color = '#38bdf8'; }
        itemP?.classList.add('ativo'); itemH?.classList.remove('ativo');
        document.body.classList.remove('modo-homologacao');
        if (window.UI) window.UI.toast("🟢 Modo Produção Ativo: Padrão oficial travado.");
      }
    }
  };

  window.AmbienteManager = AmbienteManager;
  console.info('[js] AmbienteManager carregado');
})();