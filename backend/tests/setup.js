import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Use an isolated test database
process.env.DATABASE_URL = `file:${path.join(ROOT, 'test.db')}`;
process.env.JWT_SECRET = 'test-secret';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.AWS_REGION = 'us-east-1';

const prisma = new PrismaClient();

beforeAll(async () => {
  execSync('npx prisma db push --force-reset', {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: 'ignore',
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
