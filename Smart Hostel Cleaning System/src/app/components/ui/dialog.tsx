"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2Icon, XIcon } from "lucide-react";

import { cn } from "./utils";
import { Button } from "./button";

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                */
/* -------------------------------------------------------------------------- */

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/* -------------------------------------------------------------------------- */
/*  Overlay: optional backdrop blur                                           */
/* -------------------------------------------------------------------------- */

function DialogOverlay({
  className,
  blur = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay> & {
  /** Blur the page behind the dialog. */
  blur?: boolean;
}) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 motion-reduce:animate-none",
        blur && "backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Content: sizes, scroll handling, optional close button, dismiss control   */
/* -------------------------------------------------------------------------- */

const sizeClasses = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg", // matches the original default
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  full: "sm:max-w-[calc(100%-2rem)] h-[calc(100dvh-2rem)]",
} as const;

type DialogContentProps = React.ComponentProps<
  typeof DialogPrimitive.Content
> & {
  size?: keyof typeof sizeClasses;
  /** Show the top-right "x" button. Default: true */
  showCloseButton?: boolean;
  /**
   * When false, clicking the backdrop or pressing Escape will NOT close the
   * dialog (useful for unsaved changes / in-flight requests). Default: true
   */
  dismissible?: boolean;
  /** Blur the page behind the dialog. */
  blurOverlay?: boolean;
};

function DialogContent({
  className,
  children,
  size = "md",
  showCloseButton = true,
  dismissible = true,
  blurOverlay = false,
  onInteractOutside,
  onEscapeKeyDown,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay blur={blurOverlay} />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        onInteractOutside={(e) => {
          if (!dismissible) e.preventDefault();
          onInteractOutside?.(e);
        }}
        onEscapeKeyDown={(e) => {
          if (!dismissible) e.preventDefault();
          onEscapeKeyDown?.(e);
        }}
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border p-6 shadow-lg duration-200 motion-reduce:animate-none",
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Layout parts                                                              */
/* -------------------------------------------------------------------------- */

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

/** Scrollable middle section; pair with a tall dialog (size="lg" / "full"). */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("-mx-6 overflow-y-auto px-6 py-1", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  ConfirmDialog: async-aware confirmation with loading + error handling     */
/* -------------------------------------------------------------------------- */

type ConfirmDialogProps = {
  /** Element that opens the dialog (rendered with asChild). */
  trigger?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "destructive" styles the confirm button red. */
  variant?: "default" | "destructive";
  /** May be async; the dialog shows a spinner and stays open until it settles. */
  onConfirm: () => void | Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  open: openProp,
  onOpenChange,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const open = openProp ?? internalOpen;

  const setOpen = (next: boolean) => {
    if (loading) return; // block closing while the request is in flight
    if (openProp === undefined) setInternalOpen(next);
    if (!next) setError(null);
    onOpenChange?.(next);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      setLoading(false);
      if (openProp === undefined) setInternalOpen(false);
      onOpenChange?.(false);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        size="sm"
        showCloseButton={false}
        dismissible={!loading}
        role="alertdialog"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <Loader2Icon className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  ConfirmDialog,
};
