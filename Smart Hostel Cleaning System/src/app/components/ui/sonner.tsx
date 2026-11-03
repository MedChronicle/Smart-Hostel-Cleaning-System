"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Themed Sonner toaster. Mount once near the app root (inside ThemeProvider).
 */
function Toaster({ style, toastOptions, ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // sensible defaults; all overridable via props
      position="bottom-right"
      closeButton
      richColors
      // `React.CSSProperties` was used in the original without importing React;
      // it now comes from the namespace import above.
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          // user-supplied style merges last so it can override the tokens above
          ...style,
        } as React.CSSProperties
      }
      toastOptions={{
        ...toastOptions,
        classNames: {
          toast: "group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
