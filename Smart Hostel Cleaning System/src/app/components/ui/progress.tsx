"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "./utils";

type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> & {
  /** Classes for the filled bar. */
  indicatorClassName?: string;
};

function Progress({
  className,
  indicatorClassName,
  value,
  max = 100,
  ...props
}: ProgressProps) {
  // value === null/undefined means "indeterminate" (unknown progress)
  const isIndeterminate = value == null;
  const percent = isIndeterminate
    ? 100
    : Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      // `value` and `max` are forwarded to Radix. The original dropped `value`, so
      // aria-valuenow / data-state were never set and screen readers saw no progress.
      value={value}
      max={max}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 bg-primary",
          // only animate the transform, not every property
          "transition-transform duration-300 ease-out motion-reduce:transition-none",
          isIndeterminate && "animate-pulse motion-reduce:animate-none",
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - percent}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
export type { ProgressProps };
