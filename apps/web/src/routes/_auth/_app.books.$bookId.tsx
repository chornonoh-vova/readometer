import { BookDetailsContent } from "@/components/book-details-content";
import { PageHeader, PageHeaderName } from "@/components/page-header";
import { StartReadingDialog } from "@/components/start-reading-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  bookDetailsQueryOptions,
  useBookDetailsSuspenseQuery,
  type BookDetails,
} from "@/lib/books";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/books/$bookId")({
  component: Book,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(bookDetailsQueryOptions(params.bookId)),
});

function BookDetailsHeader({ book }: { book: BookDetails }) {
  return (
    <PageHeader>
      <PageHeaderName>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/">Books</Link>} />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{book.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageHeaderName>
      <StartReadingDialog book={book} />
    </PageHeader>
  );
}

function Book() {
  const { bookId } = Route.useParams();
  const { data: book } = useBookDetailsSuspenseQuery(bookId);
  return (
    <>
      <BookDetailsHeader book={book} />
      <BookDetailsContent book={book} />
    </>
  );
}
