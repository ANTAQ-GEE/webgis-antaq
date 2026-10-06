// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Porta própria para os testes — não conflita com o servidor de dev do usuário (8000)
const PORTA = 8090;
const BASE_URL = `http://127.0.0.1:${PORTA}`;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  // Smoke test toca um estado global (CONFIG_CAMADAS, mapa Leaflet).
  // Rodar em 1 worker evita condição de corrida entre specs.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'tests/.report' }]
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    actionTimeout: 8_000,
    navigationTimeout: 20_000
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // Playwright sobe o servidor HTTP automaticamente antes dos testes.
  // Usa Python (já é pré-requisito do projeto).
  webServer: {
    command: `python -m http.server ${PORTA} --bind 127.0.0.1`,
    url: `${BASE_URL}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
    stdout: 'ignore',
    stderr: 'pipe'
  }
});