const { test } = require('node:test');
const assert = require('node:assert/strict');
const { regionalId, createServer } = require('../scripts/local-server.js');

test('somente URLs de classificação MD3 conhecidas são aceitas', () => {
  assert.equal(regionalId('https://labs.limitlesstcg.com/0075/standings'), '0075');
  for (const url of ['https://evil.example/0075/standings', 'http://labs.limitlesstcg.com/0075/standings', 'https://labs.limitlesstcg.com/0077/standings', 'https://labs.limitlesstcg.com/0075/standings?division=SR']) {
    assert.throws(() => regionalId(url), /URL/);
  }
});

test('servidor local importa apenas após pedido explícito e não expõe arquivos internos', async () => {
  const calls = [];
  const server = createServer(async options => {
    calls.push(options);
    return { source: { tournaments: [{ id: options.ids[0] }], results: [], matchups: [] }, coverage: [], failures: [] };
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/`)).status, 200);
    assert.equal((await fetch(`${base}/scripts/import-limitless.js`)).status, 404);
    assert.equal(calls.length, 0);
    const bad = await fetch(`${base}/api/analyze`, { method: 'POST', body: JSON.stringify({ url: 'https://evil.example/0075/standings' }) });
    assert.equal(bad.status, 400);
    assert.equal(calls.length, 0);
    const good = await fetch(`${base}/api/analyze`, { method: 'POST', body: JSON.stringify({ url: 'https://labs.limitlesstcg.com/0075/standings' }) });
    assert.equal(good.status, 200);
    assert.equal((await good.json()).source.tournaments[0].id, '0075');
    assert.deepEqual(calls[0].ids, ['0075']);
    assert.equal(calls[0].writeReport, false);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
