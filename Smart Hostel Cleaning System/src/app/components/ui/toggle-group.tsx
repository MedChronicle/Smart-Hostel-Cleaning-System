"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";

import { cn } from "./utils";
import { toggleVariants } from "./toggle";

type ToggleVariantProps = VariantProps<typeof toggleVariants>;

const ToggleGroupContext = React.createContext<ToggleVariantProps>({
  size: "default",
  variant: "default",
});

function ToggleGroup({
  className,
  variant,
  size,
  orientation = "horizontal",
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  ToggleVariantProps & {
    orientation?: "horizontal" | "vertical";
  }) {
  // Memoized so consumers don't re-render when the parent re-renders
  // with the same variant/size.
  const contextValue = React.useMemo(
    () => ({ variant, size }),
    [variant, size],
  );

  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-orientation={orientation}
      aria-orientation={orientation}
      className={cn(
        "group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs",
        "data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={contextValue}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  ToggleVariantProps) {
  const context = React.useContext(ToggleGroupContext);

  // An explicit prop on the item wins; otherwise inherit from the group.
  // (The original let the group always override, making item props dead.)
  const resolvedVariant = variant ?? context.variant;
  const resolvedSize = size ?? context.size;

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      className={cn(
        toggleVariants({ variant: resolvedVariant, size: resolvedSize }),
        // joined-segment look
        "min-w-0 flex-1 shrink-0 rounded-none shadow-none active:scale-100 focus:z-10 focus-visible:z-10",
        // horizontal: round outer ends, collapse inner borders
        "group-data-[orientation=horizontal]/toggle-group:first:rounded-l-md group-data-[orientation=horizontal]/toggle-group:last:rounded-r-md",
        "group-data-[orientation=horizontal]/toggle-group:data-[variant=outline]:border-l-0 group-data-[orientation=horizontal]/toggle-group:data-[variant=outline]:first:border-l",
        // vertical: round outer ends, collapse inner borders
        "group-data-[orientation=vertical]/toggle-group:first:rounded-t-md group-data-[orientation=vertical]/toggle-group:last:rounded-b-md",
        "group-data-[orientation=vertical]/toggle-group:data-[variant=outline]:border-t-0 group-data-[orientation=vertical]/toggle-group:data-[variant=outline]:first:border-t",
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
