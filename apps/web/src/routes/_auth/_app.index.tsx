import { ComponentExample } from "@/components/component-example";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { booksQueryOptions } from "@/lib/books";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app/")({
  component: Index,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(booksQueryOptions());
  },
});

function Index() {
  const { data: books } = useSuspenseQuery(booksQueryOptions());
  console.log(books);
  return (
    <>
      <header className="flex h-12 w-full shrink-0 items-center gap-1 lg:gap-2 px-4 border-b box-content">
        <SidebarTrigger />
        <Separator
          orientation="vertical"
          className="mr-2 my-auto data-[orientation=vertical]:h-5"
        />
        <h1>Books</h1>
      </header>
      <ComponentExample />
    </>
  );
}
