import { nanoid } from "nanoid";

// ─── Primitives ───

/** IATA airport code, e.g. "DFW", "BRU" */
export type AirportCode = string;

/** ISO 8601 date string, e.g. "2026-06-15" */
export type ISODate = string;

/** ISO 8601 datetime string, e.g. "2026-06-15T14:30:00Z" */
export type ISODateTime = string;

/** USD cents to avoid floating-point issues. $1,234.56 = 123456 */
export type USDCents = number;

export enum CabinClass {
  Economy = "economy",
  PremiumEconomy = "premium_economy",
  Business = "business",
  First = "first",
}

export enum FareSource {
  Mock = "mock",
  GoogleFlights = "google_flights",
  Skiplagged = "skiplagged",
  PointsProgram = "points_program",
  MistakeFare = "mistake_fare",
  DirectAirline = "direct_airline",
}

// ─── Core Entities ───

/** A single nonstop flight leg */
export interface Segment {
  id: string;
  airline: string;
  flightNumber: string;
  origin: AirportCode;
  destination: AirportCode;
  departureTime: ISODateTime;
  arrivalTime: ISODateTime;
  cabinClass: CabinClass;
  aircraft?: string;
  /** Whether this segment has a lie-flat seat */
  isLieFlat: boolean;
}

/** A bookable fare for one or more segments */
export interface Fare {
  id: string;
  segments: Segment[];
  totalPriceCents: USDCents;
  currency: "USD";
  source: FareSource;
  /** Human-readable source name, e.g. "Google Flights", "AA.com" */
  sourceName: string;
  /** Direct link to book or search for this fare */
  bookingUrl: string;
  retrievedAt: ISODateTime;
  fareClass?: string;
  /** Step-by-step instructions to actually get this price */
  bookingInstructions?: string[];
  pointsCost?: {
    program: string;
    points: number;
    cashCopay: USDCents;
    /** URL for the loyalty program portal */
    portalUrl?: string;
  };
}

/** Ground transport from arrival airport to final destination */
export interface GroundTransfer {
  mode: "train" | "bus" | "taxi" | "rental_car";
  from: string;
  to: string;
  durationMinutes: number;
  estimatedCostCents: USDCents;
  provider?: string;
  bookingUrl?: string;
  notes?: string;
}

/** A complete origin→destination itinerary (may combine multiple fares) */
export interface Route {
  id: string;
  fares: Fare[];
  totalPriceCents: USDCents;
  allSegments: Segment[];
  hasLieFlat: boolean;
  totalDurationMinutes: number;
  connectionCount: number;
  /** Ground transfer from arrival airport to final destination, if applicable */
  groundTransfer?: GroundTransfer;
}

/** Scored and ranked route */
export interface Opportunity {
  id: string;
  route: Route;
  score: OpportunityScore;
  headline: string;
}

export interface OpportunityScore {
  overall: number;
  factors: ScoreFactor[];
}

export interface ScoreFactor {
  name: string;
  score: number;
  weight: number;
  weightedScore: number;
  explanation: string;
}

// ─── User-Facing Entities ───

export interface Trip {
  id: string;
  name: string;
  origin: AirportCode;
  /** Primary destination airport */
  destination: AirportCode;
  /** Where you actually want to end up (city name, e.g. "Ghent, Belgium") */
  finalDestination?: string;
  /** Additional airports you'd fly into and take ground transport from */
  gatewayAirports: AirportCode[];
  dateRangeStart: ISODate;
  dateRangeEnd: ISODate;
  flexibilityDays: number;
  preferredCabin: CabinClass;
  maxBudgetCents?: USDCents;
  allowPositioningFlights: boolean;
  preferredConnections: AirportCode[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface TripSearchResult {
  tripId: string;
  opportunities: Opportunity[];
  searchedAt: ISODateTime;
  searchDurationMs: number;
  faresEvaluated: number;
}

// ─── Factory ───

export function createId(): string {
  return nanoid(12);
}
