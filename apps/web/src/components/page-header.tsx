import type { ReactNode } from "react";
import { Separator } from "./ui/separator";
import { SidebarTrigger } from "./ui/sidebar";

export function PageHeaderName({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap1 lg:gap-2">
      <SidebarTrigger />
      <Separator
        orientation="vertical"
        className="mr-2 my-auto data-[orientation=vertical]:h-4"
      />
      {children}
    </div>
  );
}

export function PageHeader({ children }: { children: ReactNode }) {
  return (
    <header className="flex items-center justify-between h-16 w-full px-4">
      {children}
    </header>
  );
}
