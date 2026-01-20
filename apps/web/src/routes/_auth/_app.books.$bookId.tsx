import { BookProgress } from "@/components/book-progress";
import { BookStatus } from "@/components/book-status";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import {
  bookDetailsQueryOptions,
  useBookDetailsSuspenseQuery,
} from "@/lib/books";
import { langToEmoji } from "@/lib/lang-emoji";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpenIcon,
  CalendarIcon,
  ChevronsUpDownIcon,
  ClockIcon,
  PlayIcon,
} from "lucide-react";

export const Route = createFileRoute("/_auth/_app/books/$bookId")({
  component: BookDetails,
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

function BookDetails() {
  const { bookId } = Route.useParams();
  const { data: bookDetails } = useBookDetailsSuspenseQuery(bookId);
  return (
    <>
      <BookDetailsHeader title={bookDetails.title} />
      <div className="px-4 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {bookDetails.title}{" "}
          {bookDetails.language && langToEmoji[bookDetails.language]}
        </h1>
        {bookDetails.author && (
          <p className="text-muted-foreground">{bookDetails.author}</p>
        )}
        {bookDetails.publishDate && (
          <p className="bg-muted rounded px-2 py-1 text-sm max-w-fit">
            Published: {new Date(bookDetails.publishDate).toLocaleDateString()}
          </p>
        )}
        {bookDetails.isbn13 && (
          <p className="bg-muted rounded px-2 py-1 text-sm max-w-fit">
            ISBN-13: {bookDetails.isbn13}
          </p>
        )}

        {bookDetails.readingRuns.map((readingRun, index) => (
          <section
            key={readingRun.id}
            className="flex flex-col gap-2 rounded-md border p-4"
          >
            <p className="text-lg font-semibold">Reading {index + 1}</p>

            <div className="flex gap-1.5 items-center text-sm">
              <CalendarIcon className="size-4" />
              Started At: {new Date(readingRun.startedAt).toLocaleDateString()}
            </div>

            <div className="flex gap-2">
              <BookStatus
                completedPages={readingRun.completedPages}
                totalPages={bookDetails.totalPages}
              />
              <BookProgress
                completedPages={readingRun.completedPages}
                totalPages={bookDetails.totalPages}
              />
            </div>

            <Separator className="mt-2" />

            <Collapsible
              defaultOpen={readingRun.completedPages < bookDetails.totalPages}
            >
              <div className="flex items-center justify-between gap-4 mb-2">
                <p className="text-sm font-semibold">Sessions</p>
                <CollapsibleTrigger
                  render={
                    <Button variant="ghost" size="icon">
                      <ChevronsUpDownIcon />
                      <span className="sr-only">
                        Toggle sessions for run {index + 1}
                      </span>
                    </Button>
                  }
                />
              </div>
              <CollapsibleContent>
                <Item variant="outline">
                  <ItemContent>
                    <ItemTitle>
                      <CalendarIcon className="size-4" />
                      10/15/2025
                    </ItemTitle>
                    <ItemDescription className="inline-flex gap-1.5 items-center">
                      <BookOpenIcon className="size-3.5" />
                      <span>Pages 1-20 (19 pages)</span>
                      <ClockIcon className="size-3.5" />
                      <span>23m</span>
                    </ItemDescription>
                  </ItemContent>
                </Item>
              </CollapsibleContent>
            </Collapsible>
          </section>
        ))}
      </div>
    </>
  );
}
