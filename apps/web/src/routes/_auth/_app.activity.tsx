import { PageHeader, PageHeaderName } from "@/components/page-header";
import { ReadingActivityHeatmap } from "@/components/reading-activity-heatmap";
import { ReadingActivityToolbar } from "@/components/reading-activity-toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import { readingActivityQueryOptions } from "@/lib/reading-activity";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import z from "zod";

export const Route = createFileRoute("/_auth/_app/activity")({
  component: Activity,
  pendingComponent: ActivityLoading,
  loaderDeps: ({ search: { year } }) => ({ year }),
  loader: ({ context, deps: { year } }) => {
    context.queryClient.ensureQueryData(readingActivityQueryOptions(year));
  },
  validateSearch: z.object({
    year: z.number().positive().optional().prefault(new Date().getFullYear()),
  }),
});

function ActivityHeader({ year }: { year: number }) {
  return (
    <PageHeader>
      <PageHeaderName>
        <h1 className="text-sm">Activity</h1>
      </PageHeaderName>
      <ReadingActivityToolbar year={year} />
    </PageHeader>
  );
}

function ActivityLoading() {
  return (
    <>
      <PageHeader>
        <PageHeaderName>
          <h1 className="text-sm">Activity</h1>
        </PageHeaderName>
      </PageHeader>
      <div className="w-full grid grid-cols-1 gap-4 p-2">
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="w-[164px] h-[140px] rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Activity() {
  const { year } = Route.useSearch();
  const { data: readingActivity } = useSuspenseQuery(
    readingActivityQueryOptions(year),
  );
  return (
    <>
      <ActivityHeader year={year} />
      <ReadingActivityHeatmap year={year} readingActivity={readingActivity} />
    </>
  );
}
