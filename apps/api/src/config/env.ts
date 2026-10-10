export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  publicApiBase: process.env.PUBLIC_API_BASE ?? 'http://localhost:4000/api'
};
