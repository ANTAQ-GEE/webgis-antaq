/* ============================================================
   M10 / Regressão · Geoprocessamento, Busca e Snap de Medição
   WebGIS ANTAQ — Testes End-to-End Playwright
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { abrirWebGIS } = require('./helpers');

test.describe('M10 · Geoprocessamento, Busca e Snap', () => {
  test.beforeEach(async ({ page }) => {
    await abrirWebGIS(page);
    await page.waitForFunction(
      () => !!window.CAMADAS_MAPA?.instalacoes_portuarias,
      { timeout: 25000 }
    );
  });

  test('01 · botão roxo antigo de Geo NÃO existe mais no cabeçalho', async ({ page }) => {
    const btnGeoHeader = page.locator('.top-header .btn-geo');
    await expect(btnGeoHeader).toHaveCount(0);
  });

  test('02 · aba ⚙️ GEO abre modal de geoprocessamento', async ({ page }) => {
    await page.locator('.aba-btn[data-aba="geo"]').click();
    await expect(page.locator('#modal-geo')).toHaveClass(/aberto/, { timeout: 5000 });
  });

  test('03 · busca no filtro retorna resultados a partir de 1 caractere', async ({ page }) => {
    const inputBusca = page.locator('#input-busca');
    await expect(inputBusca).toBeVisible();

    // Digita uma única letra "t"
    await inputBusca.fill('t');
    await page.waitForTimeout(400);

    const listaResultados = page.locator('#resultados-busca');
    await expect(listaResultados).toBeVisible({ timeout: 5000 });

    const itens = listaResultados.locator('.item-resultado');
    const total = await itens.count();
    expect(total).toBeGreaterThan(0);
  });

  test('04 · cálculo de geoprocessamento (Pontos em Polígono) gera camada no mapa', async ({ page }) => {
    // Abre modal de geoprocessamento
    await page.locator('.aba-btn[data-aba="geo"]').click();
    await expect(page.locator('#modal-geo')).toHaveClass(/aberto/);

    // Seleciona Camada A: instalacoes_portuarias
    await page.locator('#geo-camada-a').selectOption('instalacoes_portuarias');

    // Seleciona Camada B: uf
    await page.locator('#geo-camada-b').selectOption('uf');

    // Clica no card da operação "Pontos em"
    await page.locator('.geo-op-opcao input[value="pontos_em"]').click({ force: true });
    await page.waitForTimeout(200);

    // Clica em Calcular
    await page.locator('#btn-geo-calcular').click();

    // Modal deve fechar automaticamente após o término do cálculo
    await expect(page.locator('#modal-geo')).not.toHaveClass(/aberto/, { timeout: 15000 });

    // Verifica que uma camada do tipo "geo_" foi criada em CAMADAS_MAPA
    const temCamadaGeo = await page.evaluate(() => {
      const keys = Object.keys(window.CAMADAS_MAPA || {});
      return keys.some(k => k.startsWith('geo_') && k.includes('pontos_em'));
    });
    expect(temCamadaGeo).toBe(true);
  });

  test('05 · snap de medição indexa vértices dinamicamente', async ({ page }) => {
    // Ativa a ferramenta de medição de distância
    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('d');

    // Liga o botão de Snap
    const btnSnap = page.locator('#btn-medicao-snap');
    await btnSnap.click();
    await expect(btnSnap).toHaveClass(/ativo-snap/);

    // Verifica que os vértices foram computados
    const totalVertices = await page.evaluate(() => window.MeasurementTool?._snapTotal || 0);
    expect(totalVertices).toBeGreaterThan(0);
  });
});
