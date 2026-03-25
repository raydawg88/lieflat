import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CabinClass } from "@/domain/entities";
import { createTrip } from "@/store/trip-store";
import { useStore } from "@/store/store-context";
import { isValidAirportCode, searchAirports } from "@/lib/airports";
import { CABIN_LABELS } from "@/lib/constants";
import {
  resolveDestinationAirports,
  getKnownDestinations,
} from "@/lib/destinations";

export function CreateTripPage() {
  const navigate = useNavigate();
  const { refreshTrips } = useStore();

  const [origin, setOrigin] = useState("DFW");
  const [destination, setDestination] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [flexibility, setFlexibility] = useState(3);
  const [cabin, setCabin] = useState<CabinClass>(CabinClass.Business);
  const [budget, setBudget] = useState("");
  const [positioning, setPositioning] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Airport autocomplete for origin
  const [originSuggestions, setOriginSuggestions] = useState<string[]>([]);
  const [showOriginSugg, setShowOriginSugg] = useState(false);

  // Destination autocomplete (city names)
  const [destSuggestions, setDestSuggestions] = useState<string[]>([]);
  const [showDestSugg, setShowDestSugg] = useState(false);

  // Resolved airports preview
  const resolvedAirports = resolveDestinationAirports(destination);

  function handleOriginChange(val: string) {
    setOrigin(val.toUpperCase());
    if (val.length >= 2) {
      const results = searchAirports(val).map((a) => a.code);
      setOriginSuggestions(results.slice(0, 5));
      setShowOriginSugg(true);
    } else {
      setShowOriginSugg(false);
    }
  }

  function handleDestChange(val: string) {
    setDestination(val);
    if (val.length >= 2) {
      const known = getKnownDestinations();
      const matches = known.filter((d) =>
        d.toLowerCase().includes(val.toLowerCase()),
      );
      // Also check if they're typing an airport code
      const airportMatches = searchAirports(val).map(
        (a) => `${a.city} (${a.code})`,
      );
      setDestSuggestions([...matches, ...airportMatches].slice(0, 6));
      setShowDestSugg(true);
    } else {
      setShowDestSugg(false);
    }
  }

  function selectDest(val: string) {
    // If they picked "City (CODE)", extract the city name
    const codeMatch = val.match(/^(.+)\s+\(([A-Z]{3})\)$/);
    if (codeMatch) {
      setDestination(codeMatch[1]!);
    } else {
      // Strip country suffix for resolution: "Ghent, Belgium" → set full string
      setDestination(val);
    }
    setShowDestSugg(false);
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!origin || !isValidAirportCode(origin)) {
      errs.origin = "Enter a valid airport code";
    }
    if (!destination.trim()) {
      errs.destination = "Enter where you want to go";
    }
    if (
      destination.trim() &&
      resolvedAirports.length === 0 &&
      !(destination.length === 3 && destination === destination.toUpperCase())
    ) {
      errs.destination =
        "We don't have airport data for this city yet. Try entering an airport code (e.g. BRU) or a known city.";
    }
    if (!dateStart) {
      errs.dateStart = "Start date is required";
    }
    if (!dateEnd) {
      errs.dateEnd = "End date is required";
    }
    if (dateStart && dateEnd && dateStart > dateEnd) {
      errs.dateEnd = "End date must be after start date";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const airports =
      resolvedAirports.length > 0
        ? resolvedAirports
        : [destination.toUpperCase()]; // Treat as airport code

    const trip = createTrip({
      name: `${origin} → ${destination}`,
      origin,
      destination,
      destinationAirports: airports,
      dateRangeStart: dateStart,
      dateRangeEnd: dateEnd,
      flexibilityDays: flexibility,
      preferredCabin: cabin,
      maxBudgetCents: budget ? Math.round(parseFloat(budget) * 100) : undefined,
      allowPositioningFlights: positioning,
    });

    refreshTrips();
    navigate(`/trips/${trip.id}/results`);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          to="/"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          Create New Trip
        </h1>
        <p className="text-gray-600 mt-1">
          Tell us where you want to go — we&apos;ll figure out the best airports
          and routes
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-6"
      >
        {/* Origin */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Flying from (airport code)
          </label>
          <input
            type="text"
            value={origin}
            onChange={(e) => handleOriginChange(e.target.value)}
            onBlur={() => setTimeout(() => setShowOriginSugg(false), 200)}
            placeholder="DFW"
            maxLength={3}
            className={`w-full px-3 py-2 border rounded-lg text-sm ${
              errors.origin ? "border-red-400" : "border-gray-300"
            } focus:outline-none focus:ring-2 focus:ring-brand-500`}
          />
          {errors.origin && (
            <p className="text-xs text-red-500 mt-1">{errors.origin}</p>
          )}
          {showOriginSugg && originSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
              {originSuggestions.map((code) => (
                <button
                  key={code}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => {
                    setOrigin(code);
                    setShowOriginSugg(false);
                  }}
                >
                  {code}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Destination — city name */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Where do you want to end up?
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => handleDestChange(e.target.value)}
            onBlur={() => setTimeout(() => setShowDestSugg(false), 200)}
            placeholder="e.g. Ghent, Tokyo, London, or an airport code like BRU"
            className={`w-full px-3 py-2 border rounded-lg text-sm ${
              errors.destination ? "border-red-400" : "border-gray-300"
            } focus:outline-none focus:ring-2 focus:ring-brand-500`}
          />
          {errors.destination && (
            <p className="text-xs text-red-500 mt-1">{errors.destination}</p>
          )}
          {showDestSugg && destSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
              {destSuggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => selectDest(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {/* Resolved airports preview */}
          {resolvedAirports.length > 0 && (
            <div className="mt-2 bg-brand-50 rounded-lg p-3">
              <p className="text-xs font-medium text-brand-700 mb-1">
                We&apos;ll search these airports:
              </p>
              <div className="flex gap-2 flex-wrap">
                {resolvedAirports.map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-100 text-brand-800"
                  >
                    {code}
                  </span>
                ))}
              </div>
              <p className="text-xs text-brand-600 mt-1">
                Ground transport to {destination} will be included in results
              </p>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Earliest Departure
            </label>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm ${
                errors.dateStart ? "border-red-400" : "border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-brand-500`}
            />
            {errors.dateStart && (
              <p className="text-xs text-red-500 mt-1">{errors.dateStart}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Latest Departure
            </label>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm ${
                errors.dateEnd ? "border-red-400" : "border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-brand-500`}
            />
            {errors.dateEnd && (
              <p className="text-xs text-red-500 mt-1">{errors.dateEnd}</p>
            )}
          </div>
        </div>

        {/* Flexibility */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Flexibility: ±{flexibility} days
          </label>
          <input
            type="range"
            min={0}
            max={7}
            value={flexibility}
            onChange={(e) => setFlexibility(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>Exact dates</span>
            <span>±7 days</span>
          </div>
        </div>

        {/* Cabin + Budget */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Cabin (long-haul)
            </label>
            <select
              value={cabin}
              onChange={(e) => setCabin(e.target.value as CabinClass)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {Object.entries(CABIN_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Budget (USD, optional)
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="No limit"
              min={0}
              step={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Positioning flights */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="positioning"
            checked={positioning}
            onChange={(e) => setPositioning(e.target.checked)}
            className="w-4 h-4 text-brand-600 rounded"
          />
          <label htmlFor="positioning" className="text-sm text-gray-700">
            Include positioning flights (fly economy to a hub, then lie-flat on
            the long haul)
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          Search for Opportunities
        </button>
      </form>
    </div>
  );
}
