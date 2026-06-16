#!/usr/bin/env node
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist/assets';
const LIMITS = [
  { ext: '.js', limit: 250 * 1024 },
  { ext: '.css', limit: 20 * 1024 },
];

function fmtKb(b) {
  return `${(b / 1024).toFixed(1)} KB`;
}

let failed = false;
for (const { ext, limit } of LIMITS) {
  const files = readdirSync(DIST).filter((f) => extname(f) === ext);
  for (const f of files) {
    const filePath = join(DIST, f);
    const size = statSync(filePath).size;
    const gz = gzipSync(readFileSync(filePath)).length;
    const ok = gz <= limit;
    if (!ok) failed = true;
    const status = ok ? '✓' : '✗';
    console.log(
      `${status} ${f}: raw=${fmtKb(size)} gzip=${fmtKb(gz)} (limit ${fmtKb(limit)})`,
    );
  }
}

process.exit(failed ? 1 : 0);
