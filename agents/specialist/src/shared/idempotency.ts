import { createHash } from 'node:crypto';

export function buildIdempotencyKey(parts: Record<string, unknown>): string {
  const stable = JSON.stringify(Object.keys(parts).sort().reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = parts[key];
    return acc;
  }, {}));

  return createHash('sha256').update(stable).digest('hex');
}
