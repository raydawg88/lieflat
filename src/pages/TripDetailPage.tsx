import { useParams, Link } from "react-router-dom";
import { useStore } from "@/store/store-context";
import { SegmentTimeline } from "@/components/opportunity/SegmentTimeline";
import { ScoreBreakdown } from "@/components/opportunity/ScoreBreakdown";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { Badge } from "@/components/ui/Badge";
import { formatUSD, formatDuration, formatPoints } from "@/lib/format";
import { getAirportLabel } from "@/lib/airports";
import { RETAIL_BENCHMARKS } from "@/lib/constants";

export function TripDetailPage() {
  const { tripId, opportunityId } = useParams<{
    tripId: string;
    opportunityId: string;
  }>();
  const { getTrip, getResult } = useStore();

  const trip = tripId ? getTrip(tripId) : undefined;
  const result = tripId ? getResult(tripId) : undefined;
  const opportunity = result?.opportunities.find(
    (o) => o.id === opportunityId,
  );

  if (!trip || !opportunity) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-900">
          Opportunity not found
        </h2>
        <Link
          to={tripId ? `/trips/${tripId}/results` : "/"}
          className="text-brand-600 hover:underline mt-2 inline-block"
        >
          Back to results
        </Link>
      </div>
    );
  }

  const { route, score } = opportunity;
  const origin = route.allSegments[0]?.origin ?? "";
  const destination =
    route.allSegments[route.allSegments.length - 1]?.destination ?? "";
  const routeKey = `${origin}-${destination}`;
  const retail = RETAIL_BENCHMARKS[routeKey];
  const pointsFare = route.fares.find((f) => f.pointsCost);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/" className="hover:text-gray-700">
          Dashboard
        </Link>
        <span>/</span>
        <Link
          to={`/trips/${tripId}/results`}
          className="hover:text-gray-700"
        >
          {trip.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Opportunity Detail</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-5">
          <ScoreBadge score={score.overall} size="lg" />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {opportunity.headline}
            </h1>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="text-3xl font-bold text-gray-900">
                {pointsFare?.pointsCost
                  ? `${formatPoints(pointsFare.pointsCost.points)} pts`
                  : formatUSD(route.totalPriceCents)}
              </span>
              {pointsFare?.pointsCost && (
                <span className="text-sm text-gray-500">
                  + {formatUSD(pointsFare.pointsCost.cashCopay)} taxes/fees
                </span>
              )}
              {retail && !pointsFare && (
                <span className="text-sm text-gray-500 line-through">
                  {formatUSD(retail)} retail
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
              <span>{formatDuration(route.totalDurationMinutes)} total</span>
              <span>
                {route.connectionCount === 0
                  ? "Nonstop"
                  : `${route.connectionCount} stop${route.connectionCount > 1 ? "s" : ""}`}
              </span>
              {route.hasLieFlat && (
                <Badge variant="success">Lie-Flat</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Flight Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Flight Itinerary
        </h2>
        <SegmentTimeline segments={route.allSegments} />
      </div>

      {/* Fare Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Fare Details
        </h2>
        <div className="space-y-3">
          {route.fares.map((fare) => (
            <div
              key={fare.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <div>
                <span className="text-sm font-medium text-gray-900">
                  {fare.segments
                    .map(
                      (s) =>
                        `${getAirportLabel(s.origin)} → ${getAirportLabel(s.destination)}`,
                    )
                    .join(", ")}
                </span>
                <div className="flex gap-2 mt-1">
                  {fare.fareClass && (
                    <span className="text-xs text-gray-500">
                      Fare class: {fare.fareClass}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    Source: {fare.source.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              <div className="text-right">
                {fare.pointsCost ? (
                  <div>
                    <span className="text-sm font-semibold">
                      {formatPoints(fare.pointsCost.points)} pts
                    </span>
                    <span className="text-xs text-gray-500 block">
                      + {formatUSD(fare.pointsCost.cashCopay)}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-semibold">
                    {formatUSD(fare.totalPriceCents)}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 font-semibold text-gray-900">
            <span>Total</span>
            <span>
              {pointsFare?.pointsCost
                ? `${formatPoints(pointsFare.pointsCost.points)} pts + ${formatUSD(route.totalPriceCents)}`
                : formatUSD(route.totalPriceCents)}
            </span>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ScoreBreakdown factors={score.factors} overall={score.overall} />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          to={`/trips/${tripId}/results`}
          className="flex-1 py-3 text-center border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          ← Back to Results
        </Link>
        <button
          onClick={() =>
            alert(
              "Booking integration coming soon! For now, search for this fare on Google Flights or directly with the airline.",
            )
          }
          className="flex-1 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          Book This Flight
        </button>
      </div>
    </div>
  );
}
