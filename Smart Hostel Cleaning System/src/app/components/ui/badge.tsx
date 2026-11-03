import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";

import { cn } from "./utils";

/* -------------------------------------------------------------------------- */
/*  Variants                                                                   */
/* -------------------------------------------------------------------------- */

const badgeVariants = cva(
  "inline-flex items-center justify-center border font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        success:
          "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 [a&]:hover:bg-emerald-500/25",
        warning:
          "border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-300 [a&]:hover:bg-amber-500/25",
        info: "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300 [a&]:hover:bg-sky-500/25",
      },
      size: {
        sm: "px-1.5 py-0 text-[10px]",
        md: "px-2 py-0.5 text-xs",
        lg: "px-2.5 py-1 text-sm",
      },
      shape: {
        rounded: "rounded-md",
        pill: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      shape: "rounded",
    },
  },
);

/* -------------------------------------------------------------------------- */
/*  Badge                                                                      */
/* -------------------------------------------------------------------------- */

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    /** Render as the child element (e.g. a link). `dot` and `onRemove` are ignored. */
    asChild?: boolean;
    /** Small status dot before the label, drawn in the badge's text color. */
    dot?: boolean;
    /** Gently pulse the dot, for live or in-progress states. */
    pulse?: boolean;
    /** Shows a remove button and calls this when it is clicked. */
    onRemove?: () => void;
    /** Accessible name for the remove button. */
    removeLabel?: string;
  };

function Badge({
  className,
  variant,
  size,
  shape,
  asChild = false,
  dot = false,
  pulse = false,
  onRemove,
  removeLabel = "Remove",
  children,
  ...props
}: BadgeProps) {
  const classes = cn(badgeVariants({ variant, size, shape }), className);

  // Slot needs exactly one child, so skip the extras in this mode.
  if (asChild) {
    return (
      <Slot data-slot="badge" className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <span data-slot="badge" className={classes} {...props}>
      {dot ? (
        <span
          aria-hidden="true"
          data-slot="badge-dot"
          className={cn(
            "size-1.5 shrink-0 rounded-full bg-current",
            pulse && "animate-pulse motion-reduce:animate-none",
          )}
        />
      ) : null}
      {children}
      {onRemove ? (
        <button
          type="button"
          data-slot="badge-remove"
          aria-label={removeLabel}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="focus-visible:ring-ring/50 -mr-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full opacity-70 outline-none transition-[opacity,background-color] hover:bg-black/10 hover:opacity-100 focus-visible:ring-[3px] dark:hover:bg-white/15"
        >
          <XIcon className="size-3" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}

export { Badge, badgeVariants };
export type { BadgeProps };
