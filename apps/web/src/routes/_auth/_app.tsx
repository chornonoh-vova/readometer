import { AppSidebar } from "@/components/app-sidebar";
import { CurrentReadingSession } from "@/components/current-reading-session";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="pb-24">
        <Outlet />
        <CurrentReadingSession />
      </SidebarInset>
    </SidebarProvider>
  );
}
