import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookItemCover } from "./book-item-cover";

describe("BookItemCover", () => {
  it("renders the cover image when coverId is set", () => {
    render(
      <BookItemCover
        book={{ title: "Foo", coverId: "abc", coverColor: undefined }}
      />,
    );
    const img = screen.getByRole("img", { name: "Cover image for book Foo" });
    expect(img).toHaveAttribute("src", "/api/covers/abc-sm.webp");
  });

  it('renders "No cover" placeholder when coverId is missing', () => {
    render(
      <BookItemCover
        book={{ title: "Foo", coverId: undefined, coverColor: undefined }}
      />,
    );
    expect(screen.getByText("No cover")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("applies coverColor as inline background", () => {
    const { container } = render(
      <BookItemCover
        book={{ title: "Foo", coverId: "abc", coverColor: "#dc7702" }}
      />,
    );
    const media = container.firstElementChild as HTMLElement;
    expect(media).toHaveStyle({ backgroundColor: "#dc7702" });
  });
});
