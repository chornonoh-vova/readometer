import { vi } from "vitest";

vi.mock("../../src/lib/redis", () => {
  const store = new Map<string, string>();

  return {
    redisClient: {
      async get(key: string) {
        return store.get(key) ?? null;
      },
      async set(key: string, value: string) {
        store.set(key, value);
        return "OK";
      },
      async setex(key: string, _ttl: number, value: string) {
        store.set(key, value);
        return "OK";
      },
      async del(...keys: string[]) {
        let count = 0;
        for (const key of keys) {
          if (store.delete(key)) count++;
        }
        return count;
      },
      async keys(pattern: string) {
        const prefix = pattern.replace(/\*$/, "");
        return [...store.keys()].filter((key) => key.startsWith(prefix));
      },
      async call() {
        throw new Error("ERR unknown command");
      },
      async eval() {
        throw new Error("eval is not implemented in the redis mock");
      },
    },
  };
});
