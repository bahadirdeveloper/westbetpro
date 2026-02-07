'use client';

interface ScoreboardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  secondLine?: string;
  accentColor: 'primary' | 'aged-gold' | 'saddle-brown';
  icon: string;
  badge?: string;
}

const colorMap = {
  primary: {
    iconBg: 'bg-primary/10',
    iconText: 'text-primary',
    badgeBg: 'bg-primary/10',
    badgeText: 'text-primary',
    borderHover: 'hover:border-primary/30',
    glow: 'hover:shadow-[0_0_20px_rgba(0,255,102,0.08)]',
  },
  'aged-gold': {
    iconBg: 'bg-aged-gold/10',
    iconText: 'text-aged-gold',
    badgeBg: 'bg-aged-gold/10',
    badgeText: 'text-aged-gold',
    borderHover: 'hover:border-aged-gold/30',
    glow: 'hover:shadow-[0_0_20px_rgba(197,160,89,0.08)]',
  },
  'saddle-brown': {
    iconBg: 'bg-saddle-brown/10',
    iconText: 'text-saddle-brown',
    badgeBg: 'bg-saddle-brown/10',
    badgeText: 'text-saddle-brown',
    borderHover: 'hover:border-saddle-brown/30',
    glow: 'hover:shadow-[0_0_20px_rgba(139,69,19,0.08)]',
  },
};

export default function WesternScoreboard({
  title,
  value,
  subtitle,
  secondLine,
  accentColor,
  icon,
  badge,
}: ScoreboardProps) {
  const colors = colorMap[accentColor];

  return (
    <div
      className={`wood-texture saloon-border saloon-nail rounded-2xl p-4 sm:p-6 relative overflow-hidden group
        ${colors.borderHover} ${colors.glow} transition-all duration-300 hover:scale-[1.02]`}
    >
      {/* Badge */}
      <div className="flex justify-between items-start mb-3 sm:mb-4">
        <span className={`p-2.5 sm:p-3 rounded-xl ${colors.iconBg} ${colors.iconText}`}>
          <span className="material-icons-round text-xl sm:text-2xl">{icon}</span>
        </span>
        {badge && (
          <span className={`text-[10px] font-bold ${colors.badgeText} px-2 py-1 ${colors.badgeBg} rounded uppercase tracking-wider`}>
            {badge}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-slate-500 text-xs sm:text-sm mb-1 uppercase tracking-wider font-bold">
        {title}
      </p>

      {/* Value */}
      <h3 className="text-2xl sm:text-3xl font-western text-white count-up">
        {value}
      </h3>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
      )}

      {/* Second line (e.g., prediction stats) */}
      {secondLine && (
        <p className="text-xs text-primary mt-1 font-bold">{secondLine}</p>
      )}

      {/* Decorative bottom line */}
      <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-aged-gold/20 to-transparent" />
    </div>
  );
}
