"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

/* -------------------------------------------------------------------------- */
/*  Variants                                                                   */
/* -------------------------------------------------------------------------- */

const avatarVariants = cva("relative flex shrink-0 overflow-hidden", {
  variants: {
    size: {
      xs: "size-6",
      sm: "size-8",
      md: "size-10",
      lg: "size-12",
      xl: "size-16",
    },
    shape: {
      circle: "rounded-full",
      rounded: "rounded-lg",
      square: "rounded-none",
    },
  },
  defaultVariants: { size: "md", shape: "circle" },
});

type AvatarSize = NonNullable<VariantProps<typeof avatarVariants>["size"]>;

const fallbackText: Record<AvatarSize, string> = {
  xs: "text-[10px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-xl",
};

const statusDotSize: Record<AvatarSize, string> = {
  xs: "size-1.5",
  sm: "size-2",
  md: "size-2.5",
  lg: "size-3",
  xl: "size-4",
};

const statusStyles = {
  online: { color: "bg-emerald-500", label: "Online" },
  away: { color: "bg-amber-500", label: "Away" },
  busy: { color: "bg-red-500", label: "Busy" },
  offline: { color: "bg-zinc-400", label: "Offline" },
} as const;

type AvatarStatus = keyof typeof statusStyles;

// Static class strings so Tailwind can see them. Used when `colorize` is on.
const tintClasses = [
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
] as const;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** "Arpit Saharan" -> "AS", "madonna" -> "M", "" -> "". */
function getInitials(name: string, max = 2): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  // Array.from keeps emoji and other multi-unit characters intact.
  const chars = words.map((w) => Array.from(w)[0] ?? "");
  // First and last word when there are more than `max` words.
  const picked =
    chars.length > max ? [chars[0], chars[chars.length - 1]] : chars.slice(0, max);
  return picked.join("").toUpperCase();
}

/** Stable index from a string, so the same name always gets the same tint. */
function hashIndex(value: string, length: number): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(hash) % length;
}

/* -------------------------------------------------------------------------- */
/*  Context                                                                    */
/* -------------------------------------------------------------------------- */

const AvatarSizeContext = React.createContext<AvatarSize>("md");
const AvatarGroupContext = React.createContext<{
  size?: AvatarSize;
  shape?: VariantProps<typeof avatarVariants>["shape"];
} | null>(null);

/* -------------------------------------------------------------------------- */
/*  Avatar                                                                     */
/* -------------------------------------------------------------------------- */

type AvatarProps = React.ComponentProps<typeof AvatarPrimitive.Root> &
  VariantProps<typeof avatarVariants> & {
    /** Presence dot in the bottom-right corner. */
    status?: AvatarStatus;
    /** Ring in the page background color, useful on photos and in groups. */
    ring?: boolean;
  };

function Avatar({
  className,
  size,
  shape,
  status,
  ring,
  ...props
}: AvatarProps) {
  const group = React.useContext(AvatarGroupContext);
  const resolvedSize: AvatarSize = size ?? group?.size ?? "md";
  const resolvedShape = shape ?? group?.shape ?? "circle";
  const showRing = ring ?? Boolean(group);

  const root = (
    <AvatarSizeContext.Provider value={resolvedSize}>
      <AvatarPrimitive.Root
        data-slot="avatar"
        className={cn(
          avatarVariants({ size: resolvedSize, shape: resolvedShape }),
          showRing && "ring-background ring-2",
          className,
        )}
        {...props}
      />
    </AvatarSizeContext.Provider>
  );

  // No status: render exactly what the original did (no wrapper element).
  if (!status) return root;

  const { color, label } = statusStyles[status];
  return (
    <span className="relative inline-flex shrink-0">
      {root}
      <span
        data-slot="avatar-status"
        data-status={status}
        className={cn(
          "ring-background absolute right-0 bottom-0 rounded-full ring-2",
          statusDotSize[resolvedSize],
          color,
        )}
      >
        <span className="sr-only">{label}</span>
      </span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Image                                                                      */
/* -------------------------------------------------------------------------- */

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Fallback                                                                   */
/* -------------------------------------------------------------------------- */

type AvatarFallbackProps = React.ComponentProps<
  typeof AvatarPrimitive.Fallback
> & {
  /** Generates initials automatically. `children` still wins if provided. */
  name?: string;
  /** Tint the background from the name so each person gets a stable color. */
  colorize?: boolean;
  /** Maximum number of initials. */
  maxInitials?: number;
};

function AvatarFallback({
  className,
  children,
  name,
  colorize = false,
  maxInitials = 2,
  ...props
}: AvatarFallbackProps) {
  const size = React.useContext(AvatarSizeContext);
  const initials = React.useMemo(
    () => (name ? getInitials(name, maxInitials) : ""),
    [name, maxInitials],
  );
  const tint =
    colorize && name ? tintClasses[hashIndex(name, tintClasses.length)] : null;

  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      aria-label={name}
      className={cn(
        "flex size-full items-center justify-center rounded-[inherit] font-medium select-none",
        fallbackText[size],
        tint ?? "bg-muted",
        className,
      )}
      {...props}
    >
      {children ?? initials}
    </AvatarPrimitive.Fallback>
  );
}

/* -------------------------------------------------------------------------- */
/*  Group                                                                      */
/* -------------------------------------------------------------------------- */

type AvatarGroupProps = React.ComponentProps<"div"> &
  Pick<VariantProps<typeof avatarVariants>, "shape"> & {
    size?: AvatarSize;
    /** Show at most this many avatars, then a "+N" counter. */
    max?: number;
  };

const overlap: Record<AvatarSize, string> = {
  xs: "-space-x-1.5",
  sm: "-space-x-2",
  md: "-space-x-3",
  lg: "-space-x-3.5",
  xl: "-space-x-4",
};

function AvatarGroup({
  className,
  size = "md",
  shape,
  max,
  children,
  ...props
}: AvatarGroupProps) {
  const items = React.Children.toArray(children);
  const visible = max && items.length > max ? items.slice(0, max) : items;
  const hidden = items.length - visible.length;

  return (
    <AvatarGroupContext.Provider value={{ size, shape }}>
      <div
        data-slot="avatar-group"
        role="group"
        className={cn("flex items-center", overlap[size], className)}
        {...props}
      >
        {visible}
        {hidden > 0 ? (
          <Avatar aria-label={`${hidden} more`}>
            <AvatarFallback className="bg-muted text-muted-foreground">
              +{hidden}
            </AvatarFallback>
          </Avatar>
        ) : null}
      </div>
    </AvatarGroupContext.Provider>
  );
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  avatarVariants,
  getInitials,
};
export type { AvatarProps, AvatarFallbackProps, AvatarGroupProps, AvatarStatus };
