# Módulos JavaScript do WebGIS ANTAQ

**Decisão arquitetural:** classic scripts (`<script src>`), **não** ES Modules.
Mantém o "sem build step" e preserva os `onclick=` do HTML.

## Ordem de carregamento (CRÍTICA)

Os arquivos DEVEM ser carregados nesta ordem, **antes** do `<script>` inline:

1. `utils/security.js`              — zero deps
2. `utils/geom-type-detector.js`    — zero deps
3. `core/fetch-manager.js`          — zero deps
4. `core/state.js`                  — zero deps (só dados)
5. `domain/port-classification.js`  — depende de Security
6. `core/notification-manager.js`   — depende de Security

Cada módulo expõe uma variável em `window.NomeDoModulo`, mantendo compatibilidade
com HTML `onclick=` e com os testes Playwright (`lerGlobal`).

## Padrão de cada arquivo

```javascript
(function () {
  'use strict';
  const MeuModulo = { /* ... */ };
  window.MeuModulo = MeuModulo;
  console.info('[js] MeuModulo carregado');
})();