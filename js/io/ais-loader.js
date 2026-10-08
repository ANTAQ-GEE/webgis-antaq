/* ============================================================
   M14 — AIS Loader
   Carrega CSVs sintéticos (cadastro + posições)
   ============================================================ */
(function () {
  'use strict';

  const BASE = 'dados/ais/';

  /**
   * Parser CSV simples (suporta aspas duplas opcionais).
   * Nosso CSV não tem vírgulas nos campos, então é seguro.
   */
  function parseCSV(texto) {
    const linhas = texto.replace(/\r/g, '').split('\n').filter(l => l.trim());
    if (!linhas.length) return [];
    const header = linhas[0].split(',').map(h => h.trim());
    const out = [];
    for (let i = 1; i < linhas.length; i++) {
      const cols = linhas[i].split(',');
      const obj = {};
      header.forEach((h, j) => { obj[h] = (cols[j] ?? '').trim(); });
      out.push(obj);
    }
    return out;
  }

  async function fetchTexto(url) {
    const res = await fetch(url + '?t=' + Date.now());
    if (!res.ok) throw new Error('Falha ao buscar ' + url + ' (' + res.status + ')');
    return res.text();
  }

  const AISLoader = {
    /** Carrega cadastro e retorna Map(mmsi → objeto). */
    async carregarCadastro() {
      const txt = await fetchTexto(BASE + 'embarcacoes_cadastro.csv');
      const rows = parseCSV(txt);
      const map = new Map();
      rows.forEach(r => {
        const mmsi = parseInt(r.mmsi, 10);
        if (!mmsi) return;
        map.set(mmsi, {
          mmsi,
          imo: r.imo || '',
          nome: r.nome || '',
          tipo_codigo: parseInt(r.tipo_codigo, 10) || 0,
          tipo: r.tipo || 'Desconhecido',
          operador: r.operador || '',
          bandeira: r.bandeira || '',
          comprimento_m: parseFloat(r.comprimento_m) || 0,
          calado_m: parseFloat(r.calado_m) || 0,
          ano_construcao: parseInt(r.ano_construcao, 10) || 0
        });
      });
      return map;
    },

    /** Carrega posições e retorna array de objetos. */
    async carregarPosicoes() {
      const txt = await fetchTexto(BASE + 'posicoes_sinteticas.csv');
      const rows = parseCSV(txt);
      return rows.map(r => ({
        mmsi: parseInt(r.mmsi, 10),
        timestamp: r.timestamp,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        sog: parseFloat(r.sog),
        cog: parseFloat(r.cog),
        heading: parseFloat(r.heading),
        nav_status: parseInt(r.nav_status, 10) || 0,
        rota: r.rota || ''
      })).filter(p => !isNaN(p.lat) && !isNaN(p.lon));
    },

    /** Carrega manifest AIS. */
    async carregarManifest() {
      const res = await fetch(BASE + 'manifest_ais.json?t=' + Date.now());
      if (!res.ok) throw new Error('Falha ao ler manifest_ais.json');
      return res.json();
    }
  };

  window.AISLoader = AISLoader;
})();