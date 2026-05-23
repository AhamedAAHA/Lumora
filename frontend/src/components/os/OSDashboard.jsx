import {
  Inbox,
  Calendar,
  CheckSquare,
  FileText,
  FolderKanban,
  Globe,
  Search,
  Bell,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { LumoraMark } from '../LumoraLogo';

export default function OSDashboard({ compact = false, stats = {}, loading = false }) {
  const pulse = stats.pulse ?? '0';
  const pulseSuffix = stats.pulseSuffix ?? '';
  const onTrack = stats.onTrack ?? 0;
  const growthText = stats.growthText ?? '—';
  const chartBars = stats.chartBars ?? [15, 20, 18, 25, 22, 28, 24];
  const queue = stats.queue ?? ['Loading…'];
  const blockers = stats.blockers ?? [];
  const summary = stats.summary ?? 'Loading live interview data…';
  const calendar = stats.calendar ?? [];
  const alerts = stats.alerts ?? [];
  const aiTask = stats.aiTask ?? '—';
  const updatedAt = stats.updatedAt
    ? new Date(stats.updatedAt).toLocaleTimeString()
    : null;

  return (
    <div
      className={`os-panel flex w-full flex-col overflow-hidden text-left ${
        compact ? 'max-h-[520px] text-[11px]' : 'min-h-[480px]'
      }`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3 md:px-5">
        <div className="flex items-center gap-2.5">
          <LumoraMark className="h-6 w-5 shrink-0 text-white" />
          <span className="font-semibold text-white/90">Lumora</span>
          {stats.live && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <span className="live-dot" /> Live
            </span>
          )}
        </div>
        <div className="hidden items-center gap-4 text-xs text-white/45 sm:flex">
          <span className="text-white/80">Product</span>
          <span>Workflows</span>
          <span>Security</span>
        </div>
        <div className="flex items-center gap-2 text-white/50">
          {updatedAt && <span className="hidden text-[10px] text-white/30 md:inline">Updated {updatedAt}</span>}
          <Search className="h-4 w-4" />
          <Bell className="h-4 w-4" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-[72px] shrink-0 flex-col items-center gap-1 border-r border-white/[0.06] py-4 sm:flex">
          <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg font-bold">
            L
          </span>
          {[
            { icon: Sparkles, label: 'Today', active: true },
            { icon: Inbox, label: 'Inbox' },
            { icon: CheckSquare, label: 'Tasks' },
            { icon: FileText, label: 'Notes' },
            { icon: FolderKanban, label: 'Projects' },
            { icon: Globe, label: 'Agent' },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              title={item.label}
              className={`flex w-12 flex-col items-center gap-0.5 rounded-xl py-2 text-[9px] ${
                item.active ? 'sidebar-item-active' : 'text-white/40'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4">
          {loading && (
            <p className="mb-2 text-center text-[10px] text-white/40">Refreshing live data…</p>
          )}
          <div
            className={`grid gap-3 ${
              compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}
          >
            <div className="os-card col-span-1">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Today&apos;s Pulse</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-bold leading-none">
                  {pulse}
                  {pulseSuffix && <span className="text-lg text-white/50">{pulseSuffix}</span>}
                </span>
              </div>
              <div className="mt-3 flex h-8 items-end gap-0.5">
                {chartBars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-emerald-500/40 transition-all duration-500"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <p className="mt-1 text-[10px] text-emerald-400/90">{growthText}</p>
            </div>

            <div className="os-card flex flex-col items-center justify-center text-center">
              <p className="w-full text-left text-[10px] uppercase tracking-wider text-white/40">
                Follow-ups
              </p>
              <div className="relative my-2 h-20 w-20">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#27272a" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="3"
                    strokeDasharray={`${Math.min(100, onTrack)} 100`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                  {onTrack}%
                </span>
              </div>
              <p className="text-[10px] text-white/50">On track</p>
            </div>

            <div className="os-card">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Lumora Action Queue</p>
              <ul className="mt-2 space-y-2">
                {queue.slice(0, 4).map((t, i) => (
                  <li key={`queue-${i}-${String(t).slice(0, 32)}`} className="flex items-start gap-2 text-[11px] text-white/65">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="os-card">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Interview Blockers</p>
              <ul className="mt-2 space-y-2">
                {blockers.length ? (
                  blockers.map((b) => (
                    <li key={b.text} className="text-[11px]">
                      <span className="text-white/35">{b.tag}: </span>
                      <span className="text-white/70">{b.text}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-[11px] text-white/45">No blockers right now</li>
                )}
              </ul>
            </div>

            <div
              className={`os-card ${compact ? 'col-span-2' : 'col-span-1 sm:col-span-2 lg:col-span-2'}`}
            >
              <p className="text-[10px] uppercase tracking-wider text-white/40">
                Weekly Interview Summary
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-white/55">{summary}</p>
              <button type="button" className="mt-3 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] hover:bg-white/5">
                Review
              </button>
            </div>

            <div className="os-card">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Calendar</p>
              <ul className="mt-2 space-y-1.5 text-[11px] text-white/60">
                {calendar.map((item) => (
                  <li key={`${item.time}-${item.label}`} className="flex gap-2">
                    <Calendar className="h-3 w-3 shrink-0 text-white/30" />
                    {item.time} {item.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="os-card">
              <p className="text-[10px] uppercase tracking-wider text-white/40">AI Task Runner</p>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-amber-300/90">
                <AlertCircle className="h-3 w-3" /> Active
              </p>
              <p className="mt-1 text-[10px] text-white/45">{aiTask}</p>
            </div>

            <div className="os-card">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Alerts</p>
              <ul className="mt-2 space-y-1.5 text-[11px]">
                {alerts.map((a) => (
                  <li key={a} className="text-white/55">
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
