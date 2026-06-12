import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReadingSession } from "@/lib/reading-sessions";
import { makeReadingSession } from "../../test/fixtures";

vi.mock("@/lib/reading-sessions", () => ({
  useReadingSessionsSuspenseQuery: (runId: string) => ({
    data: mockSessions[runId] ?? [],
  }),
}));

vi.mock("./reading-time", () => ({
  ReadingTime: ({ value }: { value: number }) => (
    <span data-testid="reading-time">{value}</span>
  ),
}));

const { ReadingRunStats } = await import("./reading-run-stats");

const mockSessions: Record<string, ReadingSession[]> = {};

beforeEach(() => {
  for (const key in mockSessions) delete mockSessions[key];
});

function renderStats(sessions: ReadingSession[]) {
  mockSessions["run-1"] = sessions;
  return render(<ReadingRunStats runId="run-1" />);
}

describe("ReadingRunStats", () => {
  it("renders nothing when there are no sessions", () => {
    const { container } = renderStats([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the Stats heading and six stat cards", () => {
    const { container } = renderStats([makeReadingSession()]);
    expect(screen.getByRole("heading", { name: "Stats" })).toBeInTheDocument();
    expect(container.querySelectorAll("li")).toHaveLength(6);
  });

  it("displays the computed stats in the cards", () => {
    renderStats([
      makeReadingSession({
        readPages: 30,
        readTime: 1800,
        startTime: "2024-03-10T09:00:00.000Z",
      }),
      makeReadingSession({
        readPages: 90,
        readTime: 5400,
        startTime: "2024-03-11T09:00:00.000Z",
      }),
    ]);

    expect(screen.getByText("60 pages per hour")).toBeInTheDocument();
    expect(screen.getByText("reading for 2 days")).toBeInTheDocument();
    expect(screen.getByText("2 days longest streak")).toBeInTheDocument();
    expect(screen.getByText("2 reading sessions")).toBeInTheDocument();

    const [totalTime, averageTime] = screen.getAllByTestId("reading-time");
    expect(totalTime).toHaveTextContent(/^7200$/);
    expect(averageTime).toHaveTextContent(/^3600$/);
  });

  it("uses singular forms for counts of one", () => {
    renderStats([
      makeReadingSession({
        readPages: 1,
        readTime: 3600,
        startTime: "2024-03-10T09:00:00.000Z",
      }),
    ]);

    expect(screen.getByText("1 page per hour")).toBeInTheDocument();
    expect(screen.getByText("reading for 1 day")).toBeInTheDocument();
    expect(screen.getByText("1 day longest streak")).toBeInTheDocument();
    expect(screen.getByText("1 reading session")).toBeInTheDocument();
  });
});
