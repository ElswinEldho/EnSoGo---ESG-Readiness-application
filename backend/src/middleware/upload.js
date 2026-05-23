// Multer config — stores uploads in UPLOAD_DIR with safe filenames.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const UPLOAD_DIR = require('../config/uploadDir');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/octet-stream', // some browsers send this for .xlsx/.csv
]);
const ALLOWED_EXTS = new Set(['.csv', '.txt', '.xlsx', '.xls', '.xlsm', '.pdf', '.jpg', '.jpeg', '.png']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
    const rand = crypto.randomBytes(6).toString('hex');
    cb(null, `${Date.now()}-${rand}-${safe}${ext && !file.originalname.endsWith(ext) ? ext : ''}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    // Accept if either the MIME type OR the file extension is on our allow-list.
    // Browsers/OSes are inconsistent with MIME types for spreadsheets and CSV.
    if (ALLOWED_MIME.has(file.mimetype) || ALLOWED_EXTS.has(ext)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${file.mimetype || ext || 'unknown'}. Allowed: XLSX, CSV, PDF.`));
  },
});

module.exports = upload;
