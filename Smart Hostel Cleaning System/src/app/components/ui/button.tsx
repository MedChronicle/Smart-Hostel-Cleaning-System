"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2Icon } from "lucide-react";

import { cn } from "./utils";

/* -------------------------------------------------------------------------- */
/*  Variants                                                                   */
/* -------------------------------------------------------------------------- */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[loading]:cursor-progress [&[data-loading]>svg:not([data-spinner])]:hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-emerald-600 text-white hover:bg-emerald-600/90 focus-visible:ring-emerald-600/25 dark:bg-emerald-600/80 dark:focus-visible:ring-emerald-500/40",
        warning:
          "bg-amber-500 text-amber-950 hover:bg-amber-500/90 focus-visible:ring-amber-500/30 dark:focus-visible:ring-amber-400/40",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-7 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        xl: "h-12 rounded-lg px-8 text-base has-[>svg]:px-6",
        icon: "size-9 rounded-md",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-10 rounded-md",
      },
      // Listed after `size` so it wins when both set a radius.
      shape: {
        default: "",
        pill: "rounded-full",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
      fullWidth: false,
    },
  },
);

/* -------------------------------------------------------------------------- */
/*  Button                                                                     */
/* -------------------------------------------------------------------------- */

type ButtonProps = Omit<React.ComponentPropsWithoutRef<"button">, "onClick"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Show a spinner, block clicks, and set aria-busy. */
    loading?: boolean;
    /** Replaces the label while loading, e.g. "Saving…". */
    loadingText?: React.ReactNode;
    /** Icon before the label. Hidden while loading. Ignored with `asChild`. */
    startIcon?: React.ReactNode;
    /** Icon after the label. Hidden while loading. Ignored with `asChild`. */
    endIcon?: React.ReactNode;
    /**
     * If this returns a promise, the button shows its loading state until it settles,
     * so `onClick={() => save()}` needs no extra state.
     */
    onClick?: (
      event: React.MouseEvent<HTMLButtonElement>,
    ) => void | Promise<unknown>;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      shape,
      fullWidth,
      asChild = false,
      loading = false,
      loadingText,
      startIcon,
      endIcon,
      onClick,
      children,
      ...props
    },
    ref,
  ) => {
    const [pending, setPending] = React.useState(false);
    const mounted = React.useRef(true);

    React.useEffect(() => {
      mounted.current = true;
      return () => {
        mounted.current = false;
      };
    }, []);

    const isLoading = loading || pending;

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      // Keep focus on the button while loading instead of using `disabled`.
      if (isLoading) {
        event.preventDefault();
        return;
      }
      const result = onClick?.(event);
      if (
        result &&
        typeof (result as PromiseLike<unknown>).then === "function"
      ) {
        setPending(true);
        void Promise.resolve(result).finally(() => {
          if (mounted.current) setPending(false);
        });
      }
    };

    const classes = cn(
      buttonVariants({ variant, size, shape, fullWidth, className }),
    );

    const stateProps = {
      "data-slot": "button",
      "data-loading": isLoading ? "" : undefined,
      "aria-busy": isLoading || undefined,
      "aria-disabled": isLoading || undefined,
    } as const;

    // Slot needs exactly one child, so icons and the spinner are skipped here.
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={classes}
          onClick={handleClick}
          {...stateProps}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        onClick={handleClick}
        {...stateProps}
        {...props}
      >
        {isLoading ? (
          <Loader2Icon
            data-spinner=""
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
          />
        ) : (
          startIcon
        )}
        {isLoading && loadingText !== undefined ? loadingText : children}
        {isLoading ? null : endIcon}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonProps };
