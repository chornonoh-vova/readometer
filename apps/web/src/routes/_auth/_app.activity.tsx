import { PageHeader, PageHeaderName } from "@/components/page-header";
import {
  monthColumnClass,
  monthGridClass,
  monthsSectionClass,
  ReadingActivityHeatmap,
} from "@/components/reading-activity-heatmap";
import { ReadingActivityToolbar } from "@/components/reading-activity-toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getActivityMonths,
  getMonthsRange,
  minYear,
  monthsPerView,
} from "@/lib/heatmap";
import { readingActivityQueryOptions } from "@/lib/reading-activity";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import z from "zod";

export const Route = createFileRoute("/_auth/_app/activity")({
  component: Activity,
  pendingComponent: ActivityLoading,
  loaderDeps: ({ search: { year } }) => ({ year }),
  loader: ({ context, deps: { year } }) => {
    // Returned rather than re-derived in the component: the clock is read once,
    // so a month rollover cannot make the render ask for a different range.
    const months = getActivityMonths(year);
    const { from, to } = getMonthsRange(months);
    context.queryClient.ensureQueryData(readingActivityQueryOptions(from, to));
    return { months, from, to };
  },
  validateSearch: z.object({
    // Bounded because the loader does date arithmetic on this: `?year=999999`
    // overflows `Date` and would throw before the route mounts.
    year: z.number().int().min(minYear).max(9999).optional().catch(undefined),
  }),
});

function ActivityHeader({ year }: { year: number | undefined }) {
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
        <div className={monthsSectionClass}>
          {Array.from({ length: monthsPerView }, (_, month) => (
            <div key={month} className={monthColumnClass}>
              <Skeleton className="h-3 w-12 rounded" />
              <div className={monthGridClass}>
                {Array.from({ length: 42 }, (_, day) => (
                  <Skeleton key={day} className="rounded-sm" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Activity() {
  const { year } = Route.useSearch();
  const { months, from, to } = Route.useLoaderData();
  const { data: readingActivity } = useSuspenseQuery(
    readingActivityQueryOptions(from, to),
  );
  return (
    <>
      <ActivityHeader year={year} />
      <ReadingActivityHeatmap
        months={months}
        readingActivity={readingActivity}
      />
    </>
  );
}
