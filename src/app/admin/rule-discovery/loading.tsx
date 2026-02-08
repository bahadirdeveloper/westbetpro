export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
        <div className="h-4 w-96 bg-white/5 rounded animate-pulse mt-2" />
      </div>
      <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-40 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="h-10 w-24 bg-white/5 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
