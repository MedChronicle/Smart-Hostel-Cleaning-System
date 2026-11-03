"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonAlertIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { cn } from "./utils";
import { buttonVariants } from "./button";

/* -------------------------------------------------------------------------- */
/*  Variants                                                                   */
/* -------------------------------------------------------------------------- */

type DialogVariant = "default" | "destructive" | "warning" | "success" | "info";

const iconWrapVariants = cva(
  "mb-1 flex size-10 shrink-0 items-center justify-center rounded-full mx-auto sm:mx-0 [&_svg]:size-5",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground",
        destructive: "bg-destructive/10 text-destructive",
        warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        info: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const contentSizes = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
} as const;

const variantIcons: Record<DialogVariant, React.ElementType> = {
  default: InfoIcon,
  destructive: OctagonAlertIcon,
  warning: TriangleAlertIcon,
  success: CircleCheckIcon,
  info: InfoIcon,
};

/* -------------------------------------------------------------------------- */
/*  Context                                                                    */
/* -------------------------------------------------------------------------- */

type AlertDialogContextValue = {
  variant: DialogVariant;
  pending: boolean;
  setPending: (pending: boolean) => void;
  error: string | null;
  setError: (message: string | null) => void;
  /** When set, the action stays disabled until the user types this text. */
  confirmText?: string;
  typed: string;
  setTyped: (value: string) => void;
  close: () => void;
};

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(
  null,
);

function useAlertDialogContext() {
  const ctx = React.useContext(AlertDialogContext);
  if (!ctx) {
    throw new Error("AlertDialog parts must be rendered inside <AlertDialog>.");
  }
  return ctx;
}

/* -------------------------------------------------------------------------- */
/*  Root                                                                       */
/* -------------------------------------------------------------------------- */

type AlertDialogProps = React.ComponentProps<typeof AlertDialogPrimitive.Root> & {
  variant?: DialogVariant;
  /** Require the user to type this exact text before the action enables. */
  confirmText?: string;
};

function AlertDialog({
  variant = "default",
  confirmText,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: AlertDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [typed, setTyped] = React.useState("");

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      // Never let the dialog close while an async action is running.
      if (!next && pending) return;
      if (!isControlled) setInternalOpen(next);
      if (!next) {
        setError(null);
        setTyped("");
      }
      onOpenChange?.(next);
    },
    [pending, isControlled, onOpenChange],
  );

  const close = React.useCallback(() => {
    setPending(false);
    if (!isControlled) setInternalOpen(false);
    setError(null);
    setTyped("");
    onOpenChange?.(false);
  }, [isControlled, onOpenChange]);

  const ctx = React.useMemo<AlertDialogContextValue>(
    () => ({
      variant,
      pending,
      setPending,
      error,
      setError,
      confirmText,
      typed,
      setTyped,
      close,
    }),
    [variant, pending, error, confirmText, typed, close],
  );

  return (
    <AlertDialogContext.Provider value={ctx}>
      <AlertDialogPrimitive.Root
        data-slot="alert-dialog"
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </AlertDialogContext.Provider>
  );
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  );
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  );
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Content                                                                    */
/* -------------------------------------------------------------------------- */

type AlertDialogContentProps = React.ComponentProps<
  typeof AlertDialogPrimitive.Content
> & {
  size?: keyof typeof contentSizes;
};

function AlertDialogContent({
  className,
  size = "md",
  onEscapeKeyDown,
  ...props
}: AlertDialogContentProps) {
  const { pending } = useAlertDialogContext();

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        aria-busy={pending || undefined}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
          onEscapeKeyDown?.(event);
        }}
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 motion-reduce:animate-none",
          contentSizes[size],
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Layout parts                                                               */
/* -------------------------------------------------------------------------- */

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

/** Round icon badge that matches the dialog variant. Pass `children` to override the icon. */
function AlertDialogIcon({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { variant } = useAlertDialogContext();
  const Icon = variantIcons[variant];
  return (
    <div
      data-slot="alert-dialog-icon"
      aria-hidden="true"
      className={cn(iconWrapVariants({ variant }), className)}
      {...props}
    >
      {children ?? <Icon />}
    </div>
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Typed confirmation + error                                                 */
/* -------------------------------------------------------------------------- */

/** Text field for "type X to confirm". Renders nothing unless `confirmText` is set on <AlertDialog>. */
function AlertDialogConfirmInput({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange">) {
  const { confirmText, typed, setTyped, pending } = useAlertDialogContext();
  const id = React.useId();
  if (!confirmText) return null;

  return (
    <div data-slot="alert-dialog-confirm-input" className="grid gap-2">
      <label htmlFor={id} className="text-sm">
        Type <span className="font-mono font-semibold">{confirmText}</span> to
        confirm
      </label>
      <input
        id={id}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={pending}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        className={cn(
          "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px] disabled:opacity-50",
          className,
        )}
        {...props}
      />
    </div>
  );
}

/** Shows the message of an error thrown by an async `onConfirm`. */
function AlertDialogError({
  className,
  ...props
}: React.ComponentProps<"p">) {
  const { error } = useAlertDialogContext();
  if (!error) return null;
  return (
    <p
      role="alert"
      data-slot="alert-dialog-error"
      className={cn("text-destructive text-sm", className)}
      {...props}
    >
      {error}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/*  Action / Cancel                                                            */
/* -------------------------------------------------------------------------- */

type AlertDialogActionProps = React.ComponentProps<
  typeof AlertDialogPrimitive.Action
> & {
  /**
   * Async handler. The dialog stays open with a spinner until it resolves,
   * closes on success, and shows the error message if it throws.
   */
  onConfirm?: () => void | Promise<void>;
  /** Force the loading state from outside. */
  loading?: boolean;
  /** Override the button style (defaults to the dialog variant). */
  buttonVariant?: VariantProps<typeof buttonVariants>["variant"];
};

function AlertDialogAction({
  className,
  children,
  onClick,
  onConfirm,
  loading,
  buttonVariant,
  disabled,
  ...props
}: AlertDialogActionProps) {
  const ctx = useAlertDialogContext();
  const isLoading = loading || ctx.pending;
  const needsText = ctx.confirmText !== undefined;
  const textMatches = !needsText || ctx.typed === ctx.confirmText;

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || !onConfirm) return;

    // Keep the dialog open until the async work finishes.
    event.preventDefault();
    ctx.setError(null);
    ctx.setPending(true);
    try {
      await onConfirm();
      ctx.close();
    } catch (err) {
      ctx.setPending(false);
      ctx.setError(
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Try again.",
      );
    }
  };

  return (
    <AlertDialogPrimitive.Action
      data-slot="alert-dialog-action"
      disabled={disabled || isLoading || !textMatches}
      onClick={handleClick}
      className={cn(
        buttonVariants({
          variant:
            buttonVariant ??
            (ctx.variant === "destructive" ? "destructive" : "default"),
        }),
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" />
      ) : null}
      {children}
    </AlertDialogPrimitive.Action>
  );
}

function AlertDialogCancel({
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  const { pending } = useAlertDialogContext();
  return (
    <AlertDialogPrimitive.Cancel
      data-slot="alert-dialog-cancel"
      disabled={disabled || pending}
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Imperative API: const confirm = useConfirm(); await confirm({...})         */
/*  Wrap your app once in <ConfirmDialogProvider>.                             */
/* -------------------------------------------------------------------------- */

type ConfirmOptions = {
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  /** Require typing this text before confirming. */
  confirmText?: string;
  /** Async work to run on confirm; the dialog shows a spinner and surfaces errors. */
  onConfirm?: () => void | Promise<void>;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback<ConfirmFn>((opts) => {
    // Settle any dialog that is still pending before opening a new one.
    resolverRef.current?.(false);
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) settle(false); // no-op if already settled with true
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={handleOpenChange}
        variant={options?.variant ?? "default"}
        confirmText={options?.confirmText}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogIcon />
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description ? (
              <AlertDialogDescription>
                {options.description}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogConfirmInput />
          <AlertDialogError />
          <AlertDialogFooter>
            <AlertDialogCancel>
              {options?.cancelLabel ?? "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onConfirm={async () => {
                await options?.onConfirm?.();
                settle(true);
              }}
            >
              {options?.confirmLabel ?? "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

function useConfirm(): ConfirmFn {
  const confirm = React.useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used inside <ConfirmDialogProvider>.");
  }
  return confirm;
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogIcon,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogConfirmInput,
  AlertDialogError,
  AlertDialogAction,
  AlertDialogCancel,
  ConfirmDialogProvider,
  useConfirm,
};
export type {
  AlertDialogProps,
  AlertDialogContentProps,
  AlertDialogActionProps,
  ConfirmOptions,
};
