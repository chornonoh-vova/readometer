import { BookDetailsContent } from "@/components/book-details-content";
import { BookDetailsMenu } from "@/components/book-details-menu";
import { PageHeader, PageHeaderName } from "@/components/page-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import {
  bookDetailsQueryOptions,
  useBookDetailsSuspenseQuery,
  type Book,
  type BookDetails,
} from "@/lib/books";
import {
  readingRunsQueryOptions,
  useReadingRunsSuspenseQuery,
} from "@/lib/reading-runs";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/books/$bookId")({
  component: Book,
  pendingComponent: BookLoading,
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(bookDetailsQueryOptions(params.bookId));
    context.queryClient.ensureQueryData(readingRunsQueryOptions(params.bookId));
  },
});

function BookDetailsHeader({ book }: { book?: BookDetails }) {
  return (
    <PageHeader>
      <PageHeaderName>
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/books">Books</Link>} />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate">
                {book?.title ?? "Loading"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageHeaderName>

      {book && <BookDetailsMenu book={book as Book} />}
    </PageHeader>
  );
}

function BookLoading() {
  return (
    <>
      <BookDetailsHeader />
      <div className="px-4 flex flex-col gap-2">
        <div className="flex gap-4 justify-between items-center">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
        <div className="flex flex-row items-start gap-2">
          <Skeleton className="w-20 h-32 flex-shrink-0 rounded-sm" />
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-md border" />
        <Skeleton className="h-24 w-full rounded-md border" />
      </div>
    </>
  );
}

function Book() {
  const { bookId } = Route.useParams();
  const { data: book } = useBookDetailsSuspenseQuery(bookId);
  const { data: readingRuns } = useReadingRunsSuspenseQuery(bookId);
  return (
    <>
      <BookDetailsHeader book={book} />
      <BookDetailsContent book={book} readingRuns={readingRuns} />
    </>
  );
}
