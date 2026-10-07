/**
 * Helpers reutilizáveis para os smoke tests do WebGIS ANTAQ.
 * Última atualização: 2026-10-07
 */

const ARQUIVO_ALVO = '/index.html';

/**
 * Ruídos que NÃO devem falhar o teste.
 */
const ERROS_IGNORADOS = [
  /tile\.openstreetmap\.org/i,
  /arcgisonline\.com/i,
  /services\.arcgisonline\.com/i,
  /favicon\.ico/i,
  /net::ERR_INTERNET_DISCONNECTED/i,
  /net::ERR_NAME_NOT_RESOLVED/i,
  /^\[URLState\]/i,
  /^\[WebGIS\]/i,
  /^\[M\d\]/i,
  /^\[G\d\]/i,
  /^\[R\d\]/i,
  /^\[QGIS\]/i,
  /WebGIS ANTAQ inicializado/i,
  /Manifesto não carregado/i
];

function coletarErrosConsole(page) {
  const erros = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const texto = msg.text();

    let url = '';
    try {
      const loc = msg.location();
      if (loc && loc.url) url = loc.url;
    } catch (e) { /* ignora */ }

    const ehIgnorado = ERROS_IGNORADOS.some((re) =>
      re.test(texto) || (url && re.test(url))
    );
    if (ehIgnorado) return;

    if (/Failed to load resource/i.test(texto) &&
        (/favicon\.ico/i.test(url) || url === '')) {
      return;
    }

    erros.push(`[console.error] ${texto}${url ? ` (${url})` : ''}`);
  });

  page.on('pageerror', (err) => {
    erros.push(`[pageerror] ${err.message}`);
  });

  return erros;
}

async function abrirWebGIS(page) {
  await page.goto(ARQUIVO_ALVO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.rodape-versao', {
    state: 'visible',
    timeout: 20_000
  });
}

async function lerGlobal(page, nomeVariavel) {
  return page.evaluate((nome) => {
    try {
      return new Function(`return typeof ${nome};`)();
    } catch (e) {
      return 'undefined';
    }
  }, nomeVariavel);
}

/**
 * Prepara a página para screenshot determinístico.
 */
async function prepararParaScreenshot(page) {
  await page.evaluate(() => document.fonts && document.fonts.ready);

  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
      .notificacao .notif-progresso span {
        display: none !important;
      }
    `
  });

  await page.evaluate(() => {
    const c = document.getElementById('notificacoes-container');
    if (c) c.innerHTML = '';
  });

  await page.waitForTimeout(300);
}

/**
 * Mascara elementos que mudam com o tempo.
 */
function mascararDinamicos(page) {
  return [
    page.locator('#rodape-build'),
    page.locator('#rodape-dados'),
    page.locator('.leaflet-control-coords'),
    page.locator('.leaflet-control-minimap')
  ];
}

/**
 * Expande temporariamente um elemento com overflow pra screenshot completo.
 * Injeta CSS que remove max-height, tira screenshot, e remove o CSS.
 */
async function expandirParaScreenshot(page, seletor, alturaMaxima) {
  alturaMaxima = alturaMaxima || 3000;
  const id = 'screenshot-expand-' + Date.now();

  await page.addStyleTag({
    content: `
      ${seletor} {
        max-height: ${alturaMaxima}px !important;
        height: auto !important;
        overflow: visible !important;
      }
      ${seletor} > *,
      ${seletor} * {
        overflow: visible !important;
      }
    `
  });
  await page.waitForTimeout(200);
}

module.exports = {
  ARQUIVO_ALVO,
  coletarErrosConsole,
  abrirWebGIS,
  lerGlobal,
  prepararParaScreenshot,
  mascararDinamicos,
  expandirParaScreenshot
};