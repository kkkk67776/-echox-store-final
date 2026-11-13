import fs from 'fs';
import path from 'path';

const inflightSyncs = new Set<Promise<void>>();

export function getDataDir(): string {
  const configured = (process.env.DATA_DIR || '').trim();
  const dir = configured ? path.resolve(configured) : process.cwd();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getDataFilePath(filename: string): string {
  return path.join(getDataDir(), filename);
}

export function atomicWriteJsonSync(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tmpPath, filePath);
}

export function isCloudPersistenceEnabled(): boolean {
  const url = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  return Boolean(url.startsWith('https://') && token.length > 0);
}

export async function loadCloudJson<T>(key: string): Promise<T | null> {
  if (!isCloudPersistenceEnabled()) return null;
  const url = process.env.UPSTASH_REDIS_REST_URL!.trim().replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!.trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { result?: string | null };
    if (!payload || typeof payload.result !== 'string' || !payload.result) {
      return null;
    }
    return JSON.parse(payload.result) as T;
  } catch (err) {
    console.warn(`[CloudPersistence] Notice loading ${key}:`, (err as Error)?.message || err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function pushCloudJson(key: string, data: unknown): void {
  if (!isCloudPersistenceEnabled()) return;
  const url = process.env.UPSTASH_REDIS_REST_URL!.trim().replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!.trim();

  const task = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      await fetch(`${url}/set/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain; charset=utf-8',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
    } catch (err) {
      console.warn(`[CloudPersistence] Notice syncing ${key}:`, (err as Error)?.message || err);
    } finally {
      clearTimeout(timer);
    }
  })();

  inflightSyncs.add(task);
  task.finally(() => {
    inflightSyncs.delete(task);
  });
}

export async function flushCloudWrites(): Promise<void> {
  if (inflightSyncs.size === 0) return;
  await Promise.allSettled(Array.from(inflightSyncs));
}
