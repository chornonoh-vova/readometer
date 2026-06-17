import { useMemo, useState } from "react";
import { getBookStatus, type Book, type BooksStatusFilter } from "@/lib/books";

export function useBookFilters(books: Book[]) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BooksStatusFilter>("all");

  const { filteredBooks, hasFilters } = useMemo(() => {
    const trimmedSearch = search.trim();
    let result = books;
    if (statusFilter !== "all") {
      result = result.filter(
        (b) =>
          getBookStatus(b.completedPages, b.totalPages, b.abandoned) ===
          statusFilter,
      );
    }
    if (trimmedSearch) {
      const q = trimmedSearch.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author?.toLowerCase().includes(q),
      );
    }
    return {
      filteredBooks: result,
      hasFilters: statusFilter !== "all" || trimmedSearch.length > 0,
    };
  }, [books, search, statusFilter]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    filteredBooks,
    hasFilters,
    clearFilters,
  };
}
