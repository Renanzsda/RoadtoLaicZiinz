const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hydrated, parseDecks, parseMatchups, reconcileMatchups, parseDecklist } = require('../scripts/import-limitless.js');

const html = (endpoint, message) => `<script type="application/json" data-sveltekit-fetched data-url="${endpoint.replaceAll('&', '&amp;')}">${JSON.stringify({ status: 200, body: JSON.stringify({ ok: true, message }) })}</script>`;
const time = '2026-10-13T00:00:00Z';

test('lê somente os dados públicos embutidos no HTML', () => {
  const page = html('https://mew.limitlesstcg.com/labs/data/tcg/decks?tournamentId=0072', [{ identifier: 'a', name: 'Deck A', players: 2, day2s: 1, wins: 3, losses: 2, ties: 1 }]);
  assert.equal(hydrated(page, '/labs/data/tcg/decks?').length, 1);
  const rows = parseDecks(page, '0072', time);
  assert.equal(rows[0].deck, 'Deck A');
  assert.equal(rows[0].winRateReported, 55.56);
  assert.equal(rows[0].variantId, 'a');
});

test('reconcilia perspectivas inversas e rejeita pares divergentes', () => {
  const a = { deck: 'A', variantId: 'a' }, b = { deck: 'B', variantId: 'b' };
  const empty = { wins: 0, losses: 0, ties: 0 };
  const pageA = html('https://mew.limitlesstcg.com/labs/data/tcg/matchups?deckId=a', { decks: [{ id: 'b', name: 'B', wins: 2, losses: 1, ties: 1 }], procedural: empty, unknown: empty });
  const pageB = html('https://mew.limitlesstcg.com/labs/data/tcg/matchups?deckId=b', { decks: [{ id: 'a', name: 'A', wins: 1, losses: 2, ties: 1 }], procedural: empty, unknown: empty });
  const rows = [...parseMatchups(pageA, '0072', a, time), ...parseMatchups(pageB, '0072', b, time)];
  const good = reconcileMatchups(rows, [a, b], '0072');
  assert.equal(good.matchups.length, 1);
  assert.equal(good.failures.length, 0);
  rows[1].wins = 9;
  const bad = reconcileMatchups(rows, [a, b], '0072');
  assert.equal(bad.matchups.length, 0);
  assert.equal(bad.failures[0].scope, 'matchup-reconciliation');
});

test('totais de matchup incluem empates e precisam bater com rodadas do arquétipo', () => {
  const deck = { deck: 'A', variantId: 'a', wins: 3, losses: 1, draws: 2 };
  const data = { decks: [{ id: 'b', name: 'B', wins: 2, losses: 1, ties: 2 }], procedural: { wins: 1, losses: 0, ties: 0 }, unknown: { wins: 0, losses: 0, ties: 0 } };
  const page = html('https://mew.limitlesstcg.com/labs/data/tcg/matchups?deckId=a', data);
  assert.equal(parseMatchups(page, '0072', deck, time)[0].draws, 2);
  assert.throws(() => parseMatchups(page, '0072', { ...deck, draws: 1 }, time), /Totais de matchup divergentes/);
});

test('aceita apenas decklists completas de 60 cartas', () => {
  const player = { tournamentId: '0072', playerId: '1', deck: 'A', variantId: 'a', placement: 1, decklistUrl: 'https://labs.limitlesstcg.com/0072/player/1/decklist' };
  const page = html('https://mew.limitlesstcg.com/labs/data/tcg/decklist?playerId=1', { pokemon: [{ count: 60, name: 'Carta', set: 'TST', number: '1' }], trainer: [], energy: [] });
  assert.equal(parseDecklist(page, player).cards.pokemon[0].count, 60);
  assert.throws(() => parseDecklist(page.replace('60', '59'), player), /59 cartas/);
});
