"use client";

import * as React from "react";
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react";
import { ArrowLeft, ArrowRight, PauseIcon, PlayIcon } from "lucide-react";

import { cn } from "./utils";
import { Button } from "./button";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type AutoplayOptions = {
  /** Milliseconds each slide stays on screen. Default 5000. */
  delay?: number;
  /** Pause while the pointer is over the carousel. Default true. */
  pauseOnHover?: boolean;
  /** Stop for good once the user drags or uses the arrows or dots. Default true. */
  stopOnInteraction?: boolean;
};

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
  /**
   * Built-in autoplay. `true` uses 5s, a number sets the delay, an object sets everything.
   * Never starts for users who prefer reduced motion, and pauses on hover, keyboard
   * focus, and when the tab is hidden.
   */
  autoplay?: boolean | number | AutoplayOptions;
};

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  scrollTo: (index: number) => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  selectedIndex: number;
  snapCount: number;
  autoplayEnabled: boolean;
  isPlaying: boolean;
  toggleAutoplay: () => void;
} & Pick<CarouselProps, "opts" | "plugins" | "setApi"> & {
    orientation: "horizontal" | "vertical";
  };

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }

  return context;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/* -------------------------------------------------------------------------- */
/*  Carousel                                                                   */
/* -------------------------------------------------------------------------- */

function Carousel({
  orientation,
  opts,
  setApi,
  plugins,
  autoplay,
  className,
  children,
  onKeyDownCapture,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props
}: React.ComponentProps<"div"> & CarouselProps) {
  const resolvedOrientation: "horizontal" | "vertical" =
    orientation ?? (opts?.axis === "y" ? "vertical" : "horizontal");

  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: resolvedOrientation === "horizontal" ? "x" : "y",
    },
    plugins,
  );
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [snapCount, setSnapCount] = React.useState(0);

  /* ---- Autoplay config (primitives only, so inline objects don't restart it) */
  const autoplayEnabled = Boolean(autoplay);
  const autoplayObject =
    autoplay && typeof autoplay === "object" ? autoplay : undefined;
  const delay =
    typeof autoplay === "number" ? autoplay : (autoplayObject?.delay ?? 5000);
  const pauseOnHover = autoplayObject?.pauseOnHover ?? true;
  const stopOnInteraction = autoplayObject?.stopOnInteraction ?? true;

  const reducedMotion = usePrefersReducedMotion();
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isHidden, setIsHidden] = React.useState(false);

  React.useEffect(() => {
    setIsPlaying(autoplayEnabled && !reducedMotion);
  }, [autoplayEnabled, reducedMotion]);

  React.useEffect(() => {
    const onVisibility = () => setIsHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /* ---- Embla state sync -------------------------------------------------- */
  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
    setSelectedIndex(api.selectedScrollSnap());
    setSnapCount(api.scrollSnapList().length);
  }, []);

  const stopAutoplay = React.useCallback(() => {
    if (stopOnInteraction) setIsPlaying(false);
  }, [stopOnInteraction]);

  const scrollPrev = React.useCallback(() => {
    stopAutoplay();
    api?.scrollPrev();
  }, [api, stopAutoplay]);

  const scrollNext = React.useCallback(() => {
    stopAutoplay();
    api?.scrollNext();
  }, [api, stopAutoplay]);

  const scrollTo = React.useCallback(
    (index: number) => {
      stopAutoplay();
      api?.scrollTo(index);
    },
    [api, stopAutoplay],
  );

  const toggleAutoplay = React.useCallback(() => {
    setIsPlaying((playing) => !playing);
  }, []);

  React.useEffect(() => {
    if (!api || !setApi) return;
    setApi(api);
  }, [api, setApi]);

  React.useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);

    return () => {
      api.off("reInit", onSelect);
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  // Dragging counts as interaction.
  React.useEffect(() => {
    if (!api || !autoplayEnabled) return;
    api.on("pointerDown", stopAutoplay);
    return () => {
      api.off("pointerDown", stopAutoplay);
    };
  }, [api, autoplayEnabled, stopAutoplay]);

  // Each slide gets a full `delay`: the timer restarts whenever the selection changes.
  React.useEffect(() => {
    if (!api || !isPlaying || isPaused || isHidden || snapCount <= 1) return;

    const timer = window.setTimeout(() => {
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [api, isPlaying, isPaused, isHidden, snapCount, delay, selectedIndex]);

  /* ---- Keyboard ----------------------------------------------------------- */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDownCapture?.(event);
    if (event.defaultPrevented) return;

    // Don't hijack keys while someone is typing inside a slide.
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, select, [contenteditable='true']")) {
      return;
    }

    const rtl = opts?.direction === "rtl";
    const prevKeys = [rtl ? "ArrowRight" : "ArrowLeft"];
    const nextKeys = [rtl ? "ArrowLeft" : "ArrowRight"];
    if (resolvedOrientation === "vertical") {
      prevKeys.push("ArrowUp");
      nextKeys.push("ArrowDown");
    }

    if (prevKeys.includes(event.key)) {
      event.preventDefault();
      scrollPrev();
    } else if (nextKeys.includes(event.key)) {
      event.preventDefault();
      scrollNext();
    } else if (event.key === "Home" && snapCount > 1) {
      event.preventDefault();
      scrollTo(0);
    } else if (event.key === "End" && snapCount > 1) {
      event.preventDefault();
      scrollTo(snapCount - 1);
    }
  };

  /* ---- Pause on hover and keyboard focus --------------------------------- */
  const handleFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    onFocus?.(event);
    const target = event.target as HTMLElement;
    // The play/pause button must not freeze the thing it controls.
    if (target.closest("[data-carousel-autoplay-toggle]")) return;
    if (target.matches(":focus-visible")) setIsPaused(true);
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    onBlur?.(event);
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsPaused(false);
    }
  };

  const contextValue = React.useMemo<CarouselContextProps>(
    () => ({
      carouselRef,
      api,
      opts,
      orientation: resolvedOrientation,
      scrollPrev,
      scrollNext,
      scrollTo,
      canScrollPrev,
      canScrollNext,
      selectedIndex,
      snapCount,
      autoplayEnabled,
      isPlaying,
      toggleAutoplay,
    }),
    [
      carouselRef,
      api,
      opts,
      resolvedOrientation,
      scrollPrev,
      scrollNext,
      scrollTo,
      canScrollPrev,
      canScrollNext,
      selectedIndex,
      snapCount,
      autoplayEnabled,
      isPlaying,
      toggleAutoplay,
    ],
  );

  return (
    <CarouselContext.Provider value={contextValue}>
      <div
        onKeyDownCapture={handleKeyDown}
        onMouseEnter={(event) => {
          onMouseEnter?.(event);
          if (pauseOnHover) setIsPaused(true);
        }}
        onMouseLeave={(event) => {
          onMouseLeave?.(event);
          setIsPaused(false);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
        {/* Polite announcements, but never while slides are changing on their own. */}
        <div
          className="sr-only"
          aria-live={isPlaying ? "off" : "polite"}
          aria-atomic="true"
        >
          {snapCount > 1 ? `Slide ${selectedIndex + 1} of ${snapCount}` : null}
        </div>
      </div>
    </CarouselContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Content and items (unchanged)                                              */
/* -------------------------------------------------------------------------- */

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div
      ref={carouselRef}
      className="overflow-hidden"
      data-slot="carousel-content"
    >
      <div
        className={cn(
          "flex",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  const { orientation } = useCarousel();

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Arrows                                                                     */
/* -------------------------------------------------------------------------- */

type CarouselArrowProps = React.ComponentProps<typeof Button> & {
  /** Place the arrow over the slides instead of outside them. Good for mobile. */
  inset?: boolean;
};

function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon",
  inset = false,
  onClick,
  ...props
}: CarouselArrowProps) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn(
        "absolute size-8 rounded-full",
        inset && "bg-background/80 backdrop-blur-sm",
        orientation === "horizontal"
          ? cn("top-1/2 -translate-y-1/2", inset ? "left-2" : "-left-12")
          : cn("left-1/2 -translate-x-1/2 rotate-90", inset ? "top-2" : "-top-12"),
        className,
      )}
      disabled={!canScrollPrev}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) scrollPrev();
      }}
      {...props}
    >
      <ArrowLeft />
      <span className="sr-only">Previous slide</span>
    </Button>
  );
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon",
  inset = false,
  onClick,
  ...props
}: CarouselArrowProps) {
  const { orientation, scrollNext, canScrollNext } = useCarousel();

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn(
        "absolute size-8 rounded-full",
        inset && "bg-background/80 backdrop-blur-sm",
        orientation === "horizontal"
          ? cn("top-1/2 -translate-y-1/2", inset ? "right-2" : "-right-12")
          : cn("left-1/2 -translate-x-1/2 rotate-90", inset ? "bottom-2" : "-bottom-12"),
        className,
      )}
      disabled={!canScrollNext}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) scrollNext();
      }}
      {...props}
    >
      <ArrowRight />
      <span className="sr-only">Next slide</span>
    </Button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dots, counter, play/pause                                                  */
/* -------------------------------------------------------------------------- */

/** One dot per slide group. Each dot is a 24px tap target around a small visual dot. */
function CarouselDots({ className, ...props }: React.ComponentProps<"div">) {
  const { snapCount, selectedIndex, scrollTo, orientation } = useCarousel();
  if (snapCount <= 1) return null;

  return (
    <div
      role="group"
      aria-label="Choose slide"
      data-slot="carousel-dots"
      className={cn(
        "flex items-center justify-center",
        orientation === "vertical" && "flex-col",
        className,
      )}
      {...props}
    >
      {Array.from({ length: snapCount }, (_, index) => {
        const active = index === selectedIndex;
        return (
          <button
            key={index}
            type="button"
            aria-label={`Go to slide ${index + 1}`}
            aria-current={active ? "true" : undefined}
            onClick={() => scrollTo(index)}
            className="focus-visible:ring-ring/50 group flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-[3px]"
          >
            <span
              aria-hidden="true"
              className={cn(
                "bg-muted-foreground/40 group-hover:bg-muted-foreground/70 block h-2 rounded-full transition-all motion-reduce:transition-none",
                active ? "bg-primary group-hover:bg-primary w-5" : "w-2",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

/** "2 / 5". Hidden from screen readers because the carousel already announces the slide. */
function CarouselCounter({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const { selectedIndex, snapCount } = useCarousel();
  if (snapCount <= 1) return null;

  return (
    <span
      aria-hidden="true"
      data-slot="carousel-counter"
      className={cn("text-muted-foreground text-sm tabular-nums", className)}
      {...props}
    >
      {selectedIndex + 1} / {snapCount}
    </span>
  );
}

/** Pause and play control. Required for accessibility whenever slides move on their own. */
function CarouselPlayPause({
  className,
  variant = "outline",
  size = "icon",
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { autoplayEnabled, isPlaying, toggleAutoplay } = useCarousel();
  if (!autoplayEnabled) return null;

  return (
    <Button
      data-slot="carousel-play-pause"
      data-carousel-autoplay-toggle=""
      variant={variant}
      size={size}
      className={cn("size-8 rounded-full", className)}
      aria-label={isPlaying ? "Pause autoplay" : "Start autoplay"}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) toggleAutoplay();
      }}
      {...props}
    >
      {isPlaying ? <PauseIcon /> : <PlayIcon />}
    </Button>
  );
}

export {
  type CarouselApi,
  type CarouselProps,
  type AutoplayOptions,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  CarouselDots,
  CarouselCounter,
  CarouselPlayPause,
  useCarousel,
};
