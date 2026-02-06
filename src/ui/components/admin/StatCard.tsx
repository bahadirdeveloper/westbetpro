interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'green' | 'red' | 'yellow' | 'blue';
}

export default function StatCard({ icon, label, value, trend, color = 'primary' }: StatCardProps) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    green: 'text-green-400 bg-green-400/10 border-green-400/20',
    red: 'text-red-400 bg-red-400/10 border-red-400/20',
    yellow: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  };

  return (
    <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6 hover:border-aged-gold/40 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
          <span className="material-icons-round text-2xl">{icon}</span>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            <span className="material-icons-round text-sm">
              {trend.isPositive ? 'trending_up' : 'trending_down'}
            </span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-white mb-1">{value}</p>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </div>
  );
}
