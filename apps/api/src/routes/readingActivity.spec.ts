import { describe, it, expect } from "vitest";
import { call } from "../../test/helpers/request";
import {
  makeBook,
  makeRun,
  makeSession,
  makeUser,
} from "../../test/helpers/factories";

type ActivityRow = {
  totalReadPages: string | number;
  totalReadTime: string | number;
  date: string;
};

describe("/api/reading-activity", () => {
  it("returns 401 without auth", async () => {
    const response = await call("GET", "/api/reading-activity?year=2024");
    expect(response.status).toBe(401);
  });

  it("returns an empty array when the user has no sessions in the year", async () => {
    const user = await makeUser();

    const response = await call("GET", "/api/reading-activity?year=2024", {
      as: user,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("sums read pages and read time per UTC day", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id, totalPages: 500 });
    const run = await makeRun({
      userId: user.id,
      bookId: book.id,
      completedPages: 1,
    });

    await makeSession({
      userId: user.id,
      runId: run.id,
      startTime: new Date("2024-06-15T09:00:00Z"),
      endTime: new Date("2024-06-15T10:00:00Z"),
      readPages: 30,
      readTime: 1800,
    });
    await makeSession({
      userId: user.id,
      runId: run.id,
      startTime: new Date("2024-06-15T22:00:00Z"),
      endTime: new Date("2024-06-15T22:30:00Z"),
      readPages: 20,
      readTime: 900,
    });

    const response = await call("GET", "/api/reading-activity?year=2024", {
      as: user,
    });

    expect(response.status).toBe(200);
    const rows = (await response.json()) as ActivityRow[];
    expect(rows).toHaveLength(1);
    expect(Number(rows[0]!.totalReadPages)).toBe(50);
    expect(Number(rows[0]!.totalReadTime)).toBe(2700);
    expect(rows[0]!.date.startsWith("2024-06-15")).toBe(true);
  });

  it("buckets sessions by startTime's UTC day when they span midnight", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id, totalPages: 500 });
    const run = await makeRun({
      userId: user.id,
      bookId: book.id,
      completedPages: 1,
    });

    await makeSession({
      userId: user.id,
      runId: run.id,
      startTime: new Date("2024-06-15T23:59:30Z"),
      endTime: new Date("2024-06-16T00:30:00Z"),
      readPages: 12,
      readTime: 1800,
    });

    const response = await call("GET", "/api/reading-activity?year=2024", {
      as: user,
    });

    const rows = (await response.json()) as ActivityRow[];
    expect(rows).toHaveLength(1);
    expect(rows[0]!.date.startsWith("2024-06-15")).toBe(true);
  });

  it("excludes sessions outside [year, year+1)", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id });
    const run = await makeRun({
      userId: user.id,
      bookId: book.id,
      completedPages: 1,
    });

    await makeSession({
      userId: user.id,
      runId: run.id,
      startTime: new Date("2023-12-31T23:00:00Z"),
      endTime: new Date("2023-12-31T23:30:00Z"),
      readPages: 1,
      readTime: 60,
    });
    await makeSession({
      userId: user.id,
      runId: run.id,
      startTime: new Date("2024-01-01T00:30:00Z"),
      endTime: new Date("2024-01-01T01:00:00Z"),
      readPages: 2,
      readTime: 120,
    });
    await makeSession({
      userId: user.id,
      runId: run.id,
      startTime: new Date("2025-01-01T00:30:00Z"),
      endTime: new Date("2025-01-01T01:00:00Z"),
      readPages: 4,
      readTime: 240,
    });

    const response = await call("GET", "/api/reading-activity?year=2024", {
      as: user,
    });

    const rows = (await response.json()) as ActivityRow[];
    expect(rows).toHaveLength(1);
    expect(rows[0]!.date.startsWith("2024-01-01")).toBe(true);
    expect(Number(rows[0]!.totalReadPages)).toBe(2);
  });

  it("scopes results to the caller", async () => {
    const user = await makeUser();
    const other = await makeUser();
    const book = await makeBook({ userId: other.id });
    const run = await makeRun({
      userId: other.id,
      bookId: book.id,
      completedPages: 1,
    });
    await makeSession({
      userId: other.id,
      runId: run.id,
      startTime: new Date("2024-03-10T12:00:00Z"),
      endTime: new Date("2024-03-10T13:00:00Z"),
      readPages: 10,
      readTime: 3600,
    });

    const response = await call("GET", "/api/reading-activity?year=2024", {
      as: user,
    });

    expect(await response.json()).toEqual([]);
  });
});
