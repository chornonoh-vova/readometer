import type { ReactNode } from "react";
import { SidebarTrigger } from "./ui/sidebar";

export function PageHeaderName({ children }: { children: ReactNode }) {
  return <div className="mr-auto min-w-0">{children}</div>;
}

export function PageHeader({ children }: { children: ReactNode }) {
  return (
    <header className="min-w-0 flex items-center justify-between gap-1 h-16 w-full px-2 md:px-4">
      <SidebarTrigger />
      {children}
    </header>
  );
}
