const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { forDeck } = require('../deck-sprites.js');
const source = require('../imports/latest-source.json');
const manifest = require('../assets/sprites/manifest.json');

test('Dragapult puro e Dragapult Blaziken mantêm espécies separadas', () => {
  assert.deepEqual(forDeck('Dragapult').map(x => x.slug), ['dragapult']);
  assert.deepEqual(forDeck('Dragapult Blaziken').map(x => x.slug), ['dragapult', 'blaziken']);
  assert.equal(forDeck('Dragapult Blaziken')[0].sourceUrl, 'https://pokemondb.net/sprites/dragapult');
});

test('ícones representativos do Limitless cobrem nomes genéricos; Other fica indefinido', () => {
  assert.deepEqual(forDeck('Basic Box').map(x => x.slug), ['ogerpon', 'clefairy']);
  assert.deepEqual(forDeck('Festival Lead').map(x => x.slug), ['dipplin', 'thwackey']);
  assert.deepEqual(forDeck('Tera Box').map(x => x.slug), ['noctowl', 'ogerpon']);
  assert.deepEqual(forDeck('Other'), []);
  assert.deepEqual(forDeck("N's Zoroark").map(x => x.slug), ['zoroark']);
  assert.deepEqual(forDeck('Ogerpon Meganium Hydrapple').map(x => x.slug), ['ogerpon', 'meganium', 'hydrapple']);
  assert.deepEqual(forDeck('Mew Box').map(x => x.slug), ['mew']);
  assert.deepEqual(forDeck("Rocket's Mewtwo").map(x => x.slug), ['mewtwo']);
});

test('todos os decks publicados têm mapeamento ou ambiguidade explícita', () => {
  const decks = [...new Set(source.results.map(r => r.deck))];
  const unmapped = decks.filter(deck => !forDeck(deck).length).sort();
  assert.deepEqual(unmapped, ['Other']);
});

test('cada espécie mapeada tem arquivo PNG local íntegro e link de referência', () => {
  const slugs = new Set([...new Set(source.results.map(r => r.deck))].flatMap(deck => forDeck(deck).map(x => x.slug)));
  assert.equal(manifest.files.length, slugs.size);
  for (const file of manifest.files) {
    assert.ok(slugs.has(file.slug));
    assert.equal(file.pokemonDbUrl, `https://pokemondb.net/sprites/${file.slug}`);
    const bytes = fs.readFileSync(path.join(__dirname, '..', 'assets', 'sprites', `${file.slug}.png`));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
  }
});
