"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "./utils";

type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root> & {
  /** Show a red asterisk after the label text. Purely visual: also set `required` on the input. */
  required?: boolean;
};

function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none",
        // disabled states, driven by a sibling input (peer) or a parent group
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        // invalid state, when the sibling input has aria-invalid
        "peer-aria-invalid:text-destructive",
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        // hidden from screen readers: the input's own `required` attribute already announces it
        <span aria-hidden="true" className="text-destructive">
          *
        </span>
      )}
    </LabelPrimitive.Root>
  );
}

export { Label };
export type { LabelProps };
