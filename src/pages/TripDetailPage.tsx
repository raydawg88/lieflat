import { useParams, Link } from "react-router-dom";
import { useStore } from "@/store/store-context";
import { SegmentTimeline } from "@/components/opportunity/SegmentTimeline";
import { ScoreBreakdown } from "@/components/opportunity/ScoreBreakdown";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { Badge } from "@/components/ui/Badge";
import { formatUSD, formatDuration, formatPoints } from "@/lib/format";
import { getAirportLabel } from "@/lib/airports";
import { RETAIL_BENCHMARKS } from "@/lib/constants";
import type { Fare } from "@/domain/entities";

/** Source badge color based on source type */
function sourceColor(sourceName: string): string {
  const colors: Record<string, string> = {
    "AA.com": "bg-blue-100 text-blue-800",
    "Google Flights": "bg-green-100 text-green-800",
    "United MileagePlus": "bg-indigo-100 text-indigo-800",
    "Secret Flying": "bg-orange-100 text-orange-800",
  };
  return colors[sourceName] ?? "bg-gray-100 text-gray-700";
}

/** Render a single fare row with booking link */
function FareRow({ fare }: { fare: Fare }) {
  const segmentLabel = fare.segments
    .map((s) => `${getAirportLabel(s.origin)} → ${getAirportLabel(s.destination)}`)
    .join(" → ");

  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900">
              {segmentLabel}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sourceColor(fare.sourceName)}`}
            >
              {fare.sourceName}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            {fare.fareClass && <span>Fare class: {fare.fareClass}</span>}
            <span>
              {fare.segments.map((s) => s.flightNumber).join(", ")}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          {fare.pointsCost ? (
            <div>
              <span className="text-sm font-bold text-gray-900">
                {formatPoints(fare.pointsCost.points)} pts
              </span>
              <span className="text-xs text-gray-500 block">
                + {formatUSD(fare.pointsCost.cashCopay)} taxes
              </span>
            </div>
          ) : (
            <span className="text-sm font-bold text-gray-900">
              {formatUSD(fare.totalPriceCents)}
            </span>
          )}
        </div>
      </div>

      {/* Booking link */}
      <a
        href={fare.bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors"
      >
        {fare.pointsCost ? "Book with Miles" : "Book on"} {fare.sourceName}
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>
      {fare.pointsCost?.portalUrl && fare.pointsCost.portalUrl !== fare.bookingUrl && (
        <a
          href={fare.pointsCost.portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-2 ml-2 px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          {fare.pointsCost.program} Portal
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      )}
    </div>
  );
}

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

  // Collect all booking instructions across fares
  const allInstructions = route.fares
    .filter((f) => f.bookingInstructions && f.bookingInstructions.length > 0)
    .map((f) => ({
      label: `${f.sourceName}: ${f.segments.map((s) => `${s.origin}→${s.destination}`).join("→")}`,
      steps: f.bookingInstructions!,
      url: f.bookingUrl,
      sourceName: f.sourceName,
    }));

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
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-600 flex-wrap">
              <span>{formatDuration(route.totalDurationMinutes)} total</span>
              <span>
                {route.connectionCount === 0
                  ? "Nonstop"
                  : `${route.connectionCount} stop${route.connectionCount > 1 ? "s" : ""}`}
              </span>
              {route.hasLieFlat && (
                <Badge variant="success">Lie-Flat</Badge>
              )}
              {/* Source badges */}
              {Array.from(new Set(route.fares.map((f) => f.sourceName))).map(
                (name) => (
                  <span
                    key={name}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sourceColor(name)}`}
                  >
                    {name}
                  </span>
                ),
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

      {/* Ground Transfer */}
      {route.groundTransfer && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-lg">🚆</span> Ground Transfer to{" "}
            {trip.finalDestination ?? route.groundTransfer.to}
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                {route.groundTransfer.from} → {route.groundTransfer.to}
              </span>
              <span className="text-sm font-medium text-gray-900">
                ~{formatDuration(route.groundTransfer.durationMinutes)} •{" "}
                ~{formatUSD(route.groundTransfer.estimatedCostCents)}
              </span>
            </div>
            {route.groundTransfer.provider && (
              <div className="text-sm text-gray-600">
                Via {route.groundTransfer.provider}
              </div>
            )}
            {route.groundTransfer.notes && (
              <p className="text-sm text-gray-600 bg-white/60 rounded-lg p-3 mt-2">
                {route.groundTransfer.notes}
              </p>
            )}
            {route.groundTransfer.bookingUrl && (
              <a
                href={route.groundTransfer.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Book {route.groundTransfer.mode === "train" ? "Train" : "Transport"} Tickets
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Where to Book — per-fare booking links */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">
          Where to Book
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          {route.fares.length > 1
            ? "This itinerary requires separate bookings. Book each fare below."
            : "Book this fare directly from the source."}
        </p>
        <div className="divide-y divide-gray-100">
          {route.fares.map((fare) => (
            <FareRow key={fare.id} fare={fare} />
          ))}
        </div>
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-200 font-semibold text-gray-900">
          <span>Total</span>
          <span>
            {pointsFare?.pointsCost
              ? `${formatPoints(pointsFare.pointsCost.points)} pts + ${formatUSD(route.totalPriceCents)}`
              : formatUSD(route.totalPriceCents)}
          </span>
        </div>
      </div>

      {/* Booking Guide — step-by-step instructions */}
      {allInstructions.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <span className="text-lg">📋</span> How to Get This Price
          </h2>
          <p className="text-xs text-gray-600 mb-4">
            Follow these steps to book at the prices shown above.
          </p>

          <div className="space-y-5">
            {allInstructions.map((group, gi) => (
              <div key={gi}>
                {allInstructions.length > 1 && (
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sourceColor(group.sourceName)}`}
                    >
                      {group.sourceName}
                    </span>
                    <span className="text-xs font-medium text-gray-700">
                      {group.label.split(": ")[1]}
                    </span>
                  </div>
                )}
                <ol className="space-y-2">
                  {group.steps.map((step, si) => (
                    <li key={si} className="flex gap-3 text-sm text-gray-700">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center mt-0.5">
                        {si + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ScoreBreakdown factors={score.factors} overall={score.overall} />
      </div>

      {/* Back to results */}
      <div className="flex gap-3">
        <Link
          to={`/trips/${tripId}/results`}
          className="flex-1 py-3 text-center border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          ← Back to Results
        </Link>
      </div>
    </div>
  );
}
