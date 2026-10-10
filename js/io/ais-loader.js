/* ============================================================
   M15+M16 — AIS Loader
   Carrega cadastro + posições + programação + viagens + alertas + cruzamento VEN
   ============================================================ */
(function () {
  'use strict';

  const BASE = 'dados/ais/';

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
          ano_construcao: parseInt(r.ano_construcao, 10) || 0,
          perfil: r.perfil || ''
        });
      });
      return map;
    },

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
        porto_origem: r.porto_origem || '',
        porto_destino: r.porto_destino || '',
        porto_proximo: r.porto_proximo || '',
        atraso_h: parseFloat(r.atraso_h) || 0,
        status: r.status || 'no_prazo'
      })).filter(p => !isNaN(p.lat) && !isNaN(p.lon));
    },

    async carregarProgramacao() {
      const txt = await fetchTexto(BASE + 'programacao.csv');
      const rows = parseCSV(txt);
      return rows.map(r => ({
        mmsi: parseInt(r.mmsi, 10),
        nome: r.nome || '',
        ordem: parseInt(r.ordem, 10) || 0,
        porto: r.porto || '',
        eta_programada: r.eta_programada || '',
        etd_programada: r.etd_programada || '',
        duracao_trecho_h: parseFloat(r.duracao_trecho_h) || 0,
        km: parseFloat(r.km) || 0,
        velocidade: parseFloat(r.velocidade) || 0,
        hidrovia: r.hidrovia || ''
      }));
    },

    async carregarViagens() {
      const txt = await fetchTexto(BASE + 'viagens.csv');
      const rows = parseCSV(txt);
      return rows.map(r => ({
        mmsi: parseInt(r.mmsi, 10),
        nome: r.nome || '',
        ordem: parseInt(r.ordem, 10) || 0,
        porto: r.porto || '',
        eta_programada: r.eta_programada || '',
        etd_programada: r.etd_programada || '',
        eta_real: r.eta_real || '',
        etd_real: r.etd_real || '',
        atraso_h: parseFloat(r.atraso_h) || 0,
        atraso_leg_h: parseFloat(r.atraso_leg_h) || 0,
        incidente: r.incidente === '1',
        status: r.status || 'no_prazo',
        km: parseFloat(r.km) || 0,
        hidrovia: r.hidrovia || ''
      }));
    },

    async carregarAlertas() {
      const txt = await fetchTexto(BASE + 'alertas.csv');
      const rows = parseCSV(txt);
      return rows.map(r => ({
        mmsi: parseInt(r.mmsi, 10),
        nome: r.nome || '',
        tipo: r.tipo || '',
        severidade: r.severidade || 'atencao',
        porto: r.porto || '',
        descricao: r.descricao || '',
        timestamp: r.timestamp || '',
        atraso_h: parseFloat(r.atraso_h) || 0
      }));
    },

    /* ============================================================
       M16 — Cruzamento AIS × VEN
       ============================================================ */
    async carregarCruzamento() {
      const txt = await fetchTexto(BASE + 'cruzamento_ven.csv');
      const rows = parseCSV(txt);
      return rows.map(r => ({
        mmsi: parseInt(r.mmsi, 10),
        timestamp: r.timestamp,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        trecho_ven: this._limparNome(r.trecho_ven),
        dist_ven_km: parseFloat(r.distancia_km) || 0,
        classificacao: r.classificacao || 'dentro'
      })).filter(r => !isNaN(r.lat) && !isNaN(r.lon));
    },

    _limparNome(s) {
      if (!s) return '';
      // Corrige U+FFFD (encoding quebrado) nos nomes de hidrovias
      return String(s)
        .replace(/Solim\uFFFDes/g, 'Solimões')
        .replace(/Tapaj\uFFFDFs/g, 'Tapajós')
        .replace(/Tocantins-Araguaia/g, 'Tocantins-Araguaia')
        .replace(/\uFFFD/g, '')
        .trim();
    },

    async carregarManifest() {
      const res = await fetch(BASE + 'manifest_ais.json?t=' + Date.now());
      if (!res.ok) throw new Error('Falha ao ler manifest_ais.json');
      return res.json();
    }
  };

  window.AISLoader = AISLoader;
})();