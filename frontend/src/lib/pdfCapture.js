/**
 * pdfCapture.js
 *
 * Two exports:
 *   captureAsPdf(elementId, filename) -- download a multi-page A4 PDF
 *   printAsPdf(elementId)             -- open the OS print dialog with an
 *                                        identical A4-formatted report
 */

/* --- Script loader --------------------------------------------------------- */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* --- Overflow helpers ------------------------------------------------------- */
function unlockOverflow(el) {
  const saved = [];
  let node = el.parentElement;
  while (node && node !== document.documentElement) {
    const cs = window.getComputedStyle(node);
    if (['auto', 'hidden', 'scroll'].includes(cs.overflow) ||
        ['auto', 'hidden', 'scroll'].includes(cs.overflowY)) {
      saved.push({
        node,
        overflow:  node.style.overflow,
        overflowY: node.style.overflowY,
        height:    node.style.height,
        maxHeight: node.style.maxHeight,
      });
      node.style.overflow  = 'visible';
      node.style.overflowY = 'visible';
      node.style.height    = 'auto';
      node.style.maxHeight = 'none';
    }
    node = node.parentElement;
  }
  return saved;
}

function restoreOverflow(saved) {
  saved.forEach(({ node, overflow, overflowY, height, maxHeight }) => {
    node.style.overflow  = overflow;
    node.style.overflowY = overflowY;
    node.style.height    = height;
    node.style.maxHeight = maxHeight;
  });
}

/* --- RAF settle ------------------------------------------------------------- */
async function settle(ms = 400) {
  await new Promise(r => requestAnimationFrame(r));
  await new Promise(r => requestAnimationFrame(r));
  await new Promise(r => setTimeout(r, ms));
}

/* --- Shared onclone handler ------------------------------------------------- */
function oncloneHandler(clonedDoc) {
  clonedDoc.querySelectorAll('.no-print').forEach(n => n.remove());
  clonedDoc
    .querySelectorAll('[style*="position: sticky"],[style*="position:sticky"],[style*="position: fixed"],[style*="position:fixed"]')
    .forEach(n => { n.style.position = 'relative'; });
  const view = clonedDoc.defaultView || window;
  clonedDoc.querySelectorAll('*').forEach(n => {
    if (!(n instanceof clonedDoc.defaultView.Element)) return;
    if (n.classList && n.classList.contains('pdf-progress-bar')) return;
    const cs = view.getComputedStyle(n);
    if (['auto', 'hidden', 'scroll'].includes(cs.overflow))  n.style.overflow  = 'visible';
    if (['auto', 'hidden', 'scroll'].includes(cs.overflowY)) n.style.overflowY = 'visible';
    if (['auto', 'hidden', 'scroll'].includes(cs.overflowX)) n.style.overflowX = 'visible';
    if (cs.maxHeight && cs.maxHeight !== 'none' && cs.maxHeight !== '0px') n.style.maxHeight = 'none';
    if (cs.whiteSpace === 'nowrap')     n.style.whiteSpace   = 'normal';
    if (cs.textOverflow === 'ellipsis') n.style.textOverflow = 'clip';
  });
}

/* --- Shared canvas capture -------------------------------------------------- */
async function captureElement(el) {
  const saved         = unlockOverflow(el);
  const originalWidth = el.style.width;
  const originalMaxW  = el.style.maxWidth;
  el.style.width    = '794px';
  el.style.maxWidth = '794px';

  await settle(500);

  const captureH = Math.max(el.offsetHeight, el.scrollHeight);

  const canvas = await window.html2canvas(el, {
    scale:           2,
    useCORS:         true,
    allowTaint:      true,
    backgroundColor: '#ffffff',
    scrollX:         0,
    scrollY:         -window.scrollY,
    width:           el.offsetWidth,
    height:          captureH,
    windowWidth:     el.offsetWidth,
    windowHeight:    captureH,
    logging:         false,
    imageTimeout:    0,
    onclone:         oncloneHandler,
  });

  el.style.width    = originalWidth;
  el.style.maxWidth = originalMaxW;
  restoreOverflow(saved);
  return canvas;
}

/* --- Slice canvas into A4 pages --------------------------------------------- */
function sliceIntoPages(canvas, pageHPx) {
  const pages = [];
  let y = 0;
  while (y < canvas.height) {
    const h   = Math.min(pageHPx, canvas.height - y);
    const pg  = document.createElement('canvas');
    pg.width  = canvas.width;
    pg.height = h;
    const ctx = pg.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pg.width, pg.height);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    pages.push({ pageCanvas: pg, sliceH: h });
    y += h;
  }
  return pages;
}

/* --- Download PDF ------------------------------------------------------------ */
export async function captureAsPdf(elementId, filename) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

  const el = document.getElementById(elementId);
  if (!el) return;

  const canvas = await captureElement(el);

  const { jsPDF } = window.jspdf;
  const A4_W = 210, A4_H = 297, MX = 10, MY = 12, FOOTER_H = 8;
  const pdf      = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const contentW = A4_W - MX * 2;
  const contentH = A4_H - MY * 2 - FOOTER_H;
  const pxPerMm  = canvas.width / contentW;
  const pageHPx  = Math.floor(contentH * pxPerMm);

  sliceIntoPages(canvas, pageHPx).forEach(({ pageCanvas, sliceH }, i) => {
    if (i > 0) pdf.addPage();

    pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.93), 'JPEG', MX, MY, contentW, sliceH / pxPerMm);

    if (i > 0) {
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.25);
      pdf.line(MX, MY - 1, A4_W - MX, MY - 1);
    }

    pdf.setFontSize(7.5);
    pdf.setTextColor(160, 160, 160);
    pdf.text('Page ' + (i + 1) + '  ·  EnSoGo Readiness Suite', A4_W / 2, A4_H - 4, { align: 'center' });
  });

  pdf.save(filename);
}

/* --- Print via system dialog ------------------------------------------------
 *
 * Same capture as captureAsPdf but instead of a jsPDF file we write the
 * sliced page images into a new window and call window.print(), opening the
 * native OS print dialog.  Charts, gradients and shadows all render faithfully
 * because they were rasterised by html2canvas.
 */
export async function printAsPdf(elementId) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');

  const el = document.getElementById(elementId);
  if (!el) return;

  const canvas = await captureElement(el);

  /* A4 at 96 dpi: 794 x 1123 px.  Content area matches jsPDF constants. */
  const contentW_px = 794 - 38 * 2;          /* 718 px  ~ 190 mm */
  const contentH_px = 1123 - 45 * 2 - 30;    /* 1003 px ~ 265 mm */
  const scaleRatio  = canvas.width / contentW_px;
  const pageH_cvs   = Math.floor(contentH_px * scaleRatio);

  const rawPages = sliceIntoPages(canvas, pageH_cvs);
  const total    = rawPages.length;
  const today    = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  /* Build one <div class="page"> per slice */
  const pagesHtml = rawPages.map(function(p, i) {
    return [
      '<div class="page">',
      '  <div class="page-content">',
      '    <img src="' + p.pageCanvas.toDataURL('image/jpeg', 0.95) + '" alt="Page ' + (i+1) + '" />',
      '  </div>',
      '  <div class="footer">',
      '    <span>EnSoGo Readiness Suite &middot; ' + today + '</span>',
      '    <span>Page ' + (i+1) + ' of ' + total + '</span>',
      '  </div>',
      '</div>',
    ].join('\n');
  }).join('\n');

  const printHtml = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="UTF-8" />',
    '  <title>EnSoGo ESG Report</title>',
    '  <style>',
    '    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }',
    '    body { background: #f1f5f9; font-family: Arial, Helvetica, sans-serif; }',
    '    .page {',
    '      width: 210mm; min-height: 297mm; margin: 10mm auto;',
    '      background: #fff; box-shadow: 0 4px 24px rgba(0,0,0,0.14);',
    '      border-radius: 3px; display: flex; flex-direction: column;',
    '      overflow: hidden; page-break-after: always; break-after: page;',
    '    }',
    '    .page:last-child { page-break-after: avoid; break-after: avoid; }',
    '    .page-content { flex: 1; padding: 12mm 10mm 4mm; }',
    '    .page-content img { width: 100%; height: auto; display: block; }',
    '    .footer {',
    '      padding: 2.5mm 10mm; border-top: 0.3mm solid #e2e8f0;',
    '      display: flex; justify-content: space-between;',
    '      font-size: 7.5pt; color: #94a3b8; background: #fff; flex-shrink: 0;',
    '    }',
    '    @media print {',
    '      body { background: white !important;',
    '             -webkit-print-color-adjust: exact;',
    '             print-color-adjust: exact; color-adjust: exact; }',
    '      .page { width: 100% !important; min-height: 0 !important;',
    '              margin: 0 !important; box-shadow: none !important;',
    '              border-radius: 0 !important;',
    '              page-break-after: always; break-after: page; }',
    '      .page:last-child { page-break-after: avoid; break-after: avoid; }',
    '    }',
    '    @page { size: A4 portrait; margin: 0; }',
    '  </style>',
    '</head>',
    '<body>',
    pagesHtml,
    '  <script>',
    '    (function(){',
    '      var imgs = document.querySelectorAll("img");',
    '      var total = imgs.length, loaded = 0;',
    '      function done(){ loaded++; if(loaded>=total) setTimeout(function(){ window.focus(); window.print(); }, 400); }',
    '      if(total===0){ setTimeout(function(){ window.focus(); window.print(); },400); return; }',
    '      imgs.forEach(function(img){ if(img.complete) done(); else { img.onload=done; img.onerror=done; } });',
    '    })();',
    '  <\/script>',
    '</body>',
    '</html>',
  ].join('\n');

  var pw = window.open('', '_blank', 'width=960,height=800,scrollbars=yes');
  if (!pw) {
    alert('Please allow pop-ups for this site to use the Print function, then try again.');
    return;
  }
  pw.document.open();
  pw.document.write(printHtml);
  pw.document.close();
}
