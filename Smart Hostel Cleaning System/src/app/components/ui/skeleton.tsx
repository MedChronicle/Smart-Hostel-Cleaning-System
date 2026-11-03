import * as React from "react";

import { cn } from "./utils";

type SkeletonProps = React.ComponentProps<"div"> & {
  /** Shape preset. "text" = a line of text, "circle" = avatar, "rect" = block (default). */
  shape?: "rect" | "text" | "circle";
};

const shapeClasses: Record<NonNullable<SkeletonProps["shape"]>, string> = {
  rect: "rounded-md",
  text: "h-4 w-full rounded",
  circle: "size-10 rounded-full",
};

function Skeleton({ className, shape = "rect", ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      data-shape={shape}
      // decorative placeholder: hide from assistive tech
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-accent motion-reduce:animate-none",
        shapeClasses[shape],
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
export type { SkeletonProps };
