const { test } = require('node:test');
const assert = require('node:assert/strict');
const report = require('../imports/latest.json');
const source = require('../imports/latest-source.json');

test('relatório contém os cinco torneios completos e nenhuma falha', () => {
  assert.equal(report.failures.length, 0);
  assert.deepEqual(report.source, source);
  assert.deepEqual(report.coverage.map(c => c.tournamentId), ['0072', '0073', '0074', '0075', '0076']);
  assert.equal(report.players.length, 10733);
  assert.equal(report.decklists.length, 51);
  for (const c of report.coverage) {
    const tournament = source.tournaments.find(t => t.id === c.tournamentId);
    const players = report.players.filter(p => p.tournamentId === c.tournamentId);
    const results = source.results.filter(r => r.tournamentId === c.tournamentId);
    assert.equal(players.length, tournament.players);
    assert.equal(results.reduce((n, r) => n + r.players, 0), c.identifiedDeckPlayers);
    assert.equal(c.identifiedDeckPlayers + c.unidentifiedDeckPlayers, tournament.players);
    assert.equal(results.reduce((n, r) => n + r.topCut, 0), c.topCutPlayers);
    assert.equal(report.decklists.filter(d => d.tournamentId === c.tournamentId).length, c.importedDecklists);
  }
});

test('cada decklist coletada tem 60 cartas e vínculo com jogador publicado', () => {
  const players = new Map(report.players.map(p => [`${p.tournamentId}/${p.playerId}`, p]));
  for (const list of report.decklists) {
    const player = players.get(`${list.tournamentId}/${list.playerId}`);
    assert.ok(player);
    assert.equal(list.sourceUrl, player.decklistUrl);
    assert.equal(['pokemon', 'trainer', 'energy'].flatMap(section => list.cards[section]).reduce((n, card) => n + card.count, 0), 60);
  }
});
