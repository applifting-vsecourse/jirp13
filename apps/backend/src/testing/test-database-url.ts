const LOCAL_TEST_DATABASE_URL =
  'postgresql://quacker:quacker@localhost:5433/quacker_test';

/**
 * The database integration tests run against. Deliberately ignores
 * DATABASE_URL: that one points at the dev database, and the tests wipe every
 * table.
 */
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL || LOCAL_TEST_DATABASE_URL;
  const database = new URL(url).pathname.slice(1);
  if (!database.endsWith('_test')) {
    throw new Error(
      `Refusing to run integration tests against "${database}": ` +
        'the database name in TEST_DATABASE_URL must end with "_test".',
    );
  }
  return url;
}
