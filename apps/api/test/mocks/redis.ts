import { vi } from "vitest";

const store = new Map<string, string>();
const ttls = new Map<string, number>();

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
  async incr(key: string) {
    const next = Number(store.get(key) ?? "0") + 1;
    store.set(key, String(next));
    return next;
  },
  async expire(key: string, seconds: number) {
    if (!store.has(key)) return 0;
    ttls.set(key, seconds);
    return 1;
  },
  async ttl(key: string) {
    if (!store.has(key)) return -2;
    return ttls.get(key) ?? -1;
  },
  /** Supports the chained `.incr(k).expire(k, s).exec()` shape only. */
  multi() {
    const ops: Array<() => Promise<unknown>> = [];
    const chain = {
      incr(key: string) {
        ops.push(() => redisMock.incr(key));
        return chain;
      },
      expire(key: string, seconds: number) {
        ops.push(() => redisMock.expire(key, seconds));
        return chain;
      },
      async exec() {
        const out: Array<[Error | null, unknown]> = [];
        for (const op of ops) out.push([null, await op()]);
        return out;
      },
    };
    return chain;
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

/**
 * The store is module-level and shared. Without this reset, better-auth's
 * rateLimit counters and any other cached state leak between tests, so a spec
 * inherits budget already spent by whatever ran before it.
 */
export function resetRedisMock(): void {
  store.clear();
  ttls.clear();
}

vi.mock("../../src/lib/redis", () => ({
  redisClient: redisMock,
}));
