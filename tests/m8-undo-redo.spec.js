/* ============================================================
   M8 — Undo/Redo (histórico de ações)
   ------------------------------------------------------------
   Nota: o input do switch (#chk-uf) tem opacity:0/width:0 no CSS,
   então não pode ser clicado diretamente pelo Playwright.
   Trocamos o toggle via page.evaluate() — 100% confiável.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { abrirWebGIS } = require('./helpers');

/* ---------- Helpers ---------- */

async function prepararUf(page) {
  // Garante que o painel lateral está aberto
  const recolhido = await page.locator('#painel-camadas-lateral').evaluate(
    el => el.classList.contains('recolhido')
  );
  if (recolhido) {
    await page.locator('#btn-flutuante-painel').click();
    await page.waitForTimeout(300);
  }

  // Garante que a seção "Limites Territoriais" está expandida
  const secaoUf = page.locator('#grupo-limites');
  const fechada = await secaoUf.evaluate(el => el.classList.contains('fechado'));
  if (fechada) {
    await page.locator('.secao-titulo:has-text("Limites Territoriais")').click();
    await page.waitForTimeout(200);
  }
}

async function lerEstadoUf(page) {
  return page.evaluate(() => {
    const chk = document.getElementById('chk-uf');
    return chk ? chk.checked : null;
  });
}

async function toggleUf(page) {
  await page.evaluate(() => {
    const chk = document.getElementById('chk-uf');
    if (!chk) throw new Error('chk-uf não encontrado no DOM');
    chk.checked = !chk.checked;
    // Programa o change manualmente (senão o handler do switch não dispara)
    chk.dispatchEvent(new Event('change', { bubbles: true }));
  });
  // Pequena espera pro handler async completar
  await page.waitForTimeout(250);
}

async function contarHistorico(page) {
  return page.evaluate(() => window.ActionHistory._historico.length);
}

/* ---------- Testes ---------- */

test.describe('M8 · Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await abrirWebGIS(page);

    // Boot progressivo: espera a camada 'uf' estar pronta
    await page.waitForFunction(() => !!window.CAMADAS_MAPA?.uf, { timeout: 25000 });

    // Abre painel + seção Limites Territoriais
    await prepararUf(page);

    // Limpa histórico pra começar do zero
    await page.evaluate(() => window.ActionHistory.limpar());
  });

  test('histórico começa vazio — botões desabilitados', async ({ page }) => {
    await expect(page.locator('#btn-undo')).toBeDisabled();
    await expect(page.locator('#btn-redo')).toBeDisabled();
  });

  test('ligar/desligar camada registra ação', async ({ page }) => {
    const antes = await contarHistorico(page);
    await toggleUf(page);
    const depois = await contarHistorico(page);

    expect(depois, 'toggle não registrou ação no histórico').toBeGreaterThan(antes);
  });

  test('Ctrl+Z desfaz a última ação', async ({ page }) => {
    const estadoInicial = await lerEstadoUf(page);
    expect(estadoInicial).not.toBeNull();

    // Muda o estado
    await toggleUf(page);
    const estadoAposToggle = await lerEstadoUf(page);
    expect(estadoAposToggle).toBe(!estadoInicial);

    // Foca no body antes do atalho (senão o foco fica no switch)
    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('Control+Z');
    await page.waitForTimeout(300);

    // Deve ter voltado ao estado inicial
    const estadoDepois = await lerEstadoUf(page);
    expect(estadoDepois, 'Ctrl+Z não desfez a ação').toBe(estadoInicial);

    // Botão redo deve estar habilitado agora
    await expect(page.locator('#btn-redo')).toBeEnabled();
  });

  test('Ctrl+Shift+Z refaz a ação desfeita', async ({ page }) => {
    const estadoInicial = await lerEstadoUf(page);

    await toggleUf(page);
    const estadoAposToggle = await lerEstadoUf(page);

    // Desfaz
    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('Control+Z');
    await page.waitForTimeout(300);

    // Refaz
    await page.keyboard.press('Control+Shift+Z');
    await page.waitForTimeout(300);

    const estadoFinal = await lerEstadoUf(page);
    expect(estadoFinal, 'Ctrl+Shift+Z não refez a ação').toBe(estadoAposToggle);
  });

  test('botões undo/redo também funcionam por clique', async ({ page }) => {
    const estadoInicial = await lerEstadoUf(page);

    await toggleUf(page);
    const estadoAposToggle = await lerEstadoUf(page);

    // Undo por clique
    await expect(page.locator('#btn-undo')).toBeEnabled();
    await page.locator('#btn-undo').click();
    await page.waitForTimeout(300);
    expect(await lerEstadoUf(page)).toBe(estadoInicial);

    // Redo por clique
    await expect(page.locator('#btn-redo')).toBeEnabled();
    await page.locator('#btn-redo').click();
    await page.waitForTimeout(300);
    expect(await lerEstadoUf(page)).toBe(estadoAposToggle);
  });
});