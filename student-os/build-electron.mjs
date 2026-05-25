import { build } from 'esbuild'

await build({
  entryPoints: ['electron/main.mjs'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  external: ['electron'],
  format: 'cjs',
  outfile: 'dist-electron/main.cjs',
})
