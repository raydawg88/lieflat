import type { Fare } from "@/domain/entities";
import { FareSource } from "@/domain/entities";
import type { FareProvider, FareSearchParams } from "../provider.interface";
import { ALL_SEED_FARES } from "./seed-data";

/** Simulated network delay (100-800ms) */
function simulateLatency(): Promise<void> {
  const ms = 100 + Math.random() * 700;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock fare provider that returns seeded data.
 * Filters results based on search params to demonstrate the provider interface.
 */
export class MockProvider implements FareProvider {
  readonly name = "MockProvider";
  readonly source = FareSource.Mock;

  private fares: Fare[];

  constructor(fares: Fare[] = ALL_SEED_FARES) {
    this.fares = fares;
  }

  async searchFares(params: FareSearchParams): Promise<Fare[]> {
    await simulateLatency();

    return this.fares
      .filter((fare) => {
        // Match origin (any segment starts from origin)
        const originMatch = fare.segments.some((s) => s.origin === params.origin);

        // Match destination (any segment ends at destination)
        const destMatch = fare.segments.some((s) => s.destination === params.destination);

        // Match cabin class (at least one segment matches)
        const cabinMatch = fare.segments.some((s) => s.cabinClass === params.cabinClass);

        // For now, we return fares that match origin OR destination
        // The engine will combine them into routes
        return (originMatch || destMatch) && (cabinMatch || true);
      })
      .slice(0, params.limit);
  }

  async verifyFare(fareId: string): Promise<Fare | null> {
    await simulateLatency();
    return this.fares.find((f) => f.id === fareId) ?? null;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
