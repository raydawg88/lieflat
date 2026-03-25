import { describe, it, expect } from "vitest";
import {
  isValidConnection,
  getLayoverMinutes,
  buildSingleFareRoute,
  buildMultiFareRoute,
  buildRoutes,
} from "./route-builder";
import type { Segment, Fare } from "./entities";
import { CabinClass, FareSource, createId } from "./entities";

function makeSegment(overrides: Partial<Segment> = {}): Segment {
  return {
    id: createId(),
    airline: "AA",
    flightNumber: "AA100",
    origin: "DFW",
    destination: "JFK",
    departureTime: "2026-06-15T06:00:00Z",
    arrivalTime: "2026-06-15T10:00:00Z",
    cabinClass: CabinClass.Economy,
    isLieFlat: false,
    ...overrides,
  };
}

function makeFare(overrides: Partial<Fare> = {}): Fare {
  return {
    id: createId(),
    segments: [makeSegment()],
    totalPriceCents: 17_800,
    currency: "USD",
    source: FareSource.Mock,
    retrievedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("isValidConnection", () => {
  it("accepts valid connection (same airport, 2h layover)", () => {
    const arriving = makeSegment({
      destination: "JFK",
      arrivalTime: "2026-06-15T10:00:00Z",
    });
    const departing = makeSegment({
      origin: "JFK",
      departureTime: "2026-06-15T12:00:00Z",
    });
    expect(isValidConnection(arriving, departing)).toBe(true);
  });

  it("rejects different airports", () => {
    const arriving = makeSegment({
      destination: "JFK",
      arrivalTime: "2026-06-15T10:00:00Z",
    });
    const departing = makeSegment({
      origin: "EWR",
      departureTime: "2026-06-15T12:00:00Z",
    });
    expect(isValidConnection(arriving, departing)).toBe(false);
  });

  it("rejects too-short layover (under 90 min)", () => {
    const arriving = makeSegment({
      destination: "JFK",
      arrivalTime: "2026-06-15T10:00:00Z",
    });
    const departing = makeSegment({
      origin: "JFK",
      departureTime: "2026-06-15T11:00:00Z", // 60 min
    });
    expect(isValidConnection(arriving, departing)).toBe(false);
  });

  it("rejects too-long layover (over 8h)", () => {
    const arriving = makeSegment({
      destination: "JFK",
      arrivalTime: "2026-06-15T06:00:00Z",
    });
    const departing = makeSegment({
      origin: "JFK",
      departureTime: "2026-06-15T20:00:00Z", // 14h
    });
    expect(isValidConnection(arriving, departing)).toBe(false);
  });
});

describe("getLayoverMinutes", () => {
  it("calculates layover correctly", () => {
    const arriving = makeSegment({ arrivalTime: "2026-06-15T10:00:00Z" });
    const departing = makeSegment({ departureTime: "2026-06-15T12:30:00Z" });
    expect(getLayoverMinutes(arriving, departing)).toBe(150);
  });
});

describe("buildSingleFareRoute", () => {
  it("builds route from a single-segment fare", () => {
    const seg = makeSegment({
      origin: "DFW",
      destination: "BRU",
      departureTime: "2026-06-15T16:00:00Z",
      arrivalTime: "2026-06-16T06:00:00Z",
      cabinClass: CabinClass.Business,
      isLieFlat: true,
    });
    const fare = makeFare({ segments: [seg], totalPriceCents: 285_000 });
    const route = buildSingleFareRoute(fare);

    expect(route.totalPriceCents).toBe(285_000);
    expect(route.allSegments).toHaveLength(1);
    expect(route.hasLieFlat).toBe(true);
    expect(route.connectionCount).toBe(0);
    expect(route.totalDurationMinutes).toBe(840); // 14 hours
  });

  it("builds route from a multi-segment fare (same booking)", () => {
    const seg1 = makeSegment({
      origin: "DFW",
      destination: "ORD",
      departureTime: "2026-06-15T08:00:00Z",
      arrivalTime: "2026-06-15T10:30:00Z",
    });
    const seg2 = makeSegment({
      origin: "ORD",
      destination: "BRU",
      departureTime: "2026-06-15T15:30:00Z",
      arrivalTime: "2026-06-16T06:45:00Z",
      cabinClass: CabinClass.Business,
      isLieFlat: true,
    });
    const fare = makeFare({ segments: [seg1, seg2], totalPriceCents: 5_600 });
    const route = buildSingleFareRoute(fare);

    expect(route.allSegments).toHaveLength(2);
    expect(route.connectionCount).toBe(1);
    expect(route.hasLieFlat).toBe(true);
  });

  it("throws for empty fare", () => {
    const fare = makeFare({ segments: [] });
    expect(() => buildSingleFareRoute(fare)).toThrow("at least one segment");
  });
});

describe("buildMultiFareRoute", () => {
  it("combines positioning + long-haul fares", () => {
    const posSeg = makeSegment({
      origin: "DFW",
      destination: "JFK",
      departureTime: "2026-06-15T06:00:00Z",
      arrivalTime: "2026-06-15T10:00:00Z",
    });
    const longHaulSeg = makeSegment({
      origin: "JFK",
      destination: "BRU",
      departureTime: "2026-06-15T17:00:00Z",
      arrivalTime: "2026-06-16T07:00:00Z",
      cabinClass: CabinClass.Business,
      isLieFlat: true,
    });

    const posFare = makeFare({ segments: [posSeg], totalPriceCents: 17_800 });
    const lhFare = makeFare({ segments: [longHaulSeg], totalPriceCents: 89_000 });

    const route = buildMultiFareRoute([posFare, lhFare]);
    expect(route).not.toBeNull();
    expect(route!.totalPriceCents).toBe(106_800);
    expect(route!.allSegments).toHaveLength(2);
    expect(route!.hasLieFlat).toBe(true);
    expect(route!.connectionCount).toBe(1);
  });

  it("returns null for invalid connection", () => {
    const seg1 = makeSegment({
      origin: "DFW",
      destination: "JFK",
      departureTime: "2026-06-15T06:00:00Z",
      arrivalTime: "2026-06-15T10:00:00Z",
    });
    const seg2 = makeSegment({
      origin: "ORD", // wrong airport
      destination: "BRU",
      departureTime: "2026-06-15T17:00:00Z",
      arrivalTime: "2026-06-16T07:00:00Z",
    });

    const route = buildMultiFareRoute([
      makeFare({ segments: [seg1] }),
      makeFare({ segments: [seg2] }),
    ]);
    expect(route).toBeNull();
  });
});

describe("buildRoutes", () => {
  it("builds both direct and multi-fare routes", () => {
    const directSeg = makeSegment({
      origin: "DFW",
      destination: "BRU",
      departureTime: "2026-06-15T16:00:00Z",
      arrivalTime: "2026-06-16T06:00:00Z",
    });
    const posSeg = makeSegment({
      origin: "DFW",
      destination: "JFK",
      departureTime: "2026-06-15T06:00:00Z",
      arrivalTime: "2026-06-15T10:00:00Z",
    });
    const lhSeg = makeSegment({
      origin: "JFK",
      destination: "BRU",
      departureTime: "2026-06-15T17:00:00Z",
      arrivalTime: "2026-06-16T07:00:00Z",
      isLieFlat: true,
    });

    const routes = buildRoutes(
      [makeFare({ segments: [directSeg] })],
      [makeFare({ segments: [posSeg] })],
      [makeFare({ segments: [lhSeg] })],
    );

    expect(routes).toHaveLength(2); // 1 direct + 1 combo
  });
});
