import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReadingSession } from "@/lib/reading-sessions";

vi.mock("./edit-reading-session-dialog", () => ({
  EditReadingSessionDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="Edit session dialog" /> : null,
}));

vi.mock("./delete-reading-session-alert", () => ({
  DeleteReadingSessionAlert: ({ open }: { open: boolean }) =>
    open ? <div role="alertdialog" aria-label="Delete session dialog" /> : null,
}));

const { ReadingSessionItem } = await import("./reading-session-item");

const session: ReadingSession & { num: number } = {
  id: "s1",
  userId: "u1",
  runId: "r1",
  startPage: 50,
  endPage: 75,
  readPages: 25,
  startTime: "2024-04-15T10:00:00.000Z",
  endTime: "2024-04-15T11:00:00.000Z",
  readTime: 3600,
  num: 3,
};

describe("ReadingSessionItem", () => {
  it("renders the session number", () => {
    render(
      <ReadingSessionItem
        length={3}
        readingSession={session}
        bookId="b1"
        totalPages={300}
      />,
    );
    expect(screen.getByText("Session 3")).toBeInTheDocument();
  });

  it("shows the page range and read page count", () => {
    render(
      <ReadingSessionItem
        length={3}
        readingSession={session}
        bookId="b1"
        totalPages={300}
      />,
    );
    expect(screen.getByText(/Pages 50.75 . 25 pages/)).toBeInTheDocument();
  });

  it("shows the formatted read time", () => {
    render(
      <ReadingSessionItem
        length={3}
        readingSession={session}
        bookId="b1"
        totalPages={300}
      />,
    );
    expect(screen.getByText("1:00:00")).toBeInTheDocument();
  });

  it("renders the session menu button with an accessible label", () => {
    render(
      <ReadingSessionItem
        length={3}
        readingSession={session}
        bookId="b1"
        totalPages={300}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Open session #3 menu" }),
    ).toBeInTheDocument();
  });
});
