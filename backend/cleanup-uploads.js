/**
 * One-time cleanup script — deletes all accumulated XLSX upload files
 * from backend/uploads/ that were not cleaned up when logout was a no-op.
 *
 * Run once from the backend/ directory:
 *   node cleanup-uploads.js
 *
 * Safe to run multiple times (skips files already gone).
 * Leaves .gitkeep and all PDF files untouched.
 */

const fs   = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, 'uploads');

try {
  const files = fs.readdirSync(UPLOADS_DIR);
  let deleted = 0;
  let skipped = 0;

  for (const file of files) {
    if (file === '.gitkeep') { skipped++; continue; }
    if (file.endsWith('.pdf'))  { skipped++; continue; }   // keep generated reports
    if (!file.endsWith('.xlsx') && !file.endsWith('.csv')) { skipped++; continue; }

    const filePath = path.join(UPLOADS_DIR, file);
    try {
      fs.unlinkSync(filePath);
      console.log(`  deleted: ${file}`);
      deleted++;
    } catch (e) {
      console.warn(`  could not delete ${file}: ${e.message}`);
    }
  }

  console.log(`\nDone. Deleted ${deleted} file(s), skipped ${skipped} file(s).`);
} catch (e) {
  console.error('Error reading uploads directory:', e.message);
  process.exit(1);
}
