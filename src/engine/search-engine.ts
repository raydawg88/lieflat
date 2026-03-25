import type { Trip, TripSearchResult, Fare, Opportunity } from "@/domain/entities";
import { CabinClass } from "@/domain/entities";
import { scoreRoute } from "@/domain/scoring";
import {
  buildSingleFareRoute,
  buildMultiFareRoute,
} from "@/domain/route-builder";
import type { FareProvider, FareSearchParams } from "@/providers/provider.interface";
import { addDays, eachDayOfInterval, format } from "date-fns";

/** Known transatlantic hubs for positioning strategies */
const TRANSATLANTIC_HUBS = ["JFK", "EWR", "ORD", "IAD", "BOS", "MIA", "ATL"];

/** European hubs that connect to many destinations */
const EUROPEAN_HUBS = ["LHR", "CDG", "AMS", "FRA"];

interface SearchStrategy {
  name: string;
  params: FareSearchParams[];
}

/** Expand a date range with flexibility into individual search dates */
function expandDates(start: string, end: string, flexDays: number): string[] {
  const startDate = addDays(new Date(start + "T00:00:00"), -flexDays);
  const endDate = addDays(new Date(end + "T00:00:00"), flexDays);
  return eachDayOfInterval({ start: startDate, end: endDate }).map((d) =>
    format(d, "yyyy-MM-dd"),
  );
}

/** Build search strategies for a trip */
function buildStrategies(trip: Trip): SearchStrategy[] {
  const strategies: SearchStrategy[] = [];
  const dates = expandDates(trip.dateRangeStart, trip.dateRangeEnd, trip.flexibilityDays);
  const limit = 20;

  // Strategy 1: Direct flights in preferred cabin
  for (const date of dates) {
    strategies.push({
      name: `Direct ${trip.origin}→${trip.destination}`,
      params: [
        {
          origin: trip.origin,
          destination: trip.destination,
          departureDate: date,
          cabinClass: trip.preferredCabin,
          includeNearbyAirports: false,
          limit,
        },
      ],
    });
  }

  // Strategy 2: Via transatlantic hubs (positioning + long-haul)
  if (trip.allowPositioningFlights) {
    const hubs =
      trip.preferredConnections.length > 0
        ? trip.preferredConnections
        : TRANSATLANTIC_HUBS.slice(0, 3); // Top 3 hubs

    for (const hub of hubs) {
      for (const date of dates) {
        strategies.push({
          name: `Via ${hub}: ${trip.origin}→${hub}→${trip.destination}`,
          params: [
            {
              origin: trip.origin,
              destination: hub,
              departureDate: date,
              cabinClass: CabinClass.Economy,
              includeNearbyAirports: false,
              limit: 5,
            },
            {
              origin: hub,
              destination: trip.destination,
              departureDate: date,
              cabinClass: trip.preferredCabin,
              includeNearbyAirports: false,
              limit: 5,
            },
          ],
        });
      }
    }

    // Strategy 3: Via European hubs (long-haul + short hop)
    for (const hub of EUROPEAN_HUBS.slice(0, 2)) {
      for (const date of dates) {
        strategies.push({
          name: `Via ${hub}: ${trip.origin}→${hub}→${trip.destination}`,
          params: [
            {
              origin: trip.origin,
              destination: hub,
              departureDate: date,
              cabinClass: trip.preferredCabin,
              includeNearbyAirports: false,
              limit: 5,
            },
            {
              origin: hub,
              destination: trip.destination,
              departureDate: date,
              cabinClass: CabinClass.Economy,
              includeNearbyAirports: false,
              limit: 5,
            },
          ],
        });
      }
    }
  }

  return strategies;
}

/** Run a full search for a trip across all providers */
export async function searchForTrip(
  trip: Trip,
  providers: FareProvider[],
): Promise<TripSearchResult> {
  const startTime = Date.now();
  const strategies = buildStrategies(trip);

  // Collect all fares from all providers across all strategies
  const directFares: Fare[] = [];
  const positioningFares: Fare[] = [];
  const longHaulFares: Fare[] = [];

  const searchPromises: Promise<void>[] = [];

  for (const strategy of strategies) {
    for (const provider of providers) {
      for (const params of strategy.params) {
        const promise = provider
          .searchFares(params)
          .then((fares) => {
            for (const fare of fares) {
              const isDirectToFinalDest = fare.segments.some(
                (s) => s.destination === trip.destination,
              );
              const isFromOrigin = fare.segments.some(
                (s) => s.origin === trip.origin,
              );

              if (isFromOrigin && isDirectToFinalDest) {
                // Direct fare (origin to final destination, possibly with connections)
                directFares.push(fare);
              } else if (isFromOrigin && !isDirectToFinalDest) {
                // Positioning fare (origin to hub)
                positioningFares.push(fare);
              } else if (!isFromOrigin && isDirectToFinalDest) {
                // Long-haul fare (hub to destination)
                longHaulFares.push(fare);
              }
            }
          })
          .catch(() => {
            // Provider failed — silently skip, other providers may succeed
          });

        searchPromises.push(promise);
      }
    }
  }

  await Promise.allSettled(searchPromises);

  // Deduplicate fares by ID
  const seen = new Set<string>();
  const dedup = (fares: Fare[]): Fare[] =>
    fares.filter((f) => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });

  const uniqueDirectFares = dedup(directFares);
  const uniquePositioningFares = dedup(positioningFares);
  const uniqueLongHaulFares = dedup(longHaulFares);

  const totalFaresEvaluated =
    uniqueDirectFares.length +
    uniquePositioningFares.length +
    uniqueLongHaulFares.length;

  // Build routes
  const opportunities: Opportunity[] = [];

  // Direct fare routes
  for (const fare of uniqueDirectFares) {
    const route = buildSingleFareRoute(fare);
    opportunities.push(scoreRoute(route));
  }

  // Multi-fare routes (positioning + long-haul)
  for (const pos of uniquePositioningFares) {
    for (const lh of uniqueLongHaulFares) {
      const route = buildMultiFareRoute([pos, lh]);
      if (route) {
        opportunities.push(scoreRoute(route));
      }
    }
  }

  // Sort by score descending
  opportunities.sort((a, b) => b.score.overall - a.score.overall);

  // Apply budget filter
  const filtered = trip.maxBudgetCents
    ? opportunities.filter((o) => o.route.totalPriceCents <= trip.maxBudgetCents!)
    : opportunities;

  return {
    tripId: trip.id,
    opportunities: filtered,
    searchedAt: new Date().toISOString(),
    searchDurationMs: Date.now() - startTime,
    faresEvaluated: totalFaresEvaluated,
  };
}
