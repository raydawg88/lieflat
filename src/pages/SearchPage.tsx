import { useState, type FormEvent } from "react";
import {
  resolveDestinationAirports,
  getKnownDestinations,
  getGatewayAirports,
  getGroundTransfer,
} from "@/lib/destinations";
import { searchAirports } from "@/lib/airports";
import { formatUSD, formatDuration } from "@/lib/format";

interface FlightResult {
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  cabinClass: string;
  aircraft: string;
  isLieFlat: boolean;
  nonstop: boolean;
}

interface FareResult {
  segments: FlightResult[];
  priceCents: number;
  sourceName: string;
  bookingUrl: string;
  bookingInstructions: string[];
  pointsCost?: {
    program: string;
    points: number;
    cashCopay: number;
    portalUrl?: string;
  };
}

interface Opportunity {
  headline: string;
  totalPriceCents: number;
  fares: FareResult[];
  trainInfo?: string;
}

interface SearchState {
  loading: boolean;
  error: string | null;
  results: Opportunity[] | null;
}

export function SearchPage() {
  // Form state
  const [origin, setOrigin] = useState("DFW");
  const [destination, setDestination] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [cabin, setCabin] = useState("business");
  const [nonstopOnly, setNonstopOnly] = useState(false);

  // Autocomplete
  const [originSugg, setOriginSugg] = useState<string[]>([]);
  const [destSugg, setDestSugg] = useState<string[]>([]);
  const [showOriginSugg, setShowOriginSugg] = useState(false);
  const [showDestSugg, setShowDestSugg] = useState(false);

  // Search state
  const [search, setSearch] = useState<SearchState>({
    loading: false,
    error: null,
    results: null,
  });

  const resolvedAirports = resolveDestinationAirports(destination);

  function handleOriginChange(val: string) {
    setOrigin(val.toUpperCase());
    if (val.length >= 2) {
      setOriginSugg(searchAirports(val).map((a) => `${a.code} — ${a.city}`).slice(0, 5));
      setShowOriginSugg(true);
    } else {
      setShowOriginSugg(false);
    }
  }

  function handleDestChange(val: string) {
    setDestination(val);
    if (val.length >= 2) {
      const cities = getKnownDestinations().filter((d) =>
        d.toLowerCase().includes(val.toLowerCase()),
      );
      const airports = searchAirports(val).map((a) => `${a.city} (${a.code})`);
      setDestSugg([...cities, ...airports].slice(0, 6));
      setShowDestSugg(true);
    } else {
      setShowDestSugg(false);
    }
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!origin || !destination || !departDate) return;

    setSearch({ loading: true, error: null, results: null });

    const airports = resolvedAirports.length > 0
      ? resolvedAirports
      : [destination.toUpperCase()];

    const gatewayInfo = getGatewayAirports(destination);

    try {
      const res = await fetch("/.netlify/functions/search-flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          destination,
          destinationAirports: airports,
          dateRangeStart: departDate,
          dateRangeEnd: returnDate || departDate,
          preferredCabin: cabin,
          allowPositioningFlights: !nonstopOnly,
          nonstopOnly,
          flexibilityDays: 0,
          gatewayInfo: gatewayInfo.length > 0 ? gatewayInfo : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error((err as { error: string }).error);
      }

      const data = await res.json() as { opportunities: Opportunity[] };

      // Attach train info to each opportunity
      const enriched = data.opportunities.map((opp) => {
        const lastSeg = opp.fares[opp.fares.length - 1]?.segments;
        const arrivalAirport = lastSeg?.[lastSeg.length - 1]?.destination;
        if (arrivalAirport) {
          const transfer = getGroundTransfer(arrivalAirport, destination);
          if (transfer) {
            opp.trainInfo = `${transfer.from} → ${transfer.to}: ${formatDuration(transfer.durationMinutes)} by ${transfer.mode}, ~${formatUSD(transfer.estimatedCostCents)}`;
          }
        }
        return opp;
      });

      setSearch({ loading: false, error: null, results: enriched });
    } catch (err) {
      setSearch({
        loading: false,
        error: err instanceof Error ? err.message : "Search failed",
        results: null,
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✈️</span>
            <span className="text-xl font-bold">LieFlat</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          {/* Row 1: Origin + Destination */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input
                type="text"
                value={origin}
                onChange={(e) => handleOriginChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowOriginSugg(false), 200)}
                placeholder="DFW"
                maxLength={3}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showOriginSugg && originSugg.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                  {originSugg.map((s) => (
                    <button key={s} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() => { setOrigin(s.split(" ")[0]!); setShowOriginSugg(false); }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-xs font-medium text-gray-500 mb-1">Where do you want to go?</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => handleDestChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowDestSugg(false), 200)}
                placeholder="Ghent, Tokyo, London..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showDestSugg && destSugg.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                  {destSugg.map((s) => (
                    <button key={s} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() => { setDestination(s.replace(/\s*\([A-Z]{3}\)$/, "")); setShowDestSugg(false); }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {resolvedAirports.length > 1 && (
                <p className="text-xs text-blue-600 mt-1">
                  Searching: {resolvedAirports.join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Depart</label>
              <input type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Return (optional)</label>
              <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Row 3: Cabin + Nonstop + Go */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
              <select value={cabin} onChange={(e) => setCabin(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="premium_economy">Premium Economy</option>
                <option value="business">Business</option>
                <option value="first">First</option>
              </select>
            </div>

            <label className="flex items-center gap-2 pb-2.5 cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={nonstopOnly} onChange={(e) => setNonstopOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-sm text-gray-700">Nonstop only</span>
            </label>

            <button type="submit" disabled={search.loading || !origin || !destination || !departDate}
              className="px-8 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
              {search.loading ? "Searching..." : "Find Flights"}
            </button>
          </div>
        </form>

        {/* Loading */}
        {search.loading && (
          <div className="mt-8 text-center py-12">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mb-4" />
            <p className="text-gray-600">Searching airports near {destination}...</p>
          </div>
        )}

        {/* Error */}
        {search.error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 text-sm">{search.error}</p>
            <button onClick={() => setSearch({ ...search, error: null })}
              className="mt-2 text-xs text-red-600 underline">Dismiss</button>
          </div>
        )}

        {/* Results */}
        {search.results && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-gray-500">{search.results.length} options found</p>

            {search.results.map((opp, i) => {
              const allSegs = opp.fares.flatMap((f) => f.segments);
              const routeStr = allSegs.length > 0
                ? [allSegs[0]!.origin, ...allSegs.map((s) => s.destination)].filter((c, idx, arr) => idx === 0 || c !== arr[idx - 1]).join(" → ")
                : "";
              const lieFlatSeg = allSegs.find((s) => s.isLieFlat);
              const pointsFare = opp.fares.find((f) => f.pointsCost);

              return (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                  {/* Route + Price */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-xs font-medium text-gray-400 mb-1">{routeStr}</div>
                      <h3 className="font-semibold text-gray-900">{opp.headline}</h3>

                      {/* Segments */}
                      <div className="mt-3 space-y-2">
                        {allSegs.map((seg, si) => (
                          <div key={si} className="flex items-center gap-3 text-sm">
                            <span className={`w-2 h-2 rounded-full ${seg.isLieFlat ? "bg-purple-500" : "bg-gray-300"}`} />
                            <span className="font-medium">{seg.flightNumber}</span>
                            <span className="text-gray-500">{seg.origin} → {seg.destination}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              seg.isLieFlat ? "bg-purple-100 text-purple-800" :
                              seg.cabinClass === "business" ? "bg-purple-50 text-purple-700" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {seg.cabinClass === "business" ? "Business" : seg.cabinClass === "first" ? "First" : seg.cabinClass === "premium_economy" ? "Prem Econ" : "Economy"}
                              {seg.isLieFlat ? " · Lie-Flat" : ""}
                            </span>
                            {seg.aircraft && <span className="text-xs text-gray-400">{seg.aircraft}</span>}
                          </div>
                        ))}
                      </div>

                      {/* Train info */}
                      {opp.trainInfo && (
                        <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1.5 inline-block">
                          🚆 {opp.trainInfo}
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-bold text-gray-900">
                        {pointsFare?.pointsCost
                          ? `${(pointsFare.pointsCost.points / 1000).toFixed(0)}K pts`
                          : formatUSD(opp.totalPriceCents)}
                      </div>
                      {pointsFare?.pointsCost && (
                        <div className="text-xs text-gray-500">+ {formatUSD(pointsFare.pointsCost.cashCopay)} taxes</div>
                      )}
                      {lieFlatSeg && (
                        <div className="text-xs text-purple-600 mt-1">Lie-Flat · {lieFlatSeg.aircraft}</div>
                      )}
                    </div>
                  </div>

                  {/* Booking buttons */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    {opp.fares.map((fare, fi) => (
                      <div key={fi} className="flex items-center justify-between gap-3 mb-2 last:mb-0">
                        <div className="text-xs text-gray-500">
                          {fare.segments.map((s) => `${s.origin}→${s.destination}`).join(", ")} · {fare.sourceName}
                        </div>
                        <a href={fare.bookingUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0">
                          Book on {fare.sourceName}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    ))}

                    {/* Booking tips */}
                    {opp.fares.some((f) => f.bookingInstructions?.length) && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer hover:underline">How to book this</summary>
                        <div className="mt-2 text-xs text-gray-600 space-y-1 pl-4">
                          {opp.fares.flatMap((f) => f.bookingInstructions ?? []).map((step, si) => (
                            <p key={si}>{si + 1}. {step}</p>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
