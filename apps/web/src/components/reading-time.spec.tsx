import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  formatReadingDuration,
  formatReadingTime,
  formatTime,
} from "@/lib/format";

const { ReadingTime } = await import("./reading-time");

const ISO_TIMESTAMP = "2024-04-15T10:30:00.000Z";
const DURATION_SECONDS = 3661; // 1h 1m 1s

describe("ReadingTime", () => {
  describe("with a number (duration)", () => {
    it("renders formatted duration text with ISO dateTime attribute", () => {
      render(<ReadingTime value={DURATION_SECONDS} />);
      const el = screen.getByText(formatReadingTime(DURATION_SECONDS));
      expect(el).toBeInTheDocument();
      expect(el).toHaveAttribute(
        "dateTime",
        formatReadingDuration(DURATION_SECONDS),
      );
    });
  });

  describe("with a string (wall-clock timestamp)", () => {
    it("renders formatted time text with raw ISO string as dateTime attribute", () => {
      render(<ReadingTime value={ISO_TIMESTAMP} />);
      const el = screen.getByText(formatTime(ISO_TIMESTAMP));
      expect(el).toBeInTheDocument();
      expect(el).toHaveAttribute("dateTime", ISO_TIMESTAMP);
    });
  });
});
