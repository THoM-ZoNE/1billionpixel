import Redis from "ioredis";

let redis: Redis | null = null;

try {
  redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  redis.on("error", (err) => {
    // Redis nem fut – silent fail, cache kimarad
    redis = null;
  });
} catch {
  redis = null;
}

export const cache = {
  get: async (key: string): Promise<string | null> => {
    if (!redis) return null;
    try { return await redis.get(key); } catch { return null; }
  },
  setex: async (key: string, ttl: number, value: string): Promise<void> => {
    if (!redis) return;
    try { await redis.setex(key, ttl, value); } catch { /* silent */ }
  },
};
