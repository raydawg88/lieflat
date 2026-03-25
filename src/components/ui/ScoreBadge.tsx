interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-800 ring-green-300";
  if (score >= 60) return "bg-yellow-100 text-yellow-800 ring-yellow-300";
  return "bg-red-100 text-red-800 ring-red-300";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Great";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Poor";
}

const sizeClasses = {
  sm: "w-10 h-10 text-sm",
  md: "w-14 h-14 text-lg",
  lg: "w-20 h-20 text-2xl",
};

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizeClasses[size]} ${getScoreColor(score)} rounded-full flex items-center justify-center font-bold ring-2`}
      >
        {score}
      </div>
      {size !== "sm" && (
        <span className="text-xs font-medium text-gray-500">
          {getScoreLabel(score)}
        </span>
      )}
    </div>
  );
}
