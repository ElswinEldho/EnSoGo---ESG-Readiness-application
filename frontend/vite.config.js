import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  build: {
    // ── Minification ──────────────────────────────────────────────────────
    // esbuild is Vite's built-in minifier: strips whitespace, renames locals,
    // removes dead code.  No extra npm package required.
    minify: 'esbuild',

    // Minify CSS (collapses rules, removes comments, shortens values)
    cssMinify: true,

    // Drop source maps in production — reduces payload by ~30-50 %
    sourcemap: false,

    // es2020: supports optional chaining, nullish coalescing, BigInt natively —
    // enables more aggressive minification and smaller output than es2015.
    // Supported by >95% of browsers (Chrome 80+, Firefox 74+, Safari 13.1+).
    target: 'es2020',

    // Skip the gzip/brotli size report shown after every build — saves ~500 ms
    // per build on large bundles. Actual compressed sizes are unchanged.
    reportCompressedSize: false,

    // Inline SVG/image assets smaller than 4 KB into the JS bundle as data URIs,
    // eliminating extra HTTP round-trips for tiny assets.
    assetsInlineLimit: 4096,

    // ── Code splitting (reduces unused-JS) ────────────────────────────────
    rollupOptions: {
      output: {
        // Split vendor libraries into separate cached chunks so app-code
        // changes do not bust the large library caches.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // Recharts + its D3 sub-packages → one charts chunk
          if (
            id.includes('/recharts/') ||
            id.includes('/d3-') ||
            id.includes('/victory-')
          ) {
            return 'charts';
          }

          // React core + DOM → react-vendor chunk
          if (
            id.includes('/react-dom/') ||
            id.includes('/react/') ||
            id.includes('/scheduler/')
          ) {
            return 'react-vendor';
          }

          // React Router + Remix internals → router chunk
          if (
            id.includes('/react-router') ||
            id.includes('/@remix-run/')
          ) {
            return 'router';
          }

          // Everything else (axios, etc.) → vendor chunk
          return 'vendor';
        },

        // Use content-hash filenames so assets can be cached for a full year
        chunkFileNames:  'assets/[name]-[hash].js',
        entryFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash][extname]',
      },
    },

    // Raise warning threshold — individual page chunks may be ~400 kB before gz
    chunkSizeWarningLimit: 1000,
  },

  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
