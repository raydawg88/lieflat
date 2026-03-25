import type { Opportunity } from "@/domain/entities";
import { OpportunityCard } from "./OpportunityCard";

interface OpportunityListProps {
  opportunities: Opportunity[];
  tripId: string;
}

export function OpportunityList({
  opportunities,
  tripId,
}: OpportunityListProps) {
  if (opportunities.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <p className="text-gray-500 text-lg">No opportunities found</p>
        <p className="text-gray-400 text-sm mt-1">
          Try adjusting your dates, budget, or cabin preferences
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {opportunities.map((opp, i) => (
        <OpportunityCard
          key={opp.id}
          opportunity={opp}
          tripId={tripId}
          rank={i + 1}
        />
      ))}
    </div>
  );
}
