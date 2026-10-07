/* ============================================================
   WebGIS ANTAQ — Módulo: WebGISAbout (M7)
   Escopo: rodapé de versionamento + modal "Sobre este WebGIS"
   Dependências: window.WebGIS_VERSION, window.Security, window.UI
   Expõe: window.WebGISAbout
   ============================================================ */
(function () {
  'use strict';

  const WebGISAbout = {
    _jaInicializado: false,

    init: function () {
      if (this._jaInicializado) return;
      this._jaInicializado = true;

      this._renderizarRodape();
      this._configurarAtalhos();
      this._verificarNovidadeVersao();

      console.info(`[WebGIS] Versão ${window.WebGIS_VERSION.versao} (${window.WebGIS_VERSION.canal}) — build ${window.WebGIS_VERSION.build}`);
    },

    abrir: function () {
      const corpo = document.getElementById('sobre-corpo');
      if (!corpo) return;

      const V = window.WebGIS_VERSION;
      const badgeCanal = V.canal === 'producao'
        ? '<span class="badge-canal producao">Produção</span>'
        : '<span class="badge-canal teste">Homologação</span>';

      const changelogHTML = V.changelog.map(item => `
        <li class="changelog-item">
          <div class="changelog-versao">
            <span class="num ${item.canal === 'teste' ? 'teste' : ''}">v${window.Security.escapeHTML(item.versao)}</span>
            <span class="data">${window.Security.escapeHTML(item.data)}</span>
          </div>
          <ul class="changelog-notas">
            ${item.notas.map(n => `<li>${window.Security.escapeHTML(n)}</li>`).join('')}
          </ul>
        </li>
      `).join('');

      corpo.innerHTML = `
        <div class="sobre-bloco">
          <div class="sobre-titulo">Sobre esta aplicação</div>
          <p class="sobre-descricao">${window.Security.escapeHTML(V.descricao)}</p>
        </div>

        <div class="sobre-bloco">
          <div class="sobre-titulo">Informações técnicas</div>
          <div class="sobre-grid">
            <div class="sobre-info">
              <div class="rotulo">Versão</div>
              <div class="valor">${window.Security.escapeHTML(V.versao)} ${badgeCanal}</div>
            </div>
            <div class="sobre-info">
              <div class="rotulo">Build</div>
              <div class="valor mono">${window.Security.escapeHTML(V.build)}</div>
            </div>
            <div class="sobre-info">
              <div class="rotulo">Commit</div>
              <div class="valor mono">
                ${window.Security.escapeHTML(V.commit)}
                <button class="btn-copiar-inline" onclick="WebGISAbout._copiarCommit()" title="Copiar hash completo">Copiar</button>
              </div>
            </div>
            <div class="sobre-info">
              <div class="rotulo">Última atualização dos dados</div>
              <div class="valor">${window.Security.escapeHTML(V.atualizado)}</div>
            </div>
          </div>
        </div>

        <div class="sobre-bloco">
          <div class="sobre-titulo">Governança e contato</div>
          <div class="sobre-creditos">
            <strong>Responsável técnico:</strong> ${window.Security.escapeHTML(V.responsavel)}<br>
            <strong>Contato:</strong> <a class="sobre-link" href="mailto:${window.Security.escapeHTML(V.contato)}">${window.Security.escapeHTML(V.contato)}</a><br>
            <strong>Repositório:</strong> <a class="sobre-link" href="${window.Security.escapeHTML(V.repositorio)}" target="_blank" rel="noopener">${window.Security.escapeHTML(V.repositorio)}</a><br>
            <strong>Licença:</strong> ${window.Security.escapeHTML(V.licenca)}
          </div>
        </div>

        <div class="sobre-bloco">
          <div class="sobre-titulo">Changelog (últimas versões)</div>
          <ul class="changelog-lista">${changelogHTML}</ul>
        </div>
      `;

      document.getElementById('modal-sobre').classList.add('aberto');
    },

    fechar: function () {
      document.getElementById('modal-sobre').classList.remove('aberto');
    },

    _renderizarRodape: function () {
      const V = window.WebGIS_VERSION;
      const rodape = document.getElementById('rodape-versao');
      if (!rodape) return;

      const set = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = txt;
      };

      set('rodape-versao-num',
        `<strong>WebGIS ANTAQ</strong> v${window.Security.escapeHTML(V.versao)}
         <span class="badge-canal ${V.canal === 'producao' ? 'producao' : 'teste'}">
           ${V.canal === 'producao' ? 'Produção' : 'Homologação'}
         </span>`);

      set('rodape-build', `build ${window.Security.escapeHTML(V.build)} · <span class="mono">${window.Security.escapeHTML(V.commit)}</span>`);
      // ✅ Data de "hoje" no formato do usuário
      const agora = new Date();
      const dataFormatada = agora.toLocaleDateString('pt-BR');
      const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      set('rodape-dados', `📅 Dados: ${window.Security.escapeHTML(V.atualizado)} · Acesso: ${dataFormatada} ${horaFormatada}`);
      set('rodape-responsavel', window.Security.escapeHTML(V.responsavel));

      rodape.style.display = 'flex';
    },

    _configurarAtalhos: function () {
      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          const m = document.getElementById('modal-sobre');
          if (m && m.classList.contains('aberto')) {
            ev.stopPropagation();
            this.fechar();
          }
        }
        if (ev.key === 'F1') {
          ev.preventDefault();
          this.abrir();
        }
      });

      const modal = document.getElementById('modal-sobre');
      if (modal) {
        modal.addEventListener('click', (ev) => {
          if (ev.target === modal) this.fechar();
        });
      }
    },

    _verificarNovidadeVersao: function () {
      try {
        const chave = 'antaq_webgis_versao_vista';
        const versaoVista = localStorage.getItem(chave);
        const versaoAtual = window.WebGIS_VERSION.versao;

        if (versaoVista !== versaoAtual) {
          localStorage.setItem(chave, versaoAtual);

          if (!versaoVista) {
            console.info('[WebGIS] Primeira visita registrada.');
            return;
          }

          console.info(`[WebGIS] Nova versão detectada: ${versaoVista} → ${versaoAtual}`);

          const btn = document.getElementById('btn-sobre');
          if (btn) btn.classList.add('aviso-novo');

          setTimeout(() => {
            if (window.UI) {
              window.UI.toast(
                `✨ Atualizado para <strong>v${window.Security.escapeHTML(versaoAtual)}</strong>. ` +
                `<a href="#" onclick="event.preventDefault(); WebGISAbout.abrir();" style="color:#38bdf8; text-decoration:underline;">Ver novidades</a>`
              );
            }
            setTimeout(() => { if (btn) btn.classList.remove('aviso-novo'); }, 8000);
          }, 2000);
        }
      } catch (e) {
        console.warn('[WebGIS] Não foi possível verificar versão:', e);
      }
    },

    _copiarCommit: function () {
      try {
        navigator.clipboard.writeText(window.WebGIS_VERSION.commit).then(() => {
          if (window.UI) window.UI.toast('📋 Hash do commit copiado.');
        });
      } catch (e) {
        if (window.UI) window.UI.toast('⚠️ Não foi possível copiar.');
      }
    },

    obterVersao: function () { return window.WebGIS_VERSION.versao; },
    obterCanal: function () { return window.WebGIS_VERSION.canal; },
    obterCommit: function () { return window.WebGIS_VERSION.commit; }
  };

  window.WebGISAbout = WebGISAbout;
  console.info('[js] WebGISAbout carregado');
})();