/**
 * EnSoGo ID — secure, non-sequential, URL-safe public identifier.
 *
 * Format: ENSOGO-XXXXXXXX  (8 chars from a 32-char Crockford-style alphabet)
 * Entropy: 32^8 ≈ 1.1 trillion unique IDs; safe against enumeration attacks.
 *
 * The alphabet deliberately excludes visually confusing characters:
 *   0/O and 1/I removed → uses: A-Z (except I and O) + 2-9  (32 chars exactly)
 */

const crypto = require('crypto');

// 32 chars — excludes visually confusing 0/O, 1/I; L kept because 1 and I are already absent
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars

/**
 * Generates a new EnSoGo public ID.
 * Uses cryptographically secure random bytes (5 bytes = 40 bits → 8 × 5-bit chars).
 * @returns {string}  e.g. "ENSOGO-X7A92KD1"
 */
function generateEnsogoId() {
  const bytes = crypto.randomBytes(5); // 5 bytes × 8 bits = 40 bits → 8 × 5-bit indices
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += ALPHABET[(value >> bits) & 0x1f];
    }
  }

  // Pad to exactly 8 characters (should always be 8, but guard defensively)
  while (result.length < 8) {
    result += ALPHABET[crypto.randomBytes(1)[0] & 0x1f];
  }

  return `ENSOGO-${result.slice(0, 8)}`;
}

/**
 * Returns true if the given string looks like a valid EnSoGo ID.
 * Does NOT validate existence in the database — use DB lookup for that.
 * @param {string} id
 * @returns {boolean}
 */
function isEnsogoId(id) {
  return typeof id === 'string' && /^ENSOGO-[A-Z2-9]{8}$/.test(id);
}

module.exports = { generateEnsogoId, isEnsogoId };
