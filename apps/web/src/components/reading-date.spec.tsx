import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { formatDate } from "@/lib/format";

const { ReadingDate } = await import("./reading-date");

const ISO_DATE = "2024-04-15T10:30:00.000Z";

describe("ReadingDate", () => {
  it("renders formatted date text with raw ISO string as dateTime attribute", () => {
    render(<ReadingDate value={ISO_DATE} />);
    const el = screen.getByText(formatDate(ISO_DATE));
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("dateTime", ISO_DATE);
  });
});
