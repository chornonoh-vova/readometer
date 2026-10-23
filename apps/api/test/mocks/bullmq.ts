import { vi } from "vitest";

export const queueAddMock = vi.fn(
  async (
    name: string,
    data: unknown,
    opts?: { jobId?: string },
  ): Promise<{ id: string; name: string; data: unknown }> => ({
    id: opts?.jobId ?? "test-job-id",
    name,
    data,
  }),
);

// the constructor runs once at import, and vitest clears mock call history
// before every test, so the fake keeps its arguments on the instance instead
vi.mock("bullmq", () => ({
  Queue: vi.fn(function (name: string, opts: unknown) {
    return { name, opts, add: queueAddMock };
  }),
}));
