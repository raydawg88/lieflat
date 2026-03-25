import type { Fare, Segment, Opportunity, Route, Trip, TripSearchResult } from "@/domain/entities";
import { FareSource, CabinClass, createId } from "@/domain/entities";
import { scoreRoute } from "@/domain/scoring";
import { buildSingleFareRoute, buildMultiFareRoute } from "@/domain/route-builder";
import { getGroundTransfer, getGatewayAirports } from "@/lib/destinations";

/** Cache key for localStorage */
function cacheKey(trip: Trip): string {
  return `lieflat_gemini_${trip.origin}_${trip.destination}_${trip.dateRangeStart}_${trip.dateRangeEnd}`;
}

/** Check if cached results exist and are fresh (< 1 hour) */
function getCached(trip: Trip): TripSearchResult | null {
  try {
    const key = cacheKey(trip);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { result: TripSearchResult; timestamp: number };
    const ageMs = Date.now() - cached.timestamp;
    if (ageMs > 3_600_000) {
      // Older than 1 hour — stale
      localStorage.removeItem(key);
      return null;
    }
    return cached.result;
  } catch {
    return null;
  }
}

/** Save results to cache */
function setCache(trip: Trip, result: TripSearchResult): void {
  try {
    const key = cacheKey(trip);
    localStorage.setItem(key, JSON.stringify({ result, timestamp: Date.now() }));
  } catch {
    // localStorage full — ignore
  }
}

/** Map a cabin class string from Gemini to our enum */
function mapCabin(cabin: string): CabinClass {
  switch (cabin?.toLowerCase()) {
    case "first": return CabinClass.First;
    case "business": return CabinClass.Business;
    case "premium_economy": return CabinClass.PremiumEconomy;
    default: return CabinClass.Economy;
  }
}

/** Map a source name to our FareSource enum */
function mapSource(name: string): FareSource {
  const lower = name.toLowerCase();
  if (lower.includes("google")) return FareSource.GoogleFlights;
  if (lower.includes("mistake") || lower.includes("secret")) return FareSource.MistakeFare;
  if (lower.includes("point") || lower.includes("mile") || lower.includes("award")) return FareSource.PointsProgram;
  if (lower.includes("united") || lower.includes("aa.com") || lower.includes("american") || lower.includes("british") || lower.includes("delta") || lower.includes("lufthansa")) return FareSource.DirectAirline;
  return FareSource.GoogleFlights;
}

interface GeminiSegment {
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  cabinClass: string;
  aircraft?: string;
  isLieFlat: boolean;
}

interface GeminiFare {
  segments: GeminiSegment[];
  totalPriceCents: number;
  sourceName: string;
  bookingUrl: string;
  fareClass?: string;
  bookingInstructions?: string[];
  pointsCost?: {
    program: string;
    points: number;
    cashCopay: number;
    portalUrl?: string;
  } | null;
}

interface GeminiOpportunity {
  headline: string;
  totalPriceCents: number;
  fares: GeminiFare[];
}

interface GeminiResponse {
  opportunities: GeminiOpportunity[];
}

/** Convert Gemini's response into our domain types */
function convertToOpportunities(data: GeminiResponse, trip: Trip): Opportunity[] {
  const now = new Date().toISOString();
  const opportunities: Opportunity[] = [];

  for (const opp of data.opportunities) {
    try {
      const fares: Fare[] = opp.fares.map((gf) => ({
        id: createId(),
        segments: gf.segments.map((gs): Segment => ({
          id: createId(),
          airline: gs.airline,
          flightNumber: gs.flightNumber,
          origin: gs.origin,
          destination: gs.destination,
          departureTime: gs.departureTime,
          arrivalTime: gs.arrivalTime,
          cabinClass: mapCabin(gs.cabinClass),
          aircraft: gs.aircraft,
          isLieFlat: gs.isLieFlat,
        })),
        totalPriceCents: gf.totalPriceCents,
        currency: "USD" as const,
        source: mapSource(gf.sourceName),
        sourceName: gf.sourceName,
        bookingUrl: gf.bookingUrl,
        retrievedAt: now,
        fareClass: gf.fareClass,
        bookingInstructions: gf.bookingInstructions,
        pointsCost: gf.pointsCost ? {
          program: gf.pointsCost.program,
          points: gf.pointsCost.points,
          cashCopay: gf.pointsCost.cashCopay,
          portalUrl: gf.pointsCost.portalUrl,
        } : undefined,
      }));

      // Build route
      let route: Route | null = null;
      if (fares.length === 1) {
        route = buildSingleFareRoute(fares[0]!);
      } else {
        route = buildMultiFareRoute(fares);
        // If multi-fare route fails connection validation, build as single-fare routes combined manually
        if (!route) {
          const allSegments = fares.flatMap((f) => f.segments).sort(
            (a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime(),
          );
          const first = allSegments[0]!;
          const last = allSegments[allSegments.length - 1]!;
          const totalDuration = (new Date(last.arrivalTime).getTime() - new Date(first.departureTime).getTime()) / 60_000;

          route = {
            id: createId(),
            fares,
            totalPriceCents: fares.reduce((s, f) => s + f.totalPriceCents, 0),
            allSegments,
            hasLieFlat: allSegments.some((s) => s.isLieFlat),
            totalDurationMinutes: Math.round(totalDuration),
            connectionCount: Math.max(0, allSegments.length - 1),
          };
        }
      }

      // Attach ground transfer
      const lastAirport = route.allSegments[route.allSegments.length - 1]?.destination;
      if (lastAirport) {
        const transfer = getGroundTransfer(lastAirport, trip.destination);
        if (transfer) {
          route.groundTransfer = transfer;
          route.totalPriceCents += transfer.estimatedCostCents;
          route.totalDurationMinutes += transfer.durationMinutes;
        }
      }

      opportunities.push(scoreRoute(route));
    } catch (err) {
      console.warn("Failed to convert opportunity:", err);
      // Skip malformed opportunities
    }
  }

  return opportunities;
}

/** Get the function URL — works in both dev and production */
function getFunctionUrl(): string {
  // In production on Netlify
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return "/.netlify/functions/search-flights";
  }
  // Local dev with netlify dev
  return "/.netlify/functions/search-flights";
}

/** Search for real flights using Gemini */
export async function searchWithGemini(trip: Trip): Promise<TripSearchResult> {
  const startTime = Date.now();

  // Check cache first
  const cached = getCached(trip);
  if (cached) {
    return cached;
  }

  const gatewayInfo = getGatewayAirports(trip.destination);

  const response = await fetch(getFunctionUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      origin: trip.origin,
      destination: trip.destination,
      destinationAirports: trip.destinationAirports,
      dateRangeStart: trip.dateRangeStart,
      dateRangeEnd: trip.dateRangeEnd,
      preferredCabin: trip.preferredCabin,
      allowPositioningFlights: trip.allowPositioningFlights,
      flexibilityDays: trip.flexibilityDays,
      gatewayInfo: gatewayInfo.length > 0 ? gatewayInfo : undefined,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      `Search failed: ${response.status} — ${(errData as { error?: string }).error ?? "Unknown error"}`,
    );
  }

  const data = (await response.json()) as GeminiResponse;
  const opportunities = convertToOpportunities(data, trip);

  // Sort by score
  opportunities.sort((a, b) => b.score.overall - a.score.overall);

  // Apply budget filter
  const filtered = trip.maxBudgetCents
    ? opportunities.filter((o) => o.route.totalPriceCents <= trip.maxBudgetCents!)
    : opportunities;

  const result: TripSearchResult = {
    tripId: trip.id,
    opportunities: filtered,
    searchedAt: new Date().toISOString(),
    searchDurationMs: Date.now() - startTime,
    faresEvaluated: opportunities.length,
  };

  // Cache the result
  setCache(trip, result);

  return result;
}
