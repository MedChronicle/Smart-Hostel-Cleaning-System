import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // `peer` lets a following <Label> react to this input's disabled / invalid state
        "peer flex h-9 w-full min-w-0 rounded-md border border-input bg-input-background px-3 py-1 text-base outline-none md:text-sm",
        "dark:bg-input/30",
        // text
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        // file inputs
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // focus
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        // invalid
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        // disabled: pointer-events-none was removed because it prevented the
        // not-allowed cursor from ever showing (disabled inputs ignore clicks anyway)
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-[color,box-shadow] motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
