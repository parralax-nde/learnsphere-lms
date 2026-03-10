import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function globalSetup() {
  process.env.DATABASE_URL = 'file:./tests/test.db';
  process.env.JWT_SECRET = 'test-secret';
  process.env.EMAIL_ENABLED = 'false';
  process.env.NODE_ENV = 'test';

  execSync('npx prisma db push --force-reset', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: 'file:./tests/test.db' },
    stdio: 'inherit',
  });
}
