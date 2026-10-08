# -*- coding: utf-8 -*-
# M14 - Gerador AIS sintetico v5 - rotas entre portos seguindo SNV
import csv
import json
import math
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

random.seed(42)

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "dados" / "ais"
OUT_DIR.mkdir(parents=True, exist_ok=True)

SNV_PATH = ROOT / "dados" / "snv_1973.geojson"
PORTOS_PATH = ROOT / "dados" / "instalacoes_portuarias.geojson"

AMOSTRA_PONTOS = 25
PARADA_H = 6.0


def log(msg):
    print(msg, flush=True)


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def bearing_deg(lon1, lat1, lon2, lat2):
    lat1r, lon1r = math.radians(lat1), math.radians(lon1)
    lat2r, lon2r = math.radians(lat2), math.radians(lon2)
    dlon = lon2r - lon1r
    x = math.sin(dlon) * math.cos(lat2r)
    y = math.cos(lat1r) * math.sin(lat2r) - math.sin(lat1r) * math.cos(lat2r) * math.cos(dlon)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def extrair_linhas(geojson):
    linhas = []
    for feat in geojson.get("features", []):
        g = feat.get("geometry") or {}
        t = g.get("type")
        if t == "LineString":
            linhas.append(g["coordinates"])
        elif t == "MultiLineString":
            linhas.extend(g["coordinates"])
    return linhas


def carregar_portos():
    if not PORTOS_PATH.exists():
        return []
    gj = json.load(open(PORTOS_PATH, encoding="utf-8"))
    portos = []
    for feat in gj.get("features", []):
        g = feat.get("geometry") or {}
        if g.get("type") != "Point":
            continue
        lon, lat = g["coordinates"][0], g["coordinates"][1]
        props = feat.get("properties") or {}
        nome = (props.get("nome") or props.get("Nome") or
                props.get("NOME") or props.get("name") or "Instalacao")
        portos.append({"lat": lat, "lon": lon, "nome": nome})
    return portos


# ---------------------------------------------------------------------------
# Indexacao otimizada
# ---------------------------------------------------------------------------
def indexar_portos(linhas, portos):
    log("[idx] indexando {} portos em {} linhas...".format(len(portos), len(linhas)))
    linhas_amostradas = []
    for linha in linhas:
        if len(linha) < 2:
            linhas_amostradas.append([])
            continue
        linhas_amostradas.append(linha[::AMOSTRA_PONTOS])

    index = {}
    for pi, porto in enumerate(portos):
        melhor = None
        for li, linha_am in enumerate(linhas_amostradas):
            if len(linha_am) < 2:
                continue
            for k, (x, y) in enumerate(linha_am):
                d = haversine_km(porto["lat"], porto["lon"], y, x)
                if melhor is None or d < melhor[0]:
                    melhor = (d, li, k * AMOSTRA_PONTOS)
        if melhor and melhor[0] < 100:
            index[pi] = {"linha": melhor[1], "idx": melhor[2], "dist_km": melhor[0]}
        if (pi + 1) % 200 == 0:
            log("[idx] {} / {} portos".format(pi + 1, len(portos)))

    log("[idx] {} portos proximos a rios".format(len(index)))
    return index


# ---------------------------------------------------------------------------
# Rota
# ---------------------------------------------------------------------------
def rota_entre_portos(linha, idx_o, idx_d):
    if idx_o <= idx_d:
        return linha[idx_o:idx_d + 1]
    return list(reversed(linha[idx_d:idx_o + 1]))


def amostrar_trecho(trecho, vel_kmh):
    if len(trecho) < 2:
        return []
    pontos = []
    t_acum = 0.0
    for i in range(len(trecho) - 1):
        lon1, lat1 = trecho[i]
        lon2, lat2 = trecho[i + 1]
        seg = haversine_km(lat1, lon1, lat2, lon2)
        n = max(1, int(seg / 5))
        for k in range(n):
            t = k / n
            lon = lon1 + (lon2 - lon1) * t
            lat = lat1 + (lat2 - lat1) * t
            pontos.append((lon, lat, t_acum, vel_kmh))
            t_acum += (seg / n) / max(vel_kmh, 0.1)
    return pontos


# ---------------------------------------------------------------------------
# Cadastro
# ---------------------------------------------------------------------------
TIPOS = {70: "Carga Geral", 71: "Carga Perigosa (Hazmat)", 80: "Tanque",
         60: "Passageiros", 31: "Rebocador", 32: "Empurrador", 52: "Balsa", 30: "Pesca"}
PREFIXOS = {70: "N/M", 71: "N/M", 80: "N/T", 60: "B/P", 31: "R/B", 32: "E/M", 52: "B/M", 30: "B/P"}
NOMES_BASE = ["AMAZONAS", "NEGRO", "SOLIMOES", "MADEIRA", "TAPAJOS", "TOCANTINS",
              "RIO BRANCO", "JURUA", "PURUS", "JAPURA", "XINGU", "ARAGUAIA",
              "BELEM", "MANAUS", "SANTAREM", "MACAPA", "PARINTINS", "OBIDOS",
              "ITACOATIARA", "COARI", "TEFE", "MARABA", "ALTAMIRA", "BARCARENA"]
OPERADORES = ["AMAZON RIVER LOG", "HIDROVIAS NORTE", "NAVEGA BRASIL",
              "RIO NEGRO TRANSP", "BRASIL CENTRAL NAV", "AMAZON CARGO",
              "PORTAL DA AMAZONIA", "NORTE LOGISTICA", "AMAPA NAV"]


def gerar_cadastro(n=40):
    cadastro, usados = [], set()
    for _ in range(n):
        tipo_cod = random.choice(list(TIPOS.keys()))
        while True:
            nome = "{} {} {:02d}".format(PREFIXOS[tipo_cod], random.choice(NOMES_BASE), random.randint(1, 99))
            if nome not in usados:
                usados.add(nome)
                break
        cadastro.append({
            "mmsi": 710000000 + random.randint(1, 999999),
            "imo": (9000000 + random.randint(1, 999999)) if tipo_cod in (70, 71, 80, 60) else "",
            "nome": nome,
            "tipo_codigo": tipo_cod,
            "tipo": TIPOS[tipo_cod],
            "operador": random.choice(OPERADORES),
            "bandeira": "BR",
            "comprimento_m": random.choice([25, 40, 60, 80, 100, 120, 150]) if tipo_cod != 52 else random.choice([60, 80, 100]),
            "calado_m": round(random.uniform(1.5, 6.0), 1),
            "ano_construcao": random.randint(1985, 2024),
        })
    return cadastro


# ---------------------------------------------------------------------------
# Geracao de viagem  ← CORRIGIDA
# ---------------------------------------------------------------------------
def gerar_viagem(linha_idx, linha, portos_idx_da_linha, idx_portos, vel_kmh, parada_h, horas_max):
    if len(portos_idx_da_linha) < 2:
        return []

    portos_ord = sorted(portos_idx_da_linha, key=lambda pi: idx_portos[pi]["idx"])
    n_pares = len(portos_ord)

    registros = []
    t_atual = 0.0
    iteracoes = 0
    MAX_ITER = 200  # <-- trava de seguranca

    while t_atual < horas_max and iteracoes < MAX_ITER:
        iteracoes += 1
        n = random.randint(2, min(4, n_pares))
        escolhidos = random.sample(portos_ord, n)
        escolhidos.sort(key=lambda pi: idx_portos[pi]["idx"])

        avancou = False  # <-- flag: avancou o tempo neste ciclo?

        for i in range(len(escolhidos) - 1):
            a = idx_portos[escolhidos[i]]
            b = idx_portos[escolhidos[i + 1]]
            if a["idx"] == b["idx"]:
                continue
            trecho = rota_entre_portos(linha, a["idx"], b["idx"])
            if len(trecho) < 2:
                continue
            pts = amostrar_trecho(trecho, vel_kmh)
            if not pts:
                continue

            for lon, lat, t_h, sog in pts:
                if t_atual + t_h > horas_max:
                    break
                registros.append((t_atual + t_h, lon, lat, sog))

            t_nav_fim = pts[-1][2] if pts else 0.0
            t_parada = t_atual + t_nav_fim
            if t_parada > horas_max:
                break

            ultimo = trecho[-1]
            registros.append((t_parada, ultimo[0], ultimo[1], 0.0))
            t_atual = t_parada + parada_h
            avancou = True

        # Se nao avancou nada, sai do while (evita loop infinito)
        if not avancou:
            break

    return registros


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    log("== M14 - gerador AIS sintetico v5 ==")

    if not SNV_PATH.exists():
        log("[erro] snv_1973.geojson nao encontrado")
        return
    linhas = extrair_linhas(json.load(open(SNV_PATH, encoding="utf-8")))
    log("[ok] {} linhas do SNV".format(len(linhas)))

    portos = carregar_portos()
    if not portos:
        log("[erro] sem portos")
        return
    log("[ok] {} portos carregados".format(len(portos)))

    idx = indexar_portos(linhas, portos)

    por_linha = {}
    for pi, info in idx.items():
        por_linha.setdefault(info["linha"], []).append(pi)
    linhas_boas = {li: pis for li, pis in por_linha.items() if len(pis) >= 3}
    log("[ok] {} linhas tem 3+ portos".format(len(linhas_boas)))

    if not linhas_boas:
        log("[erro] nenhuma linha tem portos suficientes")
        return

    cadastro = gerar_cadastro(40)
    with (OUT_DIR / "embarcacoes_cadastro.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(cadastro[0].keys()))
        w.writeheader()
        w.writerows(cadastro)
    log("[ok] embarcacoes_cadastro.csv: {} registros".format(len(cadastro)))

    agora = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    inicio = agora - timedelta(days=7)
    horas_max = 7 * 24

    registros = []
    for i, emb in enumerate(cadastro):
        vel = {"Rebocador": 8, "Empurrador": 8, "Balsa": 5, "Pesca": 6,
               "Passageiros": 18, "Tanque": 12, "Carga Geral": 14,
               "Carga Perigosa (Hazmat)": 12}.get(emb["tipo"], 12)

        li = random.choice(list(linhas_boas.keys()))
        linha = linhas[li]
        pis = linhas_boas[li]

        viagem = gerar_viagem(li, linha, pis, idx, vel, PARADA_H, horas_max)
        if not viagem:
            continue

        for (t_h, lon, lat, sog) in viagem:
            ts = inicio + timedelta(hours=t_h)
            registros.append({
                "mmsi": emb["mmsi"],
                "timestamp": ts.isoformat(),
                "lat": round(lat, 5),
                "lon": round(lon, 5),
                "sog": round(sog, 1),
                "cog": 0,
                "heading": 0,
                "nav_status": 5 if sog == 0 else 0,
                "porto_proximo": "",
                "dist_porto_km": "",
            })

        if (i + 1) % 10 == 0:
            log("[pos] {} / {} embarcacoes".format(i + 1, len(cadastro)))

    if not registros:
        log("[erro] nenhuma posicao gerada. Verifique se ha portos em comum com rios.")
        return

    registros.sort(key=lambda r: (r["mmsi"], r["timestamp"]))

    por_mmsi = {}
    for r in registros:
        por_mmsi.setdefault(r["mmsi"], []).append(r)
    for mmsi, arr in por_mmsi.items():
        for i in range(len(arr) - 1):
            b = bearing_deg(arr[i]["lon"], arr[i]["lat"], arr[i + 1]["lon"], arr[i + 1]["lat"])
            arr[i]["cog"] = round(b, 1)
            arr[i]["heading"] = round(b, 1)

    log("[pos] calculando porto mais proximo ({} pontos)...".format(len(registros)))

    # --- Grid espacial: celula de 1 grau ---
    from collections import defaultdict
    grid = defaultdict(list)
    def cel(lat, lon):
        return (int(lat), int(lon))
    for p in portos:
        grid[cel(p["lat"], p["lon"])].append(p)

    def porto_mais_proximo_rapido(lat, lon):
        # Procura na celula + 8 vizinhas
        cl = cel(lat, lon)
        melhor_d, melhor_nome = 1e9, ""
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for p in grid.get((cl[0] + dx, cl[1] + dy), []):
                    d = haversine_km(lat, lon, p["lat"], p["lon"])
                    if d < melhor_d:
                        melhor_d, melhor_nome = d, p["nome"]
        return melhor_d, melhor_nome

    for i, r in enumerate(registros):
        d, nome = porto_mais_proximo_rapido(r["lat"], r["lon"])
        if d < 30:
            r["porto_proximo"] = nome
            r["dist_porto_km"] = round(d, 1)
        if (i + 1) % 2000 == 0:
            log("[pos] porto mais proximo: {}/{}".format(i + 1, len(registros)))

    with (OUT_DIR / "posicoes_sinteticas.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(registros[0].keys()))
        w.writeheader()
        w.writerows(registros)
    log("[ok] posicoes_sinteticas.csv: {} registros".format(len(registros)))

    log("[fim] {} embarcacoes | {} pontos".format(len(cadastro), len(registros)))


if __name__ == "__main__":
    main()