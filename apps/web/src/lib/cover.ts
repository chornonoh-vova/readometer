import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "./api";
import type { Book } from "./books";
import { books } from "./query-keys";

export async function uploadBookCover(
  bookId: string,
  cover: File,
): Promise<void> {
  const formData = new FormData();
  formData.append("cover", cover);

  return fetchApi(`/books/${bookId}/cover`, {
    method: "POST",
    body: formData,
    noContent: true,
  });
}

async function deleteBookCover(bookId: string) {
  return fetchApi(`/books/${bookId}/cover`, {
    method: "DELETE",
    noContent: true,
  });
}

export function useUploadBookCoverSuccess(bookId: string) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: books.list,
    });
    queryClient.invalidateQueries({
      queryKey: books.details(bookId),
    });
  };
}

export function useDeleteBookCoverMutation(bookId: string) {
  return useMutation({
    mutationFn: () => deleteBookCover(bookId),
    onSuccess: (_data, _variables, _onMutateResult, context) => {
      context.client.invalidateQueries({
        queryKey: books.list,
      });
      context.client.invalidateQueries({
        queryKey: books.details(bookId),
      });
    },
  });
}

export function bookCover(
  book: Pick<Book, "title" | "coverId">,
  size: "sm" | "md",
) {
  if (!book.coverId) {
    return undefined;
  }
  return {
    src: `/api/covers/${book.coverId}-${size}.webp`,
    alt: `Cover image for book ${book.title}`,
  };
}
