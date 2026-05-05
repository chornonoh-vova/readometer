import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { BooksListLoading } from "./books-list-loading";

describe("BooksListLoading", () => {
  it("renders five skeleton placeholders", () => {
    const { container } = render(<BooksListLoading />);
    expect(container.firstElementChild?.children).toHaveLength(5);
  });
});
