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

export const queueConstructorMock = vi.fn();

vi.mock("bullmq", () => ({
  Queue: vi.fn(function (name: string, opts: unknown) {
    queueConstructorMock(name, opts);
    return { add: queueAddMock };
  }),
}));
