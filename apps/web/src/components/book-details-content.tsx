import type { BookDetails } from "@/lib/books";
import { langToEmoji, langToName } from "@/lib/lang";
import { ReadingRunsEmpty } from "./reading-runs-empty";
import { ReadingRunsList } from "./reading-runs-list";
import type { ReactNode } from "react";
import { formatDate } from "@/lib/utils";
import type { ReadingRun } from "@/lib/reading-runs";
import { BookDescriptionDialog } from "./book-description-dialog";

function BookInfo({ children }: { children: ReactNode }) {
  return (
    <li className="bg-muted rounded px-2 py-1 text-sm max-w-fit">{children}</li>
  );
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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {book.title} {book.language && langToEmoji[book.language]}
          </h1>
          {book.author && (
            <p className="text-muted-foreground">{book.author}</p>
          )}
        </div>

        {book.description && (
          <BookDescriptionDialog
            title={book.title}
            description={book.description}
          />
        )}
      </div>

      <ul className="flex flex-wrap gap-2">
        <BookInfo>Pages: {book.totalPages}</BookInfo>
        {book.language && (
          <BookInfo>Language: {langToName[book.language]}</BookInfo>
        )}
        {book.publishDate && (
          <BookInfo>Published: {formatDate(book.publishDate)}</BookInfo>
        )}
        {book.isbn13 && <BookInfo>ISBN-13: {book.isbn13}</BookInfo>}
      </ul>

      {readingRuns.length === 0 && <ReadingRunsEmpty book={book} />}

      <ReadingRunsList book={book} readingRuns={readingRuns} />
    </div>
  );
}
