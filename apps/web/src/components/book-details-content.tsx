import type { BookDetails } from "@/lib/books";
import { langToEmoji, langToName } from "@/lib/lang";
import { ReadingRunsEmpty } from "./reading-runs-empty";
import { ReadingRunsList } from "./reading-runs-list";
import { type ReactNode } from "react";
import { formatDate } from "@/lib/format";
import type { ReadingRun } from "@/lib/reading-runs";
import { BookDescriptionDialog } from "./book-description-dialog";
import { BookDetailsCover } from "./book-details-cover";

function BookInfo({ children }: { children: ReactNode }) {
  return <li className="px-2 py-1 text-sm max-w-fit">{children}</li>;
}

export function BookDetailsContent({
  book,
  readingRuns,
}: {
  book: BookDetails;
  readingRuns: ReadingRun[];
}) {
  return (
    <div className="px-4 flex flex-col gap-2">
      <div className="flex gap-4 justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{book.title}</h1>

        {book.description && (
          <BookDescriptionDialog
            title={book.title}
            description={book.description}
          />
        )}
      </div>

      <div className="flex flex-row items-start gap-2">
        <BookDetailsCover book={book} />

        <ul className="flex-1 list-inside list-disc">
          {book.author && <BookInfo>Author: {book.author}</BookInfo>}
          <BookInfo>Pages: {book.totalPages}</BookInfo>
          {book.language && (
            <BookInfo>
              Language: {langToName[book.language]} {langToEmoji[book.language]}
            </BookInfo>
          )}
          {book.publishDate && (
            <BookInfo>Published: {formatDate(book.publishDate)}</BookInfo>
          )}
          {book.isbn13 && <BookInfo>ISBN-13: {book.isbn13}</BookInfo>}
        </ul>
      </div>

      {readingRuns.length === 0 && <ReadingRunsEmpty book={book} />}

      <ReadingRunsList book={book} readingRuns={readingRuns} />
    </div>
  );
}
