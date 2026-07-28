import { vi } from "vitest";

const store = new Map<string, string>();

export const redisMock = {
  async ping() {
    return "PONG";
  },
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
  async eval(script: string, _numKeys: number, key: string) {
    if (script.includes("INCR")) {
      const next = Number(store.get(key) ?? "0") + 1;
      store.set(key, String(next));
      return next;
    }
    if (script.includes("DEL")) {
      const value = store.get(key) ?? null;
      if (value !== null) store.delete(key);
      return value;
    }
    throw new Error(`eval: unrecognized script in the redis mock: ${script}`);
  },
};

vi.mock("../../src/lib/redis", () => ({
  redisClient: redisMock,
}));
