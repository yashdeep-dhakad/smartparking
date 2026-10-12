const mongoose = require('mongoose');

// Query-string values can be arrays/objects (e.g. ?city[$ne]=x). Only accept plain strings.
const str = (v) => (typeof v === 'string' ? v.trim() : undefined);
const oid = (v) => (typeof v === 'string' && mongoose.isValidObjectId(v) ? v : undefined);
const bool = (v) => (v === 'true' ? true : v === 'false' ? false : undefined);

function pageParams(query, defLimit = 12, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defLimit));
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = { str, oid, bool, pageParams };
