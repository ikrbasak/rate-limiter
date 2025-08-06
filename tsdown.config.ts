import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist/',
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: 'inline',
  platform: 'node',
  minify: true,
  unbundle: true,
  treeshake: true,
  exports: true,
  nodeProtocol: 'strip',
});
