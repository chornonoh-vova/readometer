import { Link } from "@tanstack/react-router";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "./ui/sidebar";
import { LibraryBigIcon } from "lucide-react";

export function NavApp() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton className="h-10" render={<Link to="/" />}>
          <div className="grid place-items-center size-8 -ml-1 rounded-md bg-primary text-primary-foreground">
            <LibraryBigIcon />
          </div>
          <span className="font-medium">Readometer</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
