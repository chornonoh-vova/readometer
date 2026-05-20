import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReadingSession } from "@/lib/reading-sessions";

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

const { ReadingSessionsList } = await import("./reading-sessions-list");

const mockSessions: Record<string, ReadingSession[]> = {};

beforeEach(() => {
  for (const key in mockSessions) delete mockSessions[key];
});

const session: ReadingSession = {
  id: "s1",
  userId: "u1",
  runId: "r1",
  startPage: 0,
  endPage: 50,
  readPages: 50,
  startTime: "2024-03-10T09:00:00.000Z",
  endTime: "2024-03-10T10:00:00.000Z",
  readTime: 3600,
};

describe("ReadingSessionsList", () => {
  it("renders nothing when there are no sessions", () => {
    mockSessions["empty-run"] = [];
    const { container } = render(
      <ReadingSessionsList
        defaultOpen={true}
        num={1}
        runId="empty-run"
        bookId="book-1"
        totalPages={300}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the Sessions heading and a toggle button when sessions exist", () => {
    mockSessions["r1"] = [session];
    render(
      <ReadingSessionsList
        defaultOpen={true}
        num={2}
        runId="r1"
        bookId="book-1"
        totalPages={300}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Sessions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Toggle sessions for run 2" }),
    ).toBeInTheDocument();
  });

  it("renders sessions grouped under their formatted date", () => {
    mockSessions["r1"] = [session];
    render(
      <ReadingSessionsList
        defaultOpen={true}
        num={1}
        runId="r1"
        bookId="book-1"
        totalPages={300}
      />,
    );

    expect(screen.getByText("formatted:2024-03-10")).toBeInTheDocument();
    expect(screen.getByTestId("session-item")).toBeInTheDocument();
  });
});
