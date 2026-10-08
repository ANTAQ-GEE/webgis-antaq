# Changelog — WebGIS Corporativo ANTAQ

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

---
## [1.2.0] — 2026-10-08 · canal `teste`

### ✨ Adicionado

**M9 — Ferramenta de Buffer Geodésico (completo em 5 sub-etapas)**

- **M9.0 — Base**: modal com raio, dissolve e processamento em chunks (100 feições)
- **M9.1 — Filtros dinâmicos**: dropdown por camada com UF, tipo, modalidade, situação
  - Detecção automática de campos filtráveis (2-60 valores únicos, ≥30% preenchido)
  - Ignora valores corrompidos (URLs, e-mails, CNPJs)
  - Mapa `FILTROS_POR_CAMADA` com filtros específicos por camada
- **M9.2 — Buffer em lote**: múltiplos raios em uma execução (até 6)
  - Tabela comparativa com áreas teóricas (π·r²)
- **M9.3 — Chips acumulativos**: múltiplos filtros em AND visualizados como chips
  - Evita contradições no mesmo campo (substitui valor anterior)
  - Trocar de camada limpa os chips automaticamente
- **M9.4 — Feições individuais**:
  - Modo **🎯 Feições**: lista com checkboxes + busca textual + botão "Selecionar visíveis"
  - Modo **🗺️ Seleção**: integra com `SelectionManager` (Ctrl+Clique no mapa)
  - `_extrairUF` local + `_chaveFeicao` para identidade robusta
- Preserva propriedades da feição origem no resultado (`_buffer_raio_km`, `_buffer_area_km2`, `_buffer_gerado_em`)
- Popup customizado com raio, área e origem
- Botão **🗑️ Excluir permanentemente** em camadas geradas (buffers + importadas)

**M10 — Geoprocessamento entre camadas**

- **∩ Intersecção**: geometrias que existem em A e B (polígonos × linhas, polígonos × polígonos)
- **− Diferença**: A menos B com flag `_recortada` e área calculada
- **∪ União**: fusão iterativa de todas as feições de A + B
- **🎯 Pontos em Polígono**: spatial join com `turf.booleanPointInPolygon`
  - Detecção automática de tipos geométricos (ponto/linha/polígono)
  - Validação com aviso visual quando combinação é inválida
  - Preserva props com prefixos `A_*` e `B_*`
- Dissolve opcional (unifica resultado num único polígono)
- Pane dedicada `paneBuffer` (z-index 650) para receber cliques corretamente
- Popup mostra props de ambas as camadas + área calculada

**M11 — Sistema de abas (Mapa · Análise · Geo · AIS)**

- Barra de abas com 4 contextos funcionais:
  - 🗺️ **Mapa**: painel lateral, busca, medição, legenda
  - 📊 **Análise**: painel analítico + gráficos + matriz VEN
  - ⚙️ **Geo**: ferramentas geoespaciais + comparação de safras
  - 🚢 **AIS**: placeholder (dados em tempo real no futuro)
- `TabManager` com `_aplicarVisibilidade` por regras
- Atalhos de teclado: `Ctrl+1` (Mapa), `Ctrl+2` (Análise), `Ctrl+3` (Geo), `Ctrl+4` (AIS)
- Memória de aba em `localStorage` (`antaq_aba_ativa`)
- Sincronização com `URLState` (`?aba=geo`)
- Botões do header (Matriz VEN, Comparar Safras, Geo) trocam de aba + abrem modal automaticamente
- Assistente IA disponível em todas as abas (global)

### 🔧 Corrigido

- **Encoding**: `repararTexto` reescrito em 7 camadas
  - Camada 1: `.normalize('NFC')` (resolve Unicode duplo)
  - Camada 2: mojibake UTF-8 ↔ Latin-1 (`Ã§` → `ç`)
  - Camada 3: nomes próprios corrompidos (`\uFFFD`)
  - Camada 4: palavras comuns ANTAQ (`Hidrogrfica` → `Hidrográfica`)
  - Camada 5: específicos (`amazônicaa` → `Amazônica`, `Pr-Projeto` → `Pré-Projeto`)
  - Camada 6: reconstrução genérica
  - Camada 7: acentos faltantes (`maritima` → `marítima`, `Vitria` → `Vitória`)
  - Preserva capitalização (`Municipio` → `Município`, `municipio` → `município`)
- **Duplicação de clusters**: `toggleSubcamadaPorto` agora manipula dentro do featureGroup pai
- **Rodovias e ferrovias** não ligavam (guard contra `undefined` em `toggleCamada`)
- **Copiloto IA — perguntas dos botões rápidos** agora reconhecidas (`agrupamento`, `resumo_ven`, `metodologia_ven`)
- **Copiloto IA — duplicação** resolvida com bloqueio em 3 camadas + `perguntarSeguro`
- **`_acharCamadaAlvo`**: regex com `\b` (pega `ti`/`tis`/`uc`/`ucs` em qualquer posição)
- **Rodovias sem filtro no buffer**: usa `sg_uf` em vez de `uf`
- **Modal Matriz VEN**: `.first()` resolve strict mode
- **Baselines visuais** regenerados (aparência mudou com símbolos institucionais)

### 🎨 Melhorado

- Favicon institucional inline (SVG "A" ANTAQ — zero request HTTP)
- Rodapé mostra versão + canal + data de acesso em tempo real
- Modal "Sobre" com changelog completo
- `Security.repararTexto` com `\u` (Unicode escapes) para blindar contra encoding duplo

### 🐛 Conhecido / Roadmap

- **TKU (Tonelada-Quilômetro Útil)**: dados prontos, aguardando integração na aba Análise (3 safras)
- **AIS em tempo real**: depende de convênio (Marinha/Clarksons)
- **Arquitetura de abas**: sub-abas internas da aba Análise para TKU anual

---


## [1.1.0] — 2026-10-07 · canal `teste`

### ✨ Adicionado

**M9 — Ferramenta de Buffer Geodésico**
- Modal com seleção de camada de origem, raio em km e opção "dissolve"
- Processamento em chunks (100 feições) — UI não trava com camadas grandes
- Resultado vira camada nova, exportável em GeoJSON, presente no painel lateral
- Popup mostra raio, área calculada e origem do buffer
- Tooltip ao passar o mouse nos polígonos

**M9.1 — Filtros de Buffer**
- Dropdown de filtros dinâmico por camada (UF, tipo, modalidade, situação, etc.)
- Checkbox "usar filtro ativo do painel principal" — reaproveita a seleção já feita
- Detecção automática de campos filtráveis (2-60 valores únicos, ≥30% preenchido)
- Ignora valores corrompidos: URLs, e-mails, CNPJs
- Nome da camada gerada inclui o filtro aplicado: `Buffer 30km · X [uf = "PA"]`
- Mapa de filtros específicos por camada (rodovias, ferrovias, portos, UCs, TIs, VEN)

**Copiloto IA 1c — Comandos Geográficos Avançados**
- **Contenção (point-in-polygon)**: "Portos dentro da Amazônia Legal"
  - Fallback por UF quando a camada poligonal não existe
  - Lookup geográfico por centroide quando feição não tem UF nos atributos
- **Cruza UF**: "Travessias que cruzam UFs", "Balsas interestaduais"
  - Detecta travessias com `est_origem ≠ est_destino`
  - Tabela Top 5 conexões entre UFs
- **Buffer por ponto nomeado**: "Portos a menos de 100km de Macapá"
  - Localiza cidade/porto pelo nome e aplica `turf.distance`
  - Botão "Mostrar círculo" desenha o raio visual no mapa

**Copiloto IA 1e — Histórico e Compartilhamento**
- **1e-1**: Histórico de consultas (últimas 15), botão 🕘 no header
  - Botões 📋 Copiar e 💾 CSV em cada resposta
  - Export CSV do agrupamento por UF quando não há features individuais
- **1e-2**: URL compartilhável (`?copiloto=<pergunta>`)
  - Captura o parâmetro ANTES do `URLState.init()` apagá-lo
  - Executa automaticamente após o boot
  - Botão 🔗 Compartilhar copia o link pro clipboard

**Símbolos institucionais no mapa**
- ⚓ **Âncora SVG** para Instalações Portuárias (cor por regime)
- 🌉 **Ponte** para Linhas de Travessias (no ponto médio de cada linha)
- 🚢 **Barco** para Embarcações/AIS
- Clusters mostram ícone temático + número (`⚓ 5`)
- Legenda, presets de paleta e subcamadas atualizados para os novos ícones

### 🔧 Corrigido

**Encoding de textos corrompidos**
- `repararTexto` reescrito em 7 camadas (NFC → mojibake → nomes próprios → palavras ANTAQ → específicos → genéricos → sem-acento)
- Corrige: `Hidrogrfica` → `Hidrográfica`, `amazônicaa` → `Amazônica`, `Pr-Projeto` → `Pré-Projeto`, `Vitria` → `Vitória`, `Tapajos` → `Tapajós`, `Solimoes` → `Solimões`
- Preserva capitalização (`Municipio` → `Município`, `municipio` → `município`)
- Regex blindadas com `\u` (Unicode) para evitar problema de encoding duplo

**Filtros de buffer**
- Rodovias: UF pelo campo `sg_uf` (não existia `uf` — resultava em 0%)
- Ferrovias: campos `uf`, `tip_situac`, `bitola`, `municipio`
- Duplicação de optgroups (por `tipo` vs `TIPO`) — limpeza total + dedup case-insensitive
- URLs na coluna `modalidade` (bug da planilha original) — filtro exclui `http://`, `www.`, `@`, CNPJs

**Rodovias e Ferrovias não ligavam pelo painel**
- `toggleCamada` estourava com `Cannot use 'in' operator to search for '_leaflet_id' in undefined`
- Guard adicionado quando `CAMADAS_MAPA[id]` é undefined

**Copiloto IA — duplicação de respostas**
- Cliques rápidos duplos no mesmo botão criavam 2 perguntas + 2 respostas
- Bloqueio por processamento + bloqueio por "pergunta idêntica já no chat" (case-insensitive, normalizada)
- `perguntarSeguro` desabilita botão por 2s

**Barras de ação duplicadas**
- `_limparBarrasAntigas()` roda em todo `enviar()` + limpeza tardia antes de renderizar
- Resolve race condition de 2 perguntas em voo
- Só a última resposta tem botões

### 🎨 Polido

- Favicon institucional (SVG inline com "A" ANTAQ — zero request HTTP)
- Rodapé mostra versão + canal + data de acesso em tempo real
- Modal "Sobre" com changelog da versão
- Console sem erros de favicon 404

---

## [1.0.0] — 2026-10-06 · canal `teste`

### ✨ Adicionado

**Fase 1 do roadmap completa**

- **GD3** — Diff visual entre safras VEN (2013-2024)
  - Algoritmo de comparação geométrica com tolerância de 500m
  - Classificação: adicionados, removidos, mantidos, modificados (>20% Δ)
  - Exportação CSV + desenho no mapa (verde/vermelho/laranja)
  - Atalho: `Ctrl+Shift+D`

- **R3** — FetchManager com retry e backoff exponencial
  - 3 tentativas por arquivo, timeout 15s, backoff 500ms→1.5s→3.5s
  - Retry inteligente: 404 pula direto, 5xx/timeout retentam
  - Badge mostra progresso das tentativas
  - Notificação persistente com "🔄 Tentar novamente" em falha total

- **Q1(A)** — Smoke tests Playwright (10 testes)
- **Q1(B)** — Specs por módulo (M1, M2, M7, M8, GD3) — 27 testes
- **Q1(C)** — Regressão visual (13 screenshots de componentes UI)

- **R1** — Modularização completa
  - ~35 módulos extraídos para `js/` em 7 stages incrementais
  - Estratégia: classic scripts (mantém "sem build step" e compatibilidade com `onclick=`)
  - Ordem de carga documentada em `js/README.md`
  - `<script>` inline no HTML ficou vazio

- **M1** — Ferramenta de medição (distância, área, raio)
  - Cálculos geodésicos via Turf.js
  - Labels permanentes no mapa (área no centroide + perímetro)
  - Input de raio exato para replicar buffer

- **Símbolos e cluster temáticos** (base)

### 🎨 Polido

- Cache HTTP: `cache: 'default'` + remoção de `?_t=Date.now()`
  - 2ª carga: 5-15s → ~200ms (20-75× mais rápido)
  - Boot progressivo: mapa disponível antes das camadas
- v1.0.0 publicada no GitHub Pages

---

## [0.9.9] — 2026-10-05 · canal `teste`

### ✨ Adicionado

- **GD3** — Diff visual entre safras VEN

### 🔧 Corrigido

- `#modal-diff-safras` força `position:fixed` inline (bypass CSS conflitante)

---

## [0.9.0] — 2026-09-30 · canal `teste`

### ✨ Adicionado

- M1 — Ferramenta de medição
- M3 — Card de metadados por camada
- G1 — Agrupamento inteligente de pontos (MarkerCluster)
- G3 — Persistência de estado na URL
- Impressão — Layout limpo para PDF/papel

---

## [0.8.0] — 2026-09-15 · canal `teste`

### ✨ Adicionado

- Refatoração do painel lateral com cards compactos
- Catálogo de camadas com retirada/adição dinâmica
- Copiloto regulatório com suporte a IA local e nuvem
- Autenticação SHA-256 para modo de homologação

---

## [0.7.0] — 2026-08-20 · canal `teste`

### ✨ Adicionado

- Matriz de navegação VEN com tempos e distâncias OD
- Estúdio analítico com gráficos e séries históricas
- Importação multiformato: SHP, KML, KMZ, GeoJSON, GPKG
- Integração com `manifest.json` gerado pelo pipeline Python

---

## Roadmap (próximas versões)

| Ordem | Item | Status |
|:---:|------|:---:|
| 1 | M9.2 — Buffer em lote (múltiplos raios) | 🚧 em curso |
| 2 | Q1(C) — Atualizar baselines visuais (após símbolos novos) | 📋 planejado |
| 3 | Expandir dicionários do parser IA (sinônimos, paráfrases) | 📋 planejado |
| 4 | Ligar fallback LLM para perguntas `desconhecido` | 📋 planejado |
| 5 | Fase 2 — Tráfego AIS (última posição + heatmap) | ⏳ aguardando dados |
| 6 | Fase 3 — Rastreamento em tempo real | 🔮 futuro |