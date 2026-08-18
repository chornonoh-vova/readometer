import { useNavigate } from "@tanstack/react-router";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
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
import { useReadingActivityStore } from "@/store/reading-activity";
import { getActivityYears } from "@/lib/heatmap";

const RECENT = "recent";

export function ReadingActivityToolbar({ year }: { year: number | undefined }) {
  const navigate = useNavigate();

  const displayBy = useReadingActivityStore((state) => state.displayBy);
  const setDisplayBy = useReadingActivityStore((state) => state.setDisplayBy);
  const weekStart = useReadingActivityStore((state) => state.weekStart);
  const setWeekStart = useReadingActivityStore((state) => state.setWeekStart);

  return (
    <div className="flex items-end justify-end-safe gap-2">
      <Select
        value={year ? year.toString() : RECENT}
        onValueChange={(value: string | null) =>
          navigate({
            to: "/activity",
            search:
              value === null || value === RECENT ? {} : { year: Number(value) },
            replace: true,
          })
        }
      >
        <SelectTrigger aria-label="Time period">
          <SelectValue>{year ?? "Recent"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Time period</SelectLabel>
            <SelectItem value={RECENT}>Recent</SelectItem>
            {getActivityYears().map((activityYear) => (
              <SelectItem key={activityYear} value={String(activityYear)}>
                {activityYear}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
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
