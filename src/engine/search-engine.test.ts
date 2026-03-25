import { describe, it, expect } from "vitest";
import { searchForTrip } from "./search-engine";
import { MockProvider } from "@/providers/mock/mock-provider";
import type { Trip } from "@/domain/entities";
import { CabinClass, createId } from "@/domain/entities";

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: createId(),
    name: "Test Trip",
    origin: "DFW",
    destination: "BRU",
    gatewayAirports: [],
    dateRangeStart: "2026-06-15",
    dateRangeEnd: "2026-06-15",
    flexibilityDays: 0,
    preferredCabin: CabinClass.Business,
    allowPositioningFlights: true,
    preferredConnections: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("searchForTrip", () => {
  it("returns opportunities sorted by score", async () => {
    const trip = makeTrip();
    const provider = new MockProvider();
    const result = await searchForTrip(trip, [provider]);

    expect(result.tripId).toBe(trip.id);
    expect(result.opportunities.length).toBeGreaterThan(0);
    expect(result.searchDurationMs).toBeGreaterThan(0);
    expect(result.faresEvaluated).toBeGreaterThan(0);

    // Verify sorted by score descending
    for (let i = 0; i < result.opportunities.length - 1; i++) {
      expect(result.opportunities[i]!.score.overall).toBeGreaterThanOrEqual(
        result.opportunities[i + 1]!.score.overall,
      );
    }
  });

  it("each opportunity has valid score and headline", async () => {
    const trip = makeTrip();
    const provider = new MockProvider();
    const result = await searchForTrip(trip, [provider]);

    for (const opp of result.opportunities) {
      expect(opp.score.overall).toBeGreaterThanOrEqual(0);
      expect(opp.score.overall).toBeLessThanOrEqual(100);
      expect(opp.score.factors).toHaveLength(5);
      expect(opp.headline).toBeTruthy();
      expect(opp.route.allSegments.length).toBeGreaterThan(0);
    }
  });

  it("applies budget filter", async () => {
    const trip = makeTrip({ maxBudgetCents: 100_000 }); // $1,000 max
    const provider = new MockProvider();
    const result = await searchForTrip(trip, [provider]);

    for (const opp of result.opportunities) {
      expect(opp.route.totalPriceCents).toBeLessThanOrEqual(100_000);
    }
  });

  it("handles provider failure gracefully", async () => {
    const trip = makeTrip();
    const failingProvider: MockProvider = Object.create(new MockProvider());
    failingProvider.searchFares = async () => {
      throw new Error("Provider down");
    };

    // Should not throw
    const result = await searchForTrip(trip, [failingProvider]);
    expect(result.opportunities).toBeDefined();
  });

  it("works without positioning flights", async () => {
    const trip = makeTrip({ allowPositioningFlights: false });
    const provider = new MockProvider();
    const result = await searchForTrip(trip, [provider]);

    // Should still return direct-only results
    expect(result.opportunities).toBeDefined();
  });
});
