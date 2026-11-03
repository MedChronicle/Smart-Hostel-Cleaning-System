import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CleanlinessStatus = "clean" | "moderate" | "dirty";

export const CLEANLINESS_THRESHOLDS = {
  clean: 80,
  moderate: 60,
} as const;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function average(values: readonly number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function getCleanlinessStatus(score: number): CleanlinessStatus {
  if (score >= CLEANLINESS_THRESHOLDS.clean) return "clean";
  if (score >= CLEANLINESS_THRESHOLDS.moderate) return "moderate";
  return "dirty";
}

const STATUS_STYLES: Record<
  CleanlinessStatus,
  { bg: string; border: string; text: string; hex: string; label: string }
> = {
  clean: {
    bg: "bg-green-500",
    border: "border-green-600",
    text: "text-green-700 dark:text-green-400",
    hex: "#22c55e",
    label: "Clean",
  },
  moderate: {
    bg: "bg-yellow-500",
    border: "border-yellow-600",
    text: "text-yellow-700 dark:text-yellow-400",
    hex: "#eab308",
    label: "Moderate",
  },
  dirty: {
    bg: "bg-red-500",
    border: "border-red-600",
    text: "text-red-700 dark:text-red-400",
    hex: "#ef4444",
    label: "Dirty",
  },
};

export function getCleanlinessStyle(score: number) {
  return STATUS_STYLES[getCleanlinessStatus(score)];
}

export function formatDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0m";
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000000],
  ["month", 2592000000],
  ["week", 604800000],
  ["day", 86400000],
  ["hour", 3600000],
  ["minute", 60000],
];

export function formatRelativeTime(timestamp: number, now = Date.now(), locale?: string) {
  const diff = timestamp - now;
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) {
      return formatter.format(Math.round(diff / ms), unit);
    }
  }
  return formatter.format(0, "second");
}

export function hoursSince(timestamp: number, now = Date.now()) {
  return Math.max(0, Math.floor((now - timestamp) / 3600000));
}

export function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delay);
  };

  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return debounced;
}

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): boolean {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string): boolean {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};

export function createId(length = 9) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, length);
  }
  return Math.random()
    .toString(36)
    .slice(2, 2 + length)
    .padEnd(length, "0");
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: readonly string[], rows: readonly (readonly unknown[])[]) {
  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function downloadFile(filename: string, content: string, type = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function groupBy<T, K extends string | number>(items: readonly T[], getKey: (item: T) => K) {
  const groups = new Map<K, T[]>();
  items.forEach((item) => {
    const key = getKey(item);
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  });
  return groups;
}
