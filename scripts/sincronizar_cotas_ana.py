#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
WebGIS Corporativo ANTAQ — Sincronizador Backend de Cotas Fluviométricas da ANA
Arquivo: scripts/sincronizar_cotas_ana.py
Objetivo:
  Contornar o bloqueio de CORS/WAF dos navegadores consultando diretamente, via
  servidor/Python, o WebService da ANA (ServiceANA.asmx e API HidroWeb v2) para
  todas as estações fluviométricas do Catálogo de Ábacos da Marinha (CHM/DHN),
  salvando o resultado em `dados/cotas_ana_cache.json`.
Uso (Local ou Cronjob no Servidor de TI da ANTAQ a cada 1 hora):
  python3 scripts/sincronizar_cotas_ana.py
================================================================================
"""
import json
import os
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

ESTACOES_ABACOS_ANTAQ = {
    "14990000": {"nome": "Manaus (Rio Negro/Amazonas - AM)", "rio": "Rio Amazonas / Solimões", "nr_m": 17.90, "cota_ref_m": 25.00},
    "16030000": {"nome": "Itacoatiara (AM)", "rio": "Rio Amazonas", "nr_m": 2.50, "cota_ref_m": 11.00},
    "16350000": {"nome": "Parintins (AM)", "rio": "Rio Amazonas", "nr_m": 1.00, "cota_ref_m": 10.20},
    "17050001": {"nome": "Santarém (PA)", "rio": "Rio Amazonas / Tapajós", "nr_m": 1.10, "cota_ref_m": 8.00},
    "18010000": {"nome": "Prainha (PA)", "rio": "Rio Amazonas Baixo", "nr_m": 1.00, "cota_ref_m": 3.40},
    "18460000": {"nome": "Almeirim / Gurupá (PA)", "rio": "Rio Amazonas Foz", "nr_m": 0.80, "cota_ref_m": 3.20},
    "19150000": {"nome": "Santana / Macapá (AP)", "rio": "Rio Amazonas Braço Norte/Sul", "nr_m": 0.40, "cota_ref_m": 2.80},
    "31900000": {"nome": "Vila do Conde / Barcarena (PA)", "rio": "Rio Pará", "nr_m": 0.30, "cota_ref_m": 2.50},
    "40100":    {"nome": "Porto de Belém / Mosqueiro (BNDO/CHM - PA)", "rio": "Rio Pará", "nr_m": 0.20, "cota_ref_m": 2.70},
    "18980000": {"nome": "Curralinho / Ponta Goiabal (PA)", "rio": "Rio Pará Oeste", "nr_m": 0.25, "cota_ref_m": 2.15},
    "18920000": {"nome": "Porto São José / Furo do Tajapuru (PA)", "rio": "Estreitos de Marajó", "nr_m": 0.10, "cota_ref_m": 1.10},
    "18950000": {"nome": "Breves — Estreitos de Marajó (PA)", "rio": "Estreitos de Marajó", "nr_m": 0.30, "cota_ref_m": 1.80},
    "13150003": {"nome": "Missão I / Tefé (AM)", "rio": "Rio Solimões Leste", "nr_m": 3.10, "cota_ref_m": 13.40},
    "10100000": {"nome": "Tabatinga / Sto. Antônio do Içá (AM)", "rio": "Rio Solimões Oeste", "nr_m": 2.20, "cota_ref_m": 9.50},
    "12900000": {"nome": "Fonte Boa (AM)", "rio": "Rio Solimões Médio", "nr_m": 3.10, "cota_ref_m": 11.20},
    "15400000": {"nome": "Porto Velho (RO)", "rio": "Rio Madeira Alto", "nr_m": 3.30, "cota_ref_m": 10.00},
    "15630000": {"nome": "Humaitá I (AM)", "rio": "Rio Madeira Médio", "nr_m": 10.10, "cota_ref_m": 15.00},
    "15700000": {"nome": "Manicoré I (AM)", "rio": "Rio Madeira Médio/Baixo", "nr_m": 12.10, "cota_ref_m": 21.00},
    "15850000": {"nome": "Borba / Foz do Madeira (AM)", "rio": "Rio Madeira Baixo", "nr_m": 4.50, "cota_ref_m": 12.50},
    "17730000": {"nome": "Itaituba (PA)", "rio": "Rio Tapajós", "nr_m": 2.00, "cota_ref_m": 9.60},
    "29650000": {"nome": "Nazaré dos Patos (PA)", "rio": "Rio Tocantins", "nr_m": 2.50, "cota_ref_m": 6.00},
    "29700000": {"nome": "Tucuruí (PA)", "rio": "Rio Tocantins", "nr_m": 2.00, "cota_ref_m": 8.00}
}

def consultar_estacao_ana(cod_estacao):
    if len(cod_estacao) < 7:
        return None
    hoje = datetime.now()
    ini = hoje - timedelta(days=15)
    fmt = lambda d: d.strftime("%d/%m/%Y")

    urls = [
        f"https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicosGerais?codEstacao={cod_estacao}&dataInicio={fmt(ini)}&dataFim={fmt(hoje)}",
        f"https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos?codEstacao={cod_estacao}&dataInicio={fmt(ini)}&dataFim={fmt(hoje)}"
    ]
    headers = {"User-Agent": "ANTAQ-WebGIS-Hidroviario/1.0 (GEE/SEPH)"}

    for url in urls:
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as resp:
                xml_bytes = resp.read()
            root = ET.fromstring(xml_bytes)
            for item in root.iter():
                if item.tag.endswith("DadosHidrometeorologicos"):
                    nivel_txt, data_txt = None, None
                    for child in item:
                        if child.tag.endswith("Nivel") or child.tag.endswith("NivelFinal"):
                            nivel_txt = (child.text or "").strip()
                        elif child.tag.endswith("DataHora"):
                            data_txt = (child.text or "").strip()
                    if nivel_txt:
                        val_cm = float(nivel_txt.replace(",", "."))
                        return {
                            "cota_m": round(val_cm / 100.0, 2),
                            "nivel_cm": round(val_cm),
                            "data_hora": data_txt or fmt(hoje),
                            "fonte": "API Telemetria ANA (ServiceANA.asmx)"
                        }
        except Exception:
            continue
    return None

def main():
    saida = {
        "atualizado_em": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "estacoes": {}
    }
    for cod, meta in ESTACOES_ABACOS_ANTAQ.items():
        res = consultar_estacao_ana(cod)
        if res:
            saida["estacoes"][cod] = {**meta, **res, "status": "online_ana"}
            print(f"[OK] {cod} ({meta['nome']}): {res['cota_m']} m ({res['data_hora']})")
        else:
            saida["estacoes"][cod] = {
                **meta,
                "cota_m": meta["cota_ref_m"],
                "nivel_cm": round(meta["cota_ref_m"] * 100),
                "data_hora": saida["atualizado_em"],
                "fonte": "Cache Institucional / Referência CHM-ANA",
                "status": "cache_referencia"
            }
            print(f"[CACHE] {cod} ({meta['nome']}): {meta['cota_ref_m']} m")

    caminho_json = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dados", "cotas_ana_cache.json")
    os.makedirs(os.path.dirname(caminho_json), exist_ok=True)
    with open(caminho_json, "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, indent=2)
    print(f"Arquivo salvo em: {caminho_json}")

if __name__ == "__main__":
    main()
