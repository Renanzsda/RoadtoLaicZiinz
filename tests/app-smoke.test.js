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
    assert.ok(dom.window.localStorage.getItem('baratao-road-to-laic-v2'));
    dom.window.document.querySelector('[data-tab="tournaments"]').click();
    assert.match(dom.window.document.querySelector('#content').textContent, /Conv. Top Cut/);
    dom.window.document.querySelector('[data-tab="data"]').click();
    assert.ok(dom.window.document.querySelector('a[href="imports/latest.json"]'));
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
