#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env['PORT'] ?? 14022);
const HOST = process.env['HOST'] ?? '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-cache', ...headers });
  res.end(body);
}

function serveFile(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] ?? 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 500, 'Internal Server Error');
      return;
    }
    send(res, 200, data, { 'Content-Type': mime });
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/health') {
    send(res, 200, JSON.stringify({ status: 'ok', service: 'tsp-frontend', time: new Date().toISOString() }), { 'Content-Type': 'application/json' });
    return;
  }

  let candidate = path.join(DIST, pathname);
  if (!candidate.startsWith(DIST)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(candidate, (err, stat) => {
    if (!err && stat.isFile()) {
      serveFile(req, res, candidate);
      return;
    }
    const indexPath = path.join(DIST, 'index.html');
    fs.readFile(indexPath, (e, data) => {
      if (e) {
        send(res, 500, 'Build not found. Run `pnpm build` first.');
        return;
      }
      send(res, 200, data, { 'Content-Type': 'text/html; charset=utf-8' });
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[frontend] listening on http://${HOST}:${PORT}`);
  console.log(`[frontend] dist: ${DIST}`);
});

process.on('SIGTERM', () => {
  console.log('[frontend] SIGTERM received, closing...');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('[frontend] SIGINT received, closing...');
  server.close(() => process.exit(0));
});
