"use client";

import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import {
  CheckIcon,
  ChevronRightIcon,
  CircleIcon,
  Loader2Icon,
} from "lucide-react";

import { cn } from "./utils";

/* -------------------------------------------------------------------------- */
/*  Primitives (unchanged behaviour)                                          */
/* -------------------------------------------------------------------------- */

function ContextMenu({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}

function ContextMenuTrigger({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
  return (
    <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />
  );
}

function ContextMenuGroup({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Group>) {
  return (
    <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />
  );
}

function ContextMenuPortal({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Portal>) {
  return (
    <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />
  );
}

function ContextMenuSub({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />;
}

function ContextMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioGroup>) {
  return (
    <ContextMenuPrimitive.RadioGroup
      data-slot="context-menu-radio-group"
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub trigger / sub content                                                 */
/* -------------------------------------------------------------------------- */

type ContextMenuSubTriggerProps = React.ComponentProps<
  typeof ContextMenuPrimitive.SubTrigger
> & {
  inset?: boolean;
  /** Optional leading icon. */
  icon?: React.ReactNode;
};

function ContextMenuSubTrigger({
  className,
  inset,
  icon,
  children,
  ...props
}: ContextMenuSubTriggerProps) {
  return (
    <ContextMenuPrimitive.SubTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      <ChevronRightIcon className="ml-auto" />
    </ContextMenuPrimitive.SubTrigger>
  );
}

function ContextMenuSubContent({
  className,
  collisionPadding = 8,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.SubContent
      data-slot="context-menu-sub-content"
      collisionPadding={collisionPadding}
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Content: collision padding so it never hugs the viewport edge             */
/* -------------------------------------------------------------------------- */

function ContextMenuContent({
  className,
  collisionPadding = 8,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        collisionPadding={collisionPadding}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-context-menu-content-available-height) min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md motion-reduce:animate-none",
          className,
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Item: icon, inline shortcut, loading state                                */
/* -------------------------------------------------------------------------- */

type ContextMenuItemProps = React.ComponentProps<
  typeof ContextMenuPrimitive.Item
> & {
  inset?: boolean;
  variant?: "default" | "destructive";
  /** Optional leading icon. Replaced by a spinner while `loading`. */
  icon?: React.ReactNode;
  /** Keyboard hint shown on the right, e.g. "⌘C". */
  shortcut?: React.ReactNode;
  /** Shows a spinner and disables the item. */
  loading?: boolean;
};

function ContextMenuItem({
  className,
  inset,
  variant = "default",
  icon,
  shortcut,
  loading = false,
  disabled,
  children,
  ...props
}: ContextMenuItemProps) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      disabled={disabled || loading}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {loading ? <Loader2Icon className="animate-spin" /> : icon}
      {children}
      {shortcut && <ContextMenuShortcut>{shortcut}</ContextMenuShortcut>}
    </ContextMenuPrimitive.Item>
  );
}

/* -------------------------------------------------------------------------- */
/*  Checkbox / radio items                                                    */
/* -------------------------------------------------------------------------- */

function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  shortcut,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem> & {
  shortcut?: React.ReactNode;
}) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
      {shortcut && <ContextMenuShortcut>{shortcut}</ContextMenuShortcut>}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

function ContextMenuRadioItem({
  className,
  children,
  shortcut,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioItem> & {
  shortcut?: React.ReactNode;
}) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
      {shortcut && <ContextMenuShortcut>{shortcut}</ContextMenuShortcut>}
    </ContextMenuPrimitive.RadioItem>
  );
}

/* -------------------------------------------------------------------------- */
/*  Label / separator / shortcut / empty                                      */
/* -------------------------------------------------------------------------- */

function ContextMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.Label
      data-slot="context-menu-label"
      data-inset={inset}
      className={cn(
        "text-foreground px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
        className,
      )}
      {...props}
    />
  );
}

function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function ContextMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn(
        "text-muted-foreground ml-auto pl-4 text-xs tracking-widest",
        className,
      )}
      {...props}
    />
  );
}

/** Placeholder for menus whose items can be empty (e.g. no recent files). */
function ContextMenuEmpty({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="context-menu-empty"
      className={cn(
        "text-muted-foreground px-2 py-1.5 text-center text-sm select-none",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  ContextMenuItems: build a menu declaratively from data                    */
/* -------------------------------------------------------------------------- */

type BaseEntry = { disabled?: boolean };

type ContextMenuEntry =
  | (BaseEntry & {
      type?: "item";
      label: React.ReactNode;
      icon?: React.ReactNode;
      shortcut?: React.ReactNode;
      variant?: "default" | "destructive";
      loading?: boolean;
      onSelect?: (event: Event) => void;
    })
  | (BaseEntry & {
      type: "checkbox";
      label: React.ReactNode;
      checked: boolean;
      shortcut?: React.ReactNode;
      onCheckedChange?: (checked: boolean) => void;
    })
  | (BaseEntry & {
      type: "radio-group";
      value: string;
      onValueChange?: (value: string) => void;
      options: { value: string; label: React.ReactNode; disabled?: boolean }[];
    })
  | (BaseEntry & {
      type: "sub";
      label: React.ReactNode;
      icon?: React.ReactNode;
      items: ContextMenuEntry[];
    })
  | { type: "label"; label: React.ReactNode }
  | { type: "separator" };

function ContextMenuItems({ items }: { items: ContextMenuEntry[] }) {
  if (items.length === 0) {
    return <ContextMenuEmpty>No actions</ContextMenuEmpty>;
  }

  return (
    <>
      {items.map((entry, i) => {
        const key = `${entry.type ?? "item"}-${i}`;

        switch (entry.type) {
          case "separator":
            return <ContextMenuSeparator key={key} />;
          case "label":
            return <ContextMenuLabel key={key}>{entry.label}</ContextMenuLabel>;
          case "checkbox":
            return (
              <ContextMenuCheckboxItem
                key={key}
                checked={entry.checked}
                onCheckedChange={entry.onCheckedChange}
                disabled={entry.disabled}
                shortcut={entry.shortcut}
              >
                {entry.label}
              </ContextMenuCheckboxItem>
            );
          case "radio-group":
            return (
              <ContextMenuRadioGroup
                key={key}
                value={entry.value}
                onValueChange={entry.onValueChange}
              >
                {entry.options.map((o) => (
                  <ContextMenuRadioItem
                    key={o.value}
                    value={o.value}
                    disabled={entry.disabled || o.disabled}
                  >
                    {o.label}
                  </ContextMenuRadioItem>
                ))}
              </ContextMenuRadioGroup>
            );
          case "sub":
            return (
              <ContextMenuSub key={key}>
                <ContextMenuSubTrigger
                  icon={entry.icon}
                  disabled={entry.disabled}
                >
                  {entry.label}
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItems items={entry.items} />
                </ContextMenuSubContent>
              </ContextMenuSub>
            );
          default:
            return (
              <ContextMenuItem
                key={key}
                icon={entry.icon}
                shortcut={entry.shortcut}
                variant={entry.variant}
                loading={entry.loading}
                disabled={entry.disabled}
                onSelect={entry.onSelect}
              >
                {entry.label}
              </ContextMenuItem>
            );
        }
      })}
    </>
  );
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuEmpty,
  ContextMenuItems,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};

export type { ContextMenuEntry };
