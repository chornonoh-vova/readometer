/**
 * Graceful shutdown: drain in-flight work, close resources in dependency order.
 *
 * This file is duplicated verbatim in `apps/notifications/src/lib/shutdown.ts`.
 * Keep the two copies in sync.
 */

const DEFAULT_TIMEOUT_MS = 8000;

const SIGNALS = ["SIGTERM", "SIGINT"] as const;

type Signal = (typeof SIGNALS)[number];

export type Closer = {
  name: string;
  close: () => unknown | Promise<unknown>;
};

type RedisLike = {
  status: string;
  quit: () => Promise<unknown>;
  disconnect: () => void;
};

/**
 * Closes an ioredis client without dialing Redis just to hang up.
 *
 * `quit` is an ordinary command, so ioredis connects a `lazyConnect` client that
 * never connected ("wait") in order to send it, and rejects with "Connection is
 * closed" once the client is "end". `disconnect` handles both without I/O.
 */
export async function closeRedisClient(client: RedisLike): Promise<void> {
  if (client.status === "wait" || client.status === "end") {
    client.disconnect();
    return;
  }

  try {
    await client.quit();
  } catch {
    // the client can reach "end" between the status check and the command
    client.disconnect();
  }
}

/**
 * Runs `closers` in order and resolves with the exit code the process should
 * use: 0 if everything drained, 1 if `timeoutMs` elapsed first.
 *
 * Pure — never touches `process`, so tests can drive it directly.
 */
export async function runShutdown(
  closers: Closer[],
  timeoutMs: number,
): Promise<0 | 1> {
  let pending: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const drain = (async (): Promise<0> => {
    for (const closer of closers) {
      pending = closer.name;
      try {
        await closer.close();
        console.log(`shutdown: closed ${closer.name}`);
      } catch (err) {
        // one broken resource must not strand the closers behind it
        console.error(`shutdown: ${closer.name} failed to close`, err);
      }
    }
    pending = null;
    return 0;
  })();

  const deadline = new Promise<1>((resolve) => {
    // deliberately not unref'd: an unref'd timer lets the runtime exit before
    // the deadline can report which closer hung
    timer = setTimeout(() => {
      console.error(
        `shutdown: timed out after ${timeoutMs}ms while closing ${pending ?? "nothing"}`,
      );
      resolve(1);
    }, timeoutMs);
  });

  try {
    return await Promise.race([drain, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Registers SIGTERM/SIGINT handlers that drain `closers` and then exit.
 *
 * `closers` run in array order, so list them outermost-first: stop accepting new
 * work before closing what the in-flight work still depends on.
 */
export function onShutdown(closers: Closer[]): void {
  const timeoutMs =
    Number(process.env.SHUTDOWN_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  let draining = false;

  const handle = (signal: Signal) => {
    if (draining) {
      console.log(`shutdown: already shutting down, ignoring ${signal}`);
      return;
    }
    draining = true;

    console.log(`shutdown: received ${signal}, draining`);
    void runShutdown(closers, timeoutMs).then((code) => {
      console.log(`shutdown: exiting ${code}`);
      process.exit(code);
    });
  };

  for (const signal of SIGNALS) {
    process.on(signal, () => handle(signal));
  }
}
