'use strict';
/**
 * fileUtils — shared file-system utilities used across routes and controllers.
 *
 * Centralises three patterns that were previously copy-pasted throughout the codebase:
 *   1. Silent single-file deletion (deleteFileSafely)
 *   2. Bulk deletion of stored upload files from UploadLog records (deleteUploadFiles)
 *   3. "N days ago" Date arithmetic (daysAgo)
 */

const fs   = require('fs');
const path = require('path');

/**
 * Deletes a file at the given absolute path.
 * Errors (file already gone, permission issues) are silently swallowed
 * so callers never need a try/catch for cleanup operations.
 *
 * @param {string} filePath  Absolute path to the file.
 */
function deleteFileSafely(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (_e) { /* already gone or inaccessible — ignore */ }
}

/**
 * Deletes the physical files referenced by an array of UploadLog records.
 * Skips entries whose storedName is absent or the sentinel value '-'
 * (used for manual-entry logs that have no associated file).
 *
 * @param {Array<{storedName?: string}>} logs       UploadLog documents (plain objects).
 * @param {string}                       uploadDir  Absolute path to the uploads directory.
 */
function deleteUploadFiles(logs, uploadDir) {
  for (const log of logs) {
    if (log.storedName && log.storedName !== '-') {
      deleteFileSafely(path.join(uploadDir, log.storedName));
    }
  }
}

/**
 * Returns a Date that is exactly `days` calendar days before the current moment.
 *
 * @param {number} days  Number of days to subtract from now.
 * @returns {Date}
 */
function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

module.exports = { deleteFileSafely, deleteUploadFiles, daysAgo };
