import * as React from "react";

export const MOBILE_BREAKPOINT = 768;

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 * Built on useSyncExternalStore: no initial `undefined` state, no extra
 * re-render after mount, and tear-free under concurrent rendering.
 *
 * @param query          A CSS media query, e.g. "(max-width: 767px)"
 * @param serverFallback Value to use during SSR / hydration (default: false)
 */
export function useMediaQuery(query: string, serverFallback = false): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) {
        return () => {};
      }
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = React.useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return serverFallback;
    }
    return window.matchMedia(query).matches;
  }, [query, serverFallback]);

  const getServerSnapshot = React.useCallback(
    () => serverFallback,
    [serverFallback],
  );

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * True when the viewport is narrower than `breakpoint` (default 768px).
 */
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  return useMediaQuery(`(max-width: ${breakpoint - 1}px)`);
}
