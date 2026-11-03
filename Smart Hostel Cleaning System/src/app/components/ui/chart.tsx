"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "./utils";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    /** Appended to values in the tooltip, e.g. "ms" or "%". */
    unit?: string;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Keys become CSS custom property names, so anything outside [a-zA-Z0-9_-] is replaced. */
function safeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, "-");
}

/**
 * Config colors are written into a <style> tag. Reject anything that could end the
 * declaration or the rule, so a color from user data can't inject CSS.
 */
function safeColor(color: string | undefined): string | null {
  if (!color) return null;
  return /[;{}<>\\@]|\/\*|url\(/i.test(color) ? null : color.trim();
}

/** `var(--color-desktop)`, using the same key sanitizing as the generated CSS. */
function chartColor(key: string): string {
  return `var(--color-${safeKey(key)})`;
}

function defaultFormat(value: unknown): string {
  if (typeof value === "number") return value.toLocaleString();
  if (Array.isArray(value)) return value.map(defaultFormat).join(" – ");
  return String(value);
}

/* -------------------------------------------------------------------------- */
/*  Context                                                                    */
/* -------------------------------------------------------------------------- */

type ChartContextProps = {
  config: ChartConfig;
  /** Series keys hidden through the interactive legend. */
  hiddenKeys: ReadonlySet<string>;
  /** Pass to a series' `hide` prop: `<Bar hide={isHidden("desktop")} />`. */
  isHidden: (key: string) => boolean;
  toggleSeries: (key: string) => void;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

/* -------------------------------------------------------------------------- */
/*  Container                                                                  */
/* -------------------------------------------------------------------------- */

type ChartContainerProps = React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
  /** Screen-reader summary of what the chart shows, linked with aria-describedby. */
  description?: string;
  /** Show a pulsing placeholder instead of the chart. */
  loading?: boolean;
  /** Show `emptyMessage` instead of an empty-looking chart. */
  isEmpty?: boolean;
  emptyMessage?: React.ReactNode;
};

function ChartContainer({
  id,
  className,
  children,
  config,
  description,
  loading = false,
  isEmpty = false,
  emptyMessage = "No data to show",
  "aria-label": ariaLabel,
  ...props
}: ChartContainerProps) {
  const uniqueId = React.useId();
  const chartId = `chart-${safeKey(id || uniqueId.replace(/:/g, ""))}`;
  const descriptionId = `${chartId}-description`;

  const [hiddenKeys, setHiddenKeys] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const toggleSeries = React.useCallback((key: string) => {
    setHiddenKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const contextValue = React.useMemo<ChartContextProps>(
    () => ({
      config,
      hiddenKeys,
      isHidden: (key) => hiddenKeys.has(key),
      toggleSeries,
    }),
    [config, hiddenKeys, toggleSeries],
  );

  return (
    <ChartContext.Provider value={contextValue}>
      <div
        data-slot="chart"
        data-chart={chartId}
        role={ariaLabel ? "group" : undefined}
        aria-label={ariaLabel}
        aria-describedby={description ? descriptionId : undefined}
        aria-busy={loading || undefined}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        {description ? (
          <p id={descriptionId} className="sr-only">
            {description}
          </p>
        ) : null}
        <ChartStyle id={chartId} config={config} />
        {loading ? (
          <div
            role="status"
            className="bg-muted/60 w-full animate-pulse self-stretch rounded-lg motion-reduce:animate-none"
          >
            <span className="sr-only">Loading chart</span>
          </div>
        ) : isEmpty ? (
          <div className="text-muted-foreground flex size-full items-center justify-center text-sm">
            {emptyMessage}
          </div>
        ) : (
          <RechartsPrimitive.ResponsiveContainer>
            {children}
          </RechartsPrimitive.ResponsiveContainer>
        )}
      </div>
    </ChartContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Style (CSS variables per series, light and dark)                           */
/* -------------------------------------------------------------------------- */

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme || config.color,
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(([theme, prefix]) => {
            const declarations = colorConfig
              .map(([key, itemConfig]) => {
                const color = safeColor(
                  itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
                    itemConfig.color,
                );
                return color ? `  --color-${safeKey(key)}: ${color};` : null;
              })
              .filter(Boolean)
              .join("\n");

            return `
${prefix} [data-chart="${safeKey(id)}"] {
${declarations}
}
`;
          })
          .join("\n"),
      }}
    />
  );
};

/* -------------------------------------------------------------------------- */
/*  Tooltip                                                                    */
/* -------------------------------------------------------------------------- */

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
  valueFormatter,
  showTotal = false,
  totalLabel = "Total",
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
    /** Format every value, e.g. `(v) => "$" + v.toFixed(2)`. Simpler than replacing whole rows with `formatter`. */
    valueFormatter?: (value: unknown, name: string) => React.ReactNode;
    /** Add a summed total row when there is more than one series. */
    showTotal?: boolean;
    totalLabel?: React.ReactNode;
  }) {
  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof label === "string"
        ? config[label as keyof typeof config]?.label || label
        : itemConfig?.label;

    if (labelFormatter) {
      return (
        <div className={cn("font-medium", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      );
    }

    if (!value) {
      return null;
    }

    return <div className={cn("font-medium", labelClassName)}>{value}</div>;
  }, [
    label,
    labelFormatter,
    payload,
    hideLabel,
    labelClassName,
    config,
    labelKey,
  ]);

  if (!active || !payload?.length) {
    return null;
  }

  const nestLabel = payload.length === 1 && indicator !== "dot";

  const total = payload.reduce(
    (sum, item) => (typeof item.value === "number" ? sum + item.value : sum),
    0,
  );

  return (
    <div
      className={cn(
        "border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          const indicatorColor = color || item.payload?.fill || item.color;
          // Zero is a real value; only skip when there is nothing to show.
          const hasValue =
            item.value !== undefined && item.value !== null && item.value !== "";

          return (
            <div
              key={`${item.dataKey ?? item.name ?? index}`}
              className={cn(
                "[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
                indicator === "dot" && "items-center",
              )}
            >
              {formatter && item?.value !== undefined && item.name ? (
                formatter(item.value, item.name, item, index, item.payload)
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator && (
                      <div
                        className={cn(
                          "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                          {
                            "h-2.5 w-2.5": indicator === "dot",
                            "w-1": indicator === "line",
                            "w-0 border-[1.5px] border-dashed bg-transparent":
                              indicator === "dashed",
                            "my-0.5": nestLabel && indicator === "dashed",
                          },
                        )}
                        style={
                          {
                            "--color-bg": indicatorColor,
                            "--color-border": indicatorColor,
                          } as React.CSSProperties
                        }
                      />
                    )
                  )}
                  <div
                    className={cn(
                      "flex flex-1 justify-between gap-4 leading-none",
                      nestLabel ? "items-end" : "items-center",
                    )}
                  >
                    <div className="grid gap-1.5">
                      {nestLabel ? tooltipLabel : null}
                      <span className="text-muted-foreground">
                        {itemConfig?.label || item.name}
                      </span>
                    </div>
                    {hasValue ? (
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {valueFormatter
                          ? valueFormatter(item.value, String(item.name ?? key))
                          : defaultFormat(item.value)}
                        {itemConfig?.unit ? (
                          <span className="text-muted-foreground ml-0.5 font-normal">
                            {itemConfig.unit}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          );
        })}
        {showTotal && payload.length > 1 ? (
          <div className="border-border/50 mt-0.5 flex items-center justify-between gap-4 border-t pt-1.5 font-medium">
            <span className="text-muted-foreground">{totalLabel}</span>
            <span className="text-foreground font-mono tabular-nums">
              {valueFormatter
                ? valueFormatter(total, "total")
                : defaultFormat(total)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Legend                                                                     */
/* -------------------------------------------------------------------------- */

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
  interactive = false,
}: React.ComponentProps<"div"> &
  Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
    hideIcon?: boolean;
    nameKey?: string;
    /**
     * Make each entry a toggle button. Wire the series up with
     * `const { isHidden } = useChart()` and `<Bar hide={isHidden("desktop")} />`.
     * Works for Bar, Line and Area series.
     */
    interactive?: boolean;
  }) {
  const { config, isHidden, toggleSeries } = useChart();

  // Reference lines and similar report type "none"; they aren't legend entries.
  const items = payload?.filter((item) => item.type !== "none");

  if (!items?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
    >
      {items.map((item, index) => {
        const key = `${nameKey || item.dataKey || "value"}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);
        const seriesKey = String(item.dataKey ?? item.value ?? key);
        const hidden = interactive && isHidden(seriesKey);

        const content = (
          <>
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            {itemConfig?.label}
          </>
        );

        const itemClass =
          "[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3";

        return interactive ? (
          <button
            key={`${seriesKey}-${index}`}
            type="button"
            aria-pressed={!hidden}
            onClick={() => toggleSeries(seriesKey)}
            className={cn(
              itemClass,
              "focus-visible:ring-ring/50 rounded-sm outline-none transition-opacity focus-visible:ring-[3px] motion-reduce:transition-none",
              hidden && "opacity-40 line-through",
            )}
          >
            {content}
          </button>
        ) : (
          <div key={`${seriesKey}-${index}`} className={itemClass}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Payload helper                                                             */
/* -------------------------------------------------------------------------- */

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string,
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string;
  }

  return configLabelKey in config
    ? config[configLabelKey]
    : config[key as keyof typeof config];
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  useChart,
  chartColor,
};
export type { ChartContainerProps };
