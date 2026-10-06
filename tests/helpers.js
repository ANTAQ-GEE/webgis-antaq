/**
 * Helpers reutilizáveis para os smoke tests do WebGIS ANTAQ.
 * Última atualização: 2026-10-05
 */

const ARQUIVO_ALVO = '/index_teste_melhoria.html';

/**
 * Ruídos que NÃO devem falhar o smoke test:
 * - tiles externos (OSM minimap, Esri basemap) podem responder devagar
 * - favicon ausente é comportamento padrão do GitHub Pages
 * - logs informativos do próprio WebGIS no console
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

/**
 * Anexa listeners na página para capturar erros reais.
 * Retorna um array que vai sendo preenchido conforme o teste roda.
 */
function coletarErrosConsole(page) {
  const erros = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const texto = msg.text();

    // Pega a URL real associada à mensagem (se houver).
    // Sem isso, erros tipo "Failed to load resource: 404" ficam órfãos
    // porque o Chromium não inclui a URL no texto — só o status.
    let url = '';
    try {
      const loc = msg.location();
      if (loc && loc.url) url = loc.url;
    } catch (e) { /* ignora */ }

    // Filtro por texto OU por URL
    const ehIgnorado = ERROS_IGNORADOS.some((re) =>
      re.test(texto) || (url && re.test(url))
    );
    if (ehIgnorado) return;

    // Caso especial: "Failed to load resource" 404 genérico.
    // Só ignora se a URL (quando conhecida) for favicon. Se não sabemos
    // a URL, é melhor ignorar — falso positivo do Chromium no boot.
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

/**
 * Abre a aplicação e aguarda o boot inicial.
 * O rodapé `.rodape-versao` só aparece após `WebGISAbout.init()` rodar,
 * que é a última etapa do IIFE de inicialização.
 */
async function abrirWebGIS(page) {
  await page.goto(ARQUIVO_ALVO, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.rodape-versao', {
    state: 'visible',
    timeout: 20_000
  });
}

/**
 * Lê o TIPO de uma variável top-level do `<script>` da página.
 * Retorna a string "object", "function", "undefined", etc. — nunca o objeto
 * em si (Leaflet tem referências circulares que quebram a serialização).
 */
async function lerGlobal(page, nomeVariavel) {
  return page.evaluate((nome) => {
    try {
      return new Function(`return typeof ${nome};`)();
    } catch (e) {
      return 'undefined';
    }
  }, nomeVariavel);
}

module.exports = {
  ARQUIVO_ALVO,
  coletarErrosConsole,
  abrirWebGIS,
  lerGlobal
};