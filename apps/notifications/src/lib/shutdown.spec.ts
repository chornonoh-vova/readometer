import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  closeRedisClient,
  onShutdown,
  runShutdown,
  type Closer,
} from "./shutdown.ts";

const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  consoleLog.mockClear();
  consoleError.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("runShutdown", () => {
  it("closes resources in the order they are listed", async () => {
    const closed: string[] = [];
    const closers: Closer[] = ["http", "queue", "database"].map((name) => ({
      name,
      close: async () => {
        closed.push(name);
      },
    }));

    await expect(runShutdown(closers, 1000)).resolves.toBe(0);
    expect(closed).toEqual(["http", "queue", "database"]);
  });

  it("keeps closing the remaining resources when one fails", async () => {
    const closed: string[] = [];
    const closers: Closer[] = [
      {
        name: "http",
        close: async () => {
          closed.push("http");
        },
      },
      {
        name: "queue",
        close: async () => {
          throw new Error("boom");
        },
      },
      {
        name: "database",
        close: async () => {
          closed.push("database");
        },
      },
    ];

    await expect(runShutdown(closers, 1000)).resolves.toBe(0);
    expect(closed).toEqual(["http", "database"]);
    expect(consoleError).toHaveBeenCalledWith(
      "shutdown: queue failed to close",
      expect.any(Error),
    );
  });

  it("gives up with exit code 1 when a closer never settles", async () => {
    vi.useFakeTimers();
    const closers: Closer[] = [
      { name: "http", close: () => new Promise(() => {}) },
    ];

    const result = runShutdown(closers, 8000);
    await vi.advanceTimersByTimeAsync(8000);

    await expect(result).resolves.toBe(1);
    expect(consoleError).toHaveBeenCalledWith(
      "shutdown: timed out after 8000ms while closing http",
    );
  });

  it("clears the deadline timer once everything has drained", async () => {
    vi.useFakeTimers();

    await expect(
      runShutdown([{ name: "http", close: () => undefined }], 8000),
    ).resolves.toBe(0);

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("closeRedisClient", () => {
  function fakeClient(status: string, quit = vi.fn(async () => "OK")) {
    return { status, quit, disconnect: vi.fn() };
  }

  // `quit` is an ordinary command, so sending it to a client in these states
  // would either dial Redis or reject — see the comment in shutdown.ts
  it("disconnects a lazy client that never connected, without sending a command", async () => {
    const client = fakeClient("wait");

    await closeRedisClient(client);

    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect(client.quit).not.toHaveBeenCalled();
  });

  it("disconnects an already-closed client, without sending a command", async () => {
    const client = fakeClient("end");

    await closeRedisClient(client);

    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect(client.quit).not.toHaveBeenCalled();
  });

  it("quits a connected client", async () => {
    const client = fakeClient("ready");

    await closeRedisClient(client);

    expect(client.quit).toHaveBeenCalledTimes(1);
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it("falls back to disconnect when quit rejects", async () => {
    const client = fakeClient(
      "ready",
      vi.fn(async () => {
        throw new Error("Connection is closed.");
      }),
    );

    await expect(closeRedisClient(client)).resolves.toBeUndefined();
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });
});

describe("onShutdown", () => {
  const exit = vi
    .spyOn(process, "exit")
    .mockImplementation((() => {}) as never);

  afterEach(() => {
    exit.mockClear();
  });

  /**
   * Registers `closers` and returns the captured signal handlers, instead of
   * letting real listeners onto `process`.
   */
  function install(closers: Closer[]) {
    const handlers = new Map<string, () => void>();
    const on = vi.spyOn(process, "on").mockImplementation(((
      event: string,
      handler: () => void,
    ) => {
      handlers.set(event, handler);
      return process;
    }) as unknown as typeof process.on);

    try {
      onShutdown(closers);
    } finally {
      // stop intercepting immediately so nothing else loses its listeners
      on.mockRestore();
    }

    return handlers;
  }

  it("drains the closers and exits 0 on SIGTERM", async () => {
    const close = vi.fn(async () => {});
    const handlers = install([{ name: "http", close }]);

    expect([...handlers.keys()]).toEqual(["SIGTERM", "SIGINT"]);

    handlers.get("SIGTERM")!();

    await vi.waitFor(() => {
      expect(exit).toHaveBeenCalledWith(0);
    });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("ignores a second signal while a drain is already in progress", async () => {
    let release = () => {};
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const close = vi.fn(() => blocked);
    const handlers = install([{ name: "http", close }]);

    handlers.get("SIGTERM")!();
    handlers.get("SIGINT")!();

    expect(consoleLog).toHaveBeenCalledWith(
      "shutdown: already shutting down, ignoring SIGINT",
    );

    release();

    await vi.waitFor(() => {
      expect(exit).toHaveBeenCalledTimes(1);
    });
    expect(close).toHaveBeenCalledTimes(1);
  });
});
