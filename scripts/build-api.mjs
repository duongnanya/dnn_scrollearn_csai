import * as esbuild from 'esbuild';
import { mkdirSync } from 'fs';

mkdirSync('api', { recursive: true });

await esbuild.build({
  entryPoints: ['lib/apiRouter.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'api/[...path].cjs',
  external: ['@vercel/node'],
  logLevel: 'info',
});

console.log('Bundled API → api/[...path].cjs');
