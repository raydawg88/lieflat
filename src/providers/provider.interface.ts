import type { AirportCode, CabinClass, Fare, FareSource, ISODate } from "@/domain/entities";

/** Query parameters for a fare search */
export interface FareSearchParams {
  origin: AirportCode;
  destination: AirportCode;
  departureDate: ISODate;
  cabinClass: CabinClass;
  includeNearbyAirports: boolean;
  limit: number;
}

/** Every data provider must implement this interface */
export interface FareProvider {
  readonly name: string;
  readonly source: FareSource;

  /** Search for fares matching the given parameters */
  searchFares(params: FareSearchParams): Promise<Fare[]>;

  /** Check if a specific fare is still available */
  verifyFare(fareId: string): Promise<Fare | null>;

  /** Whether this provider is currently operational */
  isAvailable(): Promise<boolean>;
}

/** Registry of all providers */
export class ProviderRegistry {
  private providers: Map<string, FareProvider> = new Map();

  register(provider: FareProvider): void {
    this.providers.set(provider.name, provider);
  }

  getAll(): FareProvider[] {
    return Array.from(this.providers.values());
  }

  getByName(name: string): FareProvider | undefined {
    return this.providers.get(name);
  }

  remove(name: string): void {
    this.providers.delete(name);
  }
}
