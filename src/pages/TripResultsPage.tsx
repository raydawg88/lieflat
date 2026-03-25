import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useStore } from "@/store/store-context";
import { searchForTrip } from "@/engine/search-engine";
import { createDefaultRegistry } from "@/providers";
import type { TripSearchResult, Opportunity } from "@/domain/entities";
import { OpportunityList } from "@/components/opportunity/OpportunityList";
import { getAirportLabel } from "@/lib/airports";
import { formatUSD } from "@/lib/format";
import { CABIN_LABELS } from "@/lib/constants";

type SortBy = "score" | "price" | "duration";

export function TripResultsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { getTrip, getResult, saveResult } = useStore();

  const trip = tripId ? getTrip(tripId) : undefined;
  const cachedResult = tripId ? getResult(tripId) : undefined;

  const [result, setResult] = useState<TripSearchResult | null>(
    cachedResult ?? null,
  );
  const [loading, setLoading] = useState(!cachedResult);
  const [sortBy, setSortBy] = useState<SortBy>("score");
  const [cabinFilter, setCabinFilter] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<string>("");

  useEffect(() => {
    if (!trip || cachedResult) return;

    let cancelled = false;
    setLoading(true);

    const registry = createDefaultRegistry();
    searchForTrip(trip, registry.getAll()).then((res) => {
      if (cancelled) return;
      setResult(res);
      saveResult(res);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [trip, cachedResult, saveResult]);

  const filteredAndSorted = useMemo((): Opportunity[] => {
    if (!result) return [];

    let opps = [...result.opportunities];

    // Filter by cabin
    if (cabinFilter !== "all") {
      opps = opps.filter((o) =>
        o.route.allSegments.some((s) => s.cabinClass === cabinFilter),
      );
    }

    // Filter by max price
    if (maxPrice) {
      const maxCents = parseFloat(maxPrice) * 100;
      opps = opps.filter((o) => o.route.totalPriceCents <= maxCents);
    }

    // Sort
    switch (sortBy) {
      case "price":
        opps.sort((a, b) => a.route.totalPriceCents - b.route.totalPriceCents);
        break;
      case "duration":
        opps.sort(
          (a, b) =>
            a.route.totalDurationMinutes - b.route.totalDurationMinutes,
        );
        break;
      case "score":
      default:
        opps.sort((a, b) => b.score.overall - a.score.overall);
    }

    return opps;
  }, [result, sortBy, cabinFilter, maxPrice]);

  if (!trip) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-900">Trip not found</h2>
        <Link to="/" className="text-brand-600 hover:underline mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {getAirportLabel(trip.origin)} → {getAirportLabel(trip.destination)}
        </h1>
        <p className="text-gray-600 mt-1">{trip.name}</p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="animate-pulse">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900">
              Searching for opportunities...
            </h3>
            <p className="text-gray-500 mt-1">
              Querying providers and scoring routes
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <>
          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>
              {result.opportunities.length} opportunities found
            </span>
            <span>
              {result.faresEvaluated} fares evaluated
            </span>
            <span>{result.searchDurationMs}ms</span>
          </div>

          {/* Filters + Sort */}
          <div className="flex items-center gap-4 flex-wrap bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="score">Best Score</option>
                <option value="price">Lowest Price</option>
                <option value="duration">Shortest Duration</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">
                Cabin:
              </label>
              <select
                value={cabinFilter}
                onChange={(e) => setCabinFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">All Cabins</option>
                {Object.entries(CABIN_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">
                Max Price:
              </label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="No limit"
                className="text-sm border border-gray-300 rounded px-2 py-1 w-28"
              />
            </div>

            {(cabinFilter !== "all" || maxPrice) && (
              <button
                onClick={() => {
                  setCabinFilter("all");
                  setMaxPrice("");
                }}
                className="text-xs text-brand-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Opportunity list */}
          <OpportunityList
            opportunities={filteredAndSorted}
            tripId={trip.id}
          />

          {/* Price range summary */}
          {filteredAndSorted.length > 0 && (
            <div className="text-center text-sm text-gray-500 py-2">
              Price range:{" "}
              {formatUSD(
                Math.min(...filteredAndSorted.map((o) => o.route.totalPriceCents)),
              )}{" "}
              —{" "}
              {formatUSD(
                Math.max(...filteredAndSorted.map((o) => o.route.totalPriceCents)),
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
