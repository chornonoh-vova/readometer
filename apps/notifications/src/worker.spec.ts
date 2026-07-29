import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { NOTIFICATIONS_QUEUE_NAME } from "notification-events";
import { verificationEmailRequestedEvent } from "../test/fixtures.ts";

const handleVerificationEmailRequestedMock = vi.fn(async () => undefined);
const handlePasswordResetRequestedMock = vi.fn(async () => undefined);

vi.mock("./handlers/index.ts", () => ({
  handlers: {
    "verification-email-requested": handleVerificationEmailRequestedMock,
    "password-reset-requested": handlePasswordResetRequestedMock,
  },
}));

const { worker } = await import("./worker.ts");

let connection: Redis;
let queue: Queue;

beforeAll(() => {
  connection = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
  });
  queue = new Queue(NOTIFICATIONS_QUEUE_NAME, {
    connection,
    prefix: "readometer",
  });
  worker.run();
});

afterAll(async () => {
  await worker.close();
  await queue.close();
  connection.disconnect();
});

function waitForJobResult(jobId: string): Promise<"completed" | "failed"> {
  return new Promise((resolve) => {
    const cleanup = () => {
      worker.off("completed", onCompleted);
      worker.off("failed", onFailed);
    };
    const onCompleted = (job: { id?: string }) => {
      if (job.id !== jobId) return;
      cleanup();
      resolve("completed");
    };
    const onFailed = (job: { id?: string } | undefined) => {
      if (job?.id !== jobId) return;
      cleanup();
      resolve("failed");
    };
    worker.on("completed", onCompleted);
    worker.on("failed", onFailed);
  });
}

describe("worker", () => {
  it("dispatches a valid job to the matching handler", async () => {
    const event = verificationEmailRequestedEvent({
      eventId: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
    });

    const result = waitForJobResult(event.eventId);
    await queue.add(event.type, event, { jobId: event.eventId });

    expect(await result).toBe("completed");
    expect(handleVerificationEmailRequestedMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: event.eventId }),
    );
  });

  it("fails the job when the payload does not match the event schema", async () => {
    const jobId = "worker-spec-job-2";
    const result = waitForJobResult(jobId);
    await queue.add(
      "verification-email-requested",
      { not: "valid" },
      { jobId },
    );

    expect(await result).toBe("failed");
    expect(handleVerificationEmailRequestedMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventId: jobId }),
    );
  });
});
