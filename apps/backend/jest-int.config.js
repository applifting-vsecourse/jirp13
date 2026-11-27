// Integration tests (`pnpm backend test:int`): real HTTP requests against the
// Nest app and a real Postgres database. Unit tests keep the config in
// package.json.
//
// better-auth and Prisma load ES modules, which Jest supports only when Node
// runs with --experimental-vm-modules (set in the `test:int` script).
module.exports = {
  rootDir: './',
  testEnvironment: 'node',
  testRegex: '\\.int-spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transform: { '^.+\\.(t|j)sx?$': 'ts-jest' },
  globalSetup: '<rootDir>/src/testing/int-global-setup.ts',
  setupFiles: ['<rootDir>/src/testing/int-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/testing/int-clean-database.ts'],
  // All test files share one database, so they must not run in parallel.
  maxWorkers: 1,
};
