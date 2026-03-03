import { useLocalStorage } from "@/hooks/use-local-storage";
import { useNavigate } from "@tanstack/react-router";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { SettingsIcon } from "lucide-react";

type DisplayBy = "time" | "pages";

type WeekStart = "monday" | "sunday";

const minYear = 2026;

export function ReadingActivityToolbar({ year }: { year: number }) {
  const navigate = useNavigate();

  const maxYear = new Date().getFullYear() + 1;

  const [displayBy, setDisplayBy] = useLocalStorage<DisplayBy>(
    "reading-activity-display",
    "time",
  );
  const [weekStart, setWeekStart] = useLocalStorage<WeekStart>(
    "reading-activity-week-start",
    "monday",
  );

  return (
    <div className="flex items-end justify-end-safe gap-2">
      <NativeSelect
        id="year"
        aria-label="Year"
        value={year}
        onChange={(e) =>
          navigate({
            to: "/activity",
            search: { year: Number(e.target.value) },
          })
        }
      >
        {Array.from({ length: maxYear - minYear }, (_, i) => (
          <NativeSelectOption key={minYear + i} value={minYear + i}>
            {minYear + i}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="icon" aria-label="View settings">
              <SettingsIcon />
            </Button>
          }
        />
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>View activity by</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={displayBy}
              onValueChange={setDisplayBy}
            >
              <DropdownMenuRadioItem value="time">Time</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="pages">
                Pages read
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Week starts at</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={weekStart}
              onValueChange={setWeekStart}
            >
              <DropdownMenuRadioItem value="monday">
                Monday
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="sunday">
                Sunday
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
