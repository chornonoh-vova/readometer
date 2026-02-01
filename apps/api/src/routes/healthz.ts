import { Hono } from "hono";

const healthz = new Hono();

healthz.get("/", (c) => {
  return c.json({ status: "ok" });
});

export default healthz;
