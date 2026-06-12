import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ReadingSessionsLoading } from "./reading-sessions-loading";

describe("ReadingSessionsLoading", () => {
  it("renders a collapsed header row with heading and toggle placeholders", () => {
    const { container } = render(<ReadingSessionsLoading />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons).toHaveLength(2);
  });
});
