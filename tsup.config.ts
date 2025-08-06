import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['cjs', 'esm'],
  bundle: true,
  clean: true,
  sourcemap: true,
  dts: true,
  minify: true,
  minifyIdentifiers: true,
  minifySyntax: true,
  minifyWhitespace: true,
  splitting: false,
  skipNodeModulesBundle: true,
  tsconfig: 'tsconfig.json',
  treeshake: true,
  shims: false,
  external: ['express', 'hono'],
});
