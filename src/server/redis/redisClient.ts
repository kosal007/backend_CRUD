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

redisClient.on("error", (error) => {
  console.error("[Redis] connection error", error.message);
});

if (redisClient.status === "wait") {
  void redisClient.connect().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown Redis connect error";
    console.warn("[Redis] initial connect failed; continuing without Redis", message);
  });
}
