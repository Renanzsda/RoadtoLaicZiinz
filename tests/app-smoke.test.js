const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');

class LocalResources extends ResourceLoader {
  fetch(url) {
    const relative = new URL(url).pathname.slice(1);
    return Promise.resolve(fs.readFileSync(path.resolve(__dirname, '..', relative)));
  }
}

test('aplicação estática abre, mostra Top Cut e persiste a base importada', async () => {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8'), {
    url: 'https://baratao.local/', resources: new LocalResources(), runScripts: 'dangerously',
    storageQuota: 5_000_000, virtualConsole,
    beforeParse(window) { window.structuredClone = structuredClone; }
  });
  try {
    await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }));
    assert.deepEqual(errors, []);
    assert.match(dom.window.document.querySelector('#content').textContent, /Road to LAIC/);
    const dragapultBlaziken = [...dom.window.document.querySelectorAll('.deck-identity')].find(node => node.textContent === 'Dragapult Blaziken');
    assert.deepEqual([...dragapultBlaziken.querySelectorAll('.sprite-link')].map(node => node.href), [
      'https://pokemondb.net/sprites/dragapult', 'https://pokemondb.net/sprites/blaziken'
    ]);
    assert.ok(dom.window.localStorage.getItem('baratao-road-to-laic-v2'));
    dom.window.document.querySelector('[data-tab="tournaments"]').click();
    assert.match(dom.window.document.querySelector('#content').textContent, /Conv. Top Cut/);
    dom.window.document.querySelector('[data-tab="data"]').click();
    assert.ok(dom.window.document.querySelector('a[href="imports/latest.json"]'));
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('base local antiga com zero matchups mostra correção e só ranqueia dados verificados', async () => {
  const old = { version: 2, tournaments: [{ id: '0075', name: 'Recife Regional', region: 'Ocidente', format: 'BO3', date: '2026-10-03', players: 1074, status: 'preliminar' }],
    results: [{ tournamentId: '0075', deck: 'Dragapult', players: 250, day2: null, wins: null, losses: null, draws: null, winRateReported: 50, status: 'preliminar' }], matchups: [], training: [] };
  const dom = new JSDOM(fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8'), {
    url: 'https://baratao.local/', resources: new LocalResources(), runScripts: 'dangerously', storageQuota: 5_000_000,
    beforeParse(window) { window.structuredClone = structuredClone; window.confirm = () => true; window.localStorage.setItem('baratao-road-to-laic-v2', JSON.stringify(old)); }
  });
  try {
    await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }));
    assert.match(dom.window.document.querySelector('#content').textContent, /Esta base local não contém matchups MD3 verificados/);
    dom.window.document.querySelector('[data-tab="ranking"]').click();
    assert.doesNotMatch(dom.window.document.querySelector('#content').textContent, /Dragapult/);
    dom.window.document.querySelector('[data-tab="data"]').click();
    dom.window.document.querySelector('#apply-verified').click();
    assert.equal(JSON.parse(dom.window.localStorage.getItem('baratao-road-to-laic-v2')).matchups.length, 4614);
  } finally { dom.window.close(); }
});
