import { unlink } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function globalTeardown() {
  try {
    await unlink(path.resolve(__dirname, 'test.db'));
  } catch {
    // ignore if already gone
  }
}
