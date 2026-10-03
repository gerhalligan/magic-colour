import { defineConfig } from 'vite';
// Single IIFE bundle; tools/inline.mjs then inlines it (plus CSS) into one self-contained HTML file.
export default defineConfig({
  base: './', publicDir: false,
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2019', minify: true, cssCodeSplit: false, assetsInlineLimit: 0, chunkSizeWarningLimit: 4000,
    rollupOptions: { input: 'src/main.js', output: { format: 'iife', entryFileNames: 'app.js', name: 'MagicColour' } } },
});
