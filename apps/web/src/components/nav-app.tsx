import { Link } from "@tanstack/react-router";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "./ui/sidebar";
import { LibraryBigIcon } from "lucide-react";

export function NavApp() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton render={<Link to="/" />}>
          <LibraryBigIcon />
          Readometer
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
