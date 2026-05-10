import type { ReactNode } from "react";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "./ui/item";
import { GoalStatus } from "./goal-status";
import { GoalProgress } from "./goal-progress";

export function GoalItem({
  title,
  actual,
  target,
  metric,
  children,
}: {
  title: string;
  actual?: number;
  target?: number;
  metric?: string;
  children: ReactNode;
}) {
  return (
    <Item variant="outline" size="sm">
      <ItemMedia>
        <GoalProgress actual={actual} target={target} metric={metric} />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription>
          <GoalStatus actual={actual} target={target} metric={metric} />
        </ItemDescription>
      </ItemContent>
      <ItemActions>{children}</ItemActions>
    </Item>
  );
}
