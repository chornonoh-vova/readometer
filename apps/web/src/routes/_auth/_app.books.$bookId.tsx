import { BookDetails } from "@/components/book-details";
import { PageHeader, PageHeaderName } from "@/components/page-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  bookDetailsQueryOptions,
  useBookDetailsSuspenseQuery,
} from "@/lib/books";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlayIcon } from "lucide-react";

export const Route = createFileRoute("/_auth/_app/books/$bookId")({
  component: Book,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(bookDetailsQueryOptions(params.bookId)),
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
      <Button>
        <PlayIcon />
        Start reading
      </Button>
    </PageHeader>
  );
}

function Book() {
  const { bookId } = Route.useParams();
  const { data: book } = useBookDetailsSuspenseQuery(bookId);
  return (
    <>
      <BookDetailsHeader title={book.title} />
      <BookDetails book={book} />
    </>
  );
}
