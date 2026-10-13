const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { validateSource } = require('../data-core.js');

const context = {};
vm.runInNewContext(fs.readFileSync(require.resolve('../regionals-data.js'), 'utf8') + '\nglobalThis.source = VERIFIED_REGIONALS;', context);
const source = validateSource(context.source);

test('as cinco fontes MD3 têm proveniência e cobertura explícitas', () => {
  assert.deepEqual(source.tournaments.map(t => t.id), ['0072', '0073', '0074', '0075', '0076']);
  assert.equal(source.results.length, 384);
  assert.equal(source.matchups.length, 4614);
  for (const tournament of source.tournaments) {
    assert.equal(tournament.format, 'BO3');
    const covered = source.results.filter(r => r.tournamentId === tournament.id).reduce((n, r) => n + r.players, 0);
    assert.ok(covered <= tournament.players);
    assert.ok(source.results.filter(r => r.tournamentId === tournament.id).every(r => Number.isInteger(r.topCut) && r.topCut <= r.players));
  }
});

test('todos os registros reproduzem o Win % publicado pela regra 3/1/0', () => {
  for (const r of source.results) {
    const n = r.wins + r.losses + r.draws;
    assert.ok(n > 0);
    assert.ok(Math.abs(100 * (r.wins + r.draws / 3) / n - r.winRateReported) < 0.011, `${r.tournamentId}: ${r.deck}`);
    assert.ok(r.day2 <= r.players);
    assert.equal(r.unit, 'match');
    assert.ok(r.sourceUrl.includes(`/${r.tournamentId}/decks`));
    assert.ok(r.conversionSourceUrl.includes('conversion'));
  }
});

test('cada par de matchup aparece uma vez por evento, com contagens reais', () => {
  const keys = new Set();
  for (const m of source.matchups) {
    const key = [m.tournamentId, ...[m.deck, m.opponent].sort()].join('|');
    assert.ok(!keys.has(key));
    keys.add(key);
    assert.ok(m.wins + m.losses + m.draws > 0);
    assert.equal(m.unit, 'match');
    assert.ok(m.sourceUrl.endsWith('/matchups'));
    assert.ok(m.inverseSourceUrl.endsWith('/matchups'));
  }
});
