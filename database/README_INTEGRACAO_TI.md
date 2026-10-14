# Guia Técnico de Integração: Banco Espacial (PostGIS), ArcGIS REST e Telemetria AIS

Este documento descreve como conectar o **WebGIS Corporativo ANTAQ** a bancos de dados corporativos, servidores **ArcGIS Enterprise** e provedores de **API AIS em tempo real**, sem necessidade de reescrever a interface.

---

## 1. Conector Universal de Camadas (`js/core/data-adapter.js`)

O módulo `window.DataAdapter` desacopla o carregamento cartográfico dos arquivos estáticos locais. Ele opera em **4 modos** e conta com *fallback* automático (se o servidor cair, o sistema carrega o cache local transparente sem interromper o uso).

### Como conectar a um FeatureServer do ArcGIS Enterprise (Quando disponível na ANTAQ)
No console ou na inicialização do sistema:
```javascript
DataAdapter.configurarFonte('instalacoes_portuarias', {
  modo: 'arcgis_rest',
  url: 'https://sig.antaq.gov.br/arcgis/rest/services/Portos/FeatureServer/0/query',
  where: '1=1',
  fallbackLocal: true
});
```

### Como conectar a uma API PostGIS Institucional
```javascript
DataAdapter.configurarFonte('GLOBAL', {
  modo: 'postgis_api',
  postgisBaseUrl: 'https://api-webgis.antaq.gov.br/api/v1/geo',
  authToken: 'SEU_TOKEN_JWT'
});
```

### Como conectar a um GeoServer / INDE (Padrão OGC WFS 2.0)
```javascript
DataAdapter.configurarFonte('ven_2024', {
  modo: 'ogc_wfs',
  url: 'https://geoservicos.inde.gov.br/geoserver/wfs',
  typeName: 'antaq:ven_2024'
});
```

---

## 2. Conector Universal de Telemetria AIS (`js/io/ais-api-connector.js`)

O módulo `window.AISAPIConnector` já está preparado para qualquer acordo de fornecimento de dados AIS (seja API própria da ANTAQ, acordo com a Marinha do Brasil/SISTRAM, MarineTraffic, Spire Maritime, Orbcomm ou streaming WebSocket).

### Normalização Automática de Campos
O método `AISAPIConnector.normalizarMensagemAIS(raw)` reconhece e traduz automaticamente qualquer nomenclatura de campo dos fornecedores de mercado:
* **Identificação:** `mmsi`, `MMSI`, `userid`, `vessel_mmsi`, `MetaData.MMSI`
* **Coordenadas:** `lat`/`lon`, `LAT`/`LON`, `latitude`/`longitude`, ou `geometry.coordinates` (GeoJSON)
* **Cinemática:** `sog`/`speed`/`SPEED`, `cog`/`course`/`COURSE`, `heading`/`HEADING`
* **Viagem:** `destination`/`porto_destino`, `eta`/`ETA`, `draught`/`calado_m`
* **Classificação ITU-R M.1371:** Converte códigos numéricos internacionais (ex: `31`/`32` Empurrador/Rebocador, `70-79` Cargueiro/Graneleiro, `80-89` Petroleiro/Tanque, `60-69` Passageiros) para a simbologia oficial da ANTAQ.

### Cruzamento Espacial Automático com o VEN
Cada posição recebida via API é automaticamente confrontada com o eixo da malha hidroviária (VEN 2024) usando distância geodésica:
* **$\le 2,0\text{ km}$:** Classificado como `dentro` do corredor navegável.
* **$2,0\text{ a }5,0\text{ km}$:** Classificado como `atencao`.
* **$> 5,0\text{ km}$:** Classificado como `fora` da via catalogada.

### Exemplos de Ativação da API AIS

#### Cenário A: API REST fornecida pela ANTAQ ou Acordo Governamental (SISTRAM)
```javascript
AISAPIConnector.configurar({
  ativo: true,
  provedor: 'ANTAQ_REST',
  urlPosicoes: 'https://api.antaq.gov.br/v1/ais/ultimas-posicoes',
  apiKey: 'TOKEN_INSTITUCIONAL',
  intervaloSegundos: 30
});
```

#### Cenário B: Fornecedor Comercial (MarineTraffic / Spire / VesselFinder)
```javascript
AISAPIConnector.configurar({
  ativo: true,
  provedor: 'SPIRE_MARITIME',
  urlPosicoes: 'https://api.spire.com/vessels/v2/positions',
  authHeader: 'Authorization',
  apiKey: 'Bearer CHAVE_FORNECEDOR',
  intervaloSegundos: 60
});
```

#### Cenário C: Streaming em Tempo Real via WebSocket
```javascript
AISAPIConnector.configurar({
  ativo: true,
  provedor: 'WEBSOCKET_STREAM',
  wsUrl: 'wss://stream.aisstream.io/v0/stream',
  apiKey: 'CHAVE_STREAM'
});
```

---

## 3. Implantação do Banco Espacial (`database/schema_postgis.sql`)

Para provisionar o banco de dados na infraestrutura de TI:
1. Em uma instância **PostgreSQL 16+** com extensão **PostGIS 3.4+**, execute:
   ```bash
   psql -U postgres -d webgis_antaq -f database/schema_postgis.sql
   ```
2. Para ingerir lotes JSON vindos de qualquer API AIS diretamente no banco (calculando o cruzamento com o VEN via índice espacial KNN `<->`):
   ```sql
   SELECT ais.fn_ingerir_lote_ais('[{"mmsi": 710001234, "nome": "EMPURRADOR TAPAJOS I", "lat": -3.1375, "lon": -60.0261, "sog": 8.4, "cog": 95}]'::jsonb, 'SISTRAM_MARINHA');
   ```
