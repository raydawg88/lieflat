import { describe, it, expect } from "vitest";
import {
  scorePriceValue,
  scoreCabinQuality,
  scoreRouteSimplicity,
  scoreTiming,
  scoreReliability,
  scoreRoute,
  validateWeights,
} from "./scoring";
import type { Route, Segment, Fare } from "./entities";
import { CabinClass, FareSource, createId } from "./entities";

// ─── Test Helpers ───

function makeSegment(overrides: Partial<Segment> = {}): Segment {
  return {
    id: createId(),
    airline: "AA",
    flightNumber: "AA100",
    origin: "DFW",
    destination: "BRU",
    departureTime: "2026-06-15T17:00:00Z",
    arrivalTime: "2026-06-16T07:00:00Z", // 14 hours = long haul
    cabinClass: CabinClass.Business,
    aircraft: "777-300ER",
    isLieFlat: true,
    ...overrides,
  };
}

function makeFare(overrides: Partial<Fare> = {}): Fare {
  const segments = overrides.segments ?? [makeSegment()];
  return {
    id: createId(),
    segments,
    totalPriceCents: 89_000,
    currency: "USD",
    source: FareSource.Mock,
    retrievedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeRoute(overrides: Partial<Route> = {}): Route {
  const fares = overrides.fares ?? [makeFare()];
  const allSegments = overrides.allSegments ?? fares.flatMap((f) => f.segments);
  const first = allSegments[0];
  const last = allSegments[allSegments.length - 1];
  const totalDuration =
    first && last
      ? (new Date(last.arrivalTime).getTime() -
          new Date(first.departureTime).getTime()) /
        60_000
      : 0;

  return {
    id: createId(),
    fares,
    totalPriceCents: overrides.totalPriceCents ?? fares.reduce((s, f) => s + f.totalPriceCents, 0),
    allSegments,
    hasLieFlat: overrides.hasLieFlat ?? allSegments.some((s) => s.isLieFlat),
    totalDurationMinutes: overrides.totalDurationMinutes ?? totalDuration,
    connectionCount: overrides.connectionCount ?? Math.max(0, allSegments.length - 1),
  };
}

// ─── Tests ───

describe("validateWeights", () => {
  it("weights sum to 1.0", () => {
    expect(validateWeights()).toBe(true);
  });
});

describe("scorePriceValue", () => {
  it("scores high for deep discounts", () => {
    const route = makeRoute({ totalPriceCents: 89_000 }); // $890 vs $4500 retail
    const factor = scorePriceValue(route);
    expect(factor.score).toBeGreaterThanOrEqual(75);
    expect(factor.explanation).toContain("below");
  });

  it("scores low for full-price fares", () => {
    const route = makeRoute({ totalPriceCents: 450_000 }); // same as retail
    const factor = scorePriceValue(route);
    expect(factor.score).toBe(0);
  });

  it("scores 50 when no benchmark exists", () => {
    const seg = makeSegment({ origin: "LAX", destination: "SIN" });
    const fare = makeFare({ segments: [seg] });
    const route = makeRoute({ fares: [fare], allSegments: [seg] });
    const factor = scorePriceValue(route);
    expect(factor.score).toBe(50);
    expect(factor.explanation).toContain("no retail benchmark");
  });

  it("clamps to 0-100", () => {
    const route = makeRoute({ totalPriceCents: 500_000 }); // above retail
    const factor = scorePriceValue(route);
    expect(factor.score).toBeGreaterThanOrEqual(0);
    expect(factor.score).toBeLessThanOrEqual(100);
  });
});

describe("scoreCabinQuality", () => {
  it("scores 100 for lie-flat on long-haul", () => {
    const route = makeRoute(); // default is lie-flat, 14h segment
    const factor = scoreCabinQuality(route);
    expect(factor.score).toBe(100);
    expect(factor.explanation).toContain("Lie-flat");
  });

  it("scores 5 for all-economy route", () => {
    const seg = makeSegment({
      cabinClass: CabinClass.Economy,
      isLieFlat: false,
    });
    const route = makeRoute({
      fares: [makeFare({ segments: [seg] })],
      allSegments: [seg],
    });
    const factor = scoreCabinQuality(route);
    expect(factor.score).toBe(5);
  });

  it("scores 20 for premium economy long-haul", () => {
    const seg = makeSegment({
      cabinClass: CabinClass.PremiumEconomy,
      isLieFlat: false,
    });
    const route = makeRoute({
      fares: [makeFare({ segments: [seg] })],
      allSegments: [seg],
    });
    const factor = scoreCabinQuality(route);
    expect(factor.score).toBe(20);
  });
});

describe("scoreRouteSimplicity", () => {
  it("scores 100 for nonstop", () => {
    const route = makeRoute({ connectionCount: 0 });
    const factor = scoreRouteSimplicity(route);
    expect(factor.score).toBe(100);
    expect(factor.explanation).toContain("Nonstop");
  });

  it("scores 75 for 1 stop", () => {
    const seg1 = makeSegment({
      origin: "DFW",
      destination: "JFK",
      departureTime: "2026-06-15T06:00:00Z",
      arrivalTime: "2026-06-15T10:00:00Z",
    });
    const seg2 = makeSegment({
      origin: "JFK",
      destination: "BRU",
      departureTime: "2026-06-15T12:00:00Z",
      arrivalTime: "2026-06-15T22:00:00Z",
    });
    const route = makeRoute({
      allSegments: [seg1, seg2],
      connectionCount: 1,
    });
    const factor = scoreRouteSimplicity(route);
    expect(factor.score).toBe(75);
    expect(factor.explanation).toContain("1 stop");
  });

  it("penalizes long layovers", () => {
    const seg1 = makeSegment({
      origin: "DFW",
      destination: "JFK",
      departureTime: "2026-06-15T06:00:00Z",
      arrivalTime: "2026-06-15T10:00:00Z",
    });
    const seg2 = makeSegment({
      origin: "JFK",
      destination: "BRU",
      departureTime: "2026-06-15T18:00:00Z", // 8h layover
      arrivalTime: "2026-06-16T04:00:00Z",
    });
    const route = makeRoute({
      allSegments: [seg1, seg2],
      connectionCount: 1,
    });
    const factor = scoreRouteSimplicity(route);
    expect(factor.score).toBe(65); // 75 - 10
  });
});

describe("scoreTiming", () => {
  it("scores high for efficient routes", () => {
    // DFW-BRU fastest is 600 min; 14h = 840 min ≈ 1.4x
    const route = makeRoute({ totalDurationMinutes: 720 });
    const factor = scoreTiming(route);
    expect(factor.score).toBeGreaterThanOrEqual(60);
  });

  it("scores low for very slow routes", () => {
    const route = makeRoute({ totalDurationMinutes: 1500 }); // 25 hours
    const factor = scoreTiming(route);
    expect(factor.score).toBeLessThanOrEqual(20);
  });
});

describe("scoreReliability", () => {
  it("scores high for trusted sources", () => {
    const fare = makeFare({
      source: FareSource.DirectAirline,
      retrievedAt: new Date().toISOString(),
    });
    const route = makeRoute({ fares: [fare] });
    const factor = scoreReliability(route);
    expect(factor.score).toBeGreaterThanOrEqual(80);
  });

  it("scores low for mistake fares", () => {
    const fare = makeFare({
      source: FareSource.MistakeFare,
      retrievedAt: new Date().toISOString(),
    });
    const route = makeRoute({ fares: [fare] });
    const factor = scoreReliability(route);
    expect(factor.score).toBeLessThanOrEqual(40);
  });

  it("penalizes stale data", () => {
    const staleDate = new Date(Date.now() - 25 * 3_600_000).toISOString();
    const fare = makeFare({
      source: FareSource.DirectAirline,
      retrievedAt: staleDate,
    });
    const route = makeRoute({ fares: [fare] });
    const factor = scoreReliability(route);
    expect(factor.score).toBeLessThanOrEqual(60);
  });
});

describe("scoreRoute (integration)", () => {
  it("produces a valid opportunity with all 5 factors", () => {
    const route = makeRoute();
    const opportunity = scoreRoute(route);

    expect(opportunity.id).toBeTruthy();
    expect(opportunity.headline).toBeTruthy();
    expect(opportunity.score.overall).toBeGreaterThan(0);
    expect(opportunity.score.overall).toBeLessThanOrEqual(100);
    expect(opportunity.score.factors).toHaveLength(5);

    // Verify all factor names are present
    const factorNames = opportunity.score.factors.map((f) => f.name);
    expect(factorNames).toContain("Price Value");
    expect(factorNames).toContain("Cabin Quality");
    expect(factorNames).toContain("Route Simplicity");
    expect(factorNames).toContain("Timing");
    expect(factorNames).toContain("Reliability");

    // Verify each factor has required fields
    for (const factor of opportunity.score.factors) {
      expect(factor.score).toBeGreaterThanOrEqual(0);
      expect(factor.score).toBeLessThanOrEqual(100);
      expect(factor.weight).toBeGreaterThan(0);
      expect(factor.weight).toBeLessThanOrEqual(1);
      expect(factor.explanation).toBeTruthy();
    }
  });

  it("is deterministic — same input produces same score", () => {
    const route = makeRoute();
    const opp1 = scoreRoute(route);
    const opp2 = scoreRoute(route);
    expect(opp1.score.overall).toBe(opp2.score.overall);
  });

  it("ranks lie-flat deals higher than all-economy", () => {
    const lieFlatRoute = makeRoute({
      totalPriceCents: 106_800,
    });

    const economySeg = makeSegment({
      cabinClass: CabinClass.Economy,
      isLieFlat: false,
    });
    const economyRoute = makeRoute({
      fares: [makeFare({ segments: [economySeg], totalPriceCents: 81_500 })],
      allSegments: [economySeg],
      totalPriceCents: 81_500,
    });

    const lieFlatOpp = scoreRoute(lieFlatRoute);
    const economyOpp = scoreRoute(economyRoute);

    expect(lieFlatOpp.score.overall).toBeGreaterThan(economyOpp.score.overall);
  });
});
