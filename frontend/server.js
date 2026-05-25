/**
 * EnSoGo frontend server — dev and production.
 *
 * Development  (`npm run dev`  →  node server.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates a Vite dev server in middleware mode so the full HMR / plugin
 * pipeline is active.  HTML is generated programmatically from appShell.js
 * and passed through vite.transformIndexHtml() so Vite can inject its HMR
 * client, module-graph tags, and any other plugin transforms — exactly as if
 * Vite were serving index.html directly, but without the static file.
 *
 * Production  (`npm run serve`  →  node server.js --prod)
 * ─────────────────────────────────────────────────────────────────────────────
 * Serves the pre-built dist/ folder as static assets.  All non-file routes
 * fall back to dist/index.html (SPA client-side routing support).
 * Hashed asset files (/assets/*) receive long-lived immutable cache headers.
 *
 * Neither mode reads the frontend/index.html source file at runtime.
 */

import { createServer as createViteServer } from 'vite';
import http                                 from 'http';
import fs                                   from 'fs';
import os                                   from 'os';
import path                                 from 'path';
import { fileURLToPath }                    from 'url';
import { generateHtml }                     from './appShell.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT      = parseInt(process.env.PORT || process.env.VITE_PORT || '5173', 10);
const isProd    = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the first non-loopback IPv4 address for the Network URL banner. */
function getNetworkIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

/** Prints the startup banner with Local and (if available) Network URLs. */
function printBanner(label) {
  const network = getNetworkIP();
  console.log('');
  console.log(`  EnSoGo${label}  ready`);
  console.log('');
  console.log(`  ➜  Local:    http://localhost:${PORT}/`);
  if (network) {
    console.log(`  ➜  Network:  http://${network}:${PORT}/`);
  }
  console.log('');
}

// ─── MIME type map ────────────────────────────────────────────────────────────
const MIME_TYPES = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript',
  '.mjs':   'application/javascript',
  '.css':   'text/css',
  '.json':  'application/json',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.gif':   'image/gif',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.webp':  'image/webp',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.txt':   'text/plain',
  '.xml':   'application/xml',
  '.pdf':   'application/pdf',
};

// ─── Development server ───────────────────────────────────────────────────────
async function startDev() {
  // Create the HTTP server first so Vite can attach its WebSocket (HMR) to
  // the same port via the hmr.server option — no separate WS port needed.
  const httpServer = http.createServer();

  const vite = await createViteServer({
    root: __dirname,
    server: {
      middlewareMode: true,
      // Bind Vite's HMR WebSocket to our HTTP server so the browser connects
      // to the same port for both page requests and live-reload events.
      hmr: { server: httpServer },
    },
    // 'custom' appType tells Vite we are handling HTML ourselves — it will not
    // add its default HTML-serving middleware or the SPA fallback middleware.
    appType: 'custom',
  });

  httpServer.on('request', async (req, res) => {
    // Delegate to Vite's middleware stack first (asset transforms, proxy,
    // HMR ping endpoint, /@vite/client injection, etc.).
    vite.middlewares(req, res, async () => {
      // Vite did not handle this request — it must be a React Router route.
      // Generate the HTML shell, run it through Vite's transform pipeline
      // (plugin transformIndexHtml hooks, HMR client injection, etc.), and
      // return the fully processed document to the browser.
      try {
        let html = generateHtml();
        html = await vite.transformIndexHtml(req.url ?? '/', html);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch (err) {
        console.error('[dev-server] HTML generation error:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(String(err.message));
      }
    });
  });

  httpServer.listen(PORT, () => printBanner(' (dev)'));
}

// ─── Production server ────────────────────────────────────────────────────────
async function startProd() {
  const DIST     = path.resolve(__dirname, 'dist');
  const SPA_HTML = path.resolve(DIST, 'index.html');

  if (!fs.existsSync(DIST) || !fs.existsSync(SPA_HTML)) {
    console.error('[server] dist/index.html not found — run `npm run build` first.');
    process.exit(1);
  }

  const httpServer = http.createServer((req, res) => {
    const urlPath  = new URL(req.url || '/', `http://localhost:${PORT}`).pathname;
    const filePath = path.resolve(DIST, urlPath.replace(/^\//, ''));

    // Security: reject any path that escapes the dist directory.
    if (!filePath.startsWith(DIST + path.sep) && filePath !== DIST) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    // Serve the exact file if it exists.
    let stat;
    try { stat = fs.statSync(filePath); } catch (_) { /* file not found */ }

    if (stat && stat.isFile()) {
      const ext        = path.extname(filePath).toLowerCase();
      const mimeType   = MIME_TYPES[ext] || 'application/octet-stream';
      // Vite gives hashed filenames to everything in /assets/ — safe to cache
      // for a full year with immutable directive.
      const isImmutable = urlPath.startsWith('/assets/');
      res.writeHead(200, {
        'Content-Type':  mimeType,
        'Cache-Control': isImmutable
          ? 'public, max-age=31536000, immutable'
          : 'no-cache, must-revalidate',
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // SPA fallback — all client-side routes receive dist/index.html.
    res.writeHead(200, {
      'Content-Type':  'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, must-revalidate',
    });
    fs.createReadStream(SPA_HTML).pipe(res);
  });

  httpServer.listen(PORT, () => printBanner(' (production)'));
}

// ─── Entry point ──────────────────────────────────────────────────────────────
if (isProd) {
  await startProd();
} else {
  await startDev();
}
