# Módulos JavaScript do WebGIS ANTAQ

**Decisão arquitetural:** classic scripts (`<script defer src>`), **não** ES Modules.
Mantém o "sem build step" e preserva os `onclick=` do HTML.

## Ordem de carregamento (CRÍTICA)

Os arquivos DEVEM ser carregados nesta ordem, **antes** do `<script>` inline:

### Stage 1 — Fundação
1. `utils/security.js`              — sanitização + reparo de texto (7 camadas)
2. `utils/geom-type-detector.js`    — detecção de tipo geométrico
3. `core/fetch-manager.js`          — fetch com retry e backoff (R3)
4. `core/state.js`                  — CONFIG_CAMADAS + METADADOS + estado global

### Stage 2 — Mapa + Infra
5. `core/map.js`                    — inicialização Leaflet + 5 panes hierárquicos
6. `core/action-history.js`         — Undo/Redo (M8)
7. `core/basemap-manager.js`        — satélite/escuro (Esri)
8. `render/popup-renderer.js`       — HTML dos popups de feição
9. `render/map-symbols.js`          — símbolos SVG (âncora, ponte, barco)

### Stage 1b — Dependentes de Security
10. `domain/port-classification.js` — regimes de outorga + esferas UC
11. `core/notification-manager.js`  — notificações ricas (M5)

### Stage 3 — Catálogo + Estilo + Dados
12. `core/layer-registry.js`        — manifesto e registro
13. `render/styler.js`              — presets, estilos, legenda
14. `core/layer-order-manager.js`   — reordenação ↑↓ + drag&drop
15. `core/data-manager.js`          — carregamento de GeoJSON

### Stage 4 — UI + Filtros + Busca
16. `core/ui.js`                    — toasts, painéis, catálogo
17. `core/ambiente-manager.js`      — produção/homologação
18. `domain/filter-manager.js`      — filtros dinâmicos por camada
19. `domain/search-engine.js`       — busca por atributo

### Stage 5 — Análise
20. `analytics/analytics.js`              — gráficos Chart.js
21. `analytics/matriz-ven-manager.js`     — matriz OD do VEN
22. `domain/ven-unified-manager.js`       — safras VEN 2013-2024
23. `domain/safra-diff-manager.js`        — diff entre safras (GD3)
24. `ai/intent-parser.js`                 — parser de intenções do copiloto
25. `ai/copiloto-ia.js`                   — assistente regulatório

### Stage 6 — I/O + Ferramentas
26. `domain/layer-metadata.js`       — metadados por camada (M3)
27. `io/export-manager.js`           — exportação GeoJSON/CSV
28. `io/import-manager.js`           — importação multiformato
29. `domain/tabela-manager.js`       — tabela de atributos
30. `domain/catalogo-manager.js`     — catálogo de camadas
31. `domain/measurement-tool.js`     — medição (distância/área/raio)
32. `domain/selection-manager.js`    — seleção múltipla (M2)
33. `domain/map-extras.js`           — minimap + escala + coordenadas (M4)
34. `core/url-state.js`              — persistência de estado na URL

### Stage 7 — Versionamento + Extras
35. `core/webgis-version.js`         — versão, build, changelog
36. `core/webgis-about.js`           — modal "Sobre" + rodapé
37. `domain/buffer-tool.js`          — M9 (buffer geodésico completo)
38. `domain/geo-tools.js`            — M10 (geoprocessamento)
39. `core/tab-manager.js`            — M11 (sistema de abas)
40. `app.js`                         — bootstrap + handlers globais

## Padrão de cada arquivo

```javascript
(function () {
  'use strict';
  const MeuModulo = { /* ... */ };
  window.MeuModulo = MeuModulo;
  console.info('[js] MeuModulo carregado');
})();