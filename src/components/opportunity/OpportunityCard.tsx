import { Link } from "react-router-dom";
import type { Opportunity } from "@/domain/entities";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { Badge } from "@/components/ui/Badge";
import { CABIN_LABELS } from "@/lib/constants";
import { formatUSD, formatDuration, formatPoints } from "@/lib/format";

interface OpportunityCardProps {
  opportunity: Opportunity;
  tripId: string;
  rank: number;
}

/** Build route string like "DFW → LHR → BRU" */
function getRouteString(opportunity: Opportunity): string {
  const segments = opportunity.route.allSegments;
  if (segments.length === 0) return "";
  const codes = [segments[0]!.origin];
  for (const seg of segments) {
    codes.push(seg.destination);
  }
  // Deduplicate consecutive same codes
  const unique = codes.filter((c, i) => i === 0 || c !== codes[i - 1]);
  return unique.join(" → ");
}

/** Get the primary cabin class for display */
function getPrimaryCabin(opportunity: Opportunity): { label: string; isLieFlat: boolean } {
  // Find the longest segment (the one that matters)
  const segments = opportunity.route.allSegments;
  let longest = segments[0];
  let longestDuration = 0;
  for (const seg of segments) {
    const dur = new Date(seg.arrivalTime).getTime() - new Date(seg.departureTime).getTime();
    if (dur > longestDuration) {
      longestDuration = dur;
      longest = seg;
    }
  }
  return {
    label: CABIN_LABELS[longest?.cabinClass ?? ""] ?? "Economy",
    isLieFlat: longest?.isLieFlat ?? false,
  };
}

export function OpportunityCard({
  opportunity,
  tripId,
  rank,
}: OpportunityCardProps) {
  const { route, score, headline } = opportunity;
  const pointsFare = route.fares.find((f) => f.pointsCost);
  const routeStr = getRouteString(opportunity);
  const cabin = getPrimaryCabin(opportunity);
  const sources = Array.from(new Set(route.fares.map((f) => f.sourceName)));

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
          {/* Route */}
          <div className="text-xs font-medium text-gray-500 mb-1">
            {routeStr}
          </div>

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

          {/* Cabin + Source badges */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="cabin" cabinClass={route.allSegments.find((s) => s.isLieFlat)?.cabinClass}>
              {cabin.label}
            </Badge>
            {cabin.isLieFlat && (
              <Badge variant="success">Lie-Flat</Badge>
            )}
            {sources.map((name) => (
              <Badge key={name} variant="default">
                {name}
              </Badge>
            ))}
          </div>

          {/* Ground transfer */}
          {route.groundTransfer && (
            <div className="flex items-center gap-2 mt-2 text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1">
              <span>🚆</span>
              <span>
                + {route.groundTransfer.mode} to {route.groundTransfer.to} (~
                {Math.round(route.groundTransfer.durationMinutes / 60)}h)
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
