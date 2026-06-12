import * as esbuild from 'esbuild';
import { mkdirSync, readdirSync, unlinkSync } from 'fs';

mkdirSync('api', { recursive: true });

for (const f of readdirSync('api')) {
  if (f.endsWith('.mjs') || f.endsWith('.cjs')) {
    unlinkSync(`api/${f}`);
  }
}

const routes = ['analyze-url', 'analyze-text', 'analyze-image'];
const entryPoints = Object.fromEntries(
  routes.map((name) => [name, `api-src/${name}.ts`]),
);

await esbuild.build({
  entryPoints,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outdir: 'api',
  outExtension: { '.js': '.mjs' },
  banner: {
    js: `import { createRequire as __createRequire } from 'module'; const require = __createRequire(import.meta.url);`,
  },
  logLevel: 'info',
});

console.log('Bundled API →', routes.map((r) => `api/${r}.mjs`).join(', '));
