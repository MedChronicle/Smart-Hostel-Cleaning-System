"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "./utils";

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      orientation={orientation}
      className={cn(
        "flex gap-2",
        "data-[orientation=horizontal]:flex-col data-[orientation=vertical]:flex-row",
        className,
      )}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // fixed: the original had both `inline-flex` and `flex`, so `flex` silently won
        "inline-flex w-fit items-center justify-center rounded-xl bg-muted p-[3px] text-muted-foreground",
        "h-9 aria-[orientation=vertical]:h-fit aria-[orientation=vertical]:flex-col aria-[orientation=vertical]:items-stretch",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // layout
        "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap",
        // shape + type
        "rounded-xl border border-transparent px-2 py-1 text-sm font-medium",
        // colors
        "text-foreground dark:text-muted-foreground",
        "hover:text-foreground",
        "data-[state=active]:bg-card data-[state=active]:shadow-sm",
        "dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground",
        // focus
        "focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        // states
        "disabled:pointer-events-none disabled:opacity-50",
        // icons
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // motion
        "transition-[color,background-color,box-shadow] motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 rounded-md outline-none",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "data-[state=active]:animate-in data-[state=active]:fade-in-0 motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
