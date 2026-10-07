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
    // ✅ Aumenta timeout específico pra esse teste
    test.setTimeout(90000);

    await page.getByRole('button', { name: /Matriz VEN/i }).click();

    const modal = page.locator('#modal-matriz-ven .modal-matriz-conteudo');
    await expect(modal).toBeVisible({ timeout: 15000 });

    // ✅ Espera a tabela ter linhas de verdade (não só o "Carregando...")
    await expect.poll(async () => {
      const trs = await page.locator('#tabela-matriz-corpo tr').count();
      return trs;
    }, { timeout: 30000, message: 'Matriz VEN não carregou linhas' }).toBeGreaterThan(1);

    // Espera a estabilização (KPIs aparecem)
    await page.waitForTimeout(800);

    // ✅ Reduz o escopo do mask — só os números, não o card inteiro
    await expect(modal).toHaveScreenshot('modal-matriz-ven.png', {
      mask: [
        modal.locator('.kpi-card-matriz strong')
      ],
      maxDiffPixels: 300
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

    // ✅ Usa o card de Instalações Portuárias (que tem ℹ️)
    const card = page.locator('#item-camada-instalacoes_portuarias');
    await card.scrollIntoViewIfNeeded();

    // Clica no ℹ️ do card
    await card.locator('.btn-meta-camada').click();

    const modal = page.locator('#modal-metadados .modal-metadados-card');
    await expect(modal).toBeVisible();
    await page.waitForTimeout(300);

    await expect(modal).toHaveScreenshot('modal-metadados.png', {
      mask: [modal.locator('#meta-hash-valor')]
    });
  });
});