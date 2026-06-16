#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.join(__dirname, 'frontend.mjs');
const API = path.join(__dirname, 'api.mjs');

function start(name, script, env) {
  const child = spawn(process.execPath, [script], {
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
  child.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`);
    process.exit(code ?? 0);
  });
  return child;
}

const frontend = start('frontend', FRONTEND, { PORT: '14022' });
const api = start('api', API, { PORT: '14045' });

function shutdown() {
  frontend.kill('SIGTERM');
  api.kill('SIGTERM');
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
