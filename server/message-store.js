import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

// One process serializes appends so concurrent requests cannot interleave records.
export function createMessageStore(dataDir) {
  let pending = Promise.resolve();
  return {
    async save(fields) {
      const record = { id: randomUUID(), ...fields, createdAt: new Date().toISOString() };
      const write = pending.then(async () => {
        await mkdir(dataDir, { recursive: true });
        await appendFile(join(dataDir, 'messages.jsonl'), `${JSON.stringify(record)}\n`, { mode: 0o600 });
      });
      pending = write.catch(() => {});
      await write;
      return record;
    }
  };
}
