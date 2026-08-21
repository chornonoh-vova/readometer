import { describe, it, expect } from "vitest";
import { v7 as uuidv7 } from "uuid";
import { call } from "../../test/helpers/request";
import { makeUser, makeBook } from "../../test/helpers/factories";
import { RATE_LIMITS } from "../lib/limits";
import { WRITE_METHODS } from "./writeRateLimit";

describe("WRITE_METHODS", () => {
  it("covers the mutating verbs and nothing else", () => {
    expect([...WRITE_METHODS].sort()).toEqual([
      "DELETE",
      "PATCH",
      "POST",
      "PUT",
    ]);
  });
});

describe("write rate limit", () => {
  const newBook = (i: number) => ({
    id: uuidv7(),
    title: `Book ${i}`,
    totalPages: 300,
  });

  async function exhaust(user: Awaited<ReturnType<typeof makeUser>>) {
    for (let i = 0; i < RATE_LIMITS.writesPerWindow; i++) {
      const response = await call("POST", "/api/books", {
        as: user,
        body: newBook(i),
      });
      expect(response.status).toBe(201);
    }
  }

  it("allows reads without consuming budget", async () => {
    const user = await makeUser();

    for (let i = 0; i < RATE_LIMITS.writesPerWindow + 5; i++) {
      const response = await call("GET", "/api/books", { as: user });
      expect(response.status).toBe(200);
    }
  });

  it("rejects the write past the hourly ceiling with 429", async () => {
    const user = await makeUser();
    await exhaust(user);

    const blocked = await call("POST", "/api/books", {
      as: user,
      body: newBook(999),
    });

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    const body = (await blocked.json()) as { message: string };
    expect(body.message).toContain("Too many");
  });

  it("counts each user separately", async () => {
    const [user, other] = await Promise.all([makeUser(), makeUser()]);
    await exhaust(other);

    const response = await call("POST", "/api/books", {
      as: user,
      body: newBook(0),
    });

    expect(response.status).toBe(201);
  });

  it("counts DELETE against the ceiling", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id });
    await exhaust(user);

    const response = await call("DELETE", `/api/books/${book.id}`, {
      as: user,
    });

    expect(response.status).toBe(429);
  });
});
