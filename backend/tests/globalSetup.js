import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');
// Use absolute path so Prisma always writes the DB to backend/tests/test.db
const TEST_DB_PATH = path.resolve(backendDir, 'tests', 'test.db');

export default async function globalSetup() {
  const databaseUrl = `file:${TEST_DB_PATH}`;
  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET = 'test-secret';
  process.env.EMAIL_ENABLED = 'false';
  process.env.NODE_ENV = 'test';

  execSync('npx prisma db push --force-reset', {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}
