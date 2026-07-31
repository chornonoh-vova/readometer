import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Heading row for a page section, with an optional trailing action. The action
 * is right-aligned whether or not there is a title — a titleless header is how
 * a section renders its trailing link when it has no items to label.
 */
export function SectionHeader({
  title,
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-row items-center gap-1",
        title === undefined && "justify-end",
      )}
    >
      {title !== undefined && (
        <h2 className="mr-auto px-2.5 text-sm font-medium">{title}</h2>
      )}
      {children}
    </div>
  );
}
