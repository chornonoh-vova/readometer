import { queryOptions } from "@tanstack/react-query";

export type Book = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  author: string | null;
  totalPages: number;
  publishDate: string | null;
  isbn13: string | null;
  language: string | null;
  deletedAt: string | null;
  updatedAt: string;
  createdAt: string;
};

async function fetchBooks(): Promise<Book[]> {
  const response = await fetch("/api/books");
  if (!response.ok) {
    throw new Error("Network error");
  }
  return await response.json();
}

export function booksQueryOptions() {
  return queryOptions({
    queryKey: ["books"],
    queryFn: fetchBooks,
  });
}
