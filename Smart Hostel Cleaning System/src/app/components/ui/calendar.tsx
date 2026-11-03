"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./button";

/* -------------------------------------------------------------------------- */
/*  Sizes                                                                      */
/* -------------------------------------------------------------------------- */

const sizes = {
  sm: { day: "size-7 text-xs", head: "w-7 text-[0.7rem]" },
  md: { day: "size-8", head: "w-8 text-[0.8rem]" },
  lg: { day: "size-10 text-base", head: "w-10 text-sm" },
} as const;

type CalendarSize = keyof typeof sizes;

/* -------------------------------------------------------------------------- */
/*  Calendar                                                                   */
/* -------------------------------------------------------------------------- */

type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  /** Cell size: `sm`, `md` (default, same as before) or `lg`. */
  size?: CalendarSize;
  /** Adds a "Today" button below the grid that jumps to the current month. */
  showTodayButton?: boolean;
  todayLabel?: string;
  /** Called with today's date when the Today button is clicked, e.g. to select it. */
  onToday?: (today: Date) => void;
  /** Days that get a small dot, e.g. days with events or deadlines. */
  markedDates?: Date[];
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  size = "md",
  showTodayButton = false,
  todayLabel = "Today",
  onToday,
  markedDates,
  month,
  defaultMonth,
  onMonthChange,
  modifiers,
  modifiersClassNames,
  components,
  footer,
  captionLayout,
  fromYear,
  toYear,
  fromDate,
  toDate,
  ...props
}: CalendarProps) {
  /* ---- Month state: works controlled (month) or uncontrolled ------------- */
  const isMonthControlled = month !== undefined;
  const [internalMonth, setInternalMonth] = React.useState<Date>(
    () => defaultMonth ?? new Date(),
  );
  const currentMonth = isMonthControlled ? month : internalMonth;

  const handleMonthChange = React.useCallback(
    (next: Date) => {
      if (!isMonthControlled) setInternalMonth(next);
      onMonthChange?.(next);
    },
    [isMonthControlled, onMonthChange],
  );

  const goToToday = () => {
    const today = new Date();
    handleMonthChange(today);
    onToday?.(today);
  };

  /* ---- Month/year dropdowns need a year range; supply a sensible default - */
  const hasDropdown =
    captionLayout === "dropdown" || captionLayout === "dropdown-buttons";
  const thisYear = new Date().getFullYear();
  const hasStart = fromYear !== undefined || fromDate !== undefined;
  const hasEnd = toYear !== undefined || toDate !== undefined;
  const resolvedFromYear = hasDropdown && !hasStart ? thisYear - 100 : fromYear;
  const resolvedToYear = hasDropdown && !hasEnd ? thisYear + 10 : toYear;

  /* ---- Marked dates ------------------------------------------------------- */
  const mergedModifiers = React.useMemo(
    () => ({ ...modifiers, ...(markedDates ? { marked: markedDates } : {}) }),
    [modifiers, markedDates],
  );

  const mergedModifierClassNames = React.useMemo(
    () => ({
      marked:
        "relative after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary aria-selected:after:bg-primary-foreground",
      ...modifiersClassNames,
    }),
    [modifiersClassNames],
  );

  const todayFooter = showTodayButton ? (
    <button
      type="button"
      onClick={goToToday}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-full")}
    >
      {todayLabel}
    </button>
  ) : null;

  const sizeStyles = sizes[size];

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      month={currentMonth}
      onMonthChange={handleMonthChange}
      captionLayout={captionLayout}
      fromYear={resolvedFromYear}
      toYear={resolvedToYear}
      fromDate={fromDate}
      toDate={toDate}
      modifiers={mergedModifiers}
      modifiersClassNames={mergedModifierClassNames}
      footer={
        footer || todayFooter ? (
          <>
            {footer}
            {todayFooter}
          </>
        ) : undefined
      }
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: hasDropdown
          ? "inline-flex items-center px-2 py-1 text-sm font-medium"
          : "text-sm font-medium",
        caption_dropdowns: "flex items-center gap-1",
        dropdown_month:
          "relative inline-flex items-center rounded-md hover:bg-accent focus-within:ring-ring/50 focus-within:ring-[3px]",
        dropdown_year:
          "relative inline-flex items-center rounded-md hover:bg-accent focus-within:ring-ring/50 focus-within:ring-[3px]",
        // The native <select> sits invisibly over the visible label, keeping
        // full keyboard and screen reader support.
        dropdown: "absolute inset-0 z-10 w-full cursor-pointer appearance-none opacity-0",
        dropdown_icon: "ml-1 size-3.5 opacity-60",
        vhidden: "sr-only",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-x-1",
        head_row: "flex",
        head_cell: cn(
          "text-muted-foreground rounded-md font-normal",
          sizeStyles.head,
        ),
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-range-end)]:rounded-r-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "p-0 font-normal aria-selected:opacity-100",
          sizeStyles.day,
        ),
        day_range_start:
          "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_range_end:
          "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        footer: "pt-2",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
        IconDropdown: ({ className, ...props }) => (
          <ChevronDown className={cn("size-3.5", className)} {...props} />
        ),
        ...components,
      }}
      {...props}
    />
  );
}

export { Calendar };
export type { CalendarProps };
