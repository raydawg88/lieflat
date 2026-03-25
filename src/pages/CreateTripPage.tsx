import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CabinClass } from "@/domain/entities";
import { createTrip } from "@/store/trip-store";
import { useStore } from "@/store/store-context";
import { isValidAirportCode, searchAirports } from "@/lib/airports";
import { CABIN_LABELS } from "@/lib/constants";

export function CreateTripPage() {
  const navigate = useNavigate();
  const { refreshTrips } = useStore();

  const [origin, setOrigin] = useState("DFW");
  const [destination, setDestination] = useState("");
  const [finalDest, setFinalDest] = useState("");
  const [gateways, setGateways] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [flexibility, setFlexibility] = useState(3);
  const [cabin, setCabin] = useState<CabinClass>(CabinClass.Business);
  const [budget, setBudget] = useState("");
  const [positioning, setPositioning] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Airport suggestions
  const [originSuggestions, setOriginSuggestions] = useState<string[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<string[]>([]);
  const [showOriginSugg, setShowOriginSugg] = useState(false);
  const [showDestSugg, setShowDestSugg] = useState(false);

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
    setDestination(val.toUpperCase());
    if (val.length >= 2) {
      const results = searchAirports(val).map((a) => a.code);
      setDestSuggestions(results.slice(0, 5));
      setShowDestSugg(true);
    } else {
      setShowDestSugg(false);
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!origin || !isValidAirportCode(origin)) {
      errs.origin = "Enter a valid airport code";
    }
    if (!destination || !isValidAirportCode(destination)) {
      errs.destination = "Enter a valid airport code";
    }
    if (origin && destination && origin === destination) {
      errs.destination = "Destination must differ from origin";
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

    const gwList = gateways
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length === 3);

    const trip = createTrip({
      name: finalDest
        ? `${origin} → ${finalDest}`
        : `${origin} → ${destination}`,
      origin,
      destination,
      finalDestination: finalDest || undefined,
      gatewayAirports: gwList,
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
          Define your route and preferences to find lie-flat deals
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-6"
      >
        {/* Route */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Origin (IATA Code)
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

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination (IATA Code)
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => handleDestChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowDestSugg(false), 200)}
              placeholder="BRU"
              maxLength={3}
              className={`w-full px-3 py-2 border rounded-lg text-sm ${
                errors.destination ? "border-red-400" : "border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-brand-500`}
            />
            {errors.destination && (
              <p className="text-xs text-red-500 mt-1">{errors.destination}</p>
            )}
            {showDestSugg && destSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                {destSuggestions.map((code) => (
                  <button
                    key={code}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => {
                      setDestination(code);
                      setShowDestSugg(false);
                    }}
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Final Destination + Gateways */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Where do you actually want to end up? (optional)
            </label>
            <input
              type="text"
              value={finalDest}
              onChange={(e) => setFinalDest(e.target.value)}
              placeholder="e.g. Ghent, Belgium"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              If your final destination isn&apos;t at an airport, we&apos;ll search
              nearby airports and include ground transport options.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Also search these gateway airports (comma-separated)
            </label>
            <input
              type="text"
              value={gateways}
              onChange={(e) => setGateways(e.target.value)}
              placeholder="e.g. AMS, CDG, LHR"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Fly into any of these airports and take a train/bus to your
              destination. We&apos;ll include ground transport time and cost.
            </p>
          </div>
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
