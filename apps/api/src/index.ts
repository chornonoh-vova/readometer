import { start } from "./app";
import { migrateToLatest } from "./lib/database";

if (process.argv.includes("migrate")) {
  await migrateToLatest();
  process.exit(0);
}

start();
