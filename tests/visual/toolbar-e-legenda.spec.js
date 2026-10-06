/* ============================================================
   Q1(C) — Regressão visual: Toolbar de Medição + Legenda
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { abrirWebGIS, prepararParaScreenshot } = require('../helpers');

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

    await expect(legenda).toHaveScreenshot('legenda-expandida.png');
  });

  test('legenda cartográfica minimizada', async ({ page }) => {
    await page.locator('.legenda-topo').click();
    await page.waitForTimeout(200);

    const legenda = page.locator('.caixa-legenda');
    await expect(legenda).toHaveScreenshot('legenda-minimizada.png');
  });
});