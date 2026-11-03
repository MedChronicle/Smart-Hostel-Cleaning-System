"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

import { cn } from "./utils";

type SeparatorProps = React.ComponentProps<typeof SeparatorPrimitive.Root>;

const lineClasses =
  "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  children,
  ...props
}: SeparatorProps) {
  // Plain line (the original behavior).
  if (children == null) {
    return (
      <SeparatorPrimitive.Root
        data-slot="separator"
        decorative={decorative}
        orientation={orientation}
        className={cn(lineClasses, className)}
        {...props}
      />
    );
  }

  // Labelled divider, e.g. <Separator>or</Separator>. Only meaningful when horizontal.
  // The text is real content, so the group is exposed as a separator to assistive tech
  // unless `decorative` is explicitly true and the label is purely visual.
  return (
    <div
      data-slot="separator"
      data-orientation="horizontal"
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : "horizontal"}
      className={cn("flex w-full items-center gap-3", className)}
    >
      <SeparatorPrimitive.Root
        decorative
        orientation="horizontal"
        className={cn(lineClasses, "flex-1")}
      />
      <span className="text-xs text-muted-foreground select-none">
        {children}
      </span>
      <SeparatorPrimitive.Root
        decorative
        orientation="horizontal"
        className={cn(lineClasses, "flex-1")}
      />
    </div>
  );
}

export { Separator };
export type { SeparatorProps };
