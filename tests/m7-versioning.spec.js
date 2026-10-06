/* ============================================================
   M7 — Versionamento visível + Modal "Sobre"
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { abrirWebGIS } = require('./helpers');

test.describe('M7 · Versionamento e Sobre', () => {
  test.beforeEach(async ({ page }) => {
    await abrirWebGIS(page);
  });

  test('rodapé mostra versão, canal e build', async ({ page }) => {
    const rodape = page.locator('#rodape-versao');
    await expect(rodape).toBeVisible();
    await expect(rodape).toContainText(/v\d+\.\d+\.\d+/);
    await expect(rodape).toContainText(/build/i);
    await expect(rodape).toContainText(/Homologação|Produção/i);
  });

  test('F1 abre modal Sobre com versão correta', async ({ page }) => {
    await page.keyboard.press('F1');

    const modal = page.locator('#modal-sobre');
    await expect(modal).toHaveClass(/aberto/);

    const versaoRodape = await page.locator('#rodape-versao-num').innerText();
    const match = versaoRodape.match(/v\d+\.\d+\.\d+/);
    expect(match, `Versão não encontrada no rodapé: "${versaoRodape}"`).toBeTruthy();
    await expect(modal).toContainText(match[0]);
  });

  test('ESC fecha o modal Sobre', async ({ page }) => {
    await page.keyboard.press('F1');
    await expect(page.locator('#modal-sobre')).toHaveClass(/aberto/);

    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-sobre')).not.toHaveClass(/aberto/);
  });

  test('modal Sobre mostra contato e repositório', async ({ page }) => {
    await page.keyboard.press('F1');
    const modal = page.locator('#modal-sobre');
    await expect(modal).toContainText('gee.seph@antaq.gov.br');
    await expect(modal).toContainText('github.com/antag-gee');
  });
});