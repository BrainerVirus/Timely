import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils";

export function Skeleton({
  className,
  ...rest
}: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse-soft rounded-xl bg-muted/40", className)}
      {...rest}
    />
  );
}

interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number;
  lineClassName?: string;
}

export function SkeletonText({
  lines = 3,
  className,
  lineClassName,
  ...rest
}: Readonly<SkeletonTextProps>) {
  return (
    <div className={cn("space-y-2", className)} {...rest}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-3 w-full",
            index === lines - 1 ? "w-2/3" : undefined,
            lineClassName,
          )}
        />
      ))}
    </div>
  );
}
