/* ============================================================
   M2 — Seleção múltipla de feições
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { abrirWebGIS } = require('./helpers');

test.describe('M2 · Seleção múltipla', () => {
  test.beforeEach(async ({ page }) => {
    await abrirWebGIS(page);
    await page.waitForFunction(
      () => !!window.CAMADAS_MAPA?.instalacoes_portuarias,
      { timeout: 25000 }
    );
  });

  test('painel de seleção começa escondido', async ({ page }) => {
    await expect(page.locator('#painel-selecao')).not.toHaveClass(/aberto/);
  });

  test('Ctrl+Shift+A seleciona tudo da camada ativa', async ({ page }) => {
    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('Control+Shift+A');

    await expect(page.locator('#painel-selecao')).toHaveClass(/aberto/, { timeout: 20000 });

    const contagem = await page.locator('#selecao-count').innerText();
    expect(parseInt(contagem, 10)).toBeGreaterThan(0);
  });

  test('ESC limpa a seleção', async ({ page }) => {
    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('Control+Shift+A');
    await expect(page.locator('#painel-selecao')).toHaveClass(/aberto/, { timeout: 20000 });

    await page.keyboard.press('Escape');
    await expect(page.locator('#painel-selecao')).not.toHaveClass(/aberto/);
  });

  test('botão "Limpar" fecha o painel de seleção', async ({ page }) => {
    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('Control+Shift+A');
    await expect(page.locator('#painel-selecao')).toHaveClass(/aberto/, { timeout: 20000 });

    await page.locator('#painel-selecao').getByRole('button', { name: /Limpar/i }).click();
    await expect(page.locator('#painel-selecao')).not.toHaveClass(/aberto/);

    const contagem = await page.locator('#selecao-count').innerText();
    expect(contagem.trim()).toBe('0');
  });

  test('botão "Tudo" seleciona todas as feições', async ({ page }) => {
    // Primeiro limpa qualquer seleção
    await page.evaluate(() => window.SelectionManager.limpar(true));

    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('Control+Shift+A');
    await expect(page.locator('#painel-selecao')).toHaveClass(/aberto/, { timeout: 20000 });

    // Clica em "Tudo"
    await page.locator('#painel-selecao').getByRole('button', { name: /Tudo/i }).click();

    const contagem = await page.locator('#selecao-count').innerText();
    expect(parseInt(contagem, 10)).toBeGreaterThan(0);
  });
});