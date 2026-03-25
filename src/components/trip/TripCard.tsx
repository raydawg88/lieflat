import { Link } from "react-router-dom";
import type { Trip } from "@/domain/entities";
import { getAirportLabel } from "@/lib/airports";
import { formatFullDate } from "@/lib/format";
import { CABIN_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";

interface TripCardProps {
  trip: Trip;
  bestScore?: number;
}

export function TripCard({ trip, bestScore }: TripCardProps) {
  return (
    <Link
      to={`/trips/${trip.id}/results`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-brand-300 transition-all group"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
            {trip.name}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {getAirportLabel(trip.origin)} →{" "}
            {trip.finalDestination ?? getAirportLabel(trip.destination)}
          </p>
          {trip.gatewayAirports.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              Airports: {[trip.destination, ...trip.gatewayAirports].join(", ")}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {formatFullDate(trip.dateRangeStart)} — {formatFullDate(trip.dateRangeEnd)}
            {trip.flexibilityDays > 0 && (
              <span className="ml-1">(±{trip.flexibilityDays} days)</span>
            )}
          </p>
          <div className="flex gap-2 mt-2">
            <Badge variant="cabin" cabinClass={trip.preferredCabin}>
              {CABIN_LABELS[trip.preferredCabin] ?? trip.preferredCabin}
            </Badge>
            {trip.allowPositioningFlights && (
              <Badge>Positioning OK</Badge>
            )}
          </div>
        </div>

        {bestScore !== undefined && (
          <div
            className={`text-2xl font-bold ${
              bestScore >= 80
                ? "text-green-600"
                : bestScore >= 60
                  ? "text-yellow-600"
                  : "text-red-600"
            }`}
          >
            {bestScore}
          </div>
        )}
      </div>
    </Link>
  );
}
