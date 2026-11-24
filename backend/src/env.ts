// Environment values are strings ("false" is truthy), so booleans and numbers are parsed explicitly.
// Empty strings count as unset, because Compose passes unset variables through as ''.
function parseBool(name: string, value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new Error(`${name} must be "true" or "false" (got "${value}")`);
}

// Express `trust proxy`: a hop count or subnet list. `true` would trust any client's X-Forwarded-For and
// let them dodge per-IP rate limits, so it is rejected.
function parseTrustProxy(value: string | undefined): false | number | string {
  if (value === undefined || value === '' || value === 'false') return false;
  if (value === 'true') throw new Error('TRUST_PROXY=true is unsafe; set a hop count (e.g. 1) or a subnet list');
  return /^\d+$/.test(value) ? Number(value) : value;
}

export const env = {
  PORT: Number(process.env.PORT ?? 3000),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  DB_PATH: process.env.DB_PATH ?? 'data/catalog.db',
  // Directory of the built frontend to serve alongside the API (set in the Docker image). Unset in dev,
  // where Vite serves the UI and proxies /api.
  STATIC_DIR: process.env.STATIC_DIR,
  ALLOW_SIGNUP: parseBool('ALLOW_SIGNUP', process.env.ALLOW_SIGNUP, true),
  COOKIE_SECURE: parseBool('COOKIE_SECURE', process.env.COOKIE_SECURE, process.env.NODE_ENV === 'production'),
  TRUST_PROXY: parseTrustProxy(process.env.TRUST_PROXY),
  SESSION_TTL_HOURS: Number(process.env.SESSION_TTL_HOURS || 168),
};

export const envInternals = { parseBool, parseTrustProxy };
