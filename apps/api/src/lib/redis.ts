import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("Redis URL is missing");
}

export const redisClient = new Redis(redisUrl, { lazyConnect: true });
