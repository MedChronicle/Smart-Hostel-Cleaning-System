"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDownIcon, PlusIcon } from "lucide-react";

import { cn } from "./utils";

/* -------------------------------------------------------------------------- */
/*  Variants                                                                   */
/* -------------------------------------------------------------------------- */

const accordionVariants = cva("w-full", {
  variants: {
    variant: {
      default: "",
      bordered: "overflow-hidden rounded-lg border",
      separated: "flex flex-col gap-2",
      ghost: "",
    },
  },
  defaultVariants: { variant: "default" },
});

const itemVariants = cva("transition-colors", {
  variants: {
    variant: {
      default: "border-b last:border-b-0",
      bordered: "border-b last:border-b-0 px-4",
      separated:
        "rounded-lg border bg-card px-4 data-[state=open]:shadow-sm",
      ghost: "rounded-md px-2 data-[state=open]:bg-muted/50",
    },
  },
  defaultVariants: { variant: "default" },
});

const triggerSizes = {
  sm: "py-2.5 text-sm",
  md: "py-4 text-sm",
  lg: "py-5 text-base",
} as const;

const contentSizes = {
  sm: "pb-2.5 text-sm",
  md: "pb-4 text-sm",
  lg: "pb-5 text-base",
} as const;

type AccordionSize = keyof typeof triggerSizes;
type AccordionIndicator = "chevron" | "plus" | "none";

/* -------------------------------------------------------------------------- */
/*  Context (lets Item / Trigger / Content inherit root settings)              */
/* -------------------------------------------------------------------------- */

type AccordionContextValue = {
  variant: NonNullable<VariantProps<typeof accordionVariants>["variant"]>;
  size: AccordionSize;
  indicator: AccordionIndicator;
};

const AccordionContext = React.createContext<AccordionContextValue>({
  variant: "default",
  size: "md",
  indicator: "chevron",
});

const useAccordionContext = () => React.useContext(AccordionContext);

/* -------------------------------------------------------------------------- */
/*  Root                                                                       */
/* -------------------------------------------------------------------------- */

type AccordionProps = React.ComponentProps<typeof AccordionPrimitive.Root> &
  VariantProps<typeof accordionVariants> & {
    /** Padding scale for triggers and content. */
    size?: AccordionSize;
    /** Icon shown at the end of each trigger. */
    indicator?: AccordionIndicator;
  };

function Accordion({
  className,
  variant = "default",
  size = "md",
  indicator = "chevron",
  ...props
}: AccordionProps) {
  const ctx = React.useMemo<AccordionContextValue>(
    () => ({ variant: variant ?? "default", size, indicator }),
    [variant, size, indicator],
  );

  return (
    <AccordionContext.Provider value={ctx}>
      <AccordionPrimitive.Root
        data-slot="accordion"
        className={cn(accordionVariants({ variant }), className)}
        {...props}
      />
    </AccordionContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Item                                                                       */
/* -------------------------------------------------------------------------- */

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  const { variant } = useAccordionContext();
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(itemVariants({ variant }), className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Trigger                                                                    */
/* -------------------------------------------------------------------------- */

type AccordionTriggerProps = React.ComponentProps<
  typeof AccordionPrimitive.Trigger
> & {
  /** Leading icon shown before the title. */
  icon?: React.ReactNode;
  /** Secondary line shown under the title. */
  description?: React.ReactNode;
  /** Small element (count, status pill) shown before the indicator. */
  badge?: React.ReactNode;
};

function AccordionTrigger({
  className,
  children,
  icon,
  description,
  badge,
  ...props
}: AccordionTriggerProps) {
  const { size, indicator } = useAccordionContext();

  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md text-left font-medium outline-none transition-all hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
          indicator === "chevron" &&
            "[&[data-state=open]>svg:last-child]:rotate-180",
          indicator === "plus" &&
            "[&[data-state=open]>svg:last-child]:rotate-45",
          triggerSizes[size],
          className,
        )}
        {...props}
      >
        <span className="flex min-w-0 flex-1 items-start gap-3">
          {icon ? (
            <span
              aria-hidden="true"
              className="text-muted-foreground mt-0.5 shrink-0 [&_svg]:size-4"
            >
              {icon}
            </span>
          ) : null}
          <span className="flex min-w-0 flex-col gap-0.5">
            <span>{children}</span>
            {description ? (
              <span className="text-muted-foreground text-xs font-normal group-hover:no-underline">
                {description}
              </span>
            ) : null}
          </span>
        </span>

        {badge ? <span className="shrink-0 self-center">{badge}</span> : null}

        {/* Keep the indicator as the last <svg> so the rotate selectors match. */}
        {indicator === "chevron" ? (
          <ChevronDownIcon
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200 motion-reduce:transition-none"
          />
        ) : indicator === "plus" ? (
          <PlusIcon
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200 motion-reduce:transition-none"
          />
        ) : null}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Content                                                                    */
/* -------------------------------------------------------------------------- */

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  const { size } = useAccordionContext();

  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm motion-reduce:animate-none"
      {...props}
    >
      <div className={cn("pt-0", contentSizes[size], className)}>
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
}

/* -------------------------------------------------------------------------- */
/*  useAccordionState: controlled "multiple" mode with expand/collapse all     */
/*  and optional persistence across reloads.                                   */
/* -------------------------------------------------------------------------- */

type UseAccordionStateOptions = {
  /** Item values that start open. */
  defaultValue?: string[];
  /** localStorage key. When set, open items are remembered between visits. */
  persistKey?: string;
};

function useAccordionState(
  allValues: string[],
  { defaultValue = [], persistKey }: UseAccordionStateOptions = {},
) {
  const [value, setValue] = React.useState<string[]>(defaultValue);
  const hydrated = React.useRef(false);

  // Restore after mount so server and client markup match on first render.
  React.useEffect(() => {
    if (persistKey) {
      try {
        const raw = window.localStorage.getItem(persistKey);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (
            Array.isArray(parsed) &&
            parsed.every((v) => typeof v === "string")
          ) {
            setValue(parsed.filter((v) => allValues.includes(v)));
          }
        }
      } catch {
        /* storage unavailable or corrupt: fall back to defaults */
      }
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey]);

  React.useEffect(() => {
    if (!persistKey || !hydrated.current) return;
    try {
      window.localStorage.setItem(persistKey, JSON.stringify(value));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [value, persistKey]);

  const expandAll = React.useCallback(() => setValue(allValues), [allValues]);
  const collapseAll = React.useCallback(() => setValue([]), []);
  const toggleAll = React.useCallback(
    () => setValue((v) => (v.length === allValues.length ? [] : allValues)),
    [allValues],
  );

  return {
    /** Spread onto <Accordion type="multiple" ... />. */
    accordionProps: { type: "multiple" as const, value, onValueChange: setValue },
    value,
    allOpen: allValues.length > 0 && value.length === allValues.length,
    expandAll,
    collapseAll,
    toggleAll,
  };
}

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  useAccordionState,
};
export type { AccordionProps, AccordionTriggerProps };
