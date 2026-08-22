import { start } from "./app";
import { resourceClosers } from "./lib/resources";
import { onShutdown } from "./lib/shutdown";

const server = start();

// order matters: stop accepting requests first, and close the database last so
// in-flight requests can still finish their queries
onShutdown([
  // `stop()` without arguments leaves in-flight requests alone and resolves once
  // they have drained
  { name: "http", close: () => server.stop() },
  ...resourceClosers,
]);
