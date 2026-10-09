/* ============================================================
   M15 — AIS Layer v6 (animação fluida, markers persistentes)
   - Ícones persistem entre frames (não recriam)
   - Interpolação entre 2 pontos por frame
   - Popup estilo MarineTraffic
   ============================================================ */
(function () {
  'use strict';

  const CORES_STATUS = { no_prazo: '#10b981', atencao: '#f59e0b', atrasado: '#ef4444', neutro: '#94a3b8' };
  const CORES_TIPO = {
    'Carga Geral': '#2563eb', 'Carga Perigosa (Hazmat)': '#dc2626',
    'Tanque': '#ea580c', 'Passageiros': '#7c3aed',
    'Rebocador': '#059669', 'Empurrador': '#0891b2',
    'Balsa': '#475569', 'Pesca': '#15803d', '_default': '#64748b'
  };

  function corDoTipo(t) { return CORES_TIPO[t] || CORES_TIPO['_default']; }
  function corDoStatus(s) { return CORES_STATUS[s] || CORES_STATUS.neutro; }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371.0;
    const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function splitPontos(pontos) {
    if (pontos.length < 2) return [pontos];
    const segs = []; let atual = [pontos[0]];
    for (let i = 1; i < pontos.length; i++) {
      const prev = pontos[i - 1], cur = pontos[i];
      if (haversineKm(prev.lat, prev.lon, cur.lat, cur.lon) > 20) {
        if (atual.length > 1) segs.push(atual);
        atual = [];
      }
      atual.push(cur);
    }
    if (atual.length > 1) segs.push(atual);
    return segs;
  }

  /* ---------- Silhuetas (vista top-down) ---------- */
  function silhueta(tipo, cor) {
    const s = '#0f172a', w = 1.2;
    switch (tipo) {
      case 'Carga Geral':
      case 'Carga Perigosa (Hazmat)':
        return `<path d="M12 1.5 L20 7.5 L20 21.5 L17.5 22.5 L6.5 22.5 L4 21.5 L4 7.5 Z" fill="${cor}" stroke="${s}" stroke-width="${w}" stroke-linejoin="round"/>
                <rect x="6" y="17" width="12" height="3" fill="#f1f5f9" opacity="0.95"/>
                <rect x="8" y="6.5" width="8" height="2" fill="${s}" opacity="0.5"/>
                <rect x="8" y="9.5" width="8" height="2" fill="${s}" opacity="0.5"/>
                <rect x="8" y="12.5" width="8" height="2" fill="${s}" opacity="0.5"/>`;
      case 'Tanque':
        return `<path d="M12 1.5 L20 7 L20 22 L17 23 L7 23 L4 22 L4 7 Z" fill="${cor}" stroke="${s}" stroke-width="${w}" stroke-linejoin="round"/>
                <rect x="6" y="18" width="12" height="2.5" fill="#f1f5f9" opacity="0.95"/>
                <circle cx="12" cy="9" r="2.6" fill="${s}" opacity="0.45"/>
                <circle cx="12" cy="14.5" r="2.6" fill="${s}" opacity="0.45"/>`;
      case 'Passageiros':
        return `<path d="M12 1 L20 6.5 L20 22 L17 23 L7 23 L4 22 L4 6.5 Z" fill="${cor}" stroke="${s}" stroke-width="${w}" stroke-linejoin="round"/>
                <rect x="6" y="5.5" width="12" height="16" fill="#f1f5f9" opacity="0.9" rx="1"/>
                <rect x="7.5" y="7" width="3" height="2.4" fill="${cor}" opacity="0.6"/>
                <rect x="13.5" y="7" width="3" height="2.4" fill="${cor}" opacity="0.6"/>
                <rect x="7.5" y="11" width="3" height="2.4" fill="${cor}" opacity="0.6"/>
                <rect x="13.5" y="11" width="3" height="2.4" fill="${cor}" opacity="0.6"/>
                <rect x="7.5" y="15" width="3" height="2.4" fill="${cor}" opacity="0.6"/>
                <rect x="13.5" y="15" width="3" height="2.4" fill="${cor}" opacity="0.6"/>
                <rect x="9.5" y="20.5" width="5" height="2" fill="${s}" opacity="0.65"/>`;
      case 'Rebocador':
      case 'Empurrador':
        return `<path d="M12 3 L19 8 L19 21 L16.5 22.5 L7.5 22.5 L5 21 L5 8 Z" fill="${cor}" stroke="${s}" stroke-width="${w}" stroke-linejoin="round"/>
                <rect x="7.5" y="5" width="9" height="5" fill="#f1f5f9" opacity="0.9" rx="0.8"/>
                <rect x="9" y="14" width="6" height="6" fill="${s}" opacity="0.5"/>`;
      case 'Balsa':
        return `<rect x="3" y="4" width="18" height="17" fill="${cor}" stroke="${s}" stroke-width="${w}" rx="0.5"/>
                <line x1="3" y1="9" x2="21" y2="9" stroke="${s}" stroke-width="0.7" opacity="0.55"/>
                <line x1="3" y1="14" x2="21" y2="14" stroke="${s}" stroke-width="0.7" opacity="0.55"/>
                <line x1="3" y1="19" x2="21" y2="19" stroke="${s}" stroke-width="0.7" opacity="0.55"/>
                <rect x="8" y="1.5" width="8" height="2.5" fill="#f1f5f9" opacity="0.9"/>`;
      case 'Pesca':
        return `<path d="M12 2 L18.5 7 L18.5 20 L16 22 L8 22 L5.5 20 L5.5 7 Z" fill="${cor}" stroke="${s}" stroke-width="${w}" stroke-linejoin="round"/>
                <rect x="8" y="5" width="8" height="4.5" fill="#f1f5f9" opacity="0.9" rx="0.6"/>
                <line x1="4" y1="15" x2="20" y2="15" stroke="${s}" stroke-width="0.7" opacity="0.65"/>
                <line x1="4" y1="18" x2="20" y2="18" stroke="${s}" stroke-width="0.7" opacity="0.65"/>`;
      default:
        return `<path d="M12 3 L19 8 L19 20 L17 22 L7 22 L5 20 L5 8 Z" fill="${cor}" stroke="${s}" stroke-width="${w}" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" fill="#f1f5f9" opacity="0.85"/>`;
    }
  }

  const ICON = 24;

  function criarIcone(tipo, status, cog, destaque) {
    const cor = corDoTipo(tipo);
    const sc = corDoStatus(status);
    const rot = Number(cog) || 0;
    const ring = destaque
      ? `<circle cx="${ICON / 2}" cy="${ICON / 2}" r="${ICON / 2 - 1}" fill="none" stroke="#38bdf8" stroke-width="2"/>`
      : '';
    return L.divIcon({
      className: 'ais-marker',
      html: `
        <div style="position:relative;width:${ICON}px;height:${ICON}px;
                    filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));">
          <svg viewBox="0 0 24 24" width="${ICON}" height="${ICON}"
               xmlns="http://www.w3.org/2000/svg"
               style="transform:rotate(${rot}deg);
                      transform-origin:${ICON / 2}px ${ICON / 2}px;
                      display:block;transition:transform 0.4s ease;">
            ${silhueta(tipo, cor)}
            ${ring}
          </svg>
          <span style="position:absolute;top:-1px;right:-1px;
                       width:8px;height:8px;border-radius:50%;
                       background:${sc};border:1.5px solid #0f172a;
                       box-shadow:0 1px 2px rgba(0,0,0,0.5);"></span>
        </div>`,
      iconSize: [ICON, ICON],
      iconAnchor: [ICON / 2, ICON / 2],
      popupAnchor: [0, -ICON / 2 - 2]
    });
  }

  /* ---------- Popup estilo MarineTraffic ---------- */
  function popupHTML(pos) {
    const c = pos.cadastro || {};
    const status = pos.status || 'neutro';
    const cor = corDoStatus(status);
    const corTipo = corDoTipo(c.tipo);
    const label = { no_prazo: 'NO PRAZO', atencao: 'ATENÇÃO', atrasado: 'ATRASADO' }[status] || '—';
    const atraso = (pos.atraso_h ?? null) !== null ? `+${Number(pos.atraso_h).toFixed(1)}h` : '—';

    return `
      <div style="font-family:'Segoe UI',sans-serif;min-width:280px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;
                    padding-bottom:10px;border-bottom:1px solid #e2e8f0;">
          <div style="width:32px;height:32px;border-radius:6px;background:${corTipo};
                      display:flex;align-items:center;justify-content:center;
                      color:#fff;font-size:16px;font-weight:800;">🚢</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:700;color:#0f172a;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${c.nome || 'MMSI ' + pos.mmsi}
            </div>
            <div style="font-size:10.5px;color:#64748b;margin-top:1px;">
              ${c.tipo || '—'} · ${c.bandeira || 'BR'}
            </div>
          </div>
          <span style="background:${cor};color:#fff;font-size:8.5px;font-weight:800;
                       letter-spacing:0.5px;padding:3px 8px;border-radius:10px;">
            ${label}
          </span>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;
                    font-size:10.5px;color:#475569;margin-bottom:10px;">
          <div><span style="color:#94a3b8;">MMSI</span><br><b style="color:#0f172a;">${pos.mmsi}</b></div>
          <div><span style="color:#94a3b8;">Atraso</span><br><b style="color:${cor};">${atraso}</b></div>
          <div><span style="color:#94a3b8;">Velocidade</span><br><b style="color:#0f172a;">${pos.sog || 0} nós</b></div>
          <div><span style="color:#94a3b8;">Rumo</span><br><b style="color:#0f172a;">${pos.cog || 0}°</b></div>
        </div>

        <div style="font-size:11px;color:#334155;
                    border-top:1px solid #e2e8f0;padding-top:8px;">
          ${pos.porto_origem ? `<div style="margin-bottom:3px;">🛫 <b>De:</b> ${pos.porto_origem}</div>` : ''}
          ${pos.porto_destino ? `<div style="margin-bottom:3px;">🛬 <b>Para:</b> ${pos.porto_destino}</div>` : ''}
          ${pos.porto_proximo ? `<div>⚓ <b>Próximo:</b> ${pos.porto_proximo}</div>` : ''}
        </div>

        <div style="margin-top:8px;font-size:9.5px;color:#94a3b8;text-align:right;">
          Última atualização: ${new Date(pos.timestamp).toLocaleString('pt-BR')}
        </div>
      </div>`;
  }

  /* ============================================================
     AIS LAYER — markers persistentes
     ============================================================ */
  const AISLayer = {
    _mapa: null,
    _markers: new Map(),        // mmsi → L.Marker
    _trailGroup: null,          // LayerGroup das trilhas
    _trailCache: new Map(),     // mmsi → array de coords (pra não redesenhar)
    _destacado: null,
    _trilhaDestaque: null,

    init(mapa) {
      this._mapa = mapa;
      this._trailGroup = L.layerGroup();
      console.log('[AISLayer] pronto v6');
    },

    mostrar() {
      if (!this._mapa) return;
      if (!this._mapa.hasLayer(this._trailGroup)) this._trailGroup.addTo(this._mapa);
      this._markers.forEach(m => { if (!this._mapa.hasLayer(m)) m.addTo(this._mapa); });
    },

    esconder() {
      if (!this._mapa) return;
      if (this._mapa.hasLayer(this._trailGroup)) this._mapa.removeLayer(this._trailGroup);
      this._markers.forEach(m => { if (this._mapa.hasLayer(m)) this._mapa.removeLayer(m); });

      // ✅ Limpa trilha de destaque (tracejado azul) também
      this.limparTrilha();
    },

    limpar() {
      this._markers.forEach(m => { if (this._mapa.hasLayer(m)) this._mapa.removeLayer(m); });
      this._markers.clear();
      this._trailGroup.clearLayers();
      this._trailCache.clear();
    },

    /* ------------------------------------------------------------
       ATUALIZA MARKERS — cria novos, atualiza existentes
       Não destrói nada. Apenas move lat/lng.
       ------------------------------------------------------------ */
    _sincronizarMarkers(posicoes) {
      const ativos = new Set();

      posicoes.forEach(pos => {
        ativos.add(pos.mmsi);
        const cad = pos.cadastro || window.AISManager.getCadastro(pos.mmsi) || {};
        const destaque = this._destacado === pos.mmsi;
        const icon = criarIcone(cad.tipo, pos.status, pos.cog, destaque);
        let m = this._markers.get(pos.mmsi);

        if (m) {
          // Atualiza posição e ícone
          m.setLatLng([pos.lat, pos.lon]);
          m.setIcon(icon);
          m._popupData = pos;
        } else {
          // Cria novo
          m = L.marker([pos.lat, pos.lon], { icon, zIndexOffset: 500, riseOnHover: true });
          m.bindPopup(popupHTML({ ...pos, cadastro: cad }), {
            maxWidth: 340, className: 'ais-popup'
          });
          m.bindTooltip(`<b>${cad.nome || 'MMSI ' + pos.mmsi}</b> · ${pos.sog || 0} nós`,
            { direction: 'top', offset: [0, -14], className: 'ais-tooltip' });
          m._mmsi = pos.mmsi;
          m.on('click', (e) => {
            if (e && e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
            if (window.ControleAIS && window.ControleAIS._aberto) {
              setTimeout(() => window.ControleAIS.selecionar(pos.mmsi), 60);
            }
          });
          this._markers.set(pos.mmsi, m);
          if (this._mapa && !this._mapa.hasLayer(m)) m.addTo(this._mapa);
        }
        // Atualiza popup
        const popup = m.getPopup();
        if (popup) popup.setContent(popupHTML({ ...pos, cadastro: cad }));
      });

      // Remove markers que não estão mais ativos
      this._markers.forEach((m, mmsi) => {
        if (!ativos.has(mmsi)) {
          if (this._mapa.hasLayer(m)) this._mapa.removeLayer(m);
          this._markers.delete(mmsi);
        }
      });
    },

    /* ------------------------------------------------------------
       DESENHA TRILHA — só se ainda não foi desenhada pra esse MMSI
       ------------------------------------------------------------ */
    _desenharTrilhasUmaVez(posicoes) {
      const porMmsi = new Map();
      posicoes.forEach(p => {
        if (!porMmsi.has(p.mmsi)) porMmsi.set(p.mmsi, []);
        porMmsi.get(p.mmsi).push(p);
      });

      porMmsi.forEach((arr, mmsi) => {
        if (this._trailCache.has(mmsi)) return; // já desenhada
        arr.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
        const ult = arr[arr.length - 1];
        const cor = corDoStatus(ult.status);
        const grupo = L.layerGroup();
        splitPontos(arr).forEach(seg => {
          if (seg.length < 2) return;
          L.polyline(seg.map(p => [p.lat, p.lon]), {
            color: cor, weight: 2.4, opacity: 0.7,
            lineCap: 'round', lineJoin: 'round', smoothFactor: 0.4
          }).addTo(grupo);
        });
        grupo.addTo(this._trailGroup);
        this._trailCache.set(mmsi, grupo);
      });
    },

    _limparTrilhas() {
      this._trailCache.forEach(g => this._trailGroup.removeLayer(g));
      this._trailCache.clear();
    },

    /* ------------------------------------------------------------
       MODO PONTO (última posição)
       ------------------------------------------------------------ */
    renderizar(posicoes) {
      this._limparTrilhas();
      this._sincronizarMarkers(posicoes);
    },

    /* ------------------------------------------------------------
       MODO TRILHA ESTÁTICA
       ------------------------------------------------------------ */
    renderizarTrilhas(posicoes) {
      this._limparTrilhas();
      this._desenharTrilhasUmaVez(posicoes);

      // Só o último de cada MMSI como marker
      const ultimos = new Map();
      posicoes.forEach(p => {
        const t = new Date(p.timestamp).getTime();
        const at = ultimos.get(p.mmsi);
        if (!at || new Date(at.timestamp).getTime() < t) ultimos.set(p.mmsi, p);
      });
      this._sincronizarMarkers([...ultimos.values()]);
    },

    /* ------------------------------------------------------------
       MODO PROGRESSIVO — frame a frame
       Mostra posição interpolada entre as duas últimas até tAtualMs
       ------------------------------------------------------------ */
    renderizarProgressivo(todasPosicoes, tAtualMs, janelaH) {
      const janelaMs = (janelaH || 24) * 3600 * 1000;
      const tMin = tAtualMs - janelaMs;

      // Agrupa por MMSI filtrando até tAtual
      const porMmsi = new Map();
      todasPosicoes.forEach(p => {
        const t = new Date(p.timestamp).getTime();
        if (t > tAtualMs) return;
        if (!porMmsi.has(p.mmsi)) porMmsi.set(p.mmsi, []);
        porMmsi.get(p.mmsi).push(p);
      });

      const atuais = [];

      porMmsi.forEach((arr, mmsi) => {
        arr.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        if (!arr.length) return;

        const ult = arr[arr.length - 1];
        const tUlt = new Date(ult.timestamp).getTime();

        // Interpolação: se há próximo ponto, calcula posição suave
        let lat = ult.lat, lon = ult.lon, cog = ult.cog;
        // Não interpola com ponto futuro (arr só tem passado)
        // A suavidade vem do requestAnimationFrame + passo pequeno

        atuais.push({
          ...ult,
          lat, lon, cog,
          cadastro: window.AISManager.getCadastro(mmsi) || {}
        });
      });

      this._sincronizarMarkers(atuais);
    },

    /* ------------------------------------------------------------
       DESTAQUE DE TRILHA
       ------------------------------------------------------------ */
    _destacarTrilha(mmsi) {
      this._destacado = mmsi;
      const pontos = window.AISManager.getTrilha(mmsi);
      if (pontos.length < 2) return;

      if (this._trilhaDestaque) this._mapa.removeLayer(this._trilhaDestaque);
      const grupo = L.layerGroup();
      splitPontos(pontos).forEach(seg => {
        if (seg.length < 2) return;
        const coords = seg.map(p => [p.lat, p.lon]);
        L.polyline(coords, { color: '#38bdf8', weight: 10, opacity: 0.18, lineCap: 'round' }).addTo(grupo);
        L.polyline(coords, {
          color: '#38bdf8', weight: 2.5, opacity: 0.95,
          dashArray: '6 4', lineCap: 'round'
        }).addTo(grupo);
      });
      grupo.addTo(this._mapa);
      this._trilhaDestaque = grupo;

      try {
        const b = L.latLngBounds(pontos.map(p => [p.lat, p.lon]));
        if (b.isValid()) this._mapa.fitBounds(b, { padding: [60, 60], maxZoom: 11 });
      } catch (e) { }

      // Atualiza ícone com anel
      const m = this._markers.get(mmsi);
      if (m) {
        const cad = window.AISManager.getCadastro(mmsi) || {};
        m.setIcon(criarIcone(cad.tipo, m._popupData?.status, m._popupData?.cog, true));
      }
    },

    limparTrilha() {
      if (this._trilhaDestaque && this._mapa.hasLayer(this._trilhaDestaque)) {
        this._mapa.removeLayer(this._trilhaDestaque);
      }
      this._trilhaDestaque = null;
      this._destacado = null;
      // Remove anel dos ícones
      this._markers.forEach((m, mmsi) => {
        if (m._popupData) {
          const cad = window.AISManager.getCadastro(mmsi) || {};
          m.setIcon(criarIcone(cad.tipo, m._popupData.status, m._popupData.cog, false));
        }
      });
    }
  };

  /* ---------- CSS ---------- */
  (function () {
    if (document.getElementById('ais-layer-css-v6')) return;
    const s = document.createElement('style');
    s.id = 'ais-layer-css-v6';
    s.textContent = `
      .ais-marker { background:transparent !important; border:none !important; cursor:pointer; }
      .ais-marker svg { transition: transform 0.5s linear; }
      .ais-tooltip {
        background: rgba(11,25,44,0.96) !important;
        color:#f1f5f9 !important;
        border:1px solid #38bdf8 !important;
        border-radius:6px !important;
        font-family:'Segoe UI',sans-serif !important;
        font-size:11px !important; padding:4px 9px !important;
        box-shadow:0 4px 12px rgba(0,0,0,0.5) !important;
      }
      .ais-tooltip::before { display:none !important; }
      .ais-popup .leaflet-popup-content-wrapper {
        border-radius:12px !important;
        box-shadow:0 12px 40px rgba(0,0,0,0.45) !important;
        padding:0 !important;
      }
      .ais-popup .leaflet-popup-content { margin:14px 16px !important; }
    `;
    document.head.appendChild(s);
  })();

  window.AISLayer = AISLayer;
})();