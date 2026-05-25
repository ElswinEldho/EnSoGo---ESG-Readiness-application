import { defineConfig, loadEnv } from 'vite';
import react        from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path         from 'path';
import { generateHtml } from './appShell.js';

// Resolve the project root (one directory above frontend/).
const __dirname    = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ── No-HTML plugin ────────────────────────────────────────────────────────────
// Eliminates index.html entirely. The entry point is src/main.jsx (pure JS).
// HTML is generated at runtime from appShell.js — never from a static file.
//
//   Dev (`npm run dev` / `npm run dev:vite`)
//     configureServer returns a "post" middleware that catches every
//     navigation request after Vite's own asset/transform stack, generates
//     the HTML shell via generateHtml(), runs it through
//     server.transformIndexHtml() so Vite can inject its HMR client and
//     React-refresh preamble, then streams it to the browser.
//
//   Build (`npm run build`)
//     Rollup input is src/main.jsx — no HTML needed.
//     generateBundle() fires after all chunks/assets are emitted; it reads
//     the actual hashed filenames from the bundle, replaces the dev script
//     tag in the generated HTML with production <link> + <script> tags, and
//     emits dist/index.html as a Rollup asset.  No source index.html required.
//
function noIndexHtmlPlugin() {
  return {
    name: 'no-index-html',

    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res, next) => {
          try {
            let html = generateHtml();
            html = await server.transformIndexHtml(req.url ?? '/', html);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
          } catch (err) {
            next(err);
          }
        });
      };
    },

    generateBundle(_, bundle) {
      const entryChunks = Object.values(bundle).filter((c) => c.isEntry);
      const cssAssets   = Object.values(bundle).filter(
        (c) => c.type === 'asset' && c.fileName.endsWith('.css'),
      );

      const linkTags   = cssAssets
        .map((c) => `<link rel="stylesheet" href="/${c.fileName}"/>`)
        .join('');
      const scriptTags = entryChunks
        .map((c) => `<script type="module" src="/${c.fileName}"></script>`)
        .join('');
      const prodTags   = linkTags + scriptTags;

      const html = generateHtml().replace(
        '<script type="module" src="/src/main.jsx"></script>',
        prodTags,
      );

      this.emitFile({ type: 'asset', fileName: 'index.html', source: html });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, PROJECT_ROOT, '');

  return {
    plugins: [react(), noIndexHtmlPlugin()],

    appType: 'custom',

    envDir: PROJECT_ROOT,

    build: {
      minify: 'esbuild',
      cssMinify: true,
      sourcemap: false,
      target: 'es2020',
      reportCompressedSize: false,
      assetsInlineLimit: 4096,

      rollupOptions: {
        input: path.resolve(__dirname, 'src/main.jsx'),

        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('/recharts/') || id.includes('/d3-') || id.includes('/victory-'))
              return 'charts';
            if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/'))
              return 'react-vendor';
            if (id.includes('/react-router') || id.includes('/@remix-run/'))
              return 'router';
            return 'vendor';
          },

          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },

      chunkSizeWarningLimit: 1000,
    },

    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: (() => {
            try { return new URL(env.VITE_API_URL || 'http://localhost:5000').origin; }
            catch { return 'http://localhost:5000'; }
          })(),
          changeOrigin: true,
        },
      },
    },
  };
});
