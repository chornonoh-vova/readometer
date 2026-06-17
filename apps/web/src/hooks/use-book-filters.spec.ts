import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { Book } from "@/lib/books";
import { useBookFilters } from "./use-book-filters";

const makeBook = (
  id: string,
  title: string,
  completedPages = 0,
  author?: string,
  abandoned = false,
): Book => ({
  id,
  userId: "u1",
  title,
  author,
  totalPages: 100,
  completedPages,
  abandoned,
  updatedAt: "2024-01-01",
  createdAt: "2024-01-01",
  lastUpdatedAt: "2024-01-01",
  lastRunId: `${id}-run`,
});

const books: Book[] = [
  makeBook("1", "The Great Gatsby", 0, "F. Scott Fitzgerald"),
  makeBook("2", "Dune", 50, "Frank Herbert"),
  makeBook("3", "1984", 100, "George Orwell"),
  makeBook("4", "Brave New World", 0, "Aldous Huxley"),
  makeBook("5", "Fahrenheit 451", 30, "Ray Bradbury", true),
];

describe("useBookFilters", () => {
  it("returns all books with no filters applied", () => {
    const { result } = renderHook(() => useBookFilters(books));
    expect(result.current.filteredBooks).toHaveLength(5);
  });

  it("hasFilters is false by default", () => {
    const { result } = renderHook(() => useBookFilters(books));
    expect(result.current.hasFilters).toBe(false);
  });

  describe("search", () => {
    it("filters by title (case-insensitive)", () => {
      const { result } = renderHook(() => useBookFilters(books));
      act(() => result.current.setSearch("gatsby"));
      expect(result.current.filteredBooks).toHaveLength(1);
      expect(result.current.filteredBooks[0].title).toBe("The Great Gatsby");
    });

    it("filters by author (case-insensitive)", () => {
      const { result } = renderHook(() => useBookFilters(books));
      act(() => result.current.setSearch("frank"));
      expect(result.current.filteredBooks).toHaveLength(1);
      expect(result.current.filteredBooks[0].title).toBe("Dune");
    });

    it("trims leading and trailing whitespace", () => {
      const { result } = renderHook(() => useBookFilters(books));
      act(() => result.current.setSearch("  dune  "));
      expect(result.current.filteredBooks).toHaveLength(1);
    });

    it("returns an empty list when no books match", () => {
      const { result } = renderHook(() => useBookFilters(books));
      act(() => result.current.setSearch("xyz-no-match"));
      expect(result.current.filteredBooks).toHaveLength(0);
    });

    it("sets hasFilters to true when search is non-empty", () => {
      const { result } = renderHook(() => useBookFilters(books));
      act(() => result.current.setSearch("dune"));
      expect(result.current.hasFilters).toBe(true);
    });

    it("sets hasFilters to false when search is only whitespace", () => {
      const { result } = renderHook(() => useBookFilters(books));
      act(() => result.current.setSearch("   "));
      expect(result.current.hasFilters).toBe(false);
    });
  });

  describe("statusFilter", () => {
    it("filters to only unstarted books when set to 'to-read'", () => {
      const { result } = renderHook(() => useBookFilters(books));
      act(() => result.current.setStatusFilter("to-read"));
      expect(result.current.filteredBooks).toHaveLength(2);
      expect(result.current.filteredBooks.map((b) => b.title)).toEqual([
        "The Great Gatsby",
        "Brave New World",
      ]);
    });

    it("filters to only in-progress books when set to 'in-progress'", () => {
      const { result } = renderHook(() => useBookFilters(books));
      act(() => result.current.setStatusFilter("in-progress"));
      expect(result.current.filteredBooks).toHaveLength(1);
      expect(result.current.filteredBooks[0].title).toBe("Dune");
    });

    it("filters to only abandoned books when set to 'abandoned'", () => {
      const { result } = renderHook(() => useBookFilters(books));
      act(() => result.current.setStatusFilter("abandoned"));
      expect(result.current.filteredBooks).toHaveLength(1);
      expect(result.current.filteredBooks[0].title).toBe("Fahrenheit 451");
    });

    it("does not include abandoned books in the 'in-progress' results", () => {
      const { result } = renderHook(() => useBookFilters(books));
      act(() => result.current.setStatusFilter("in-progress"));
      const titles = result.current.filteredBooks.map((b) => b.title);
      expect(titles).not.toContain("Fahrenheit 451");
    });

    it("filters to only completed books when set to 'completed'", () => {
      const { result } = renderHook(() => useBookFilters(books));
      act(() => result.current.setStatusFilter("completed"));
      expect(result.current.filteredBooks).toHaveLength(1);
      expect(result.current.filteredBooks[0].title).toBe("1984");
    });

    it("returns all books when set to 'all'", () => {
      const { result } = renderHook(() => useBookFilters(books));
      act(() => result.current.setStatusFilter("in-progress"));
      act(() => result.current.setStatusFilter("all"));
      expect(result.current.filteredBooks).toHaveLength(5);
    });

    it("sets hasFilters to true when statusFilter is not 'all'", () => {
      const { result } = renderHook(() => useBookFilters(books));
      act(() => result.current.setStatusFilter("completed"));
      expect(result.current.hasFilters).toBe(true);
    });
  });

  describe("combined filters", () => {
    it("applies search and status filter together", () => {
      const { result } = renderHook(() => useBookFilters(books));
      act(() => {
        result.current.setStatusFilter("to-read");
        result.current.setSearch("gatsby");
      });
      expect(result.current.filteredBooks).toHaveLength(1);
      expect(result.current.filteredBooks[0].title).toBe("The Great Gatsby");
    });

    it("returns empty when combined filters match nothing", () => {
      const { result } = renderHook(() => useBookFilters(books));
      act(() => {
        result.current.setStatusFilter("completed");
        result.current.setSearch("gatsby");
      });
      expect(result.current.filteredBooks).toHaveLength(0);
      expect(result.current.hasFilters).toBe(true);
    });
  });

  describe("clearFilters", () => {
    it("resets search and statusFilter", () => {
      const { result } = renderHook(() => useBookFilters(books));
      act(() => {
        result.current.setSearch("gatsby");
        result.current.setStatusFilter("completed");
      });
      act(() => result.current.clearFilters());
      expect(result.current.search).toBe("");
      expect(result.current.statusFilter).toBe("all");
    });

    it("restores the full book list after clearing", () => {
      const { result } = renderHook(() => useBookFilters(books));
      act(() => {
        result.current.setSearch("gatsby");
        result.current.setStatusFilter("completed");
      });
      act(() => result.current.clearFilters());
      expect(result.current.filteredBooks).toHaveLength(5);
      expect(result.current.hasFilters).toBe(false);
    });
  });
});
