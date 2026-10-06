/**
 * Smoke tests — WebGIS ANTAQ
 * Valida que o boot funciona e que os módulos principais estão vivos.
 * Não testa geometria nem regras de negócio (isso é Q1 fase B).
 */
const { test, expect } = require('@playwright/test');
const { coletarErrosConsole, abrirWebGIS, lerGlobal } = require('./helpers');

test.describe.configure({ mode: 'serial' });
test.describe('WebGIS ANTAQ · Smoke', () => {

  test('01 · página carrega sem erros de console', async ({ page }) => {
    const erros = coletarErrosConsole(page);
    await abrirWebGIS(page);
    await page.waitForTimeout(3000);   // deixa init() terminar

    expect(
      erros,
      `Erros de console inesperados:\n${erros.join('\n')}`
    ).toEqual([]);
  });

  test('02 · módulos principais estão vivos no escopo da página', async ({ page }) => {
    await abrirWebGIS(page);

    const nomes = [
      'FetchManager',
      'DataManager',
      'NotificationManager',
      'SelectionManager',
      'MeasurementTool',
      'LayerMetadata',
      'WebGISAbout',
      'URLState',
      'CONFIG_CAMADAS',
      'mapa'
    ];

    for (const nome of nomes) {
      const tipo = await lerGlobal(page, nome);
      expect(tipo, `"${nome}" não está definido na página`).not.toBe('undefined');
    }
  });

  test('03 · CONFIG_CAMADAS tem ao menos 10 entradas', async ({ page }) => {
    await abrirWebGIS(page);
    const total = await page.evaluate(() => {
      // eslint-disable-next-line no-new-func
      const cfg = new Function('return CONFIG_CAMADAS')();
      return Object.keys(cfg || {}).length;
    });
    expect(total).toBeGreaterThanOrEqual(10);
  });

  test('04 · pelo menos um badge sai de "(carregando…)"', async ({ page }) => {
    await abrirWebGIS(page);

    await expect.poll(
      async () => {
        return page.evaluate(() => {
          const badges = Array.from(document.querySelectorAll('[id^="cnt-"]'));
          return badges.filter((el) => /^\(\d+/.test(el.innerText.trim())).length;
        });
      },
      { timeout: 20_000, message: 'Nenhuma camada terminou de carregar em 20s' }
    ).toBeGreaterThan(0);
  });

  test('05 · painel lateral recolhe e reabre', async ({ page }) => {
    await abrirWebGIS(page);
    const painel = page.locator('#painel-camadas-lateral');

    await expect(painel).not.toHaveClass(/recolhido/);
    await painel.locator('button[title="Recolher Painel"]').click();
    await expect(painel).toHaveClass(/recolhido/);

    await page.locator('#btn-flutuante-painel').click();
    await expect(painel).not.toHaveClass(/recolhido/);
  });

  test('06 · painel analítico abre', async ({ page }) => {
    await abrirWebGIS(page);
    await page.getByRole('button', { name: /Painel Analítico/i }).click();
    await expect(page.locator('#painel-graficos')).toHaveClass(/aberto/);
  });

  test('07 · troca de basemap para "escuro" funciona', async ({ page }) => {
    await abrirWebGIS(page);
    await page.locator('input[name="basemap"][value="escuro"]').check();

    const ativo = await page.evaluate(() => window._basemapAtual);
    expect(ativo).toBe('escuro');
  });

  test('08 · atalho "d" ativa medição de distância', async ({ page }) => {
    await abrirWebGIS(page);

    // Foca na página antes de mandar a tecla
    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('d');

    const modo = await page.evaluate(() => {
      // eslint-disable-next-line no-new-func
      return new Function('return MeasurementTool.modo;')();
    });
    expect(modo).toBe('distancia');
  });

  test('09 · F1 abre o modal "Sobre" com a versão', async ({ page }) => {
    await abrirWebGIS(page);

    await page.keyboard.press('F1');
    const modal = page.locator('#modal-sobre');
    await expect(modal).toHaveClass(/aberto/);

    // Lê a versão pela DOM (mais robusto que window.WebGIS_VERSION)
    const versaoRodape = await page.locator('#rodape-versao-num').innerText();
    const match = versaoRodape.match(/v\d+\.\d+\.\d+/);
    expect(match, `Versão não encontrada no rodapé: "${versaoRodape}"`).toBeTruthy();

    await expect(modal).toContainText(match[0]);
  });

  test('10 · rodapé de versionamento exibe versão e build', async ({ page }) => {
    await abrirWebGIS(page);

    const rodape = page.locator('#rodape-versao');
    await expect(rodape).toBeVisible();
    await expect(rodape).toContainText(/v\d+\.\d+\.\d+/);
    await expect(rodape).toContainText(/build/i);
  });

});