#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { validateSource } = require('../data-core.js');

const input = process.argv[2];
if (!input) throw Error('Uso: node scripts/publish-import.js imports/limitless-DATA.json');
const report = JSON.parse(fs.readFileSync(input, 'utf8'));
const source = validateSource(report.source);
const ids = ['0072', '0073', '0074', '0075', '0076'];
if (report.failures?.length || source.tournaments.length !== 5 || ids.some(id => !source.tournaments.some(t => t.id === id))) {
  throw Error('Importação incompleta ou com falhas; base estática preservada');
}
const root = path.resolve(__dirname, '..');
fs.writeFileSync(path.join(root, 'regionals-data.js'), `// Dados públicos do Limitless Labs coletados em ${report.importedAt}.\n// Gerado por scripts/publish-import.js; detalhes e lacunas em imports/latest.json.\nconst VERIFIED_REGIONALS = ${JSON.stringify(source, null, 2)};\n`);
fs.copyFileSync(input, path.join(root, 'imports', 'latest.json'));
fs.writeFileSync(path.join(root, 'imports', 'latest-source.json'), JSON.stringify(source, null, 2) + '\n');
console.log(`Base estática atualizada: ${source.tournaments.length} torneios, ${source.results.length} arquétipos, ${source.matchups.length} confrontos`);
