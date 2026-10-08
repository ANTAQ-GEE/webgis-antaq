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
    await abrirWebGIS(page);

    // ✅ Recolhe o painel lateral ANTES (evita intercepção no botão Limpar)
    await page.evaluate(() => {
      const painel = document.getElementById('painel-camadas-lateral');
      if (painel) painel.classList.add('recolhido');
      document.body.classList.add('painel-lateral-recolhido');
    });
    await page.waitForTimeout(300);

    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('Control+Shift+A');
    await expect(page.locator('#painel-selecao')).toHaveClass(/aberto/, { timeout: 20000 });

    // ✅ Usa force: true (defesa dupla)
    await page.locator('#painel-selecao button.btn-limpar').first().click({ force: true });
    await page.waitForTimeout(400);

    await expect(page.locator('#painel-selecao')).not.toHaveClass(/aberto/);

    const contagem = await page.locator('#selecao-count').innerText();
    expect(contagem.trim()).toBe('0');
  });
});