import type { ReactNode } from "react";
import { Separator } from "./ui/separator";
import { SidebarTrigger } from "./ui/sidebar";

export type PageHeaderProps = {
  name: ReactNode;
  action?: ReactNode;
};

export function PageHeader({ name, action }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between h-16 w-full px-4">
      <div className="flex items-center gap1 lg:gap-2">
        <SidebarTrigger />
        <Separator
          orientation="vertical"
          className="mr-2 my-auto data-[orientation=vertical]:h-6"
        />
        {name}
      </div>
      {action}
    </header>
  );
}
