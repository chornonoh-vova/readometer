import { Link } from "@tanstack/react-router";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";
import { BookMarkedIcon, ChartColumnIcon } from "lucide-react";

const active =
  "data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground";

export function NavMain() {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className={active} render={<Link to="/" />}>
              <BookMarkedIcon /> Books
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className={active} render={<Link to="/stats" />}>
              <ChartColumnIcon /> Stats
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
