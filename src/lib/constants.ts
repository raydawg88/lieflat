import type { USDCents } from "@/domain/entities";

/** Scoring weight configuration */
export const SCORE_WEIGHTS = {
  priceValue: 0.35,
  cabinQuality: 0.25,
  routeSimplicity: 0.15,
  timing: 0.1,
  reliability: 0.15,
} as const;

/** Estimated retail business class prices (one-way, in cents) for common routes */
export const RETAIL_BENCHMARKS: Record<string, USDCents> = {
  "DFW-BRU": 450_000,
  "DFW-LHR": 480_000,
  "DFW-CDG": 460_000,
  "JFK-BRU": 380_000,
  "ORD-BRU": 400_000,
  "DFW-JFK": 35_000,
  "DFW-ORD": 30_000,
  "LHR-BRU": 25_000,
};

/** Fastest known nonstop durations in minutes for common routes */
export const FASTEST_ROUTES: Record<string, number> = {
  "DFW-BRU": 600,
  "JFK-BRU": 480,
  "ORD-BRU": 510,
  "DFW-LHR": 570,
  "DFW-JFK": 210,
  "DFW-ORD": 150,
  "LHR-BRU": 75,
};

/** Cabin class display labels */
export const CABIN_LABELS: Record<string, string> = {
  economy: "Economy",
  premium_economy: "Premium Economy",
  business: "Business",
  first: "First",
};

/** Minimum connection time in minutes */
export const MIN_CONNECTION_MINUTES = 90;

/** Maximum connection time in minutes (above this, it's an overnight) */
export const MAX_CONNECTION_MINUTES = 480;
