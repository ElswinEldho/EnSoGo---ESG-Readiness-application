'use strict';
/**
 * pagination — shared helpers for admin controller list endpoints.
 *
 * Every admin list endpoint uses the same query-param contract and returns the
 * same response envelope.  Centralising this prevents drift and makes adding
 * new list endpoints trivial.
 *
 * Standard query params: page, limit, sortBy, sortOrder
 * Standard response:     { data: [...], pagination: { page, limit, total, pages } }
 */

/**
 * Parses standard pagination / sort parameters from req.query.
 *
 * @param {object} query               req.query object
 * @param {object} [defaults]          Optional overrides for default values
 * @param {number} [defaults.page=1]
 * @param {number} [defaults.limit=20]
 * @param {string} [defaults.sortBy='createdAt']
 * @param {string} [defaults.sortOrder='desc']
 * @returns {{ page: number, limit: number, skip: number, sort: object }}
 */
function parsePaginationParams(query, defaults = {}) {
  const page      = Math.max(1, Number(query.page      || defaults.page      || 1));
  const limit     = Math.max(1, Number(query.limit     || defaults.limit     || 20));
  const sortBy    = query.sortBy    || defaults.sortBy    || 'createdAt';
  const sortOrder = query.sortOrder || defaults.sortOrder || 'desc';
  const skip      = (page - 1) * limit;
  const sort      = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  return { page, limit, skip, sort };
}

/**
 * Builds the standard paginated response envelope.
 *
 * @param {Array}  data
 * @param {number} total   Total number of matching documents (for page count)
 * @param {number} page    Current page number
 * @param {number} limit   Page size
 * @returns {{ data: Array, pagination: { page, limit, total, pages } }}
 */
function paginatedResponse(data, total, page, limit) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

module.exports = { parsePaginationParams, paginatedResponse };
