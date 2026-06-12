import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReadingSession } from "@/lib/reading-sessions";
import { makeReadingSession } from "../../test/fixtures";

vi.mock("@/lib/reading-sessions", () => ({
  useReadingSessionsSuspenseQuery: (runId: string) => ({
    data: mockSessions[runId] ?? [],
  }),
}));

vi.mock("@/lib/format", () => ({
  formatDate: (date: string) => `formatted:${date.slice(0, 10)}`,
}));

vi.mock("./reading-session-item", () => ({
  ReadingSessionItem: ({
    readingSession,
  }: {
    readingSession: ReadingSession;
  }) => <li data-testid="session-item">{readingSession.id}</li>,
}));

vi.mock("./reading-time", () => ({
  ReadingTime: ({ value }: { value: number }) => (
    <span data-testid="day-read-time">{value}</span>
  ),
}));

const { ReadingSessionsList } = await import("./reading-sessions-list");

const mockSessions: Record<string, ReadingSession[]> = {};

beforeEach(() => {
  for (const key in mockSessions) delete mockSessions[key];
});

function renderList({ num = 1, runId = "r1" } = {}) {
  return render(
    <ReadingSessionsList
      num={num}
      runId={runId}
      bookId="book-1"
      totalPages={300}
    />,
  );
}

describe("ReadingSessionsList", () => {
  it("renders nothing when there are no sessions", () => {
    mockSessions["empty-run"] = [];
    const { container } = renderList({ runId: "empty-run" });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the Sessions heading and a toggle button when sessions exist", () => {
    mockSessions["r1"] = [makeReadingSession()];
    renderList({ num: 2 });

    expect(
      screen.getByRole("heading", { name: "Sessions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Toggle sessions for run 2" }),
    ).toBeInTheDocument();
  });

  it("is collapsed by default", () => {
    mockSessions["r1"] = [makeReadingSession()];
    renderList();

    expect(screen.queryByTestId("session-item")).not.toBeInTheDocument();
  });

  it("shows sessions grouped under their formatted date after expanding", async () => {
    const user = userEvent.setup();
    mockSessions["r1"] = [makeReadingSession()];
    renderList();

    await user.click(
      screen.getByRole("button", { name: "Toggle sessions for run 1" }),
    );

    expect(screen.getByText("formatted:2024-03-10")).toBeInTheDocument();
    expect(screen.getByTestId("session-item")).toBeInTheDocument();
  });

  it("shows the total reading time for each day", async () => {
    const user = userEvent.setup();
    mockSessions["r1"] = [
      makeReadingSession({
        startTime: "2024-03-11T09:00:00.000Z",
        readTime: 600,
      }),
      makeReadingSession({
        startTime: "2024-03-10T20:00:00.000Z",
        readTime: 3600,
      }),
      makeReadingSession({
        startTime: "2024-03-10T09:00:00.000Z",
        readTime: 1800,
      }),
    ];
    renderList();

    await user.click(
      screen.getByRole("button", { name: "Toggle sessions for run 1" }),
    );

    const dayTimes = screen.getAllByTestId("day-read-time");
    expect(dayTimes).toHaveLength(2);
    expect(dayTimes[0]).toHaveTextContent(/^600$/);
    expect(dayTimes[1]).toHaveTextContent(/^5400$/);
  });
});
