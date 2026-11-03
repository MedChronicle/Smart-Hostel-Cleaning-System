"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const switchVariants = cva(
  [
    "peer inline-flex shrink-0 items-center rounded-full border border-transparent outline-none",
    "data-[state=checked]:bg-primary data-[state=unchecked]:bg-switch-background dark:data-[state=unchecked]:bg-input/80",
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "transition-colors motion-reduce:transition-none",
  ],
  {
    variants: {
      size: {
        sm: "h-4 w-7",
        default: "h-[1.15rem] w-8",
        lg: "h-6 w-11",
      },
    },
    defaultVariants: { size: "default" },
  },
);

const thumbVariants = cva(
  [
    "pointer-events-none block rounded-full bg-card ring-0",
    "dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-card-foreground",
    "transition-transform motion-reduce:transition-none",
    "data-[state=unchecked]:translate-x-0",
  ],
  {
    variants: {
      size: {
        sm: "size-3 data-[state=checked]:translate-x-[calc(100%-2px)]",
        default: "size-4 data-[state=checked]:translate-x-[calc(100%-2px)]",
        lg: "size-5 data-[state=checked]:translate-x-[calc(100%-2px)]",
      },
    },
    defaultVariants: { size: "default" },
  },
);

type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root> &
  VariantProps<typeof switchVariants>;

function Switch({ className, size, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size ?? "default"}
      className={cn(switchVariants({ size }), className)}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={thumbVariants({ size })}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch, switchVariants };
export type { SwitchProps };
