import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";
import { NavApp } from "./nav-app";
import { NavMain } from "./nav-main";

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <NavApp />
      </SidebarHeader>
      <SidebarContent>
        <SidebarSeparator />
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
