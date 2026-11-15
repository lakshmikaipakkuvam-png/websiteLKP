import { build } from 'esbuild'

// Express dependencies need their Node entrypoints, not browser-only stream stubs.
await build({
  entryPoints: ['worker.js'],
  outfile: '.wrangler/bundle/worker.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2022',
  external: ['cloudflare:*', 'node:*'],
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire("/worker.js");' },
})
