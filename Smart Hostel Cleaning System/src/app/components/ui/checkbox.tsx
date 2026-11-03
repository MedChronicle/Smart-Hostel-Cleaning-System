"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, MinusIcon } from "lucide-react";

import { cn } from "./utils";

/* -------------------------------------------------------------------------- */
/*  Variants                                                                   */
/* -------------------------------------------------------------------------- */

// `group/checkbox` lets the icons react to the root's data-state.
const checkboxVariants = cva(
  "group/checkbox peer border bg-input-background dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shrink-0 border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 relative [@media(pointer:coarse)]:after:absolute [@media(pointer:coarse)]:after:-inset-2",
  {
    variants: {
      size: {
        sm: "size-3.5 rounded-[3px] [&_svg]:size-3",
        md: "size-4 rounded-[4px] [&_svg]:size-3.5",
        lg: "size-5 rounded-[5px] [&_svg]:size-4",
      },
      // Checked and indeterminate share the same fill, so both states read as "on".
      tone: {
        default:
          "data-[state=checked]:bg-primary data-[state=indeterminate]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:text-primary-foreground data-[state=checked]:border-primary data-[state=indeterminate]:border-primary dark:data-[state=checked]:bg-primary dark:data-[state=indeterminate]:bg-primary",
        destructive:
          "data-[state=checked]:bg-destructive data-[state=indeterminate]:bg-destructive data-[state=checked]:text-white data-[state=indeterminate]:text-white data-[state=checked]:border-destructive data-[state=indeterminate]:border-destructive dark:data-[state=checked]:bg-destructive dark:data-[state=indeterminate]:bg-destructive",
        success:
          "data-[state=checked]:bg-emerald-600 data-[state=indeterminate]:bg-emerald-600 data-[state=checked]:text-white data-[state=indeterminate]:text-white data-[state=checked]:border-emerald-600 data-[state=indeterminate]:border-emerald-600 dark:data-[state=checked]:bg-emerald-600 dark:data-[state=indeterminate]:bg-emerald-600",
      },
    },
    defaultVariants: {
      size: "md",
      tone: "default",
    },
  },
);

/* -------------------------------------------------------------------------- */
/*  Checkbox                                                                   */
/* -------------------------------------------------------------------------- */

type CheckedState = boolean | "indeterminate";

type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root> &
  VariantProps<typeof checkboxVariants>;

function Checkbox({ className, size, tone, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(checkboxVariants({ size, tone }), className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current duration-150 data-[state=checked]:animate-in data-[state=checked]:zoom-in-50 motion-reduce:animate-none"
      >
        {/* A dash for the mixed state, a tick otherwise. */}
        <CheckIcon className="group-data-[state=indeterminate]/checkbox:hidden" />
        <MinusIcon className="hidden group-data-[state=indeterminate]/checkbox:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/*  CheckboxField: checkbox + label + description + error, wired together      */
/* -------------------------------------------------------------------------- */

type CheckboxFieldProps = Omit<CheckboxProps, "children"> & {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Marks the checkbox invalid and shows the message under the label. */
  error?: React.ReactNode;
  labelClassName?: string;
};

function CheckboxField({
  label,
  description,
  error,
  id,
  className,
  labelClassName,
  disabled,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: CheckboxFieldProps) {
  const generatedId = React.useId();
  const checkboxId = id ?? generatedId;
  const descriptionId = `${checkboxId}-description`;
  const errorId = `${checkboxId}-error`;

  const describedBy =
    [description ? descriptionId : null, error ? errorId : null, ariaDescribedBy]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div
      data-slot="checkbox-field"
      className={cn("flex items-start gap-3", className)}
    >
      <Checkbox
        id={checkboxId}
        disabled={disabled}
        aria-invalid={error ? true : ariaInvalid}
        aria-describedby={describedBy}
        className="mt-0.5"
        {...props}
      />
      <div className="grid gap-1">
        <label
          htmlFor={checkboxId}
          className={cn(
            "text-sm leading-snug font-medium select-none",
            disabled && "cursor-not-allowed opacity-50",
            labelClassName,
          )}
        >
          {label}
        </label>
        {description ? (
          <p
            id={descriptionId}
            className={cn(
              "text-muted-foreground text-sm",
              disabled && "opacity-50",
            )}
          >
            {description}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  useCheckboxGroup: multi-select with a "select all" that goes indeterminate */
/* -------------------------------------------------------------------------- */

function useCheckboxGroup(
  allValues: readonly string[],
  defaultValue: readonly string[] = [],
) {
  const [value, setValue] = React.useState<string[]>(() => [...defaultValue]);

  const toggle = React.useCallback((item: string, checked: CheckedState) => {
    setValue((current) =>
      checked === true
        ? current.includes(item)
          ? current
          : [...current, item]
        : current.filter((v) => v !== item),
    );
  }, []);

  const toggleAll = React.useCallback(
    (checked: CheckedState) => {
      setValue(checked === true ? [...allValues] : []);
    },
    [allValues],
  );

  /** false when none are selected, true when all are, "indeterminate" otherwise. */
  const allState = React.useMemo<CheckedState>(() => {
    const selected = allValues.filter((v) => value.includes(v)).length;
    if (selected === 0) return false;
    return selected === allValues.length ? true : "indeterminate";
  }, [allValues, value]);

  return {
    value,
    setValue,
    allState,
    toggle,
    toggleAll,
    clear: React.useCallback(() => setValue([]), []),
    /** Spread onto the "select all" checkbox. */
    allProps: {
      checked: allState,
      onCheckedChange: toggleAll,
    },
    /** Spread onto one item's checkbox: `<Checkbox {...group.getItemProps("a")} />`. */
    getItemProps: (item: string) => ({
      checked: value.includes(item),
      onCheckedChange: (checked: CheckedState) => toggle(item, checked),
    }),
  };
}

export { Checkbox, CheckboxField, useCheckboxGroup, checkboxVariants };
export type { CheckboxProps, CheckboxFieldProps, CheckedState };
