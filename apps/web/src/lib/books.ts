import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";

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
  completedPages: number;
  lastUpdatedAt: string;
};

export type ReadingRun = {
  id: string;
  userId: string;
  bookId: string;
  completedPages: number;
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
  deletedAt: string | null;
};

export type BookDetails = {
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
  readingRuns: ReadingRun[];
};

async function fetchBooks(): Promise<Book[]> {
  const response = await fetch("/api/books");
  if (!response.ok) {
    throw new Error("Network error");
  }
  return await response.json();
}

async function fetchBookDetails(bookId: string): Promise<BookDetails> {
  const response = await fetch(`/api/books/${bookId}`);
  if (!response.ok) {
    throw new Error("Network error");
  }
  return await response.json();
}

const booksQueryKey = ["books"];

export function booksQueryOptions() {
  return queryOptions({
    queryKey: booksQueryKey,
    queryFn: fetchBooks,
  });
}

export function bookDetailsQueryOptions(bookId: string) {
  return queryOptions({
    queryKey: [...booksQueryKey, bookId],
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
  userId: string;
  title: string;
  description: string | null;
  author: string | null;
  totalPages: number;
  publishDate: string | null;
  isbn13: string | null;
  language: string | null;
  updatedAt: string;
};

async function addBook(newBook: NewBook): Promise<Book> {
  const response = await fetch("/api/books", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newBook),
  });
  if (!response.ok) {
    throw new Error("Network error");
  }
  return await response.json();
}

export function useAddBookMutation() {
  return useMutation({
    mutationFn: (newBook: NewBook) => addBook(newBook),

    onMutate: async (newBook, context) => {
      await context.client.cancelQueries({ queryKey: booksQueryKey });

      const prevBooks = context.client.getQueryData(booksQueryKey);

      context.client.setQueryData(
        booksQueryKey,
        (old: Book[] = []) =>
          [
            ...old,
            {
              ...newBook,
              createdAt: newBook.updatedAt,
              deletedAt: null,
              completedPages: 0,
              lastUpdatedAt: newBook.updatedAt,
            },
          ] satisfies Book[],
      );

      return { prevBooks };
    },

    onError: (error, _variables, onMutateResult, context) => {
      console.error(error);
      if (onMutateResult?.prevBooks) {
        context.client.setQueryData(booksQueryKey, onMutateResult.prevBooks);
      }
    },

    onSettled: (_data, _error, _variables, _onMutateResult, context) => {
      context.client.invalidateQueries({
        queryKey: booksQueryKey,
      });
    },
  });
}
