WebGIS Corporativo ANTAQ — Próximos Passos e Backlog Técnico
Data: 11/10/2026
Versão Atual: v1.3.1-teste
Unidade Responsável: GEE/SEPH — Gerência Especial de Estudos
Classificação: Planejamento Técnico e Backlog Pós-Apresentação


________________


📌 Contexto
Após a apresentação do protótipo funcional para a Gerência de Tecnologia da Informação (GTI), este documento estabelece o roteiro de evolução do WebGIS Corporativo da ANTAQ, organizando o trabalho em fases claras: desde os ajustes imediatos de interface e dados até os projetos de integração corporativa de médio e longo prazo.


________________


🚀 Fase 1 — Estabilização Imediata (Release v1.3.1)
Melhorias de desempenho, correções de interface e alinhamento de dados executadas no ambiente do piloto:


* Correção no Ciclo de Vida do AIS (controle-ais.js):
   * Ajuste no método fechar() para restaurar fidedignamente todas as camadas do mapa que estavam ativas antes do isolamento;
   * Prevenção do re-escondimento acidental ao alternar abas via evento tabmudou.
* Otimização do Painel Analítico (analytics.js):
   * Implementação de cache por sub-aba (_cacheValido: { ven, portos, travessias }) para evitar destruição e recriação custosa de instâncias Chart.js;
   * Redimensionamento imediato e suave via requestAnimationFrame.
* Correção da Série Histórica VEN 2013:
   * Inclusão da safra 2013 (Marco Inicial) com o valor exato alinhado com a Matriz VEN (22.036 km / 332 trechos);
   * Ajuste dinâmico da escala do eixo Y (17.000 a 23.500 km) para comportar a amplitude real da série histórica (2013 a 2024).
* Botões Contextuais e Transições (tab-manager.js):
   * Migração dos botões operacionais (Matriz VEN, Comparar Safras, Painel) para visibilidade exclusiva na aba Análise;
   * Abertura de painéis e abas sem dependência de atrasos artificiais de setTimeout.


________________


🛠️ Fase 2 — Amadurecimento Interno (Curto Prazo — Autonomia da GEE)
Etapas de consolidação técnica que a GEE pode executar diretamente no repositório:


1. Consolidação e Junção dos Módulos JavaScript:
   * Agrupamento lógico dos mais de 40 scripts avulsos em 4 pacotes conceituais (Core, Render, Domain, Analytics/AI) para reduzir o número de requisições HTTP e eliminar o risco de corridas de carregamento;
   * Extração de funções utilitárias duplicadas (repararTexto, extrairUF, cálculos de distância);
   * Eliminação de listeners redundantes de eventos de mapa e teclado.
2. Automação de Testes End-to-End (E2E):
   * Expansão dos testes automatizados com Playwright cobrindo os fluxos críticos:
      * Carregamento de camadas vetoriais e abertura de popups;
      * Medição de distâncias e áreas;
      * Seleção múltipla e exportação de CSV/GeoJSON;
      * Comparação de safras e Matriz VEN.
3. Evolução do Copiloto IA:
   * Integração com o motor local (Ollama / Llama 3) para consultas regulatórias sem envio de dados para APIs externas;
   * Expansão das regras heurísticas de viabilidade espacial baseadas na Lei nº 12.815/2013.


________________


🏛️ Fase 3 — Integração Corporativa (Médio Prazo — Construção Conjunta com a TI)
Pontos submetidos à apreciação, governança e disponibilidade da equipe de TI:


1. Infraestrutura e Banco Geoespacial:
   * Avaliação para migração do modelo estático GeoJSON para banco relacional PostgreSQL 16 com extensão PostGIS;
   * Suporte a consultas espaciais indexadas (GIST) e geração de Vector Tiles (MVT) para ganho de escala.
2. Autenticação e Controle de Acessos (SSO):
   * Integração do modo de edição/homologação com o padrão do Gov.br ou Active Directory institucional (OAuth2 / OIDC).
3. Auditoria e Logs de Uso:
   * Criação de tabelas de log estruturado para registro de consultas, geração de notas técnicas e exportações de dados para conformidade com o TCU e a CGU.
4. Hospedagem Institucional:
   * Transição do GitHub Pages para servidor ou contêiner corporativo Nginx no datacenter da ANTAQ sob o domínio webgis.antaq.gov.br.


________________


🌊 Fase 4 — Projetos Futuros e Expansão (Longo Prazo)
Iniciativas que dependem de acordos institucionais e infraestrutura de alta complexidade:


1. Rastreamento de Embarcações em Tempo Real (AIS Corporativo):
   * Acordo de cooperação técnica com a Marinha do Brasil ou integração via API comercial especializada (Clarksons);
   * Arquitetura com servidor WebSocket dedicado para recepção de streaming de posições;
   * Análise de impacto e salvaguardas de conformidade com a LGPD e sigilo de cargas.
2. Integração com Sistemas Finalísticos da ANTAQ:
   * Conexão bidirecional de dados com o Sistema de Desempenho Portuário (SDP), SIGTAQ e Porto Sem Papel (PSP).


________________




Documento mantido pela Gerência Especial de Estudos (GEE/SEPH) · Última revisão: 11/10/2026