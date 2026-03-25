import { CabinClass } from "@/domain/entities";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "cabin";
  cabinClass?: CabinClass;
}

const variantClasses: Record<string, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
};

const cabinClasses: Record<string, string> = {
  [CabinClass.First]: "bg-amber-100 text-amber-800",
  [CabinClass.Business]: "bg-purple-100 text-purple-800",
  [CabinClass.PremiumEconomy]: "bg-blue-100 text-blue-800",
  [CabinClass.Economy]: "bg-gray-100 text-gray-600",
};

export function Badge({ children, variant = "default", cabinClass }: BadgeProps) {
  const classes =
    variant === "cabin" && cabinClass
      ? cabinClasses[cabinClass] ?? variantClasses.default
      : variantClasses[variant] ?? variantClasses.default;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}
    >
      {children}
    </span>
  );
}
