import { PageHeader, PageHeaderName } from "@/components/page-header";
import { ReadingActivityHeatmap } from "@/components/reading-activity-heatmap";
import { ReadingActivityToolbar } from "@/components/reading-activity-toolbar";
import { readingActivityQueryOptions } from "@/lib/reading-activity";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import z from "zod";

export const Route = createFileRoute("/_auth/_app/activity")({
  component: Activity,
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
