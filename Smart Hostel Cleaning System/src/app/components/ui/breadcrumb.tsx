"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "./utils";

/* -------------------------------------------------------------------------- */
/*  Separator context                                                          */
/* -------------------------------------------------------------------------- */

type SeparatorPreset = "chevron" | "slash" | "dot";

const separatorPresets: Record<SeparatorPreset, React.ReactNode> = {
  chevron: <ChevronRight />,
  slash: <span className="text-sm leading-none">/</span>,
  dot: <span className="text-sm leading-none">•</span>,
};

const BreadcrumbContext = React.createContext<{ separator: React.ReactNode }>({
  separator: separatorPresets.chevron,
});

/* -------------------------------------------------------------------------- */
/*  Compound parts (backwards compatible)                                      */
/* -------------------------------------------------------------------------- */

type BreadcrumbProps = React.ComponentProps<"nav"> & {
  /** Default separator for every <BreadcrumbSeparator />. A preset name or any node. */
  separator?: SeparatorPreset | React.ReactNode;
};

function Breadcrumb({
  separator = "chevron",
  "aria-label": ariaLabel = "breadcrumb",
  ...props
}: BreadcrumbProps) {
  const resolved = React.useMemo<React.ReactNode>(
    () =>
      typeof separator === "string" && separator in separatorPresets
        ? separatorPresets[separator as SeparatorPreset]
        : separator,
    [separator],
  );
  const value = React.useMemo(() => ({ separator: resolved }), [resolved]);

  return (
    <BreadcrumbContext.Provider value={value}>
      <nav aria-label={ariaLabel} data-slot="breadcrumb" {...props} />
    </BreadcrumbContext.Provider>
  );
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex min-w-0 items-center gap-1.5", className)}
      {...props}
    />
  );
}

function BreadcrumbLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<"a"> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn(
        "hover:text-foreground focus-visible:ring-ring/50 rounded-sm outline-none transition-colors focus-visible:ring-[3px]",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("text-foreground font-normal", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) {
  const { separator } = React.useContext(BreadcrumbContext);

  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? separator}
    </li>
  );
}

function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  BreadcrumbTrail: data-driven, collapsible, truncating, SEO-ready           */
/* -------------------------------------------------------------------------- */

type BreadcrumbTrailItem = {
  label: React.ReactNode;
  /** Omit on the last item (the current page) or on non-navigable levels. */
  href?: string;
  icon?: React.ReactNode;
  /** Plain-text name used for tooltips and structured data when `label` is a node. */
  title?: string;
};

type BreadcrumbTrailProps = Omit<BreadcrumbProps, "children"> & {
  /** Ordered from root to current page. The last item is the current page. */
  items: BreadcrumbTrailItem[];
  /** Collapse the middle into an expandable "…" once there are more items than this. */
  maxItems?: number;
  /** Custom link component, e.g. `next/link`. Receives `href` and the label. */
  linkAs?: React.ElementType;
  /** Emit schema.org BreadcrumbList JSON-LD for search engines. */
  structuredData?: boolean;
  /** Needed to turn relative hrefs into absolute URLs in the JSON-LD. */
  baseUrl?: string;
  listClassName?: string;
};

const labelWidth = "max-w-[10rem] sm:max-w-[16rem]";

function plainName(item: BreadcrumbTrailItem): string {
  if (item.title) return item.title;
  return typeof item.label === "string" ? item.label : "";
}

function BreadcrumbTrail({
  items,
  maxItems,
  linkAs,
  structuredData = false,
  baseUrl,
  listClassName,
  ...props
}: BreadcrumbTrailProps) {
  const [expanded, setExpanded] = React.useState(false);
  const trailId = React.useId();
  const shouldFocusRevealed = React.useRef(false);

  const limit = maxItems ? Math.max(2, maxItems) : undefined;
  const collapsed = Boolean(limit && !expanded && items.length > limit);
  const hiddenCount = collapsed && limit ? items.length - limit : 0;

  // After expanding, move focus to the first revealed link so keyboard users don't lose their place.
  React.useEffect(() => {
    if (expanded && shouldFocusRevealed.current) {
      shouldFocusRevealed.current = false;
      document
        .querySelector(`[data-trail="${CSS.escape(trailId)}"]`)
        ?.querySelector<HTMLElement>("[data-revealed] a")
        ?.focus();
    }
  }, [expanded, trailId]);

  const jsonLd = React.useMemo(() => {
    if (!structuredData) return null;
    const elements = items
      .map((item, index) => ({ item, index, name: plainName(item) }))
      .filter(({ name }) => name)
      .map(({ item, index, name }) => {
        let url: string | undefined;
        if (item.href && baseUrl) {
          try {
            url = new URL(item.href, baseUrl).toString();
          } catch {
            url = undefined;
          }
        }
        return {
          "@type": "ListItem",
          position: index + 1,
          name,
          ...(url ? { item: url } : {}),
        };
      });
    if (elements.length === 0) return null;
    // Escape "<" so item text can never close the script tag.
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: elements,
    }).replace(/</g, "\\u003c");
  }, [structuredData, items, baseUrl]);

  const renderContent = (item: BreadcrumbTrailItem) => (
    <>
      {item.icon ? (
        <span aria-hidden="true" className="inline-flex shrink-0 [&>svg]:size-4">
          {item.icon}
        </span>
      ) : null}
      <span className="truncate">{item.label}</span>
    </>
  );

  const renderEntry = (item: BreadcrumbTrailItem, isLast: boolean) => {
    const common = cn("inline-flex items-center gap-1.5", labelWidth);
    const title = plainName(item) || undefined;

    if (isLast) {
      return (
        <BreadcrumbPage className={common} title={title}>
          {renderContent(item)}
        </BreadcrumbPage>
      );
    }
    if (item.href) {
      const Link = linkAs;
      return Link ? (
        <BreadcrumbLink asChild className={common}>
          <Link href={item.href} title={title}>
            {renderContent(item)}
          </Link>
        </BreadcrumbLink>
      ) : (
        <BreadcrumbLink href={item.href} className={common} title={title}>
          {renderContent(item)}
        </BreadcrumbLink>
      );
    }
    return (
      <span className={common} title={title}>
        {renderContent(item)}
      </span>
    );
  };

  // Which items to show, as [item, originalIndex] pairs, with a marker where "…" goes.
  const entries: Array<{ item: BreadcrumbTrailItem; index: number } | "ellipsis"> =
    [];
  if (collapsed && limit) {
    const tail = limit - 1;
    entries.push({ item: items[0], index: 0 });
    entries.push("ellipsis");
    for (let i = items.length - tail; i < items.length; i++) {
      entries.push({ item: items[i], index: i });
    }
  } else {
    items.forEach((item, index) => entries.push({ item, index }));
  }

  const firstRevealedIndex = 1; // the item right after the root, once expanded

  return (
    <>
      <Breadcrumb data-trail={trailId} {...props}>
        <BreadcrumbList className={listClassName}>
          {entries.map((entry, position) => {
            const isFirst = position === 0;

            if (entry === "ellipsis") {
              return (
                <React.Fragment key="ellipsis">
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <button
                      type="button"
                      aria-label={`Show ${hiddenCount} hidden ${
                        hiddenCount === 1 ? "level" : "levels"
                      }`}
                      aria-expanded={false}
                      onClick={() => {
                        shouldFocusRevealed.current = true;
                        setExpanded(true);
                      }}
                      className="hover:text-foreground focus-visible:ring-ring/50 flex size-6 items-center justify-center rounded-sm outline-none transition-colors focus-visible:ring-[3px]"
                    >
                      <MoreHorizontal className="size-4" aria-hidden="true" />
                    </button>
                  </BreadcrumbItem>
                </React.Fragment>
              );
            }

            const { item, index } = entry;
            const isLast = index === items.length - 1;
            return (
              <React.Fragment key={index}>
                {!isFirst ? <BreadcrumbSeparator /> : null}
                <BreadcrumbItem
                  data-revealed={
                    expanded && index === firstRevealedIndex ? "" : undefined
                  }
                >
                  {renderEntry(item, isLast)}
                </BreadcrumbItem>
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // Safe: JSON.stringify output with "<" escaped above.
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      ) : null}
    </>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  BreadcrumbTrail,
};
export type { BreadcrumbProps, BreadcrumbTrailProps, BreadcrumbTrailItem };
