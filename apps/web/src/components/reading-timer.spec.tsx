import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ReadingTimer } from "./reading-timer";

describe("ReadingTimer", () => {
  it("renders the formatted time", () => {
    const { container } = render(<ReadingTimer time={5} />);
    expect(container.textContent).toBe("00:05");
  });

  it("renders hours when over an hour", () => {
    const { container } = render(<ReadingTimer time={3665} />);
    expect(container.textContent).toBe("1:01:05");
  });

  it("renders zero seconds as 00:00", () => {
    const { container } = render(<ReadingTimer time={0} />);
    expect(container.textContent).toBe("00:00");
  });
});
