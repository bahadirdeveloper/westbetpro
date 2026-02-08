export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
        <div className="h-4 w-64 bg-white/5 rounded animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card-dark border border-aged-gold/20 rounded-xl p-4">
            <div className="h-6 w-16 bg-white/5 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6 h-32 animate-pulse" />
    </div>
  );
}
