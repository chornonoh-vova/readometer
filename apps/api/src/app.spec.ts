import { describe, it, expect } from "vitest";
import app from "./app";
import { call } from "../test/helpers/request";

describe("middleware", () => {
  describe("CSRF", () => {
    it("allows GET without an Origin header", async () => {
      const response = await app.request("/api/healthz", { method: "GET" });

      expect(response.status).toBe(200);
    });

    it("blocks POST with a cross-origin Origin header", async () => {
      const response = await app.request("/api/books", {
        method: "POST",
        headers: { origin: "http://evil.example" },
      });

      expect(response.status).toBe(403);
    });

    it("blocks POST with no Origin header", async () => {
      const response = await app.request("/api/books", { method: "POST" });

      expect(response.status).toBe(403);
    });

    it("allows POST with a matching Origin header", async () => {
      // 401 from requireAuth means CSRF passed — the request reached auth
      const response = await call("POST", "/api/books", {
        body: {},
      });

      expect(response.status).toBe(401);
    });
  });

  describe("secure headers", () => {
    it("sets expected security headers on every response", async () => {
      const response = await call("GET", "/api/healthz");

      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
      expect(response.headers.get("strict-transport-security")).toMatch(
        /max-age=\d+/,
      );
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    });
  });

  describe("server timing", () => {
    it("emits a Server-Timing header on every response", async () => {
      const response = await call("GET", "/api/healthz");

      expect(response.headers.get("server-timing")).toMatch(/total;dur=/);
    });
  });

  describe("request ID", () => {
    it("sets an X-Request-Id header on responses", async () => {
      const response = await call("GET", "/api/healthz");

      expect(response.headers.get("x-request-id")).toMatch(/^[\w-]{20,}$/);
    });

    it("echoes a caller-supplied X-Request-Id", async () => {
      const id = "my-trace-id-12345";
      const response = await call("GET", "/api/healthz", {
        headers: { "x-request-id": id },
      });

      expect(response.headers.get("x-request-id")).toBe(id);
    });
  });
});
