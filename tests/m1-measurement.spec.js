/* ============================================================
   M1 — Ferramenta de medição (distância, área, raio, snap)
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { abrirWebGIS } = require('./helpers');

test.describe('M1 · Medição', () => {
  test.beforeEach(async ({ page }) => {
    await abrirWebGIS(page);
    await page.waitForFunction(() => !!window.MeasurementTool, { timeout: 15000 });
  });

  test('toolbar de medição mostra 6 botões (com Buffer)', async ({ page }) => {
    await expect(page.locator('#toolbar-medicao .btn-medicao')).toHaveCount(6);
  });

  test('atalho "d" ativa modo distância', async ({ page }) => {
    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('d');

    const modo = await page.evaluate(() => window.MeasurementTool.modo);
    expect(modo).toBe('distancia');
  });

  test('atalho "a" ativa modo área', async ({ page }) => {
    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('a');

    const modo = await page.evaluate(() => window.MeasurementTool.modo);
    expect(modo).toBe('area');
  });

  test('atalho "r" ativa modo raio', async ({ page }) => {
    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('r');

    const modo = await page.evaluate(() => window.MeasurementTool.modo);
    expect(modo).toBe('raio');
  });

  test('ESC desativa medição', async ({ page }) => {
    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('d');
    await page.keyboard.press('Escape');

    const modo = await page.evaluate(() => window.MeasurementTool.modo);
    expect(modo).toBe(null);
  });

  test('dois cliques no mapa geram uma linha com distância', async ({ page }) => {
    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('d');

    const box = await page.locator('#mapa').boundingBox();
    expect(box).toBeTruthy();

    await page.mouse.click(box.x + 400, box.y + 300);
    await page.waitForTimeout(400);
    await page.mouse.click(box.x + 600, box.y + 400);
    await page.waitForTimeout(400);

    const totalPontos = await page.evaluate(() => window.MeasurementTool.pontos.length);
    expect(totalPontos).toBe(2);

    const valor = await page.locator('#medicao-valor').innerText();
    expect(valor).not.toMatch(/^0\.0?0?\s*m$/);
  });

  test('botão Snap ativa/desativa e constrói grid', async ({ page }) => {
    // Precisa ter uma camada no mapa pra snap indexar
    await page.waitForFunction(
      () => !!window.CAMADAS_MAPA?.instalacoes_portuarias,
      { timeout: 25000 }
    );

    await page.locator('#btn-medicao-snap').click();
    expect(await page.evaluate(() => window.MeasurementTool._snapAtivo)).toBe(true);

    await expect.poll(
      () => page.evaluate(() => window.MeasurementTool._snapTotal),
      { timeout: 10000 }
    ).toBeGreaterThan(0);

    await page.locator('#btn-medicao-snap').click();
    expect(await page.evaluate(() => window.MeasurementTool._snapAtivo)).toBe(false);
  });

  test('botão "Limpar" remove todas as medições', async ({ page }) => {
    await abrirWebGIS(page);

    // ✅ Recolhe o painel lateral ANTES de medir (evita intercepção de cliques)
    await page.evaluate(() => {
      const painel = document.getElementById('painel-camadas-lateral');
      if (painel) painel.classList.add('recolhido');
      document.body.classList.add('painel-lateral-recolhido');
    });
    await page.waitForTimeout(300);

    await page.locator('body').click({ position: { x: 500, y: 300 } });
    await page.keyboard.press('d');
    await page.waitForTimeout(300);

    const box = await page.locator('#mapa').boundingBox();
    expect(box).toBeTruthy();

    // ✅ Usa position absoluta no centro-inferior (longe dos painéis)
    await page.mouse.click(box.x + 300, box.y + 350);
    await page.waitForTimeout(400);
    await page.mouse.click(box.x + 500, box.y + 450);
    await page.waitForTimeout(400);
    await page.mouse.click(box.x + 700, box.y + 500);
    await page.waitForTimeout(400);

    // ✅ Força finalização via JS (mais confiável que dblclick)
    await page.evaluate(() => {
      if (window.MeasurementTool && window.MeasurementTool.pontos.length >= 2) {
        window.MeasurementTool._finalizar();
      }
    });
    await page.waitForTimeout(600);

    const antes = await page.evaluate(() => window.MeasurementTool.medicoesSalvas.length);
    expect(antes, 'medição não foi salva após cliques').toBeGreaterThan(0);

    // ✅ Clica no botão Limpar (com force pra evitar intercepção)
    await page.locator('#toolbar-medicao button.btn-medicao.limpar').first().click({ force: true });
    await page.waitForTimeout(500);

    const depois = await page.evaluate(() => window.MeasurementTool.medicoesSalvas.length);
    expect(depois).toBe(0);
  });
});