import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useStore } from "@/store/store-context";
import { searchWithGemini } from "@/providers/gemini/gemini-provider";
import type { TripSearchResult, Opportunity } from "@/domain/entities";
import { OpportunityList } from "@/components/opportunity/OpportunityList";
import { getAirportLabel } from "@/lib/airports";
import { formatUSD } from "@/lib/format";

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
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("score");
  const [lieFlatOnly, setLieFlatOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState<string>("");

  useEffect(() => {
    if (!trip || cachedResult) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    searchWithGemini(trip)
      .then((res) => {
        if (cancelled) return;
        setResult(res);
        saveResult(res);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Search failed");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trip, cachedResult, saveResult]);

  const filteredAndSorted = useMemo((): Opportunity[] => {
    if (!result) return [];

    let opps = [...result.opportunities];

    // Filter by lie-flat only
    if (lieFlatOnly) {
      opps = opps.filter((o) => o.route.hasLieFlat);
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
  }, [result, sortBy, lieFlatOnly, maxPrice]);

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
          {getAirportLabel(trip.origin)} → {trip.destination}
        </h1>
        {trip.destinationAirports.length > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            Searching airports: {trip.destinationAirports.join(", ")}
          </p>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="animate-pulse">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900">
              Searching for real flights...
            </h3>
            <p className="text-gray-500 mt-1">
              AI is researching routes, prices, and booking options
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-12 bg-red-50 rounded-xl border border-red-200">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-red-900">Search failed</h3>
          <p className="text-red-600 mt-1 text-sm max-w-md mx-auto">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              if (trip) {
                // Clear cache and retry
                const key = `lieflat_gemini_${trip.origin}_${trip.destination}_${trip.dateRangeStart}_${trip.dateRangeEnd}`;
                localStorage.removeItem(key);
                searchWithGemini(trip)
                  .then((res) => {
                    setResult(res);
                    saveResult(res);
                    setLoading(false);
                  })
                  .catch((err) => {
                    setError(err instanceof Error ? err.message : "Search failed");
                    setLoading(false);
                  });
              }
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <>
          {/* Meta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>
                {result.opportunities.length} opportunities found
              </span>
              <span>
                Searched in {(result.searchDurationMs / 1000).toFixed(1)}s
              </span>
            </div>
            <button
              onClick={() => {
                // Clear all caches for this trip and re-search
                if (trip) {
                  const key = `lieflat_gemini_${trip.origin}_${trip.destination}_${trip.dateRangeStart}_${trip.dateRangeEnd}`;
                  localStorage.removeItem(key);
                  const storeKey = `lieflat_results`;
                  try {
                    const all = JSON.parse(localStorage.getItem(storeKey) ?? "{}");
                    delete all[trip.id];
                    localStorage.setItem(storeKey, JSON.stringify(all));
                  } catch { /* ignore */ }
                  setResult(null);
                  setLoading(true);
                  searchWithGemini(trip)
                    .then((res) => {
                      setResult(res);
                      saveResult(res);
                      setLoading(false);
                    })
                    .catch((err) => {
                      setError(err instanceof Error ? err.message : "Search failed");
                      setLoading(false);
                    });
                }
              }}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 px-3 py-1.5 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
            >
              Refresh Results
            </button>
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

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lieFlatOnly}
                onChange={(e) => setLieFlatOnly(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded"
              />
              <span className="text-sm text-gray-700">Lie-flat only</span>
            </label>

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

            {(lieFlatOnly || maxPrice) && (
              <button
                onClick={() => {
                  setLieFlatOnly(false);
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
