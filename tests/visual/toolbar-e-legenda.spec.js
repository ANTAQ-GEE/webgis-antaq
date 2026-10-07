/* ============================================================
   Q1(C) — Regressão visual: Toolbar de Medição + Legenda
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { abrirWebGIS, prepararParaScreenshot, expandirParaScreenshot } = require('../helpers');

test.describe.configure({ timeout: 60000 });

test.describe('Visual · Toolbar e Legenda', () => {
  test.beforeEach(async ({ page }) => {
    await abrirWebGIS(page);
    await page.waitForFunction(() => !!window.MeasurementTool, { timeout: 15000 });
    await page.waitForTimeout(500);
    await prepararParaScreenshot(page);
  });

  test('toolbar de medição — estado normal', async ({ page }) => {
    const toolbar = page.locator('#toolbar-medicao');
    await expect(toolbar).toBeVisible();
    await expect(toolbar).toHaveScreenshot('toolbar-normal.png');
  });

  test('toolbar de medição — Snap ativo', async ({ page }) => {
    await page.locator('#btn-medicao-snap').click();
    await page.waitForTimeout(200);
    const toolbar = page.locator('#toolbar-medicao');
    await expect(toolbar).toHaveScreenshot('toolbar-snap-ativo.png');
  });

  test('toolbar de medição — modo distância ativo', async ({ page }) => {
    await page.locator('#btn-medir-distancia').click();
    await page.waitForTimeout(200);
    const toolbar = page.locator('#toolbar-medicao');
    await expect(toolbar).toHaveScreenshot('toolbar-distancia-ativo.png');
  });

  test('legenda cartográfica expandida', async ({ page }) => {
    const legenda = page.locator('.caixa-legenda');
    await expect(legenda).toBeVisible();

    // Expande ANTES do screenshot
    await expandirParaScreenshot(page, '.caixa-legenda', 1200);
    await expandirParaScreenshot(page, '#corpo-legenda', 1100);

    await page.waitForTimeout(600);

    await expect(legenda).toHaveScreenshot('legenda-expandida.png', {
      maxDiffPixels: 500,
      maxDiffPixelRatio: 0.02,
      timeout: 15000
    });
  });

  test('legenda cartográfica minimizada', async ({ page }) => {
    const legenda = page.locator('.caixa-legenda');
    await expect(legenda).toBeVisible();

    await page.locator('.legenda-topo').click();
    await page.waitForTimeout(500);

    await expect(legenda).toHaveScreenshot('legenda-minimizada.png', {
      maxDiffPixels: 300,
      maxDiffPixelRatio: 0.05,
      timeout: 15000
    });
  });
});