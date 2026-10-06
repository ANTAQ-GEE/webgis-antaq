/* ============================================================
   Q1(C) — Regressão visual: Painel Lateral
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { abrirWebGIS, prepararParaScreenshot, mascararDinamicos } = require('../helpers');

test.describe.configure({ timeout: 60000 });

test.describe('Visual · Painel Lateral', () => {
  test.beforeEach(async ({ page }) => {
    await abrirWebGIS(page);
    await page.waitForFunction(() => !!window.CAMADAS_MAPA?.uf, { timeout: 25000 });
    await page.waitForTimeout(1000);
    await prepararParaScreenshot(page);
  });

  test('painel lateral completo', async ({ page }) => {
    const painel = page.locator('#painel-camadas-lateral');
    await expect(painel).toBeVisible();

    await expect(painel).toHaveScreenshot('painel-lateral-completo.png', {
      mask: mascararDinamicos(page)
    });
  });

  test('card de camada comum (VEN)', async ({ page }) => {
    const card = page.locator('#item-camada-ven-unificado');
    await expect(card).toBeVisible();

    await expect(card).toHaveScreenshot('card-ven.png');
  });

  test('card de Instalações Portuárias (multicategórico)', async ({ page }) => {
    const card = page.locator('#item-camada-instalacoes_portuarias');
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();

    await expect(card).toHaveScreenshot('card-portos.png');
  });

  test('card com gaveta de estilo aberta', async ({ page }) => {
    const card = page.locator('#item-camada-linhas_travessias');
    await card.scrollIntoViewIfNeeded();

    // Abre a gaveta de estilo
    await card.locator('button:has-text("🎨 Estilo")').click();
    await page.waitForTimeout(200);

    await expect(card).toHaveScreenshot('card-linhas-travessias-gaveta-aberta.png');
  });
});