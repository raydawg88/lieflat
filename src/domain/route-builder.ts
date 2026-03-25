import type { Fare, Route, Segment } from "./entities";
import { createId } from "./entities";
import { MIN_CONNECTION_MINUTES, MAX_CONNECTION_MINUTES } from "@/lib/constants";

/** Check if two segments form a valid connection */
export function isValidConnection(arriving: Segment, departing: Segment): boolean {
  // Must connect at the same airport
  if (arriving.destination !== departing.origin) return false;

  const layoverMs =
    new Date(departing.departureTime).getTime() -
    new Date(arriving.arrivalTime).getTime();
  const layoverMinutes = layoverMs / 60_000;

  // Must have minimum connection time and not be excessively long
  return layoverMinutes >= MIN_CONNECTION_MINUTES && layoverMinutes <= MAX_CONNECTION_MINUTES;
}

/** Get layover duration in minutes between two segments */
export function getLayoverMinutes(arriving: Segment, departing: Segment): number {
  return (
    (new Date(departing.departureTime).getTime() -
      new Date(arriving.arrivalTime).getTime()) /
    60_000
  );
}

/** Build a Route from a single fare (direct or connecting within one booking) */
export function buildSingleFareRoute(fare: Fare): Route {
  const segments = fare.segments;
  const first = segments[0];
  const last = segments[segments.length - 1];

  if (!first || !last) {
    throw new Error("Fare must have at least one segment");
  }

  const totalDurationMinutes =
    (new Date(last.arrivalTime).getTime() - new Date(first.departureTime).getTime()) /
    60_000;

  return {
    id: createId(),
    fares: [fare],
    totalPriceCents: fare.totalPriceCents,
    allSegments: segments,
    hasLieFlat: segments.some((s) => s.isLieFlat),
    totalDurationMinutes: Math.round(totalDurationMinutes),
    connectionCount: Math.max(0, segments.length - 1),
  };
}

/** Build a Route from multiple fares (e.g., positioning + long-haul booked separately) */
export function buildMultiFareRoute(fares: Fare[]): Route | null {
  if (fares.length === 0) return null;
  if (fares.length === 1) return buildSingleFareRoute(fares[0]!);

  // Combine all segments in chronological order
  const allSegments = fares
    .flatMap((f) => f.segments)
    .sort(
      (a, b) =>
        new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime(),
    );

  // Validate connections between fares
  for (let i = 0; i < allSegments.length - 1; i++) {
    const current = allSegments[i]!;
    const next = allSegments[i + 1]!;

    // Check if this is a cross-fare connection (different fare boundaries)
    const currentFareIdx = fares.findIndex((f) => f.segments.includes(current));
    const nextFareIdx = fares.findIndex((f) => f.segments.includes(next));

    if (currentFareIdx !== nextFareIdx) {
      if (!isValidConnection(current, next)) {
        return null; // Invalid connection between fares
      }
    }
  }

  const first = allSegments[0]!;
  const last = allSegments[allSegments.length - 1]!;
  const totalDurationMinutes =
    (new Date(last.arrivalTime).getTime() - new Date(first.departureTime).getTime()) /
    60_000;

  return {
    id: createId(),
    fares,
    totalPriceCents: fares.reduce((sum, f) => sum + f.totalPriceCents, 0),
    allSegments,
    hasLieFlat: allSegments.some((s) => s.isLieFlat),
    totalDurationMinutes: Math.round(totalDurationMinutes),
    connectionCount: Math.max(0, allSegments.length - 1),
  };
}

/** Build all valid routes from a list of fares */
export function buildRoutes(
  directFares: Fare[],
  positioningFares: Fare[],
  longHaulFares: Fare[],
): Route[] {
  const routes: Route[] = [];

  // Single-fare routes (direct or within one booking)
  for (const fare of directFares) {
    routes.push(buildSingleFareRoute(fare));
  }

  // Multi-fare routes: positioning + long-haul
  for (const positioning of positioningFares) {
    for (const longHaul of longHaulFares) {
      const route = buildMultiFareRoute([positioning, longHaul]);
      if (route) {
        routes.push(route);
      }
    }
  }

  return routes;
}
