'use client';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <h2 className="text-red-400 font-bold text-lg mb-2">Admin Panel Hatasi</h2>
        <p className="text-red-300 text-sm mb-1">Hata mesaji:</p>
        <pre className="text-red-200 text-xs bg-black/30 rounded p-3 overflow-auto mb-4 max-h-40">
          {error.message}
        </pre>
        {error.stack && (
          <>
            <p className="text-red-300 text-sm mb-1">Stack trace:</p>
            <pre className="text-red-200/60 text-[10px] bg-black/30 rounded p-3 overflow-auto max-h-60">
              {error.stack}
            </pre>
          </>
        )}
        <button
          onClick={reset}
          className="mt-4 bg-primary hover:bg-primary/90 text-black px-4 py-2 rounded-lg font-bold text-sm"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
