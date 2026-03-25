import { Link } from "react-router-dom";
import type { Opportunity } from "@/domain/entities";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { Badge } from "@/components/ui/Badge";
import { SegmentTimeline } from "./SegmentTimeline";
import { formatUSD, formatDuration, formatPoints } from "@/lib/format";

interface OpportunityCardProps {
  opportunity: Opportunity;
  tripId: string;
  rank: number;
}

/** Get unique source names across all fares in a route */
function getSourceNames(opportunity: Opportunity): string[] {
  const names = new Set(opportunity.route.fares.map((f) => f.sourceName));
  return Array.from(names);
}

export function OpportunityCard({
  opportunity,
  tripId,
  rank,
}: OpportunityCardProps) {
  const { route, score, headline } = opportunity;
  const pointsFare = route.fares.find((f) => f.pointsCost);
  const sources = getSourceNames(opportunity);
  const hasInstructions = route.fares.some(
    (f) => f.bookingInstructions && f.bookingInstructions.length > 0,
  );

  return (
    <Link
      to={`/trips/${tripId}/results/${opportunity.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-brand-300 transition-all group"
    >
      <div className="flex gap-4">
        {/* Rank + Score */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="text-xs font-medium text-gray-400">#{rank}</span>
          <ScoreBadge score={score.overall} size="md" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Headline */}
          <h3 className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
            {headline}
          </h3>

          {/* Price + Meta */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xl font-bold text-gray-900">
              {pointsFare?.pointsCost
                ? `${formatPoints(pointsFare.pointsCost.points)} pts`
                : formatUSD(route.totalPriceCents)}
            </span>
            {pointsFare?.pointsCost && (
              <span className="text-sm text-gray-500">
                + {formatUSD(pointsFare.pointsCost.cashCopay)} taxes
              </span>
            )}
            <span className="text-sm text-gray-500">
              {formatDuration(route.totalDurationMinutes)}
            </span>
            <span className="text-sm text-gray-500">
              {route.connectionCount === 0
                ? "Nonstop"
                : `${route.connectionCount} stop${route.connectionCount > 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Source + Instructions indicator */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {sources.map((name) => (
              <Badge key={name} variant="default">
                {name}
              </Badge>
            ))}
            {hasInstructions && (
              <span className="text-xs text-brand-600 font-medium">
                Booking guide included
              </span>
            )}
          </div>

          {/* Compact timeline */}
          <div className="mt-3">
            <SegmentTimeline segments={route.allSegments} compact />
          </div>
        </div>
      </div>
    </Link>
  );
}
