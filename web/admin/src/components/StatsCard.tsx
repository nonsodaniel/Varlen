interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string };
}

export default function StatsCard({ title, value, subtitle, trend }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
      {trend && (
        <p
          className={`text-xs font-medium mt-2 ${
            trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'
          }`}
        >
          {trend.value >= 0 ? '+' : ''}
          {trend.value} {trend.label}
        </p>
      )}
    </div>
  );
}
