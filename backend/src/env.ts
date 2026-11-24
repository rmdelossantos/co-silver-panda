export const env = {
  PORT: Number(process.env.PORT ?? 3000),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  DB_PATH: process.env.DB_PATH ?? 'data/catalog.db',
};
