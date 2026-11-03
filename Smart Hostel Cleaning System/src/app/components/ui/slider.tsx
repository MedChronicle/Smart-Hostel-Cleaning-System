"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "./utils";

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & {
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
};

function Slider({
  className,
  trackClassName,
  rangeClassName,
  thumbClassName,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderProps) {
  // Only the number of thumbs matters, so depend on the length, not the array identity.
  const count = Array.isArray(value)
    ? value.length
    : Array.isArray(defaultValue)
      ? defaultValue.length
      : 1;

  // Without a value, Radix renders a single thumb at min. The original fell back
  // to [min, max] and rendered two thumbs that Radix had no values for.
  const thumbLabels =
    count === 2 ? ["Minimum", "Maximum"] : Array.from({ length: count }, () => undefined);

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          // horizontal track is now h-1.5 to match the vertical w-1.5 (was h-4 vs w-1.5)
          "relative grow overflow-hidden rounded-full bg-muted",
          "data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full",
          "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
          trackClassName,
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
            rangeClassName,
          )}
        />
      </SliderPrimitive.Track>
      {thumbLabels.map((label, index) => (
        <SliderPrimitive.Thumb
          key={index}
          data-slot="slider-thumb"
          aria-label={label}
          className={cn(
            "block size-4 shrink-0 rounded-full border border-primary bg-background shadow-sm outline-hidden",
            "ring-ring/50 transition-[color,box-shadow] motion-reduce:transition-none",
            "hover:ring-4 focus-visible:ring-4",
            "active:cursor-grabbing",
            "data-[disabled]:pointer-events-none",
            thumbClassName,
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
export type { SliderProps };
