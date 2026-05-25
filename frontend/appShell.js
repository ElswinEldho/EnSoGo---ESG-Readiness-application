import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const LOGO_SRC     = '/EnSoGo%20Logo.png';
const INTER_FONT   = 'https://fonts.googleapis.com/css2?family=Inter'
                   + ':wght@300;400;500;600;700;800&display=optional';
const CDN_HOST     = 'https://cdnjs.cloudflare.com';
const GFONTS_HOST  = 'https://fonts.googleapis.com';
const GSTATIC_HOST = 'https://fonts.gstatic.com';

function buildDocumentTree(scriptSlot) {
  return h('html', { lang: 'en' },
    h('head', null,
      h('meta', { charSet: 'UTF-8' }),
      h('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }),
      h('title', null, 'EnSoGo · ESG Readiness Suite'),
      h('meta', {
        name:    'description',
        content: 'EnSoGo ESG Readiness Suite — Track, measure, and improve'
               + " your organisation's sustainability performance.",
      }),
      h('link', { rel: 'icon', type: 'image/png', href: LOGO_SRC }),
      h('link', { rel: 'preload', as: 'image', href: LOGO_SRC, fetchpriority: 'high' }),
      h('link', { rel: 'preconnect', href: GFONTS_HOST }),
      h('link', { rel: 'preconnect', href: GSTATIC_HOST, crossOrigin: 'anonymous' }),
      h('link', { rel: 'stylesheet', href: INTER_FONT, media: 'print' }),
      h('noscript', null, h('link', { rel: 'stylesheet', href: INTER_FONT })),
      h('link', { rel: 'preconnect', href: CDN_HOST, crossOrigin: 'anonymous' }),
      h('link', { rel: 'dns-prefetch', href: CDN_HOST }),
    ),
    h('body', { className: 'bg-slate-50 text-slate-900' },
      h('div', { id: 'root' }),
      scriptSlot,
    ),
  );
}

export function generateHtml() {
  const devScript = h('script', { type: 'module', src: '/src/main.jsx' });
  const markup    = renderToStaticMarkup(buildDocumentTree(devScript));
  return (
    '<!doctype html>'
    + markup
        .replace('charSet=', 'charset=')
        .replace('media="print"', 'media="print" onload="this.media=\'all\'"')
  );
}
