# Testes E2E · WebGIS ANTAQ

Smoke tests em [Playwright](https://playwright.dev/) que validam o boot da
aplicação e a sobrevivência dos módulos principais após cada mudança.

**Escopo (fase A):** não quebra. Não testa geometria nem regras de negócio.

---

## Primeira execução

```bash
# 1. Instalar dependências (apenas uma vez)
npm install

# 2. Baixar o navegador de teste (apenas uma vez, ~150 MB)
npm run install-browsers