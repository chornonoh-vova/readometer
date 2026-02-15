import { BookDetailsContent } from "@/components/book-details-content";
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

function BookDetailsHeader({ title }: { title: string }) {
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
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageHeaderName>
    </PageHeader>
  );
}

function BookLoading() {
  return (
    <>
      <BookDetailsHeader title="Loading..." />
      <div className="px-4 flex flex-col gap-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-64 w-full rounded-none md:rounded-md border-y md:border" />
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
      <BookDetailsHeader title={book.title} />
      <BookDetailsContent book={book} readingRuns={readingRuns} />
    </>
  );
}
