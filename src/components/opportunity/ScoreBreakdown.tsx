import type { ScoreFactor } from "@/domain/entities";

interface ScoreBreakdownProps {
  factors: ScoreFactor[];
  overall: number;
}

function getBarColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export function ScoreBreakdown({ factors, overall }: ScoreBreakdownProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Score Breakdown</h3>
        <span className="text-2xl font-bold text-gray-900">{overall}/100</span>
      </div>

      <div className="space-y-3">
        {factors.map((factor) => (
          <div key={factor.name}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium text-gray-700">
                {factor.name}
                <span className="text-gray-400 ml-1">
                  ({Math.round(factor.weight * 100)}%)
                </span>
              </span>
              <span className="font-semibold text-gray-900">
                {factor.score}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getBarColor(factor.score)}`}
                style={{ width: `${factor.score}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{factor.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
