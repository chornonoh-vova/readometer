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

const YEAR_2024 = "from=2024-01-01&to=2025-01-01";

function activityUrl(tz: string, range = YEAR_2024) {
  return `/api/reading-activity?${range}&tz=${tz}`;
}

describe("/api/reading-activity", () => {
  it("returns 401 without auth", async () => {
    const response = await call("GET", activityUrl("UTC"));
    expect(response.status).toBe(401);
  });

  it("returns 400 for an invalid timezone", async () => {
    const user = await makeUser();
    const response = await call("GET", activityUrl("Mars/Olympus"), {
      as: user,
    });
    expect(response.status).toBe(400);
  });

  it("accepts legacy IANA aliases (Europe/Kiev) by mapping to the canonical name (Europe/Kyiv)", async () => {
    const user = await makeUser();
    const response = await call("GET", activityUrl("Europe/Kiev"), {
      as: user,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("returns an empty array when the user has no sessions in the range", async () => {
    const user = await makeUser();

    const response = await call("GET", activityUrl("UTC"), { as: user });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("sums read pages and read time per UTC day when tz=UTC", async () => {
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

    const response = await call("GET", activityUrl("UTC"), { as: user });

    expect(response.status).toBe(200);
    const rows = (await response.json()) as ActivityRow[];
    expect(rows).toHaveLength(1);
    expect(Number(rows[0]!.totalReadPages)).toBe(50);
    expect(Number(rows[0]!.totalReadTime)).toBe(2700);
    expect(rows[0]!.date.startsWith("2024-06-15")).toBe(true);
  });

  it("buckets by the user's local day when a UTC timestamp falls on a different calendar day in tz", async () => {
    const user = await makeUser();
    const book = await makeBook({ userId: user.id, totalPages: 500 });
    const run = await makeRun({
      userId: user.id,
      bookId: book.id,
      completedPages: 1,
    });

    // 03:00 UTC on June 16 is 23:00 on June 15 in America/New_York (EDT, UTC-4).
    await makeSession({
      userId: user.id,
      runId: run.id,
      startTime: new Date("2024-06-16T03:00:00Z"),
      endTime: new Date("2024-06-16T03:30:00Z"),
      readPages: 12,
      readTime: 1800,
    });

    const response = await call("GET", activityUrl("America/New_York"), {
      as: user,
    });

    const rows = (await response.json()) as ActivityRow[];
    expect(rows).toHaveLength(1);
    expect(rows[0]!.date).toBe("2024-06-15");
  });

  it("excludes sessions outside [from, to) in the requested tz", async () => {
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

    const response = await call("GET", activityUrl("UTC"), { as: user });

    const rows = (await response.json()) as ActivityRow[];
    expect(rows).toHaveLength(1);
    expect(rows[0]!.date.startsWith("2024-01-01")).toBe(true);
    expect(Number(rows[0]!.totalReadPages)).toBe(2);
  });

  it("returns 400 when `to` is not after `from`", async () => {
    const user = await makeUser();

    for (const range of [
      "from=2025-01-01&to=2024-01-01",
      "from=2024-01-01&to=2024-01-01",
    ]) {
      const response = await call("GET", activityUrl("UTC", range), {
        as: user,
      });
      expect(response.status).toBe(400);
    }
  });

  it("returns 400 for a range wider than any real view", async () => {
    const user = await makeUser();

    const response = await call(
      "GET",
      activityUrl("UTC", "from=2020-01-01&to=2024-01-01"),
      { as: user },
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for a malformed date", async () => {
    const user = await makeUser();

    const response = await call(
      "GET",
      activityUrl("UTC", "from=2024-1-1&to=2025-01-01"),
      { as: user },
    );

    expect(response.status).toBe(400);
  });

  it("spans a range that crosses a year boundary", async () => {
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
      startTime: new Date("2024-11-20T12:00:00Z"),
      endTime: new Date("2024-11-20T13:00:00Z"),
      readPages: 10,
      readTime: 3600,
    });
    await makeSession({
      userId: user.id,
      runId: run.id,
      startTime: new Date("2025-02-05T12:00:00Z"),
      endTime: new Date("2025-02-05T13:00:00Z"),
      readPages: 20,
      readTime: 1800,
    });
    await makeSession({
      userId: user.id,
      runId: run.id,
      startTime: new Date("2024-08-01T12:00:00Z"),
      endTime: new Date("2024-08-01T13:00:00Z"),
      readPages: 99,
      readTime: 99,
    });

    const response = await call(
      "GET",
      activityUrl("UTC", "from=2024-09-01&to=2025-09-01"),
      { as: user },
    );

    const rows = (await response.json()) as ActivityRow[];
    expect(rows.map((r) => r.date).sort()).toEqual([
      "2024-11-20",
      "2025-02-05",
    ]);
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

    const response = await call("GET", activityUrl("UTC"), { as: user });

    expect(await response.json()).toEqual([]);
  });
});
