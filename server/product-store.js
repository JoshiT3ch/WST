import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

// Listings are stored separately from the seeded catalogue and private contact messages.
export function createProductStore(dataDir) {
  let pending = Promise.resolve();
  const file = join(dataDir, 'products.jsonl');

  return {
    async list() {
      try {
        const content = await readFile(file, 'utf8');
        return content.split('\n').filter(Boolean).map(line => JSON.parse(line));
      } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
      }
    },
    async save(fields) {
      const record = { id: randomUUID(), ...fields, createdAt: new Date().toISOString() };
      const write = pending.then(async () => {
        await mkdir(dataDir, { recursive: true });
        await appendFile(file, `${JSON.stringify(record)}\n`, { mode: 0o600 });
      });
      pending = write.catch(() => {});
      await write;
      return record;
    }
  };
}
