"use client";

import * as React from "react";
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";
import { cva, type VariantProps } from "class-variance-authority";
import { ImageOffIcon } from "lucide-react";

import { cn } from "./utils";

/* -------------------------------------------------------------------------- */
/*  Ratio parsing                                                              */
/* -------------------------------------------------------------------------- */

const RATIO_PRESETS = {
  square: 1,
  photo: 4 / 3,
  video: 16 / 9,
  ultrawide: 21 / 9,
  portrait: 3 / 4,
  story: 9 / 16,
} as const;

type RatioPreset = keyof typeof RATIO_PRESETS;
type RatioString = `${number}/${number}` | `${number}:${number}`;
type RatioInput = number | RatioPreset | RatioString;

/** Turns 1.5, "video", "16/9" or "4:3" into a number. Falls back to 1 on bad input. */
function parseRatio(input: RatioInput): number {
  if (typeof input === "number") {
    return Number.isFinite(input) && input > 0 ? input : 1;
  }
  if (input in RATIO_PRESETS) return RATIO_PRESETS[input as RatioPreset];

  const [w, h] = input.split(/[/:]/).map(Number);
  return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0
    ? w / h
    : 1;
}

/* -------------------------------------------------------------------------- */
/*  Root                                                                       */
/* -------------------------------------------------------------------------- */

const frameVariants = cva("overflow-hidden", {
  variants: {
    rounded: {
      none: "",
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
      full: "rounded-full",
    },
    surface: {
      none: "",
      muted: "bg-muted",
    },
  },
  defaultVariants: { rounded: "none", surface: "none" },
});

type AspectRatioProps = Omit<
  React.ComponentProps<typeof AspectRatioPrimitive.Root>,
  "ratio"
> &
  VariantProps<typeof frameVariants> & {
    /** A number (16 / 9), a preset ("video"), or a string ("16/9", "4:3"). */
    ratio?: RatioInput;
  };

function AspectRatio({
  ratio = 1,
  rounded,
  surface,
  className,
  ...props
}: AspectRatioProps) {
  const value = React.useMemo(() => parseRatio(ratio), [ratio]);

  return (
    <AspectRatioPrimitive.Root
      data-slot="aspect-ratio"
      ratio={value}
      className={cn(frameVariants({ rounded, surface }), className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Image                                                                      */
/* -------------------------------------------------------------------------- */

type AspectRatioImageProps = Omit<React.ComponentProps<"img">, "alt"> & {
  /** Required. Use "" only for purely decorative images. */
  alt: string;
  fit?: "cover" | "contain" | "fill";
  /** Shown if the image fails to load. Defaults to a small broken-image icon. */
  fallback?: React.ReactNode;
};

const fitClasses = {
  cover: "object-cover",
  contain: "object-contain",
  fill: "object-fill",
} as const;

/** Image that fills the frame, shows a pulse placeholder while loading, and falls back on error. */
function AspectRatioImage({
  className,
  fit = "cover",
  fallback,
  src,
  alt,
  onLoad,
  onError,
  ...props
}: AspectRatioImageProps) {
  const [status, setStatus] = React.useState<"loading" | "loaded" | "error">(
    "loading",
  );
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Reset when the source changes, and catch images that finished before hydration.
  React.useEffect(() => {
    const img = imgRef.current;
    if (img?.complete) {
      setStatus(img.naturalWidth > 0 ? "loaded" : "error");
    } else {
      setStatus("loading");
    }
  }, [src]);

  if (status === "error") {
    return (
      <div
        data-slot="aspect-ratio-fallback"
        role="img"
        aria-label={alt || "Image unavailable"}
        className="bg-muted text-muted-foreground flex size-full items-center justify-center"
      >
        {fallback ?? <ImageOffIcon className="size-6" aria-hidden="true" />}
      </div>
    );
  }

  return (
    <>
      {status === "loading" ? (
        <div
          aria-hidden="true"
          className="bg-muted absolute inset-0 animate-pulse motion-reduce:animate-none"
        />
      ) : null}
      <img
        ref={imgRef}
        data-slot="aspect-ratio-image"
        src={src}
        alt={alt}
        onLoad={(e) => {
          setStatus("loaded");
          onLoad?.(e);
        }}
        onError={(e) => {
          setStatus("error");
          onError?.(e);
        }}
        className={cn(
          "size-full transition-opacity duration-300 motion-reduce:transition-none",
          fitClasses[fit],
          status === "loaded" ? "opacity-100" : "opacity-0",
          className,
        )}
        {...props}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Embed (YouTube, Maps, etc.)                                                */
/* -------------------------------------------------------------------------- */

type AspectRatioEmbedProps = Omit<React.ComponentProps<"iframe">, "title"> & {
  /** Required so screen readers can describe the embedded content. */
  title: string;
};

function AspectRatioEmbed({
  className,
  title,
  loading = "lazy",
  ...props
}: AspectRatioEmbedProps) {
  return (
    <iframe
      data-slot="aspect-ratio-embed"
      title={title}
      loading={loading}
      allowFullScreen
      className={cn("size-full border-0", className)}
      {...props}
    />
  );
}

export {
  AspectRatio,
  AspectRatioImage,
  AspectRatioEmbed,
  parseRatio,
  RATIO_PRESETS,
};
export type {
  AspectRatioProps,
  AspectRatioImageProps,
  AspectRatioEmbedProps,
  RatioInput,
};
