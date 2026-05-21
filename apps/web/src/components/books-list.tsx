import type { Book } from "@/lib/books";
import { BooksEmpty } from "./books-empty";
import { BooksSearchEmpty } from "./books-search-empty";
import { BookItem } from "./book-item";
import { motion } from "motion/react";
import { itemVariants, listVariants } from "@/lib/animations";

const list = listVariants();

interface BooksListProps {
  books: Book[];
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export function BooksList({
  books,
  hasFilters,
  onClearFilters,
}: BooksListProps) {
  if (books.length === 0) {
    if (hasFilters) {
      return <BooksSearchEmpty onClear={onClearFilters} />;
    }
    return <BooksEmpty />;
  }

  return (
    <motion.div
      className="p-2 w-full grid grid-cols-1 gap-4"
      variants={list}
      initial="hidden"
      animate="show"
    >
      {books.map((book) => (
        <motion.div key={book.id} variants={itemVariants}>
          <BookItem book={book} />
        </motion.div>
      ))}
    </motion.div>
  );
}
