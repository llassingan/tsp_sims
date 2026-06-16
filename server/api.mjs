#!/usr/bin/env node
import http from 'node:http';

const PORT = Number(process.env['PORT'] ?? 14045);
const HOST = process.env['HOST'] ?? '0.0.0.0';

const ALGORITHMS = [
  { id: 'brute-force', name: 'Brute Force', timeComplexity: 'O(n!)', spaceComplexity: 'O(n)' },
  { id: 'branch-and-bound', name: 'Branch & Bound', timeComplexity: 'O(n!) worst', spaceComplexity: 'O(n^2)' },
  { id: 'held-karp', name: 'Held-Karp DP', timeComplexity: 'O(n^2 * 2^n)', spaceComplexity: 'O(n * 2^n)' },
  { id: 'nearest-neighbor', name: 'Nearest Neighbor', timeComplexity: 'O(n^2)', spaceComplexity: 'O(n)' },
];

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache',
  });
  res.end(JSON.stringify(body));
}

function notFound(res) {
  json(res, 404, { error: 'Not found' });
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    json(res, 200, { ok: true });
    return;
  }
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === '/health') {
    json(res, 200, {
      status: 'ok',
      service: 'tsp-api',
      time: new Date().toISOString(),
      uptime: process.uptime(),
    });
    return;
  }

  if (pathname === '/algorithms') {
    json(res, 200, { algorithms: ALGORITHMS });
    return;
  }

  if (pathname === '/version') {
    json(res, 200, {
      name: 'tsp-simulator-api',
      version: '0.1.0',
      description: 'Health and metadata API for the TSP Simulator frontend',
    });
    return;
  }

  notFound(res);
});

server.listen(PORT, HOST, () => {
  console.log(`[api] listening on http://${HOST}:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[api] SIGTERM received, closing...');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('[api] SIGINT received, closing...');
  server.close(() => process.exit(0));
});
