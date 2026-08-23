/**
 * Public site origin for emails / absolute links.
 * FRONTEND_URL may be a comma-separated CORS list — use the first entry only.
 */
function frontendBase() {
  const raw = String(process.env.FRONTEND_URL || 'http://localhost:5173');
  const first = raw.split(',')[0].trim().replace(/\/$/, '');
  return first || 'http://localhost:5173';
}

module.exports = { frontendBase };
