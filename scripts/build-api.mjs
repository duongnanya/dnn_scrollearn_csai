import * as esbuild from 'esbuild';
import { mkdirSync } from 'fs';

mkdirSync('api', { recursive: true });

const routes = ['health', 'analyze-url', 'analyze-text', 'analyze-image'];
const entryPoints = Object.fromEntries(
  routes.map((name) => [name, `api-src/${name}.ts`]),
);

await esbuild.build({
  entryPoints,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outdir: 'api',
  outExtension: { '.js': '.cjs' },
  external: ['@vercel/node'],
  logLevel: 'info',
});

console.log('Bundled API →', routes.map((r) => `api/${r}.cjs`).join(', '));
