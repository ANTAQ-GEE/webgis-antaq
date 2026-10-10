# -*- coding: utf-8 -*-
# M16 - Cruzamento AIS x VEN
# Classifica cada posição AIS pelo trecho VEN mais próximo
import csv
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AIS_PATH = ROOT / "dados" / "ais" / "posicoes_sinteticas.csv"
VEN_PATH = ROOT / "dados" / "ven_2024.geojson"
OUT_PATH = ROOT / "dados" / "ais" / "cruzamento_ven.csv"

# Distância máxima pra considerar "dentro do corredor"
KM_DENTRO = 2.0
KM_ATENCAO = 5.0
# Amostragem pra indexar as linhas VEN (1 a cada N pontos)
AMOSTRA_VEN = 5


def log(msg):
    print(msg, flush=True)


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def carregar_ven():
    """Retorna lista de trechos: {id, nome, coords: [(lon,lat)...]}"""
    if not VEN_PATH.exists():
        log(f"[erro] {VEN_PATH} nao existe")
        return []
    gj = json.load(open(VEN_PATH, encoding="utf-8", errors="replace"))
    trechos = []
    for i, feat in enumerate(gj.get("features", [])):
        props = feat.get("properties") or {}
        geom = feat.get("geometry") or {}
        coords = []
        if geom.get("type") == "LineString":
            coords = [(c[0], c[1]) for c in geom["coordinates"]]
        elif geom.get("type") == "MultiLineString":
            for line in geom["coordinates"]:
                for c in line:
                    coords.append((c[0], c[1]))
        if len(coords) < 2:
            continue
        nome = (props.get("nome") or props.get("Nome") or
                props.get("NOME") or props.get("name") or
                props.get("trecho") or f"VEN_{i}")
        trechos.append({"id": i, "nome": str(nome), "coords": coords})
    return trechos


def indexar_ven(trechos):
    """Cria um grid 1°x1° de pontos amostrados pra busca rápida."""
    grid = {}
    for t in trechos:
        # Amostra de pontos
        amostra = t["coords"][::AMOSTRA_VEN]
        if len(t["coords"]) > 1 and t["coords"][-1] not in amostra:
            amostra.append(t["coords"][-1])
        for lon, lat in amostra:
            cell = (int(math.floor(lat)), int(math.floor(lon)))
            if cell not in grid:
                grid[cell] = []
            grid[cell].append((lon, lat, t["id"], t["nome"]))
    return grid


def ven_mais_proximo(grid, lat, lon):
    """Retorna (nome_trecho, distancia_km) do ponto VEN mais próximo."""
    clat = int(math.floor(lat))
    clon = int(math.floor(lon))
    melhor_d = 1e9
    melhor_nome = ""
    # Varre 3x3 células
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            pts = grid.get((clat + dy, clon + dx), [])
            for plon, plat, tid, tnome in pts:
                d = haversine_km(lat, lon, plat, plon)
                if d < melhor_d:
                    melhor_d = d
                    melhor_nome = tnome
    return melhor_nome, melhor_d


def classificar(dist):
    if dist <= KM_DENTRO:
        return "dentro"
    if dist <= KM_ATENCAO:
        return "atencao"
    return "fora"


def main():
    log("== M16 - Cruzamento AIS x VEN ==")

    if not AIS_PATH.exists():
        log(f"[erro] {AIS_PATH} nao existe")
        return

    trechos = carregar_ven()
    if not trechos:
        return
    log(f"[ok] {len(trechos)} trechos VEN carregados")

    grid = indexar_ven(trechos)
    log(f"[ok] grid indexado com {len(grid)} celulas")

    # Le posicoes
    with AIS_PATH.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        posicoes = list(reader)
    log(f"[ok] {len(posicoes)} posicoes AIS carregadas")

    # Classifica cada uma
    out_rows = []
    for i, p in enumerate(posicoes):
        try:
            lat = float(p["lat"])
            lon = float(p["lon"])
        except (ValueError, KeyError):
            continue

        nome, dist = ven_mais_proximo(grid, lat, lon)
        classe = classificar(dist)

        out_rows.append({
            "mmsi": p.get("mmsi", ""),
            "timestamp": p.get("timestamp", ""),
            "lat": p.get("lat", ""),
            "lon": p.get("lon", ""),
            "trecho_ven": nome,
            "distancia_km": round(dist, 2),
            "classificacao": classe,
        })

        if (i + 1) % 500 == 0:
            log(f"[cx] {i + 1} / {len(posicoes)}")

    # Estatisticas
    dentro = sum(1 for r in out_rows if r["classificacao"] == "dentro")
    atencao = sum(1 for r in out_rows if r["classificacao"] == "atencao")
    fora = sum(1 for r in out_rows if r["classificacao"] == "fora")

    # Escreve CSV
    if out_rows:
        with OUT_PATH.open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(out_rows[0].keys()))
            w.writeheader()
            w.writerows(out_rows)
        log(f"[ok] {OUT_PATH.name}: {len(out_rows)} registros")

    log(f"[fim] dentro: {dentro} | atencao: {atencao} | fora: {fora}")
    log(f"      total: {len(out_rows)}")


if __name__ == "__main__":
    main()