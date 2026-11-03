"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { CircleIcon } from "lucide-react";

import { cn } from "./utils";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn(
        "grid gap-3",
        // orientation="horizontal" lays the options out in a row
        "data-[orientation=horizontal]:auto-cols-max data-[orientation=horizontal]:grid-flow-col",
        className,
      )}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        // shape
        "aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs outline-none",
        "dark:bg-input/30",
        // checked
        "data-[state=checked]:border-primary",
        // focus
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        // invalid
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        // disabled
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-[color,box-shadow,border-color] motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <CircleIcon
          className={cn(
            "absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-primary",
            // small pop when selected
            "animate-in zoom-in-50 fade-in-0 duration-150 motion-reduce:animate-none",
          )}
        />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
