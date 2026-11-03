import * as React from "react";

import { cn } from "./utils";

type TextareaProps = React.ComponentProps<"textarea"> & {
  /** Max height in px before the textarea scrolls. Default: no cap. */
  maxHeight?: number;
};

const supportsFieldSizing =
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("field-sizing", "content");

function Textarea({
  className,
  maxHeight,
  style,
  ref,
  onInput,
  ...props
}: TextareaProps) {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Merge the forwarded ref with our internal one.
  const setRefs = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // JS fallback for browsers without `field-sizing: content` (e.g. older Firefox/Safari).
  const resize = React.useCallback(() => {
    const el = innerRef.current;
    if (!el || supportsFieldSizing) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  React.useLayoutEffect(() => {
    resize();
  }, [resize, props.value, props.defaultValue]);

  return (
    <textarea
      ref={setRefs}
      data-slot="textarea"
      onInput={(e) => {
        resize();
        onInput?.(e);
      }}
      style={maxHeight ? { maxHeight, ...style } : style}
      className={cn(
        "flex field-sizing-content min-h-16 w-full resize-none overflow-y-auto rounded-md border border-input bg-input-background px-3 py-2 text-base outline-none",
        "placeholder:text-muted-foreground dark:bg-input/30",
        "transition-[color,box-shadow] motion-reduce:transition-none md:text-sm",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
export type { TextareaProps };
