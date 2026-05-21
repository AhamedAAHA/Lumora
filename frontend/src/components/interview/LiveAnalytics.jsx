import { memo } from 'react';

function MiniChart({ history }) {
  if (!history.length) return null;
  const max = 100;
  return (
    <div className="flex h-24 items-end gap-1 pt-2">
      {history.map((h, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full max-w-[20px] rounded-t bg-indigo-500/80"
            style={{ height: `${(h.confidence / max) * 72}px` }}
            title={`${h.confidence}%`}
          />
          <span className="text-[9px] text-white/40">Q{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

function LiveAnalytics({ scores, history, progress = 0 }) {
  return (
    <div className="glass-card space-y-4 p-4">
      <h3 className="text-sm font-semibold text-white/80">Live Analytics</h3>

      <div>
        <div className="flex justify-between text-xs text-white/50">
          <span>Confidence</span>
          <span className="text-indigo-300">{scores.confidence}%</span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
            style={{ width: `${scores.confidence}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-lg bg-white/5 p-2">
          <p className="text-white/50">Communication</p>
          <p className="text-lg font-bold text-emerald-400">{scores.communication}%</p>
        </div>
        <div className="rounded-lg bg-white/5 p-2">
          <p className="text-white/50">Speaking</p>
          <p className="text-lg font-bold text-violet-400">{scores.speaking}%</p>
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-white/50">
          <span>Interview progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-violet-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <MiniChart history={history} />
    </div>
  );
}

export default memo(LiveAnalytics);
