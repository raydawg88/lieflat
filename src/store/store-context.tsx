import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Trip, TripSearchResult } from "@/domain/entities";
import * as store from "./trip-store";

interface StoreState {
  trips: Trip[];
  results: Record<string, TripSearchResult>;
  refreshTrips: () => void;
  saveTrip: (trip: Trip) => void;
  deleteTrip: (tripId: string) => void;
  getTrip: (tripId: string) => Trip | undefined;
  saveResult: (result: TripSearchResult) => void;
  getResult: (tripId: string) => TripSearchResult | undefined;
}

const StoreContext = createContext<StoreState | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [results, setResults] = useState<Record<string, TripSearchResult>>({});

  // Seed on first load, then load trips
  useEffect(() => {
    store.seedIfNeeded();
    setTrips(store.getTrips());
  }, []);

  const refreshTrips = useCallback(() => {
    setTrips(store.getTrips());
  }, []);

  const saveTripFn = useCallback(
    (trip: Trip) => {
      store.saveTrip(trip);
      refreshTrips();
    },
    [refreshTrips],
  );

  const deleteTripFn = useCallback(
    (tripId: string) => {
      store.deleteTrip(tripId);
      refreshTrips();
    },
    [refreshTrips],
  );

  const getTripFn = useCallback(
    (tripId: string) => trips.find((t) => t.id === tripId),
    [trips],
  );

  const saveResultFn = useCallback((result: TripSearchResult) => {
    store.saveResult(result);
    setResults((prev) => ({ ...prev, [result.tripId]: result }));
  }, []);

  const getResultFn = useCallback(
    (tripId: string) => results[tripId] ?? store.getResult(tripId),
    [results],
  );

  return (
    <StoreContext.Provider
      value={{
        trips,
        results,
        refreshTrips,
        saveTrip: saveTripFn,
        deleteTrip: deleteTripFn,
        getTrip: getTripFn,
        saveResult: saveResultFn,
        getResult: getResultFn,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreState {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
