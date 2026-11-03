"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Loader2Icon, SearchIcon, XIcon } from "lucide-react";

import { cn } from "./utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";

/* -------------------------------------------------------------------------- */
/*  Hook: global keyboard shortcut (Cmd/Ctrl + K by default)                  */
/* -------------------------------------------------------------------------- */

type UseCommandShortcutOptions = {
  /** Key to listen for. Default: "k" */
  key?: string;
  /** Require Cmd (mac) / Ctrl (others). Default: true */
  withMeta?: boolean;
};

/**
 * Toggles open state when the shortcut is pressed.
 *
 * const [open, setOpen] = useCommandShortcut();
 * <CommandDialog open={open} onOpenChange={setOpen}>...</CommandDialog>
 */
function useCommandShortcut(
  options: UseCommandShortcutOptions = {},
): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
  const { key = "k", withMeta = true } = options;
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const metaOk = withMeta ? e.metaKey || e.ctrlKey : true;
      if (metaOk && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [key, withMeta]);

  return [open, setOpen];
}

/* -------------------------------------------------------------------------- */
/*  Command (root)                                                            */
/* -------------------------------------------------------------------------- */

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  CommandDialog                                                             */
/* -------------------------------------------------------------------------- */

type CommandDialogProps = React.ComponentProps<typeof Dialog> & {
  title?: string;
  description?: string;
  /** Props forwarded to the inner <Command> (e.g. shouldFilter, loop). */
  commandProps?: React.ComponentProps<typeof CommandPrimitive>;
  className?: string;
};

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  commandProps,
  className,
  ...props
}: CommandDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent
        className={cn("overflow-hidden p-0 sm:max-w-xl", className)}
      >
        {/* Header lives inside DialogContent so screen readers associate it */}
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Command
          {...commandProps}
          className={cn(
            "[&_[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5",
            commandProps?.className,
          )}
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  CommandInput: loading spinner + clear button                              */
/* -------------------------------------------------------------------------- */

type CommandInputProps = React.ComponentProps<typeof CommandPrimitive.Input> & {
  /** Shows a spinner instead of the search icon (async search). */
  loading?: boolean;
  /** Show an "x" button when there is text. Default: true */
  clearable?: boolean;
};

function CommandInput({
  className,
  loading = false,
  clearable = true,
  value,
  onValueChange,
  ...props
}: CommandInputProps) {
  // Track value internally so the clear button works in uncontrolled mode too.
  const [internal, setInternal] = React.useState("");
  const current = value ?? internal;

  const handleChange = (next: string) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };

  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-9 items-center gap-2 border-b px-3"
    >
      {loading ? (
        <Loader2Icon
          aria-label="Loading"
          className="size-4 shrink-0 animate-spin opacity-50"
        />
      ) : (
        <SearchIcon className="size-4 shrink-0 opacity-50" />
      )}
      <CommandPrimitive.Input
        data-slot="command-input"
        value={current}
        onValueChange={handleChange}
        className={cn(
          "placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
      {clearable && current.length > 0 && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => handleChange("")}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring shrink-0 rounded-sm p-0.5 outline-hidden transition-colors focus-visible:ring-2"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  List / Empty / Loading / Group / Separator / Item / Shortcut              */
/* -------------------------------------------------------------------------- */

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto overscroll-contain",
        className,
      )}
      {...props}
    />
  );
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("text-muted-foreground py-6 text-center text-sm", className)}
      {...props}
    />
  );
}

function CommandLoading({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Loading>) {
  return (
    <CommandPrimitive.Loading
      data-slot="command-loading"
      className={cn(
        "text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm",
        className,
      )}
      {...props}
    />
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
        className,
      )}
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("bg-border -mx-1 h-px", className)}
      {...props}
    />
  );
}

type CommandItemProps = React.ComponentProps<typeof CommandPrimitive.Item> & {
  /** Optional leading icon. */
  icon?: React.ReactNode;
};

function CommandItem({ className, icon, children, ...props }: CommandItemProps) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </CommandPrimitive.Item>
  );
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Kbd + Footer: keyboard hints at the bottom of the palette                 */
/* -------------------------------------------------------------------------- */

function CommandKbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="command-kbd"
      className={cn(
        "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-mono text-[10px] font-medium select-none",
        className,
      )}
      {...props}
    />
  );
}

function CommandFooter({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="command-footer"
      className={cn(
        "text-muted-foreground flex items-center gap-4 border-t px-3 py-2 text-xs",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          <span className="flex items-center gap-1">
            <CommandKbd>↑</CommandKbd>
            <CommandKbd>↓</CommandKbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <CommandKbd>↵</CommandKbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <CommandKbd>esc</CommandKbd>
            close
          </span>
        </>
      )}
    </div>
  );
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandLoading,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
  CommandKbd,
  CommandFooter,
  useCommandShortcut,
};
