import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

const { BookDescriptionDialog } = await import("./book-description-dialog");

describe("BookDescriptionDialog", () => {
  it("renders the Description trigger button", () => {
    render(
      <BookDescriptionDialog title="My Book" description="Some content" />,
    );
    expect(
      screen.getByRole("button", { name: /description/i }),
    ).toBeInTheDocument();
  });

  it("does not show description content when closed", () => {
    render(
      <BookDescriptionDialog title="My Book" description="Hidden content" />,
    );
    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
  });

  it("opens and shows the description on trigger click", async () => {
    const user = userEvent.setup();
    render(
      <BookDescriptionDialog
        title="My Book"
        description="The full description"
      />,
    );
    await user.click(screen.getByRole("button", { name: /description/i }));
    expect(screen.getByText("The full description")).toBeInTheDocument();
  });

  it("shows the book title in the dialog description", async () => {
    const user = userEvent.setup();
    render(<BookDescriptionDialog title="My Book" description="Content" />);
    await user.click(screen.getByRole("button", { name: /description/i }));
    expect(screen.getByText(/My Book/)).toBeInTheDocument();
  });

  it("renders multi-line descriptions as separate paragraphs", async () => {
    const user = userEvent.setup();
    render(
      <BookDescriptionDialog
        title="My Book"
        description={"First paragraph\nSecond paragraph"}
      />,
    );
    await user.click(screen.getByRole("button", { name: /description/i }));
    expect(screen.getByText("First paragraph")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph")).toBeInTheDocument();
  });
});
