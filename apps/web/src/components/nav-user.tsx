import { authClient } from "@/lib/auth-client";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  ChevronsUpDownIcon,
  ComputerIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react";
import type { User } from "better-auth";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "@tanstack/react-router";
import { useTheme } from "./theme-provider";

function UserContent({
  user,
  className,
  ...props
}: { user?: User } & ComponentProps<"div">) {
  const userFallback = user?.name
    .split(" ")
    .map((part) => part[0].toUpperCase())
    .join("")
    .substring(0, 2);

  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <Avatar>
        <AvatarImage src={user?.image || ""} alt={user?.name} />
        <AvatarFallback>{userFallback}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{user?.name}</span>
        <span className="truncate text-xs">{user?.email}</span>
      </div>
    </div>
  );
}

export function NavUser() {
  const { theme, setTheme } = useTheme();
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const logout = async () => {
    console.log("logout");
    await authClient.signOut();
    router.navigate({ to: "/login" });
  };
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <UserContent user={session?.user} />
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <UserContent className="px-1 py-1.5" user={session?.user} />
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                <DropdownMenuRadioItem value="light">
                  <SunIcon />
                  Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <MoonIcon />
                  Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <ComputerIcon />
                  System
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOutIcon />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
