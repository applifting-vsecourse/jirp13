import { PrismaService } from '@/core/prisma/prisma.service';

// Empties every table before each integration test. The list is read from the
// database, so tables added by future migrations are covered automatically.
const prisma = new PrismaService();

beforeEach(async () => {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  const names = tables.map(({ tablename }) => `"${tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} CASCADE`);
});

afterAll(async () => {
  await prisma.$disconnect();
});
