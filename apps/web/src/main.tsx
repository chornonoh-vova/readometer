import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./index.css";

import { routeTree } from "./routeTree.gen";
import { ThemeProvider } from "./components/theme-provider";
import { TooltipProvider } from "./components/ui/tooltip";

const ONE_MINUTE_MS = 60_000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: ONE_MINUTE_MS },
  },
});

const router = createRouter({
  routeTree,
  scrollRestoration: true,
  context: {
    queryClient,
  },
  Wrap: ({ children }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  },
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
