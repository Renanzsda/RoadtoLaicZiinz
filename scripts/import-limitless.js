#!/usr/bin/env node
'use strict';

// Only public, rendered Labs pages are fetched. Their embedded SvelteKit JSON is
// read from the HTML; the private-looking hydration endpoints are never called.
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const cheerio = require('cheerio');
const { validateSource } = require('../data-core.js');

const IDS = ['0072', '0073', '0074', '0075', '0076'];
const BASE = 'https://labs.limitlesstcg.com';
const METRIC = 'Win % publicado pelo Limitless Labs: 100 × (W + T/3) / (W + L + T), séries MD3, arredondado a duas casas';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const execFileAsync = promisify(execFile);
const iso = () => new Date().toISOString();
const fullUrl = route => new URL(route, BASE).href;

function hydrated(html, fragment) {
  const $ = cheerio.load(html);
  for (const script of $('script[data-sveltekit-fetched]').toArray()) {
    const endpoint = $(script).attr('data-url') || '';
    if (!endpoint.includes(fragment)) continue;
    const envelope = JSON.parse($(script).html());
    if (envelope.status !== 200) throw Error(`Resposta embutida HTTP ${envelope.status}: ${fragment}`);
    const body = JSON.parse(envelope.body);
    if (!body.ok || body.message == null) throw Error(`Dados embutidos indisponíveis: ${fragment}`);
    return body.message;
  }
  throw Error(`Dados embutidos não encontrados: ${fragment}`);
}

function validCounts(row, fields = ['wins', 'losses', 'ties']) {
  if (!fields.every(key => Number.isSafeInteger(row[key]) && row[key] >= 0)) throw Error(`Contagens inválidas: ${JSON.stringify(row).slice(0, 100)}`);
}

function parseDecks(html, id, retrievedAt) {
  const rows = hydrated(html, '/labs/data/tcg/decks?');
  if (!Array.isArray(rows) || !rows.length) throw Error(`Nenhum arquétipo no evento ${id}`);
  const names = new Set(), slugs = new Set();
  return rows.map(row => {
    if (!row.name || !row.identifier || names.has(row.name) || slugs.has(row.identifier)) throw Error(`Arquétipo duplicado ou sem identificador em ${id}`);
    names.add(row.name); slugs.add(row.identifier);
    validCounts(row);
    if (!Number.isSafeInteger(row.players) || row.players < 1 || !Number.isSafeInteger(row.day2s) || row.day2s < 0 || row.day2s > row.players) throw Error(`Jogadores/Dia 2 inválidos: ${row.name}`);
    const total = row.wins + row.losses + row.ties;
    const rate = total ? Math.round(10000 * (row.wins + row.ties / 3) / total) / 100 : null;
    return {
      tournamentId: id, deck: row.name, variantId: row.identifier,
      family: row.sup_name || null, players: row.players, day2: row.day2s,
      wins: row.wins, losses: row.losses, draws: row.ties,
      winRateReported: rate, metricDefinition: METRIC, unit: 'match',
      sourceUrl: fullUrl(`/${id}/decks`), conversionSourceUrl: fullUrl(`/${id}/decks?conversion`),
      retrievedAt, status: 'verificado'
    };
  });
}

function parsePublishedDeckTable(html) {
  const $ = cheerio.load(html), out = new Map();
  $('table.data-table tbody tr').each((_, tr) => {
    const cells = $(tr).children('td');
    if (cells.length < 6) return;
    const name = $(cells[2]).text().trim();
    const reported = $(cells[5]).text().trim();
    if (name && /^\d+(?:\.\d+)?%$/.test(reported)) out.set(name, Number.parseFloat(reported));
  });
  return out;
}

function parseConversion(html) {
  const $ = cheerio.load(html), out = new Map();
  $('table.data-table tbody tr').each((_, tr) => {
    const cells = $(tr).children('td');
    if (cells.length < 5) return;
    const name = $(cells[1]).text().trim();
    const day1 = Number($(cells[2]).text().trim());
    const day2 = Number($(cells[3]).text().trim());
    if (name && Number.isSafeInteger(day1) && Number.isSafeInteger(day2)) out.set(name, { day1, day2 });
  });
  return out;
}

function parseStandings(html, id, retrievedAt) {
  const rows = hydrated(html, '/labs/data/tcg/standings?');
  if (!Array.isArray(rows) || !rows.length) throw Error(`Classificação vazia em ${id}`);
  const positions = new Set();
  const players = rows.map(row => {
    if ((row.placement !== null && (!Number.isSafeInteger(row.placement) || row.placement < 1 || positions.has(row.placement))) || !row.name || row.tp_id == null) throw Error(`Classificação inválida ou duplicada em ${id}`);
    if (row.placement !== null) positions.add(row.placement);
    validCounts(row);
    return {
      tournamentId: id, playerId: String(row.tp_id), name: row.name,
      country: row.country || null, placement: row.placement, points: row.points,
      deck: row.deck_name || null, variantId: row.deck_id || null,
      wins: row.wins, losses: row.losses, draws: row.ties,
      day2: row.day2 === 1, topCut: row.topcut === 1,
      decklistUrl: row.decklist === 1 ? fullUrl(`/${id}/player/${row.tp_id}/decklist`) : null,
      sourceUrl: fullUrl(`/${id}/standings`), retrievedAt
    };
  });
  return players;
}

function parseMatchups(html, id, deck, retrievedAt) {
  const data = hydrated(html, '/labs/data/tcg/matchups?');
  if (!data || !Array.isArray(data.decks) || !data.procedural || !data.unknown) throw Error(`Confrontos ausentes: ${id}/${deck.variantId}`);
  validCounts(data.procedural); validCounts(data.unknown);
  for (const [sourceKey, resultKey] of [['wins', 'wins'], ['losses', 'losses'], ['ties', 'draws']]) {
    const total = data.decks.reduce((n, row) => { validCounts(row); return n + row[sourceKey]; }, 0) + data.procedural[sourceKey] + data.unknown[sourceKey];
    if (Number.isSafeInteger(deck[resultKey]) && total !== deck[resultKey]) throw Error(`Totais de matchup divergentes: ${id}/${deck.variantId}/${sourceKey}: ${total} != ${deck[resultKey]}`);
  }
  return data.decks.map(row => {
    validCounts(row);
    if (!row.id || !row.name) throw Error(`Adversário sem identificação: ${id}/${deck.variantId}`);
    return {
      tournamentId: id, deck: deck.deck, opponent: row.name,
      variantId: deck.variantId, opponentVariantId: row.id,
      wins: row.wins, losses: row.losses, draws: row.ties,
      unit: 'match', sourceUrl: fullUrl(`/${id}/decks/${deck.variantId}/matchups`),
      retrievedAt, status: 'verificado'
    };
  });
}

function parseDecklist(html, player) {
  const cards = hydrated(html, '/labs/data/tcg/decklist?');
  const sections = ['pokemon', 'trainer', 'energy'];
  if (!sections.every(section => Array.isArray(cards[section]))) throw Error(`Lista incompleta: ${player.decklistUrl}`);
  const total = sections.flatMap(section => cards[section]).reduce((sum, card) => sum + card.count, 0);
  if (total !== 60) throw Error(`Lista com ${total} cartas: ${player.decklistUrl}`);
  return {
    tournamentId: player.tournamentId, playerId: player.playerId,
    deck: player.deck, variantId: player.variantId, placement: player.placement,
    cards: Object.fromEntries(sections.map(section => [section, cards[section].map(card => ({ count: card.count, name: card.name, set: card.set, number: card.number }))])),
    sourceUrl: player.decklistUrl, retrievedAt: iso()
  };
}

function reconcileMatchups(rows, decks, id) {
  const byId = new Map(decks.map(deck => [deck.variantId, deck]));
  const directions = new Map(), unique = [], failures = [];
  for (const row of rows) {
    if (!byId.has(row.opponentVariantId)) { failures.push({ tournamentId: id, scope: 'matchup-opponent', sourceUrl: row.sourceUrl, detail: row.opponentVariantId }); continue; }
    if (row.variantId === row.opponentVariantId) continue; // mirror matchup of a deck with itself
    const key = [row.variantId, row.opponentVariantId].sort().join('|');
    if (!directions.has(key)) directions.set(key, []);
    directions.get(key).push(row);
  }
  for (const [key, pair] of directions) {
    if (pair.length !== 2 || pair[0].wins !== pair[1].losses || pair[0].losses !== pair[1].wins || pair[0].draws !== pair[1].draws) {
      failures.push({ tournamentId: id, scope: 'matchup-reconciliation', sourceUrl: pair[0].sourceUrl, detail: key });
      continue;
    }
    const selected = pair.find(row => row.variantId < row.opponentVariantId);
    if (selected.wins + selected.losses + selected.draws === 0) continue;
    unique.push({ ...selected, inverseSourceUrl: pair.find(row => row !== selected).sourceUrl });
  }
  return { matchups: unique, failures };
}

function tournamentInfo(html, id, retrievedAt) {
  const data = hydrated(html, '/labs/data/tcg/tournament?');
  if (!Number.isSafeInteger(data.players) || data.players < 1 || !data.city) throw Error(`Metadados do evento ${id} inválidos`);
  const date = /([A-Za-z]+) (\d{1,2})(?:[–-]\d{1,2})?, (\d{4})/.exec(data.date || '');
  if (!date) throw Error(`Data do evento ${id} não reconhecida: ${data.date}`);
  const month = new Date(`${date[1]} 1, ${date[3]} UTC`).getUTCMonth() + 1;
  if (!month) throw Error(`Mês do evento ${id} inválido`);
  return { id, name: `${data.city} Regional`, region: 'Ocidente', country: data.country,
    date: `${date[3]}-${String(month).padStart(2, '0')}-${date[2].padStart(2, '0')}`,
    format: 'BO3', players: data.players, sourceUrl: fullUrl(`/${id}/standings`),
    retrievedAt, status: 'verificado' };
}

async function run({ ids = IDS, delayMs = 400, decklistMode = 'topcut', outputDir = path.resolve(__dirname, '..', 'imports'), writeStatic = false, fetchPage = null } = {}) {
  const failures = [], source = { schemaVersion: 2, tournaments: [], results: [], matchups: [] };
  const players = [], decklists = [], coverage = [];
  let lastRequest = 0;
  async function request(route) {
    const url = fullUrl(route);
    const wait = lastRequest + delayMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    if (fetchPage) return fetchPage(url);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { stdout } = await execFileAsync('curl', ['--fail-with-body', '--location', '--silent', '--show-error', '--max-time', '30', '--user-agent', 'BarataoTCG/1.0 (public research importer)', url], { maxBuffer: 8 * 1024 * 1024 });
        return stdout;
      } catch (error) {
        if (attempt === 2) throw error;
        await sleep(3000 * (attempt + 1));
      }
    }
  }
  async function attempt(id, scope, route, parse) {
    try { return parse(await request(route)); }
    catch (error) { failures.push({ tournamentId: id, scope, sourceUrl: fullUrl(route), detail: error.message }); return null; }
  }

  for (const id of ids) {
    const retrievedAt = iso();
    const standingsHtml = await attempt(id, 'standings', `/${id}/standings`, x => x);
    const decksHtml = await attempt(id, 'decks', `/${id}/decks`, x => x);
    const conversionHtml = await attempt(id, 'conversion', `/${id}/decks?conversion`, x => x);
    if (!standingsHtml || !decksHtml || !conversionHtml) continue;
    let tournament, eventPlayers, eventDecks, conversion, published;
    try {
      tournament = tournamentInfo(standingsHtml, id, retrievedAt);
      eventPlayers = parseStandings(standingsHtml, id, retrievedAt);
      eventDecks = parseDecks(decksHtml, id, retrievedAt);
      conversion = parseConversion(conversionHtml);
      published = parsePublishedDeckTable(decksHtml);
      if (eventPlayers.length !== tournament.players) throw Error(`Classificação ${eventPlayers.length}/${tournament.players}`);
      const byId = new Map(eventDecks.map(deck => [deck.variantId, deck]));
      for (const player of eventPlayers) {
        if (player.variantId && !byId.has(player.variantId)) throw Error(`Variante sem linha em decks: ${player.variantId}`);
      }
      for (const deck of eventDecks) {
        const c = conversion.get(deck.deck), rate = published.get(deck.deck);
        if (!c || c.day1 !== deck.players || c.day2 !== deck.day2) throw Error(`Conversão divergente: ${deck.deck}`);
        if (rate == null || Math.abs(rate - deck.winRateReported) > 0.011) throw Error(`Win % divergente: ${deck.deck}`);
        deck.winRateReported = rate; // original published value, never the calculated rate
        const members = eventPlayers.filter(p => p.variantId === deck.variantId);
        if (members.length !== deck.players || members.filter(p => p.day2).length !== deck.day2 ||
          ['wins', 'losses', 'draws'].some(k => members.reduce((n, p) => n + p[k], 0) !== deck[k])) throw Error(`Classificação/deck divergentes: ${deck.deck}`);
        deck.topCut = members.filter(p => p.topCut).length;
      }
    } catch (error) {
      failures.push({ tournamentId: id, scope: 'validation', sourceUrl: fullUrl(`/${id}/standings`), detail: error.message });
      continue;
    }
    source.tournaments.push(tournament);
    source.results.push(...eventDecks);
    players.push(...eventPlayers);
    const covered = eventDecks.reduce((n, deck) => n + deck.players, 0);
    coverage.push({ tournamentId: id, standingsPlayers: eventPlayers.length, identifiedDeckPlayers: covered,
      unidentifiedDeckPlayers: tournament.players - covered, archetypes: eventDecks.length,
      topCutPlayers: eventPlayers.filter(p => p.topCut).length,
      availableDecklists: eventPlayers.filter(p => p.decklistUrl).length });
    console.log(`${id}: ${eventPlayers.length} jogadores, ${eventDecks.length} variantes, ${covered} decks identificados`);

    const directional = [];
    for (const deck of eventDecks) {
      const rows = await attempt(id, 'matchups', `/${id}/decks/${deck.variantId}/matchups`, html => parseMatchups(html, id, deck, iso()));
      if (rows) directional.push(...rows);
    }
    const reconciled = reconcileMatchups(directional, eventDecks, id);
    source.matchups.push(...reconciled.matchups);
    failures.push(...reconciled.failures);
    coverage.at(-1).matchupPairs = reconciled.matchups.length;

    const targets = eventPlayers.filter(p => p.decklistUrl && (decklistMode === 'all' || (decklistMode === 'topcut' && p.topCut)));
    for (const player of targets) {
      const list = await attempt(id, 'decklist', `/${id}/player/${player.playerId}/decklist`, html => parseDecklist(html, player));
      if (list) decklists.push(list);
    }
    coverage.at(-1).importedDecklists = decklists.filter(d => d.tournamentId === id).length;
    console.log(`${id}: ${reconciled.matchups.length} pares de matchup, ${coverage.at(-1).importedDecklists} decklists; ${failures.filter(f => f.tournamentId === id).length} falhas`);
  }
  validateSource(source);
  const output = { importedAt: iso(), sourceBase: BASE, decklistMode, source, players, decklists, coverage, failures };
  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = output.importedAt.replace(/[:.]/g, '-');
  const file = path.join(outputDir, `limitless-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(output, null, 2) + '\n');
  const sourceFile = path.join(outputDir, `limitless-${stamp}-source.json`);
  fs.writeFileSync(sourceFile, JSON.stringify(source, null, 2) + '\n');
  if (writeStatic) {
    if (ids.length !== IDS.length || source.tournaments.length !== IDS.length || failures.length) throw Error('Base estática não atualizada: importação incompleta ou com falhas. O arquivo de diagnóstico foi preservado.');
    fs.writeFileSync(path.resolve(__dirname, '..', 'regionals-data.js'), `// Dados públicos do Limitless Labs coletados em ${output.importedAt}.\n// Gerado por scripts/import-limitless.js; detalhes e lacunas em ${path.basename(file)}.\nconst VERIFIED_REGIONALS = ${JSON.stringify(source, null, 2)};\n`);
    fs.copyFileSync(file, path.join(outputDir, 'latest.json'));
    fs.copyFileSync(sourceFile, path.join(outputDir, 'latest-source.json'));
  }
  console.log(`Arquivo: ${file}`);
  console.log(`Eventos: ${source.tournaments.length}/${ids.length}; resultados: ${source.results.length}; matchups: ${source.matchups.length}; jogadores: ${players.length}; listas: ${decklists.length}; falhas: ${failures.length}`);
  if (source.tournaments.length !== ids.length || failures.length) process.exitCode = 2;
  return output;
}

function cli() {
  const args = process.argv.slice(2);
  const modeArg = args.find(a => a.startsWith('--decklists='));
  const decklistMode = modeArg ? modeArg.split('=')[1] : 'topcut';
  if (!['none', 'topcut', 'all'].includes(decklistMode)) throw Error('Use --decklists=none|topcut|all');
  const idArg = args.find(a => a.startsWith('--ids='));
  const ids = idArg ? idArg.split('=')[1].split(',') : IDS;
  if (!ids.length || ids.some(id => !IDS.includes(id))) throw Error('IDs permitidos: ' + IDS.join(', '));
  const delayArg = args.find(a => a.startsWith('--delay-ms='));
  const delayMs = delayArg ? Number(delayArg.split('=')[1]) : 400;
  if (!Number.isInteger(delayMs) || delayMs < 300) throw Error('Intervalo mínimo: 300 ms');
  const outArg = args.find(a => a.startsWith('--output-dir='));
  return run({ ids, delayMs, decklistMode, writeStatic: args.includes('--write-static'), outputDir: outArg ? path.resolve(outArg.split('=')[1]) : undefined });
}

if (require.main === module) cli().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { hydrated, parseDecks, parsePublishedDeckTable, parseConversion, parseStandings, parseMatchups, parseDecklist, reconcileMatchups, tournamentInfo, run };
