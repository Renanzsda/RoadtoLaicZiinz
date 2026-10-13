// Modelo e validação independentes da interface. Compatível com navegador e Node.js.
(function (root) {
  'use strict';
  const formats = new Set(['BO1', 'BO3']);
  const units = new Set(['game', 'match']);
  const states = new Set(['preliminar', 'verificado', 'incompleto']);
  const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const string = x => typeof x === 'string' && x.trim().length > 0;
  const count = x => x === null || (Number.isSafeInteger(x) && x >= 0);
  const url = x => { try { return new URL(x).protocol === 'https:'; } catch { return false; } };
  const fail = message => { throw new Error(message); };

  function migrateV1(data) {
    if (!object(data) || !['tournaments', 'results', 'matchups', 'training'].every(k => Array.isArray(data[k]))) fail('Backup V1 inválido');
    if (data.version === 2) return structuredClone(data);
    if (data.version != null && data.version !== 1) fail('Versão de backup desconhecida');
    const next = structuredClone(data);
    next.version = 2;
    next.tournaments = next.tournaments.map(t => ({ ...t, sourceUrl: t.sourceUrl || t.url || null }));
    next.results = next.results.map(r => ({ ...r, players: r.players ?? null, day2: r.day2 ?? null, wins: r.wins ?? null, losses: r.losses ?? null, draws: r.draws ?? null, winRateReported: r.winRateReported ?? null, sourceUrl: r.sourceUrl || null, status: r.status || 'preliminar', unit: r.unit || null }));
    next.matchups = next.matchups.map(m => ({ ...m, sourceUrl: m.sourceUrl || null, status: m.status || 'preliminar', unit: m.unit || null }));
    return next;
  }

  function validateBackup(data) {
    const next = migrateV1(data);
    if (!next.tournaments.every(t => object(t) && string(t.id) && string(t.name) && string(t.region) && string(t.format))) fail('Torneio inválido no backup');
    const ids = new Set(next.tournaments.map(t => t.id));
    if (ids.size !== next.tournaments.length) fail('Torneio duplicado no backup');
    if (!next.results.every(r => object(r) && ids.has(r.tournamentId) && string(r.deck) && count(r.players) && count(r.day2) && count(r.wins) && count(r.losses) && count(r.draws))) fail('Resultado inválido no backup');
    if (!next.matchups.every(m => object(m) && ids.has(m.tournamentId) && string(m.deck) && string(m.opponent) && count(m.wins) && count(m.losses) && count(m.draws))) fail('Matchup inválido no backup');
    if (!next.training.every(t => object(t) && string(t.id) && string(t.player))) fail('Treino inválido no backup');
    return next;
  }

  function validateSource(document) {
    if (!object(document) || document.schemaVersion !== 2 || !Array.isArray(document.tournaments) || !Array.isArray(document.results) || !Array.isArray(document.matchups)) fail('Arquivo de fonte V2 inválido');
    const ids = new Set();
    for (const t of document.tournaments) {
      if (!object(t) || !string(t.id) || ids.has(t.id) || !string(t.name) || !string(t.region) || !formats.has(t.format) || !/^\d{4}-\d{2}-\d{2}$/.test(t.date) || !count(t.players) || !url(t.sourceUrl) || !states.has(t.status)) fail('Torneio da fonte inválido ou duplicado');
      ids.add(t.id);
    }
    const resultKeys = new Set();
    for (const r of document.results) {
      if (!object(r)) fail('Resultado da fonte inválido');
      const key = `${r.tournamentId}\u0000${r.deck}`;
      if (!ids.has(r.tournamentId) || !string(r.deck) || resultKeys.has(key) || !count(r.players) || !count(r.day2) || (r.topCut !== undefined && !count(r.topCut)) || (r.players !== null && r.day2 !== null && r.day2 > r.players) || (r.players !== null && r.topCut != null && r.topCut > r.players) || !count(r.wins) || !count(r.losses) || !count(r.draws) || !units.has(r.unit) || !url(r.sourceUrl) || !/^\d{4}-\d{2}-\d{2}T/.test(r.retrievedAt) || !states.has(r.status) || (r.winRateReported != null && (!Number.isFinite(r.winRateReported) || r.winRateReported < 0 || r.winRateReported > 100 || !string(r.metricDefinition))) || ([r.wins, r.losses, r.draws].filter(x => x !== null).length % 3 !== 0)) fail('Resultado da fonte inválido ou duplicado');
      resultKeys.add(key);
    }
    const matchupKeys = new Set();
    for (const m of document.matchups) {
      if (!object(m)) fail('Matchup da fonte inválido');
      const key = [m.tournamentId, ...[m.deck, m.opponent].sort(), m.unit].join('\u0000');
      if (!ids.has(m.tournamentId) || !string(m.deck) || !string(m.opponent) || m.deck === m.opponent || matchupKeys.has(key) || ![m.wins,m.losses,m.draws].every(x => Number.isSafeInteger(x) && x >= 0) || m.wins + m.losses + m.draws === 0 || !units.has(m.unit) || !url(m.sourceUrl) || !/^\d{4}-\d{2}-\d{2}T/.test(m.retrievedAt) || !states.has(m.status)) fail('Matchup da fonte inválido ou duplicado');
      matchupKeys.add(key);
    }
    return structuredClone(document);
  }

  function mergeSource(database, document) {
    const incoming = validateSource(document);
    const next = validateBackup(database);
    const known = new Map(next.tournaments.map(t => [t.id, t]));
    const officialRefresh = (old, row) =>
      old?.status === 'verificado' &&
      typeof old.sourceUrl === 'string' && old.sourceUrl.startsWith('https://labs.limitlesstcg.com/') &&
      typeof row.sourceUrl === 'string' && row.sourceUrl.startsWith('https://labs.limitlesstcg.com/') &&
      old.tournamentId === row.tournamentId && old.sourceUrl.includes(`/${row.tournamentId}/`) && row.sourceUrl.includes(`/${row.tournamentId}/`) &&
      typeof old.retrievedAt === 'string' && typeof row.retrievedAt === 'string' &&
      Date.parse(row.retrievedAt) > Date.parse(old.retrievedAt);
    for (const t of incoming.tournaments) {
      const old = known.get(t.id);
      if (old && old.name !== t.name && old.status !== 'incompleto') fail(`ID de torneio em conflito: ${t.id}`);
      if (old) Object.assign(old, t, { url: t.sourceUrl });
      else next.tournaments.push({ ...t, url: t.sourceUrl });
    }
    for (const r of incoming.results) {
      const index = next.results.findIndex(x => x.tournamentId === r.tournamentId && x.deck === r.deck);
      if (index >= 0 && next.results[index].status === 'verificado' && JSON.stringify(next.results[index]) !== JSON.stringify(r) && !officialRefresh(next.results[index], r)) fail(`Resultado verificado já existente: ${r.deck}`);
      if (index >= 0) next.results[index] = r;
      else next.results.push(r);
    }
    for (const m of incoming.matchups) {
      const existing = next.matchups.find(x => x.tournamentId === m.tournamentId && x.unit === m.unit && ((x.deck === m.deck && x.opponent === m.opponent) || (x.deck === m.opponent && x.opponent === m.deck)));
      if (existing && JSON.stringify(existing) !== JSON.stringify(m)) {
        if (!officialRefresh(existing, m)) fail(`Matchup já existente: ${m.deck} / ${m.opponent}`);
        next.matchups[next.matchups.indexOf(existing)] = m;
        continue;
      }
      if (existing) continue;
      next.matchups.push(m);
    }
    return next;
  }

  const api = { migrateV1, validateBackup, validateSource, mergeSource };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DataCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
