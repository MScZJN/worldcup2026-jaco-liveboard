import { cp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const outDir = join(rootDir, 'dist-pages');
const entries = [
  '.nojekyll',
  'CNAME',
  'README.md',
  'index.html',
  'app.js',
  'styles.css',
  'broadcast.html',
  'broadcast.js',
  'broadcast.css',
  'studio.html',
  'studio.js',
  'studio.css',
  'assets',
  'data'
];

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await Promise.all(entries.map((entry) =>
  cp(join(rootDir, entry), join(outDir, entry), { recursive: true })
));
console.log(`Prepared ${outDir}`);
