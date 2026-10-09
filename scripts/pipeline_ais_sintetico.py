# -*- coding: utf-8 -*-
# M15 - Pipeline AIS v9 - programacao + viagens + alertas (anti-colisao)
import csv
import json
import math
import random
import re
import hashlib
from datetime import datetime, timedelta, timezone
from pathlib import Path

random.seed(42)

ROOT = Path(__file__).resolve().parent.parent
ROTAS_DIR = ROOT / "dados" / "rotas_sigtaq"
OUT_DIR = ROOT / "dados" / "ais"
OUT_DIR.mkdir(parents=True, exist_ok=True)

KM_ENTRE_PONTOS = 8
DWELL_INTERMEDIARIO_H = 6
DWELL_TERMINAL_H = 18
DIAS = 14

PERFIS = [
    ("pontual",     0.30, 0.15, 0.10, 0.03, 0.5,  1.5),
    ("regular",     0.35, 0.50, 0.40, 0.08, 1.0,  3.0),
    ("irregular",   0.22, 1.50, 1.00, 0.15, 2.0,  5.0),
    ("problematica",0.13, 3.00, 2.00, 0.25, 3.0, 10.0),
]

TETO_ATRASO = {
    "pontual": 2.0, "regular": 5.0,
    "irregular": 12.0, "problematica": 24.0,
}

LIMIAR_ATENCAO_H = 0.5
LIMIAR_ATRASADO_H = 2.0


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


def classificar(atraso_h):
    if atraso_h <= LIMIAR_ATENCAO_H:
        return "no_prazo"
    if atraso_h <= LIMIAR_ATRASADO_H:
        return "atencao"
    return "atrasado"


def limpar_nome(stem):
    s = stem.replace("-_-", " ").replace("_-_", " ")
    s = s.replace("_", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def extrair_tipo(nome):
    n = nome.upper()
    if "SAFIRA" in n or "ESMERALDA" in n or "AMAZON STAR" in n:
        return 60, "Passageiros"
    return 70, "Carga Geral"


def mmsi_de(nome):
    h = int(hashlib.md5(nome.encode("utf-8")).hexdigest()[:8], 16)
    return 710000000 + (h % 999999)


def carregar_segmentos(path):
    try:
        gj = json.load(open(path, encoding="utf-8", errors="replace"))
    except Exception as e:
        log("[erro] {}: {}".format(path.name, e))
        return []
    segments = []
    for feat in gj.get("features", []):
        props = feat.get("properties") or {}
        geom = feat.get("geometry") or {}
        coords = []
        if geom.get("type") == "MultiLineString":
            for line in geom["coordinates"]:
                for c in line:
                    coords.append((float(c[0]), float(c[1])))
        elif geom.get("type") == "LineString":
            for c in geom["coordinates"]:
                coords.append((float(c[0]), float(c[1])))
        if len(coords) < 2:
            continue
        segments.append({
            "coords": coords,
            "porto_orig": props.get("PORTO ORIG") or props.get("PORTO DE O") or "",
            "porto_dest": props.get("PORTO DEST") or props.get("PORTO DE D") or "",
            "velocidade": float(props.get("VELOCIDADE", 20.0) or 20.0),
            "distancia": float(props.get("DISTANCIA", 0) or 0),
            "hidrovia": props.get("HIDROVIA") or props.get("NOME", ""),
        })
    return segments


def encadear(segments):
    if not segments:
        return []
    restantes = [dict(s) for s in segments]
    chain = [restantes.pop(0)]
    while restantes:
        ult = chain[-1]["coords"][-1]
        melhor_i, melhor_d, inverter = None, 0.02, False
        for i, s in enumerate(restantes):
            d1 = math.hypot(s["coords"][0][0] - ult[0], s["coords"][0][1] - ult[1])
            if d1 < melhor_d:
                melhor_d, melhor_i, inverter = d1, i, False
            d2 = math.hypot(s["coords"][-1][0] - ult[0], s["coords"][-1][1] - ult[1])
            if d2 < melhor_d:
                melhor_d, melhor_i, inverter = d2, i, True
        if melhor_i is None:
            melhor_i, inverter = 0, False
        s = restantes.pop(melhor_i)
        if inverter:
            s["coords"] = list(reversed(s["coords"]))
            s["porto_orig"], s["porto_dest"] = s["porto_dest"], s["porto_orig"]
        chain.append(s)
    return chain


def sortear_perfil():
    r = random.random()
    acum = 0.0
    for p in PERFIS:
        acum += p[1]
        if r <= acum:
            return p
    return PERFIS[0]


def simular_atraso(perfil, atraso_atual):
    nome, _, base, ruido, chance_inc, inc_min, inc_max = perfil
    delta = random.uniform(-base * 0.3, base * 0.7) + random.uniform(-ruido, ruido)
    if random.random() < chance_inc:
        delta += random.uniform(inc_min, inc_max)
    novo = max(0.0, atraso_atual + delta)
    return min(novo, TETO_ATRASO[nome])


def gerar_programacao(chain):
    prog = []
    t = 0.0
    for i, seg in enumerate(chain):
        vel = seg["velocidade"] or 20.0
        km = seg["distancia"] or 0.0
        dur = km / vel if vel > 0 else 0.0
        eta = t + dur
        dwell = DWELL_TERMINAL_H if i == len(chain) - 1 else DWELL_INTERMEDIARIO_H
        etd = eta + dwell
        prog.append({
            "ordem": i,
            "porto": seg["porto_dest"] or seg["porto_orig"] or ("Porto {}".format(i)),
            "eta_prog": eta,
            "etd_prog": etd,
            "duracao_trecho_h": dur,
            "km": km,
            "velocidade": vel,
            "hidrovia": seg["hidrovia"],
        })
        t = etd
    return prog


def gerar_viagem_real(chain, prog, perfil, inicio):
    viagens = []
    atraso_acum = 0.0
    for i, seg in enumerate(chain):
        novo_atraso = simular_atraso(perfil, atraso_acum)
        atraso_leg = novo_atraso - atraso_acum
        atraso_acum = novo_atraso

        p = prog[i]
        eta_real = p["eta_prog"] + atraso_acum
        dwell_var = random.uniform(-1.0, 1.5)
        dwell_base = DWELL_TERMINAL_H if i == len(chain) - 1 else DWELL_INTERMEDIARIO_H
        dwell_real = max(2.0, dwell_base + dwell_var)
        etd_real = eta_real + dwell_real

        viagens.append({
            "ordem": i,
            "porto": p["porto"],
            "eta_prog": p["eta_prog"],
            "etd_prog": p["etd_prog"],
            "eta_real": eta_real,
            "etd_real": etd_real,
            "atraso_h": atraso_acum,
            "atraso_leg_h": atraso_leg,
            "incidente": atraso_leg > 2.0,
            "status": classificar(atraso_acum),
            "km": p["km"],
            "velocidade": p["velocidade"],
            "hidrovia": p["hidrovia"],
            "data_eta": (inicio + timedelta(hours=eta_real)).isoformat(),
            "data_etd": (inicio + timedelta(hours=etd_real)).isoformat(),
        })
    return viagens


def gerar_posicoes(chain, viagens, mmsi, inicio, horas_max, fator_vel=1.0):
    """Gera posições seguindo o tempo real (com atraso)."""
    registros = []
    for i, seg in enumerate(chain):
        v = viagens[i]
        coords = seg["coords"]
        t_real = v["eta_real"] - (viagens[i-1]["etd_real"] if i > 0 else 0.0)
        t_real = max(0.1, t_real)
        t_start = viagens[i-1]["etd_real"] if i > 0 else 0.0

        total_km = sum(
            haversine_km(coords[j+1][1], coords[j+1][0], coords[j][1], coords[j][0])
            for j in range(len(coords) - 1)
        ) or 1.0

        t_acum = t_start
        for j in range(len(coords) - 1):
            if t_acum > horas_max:
                break
            lon1, lat1 = coords[j]
            lon2, lat2 = coords[j + 1]
            d = haversine_km(lat1, lon1, lat2, lon2)
            if d < 0.01:
                continue
            n = max(1, int(d / KM_ENTRE_PONTOS))
            dt = t_real * (d / total_km)
            vel_efetiva = ((d / dt) * fator_vel) if dt > 0 else 0
            for k in range(n):
                f = k / n
                t_pt = t_acum + f * dt
                if t_pt > horas_max:
                    break
                registros.append({
                    "mmsi": mmsi,
                    "timestamp": (inicio + timedelta(hours=t_pt)).isoformat(),
                    "lat": round(lat1 + (lat2 - lat1) * f, 5),
                    "lon": round(lon1 + (lon2 - lon1) * f, 5),
                    "sog": round(vel_efetiva, 1),
                    "cog": 0, "heading": 0,
                    "nav_status": 0,
                    "porto_origem": seg["porto_orig"],
                    "porto_destino": seg["porto_dest"],
                    "porto_proximo": "",
                    "atraso_h": round(v["atraso_h"], 2),
                    "status": v["status"],
                })
            t_acum += dt

        dwell = v["etd_real"] - v["eta_real"]
        n_d = max(1, int(dwell))
        for k in range(n_d):
            t_pt = v["eta_real"] + k * (dwell / n_d)
            if t_pt > horas_max:
                break
            registros.append({
                "mmsi": mmsi,
                "timestamp": (inicio + timedelta(hours=t_pt)).isoformat(),
                "lat": round(coords[-1][1], 5),
                "lon": round(coords[-1][0], 5),
                "sog": 0.0, "cog": 0, "heading": 0,
                "nav_status": 5,
                "porto_origem": seg["porto_orig"],
                "porto_destino": seg["porto_dest"],
                "porto_proximo": viagens[i]["porto"],
                "atraso_h": round(v["atraso_h"], 2),
                "status": v["status"],
            })
    return registros


def gerar_alertas(mmsi, nome, viagens, inicio, perfil_nome):
    alertas = []
    status_anterior = "no_prazo"
    ORDEM = {"no_prazo": 0, "atencao": 1, "atrasado": 2}

    for v in viagens:
        status_atual = v["status"]
        if ORDEM[status_atual] > ORDEM[status_anterior]:
            sev = "critico" if status_atual == "atrasado" else "atencao"
            alertas.append({
                "mmsi": mmsi, "nome": nome,
                "tipo": "atraso",
                "severidade": sev,
                "porto": v["porto"],
                "descricao": "Entrou em '{}' ao chegar em {} (+{:.1f}h)".format(
                    status_atual, v["porto"], v["atraso_h"]),
                "timestamp": v["data_eta"],
                "atraso_h": round(v["atraso_h"], 2),
            })
        elif v["incidente"] and v["atraso_leg_h"] > 3.0:
            alertas.append({
                "mmsi": mmsi, "nome": nome,
                "tipo": "parada_nao_prevista",
                "severidade": "atencao",
                "porto": v["porto"],
                "descricao": "Incidente no trecho para {} (+{:.1f}h)".format(
                    v["porto"], v["atraso_leg_h"]),
                "timestamp": v["data_eta"],
                "atraso_h": round(v["atraso_h"], 2),
            })
        status_anterior = status_atual

    if perfil_nome == "problematica":
        alertas.append({
            "mmsi": mmsi, "nome": nome,
            "tipo": "desempenho_baixo",
            "severidade": "critico",
            "porto": "-",
            "descricao": "Embarcação com histórico recorrente de atrasos",
            "timestamp": inicio.isoformat(),
            "atraso_h": 0,
        })
    return alertas


def main():
    log("== M15 - Pipeline AIS v9 (anti-colisao) ==")

    if not ROTAS_DIR.exists():
        log("[erro] pasta {} nao existe".format(ROTAS_DIR))
        return

    arquivos = sorted(ROTAS_DIR.glob("*.geojson"))
    if not arquivos:
        log("[erro] nenhum .geojson em {}".format(ROTAS_DIR))
        return
    log("[ok] {} arquivos SIGTAQ".format(len(arquivos)))

    agora = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    inicio = agora - timedelta(days=DIAS)
    horas_max = DIAS * 24

    cadastro = []
    prog_rows = []
    viagem_rows = []
    alerta_rows = []
    posicoes = []

    for arq in arquivos:
        nome = limpar_nome(arq.stem)[:60]
        offset_h = random.uniform(0, 24)
        fator_vel = random.uniform(0.90, 1.10)
        mmsi = mmsi_de(nome)
        tipo_cod, tipo_nome = extrair_tipo(nome)
        perfil = sortear_perfil()
        perfil_nome = perfil[0]

        segments = carregar_segmentos(arq)
        if not segments:
            log("[skip] {}".format(arq.name))
            continue
        chain = encadear(segments)
        prog = gerar_programacao(chain)

        inicio_barco = inicio + timedelta(hours=offset_h)
        viagem = gerar_viagem_real(chain, prog, perfil, inicio_barco)

        cadastro.append({
            "mmsi": mmsi, "imo": "", "nome": nome,
            "tipo_codigo": tipo_cod, "tipo": tipo_nome,
            "operador": "SIGTAQ", "bandeira": "BR",
            "comprimento_m": "", "calado_m": "", "ano_construcao": "",
            "perfil": perfil_nome,
        })

        for p in prog:
            prog_rows.append({
                "mmsi": mmsi, "nome": nome,
                "ordem": p["ordem"], "porto": p["porto"],
                "eta_programada": (inicio + timedelta(hours=p["eta_prog"])).isoformat(),
                "etd_programada": (inicio + timedelta(hours=p["etd_prog"])).isoformat(),
                "duracao_trecho_h": round(p["duracao_trecho_h"], 2),
                "km": round(p["km"], 1),
                "velocidade": p["velocidade"],
                "hidrovia": p["hidrovia"],
            })

        for v in viagem:
            viagem_rows.append({
                "mmsi": mmsi, "nome": nome,
                "ordem": v["ordem"], "porto": v["porto"],
                "eta_programada": (inicio + timedelta(hours=v["eta_prog"])).isoformat(),
                "etd_programada": (inicio + timedelta(hours=v["etd_prog"])).isoformat(),
                "eta_real": v["data_eta"],
                "etd_real": v["data_etd"],
                "atraso_h": round(v["atraso_h"], 2),
                "atraso_leg_h": round(v["atraso_leg_h"], 2),
                "incidente": 1 if v["incidente"] else 0,
                "status": v["status"],
                "km": round(v["km"], 1),
                "hidrovia": v["hidrovia"],
            })

        alerta_rows.extend(gerar_alertas(mmsi, nome, viagem, inicio, perfil_nome))

        pos = gerar_posicoes(chain, viagem, mmsi, inicio_barco, horas_max, fator_vel)
        posicoes.extend(pos)

        log("[{}] {} seg | {} pts | perfil: {} | offset: {:.1f}h | atraso final: {:.1f}h".format(
            nome[:30], len(segments), len(pos), perfil_nome,
            offset_h, viagem[-1]["atraso_h"]))

    if not posicoes:
        log("[erro] nenhuma posicao gerada")
        return

    posicoes.sort(key=lambda r: (r["mmsi"], r["timestamp"]))
    por_mmsi = {}
    for r in posicoes:
        por_mmsi.setdefault(r["mmsi"], []).append(r)
    for mmsi, arr in por_mmsi.items():
        for i in range(len(arr) - 1):
            b = bearing_deg(arr[i]["lon"], arr[i]["lat"], arr[i + 1]["lon"], arr[i + 1]["lat"])
            arr[i]["cog"] = round(b, 1)
            arr[i]["heading"] = round(b, 1)

    def escrever(rows, nome):
        path = OUT_DIR / nome
        with path.open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)
        log("[ok] {}: {} registros".format(nome, len(rows)))

    escrever(cadastro, "embarcacoes_cadastro.csv")
    escrever(prog_rows, "programacao.csv")
    escrever(viagem_rows, "viagens.csv")
    if alerta_rows:
        escrever(alerta_rows, "alertas.csv")
    escrever(posicoes, "posicoes_sinteticas.csv")

    log("[fim] {} embarcacoes | {} pontos | {} viagens | {} alertas".format(
        len(cadastro), len(posicoes), len(viagem_rows), len(alerta_rows)))
# ... após gerar todas as posições (lista 'posicoes') ...

# Verificação de colisão (simplificada, para performance)
def verificar_conflitos(posicoes, distancia_min_km=2.0, intervalo_min=30):
    # Agrupa posições por timestamp (arredondado para o intervalo)
    por_tempo = {}
    for p in posicoes:
        t = p['timestamp'][:16]  # YYYY-MM-DDTHH:MM
        por_tempo.setdefault(t, []).append(p)

    conflitos = []
    for t, pontos in por_tempo.items():
        for i in range(len(pontos)):
            for j in range(i + 1, len(pontos)):
                p1, p2 = pontos[i], pontos[j]
                d = haversine_km(p1['lat'], p1['lon'], p2['lat'], p2['lon'])
                if d < distancia_min_km:
                    conflitos.append({
                        'timestamp': t,
                        'emb1': p1['mmsi'],
                        'emb2': p2['mmsi'],
                        'dist_km': round(d, 2)
                    })
    return conflitos

conflitos = verificar_conflitos(posicoes)
if conflitos:
    log(f"[warn] {len(conflitos)} conflitos de proximidade detectados.")
    for c in conflitos[:5]:  # Loga os 5 primeiros
        log(f"  {c['timestamp']} - {c['emb1']} x {c['emb2']} ({c['dist_km']} km)")
else:
    log("[ok] Nenhum conflito de proximidade detectado.")

if __name__ == "__main__":
    main()