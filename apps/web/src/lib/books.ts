import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { fetchApi } from "./api";
import { books } from "./query-keys";

export type Book = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  author?: string;
  totalPages: number;
  publishDate?: string;
  isbn13?: string;
  language?: string;
  updatedAt: string;
  createdAt: string;
  completedPages: number;
  lastUpdatedAt: string;
};

export type BookDetails = Omit<Book, "completedPages" | "lastUpdatedAt">;

async function fetchBooks(): Promise<Book[]> {
  return fetchApi("/books");
}

async function fetchBookDetails(bookId: string): Promise<BookDetails> {
  return fetchApi(`/books/${bookId}`);
}

export function booksQueryOptions() {
  return queryOptions({
    queryKey: books.list,
    queryFn: fetchBooks,
  });
}

export function bookDetailsQueryOptions(bookId: string) {
  return queryOptions({
    queryKey: books.details(bookId),
    queryFn: () => fetchBookDetails(bookId),
  });
}

export function useBooksSuspenseQuery() {
  return useSuspenseQuery(booksQueryOptions());
}

export function useBookDetailsSuspenseQuery(bookId: string) {
  return useSuspenseQuery(bookDetailsQueryOptions(bookId));
}

export type NewBook = {
  id: string;
  title: string;
  description?: string;
  author?: string;
  totalPages: number;
  publishDate?: string;
  isbn?: string;
  language?: string;
};

async function addBook(newBook: NewBook): Promise<Book> {
  return fetchApi("/books", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newBook),
  });
}

export function useAddBookMutation() {
  return useMutation({
    mutationFn: (newBook: NewBook) => addBook(newBook),

    onSuccess: (_data, _variables, _onMutateResult, context) => {
      context.client.invalidateQueries({
        queryKey: books.list,
      });
    },
  });
}
