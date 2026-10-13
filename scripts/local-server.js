#!/usr/bin/env node
'use strict';

// Local, on-demand import bridge. The browser cannot fetch Labs pages across origins.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { run } = require('./import-limitless.js');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.BARATAO_PORT || 8000);
let busy = false;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };

function regionalId(input) {
  let url;
  try { url = new URL(input); } catch { throw Error('Informe uma URL válida do Limitless Labs.'); }
  const match = /^\/(007[2-6])\/standings\/?$/.exec(url.pathname);
  if (url.protocol !== 'https:' || url.hostname !== 'labs.limitlesstcg.com' || url.username || url.password || url.port || url.search || url.hash || !match) {
    throw Error('Use a URL de classificação de um Regional MD3 entre 0072 e 0076.');
  }
  return match[1];
}

function send(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(data), 'Cache-Control': 'no-store' });
  res.end(data);
}

function allowedFile(pathname) {
  const name = pathname === '/' ? '/index.html' : pathname;
  if (!(/^\/(index\.html|styles\.css|seed\.js|regionals-data\.js|data-core\.js|deck-sprites\.js|app\.js)$/.test(name) ||
    /^\/assets\/[a-z0-9/_-]+\.png$/.test(name) || /^\/imports\/latest(?:-source)?\.json$/.test(name))) return null;
  return path.join(root, name);
}

function createServer(importOne = run) {
  return http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/api/analyze') {
      if (busy) return send(res, 409, { error: 'Já existe uma análise em andamento.' });
      busy = true;
      try {
        let raw = '';
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 4096) throw Error('Pedido muito grande.');
        }
        const id = regionalId(JSON.parse(raw).url);
        const report = await importOne({ ids: [id], decklistMode: 'topcut', delayMs: 400, writeReport: false, exitCodeOnFailure: false });
        send(res, 200, report);
      } catch (error) { send(res, 400, { error: error.message }); }
      finally { busy = false; }
      return;
    }
    if (req.method !== 'GET') return send(res, 405, { error: 'Método indisponível.' });
    let pathname;
    try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { return send(res, 400, { error: 'URL inválida.' }); }
    const file = allowedFile(pathname);
    if (!file) return send(res, 404, { error: 'Arquivo não encontrado.' });
    fs.readFile(file, (error, data) => {
      if (error) return send(res, 404, { error: 'Arquivo não encontrado.' });
      res.writeHead(200, { 'Content-Type': `${types[path.extname(file)]}; charset=utf-8` });
      res.end(data);
    });
  });
}

if (require.main === module) createServer().listen(port, '127.0.0.1', () => console.log(`BARATÃO TCG: http://127.0.0.1:${port}`));
module.exports = { regionalId, createServer };
