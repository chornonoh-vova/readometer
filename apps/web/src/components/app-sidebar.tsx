import { useEffect, useLayoutEffect, useRef } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRouter } from "@tanstack/react-router";
import { NavUser } from "./nav-user";
import { NavApp } from "./nav-app";
import { NavMain } from "./nav-main";

export function AppSidebar() {
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const isMobileRef = useRef(isMobile);
  useLayoutEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);
  useEffect(() => {
    return router.subscribe("onResolved", () => {
      if (isMobileRef.current) setOpenMobile(false);
    });
  }, [router, setOpenMobile]);

  return (
    <Sidebar variant="floating">
      <SidebarHeader>
        <NavApp />
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
