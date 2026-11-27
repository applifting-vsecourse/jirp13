import { testDatabaseUrl } from './test-database-url';

// The app reads its configuration from process.env only. Everything is set here
// so the tests behave the same with or without a local .env file.
Object.assign(process.env, {
  DATABASE_URL: testDatabaseUrl(),
  BETTER_AUTH_SECRET: 'integration_test_secret_not_for_production',
  SUPERADMIN_EMAIL: 'admin@example.com',
  SUPERADMIN_PASSWORD: 'adminpassword',
  BACKEND_URL: 'http://localhost:4050',
  FRONTEND_URL: 'http://localhost:3050',
  // Empty mail settings select the console mailer: tests never send real mail.
  RESEND_API_KEY: '',
  SMTP_HOST: '',
});
