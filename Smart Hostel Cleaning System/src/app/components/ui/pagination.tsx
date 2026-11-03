import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";

import { cn } from "./utils";
import { Button, buttonVariants } from "./button";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      // <nav> already has the navigation role; only the label is needed
      aria-label="Pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
  /** Render as the child element (e.g. Next.js <Link>) instead of <a>. */
  asChild?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">;

function PaginationLink({
  className,
  isActive,
  asChild = false,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size,
        }),
        // use aria-disabled="true" on first/last page Previous/Next links
        "aria-disabled:pointer-events-none aria-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      rel="prev"
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">Previous</span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      rel="next"
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      // aria-hidden was removed here: it hid the "More pages" text below from
      // screen readers, which defeated the point of having it.
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" aria-hidden="true" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

/**
 * Builds the list of page numbers to render, with "ellipsis" markers for gaps.
 * Always shows the first and last page, the current page, and `siblings` pages
 * on each side of it.
 *
 *   getPaginationRange(1, 10)  -> [1, 2, 3, 4, 5, "ellipsis", 10]
 *   getPaginationRange(5, 10)  -> [1, "ellipsis", 4, 5, 6, "ellipsis", 10]
 *   getPaginationRange(10, 10) -> [1, "ellipsis", 6, 7, 8, 9, 10]
 */
function getPaginationRange(
  current: number,
  total: number,
  siblings = 1,
): Array<number | "ellipsis"> {
  const range = (from: number, to: number) =>
    Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

  // first + last + current + 2 siblings + 2 ellipses
  const slots = siblings * 2 + 5;
  if (total <= slots) return range(1, total);

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, total);
  const showLeftEllipsis = left > 3;
  const showRightEllipsis = right < total - 2;
  const edgeCount = siblings * 2 + 3;

  if (!showLeftEllipsis && showRightEllipsis) {
    return [...range(1, edgeCount), "ellipsis", total];
  }
  if (showLeftEllipsis && !showRightEllipsis) {
    return [1, "ellipsis", ...range(total - edgeCount + 1, total)];
  }
  return [1, "ellipsis", ...range(left, right), "ellipsis", total];
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
  getPaginationRange,
};
export type { PaginationLinkProps };
