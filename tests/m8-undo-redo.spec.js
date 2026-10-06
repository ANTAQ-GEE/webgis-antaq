/* ============================================================
   M8 — Undo/Redo (histórico de ações)
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { abrirWebGIS } = require('./helpers');

test.describe('M8 · Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await abrirWebGIS(page);

    // Espera a camada 'uf' carregar (usa boot progressivo)
    await page.waitForFunction(() => !!window.CAMADAS_MAPA?.uf, { timeout: 20000 });

    // Limpa histórico pra começar do zero
    await page.evaluate(() => window.ActionHistory.limpar());
  });

  test('histórico começa vazio — botões desabilitados', async ({ page }) => {
    await expect(page.locator('#btn-undo')).toBeDisabled();
    await expect(page.locator('#btn-redo')).toBeDisabled();
  });

  test('ligar/desligar camada registra ação', async ({ page }) => {
    const chkUf = page.locator('#chk-uf');
    await chkUf.scrollIntoViewIfNeeded();

    const antes = await page.evaluate(() => window.ActionHistory._historico.length);
    await chkUf.click();

    await expect.poll(() => page.evaluate(() => window.ActionHistory._historico.length))
      .toBeGreaterThan(antes);
  });

  test('Ctrl+Z desfaz a última ação', async ({ page }) => {
    const chkUf = page.locator('#chk-uf');
    await chkUf.scrollIntoViewIfNeeded();
    const estadoInicial = await chkUf.isChecked();

    // Muda o estado
    await chkUf.click();
    expect(await chkUf.isChecked()).not.toBe(estadoInicial);

    // Foca no body (senão Ctrl+Z pode ir pro switch)
    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('Control+Z');

    // Deve voltar ao estado inicial
    await expect(chkUf).toBeChecked({ checked: estadoInicial });
    // Botão redo deve estar habilitado
    await expect(page.locator('#btn-redo')).toBeEnabled();
  });

  test('Ctrl+Shift+Z refaz a ação desfeita', async ({ page }) => {
    const chkUf = page.locator('#chk-uf');
    await chkUf.scrollIntoViewIfNeeded();
    const estadoInicial = await chkUf.isChecked();

    await chkUf.click();
    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('Control+Z');
    await page.keyboard.press('Control+Shift+Z');

    // Deve ter voltado ao estado novo
    await expect(chkUf).toBeChecked({ checked: !estadoInicial });
  });

  test('botões undo/redo também funcionam por clique', async ({ page }) => {
    const chkUf = page.locator('#chk-uf');
    await chkUf.scrollIntoViewIfNeeded();
    const estadoInicial = await chkUf.isChecked();

    await chkUf.click();
    await expect(page.locator('#btn-undo')).toBeEnabled();

    await page.locator('#btn-undo').click();
    await expect(chkUf).toBeChecked({ checked: estadoInicial });

    await page.locator('#btn-redo').click();
    await expect(chkUf).toBeChecked({ checked: !estadoInicial });
  });
});