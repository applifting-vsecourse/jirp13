import { execSync } from 'child_process';
import { resolve } from 'path';
import { testDatabaseUrl } from './test-database-url';

/**
 * Runs once before all integration tests: creates the test database if it is
 * missing and applies the Prisma migrations to it.
 */
export default function setup(): void {
  execSync('pnpm exec prisma migrate deploy', {
    cwd: resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'inherit',
  });
}
