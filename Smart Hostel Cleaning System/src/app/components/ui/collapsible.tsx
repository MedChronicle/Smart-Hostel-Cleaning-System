"use client";

import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Required keyframes (add to globals.css for Tailwind v4, or tailwind.config for v3):
 *
 * @theme inline {
 *   --animate-collapsible-down: collapsible-down 200ms ease-out;
 *   --animate-collapsible-up: collapsible-up 200ms ease-out;
 *   @keyframes collapsible-down {
 *     from { height: 0; opacity: 0; }
 *     to   { height: var(--radix-collapsible-content-height); opacity: 1; }
 *   }
 *   @keyframes collapsible-up {
 *     from { height: var(--radix-collapsible-content-height); opacity: 1; }
 *     to   { height: 0; opacity: 0; }
 *   }
 * }
 */

/* -------------------------------------------------------------------------- */
/*  Context: lets children (trigger, content, custom UI) read the open state  */
/* -------------------------------------------------------------------------- */

type CollapsibleContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(
  null
);

function useCollapsible() {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) {
    throw new Error("useCollapsible must be used within <Collapsible>");
  }
  return ctx;
}

/* -------------------------------------------------------------------------- */
/*  Root: supports controlled + uncontrolled usage                            */
/* -------------------------------------------------------------------------- */

function Collapsible({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const value = React.useMemo(
    () => ({ open, setOpen, toggle: () => setOpen(!open) }),
    [open, setOpen]
  );

  return (
    <CollapsibleContext.Provider value={value}>
      <CollapsiblePrimitive.Root
        data-slot="collapsible"
        open={open}
        onOpenChange={setOpen}
        className={className}
        {...props}
      >
        {children}
      </CollapsiblePrimitive.Root>
    </CollapsibleContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Trigger: optional animated chevron, focus ring, disabled styling          */
/* -------------------------------------------------------------------------- */

type CollapsibleTriggerProps = React.ComponentProps<
  typeof CollapsiblePrimitive.CollapsibleTrigger
> & {
  /** Render a chevron that rotates when open. */
  showChevron?: boolean;
  /** Place the chevron before or after the children. */
  chevronPosition?: "start" | "end";
};

function CollapsibleTrigger({
  className,
  children,
  showChevron = false,
  chevronPosition = "end",
  asChild,
  ...props
}: CollapsibleTriggerProps) {
  const chevron = showChevron ? (
    <ChevronDown
      aria-hidden="true"
      className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/trigger:rotate-180"
    />
  ) : null;

  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      asChild={asChild}
      className={cn(
        "group/trigger inline-flex items-center gap-2 rounded-md text-sm font-medium outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {chevronPosition === "start" && chevron}
          {children}
          {chevronPosition === "end" && chevron}
        </>
      )}
    </CollapsiblePrimitive.CollapsibleTrigger>
  );
}

/* -------------------------------------------------------------------------- */
/*  Content: smooth height animation, respects reduced motion                 */
/* -------------------------------------------------------------------------- */

function CollapsibleContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      className={cn(
        "overflow-hidden",
        "data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up",
        "motion-reduce:animate-none"
      )}
      {...props}
    >
      {/* Inner wrapper so padding/margins don't break the height animation */}
      <div className={className}>{children}</div>
    </CollapsiblePrimitive.CollapsibleContent>
  );
}

/* -------------------------------------------------------------------------- */
/*  Composed helper: a ready-to-use titled section                            */
/* -------------------------------------------------------------------------- */

type CollapsibleSectionProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  "title"
> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  contentClassName?: string;
};

function CollapsibleSection({
  title,
  description,
  children,
  className,
  contentClassName,
  ...props
}: CollapsibleSectionProps) {
  return (
    <Collapsible
      className={cn("rounded-lg border bg-card text-card-foreground", className)}
      {...props}
    >
      <CollapsibleTrigger
        showChevron
        className="w-full justify-between px-4 py-3 text-left"
      >
        <span className="flex flex-col">
          <span>{title}</span>
          {description && (
            <span className="text-xs font-normal text-muted-foreground">
              {description}
            </span>
          )}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className={cn("px-4 pb-4 text-sm", contentClassName)}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  CollapsibleSection,
  useCollapsible,
};
