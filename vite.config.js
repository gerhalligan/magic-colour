import { defineConfig } from 'vite';
// Single IIFE bundle; tools/inline.mjs then inlines it (plus CSS) into one self-contained HTML file.
export default defineConfig({
  // Demo mode (4 pictures + 'get the full app' card) is OFF by default; only `MC_DEMO=1 npm run build:demo` turns it on.
  resolve: process.env.MC_DEMO === '1' ? { alias: [{ find: /^\.\/pictures\.generated\.js$/, replacement: new URL('./src/pictures.demo.js', import.meta.url).pathname }] } : {},
  define: { __MC_DEMO__: JSON.stringify(process.env.MC_DEMO === '1') },
  base: './', publicDir: false,
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2019', minify: true, cssCodeSplit: false, assetsInlineLimit: 0, chunkSizeWarningLimit: 4000,
    rollupOptions: { input: 'src/main.js', output: { format: 'iife', entryFileNames: 'app.js', name: 'MagicColour' } } },
});
