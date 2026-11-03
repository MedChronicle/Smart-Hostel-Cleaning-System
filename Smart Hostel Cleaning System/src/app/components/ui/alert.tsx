"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  CircleCheckIcon,
  InfoIcon,
  OctagonAlertIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";

import { cn } from "./utils";

/* -------------------------------------------------------------------------- */
/*  Variants                                                                   */
/* -------------------------------------------------------------------------- */

const alertVariants = cva(
  "relative w-full rounded-lg border text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90",
        warning:
          "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 *:data-[slot=alert-description]:text-current/80",
        success:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 *:data-[slot=alert-description]:text-current/80",
        info: "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200 *:data-[slot=alert-description]:text-current/80",
      },
      size: {
        sm: "px-3 py-2 text-xs",
        md: "px-4 py-3",
        lg: "px-5 py-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>;

const variantIcons: Record<AlertVariant, React.ElementType> = {
  default: InfoIcon,
  destructive: OctagonAlertIcon,
  warning: TriangleAlertIcon,
  success: CircleCheckIcon,
  info: InfoIcon,
};

/* -------------------------------------------------------------------------- */
/*  Alert                                                                      */
/* -------------------------------------------------------------------------- */

type AlertProps = React.ComponentProps<"div"> &
  VariantProps<typeof alertVariants> & {
    /**
     * `true` shows the default icon for the variant, a node shows your own icon,
     * and omitting it adds no icon (so children-supplied icons keep working).
     */
    icon?: boolean | React.ReactNode;
    /** Show a close button that hides the alert. */
    dismissible?: boolean;
    /** Called after the alert is dismissed, by the button or by `autoDismiss`. */
    onDismiss?: () => void;
    /** Hide the alert automatically after this many milliseconds. */
    autoDismiss?: number;
  };

function Alert({
  className,
  variant,
  size,
  icon,
  dismissible = false,
  onDismiss,
  autoDismiss,
  children,
  ...props
}: AlertProps) {
  const [visible, setVisible] = React.useState(true);
  const resolvedVariant: AlertVariant = variant ?? "default";

  const dismiss = React.useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  React.useEffect(() => {
    if (!autoDismiss || autoDismiss <= 0) return;
    const timer = window.setTimeout(dismiss, autoDismiss);
    return () => window.clearTimeout(timer);
  }, [autoDismiss, dismiss]);

  if (!visible) return null;

  const Icon = variantIcons[resolvedVariant];
  const iconNode =
    icon === true ? (
      <Icon aria-hidden="true" />
    ) : icon && icon !== true ? (
      icon
    ) : null;

  return (
    <div
      data-slot="alert"
      data-variant={resolvedVariant}
      // Urgent variants interrupt screen readers; the rest are polite.
      role={
        resolvedVariant === "destructive" || resolvedVariant === "warning"
          ? "alert"
          : "status"
      }
      className={cn(
        alertVariants({ variant, size }),
        dismissible && "pr-10",
        className,
      )}
      {...props}
    >
      {iconNode}
      {children}
      {dismissible ? (
        <button
          type="button"
          data-slot="alert-close"
          aria-label="Dismiss"
          onClick={dismiss}
          className="focus-visible:ring-ring/50 absolute top-2 right-2 inline-flex size-6 items-center justify-center rounded-md opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-[3px]"
        >
          <XIcon className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Parts                                                                      */
/* -------------------------------------------------------------------------- */

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

/** Row for buttons or links under the description, e.g. "Retry" or "View details". */
function AlertActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-actions"
      className={cn("col-start-2 mt-2 flex flex-wrap items-center gap-2", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertActions, alertVariants };
export type { AlertProps };
