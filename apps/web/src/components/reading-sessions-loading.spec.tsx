import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ReadingSessionsLoading } from "./reading-sessions-loading";

describe("ReadingSessionsLoading", () => {
  it("renders five skeleton placeholders", () => {
    const { container } = render(<ReadingSessionsLoading />);
    expect(container.firstElementChild?.children).toHaveLength(5);
  });
});
