#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { forDeck } = require('../deck-sprites.js');

const SPRITES_REV = '0dc105d5b12416932f29b594078282ab4be045f5';
const SPECIES_REV = '81d20919845b6a445969b9265aab5cec6b04cece';
const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'assets', 'sprites');
const PNG = Buffer.from([137,80,78,71,13,10,26,10]);
const get = url => execFileSync('curl', ['--fail', '--location', '--silent', '--show-error', '--max-time', '30', url], { maxBuffer: 2 * 1024 * 1024 });

const csvUrl = `https://raw.githubusercontent.com/PokeAPI/pokeapi/${SPECIES_REV}/data/v2/csv/pokemon_species.csv`;
const csv = get(csvUrl).toString('utf8');
const ids = new Map(csv.trim().split(/\r?\n/).slice(1).map(line => {
  const [id, identifier] = line.split(',');
  return [identifier, id];
}));
const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'imports', 'latest-source.json'), 'utf8'));
const mapped = new Map([...new Set(source.results.map(row => row.deck))].flatMap(forDeck).map(row => [row.slug, row]));
fs.mkdirSync(TARGET, { recursive: true });
const files = [];
for (const [slug, species] of [...mapped].sort(([a], [b]) => a.localeCompare(b))) {
  const id = ids.get(slug);
  if (!id) throw Error(`Espécie sem ID confirmado: ${slug}`);
  const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/${SPRITES_REV}/sprites/pokemon/${id}.png`;
  const data = get(imageUrl);
  if (!data.subarray(0, 8).equals(PNG)) throw Error(`Imagem inválida: ${imageUrl}`);
  const file = path.join(TARGET, `${slug}.png`);
  fs.writeFileSync(file, data);
  files.push({ slug, name: species.name, pokemonDbUrl: species.sourceUrl, pokeApiUrl: imageUrl,
    sha256: createHash('sha256').update(data).digest('hex') });
  console.log(`${slug}: ${id} (${data.length} bytes)`);
}
fs.writeFileSync(path.join(TARGET, 'manifest.json'), JSON.stringify({ spriteRepository: `https://github.com/PokeAPI/sprites/tree/${SPRITES_REV}`,
  speciesRepository: `https://github.com/PokeAPI/pokeapi/tree/${SPECIES_REV}`,
  pokemonDbReference: 'https://pokemondb.net/sprites', files }, null, 2) + '\n');
console.log(`Salvas ${files.length} sprites locais em ${TARGET}`);
