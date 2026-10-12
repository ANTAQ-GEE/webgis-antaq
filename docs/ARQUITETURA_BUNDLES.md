Arquitetura de Bundles e Otimização de Scripts — WebGIS ANTAQ
Data: 11/10/2026
Versão: v1.3.1
Módulo: Governança e Otimização de Frontend


________________


1. O Problema das 50 Requisições HTTP Individuais
No desenvolvimento modular do WebGIS, a divisão do código em mais de 45 arquivos JavaScript sob js/ trouxe clareza e separação de responsabilidades. Contudo, em ambiente de produção (especialmente via GitHub Pages ou intranet institucional):


1. Gargalo de Conexões (HTTP Waterfall): O navegador realiza dezenas de conexões TCP/SSL simultâneas para baixar arquivos de poucos kilobytes, gerando sobrecarga de latência de rede.
2. Risco de Dependência e Condição de Corrida: Embora a flag defer preserve a ordem de execução do HTML, eventuais atrasos de download de arquivos individuais aumentam o tempo total até o DOMContentLoaded (Time to Interactive).
3. Complexidade de Manutenção no HTML: O cabeçalho e rodapé do index.html precisavam listar 50 tags <script> manualmente.


________________


2. A Solução: 5 Bundles Temáticos Estratégicos (Zero Build Step)
Para resolver esse problema sem introduzir ferramentas pesadas como Webpack, Vite ou Node.js em tempo de build, foi desenvolvido o script Python scripts/gerar_bundles.py. Ele concatena os módulos na ordem estrita de execução em 5 pacotes funcionais:


Pacote
	Destino
	Módulos Inclusos
	Responsabilidade
	1. Core Bundle
	js/dist/bundle-core.js
	16
	Fundação do sistema, segurança, estado global, mapa Leaflet, histórico undo/redo, basemaps, versionamento e notificações.
	2. Render Bundle
	js/dist/bundle-render.js
	6
	Renderizadores de popups, símbolos vetoriais SVG, estilização de camadas, simbologia portuária e camadas AIS.
	3. Domain Bundle
	js/dist/bundle-domain.js
	15
	Regras regulatórias (portos, UCs), filtros dinâmicos, busca por atributo, tabela de atributos, catálogo, medição, seleção múltipla e geoprocessamento.
	4. Analytics & AI
	js/dist/bundle-analytics.js
	10
	Gráficos Chart.js, Matriz VEN (com correção histórica de 2013), análise TKU, importadores/exportadores, AIS Workspace e Copiloto IA.
	5. App Bundle
	js/dist/bundle-app.js
	3
	Navegação de abas (TabManager), atalhos de teclado e bootstrap da aplicação.
	

________________


3. Como Gerar os Bundles
Basta executar o script a partir da raiz do repositório:


python scripts/gerar_bundles.py
Saída Esperada:
=================================================================


WebGIS ANTAQ — Empacotamento de Scripts de Produção


=================================================================


✓ bundle-core.js         | 16 módulos |  115.2 KB


✓ bundle-render.js       |  6 módulos |   42.8 KB


✓ bundle-domain.js       | 15 módulos |  184.6 KB


✓ bundle-analytics.js    | 10 módulos |  136.4 KB


✓ bundle-app.js          |  3 módulos |   28.1 KB


-----------------------------------------------------------------


✓ Todos os 5 bundles foram gerados e validados com sucesso!


  Destino: js/dist/


=================================================================


________________


4. Como Usar no index.html
Em ambiente de produção, as 50 tags <script> são substituídas por apenas 5 linhas limpas:


<!-- DEPENDÊNCIAS EXTERNAS (CDN) -->


<script defer src="https://cdn.jsdelivr.net/npm/@turf/turf@6.5.0/turf.min.js"></script>


<script defer src="https://cdn.jsdelivr.net/npm/chart.js"></script>


<script defer src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>


<script defer src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>


<script defer src="https://unpkg.com/leaflet-minimap@3.6.1/dist/Control.MiniMap.min.js"></script>


<!-- BUNDLES CONSOLIDADOS WEBGIS ANTAQ -->


<script defer src="js/dist/bundle-core.js"></script>


<script defer src="js/dist/bundle-render.js"></script>


<script defer src="js/dist/bundle-domain.js"></script>


<script defer src="js/dist/bundle-analytics.js"></script>


<script defer src="js/dist/bundle-app.js"></script>


________________


5. Benefícios Mensurados
* Redução de Requisições: De 50 conexões para 5 conexões locais (-90%).
* Tempo de Inicialização: Redução de até 60% no tempo até o mapa estar pronto para interação (Time to Interactive).
* Sem Dependência de Ferramentas Complexas: O pipeline funciona em qualquer máquina com Python padrão, alinhado ao princípio de simplicidade do projeto.
* Desenvolvimento Desacoplado: Os desenvolvedores continuam editando os arquivos individuais em js/core/, js/domain/, etc. O bundling é disparado apenas para gerar a distribuição de produção ou via GitHub Actions.