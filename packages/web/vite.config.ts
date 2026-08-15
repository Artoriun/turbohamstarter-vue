import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

/**
 * GitHub Pages serves a project site from /<repo>/, so the built assets need that prefix.
 * Set BASE_PATH to '/your-repo-name/' (the CI workflow passes it). A user/organisation
 * site, or a custom domain, serves from the root — leave it unset.
 */
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  plugins: [vue()],
  server: {
    // Same port convention as the React package's Playwright-visible dev server —
    // overridable via WEB_PORT, kept off 3000 so a stray dev server elsewhere never gets
    // mistaken for this one.
    port: Number(process.env.WEB_PORT ?? 3720),
    strictPort: true,
    host: '0.0.0.0',
    open: true,
    allowedHosts: true,
    proxy: {
      '/api': { target: `http://localhost:${process.env.API_PORT ?? 3700}`, changeOrigin: true },
    },
  },
  base: process.env.NODE_ENV === 'production' ? base : '/',
  build: {
    // The budget script parses this directory; keep them in step if you change it.
    outDir: 'dist',
  },
});
