import {
  BookIcon,
  CircleCheckBigIcon,
  LoaderCircleIcon,
  SearchIcon,
  SlidersVerticalIcon,
  XIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "./ui/input-group";
import type { BooksStatusFilter } from "@/lib/books";

interface BooksToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: BooksStatusFilter;
  onStatusFilterChange: (value: BooksStatusFilter) => void;
}

export function BooksToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: BooksToolbarProps) {
  const hasActiveFilter = statusFilter !== "all";

  return (
    <div className="px-2 pt-2">
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search by title or author…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {search && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              variant="ghost"
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
            >
              <XIcon />
            </InputGroupButton>
          </InputGroupAddon>
        )}
        <InputGroupAddon align="inline-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <InputGroupButton
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Filter by status"
                  className="relative"
                />
              }
            >
              <SlidersVerticalIcon />
              {hasActiveFilter && (
                <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-primary" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-40">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={statusFilter}
                  onValueChange={(v) =>
                    onStatusFilterChange(v as BooksStatusFilter)
                  }
                >
                  <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="to-read">
                    <BookIcon />
                    To Read
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="in-progress">
                    <LoaderCircleIcon />
                    In Progress
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="completed">
                    <CircleCheckBigIcon />
                    Completed
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
