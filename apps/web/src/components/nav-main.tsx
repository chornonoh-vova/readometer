import { Link } from "@tanstack/react-router";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";
import { ActivityIcon, BookMarkedIcon, HouseIcon } from "lucide-react";

const active =
  "data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground";

export function NavMain() {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className={active} render={<Link to="/" />}>
              <HouseIcon /> Home
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className={active} render={<Link to="/books" />}>
              <BookMarkedIcon /> Books
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              className={active}
              render={<Link to="/activity" />}
            >
              <ActivityIcon /> Activity
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
