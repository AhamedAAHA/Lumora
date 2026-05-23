import { memo } from 'react';
import { Activity, Clock, MessageSquare, Mic, TrendingUp, Zap } from 'lucide-react';

function MiniChart({ history, field = 'confidence', color = 'bg-indigo-500/80' }) {
  if (!history.length) {
    return (
      <p className="py-4 text-center text-xs text-white/35">
        Metrics update as you type or speak your answer
      </p>
    );
  }
  const max = 100;
  return (
    <div className="flex h-20 items-end gap-1 pt-2">
      {history.slice(-8).map((h, i) => (
        <div key={`${field}-${i}`} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={`w-full max-w-[20px] rounded-t ${color}`}
            style={{ height: `${Math.max(4, (h[field] / max) * 64)}px` }}
            title={`${h[field]}%`}
          />
          <span className="text-[9px] text-white/40">Q{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub, accent = 'text-white' }) {
  return (
    <div className="rounded-lg bg-white/5 p-2.5">
      <div className="flex items-center gap-1.5 text-white/45">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <p className="text-[10px] uppercase tracking-wide">{label}</p>
      </div>
      <p className={`mt-1 text-lg font-bold tabular-nums ${accent}`}>{value}</p>
      {sub && <p className="text-[10px] text-white/40">{sub}</p>}
    </div>
  );
}

function LiveAnalytics({
  scores,
  history,
  progress = 0,
  live = {},
  listening = false,
  avgScore = null,
}) {
  const avgConfidence =
    history.length > 0
      ? Math.round(history.reduce((s, h) => s + (h.confidence || 0), 0) / history.length)
      : scores.confidence;

  return (
    <div className="glass-card space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white/80">Live Analytics</h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
            listening
              ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30'
              : 'bg-emerald-500/15 text-emerald-300/90'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${listening ? 'animate-pulse bg-cyan-400' : 'bg-emerald-400'}`}
          />
          {listening ? 'Listening' : 'Live'}
        </span>
      </div>

      <div>
        <div className="flex justify-between text-xs text-white/50">
          <span>Confidence</span>
          <span className="text-indigo-300 tabular-nums">{scores.confidence}%</span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500 ease-out"
            style={{ width: `${scores.confidence}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile
          icon={MessageSquare}
          label="Communication"
          value={`${scores.communication}%`}
          accent="text-emerald-400"
        />
        <StatTile icon={Mic} label="Speaking" value={`${scores.speaking}%`} accent="text-violet-400" />
        <StatTile
          icon={Activity}
          label="Clarity"
          value={`${scores.clarity ?? scores.communication}%`}
          accent="text-cyan-400"
        />
        <StatTile
          icon={TrendingUp}
          label="Avg confidence"
          value={`${avgConfidence}%`}
          sub={history.length ? `over ${history.length} answer(s)` : 'building…'}
          accent="text-indigo-300"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <StatTile
          icon={Zap}
          label="Pace"
          value={live.wpm > 0 ? `${live.wpm} WPM` : '—'}
          sub={live.wpm > 0 ? (live.wpm < 90 ? 'slow' : live.wpm > 170 ? 'fast' : 'steady') : 'start answering'}
        />
        <StatTile
          icon={Clock}
          label="Response time"
          value={live.responseMs > 0 ? `${Math.round(live.responseMs / 1000)}s` : '—'}
          sub="this question"
        />
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-md bg-white/5 px-2 py-1 text-white/55">
          Words: <strong className="text-white/90">{live.wordCount ?? 0}</strong>
        </span>
        <span className="rounded-md bg-white/5 px-2 py-1 text-white/55">
          Fillers: <strong className={live.fillers > 2 ? 'text-amber-300' : 'text-white/90'}>{live.fillers ?? 0}</strong>
        </span>
        {avgScore != null && (
          <span className="rounded-md bg-indigo-500/15 px-2 py-1 text-indigo-200/90">
            Last score: <strong>{avgScore}/10</strong>
          </span>
        )}
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-white/50">
          <span>Interview progress</span>
          <span className="tabular-nums">{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-wide text-white/40">Confidence trend</p>
        <MiniChart history={history} field="confidence" />
      </div>
    </div>
  );
}

export default memo(LiveAnalytics);
