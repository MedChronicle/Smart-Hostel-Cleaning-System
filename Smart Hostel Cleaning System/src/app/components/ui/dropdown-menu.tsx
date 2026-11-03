"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import {
  CheckIcon,
  ChevronRightIcon,
  CircleIcon,
  Loader2Icon,
} from "lucide-react";

import { cn } from "./utils";

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                */
/* -------------------------------------------------------------------------- */

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  );
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  );
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  );
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  );
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

/* -------------------------------------------------------------------------- */
/*  Content: collision padding, reduced motion                                */
/* -------------------------------------------------------------------------- */

function DropdownMenuContent({
  className,
  sideOffset = 4,
  collisionPadding = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md motion-reduce:animate-none",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Item: icon, shortcut, description, loading                                */
/* -------------------------------------------------------------------------- */

type DropdownMenuItemProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Item
> & {
  inset?: boolean;
  variant?: "default" | "destructive";
  /** Optional leading icon. Replaced by a spinner while `loading`. */
  icon?: React.ReactNode;
  /** Keyboard hint on the right, e.g. "⌘K". */
  shortcut?: React.ReactNode;
  /** Secondary line under the label. */
  description?: React.ReactNode;
  /** Shows a spinner and disables the item. */
  loading?: boolean;
};

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  icon,
  shortcut,
  description,
  loading = false,
  disabled,
  children,
  ...props
}: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
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
      {description ? (
        <span className="flex flex-col">
          <span>{children}</span>
          <span className="text-muted-foreground text-xs">{description}</span>
        </span>
      ) : (
        children
      )}
      {shortcut && <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>}
    </DropdownMenuPrimitive.Item>
  );
}

/* -------------------------------------------------------------------------- */
/*  Checkbox / radio items                                                    */
/* -------------------------------------------------------------------------- */

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  shortcut,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> & {
  shortcut?: React.ReactNode;
}) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
      {shortcut && <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  shortcut,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & {
  shortcut?: React.ReactNode;
}) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
      {shortcut && <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>}
    </DropdownMenuPrimitive.RadioItem>
  );
}

/* -------------------------------------------------------------------------- */
/*  Label / separator / shortcut / empty                                      */
/* -------------------------------------------------------------------------- */

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "text-muted-foreground ml-auto pl-4 text-xs tracking-widest",
        className,
      )}
      {...props}
    />
  );
}

/** Placeholder for menus that can be empty (e.g. no notifications). */
function DropdownMenuEmpty({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dropdown-menu-empty"
      className={cn(
        "text-muted-foreground px-2 py-1.5 text-center text-sm select-none",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub trigger / sub content                                                 */
/* -------------------------------------------------------------------------- */

function DropdownMenuSubTrigger({
  className,
  inset,
  icon,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
  /** Optional leading icon. */
  icon?: React.ReactNode;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  collisionPadding = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      collisionPadding={collisionPadding}
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  DropdownMenuItems: build a menu declaratively from data                   */
/* -------------------------------------------------------------------------- */

type BaseEntry = { disabled?: boolean };

type DropdownMenuEntry =
  | (BaseEntry & {
      type?: "item";
      label: React.ReactNode;
      description?: React.ReactNode;
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
      items: DropdownMenuEntry[];
    })
  | { type: "label"; label: React.ReactNode }
  | { type: "separator" };

function DropdownMenuItems({ items }: { items: DropdownMenuEntry[] }) {
  if (items.length === 0) {
    return <DropdownMenuEmpty>No actions</DropdownMenuEmpty>;
  }

  return (
    <>
      {items.map((entry, i) => {
        const key = `${entry.type ?? "item"}-${i}`;

        switch (entry.type) {
          case "separator":
            return <DropdownMenuSeparator key={key} />;
          case "label":
            return <DropdownMenuLabel key={key}>{entry.label}</DropdownMenuLabel>;
          case "checkbox":
            return (
              <DropdownMenuCheckboxItem
                key={key}
                checked={entry.checked}
                onCheckedChange={entry.onCheckedChange}
                disabled={entry.disabled}
                shortcut={entry.shortcut}
              >
                {entry.label}
              </DropdownMenuCheckboxItem>
            );
          case "radio-group":
            return (
              <DropdownMenuRadioGroup
                key={key}
                value={entry.value}
                onValueChange={entry.onValueChange}
              >
                {entry.options.map((o) => (
                  <DropdownMenuRadioItem
                    key={o.value}
                    value={o.value}
                    disabled={entry.disabled || o.disabled}
                  >
                    {o.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            );
          case "sub":
            return (
              <DropdownMenuSub key={key}>
                <DropdownMenuSubTrigger
                  icon={entry.icon}
                  disabled={entry.disabled}
                >
                  {entry.label}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItems items={entry.items} />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            );
          default:
            return (
              <DropdownMenuItem
                key={key}
                icon={entry.icon}
                shortcut={entry.shortcut}
                description={entry.description}
                variant={entry.variant}
                loading={entry.loading}
                disabled={entry.disabled}
                onSelect={entry.onSelect}
              >
                {entry.label}
              </DropdownMenuItem>
            );
        }
      })}
    </>
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuEmpty,
  DropdownMenuItems,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};

export type { DropdownMenuEntry };
