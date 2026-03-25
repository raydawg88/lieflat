import type { Segment } from "@/domain/entities";
import { formatTime, formatDate, formatDuration } from "@/lib/format";
import { getAirportLabel } from "@/lib/airports";
import { Badge } from "@/components/ui/Badge";
import { CABIN_LABELS } from "@/lib/constants";

interface SegmentTimelineProps {
  segments: Segment[];
  compact?: boolean;
}

function segmentDuration(seg: Segment): number {
  return Math.round(
    (new Date(seg.arrivalTime).getTime() - new Date(seg.departureTime).getTime()) /
      60_000,
  );
}

function layoverMinutes(prev: Segment, next: Segment): number {
  return Math.round(
    (new Date(next.departureTime).getTime() - new Date(prev.arrivalTime).getTime()) /
      60_000,
  );
}

export function SegmentTimeline({
  segments,
  compact = false,
}: SegmentTimelineProps) {
  return (
    <div className="space-y-0">
      {segments.map((seg, i) => {
        const prevSeg = i > 0 ? segments[i - 1] : undefined;
        const layover = prevSeg ? layoverMinutes(prevSeg, seg) : 0;

        return (
          <div key={seg.id}>
            {/* Layover indicator */}
            {prevSeg && (
              <div className="flex items-center gap-3 py-2 pl-6">
                <div className="w-px h-6 bg-gray-300 ml-1" />
                <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  {formatDuration(layover)} layover at{" "}
                  {getAirportLabel(seg.origin)}
                </span>
              </div>
            )}

            {/* Flight segment */}
            <div
              className={`flex items-start gap-3 ${compact ? "py-1" : "py-2"}`}
            >
              {/* Timeline dot */}
              <div className="flex flex-col items-center mt-1">
                <div
                  className={`w-3 h-3 rounded-full border-2 ${
                    seg.isLieFlat
                      ? "bg-purple-500 border-purple-500"
                      : "bg-white border-gray-400"
                  }`}
                />
                {i < segments.length - 1 && (
                  <div className="w-px flex-1 bg-gray-300 min-h-[2rem]" />
                )}
              </div>

              {/* Segment details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">
                    {seg.flightNumber}
                  </span>
                  <Badge variant="cabin" cabinClass={seg.cabinClass}>
                    {CABIN_LABELS[seg.cabinClass] ?? seg.cabinClass}
                  </Badge>
                  {seg.isLieFlat && (
                    <Badge variant="success">Lie-Flat</Badge>
                  )}
                </div>

                {!compact && (
                  <>
                    <div className="text-sm text-gray-600 mt-1">
                      {getAirportLabel(seg.origin)} →{" "}
                      {getAirportLabel(seg.destination)}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatDate(seg.departureTime)} {formatTime(seg.departureTime)} →{" "}
                      {formatDate(seg.arrivalTime)} {formatTime(seg.arrivalTime)}
                      <span className="ml-2 text-gray-400">
                        ({formatDuration(segmentDuration(seg))})
                      </span>
                    </div>
                    {seg.aircraft && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {seg.airline} {seg.aircraft}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Final destination dot */}
      {segments.length > 0 && (
        <div className="flex items-center gap-3 pl-0">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-brand-600 border-2 border-brand-600" />
          </div>
          {!compact && (
            <span className="text-sm text-gray-600">
              {getAirportLabel(
                segments[segments.length - 1]!.destination,
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
