const { test } = require('node:test');
const assert = require('node:assert/strict');
const { migrateV1, validateSource, mergeSource } = require('../data-core.js');

const source = () => ({
  schemaVersion: 2,
  tournaments: [{ id: 'T-TEST', name: 'Evento sintético', region: 'Japão', format: 'BO1', date: '2026-10-01', players: null, sourceUrl: 'https://example.org/event', status: 'verificado' }],
  results: [{ tournamentId: 'T-TEST', deck: 'Deck A', players: null, day2: null, wins: null, losses: null, draws: null, winRateReported: null, unit: 'match', sourceUrl: 'https://example.org/result', retrievedAt: '2026-10-12T00:00:00Z', status: 'incompleto' }],
  matchups: [{ tournamentId: 'T-TEST', deck: 'Deck A', opponent: 'Deck B', wins: 2, losses: 1, draws: 0, unit: 'match', sourceUrl: 'https://example.org/matchup', retrievedAt: '2026-10-12T00:00:00Z', status: 'verificado' }]
});

test('migração mantém treino e marca unidade antiga como desconhecida', () => {
  const old = { version: 1, tournaments: [{ id: '1', name: 'Teste', region: 'Ocidente', format: 'BO3', url: 'https://example.org' }], results: [], matchups: [{ tournamentId: '1', deck: 'A', opponent: 'B', wins: 1, losses: 0, draws: 0 }], training: [{ id: 'x', player: 'Pessoa' }] };
  const next = migrateV1(old);
  assert.equal(next.version, 2);
  assert.deepEqual(next.training, old.training);
  assert.equal(next.matchups[0].unit, null);
  assert.equal(old.version, 1);
});

test('importação incorpora dados oficiais sem apagar os treinos', () => {
  const db = { version: 2, tournaments: [], results: [], matchups: [], training: [{ id: 'x', player: 'Pessoa' }] };
  const next = mergeSource(db, source());
  assert.equal(next.results.length, 1);
  assert.equal(next.matchups.length, 1);
  assert.deepEqual(next.training, db.training);
  assert.equal(db.results.length, 0);
  assert.equal(mergeSource(next, source()).matchups.length, 1);
});

test('rejeita duplicação pela perspectiva inversa e contagens inventadas por omissão', () => {
  const dup = source();
  dup.matchups.push({ ...dup.matchups[0], deck: 'Deck B', opponent: 'Deck A', wins: 1, losses: 2 });
  assert.throws(() => validateSource(dup), /Matchup/);
  const partial = source();
  partial.results[0].wins = 4;
  assert.throws(() => validateSource(partial), /Resultado/);
});

test('rejeita taxa publicada sem definição e Dia 2 maior que participantes', () => {
  const doc = source();
  doc.results[0].winRateReported = 50;
  assert.throws(() => validateSource(doc), /Resultado/);
  doc.results[0].metricDefinition = 'Taxa da fonte';
  doc.results[0].players = 2;
  doc.results[0].day2 = 3;
  assert.throws(() => validateSource(doc), /Resultado/);
});

test('atualização oficial posterior substitui contagens sem apagar treinos', () => {
  const original = source();
  original.results[0].status = 'verificado';
  original.results[0].sourceUrl = 'https://labs.limitlesstcg.com/T-TEST/decks';
  original.matchups[0].sourceUrl = 'https://labs.limitlesstcg.com/T-TEST/decks/a/matchups';
  const db = mergeSource({ version: 2, tournaments: [], results: [], matchups: [], training: [{ id: 'x', player: 'Pessoa' }] }, original);
  const updated = structuredClone(original);
  updated.results[0].players = 3;
  updated.matchups[0].wins = 3;
  updated.results[0].retrievedAt = '2026-10-13T00:00:00Z';
  updated.matchups[0].retrievedAt = '2026-10-13T00:00:00Z';
  const next = mergeSource(db, updated);
  assert.equal(next.results[0].players, 3);
  assert.equal(next.matchups[0].wins, 3);
  assert.deepEqual(next.training, db.training);
  assert.throws(() => mergeSource(next, original), /Resultado verificado/);
});
