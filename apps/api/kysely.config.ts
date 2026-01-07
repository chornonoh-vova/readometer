import { defineConfig, getKnexTimestampPrefix } from "kysely-ctl";
import { db } from "./src/lib/database.ts";

export default defineConfig({
  kysely: db,
  migrations: {
    migrationFolder: "./migrations",
    getMigrationPrefix: getKnexTimestampPrefix,
  },
});
