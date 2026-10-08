# Dados AIS — Módulo M14

## ⚠️ Aviso sobre dados reais
Dados AIS brutos (MMSI + timestamp + lat/lon) têm **restrição de redistribuição**.
Este repositório é **público**, então:

- **Não** comitamos AIS real bruto.
- Os arquivos `posicoes_sinteticas.csv` são **100% fictícios** (gerados por script).
- Dados reais de produção ficam em pasta privada / backend.

## Arquivos

| Arquivo | Tipo | Origem |
|---|---|---|
| `embarcacoes_cadastro.csv` | Cadastro (de-para) | Sintético — pode ser substituído por SNPTA (ANTAQ) |
| `posicoes_sinteticas.csv` | AIS (pontos) | Sintético — substituir por AISStream/GFW quando disponível |

## Como regenerar
```bash
python scripts/pipeline_ais_sintetico.py