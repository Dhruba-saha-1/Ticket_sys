// Loaded before every test file, before src/config/env is imported.
Object.assign(process.env, {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  MONGODB_URI: 'mongodb://set-by-test-helper',
  JWT_ACCESS_SECRET: 'test-access-secret-at-least-32-characters',
  JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-characters',
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  MAIL_FROM: 'no-reply@example.com',
  APP_ORIGIN: 'http://localhost:3000',
  API_ORIGIN: 'http://localhost:4000',
  RATE_LIMIT_ENABLED: 'false',
});
