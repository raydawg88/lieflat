import { Link } from "react-router-dom";
import { useStore } from "@/store/store-context";
import { TripCard } from "@/components/trip/TripCard";

export function DashboardPage() {
  const { trips } = useStore();

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">LieFlat</h1>
        <p className="text-gray-600 mt-1">
          Find the cheapest realistic path to lie-flat business class flights
        </p>
      </div>

      {/* Trips */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Trips</h2>
          <Link
            to="/trips/new"
            className="text-sm font-medium px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            + New Trip
          </Link>
        </div>

        {trips.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="text-4xl mb-4">✈️</div>
            <h3 className="text-lg font-medium text-gray-900">
              No trips yet
            </h3>
            <p className="text-gray-500 mt-1 mb-4">
              Create your first trip to start finding lie-flat deals
            </p>
            <Link
              to="/trips/new"
              className="inline-flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
            >
              Create your first trip
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          How LieFlat Works
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-medium text-gray-900">Define Your Trip</h3>
            <p className="text-sm text-gray-600 mt-1">
              Enter your route, dates, and preferences. We&apos;ll search for the
              best lie-flat opportunities.
            </p>
          </div>
          <div>
            <div className="text-2xl mb-2">🔍</div>
            <h3 className="font-medium text-gray-900">Smart Search</h3>
            <p className="text-sm text-gray-600 mt-1">
              Our engine queries multiple providers and builds multi-segment
              routes including positioning flights.
            </p>
          </div>
          <div>
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-medium text-gray-900">Scored & Ranked</h3>
            <p className="text-sm text-gray-600 mt-1">
              Every opportunity is scored on price value, cabin quality, route
              simplicity, timing, and reliability.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
