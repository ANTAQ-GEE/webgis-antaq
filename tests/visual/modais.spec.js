/* ============================================================
   Q1(C) — Regressão visual: Modais
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { abrirWebGIS, prepararParaScreenshot } = require('../helpers');

test.describe.configure({ timeout: 60000 });

test.describe('Visual · Modais', () => {
  test.beforeEach(async ({ page }) => {
    await abrirWebGIS(page);
    await page.waitForTimeout(800);
    await prepararParaScreenshot(page);
  });

  test('modal "Sobre este WebGIS"', async ({ page }) => {
    await page.keyboard.press('F1');
    const modal = page.locator('#modal-sobre .modal-sobre-card');
    await expect(modal).toBeVisible();

    await expect(modal).toHaveScreenshot('modal-sobre.png', {
      // Mascara a versão e o commit (mudam a cada release)
      mask: [
        modal.locator('.sobre-info').filter({ hasText: 'Versão' }).locator('.valor'),
        modal.locator('.sobre-info').filter({ hasText: 'Build' }).locator('.valor'),
        modal.locator('.sobre-info').filter({ hasText: 'Commit' }).locator('.valor'),
        modal.locator('.sobre-info').filter({ hasText: 'Última atualização' }).locator('.valor')
      ]
    });
  });

  test('modal Matriz VEN', async ({ page }) => {
    await page.getByRole('button', { name: /Matriz VEN/i }).click();
    const modal = page.locator('#modal-matriz-ven .modal-matriz-conteudo');
    await expect(modal).toBeVisible();

    // Espera os dados carregarem
    await expect(page.locator('#tabela-matriz-corpo tr').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(500);

    await expect(modal).toHaveScreenshot('modal-matriz-ven.png', {
      mask: [
        // KPIs mudam conforme os dados — mascara os números
        modal.locator('.kpi-card-matriz strong')
      ]
    });
  });

  test('modal Comparar Safras (estado inicial)', async ({ page }) => {
    await page.getByRole('button', { name: /Comparar Safras/i }).click();
    const modal = page.locator('#modal-diff-card, .modal-diff-card').first();
    await expect(modal).toBeVisible();
    await page.waitForTimeout(300);

    await expect(modal).toHaveScreenshot('modal-diff-safras-inicial.png');
  });

  test('modal de metadados de camada', async ({ page }) => {
    // Abre o painel
    const recolhido = await page.locator('#painel-camadas-lateral').evaluate(
      el => el.classList.contains('recolhido')
    );
    if (recolhido) {
      await page.locator('#btn-flutuante-painel').click();
      await page.waitForTimeout(300);
    }

    // Clica em ℹ️ do card VEN
    const btnInfo = page.locator('#item-camada-ven-unificado button[title*="metadados" i], #item-camada-ven-unificado .btn-meta-camada').first();
    await btnInfo.click();

    const modal = page.locator('#modal-metadados .modal-metadados-card');
    await expect(modal).toBeVisible();

    await expect(modal).toHaveScreenshot('modal-metadados.png', {
      mask: [
        // Hash muda por camada
        modal.locator('#meta-hash-valor')
      ]
    });
  });
});