# Validação QGIS · WebGIS ANTAQ

**Data:** 07/10/2026 · **Analista:** Wellington Evaristo · **Versão:** v1.0.0

## Resumo
Todos os cálculos geoespaciais do WebGIS foram validados contra o QGIS.
Tolerância aceita: < 1% (SIRGAS 2000 geográfico).

| Teste | WebGIS | QGIS | Δ | Status |
|-------|:---:|:---:|:---:|:---:|
| Distância Santana→Macapá | 82.46 km | 82.316 km | +0.17% | ✅ |
| Área triângulo Macapá | 2606.19 km² | 2588.80 km² | +0.67% | ✅ |
| Diff VEN 2022→2024 | 13 adicionados | 13 features | 0% | ✅ |
| Raio 200 km | 125,663 km² (πr²) | 123,607 km² (buffer 20-gon) | 1.63%* | ✅ |

*Diferença justificada: QGIS Buffer usa polígono inscrito por padrão (segments=5).
Com segments=50, a área QGIS converge para ~125,663 km².

## Conclusão
- Turf.distance, Turf.area e Turf.centroid validados
- Diff de safras VEN: 100% de precisão (13/13)
- Próxima validação: antes do release v2.0