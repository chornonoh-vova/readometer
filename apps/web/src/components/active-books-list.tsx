import type { Book } from "@/lib/books";
import { ActiveBooksEmpty } from "./active-books-empty";
import { ActiveBookItem } from "./active-book-item";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "./ui/button";
import { ChevronRightIcon } from "lucide-react";
import { motion } from "motion/react";
import { itemVariants, listVariants } from "@/lib/animations";

const list = listVariants();

export function ActiveBooksList({ books }: { books: Book[] }) {
  if (books.length === 0) {
    return (
      <div className="p-2">
        <ActiveBooksEmpty />
      </div>
    );
  }

  return (
    <motion.div
      className="p-2 w-full grid grid-cols-1 gap-4"
      variants={list}
      initial="hidden"
      animate="show"
    >
      <h2 className="text-md">Continue reading</h2>
      {books.map((book) => (
        <motion.div key={book.id} variants={itemVariants}>
          <ActiveBookItem book={book} />
        </motion.div>
      ))}
      <Link to="/books" className={buttonVariants({ variant: "secondary" })}>
        View all books
        <ChevronRightIcon />
      </Link>
    </motion.div>
  );
}
