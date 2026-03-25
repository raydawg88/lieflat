import type { Trip, TripSearchResult } from "@/domain/entities";
import { CabinClass, createId } from "@/domain/entities";

const TRIPS_KEY = "lieflat_trips";
const RESULTS_KEY = "lieflat_results";
const SEEDED_KEY = "lieflat_seeded_v3";

/** Read all trips from localStorage */
export function getTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(TRIPS_KEY);
    return raw ? (JSON.parse(raw) as Trip[]) : [];
  } catch {
    return [];
  }
}

/** Save a trip (create or update) */
export function saveTrip(trip: Trip): void {
  const trips = getTrips();
  const idx = trips.findIndex((t) => t.id === trip.id);
  if (idx >= 0) {
    trips[idx] = { ...trip, updatedAt: new Date().toISOString() };
  } else {
    trips.push(trip);
  }
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
}

/** Delete a trip */
export function deleteTrip(tripId: string): void {
  const trips = getTrips().filter((t) => t.id !== tripId);
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
  // Also delete cached results
  deleteResult(tripId);
}

/** Get a single trip by ID */
export function getTrip(tripId: string): Trip | undefined {
  return getTrips().find((t) => t.id === tripId);
}

/** Save search results for a trip */
export function saveResult(result: TripSearchResult): void {
  try {
    const all = getAllResults();
    all[result.tripId] = result;
    localStorage.setItem(RESULTS_KEY, JSON.stringify(all));
  } catch {
    // localStorage full — silently fail
  }
}

/** Get cached search results for a trip */
export function getResult(tripId: string): TripSearchResult | undefined {
  return getAllResults()[tripId];
}

/** Delete cached results */
export function deleteResult(tripId: string): void {
  const all = getAllResults();
  delete all[tripId];
  localStorage.setItem(RESULTS_KEY, JSON.stringify(all));
}

function getAllResults(): Record<string, TripSearchResult> {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, TripSearchResult>) : {};
  } catch {
    return {};
  }
}

/** Seed the DFW→BRU example trip on first load */
export function seedIfNeeded(): Trip | null {
  if (localStorage.getItem(SEEDED_KEY)) return null;

  const now = new Date().toISOString();
  const trip: Trip = {
    id: createId(),
    name: "Dallas → Ghent, Belgium",
    origin: "DFW",
    destination: "Ghent",
    destinationAirports: ["BRU", "AMS", "CDG", "LHR"],
    dateRangeStart: "2026-06-15",
    dateRangeEnd: "2026-06-20",
    flexibilityDays: 3,
    preferredCabin: CabinClass.Business,
    allowPositioningFlights: true,
    preferredConnections: [],
    createdAt: now,
    updatedAt: now,
  };

  saveTrip(trip);
  localStorage.setItem(SEEDED_KEY, "true");
  return trip;
}

/** Create a new trip with defaults */
export function createTrip(params: {
  name: string;
  origin: string;
  destination: string;
  destinationAirports: string[];
  dateRangeStart: string;
  dateRangeEnd: string;
  flexibilityDays?: number;
  preferredCabin?: CabinClass;
  maxBudgetCents?: number;
  allowPositioningFlights?: boolean;
  preferredConnections?: string[];
}): Trip {
  const now = new Date().toISOString();
  const trip: Trip = {
    id: createId(),
    name: params.name,
    origin: params.origin.toUpperCase(),
    destination: params.destination,
    destinationAirports: params.destinationAirports.map((a) => a.toUpperCase()),
    dateRangeStart: params.dateRangeStart,
    dateRangeEnd: params.dateRangeEnd,
    flexibilityDays: params.flexibilityDays ?? 3,
    preferredCabin: params.preferredCabin ?? CabinClass.Business,
    maxBudgetCents: params.maxBudgetCents,
    allowPositioningFlights: params.allowPositioningFlights ?? true,
    preferredConnections: params.preferredConnections ?? [],
    createdAt: now,
    updatedAt: now,
  };

  saveTrip(trip);
  return trip;
}
