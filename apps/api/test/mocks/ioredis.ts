import { vi } from "vitest";
import { redisMock } from "./redis.ts";

vi.mock("ioredis", () => ({
  default: vi.fn(function () {
    return redisMock;
  }),
}));
