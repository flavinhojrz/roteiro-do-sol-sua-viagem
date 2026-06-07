export function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.max(0, Math.min(100, (current / total) * 100));
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs font-semibold text-ink/60 uppercase tracking-wider mb-2">
        <span>
          Etapa {current} de {total}
        </span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/80 overflow-hidden shadow-inner">
        <div
          className="h-full bg-gradient-sun rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
