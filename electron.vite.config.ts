import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    build: { outDir: 'out/main', rollupOptions: { input: resolve(__dirname, 'src/main/index.ts') } }
  },
  preload: {
    build: { outDir: 'out/preload', rollupOptions: { input: resolve(__dirname, 'src/preload/index.ts') } }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: { outDir: 'out/renderer', minify: true, rollupOptions: { input: resolve(__dirname, 'src/renderer/index.html') } },
    plugins: [
      react(),
      {
        // The dev server's live reload needs a websocket; the built app allows no connections at all.
        name: 'strict-csp',
        apply: 'build',
        transformIndexHtml: (html) => html.replace(" connect-src 'self' ws://localhost:*;", " connect-src 'none';")
      }
    ]
  }
});
