// Upload logic has been moved to utils/upload.js.
// This file is a compatibility shim — it re-exports from the canonical location.
// All new imports should point directly to '../utils/upload'.
module.exports = require('../utils/upload');
