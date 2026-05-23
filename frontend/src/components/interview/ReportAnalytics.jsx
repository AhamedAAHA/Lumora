import { memo } from 'react';
import { Activity, Mic, TrendingUp, Zap } from 'lucide-react';

function TrendChart({ history, field = 'confidence', maxValue }) {
  if (!history?.length) {
    return <p className="py-3 text-center text-xs text-white/35">No session metrics recorded yet.</p>;
  }
  const items = history.slice(-10);
  const max =
    maxValue ||
    Math.max(1, ...items.map((h) => Number(h[field]) || 0), field === 'confidence' ? 100 : 180);
  const suffix = field === 'confidence' || field === 'communication' || field === 'speaking' ? '%' : '';

  return (
    <div className="flex h-24 items-end gap-1.5 pt-2">
      {items.map((h, i) => {
        const val = Number(h[field]) || 0;
        return (
          <div key={`${field}-${i}`} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full max-w-[22px] rounded-t bg-gradient-to-t from-indigo-600/80 to-cyan-400/90"
              style={{ height: `${Math.max(6, (val / max) * 72)}px` }}
              title={`Q${i + 1}: ${val}${suffix}`}
            />
            <span className="text-[9px] text-white/40">Q{i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}

function MetricCard({ label, value, sub, accent = 'text-white' }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-wide text-white/45">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${accent}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-white/40">{sub}</p>}
    </div>
  );
}

function ReportAnalytics({ liveMetrics, metricsHistory = [], result, partial = false }) {
  const history = metricsHistory || [];
  const live = liveMetrics || {};
  const avgConf =
    history.length > 0
      ? Math.round(history.reduce((s, h) => s + (h.confidence || 0), 0) / history.length)
      : live.confidence ?? result?.confidenceScore ?? 0;
  const avgWpm =
    history.length > 0
      ? Math.round(history.reduce((s, h) => s + (h.wpm || 0), 0) / history.length)
      : live.wpm ?? 0;

  return (
    <div className="os-card space-y-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-white">Live session analytics</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
            partial
              ? 'bg-amber-500/15 text-amber-200'
              : 'bg-emerald-500/15 text-emerald-300'
          }`}
        >
          {partial ? 'Updating' : 'Final'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Avg confidence"
          value={`${avgConf}%`}
          accent="text-indigo-300"
          sub={`${history.length} answer(s)`}
        />
        <MetricCard
          label="Communication"
          value={`${live.communication ?? result?.communicationScore ?? '—'}%`}
          accent="text-emerald-400"
        />
        <MetricCard
          label="Speaking"
          value={`${live.speaking ?? result?.speakingScore ?? '—'}%`}
          accent="text-violet-400"
        />
        <MetricCard label="Avg pace" value={avgWpm > 0 ? `${avgWpm} WPM` : '—'} accent="text-cyan-300" />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-white/60">
          <Zap className="h-4 w-4 text-cyan-400" />
          <span>
            Fillers: <strong className="text-white/90">{live.fillers ?? 0}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-white/60">
          <Activity className="h-4 w-4 text-indigo-400" />
          <span>
            Last conf.: <strong className="text-white/90">{live.confidence ?? '—'}%</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-white/60">
          <Mic className="h-4 w-4 text-violet-400" />
          <span>
            Technical: <strong className="text-white/90">{result?.technicalScore ?? '—'}%</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-white/60">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <span>
            Overall: <strong className="text-white/90">{result?.overallScore ?? '—'}%</strong>
          </span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs text-white/45">Confidence per question (live tracking)</p>
        <TrendChart history={history} field="confidence" />
      </div>

      {history.length > 1 && (
        <div>
          <p className="mb-2 text-xs text-white/45">Speaking pace (WPM) per question</p>
          <TrendChart history={history} field="wpm" maxValue={220} />
        </div>
      )}
    </div>
  );
}

export default memo(ReportAnalytics);
