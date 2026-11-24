export const env = {
  PORT: Number(process.env.PORT ?? 3000),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  DB_PATH: process.env.DB_PATH ?? 'data/catalog.db',
  // Directory of the built frontend to serve alongside the API (set in the Docker image). Unset in dev,
  // where Vite serves the UI and proxies /api.
  STATIC_DIR: process.env.STATIC_DIR,
  // AI suggestions turn on only when a key is present. `||` because Compose passes unset vars as ''.
  AI_ENABLED: Boolean(process.env.ANTHROPIC_API_KEY),
  AI_MODEL: process.env.AI_MODEL || 'claude-opus-5-5',
};
