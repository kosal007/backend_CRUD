import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

const globalForRedis = globalThis as unknown as {
  redisClient?: Redis;
};

export const redisClient =
  globalForRedis.redisClient ??
  new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisClient = redisClient;
}

if (redisClient.status === "wait") {
  void redisClient.connect();
}
