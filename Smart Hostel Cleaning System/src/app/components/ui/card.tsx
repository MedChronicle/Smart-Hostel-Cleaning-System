"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

/* -------------------------------------------------------------------------- */
/*  Variants and sizes                                                         */
/* -------------------------------------------------------------------------- */

const cardVariants = cva(
  "text-card-foreground flex flex-col rounded-xl border",
  {
    variants: {
      variant: {
        default: "bg-card",
        elevated: "bg-card shadow-md",
        outline: "bg-transparent",
        muted: "bg-muted/50 border-transparent",
        ghost: "bg-transparent border-transparent",
      },
      interactive: {
        true: "cursor-pointer outline-none transition-[box-shadow,border-color,transform] hover:border-ring/50 hover:shadow-md focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none",
        false: "",
      },
      selected: {
        true: "border-primary ring-primary/40 ring-2",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
      selected: false,
    },
  },
);

// Static class strings so Tailwind can see every one. `md` equals the original spacing.
const spacing = {
  sm: {
    gap: "gap-4",
    x: "px-4",
    headerTop: "pt-4",
    lastBottom: "[&:last-child]:pb-4",
    footerBottom: "pb-4",
    headerDivider: "[.border-b]:pb-4",
    footerDivider: "[.border-t]:pt-4",
  },
  md: {
    gap: "gap-6",
    x: "px-6",
    headerTop: "pt-6",
    lastBottom: "[&:last-child]:pb-6",
    footerBottom: "pb-6",
    headerDivider: "[.border-b]:pb-6",
    footerDivider: "[.border-t]:pt-6",
  },
  lg: {
    gap: "gap-8",
    x: "px-8",
    headerTop: "pt-8",
    lastBottom: "[&:last-child]:pb-8",
    footerBottom: "pb-8",
    headerDivider: "[.border-b]:pb-8",
    footerDivider: "[.border-t]:pt-8",
  },
} as const;

type CardSize = keyof typeof spacing;

const CardSizeContext = React.createContext<CardSize>("md");
const useCardSize = () => spacing[React.useContext(CardSizeContext)];

/* -------------------------------------------------------------------------- */
/*  Card                                                                       */
/* -------------------------------------------------------------------------- */

type CardProps = React.ComponentProps<"div"> &
  Omit<VariantProps<typeof cardVariants>, "interactive" | "selected"> & {
    /** Controls padding and gaps for every part inside. */
    size?: CardSize;
    /** Adds hover lift, a pointer cursor and a visible focus ring. */
    interactive?: boolean;
    /** Highlights the card with a primary ring, for selectable cards. */
    selected?: boolean;
    /** Render as the child element, e.g. `<Card asChild><a href="…">…</a></Card>`. */
    asChild?: boolean;
  };

function Card({
  className,
  variant,
  size = "md",
  interactive = false,
  selected = false,
  asChild = false,
  ...props
}: CardProps) {
  const Comp = asChild ? Slot : "div";
  const { gap } = spacing[size];

  return (
    <CardSizeContext.Provider value={size}>
      <Comp
        data-slot="card"
        data-selected={selected ? "" : undefined}
        // Cards that act like buttons or links need to be reachable by keyboard.
        tabIndex={interactive && !asChild ? 0 : undefined}
        className={cn(
          cardVariants({ variant, interactive, selected }),
          gap,
          className,
        )}
        {...props}
      />
    </CardSizeContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Parts                                                                      */
/* -------------------------------------------------------------------------- */

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  const s = useCardSize();
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        s.x,
        s.headerTop,
        s.headerDivider,
        className,
      )}
      {...props}
    />
  );
}

type CardTitleProps = React.ComponentProps<"h4"> & {
  /** Heading level to render. Pick the one that fits the page outline. Defaults to h4. */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div";
};

function CardTitle({ className, as: Tag = "h4", ...props }: CardTitleProps) {
  return (
    <Tag
      data-slot="card-title"
      className={cn("leading-none", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  const s = useCardSize();
  return (
    <div
      data-slot="card-content"
      className={cn(s.x, s.lastBottom, className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  const s = useCardSize();
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center", s.x, s.footerBottom, s.footerDivider, className)}
      {...props}
    />
  );
}

/**
 * Edge-to-edge media (image, video, chart). Put it first or last in the card and
 * it rounds to match the card's corners. Combine with AspectRatio for fixed shapes.
 */
function CardMedia({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-media"
      className={cn(
        "bg-muted overflow-hidden first:rounded-t-[inherit] last:rounded-b-[inherit] [&_img]:size-full [&_img]:object-cover [&_video]:size-full [&_video]:object-cover",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Skeleton                                                                   */
/* -------------------------------------------------------------------------- */

type CardSkeletonProps = Omit<CardProps, "children" | "asChild"> & {
  /** Number of placeholder text lines in the body. */
  lines?: number;
  /** Include a media placeholder at the top. */
  media?: boolean;
};

function CardSkeleton({
  lines = 3,
  media = false,
  size,
  ...props
}: CardSkeletonProps) {
  const pulse = "bg-muted animate-pulse rounded-md motion-reduce:animate-none";
  return (
    <Card size={size} aria-busy="true" {...props}>
      <span className="sr-only">Loading</span>
      {media ? <CardMedia aria-hidden="true" className="h-40" /> : null}
      <CardHeader aria-hidden="true">
        <div className={cn(pulse, "h-4 w-2/5")} />
        <div className={cn(pulse, "h-3 w-3/5")} />
      </CardHeader>
      <CardContent aria-hidden="true" className="grid gap-2">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(pulse, "h-3", i === lines - 1 ? "w-2/3" : "w-full")}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardMedia,
  CardSkeleton,
  cardVariants,
};
export type { CardProps, CardTitleProps, CardSkeletonProps };
