import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let mockIsMobile = false;

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockIsMobile,
}));

const { ResponsiveDrawerDialog } = await import("./responsive-drawer-dialog");

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  title: "Test Title",
  description: "Test description",
  close: <button>Dismiss</button>,
};

describe("ResponsiveDrawerDialog — desktop (Dialog)", () => {
  beforeEach(() => {
    mockIsMobile = false;
  });

  it("renders title, description, and body content", () => {
    render(
      <ResponsiveDrawerDialog {...baseProps}>
        <p>Dialog body</p>
      </ResponsiveDrawerDialog>,
    );
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
    expect(screen.getByText("Dialog body")).toBeInTheDocument();
  });

  it("renders the close button", () => {
    render(
      <ResponsiveDrawerDialog {...baseProps}>
        <p>Body</p>
      </ResponsiveDrawerDialog>,
    );
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("renders the optional trigger", () => {
    render(
      <ResponsiveDrawerDialog
        {...baseProps}
        open={false}
        trigger={<button>Open</button>}
      >
        <p>Body</p>
      </ResponsiveDrawerDialog>,
    );
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
  });

  it("renders the optional action slot", () => {
    render(
      <ResponsiveDrawerDialog {...baseProps} action={<button>Submit</button>}>
        <p>Body</p>
      </ResponsiveDrawerDialog>,
    );
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });
});

describe("ResponsiveDrawerDialog — mobile (Drawer)", () => {
  beforeEach(() => {
    mockIsMobile = true;
  });

  it("renders title, description, and body content", () => {
    render(
      <ResponsiveDrawerDialog {...baseProps}>
        <p>Drawer body</p>
      </ResponsiveDrawerDialog>,
    );
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
    expect(screen.getByText("Drawer body")).toBeInTheDocument();
  });

  it("renders the close button", () => {
    render(
      <ResponsiveDrawerDialog {...baseProps}>
        <p>Body</p>
      </ResponsiveDrawerDialog>,
    );
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });
});
