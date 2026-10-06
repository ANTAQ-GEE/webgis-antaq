/* ============================================================
   GD3 — Comparador de Safras VEN
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { abrirWebGIS } = require('./helpers');

test.describe('GD3 · Comparador de Safras VEN', () => {
  test.beforeEach(async ({ page }) => {
    await abrirWebGIS(page);
    await page.waitForFunction(() => !!window.SafraDiffManager, { timeout: 15000 });
  });

  test('botão "Comparar Safras" abre o modal', async ({ page }) => {
    await page.getByRole('button', { name: /Comparar Safras/i }).click();
    await expect(page.locator('#modal-diff-safras')).toHaveClass(/aberto/);
  });

  test('atalho Ctrl+Shift+D abre o modal', async ({ page }) => {
    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('Control+Shift+D');
    await expect(page.locator('#modal-diff-safras')).toHaveClass(/aberto/);
  });

  test('comparação VEN 2022 vs 2024 retorna 4 KPIs numéricos', async ({ page }) => {
    await page.getByRole('button', { name: /Comparar Safras/i }).click();

    await page.locator('#diff-safra-a').selectOption('ven_2022');
    await page.locator('#diff-safra-b').selectOption('ven_2024');

    await page.locator('#btn-diff-comparar').click();

    await expect(page.locator('#diff-resultado')).toBeVisible({ timeout: 30000 });

    const kpis = await page.locator('#diff-kpis .valor').allInnerTexts();
    expect(kpis).toHaveLength(4);
    kpis.forEach(k => {
      const n = parseInt(k, 10);
      expect(Number.isFinite(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    });
  });

  test('botão exportar CSV habilita após comparação', async ({ page }) => {
    await page.getByRole('button', { name: /Comparar Safras/i }).click();
    await page.locator('#diff-safra-a').selectOption('ven_2022');
    await page.locator('#diff-safra-b').selectOption('ven_2024');

    const btnExport = page.locator('#btn-diff-exportar');
    await expect(btnExport).toBeDisabled();

    await page.locator('#btn-diff-comparar').click();
    await expect(page.locator('#diff-resultado')).toBeVisible({ timeout: 30000 });
    await expect(btnExport).toBeEnabled();
  });

  test('botão "Limpar Mapa" remove camadas de diff', async ({ page }) => {
    await page.getByRole('button', { name: /Comparar Safras/i }).click();
    await page.locator('#diff-safra-a').selectOption('ven_2022');
    await page.locator('#diff-safra-b').selectOption('ven_2024');
    await page.locator('#btn-diff-comparar').click();
    await expect(page.locator('#diff-resultado')).toBeVisible({ timeout: 30000 });

    // Espera o mapa receber as camadas (o modal fecha automaticamente depois de 600ms)
    await page.waitForTimeout(1000);

    const totalAntes = await page.evaluate(() => window.SafraDiffManager._camadasDiff.length);
    expect(totalAntes).toBeGreaterThan(0);

    await page.evaluate(() => window.SafraDiffManager.limparMapa());

    const totalDepois = await page.evaluate(() => window.SafraDiffManager._camadasDiff.length);
    expect(totalDepois).toBe(0);
  });
});