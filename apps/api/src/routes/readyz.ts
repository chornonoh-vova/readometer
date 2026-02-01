import { Hono } from "hono";
import { db } from "../lib/database";
import { sql } from "kysely";

const readyz = new Hono();

readyz.get("/", async (c) => {
  try {
    await sql`SELECT 1 as one`.execute(db);
    return c.json({ status: "ready" });
  } catch (err) {
    console.error(err);
    c.status(503);
    return c.json({ status: "not-ready" });
  }
});

export default readyz;
