WebGIS Corporativo ANTAQ — Arquitetura de Software e Diretrizes de Evolução Tecnológica
Documento Técnico de Engenharia de Software e Governança de TI
Unidade: Superintendência de Estudos e Projetos Hidroviários (SEPH) / Gerência de Estudos Econômicos (GEE)
Público-Alvo: Diretoria Colegiada, Equipe Técnica GEE e Gerência de Tecnologia da Informação (GTI/ANTAQ)
Data: 12/10/2026 | Versão de Referência: v1.3.2


________________


1. Visão Geral e Princípios Arquiteturais Atuais
O WebGIS Corporativo ANTAQ foi concebido sob o paradigma de "Zero Build Step" (sem etapa de compilação obrigatória), permitindo que a aplicação execute diretamente em qualquer servidor web estático (GitHub Pages, Live Server, Nginx ou Apache) sem dependência de ambientes Node.js em tempo de execução.
Pilares Técnicos da Solução:
1. Modularidade por Domínio Regulatório: Mais de 45 scripts organizados em camadas conceituais (core, render, domain, analytics, io, ai, utils).
2. Padrão IIFE (Immediately Invoked Function Expression): Cada módulo isola seu escopo interno e expõe uma API pública única em window.NomeDoModulo.
3. Cartografia Baseada em Padrões: Leaflet 1.9.4 integrado com Turf.js 6.5.0 para geoprocessamento no cliente, com datum oficial SIRGAS 2000 (EPSG:4674 / Pseudo-Mercator EPSG:3857).
4. Empacotamento de Produção via Python: Script scripts/gerar_bundles.py que consolida os scripts em 5 pacotes estáticos para produção, reduzindo em 90% as requisições HTTP sem quebrar o desenvolvimento modular.


________________


2. Mapa de Camadas do Sistema
┌────────────────────────────────────────────────────────────────────────┐


│                   APLICAÇÃO & INTERFACE (UI / UX)                      │


│   • index.html (Barra de Abas: Mapa · Análise · Geo · AIS)             │


│   • Corredores Estratégicos & Modo Apresentação (NavegacaoEstrategica) │


└──────────────────────────────────┬─────────────────────────────────────┘


                                   │


┌──────────────────────────────────▼─────────────────────────────────────┐


│                    CAMADA DE APLICAÇÃO & NEGÓCIO                       │


│  ┌───────────────────────┐ ┌────────────────────┐ ┌──────────────────┐ │


│  │   VIAS NAVEGADAS      │ │  PORTOS & OUTORGA  │ │  SIMULADOR AIS   │ │


│  │ • ven-unified-manager │ │ • port-classificat │ │ • controle-ais   │ │


│  │ • matriz-ven-manager  │ │ • filter-manager   │ │ • ais-manager    │ │


│  │ • safra-diff-manager  │ │ • tabela-manager   │ │ • ais-layer      │ │


│  └───────────────────────┘ └────────────────────┘ └──────────────────┘ │


│  ┌───────────────────────┐ ┌────────────────────┐ ┌──────────────────┐ │


│  │   ANALÍTICO & TKU     │ │  GEOPROCESSAMENTO  │ │  COPILOTO IA     │ │


│  │ • analytics.js        │ │ • geo-tools.js     │ │ • copiloto-ia    │ │


│  │ • analytics-tku.js    │ │ • buffer-tool.js   │ │ • intent-parser  │ │


│  │ • estudos-manager     │ │ • measurement-tool │ │ • nota-técnica   │ │


│  └───────────────────────┘ └────────────────────┘ └──────────────────┘ │


└──────────────────────────────────┬─────────────────────────────────────┘


                                   │


┌──────────────────────────────────▼─────────────────────────────────────┐


│                    SERVIÇOS DE SUPORTE & FUNDAÇÃO                      │


│   • Core: state, map, data-manager, layer-registry, action-history    │


│   • Render: popup-renderer, map-symbols, styler                        │


│   • I/O: import-manager, export-manager, ais-loader                    │


│   • Utils: security (sanitização, getProp, formatadores), geom-detector│


└────────────────────────────────────────────────────────────────────────┘


________________


3. Inventário dos Módulos Principais
Módulo
	Arquivo
	Responsabilidade Principal
	Status
	Security
	js/utils/security.js
	Sanitização XSS, reparo de mojibake, getProp tolerante e formatação ABNT
	Essencial / Estável
	DataManager
	js/core/data-manager.js
	Carregamento assíncrono de GeoJSONs locais e controle de cache em memória
	Essencial / Estável
	TabManager
	js/core/tab-manager.js
	Gestão das 4 abas da UI (Mapa, Análise, Geo, AIS) e visibilidade contextual
	Essencial / Estável
	NavegacaoEstrategica
	js/domain/navegacao-estrategica.js
	Atalhos de voo suave para corredores estratégicos e Modo Apresentação
	Novo (v1.3.2)
	MatrizVENManager
	js/analytics/matriz-ven-manager.js
	Matriz de tempos e velocidades com destaque e marcadores de Origem/Destino
	Essencial / Estável
	Analytics
	js/analytics/analytics.js
	Gráficos Chart.js com cache por aba e destruição blindada de canvas
	Essencial / Estável
	AnalyticsTKU
	js/analytics/analytics-tku.js
	Indicadores de Tonelada-Quilômetro Útil e rankings de fluxo logístico
	Essencial / Estável
	PortClassification
	js/domain/port-classification.js
	Classificação formal de outorgas conforme Lei nº 12.815/2013
	Essencial / Crítico
	SafraDiffManager
	js/domain/safra-diff-manager.js
	Comparação espacial de safras do VEN com cálculo de deltas (GD3)
	Essencial / Estável
	ControleAIS
	js/domain/controle-ais.js
	Workspace de monitoramento, simulador de viagens e linha do tempo de frotas
	Essencial / Estável
	GeoTools
	js/domain/geo-tools.js
	Operações de intersecção, diferença, união e spatial join via Turf.js
	Essencial / Estável
	CopilotoIA
	js/ai/copiloto-ia.js
	Assistente regulatório com motor heurístico e gerador de notas técnicas
	Essencial / Inovador
	

________________


4. Oportunidades de Otimização e Eliminação de Redundâncias
A. Fusão de Módulos com Sobreposição Funcional
1. Controle de Abas: tab-toggle.js e tab-manager.js realizam tarefas complementares de alternância de abas. Recomendada a absorção gradual de tab-toggle.js pelo TabManager.
2. Motores de Estilização: styler.js, map-symbols.js, port-symbology.js e styler-tku.js podem convergir para um subsistema unificado de simbologia (SymbologyEngine.js).
3. Metadados de Aplicação: webgis-about.js e webgis-version.js podem ser combinados em AppMetadata.js.
B. Desacoplamento da Lógica Espacial (Arquitetura Hexagonal)
* Atualmente, cálculos regulatórios da Matriz VEN e de Portos chamam diretamente funções do Leaflet (L.geoJSON, mapa.fitBounds).
* Prática recomendada: Criar um MapAdapter intermediário. Isso garante que a regra de negócio não saiba se o mapa está sendo desenhado por Leaflet, OpenLayers ou MapLibre GL.


________________


5. Roteiro de Modernização Tecnológica (Roadmap TI)
Fase 1 — Estabilização e Apresentação (Concluída · v1.3.2)
* Painel analítico com 5 cards contextuais explicativos sem vazamento entre abas.
* Simulação de viagens e Matriz VEN com marcadores espaciais fidedignos de Origem (DE) e Destino (PARA).
* Navegação rápida por Corredores Estratégicos (Arco Norte, Tietê-Paraná, Rio Paraguai, Santos).
* Modo Apresentação (F10) para telão executivo.
* Testes do Playwright 100% integrados e livres de bloqueios de arquivos no Drive.
Fase 2 — Refatoração Modular e Tipagem (Médio Prazo)
* Adoção de ES Modules Nativos (<script type="module">): Transição de IIFE para import/export padrão ECMAScript, eliminando objetos no window.*.
* TypeScript / JSDoc Type Checking: Definição de interfaces e contratos formais para as feições da ANTAQ:


interface InstalacaoPortuaria {


  nome: string;


  tipo: 'TUP' | 'IP4' | 'ETC' | 'ORGANIZADO' | 'PUBLICO';


  uf: string;


  municipio: string;


  processoSei?: string;


}


* Store Reativa de Estado: Centralização do estado de camadas ativas e filtros em um padrão Observer / EventBus, reduzindo chamadas manuais de atualização.
Fase 3 — Integração Corporativa e Infraestrutura de Dados (Longo Prazo)
* Conexão com a INDE (Infraestrutura Nacional de Dados Espaciais): Substituição progressiva de arquivos GeoJSON estáticos por geoserviços oficiais padronizados pela OGC (WMS e WFS do GeoServer corporativo da ANTAQ).
* Banco Espacial PostGIS: Migração da persistência de dados de geometrias locais para PostgreSQL 16 + PostGIS, habilitando geração de Vector Tiles (MVT) para renderização ultra-rápida de milhões de nós.
* Autenticação e Rastreabilidade SEI: Integração com o SSO institucional (Gov.br / Active Directory) para controle de acesso às funções de homologação e edição.