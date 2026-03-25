import type { Fare, Segment } from "@/domain/entities";
import { CabinClass, FareSource, createId } from "@/domain/entities";

const now = new Date().toISOString();

// ─── Segments ───

const seg_DFW_JFK_economy: Segment = {
  id: createId(),
  airline: "AA",
  flightNumber: "AA 1742",
  origin: "DFW",
  destination: "JFK",
  departureTime: "2026-06-15T06:15:00Z",
  arrivalTime: "2026-06-15T10:30:00Z",
  cabinClass: CabinClass.Economy,
  aircraft: "A321neo",
  isLieFlat: false,
};

const seg_JFK_BRU_business: Segment = {
  id: createId(),
  airline: "AA",
  flightNumber: "AA 100",
  origin: "JFK",
  destination: "BRU",
  departureTime: "2026-06-15T17:45:00Z",
  arrivalTime: "2026-06-16T07:15:00Z",
  cabinClass: CabinClass.Business,
  aircraft: "777-300ER",
  isLieFlat: true,
};

const seg_DFW_BRU_nonstop: Segment = {
  id: createId(),
  airline: "AA",
  flightNumber: "AA 73",
  origin: "DFW",
  destination: "BRU",
  departureTime: "2026-06-15T16:20:00Z",
  arrivalTime: "2026-06-16T08:05:00Z",
  cabinClass: CabinClass.Business,
  aircraft: "787-9",
  isLieFlat: true,
};

const seg_DFW_LHR_premEcon: Segment = {
  id: createId(),
  airline: "BA",
  flightNumber: "BA 192",
  origin: "DFW",
  destination: "LHR",
  departureTime: "2026-06-15T20:10:00Z",
  arrivalTime: "2026-06-16T11:30:00Z",
  cabinClass: CabinClass.PremiumEconomy,
  aircraft: "A380",
  isLieFlat: false,
};

const seg_LHR_BRU_economy: Segment = {
  id: createId(),
  airline: "BA",
  flightNumber: "BA 388",
  origin: "LHR",
  destination: "BRU",
  departureTime: "2026-06-16T14:00:00Z",
  arrivalTime: "2026-06-16T16:15:00Z",
  cabinClass: CabinClass.Economy,
  aircraft: "A320",
  isLieFlat: false,
};

const seg_DFW_ORD_business: Segment = {
  id: createId(),
  airline: "UA",
  flightNumber: "UA 1287",
  origin: "DFW",
  destination: "ORD",
  departureTime: "2026-06-15T08:00:00Z",
  arrivalTime: "2026-06-15T10:30:00Z",
  cabinClass: CabinClass.Business,
  aircraft: "737-900",
  isLieFlat: false,
};

const seg_ORD_BRU_polaris: Segment = {
  id: createId(),
  airline: "UA",
  flightNumber: "UA 998",
  origin: "ORD",
  destination: "BRU",
  departureTime: "2026-06-15T15:30:00Z",
  arrivalTime: "2026-06-16T06:45:00Z",
  cabinClass: CabinClass.Business,
  aircraft: "787-10",
  isLieFlat: true,
};

const seg_DFW_BRU_mistake: Segment = {
  id: createId(),
  airline: "LH",
  flightNumber: "LH 439",
  origin: "DFW",
  destination: "BRU",
  departureTime: "2026-06-17T12:00:00Z",
  arrivalTime: "2026-06-18T04:15:00Z",
  cabinClass: CabinClass.First,
  aircraft: "A340-600",
  isLieFlat: true,
};

// ─── Fares ───

/** Opportunity 1: Positioning + lie-flat — the killer deal */
export const fare_DFW_JFK_positioning: Fare = {
  id: createId(),
  segments: [seg_DFW_JFK_economy],
  totalPriceCents: 17_800,
  currency: "USD",
  source: FareSource.Mock,
  retrievedAt: now,
  fareClass: "M",
};

export const fare_JFK_BRU_lieflat: Fare = {
  id: createId(),
  segments: [seg_JFK_BRU_business],
  totalPriceCents: 89_000,
  currency: "USD",
  source: FareSource.Mock,
  retrievedAt: now,
  fareClass: "I",
};

/** Opportunity 2: Nonstop but expensive */
export const fare_DFW_BRU_nonstop: Fare = {
  id: createId(),
  segments: [seg_DFW_BRU_nonstop],
  totalPriceCents: 285_000,
  currency: "USD",
  source: FareSource.Mock,
  retrievedAt: now,
  fareClass: "J",
};

/** Opportunity 3: Budget via London — no lie-flat */
export const fare_DFW_LHR: Fare = {
  id: createId(),
  segments: [seg_DFW_LHR_premEcon],
  totalPriceCents: 72_000,
  currency: "USD",
  source: FareSource.Mock,
  retrievedAt: now,
  fareClass: "W",
};

export const fare_LHR_BRU: Fare = {
  id: createId(),
  segments: [seg_LHR_BRU_economy],
  totalPriceCents: 9_500,
  currency: "USD",
  source: FareSource.Mock,
  retrievedAt: now,
  fareClass: "L",
};

/** Opportunity 4: Points play — United Polaris */
export const fare_DFW_ORD_BRU_points: Fare = {
  id: createId(),
  segments: [seg_DFW_ORD_business, seg_ORD_BRU_polaris],
  totalPriceCents: 5_600,
  currency: "USD",
  source: FareSource.Mock,
  retrievedAt: now,
  fareClass: "IN",
  pointsCost: {
    program: "United MileagePlus",
    points: 60_000,
    cashCopay: 5_600,
  },
};

/** Opportunity 5: Mistake fare — too good to be true */
export const fare_DFW_BRU_mistake: Fare = {
  id: createId(),
  segments: [seg_DFW_BRU_mistake],
  totalPriceCents: 65_000,
  currency: "USD",
  source: FareSource.MistakeFare,
  retrievedAt: now,
  fareClass: "A",
};

/** All seed fares for DFW→BRU */
export const ALL_SEED_FARES: Fare[] = [
  fare_DFW_JFK_positioning,
  fare_JFK_BRU_lieflat,
  fare_DFW_BRU_nonstop,
  fare_DFW_LHR,
  fare_LHR_BRU,
  fare_DFW_ORD_BRU_points,
  fare_DFW_BRU_mistake,
];
