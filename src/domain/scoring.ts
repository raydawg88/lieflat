import type {
  Route,
  Opportunity,
  OpportunityScore,
  ScoreFactor,
  Segment,
} from "./entities";
import { CabinClass, FareSource, createId } from "./entities";
import { SCORE_WEIGHTS, RETAIL_BENCHMARKS, FASTEST_ROUTES } from "@/lib/constants";
import { formatUSD, formatPercent, formatDuration } from "@/lib/format";

// ─── Helpers ───

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Build a route key like "DFW-BRU" for benchmark lookups */
function routeKey(origin: string, destination: string): string {
  return `${origin}-${destination}`;
}

/** Get the longest segment in a route (by duration) */
function getLongestSegment(segments: Segment[]): Segment | undefined {
  return segments.reduce<Segment | undefined>((longest, seg) => {
    const duration =
      new Date(seg.arrivalTime).getTime() - new Date(seg.departureTime).getTime();
    const longestDuration = longest
      ? new Date(longest.arrivalTime).getTime() - new Date(longest.departureTime).getTime()
      : 0;
    return duration > longestDuration ? seg : longest;
  }, undefined);
}

/** Get segment duration in minutes */
function segmentDurationMinutes(seg: Segment): number {
  return (
    (new Date(seg.arrivalTime).getTime() - new Date(seg.departureTime).getTime()) / 60_000
  );
}

// ─── Scoring Factors ───

/** Factor 1: Price Value — how cheap is this vs. retail? */
export function scorePriceValue(route: Route): ScoreFactor {
  const origin = route.allSegments[0]?.origin ?? "";
  const destination = route.allSegments[route.allSegments.length - 1]?.destination ?? "";
  const key = routeKey(origin, destination);
  const retail = RETAIL_BENCHMARKS[key];

  let score: number;
  let explanation: string;

  if (!retail) {
    // No benchmark — give a middling score, can't evaluate
    score = 50;
    explanation = `${formatUSD(route.totalPriceCents)} (no retail benchmark available)`;
  } else {
    const discount = 1 - route.totalPriceCents / retail;
    score = clamp(Math.round(discount * 125), 0, 100);
    explanation = `${formatPercent(Math.max(0, discount))} below typical business class fare (${formatUSD(route.totalPriceCents)} vs ${formatUSD(retail)} retail)`;
  }

  const weight = SCORE_WEIGHTS.priceValue;
  return {
    name: "Price Value",
    score,
    weight,
    weightedScore: Math.round(score * weight),
    explanation,
  };
}

/** Factor 2: Cabin Quality — lie-flat is the whole point */
export function scoreCabinQuality(route: Route): ScoreFactor {
  const longest = getLongestSegment(route.allSegments);
  const longestDuration = longest ? segmentDurationMinutes(longest) : 0;
  const isLongHaul = longestDuration >= 360; // 6+ hours
  const isMediumHaul = longestDuration >= 180; // 3+ hours

  let score: number;
  let explanation: string;

  if (longest?.isLieFlat && isLongHaul) {
    score = 100;
    explanation = `Lie-flat seat on ${longest.airline} ${longest.aircraft ?? longest.flightNumber} (${formatDuration(longestDuration)} segment)`;
  } else if (longest?.isLieFlat && isMediumHaul) {
    score = 60;
    explanation = `Lie-flat seat on medium-haul ${longest.airline} ${longest.flightNumber} (${formatDuration(longestDuration)})`;
  } else if (
    longest?.cabinClass === CabinClass.Business &&
    !longest.isLieFlat &&
    isLongHaul
  ) {
    score = 40;
    explanation = `Business class (non-lie-flat) on ${longest.airline} ${longest.flightNumber}`;
  } else if (longest?.cabinClass === CabinClass.PremiumEconomy && isLongHaul) {
    score = 20;
    explanation = `Premium Economy on ${longest.airline} ${longest.flightNumber} — extra legroom but no lie-flat`;
  } else {
    score = 5;
    explanation = "No lie-flat segment — economy throughout";
  }

  const weight = SCORE_WEIGHTS.cabinQuality;
  return {
    name: "Cabin Quality",
    score,
    weight,
    weightedScore: Math.round(score * weight),
    explanation,
  };
}

/** Factor 3: Route Simplicity — fewer connections = better */
export function scoreRouteSimplicity(route: Route): ScoreFactor {
  const connections = route.connectionCount;
  let score: number;

  if (connections === 0) score = 100;
  else if (connections === 1) score = 75;
  else if (connections === 2) score = 45;
  else score = 15;

  // Penalize long layovers
  const segments = route.allSegments;
  for (let i = 0; i < segments.length - 1; i++) {
    const current = segments[i]!;
    const next = segments[i + 1]!;
    const layoverMinutes =
      (new Date(next.departureTime).getTime() -
        new Date(current.arrivalTime).getTime()) /
      60_000;
    if (layoverMinutes > 240) {
      score = Math.max(0, score - 10);
    }
  }

  let explanation: string;
  if (connections === 0) {
    explanation = "Nonstop — simplest possible routing";
  } else {
    const layoverDescriptions: string[] = [];
    for (let i = 0; i < segments.length - 1; i++) {
      const current = segments[i]!;
      const next = segments[i + 1]!;
      const layoverMinutes =
        (new Date(next.departureTime).getTime() -
          new Date(current.arrivalTime).getTime()) /
        60_000;
      layoverDescriptions.push(
        `${formatDuration(layoverMinutes)} at ${current.destination}`,
      );
    }
    explanation = `${connections} stop${connections > 1 ? "s" : ""} (${layoverDescriptions.join(", ")})`;
  }

  const weight = SCORE_WEIGHTS.routeSimplicity;
  return {
    name: "Route Simplicity",
    score,
    weight,
    weightedScore: Math.round(score * weight),
    explanation,
  };
}

/** Factor 4: Timing — duration efficiency and departure time */
export function scoreTiming(route: Route): ScoreFactor {
  const origin = route.allSegments[0]?.origin ?? "";
  const destination = route.allSegments[route.allSegments.length - 1]?.destination ?? "";
  const key = routeKey(origin, destination);
  const fastestMinutes = FASTEST_ROUTES[key] ?? route.totalDurationMinutes;

  const ratio = route.totalDurationMinutes / fastestMinutes;
  let score: number;

  if (ratio <= 1.2) score = 100;
  else if (ratio <= 1.5) score = 70;
  else if (ratio <= 2.0) score = 40;
  else score = 10;

  // Departure time bonus/penalty
  const departureHour = new Date(
    route.allSegments[0]?.departureTime ?? "",
  ).getUTCHours();
  if (departureHour >= 17 && departureHour <= 22) {
    score = Math.min(100, score + 10); // Evening departure bonus
  } else if (departureHour >= 2 && departureHour <= 5) {
    score = Math.max(0, score - 15); // Red-eye penalty
  }

  const explanation = `${formatDuration(route.totalDurationMinutes)} total (vs ${formatDuration(fastestMinutes)} fastest known)`;

  const weight = SCORE_WEIGHTS.timing;
  return {
    name: "Timing",
    score,
    weight,
    weightedScore: Math.round(score * weight),
    explanation,
  };
}

/** Factor 5: Reliability — source trustworthiness and freshness */
export function scoreReliability(route: Route): ScoreFactor {
  // Use the primary fare's source (first fare)
  const primaryFare = route.fares[0];
  const source = primaryFare?.source ?? FareSource.Mock;

  const sourceTrust: Record<string, number> = {
    [FareSource.DirectAirline]: 90,
    [FareSource.GoogleFlights]: 85,
    [FareSource.Mock]: 80,
    [FareSource.PointsProgram]: 80,
    [FareSource.Skiplagged]: 50,
    [FareSource.MistakeFare]: 30,
  };

  let score = sourceTrust[source] ?? 50;

  // Freshness penalty
  const retrievedAt = primaryFare?.retrievedAt
    ? new Date(primaryFare.retrievedAt)
    : new Date();
  const hoursOld = (Date.now() - retrievedAt.getTime()) / 3_600_000;

  if (hoursOld > 24) score = Math.max(0, score - 40);
  else if (hoursOld > 6) score = Math.max(0, score - 20);
  else if (hoursOld > 1) score = Math.max(0, score - 10);

  const sourceLabel = primaryFare?.sourceName ?? source.replace(/_/g, " ");
  const explanation =
    hoursOld < 1
      ? `From ${sourceLabel}, verified just now`
      : `From ${sourceLabel}, verified ${Math.round(hoursOld)}h ago`;

  const weight = SCORE_WEIGHTS.reliability;
  return {
    name: "Reliability",
    score,
    weight,
    weightedScore: Math.round(score * weight),
    explanation,
  };
}

// ─── Headline Generator ───

function generateHeadline(route: Route, overallScore: number): string {
  const lieFlatSegment = route.allSegments.find((s) => s.isLieFlat);
  const origin = route.allSegments[0]?.origin ?? "";
  const destination = route.allSegments[route.allSegments.length - 1]?.destination ?? "";

  const retail = RETAIL_BENCHMARKS[routeKey(origin, destination)];
  const discount = retail ? 1 - route.totalPriceCents / retail : 0;

  const pointsFare = route.fares.find((f) => f.pointsCost);

  if (pointsFare?.pointsCost) {
    const pts = pointsFare.pointsCost;
    return `${pts.program} — ${(pts.points / 1000).toFixed(0)}K pts${lieFlatSegment ? ` on ${lieFlatSegment.airline} ${lieFlatSegment.aircraft ?? ""}`.trim() : ""}`;
  }

  if (lieFlatSegment && discount > 0.5) {
    return `Lie-flat on ${lieFlatSegment.airline} ${lieFlatSegment.aircraft ?? lieFlatSegment.flightNumber} for ${formatUSD(route.totalPriceCents)} — ${formatPercent(discount)} below retail`;
  }

  if (lieFlatSegment) {
    return `Lie-flat on ${lieFlatSegment.airline} ${lieFlatSegment.aircraft ?? lieFlatSegment.flightNumber} for ${formatUSD(route.totalPriceCents)}`;
  }

  return `${origin}→${destination} for ${formatUSD(route.totalPriceCents)} (score: ${overallScore})`;
}

// ─── Main Scoring Function ───

/** Score a route and produce a ranked Opportunity */
export function scoreRoute(route: Route): Opportunity {
  const factors: ScoreFactor[] = [
    scorePriceValue(route),
    scoreCabinQuality(route),
    scoreRouteSimplicity(route),
    scoreTiming(route),
    scoreReliability(route),
  ];

  const overall = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0),
  );

  const score: OpportunityScore = { overall, factors };
  const headline = generateHeadline(route, overall);

  return {
    id: createId(),
    route,
    score,
    headline,
  };
}

/** Validate that scoring weights sum to 1.0 */
export function validateWeights(): boolean {
  const sum = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1.0) < 0.001;
}
