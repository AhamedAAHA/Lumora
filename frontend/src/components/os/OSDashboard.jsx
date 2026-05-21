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
  Mic,
  ArrowRight,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

const defaultQueue = [
  'Draft interview feedback for candidate #2841',
  'Summarize technical round — React state question',
  'Schedule follow-up HR call',
];

const defaultBlockers = [
  { tag: 'Technical', text: 'Low score on system design' },
  { tag: 'HR', text: 'Communication needs improvement' },
];

export default function OSDashboard({
  compact = false,
  stats = {},
  onPromptSubmit,
}) {
  const pulse = stats.pulse ?? '128';
  const pulseUnit = stats.pulseUnit ?? 'k';
  const onTrack = stats.onTrack ?? 68;
  const queue = stats.queue ?? defaultQueue;
  const blockers = stats.blockers ?? defaultBlockers;

  return (
    <div
      className={`os-panel flex w-full flex-col overflow-hidden text-left ${
        compact ? 'max-h-[520px] text-[11px]' : 'min-h-[480px]'
      }`}
    >
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3 md:px-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-bold text-black">
            L
          </span>
          <span className="font-semibold text-white/90">Lumora OS</span>
        </div>
        <div className="hidden items-center gap-4 text-xs text-white/45 sm:flex">
          <span className="text-white/80">Product</span>
          <span>Workflows</span>
          <span>Security</span>
        </div>
        <div className="flex items-center gap-2 text-white/50">
          <Search className="h-4 w-4" />
          <Bell className="h-4 w-4" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar */}
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

        {/* Main grid */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4">
          <div
            className={`grid gap-3 ${
              compact
                ? 'grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}
          >
            {/* Today's Pulse */}
            <div className="os-card col-span-1 sm:col-span-1">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Today&apos;s Pulse</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-bold leading-none">
                  {pulse}
                  <span className="text-lg text-white/50">{pulseUnit}</span>
                </span>
                <span className="mb-1 flex items-center gap-1 text-[10px] text-emerald-400">
                  <span className="live-dot" /> Live
                </span>
              </div>
              <div className="mt-3 flex items-end gap-0.5 h-8">
                {[40, 55, 45, 70, 60, 85, 75].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-white/20"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <p className="mt-1 text-[10px] text-emerald-400/90">+17.2% vs last week</p>
            </div>

            {/* Follow-ups */}
            <div className="os-card flex flex-col items-center justify-center text-center">
              <p className="text-[10px] uppercase tracking-wider text-white/40 w-full text-left">
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
                    strokeDasharray={`${onTrack} 100`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                  {onTrack}%
                </span>
              </div>
              <p className="text-[10px] text-white/50">On track</p>
            </div>

            {/* Action Queue */}
            <div className="os-card">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Lumora Action Queue</p>
              <ul className="mt-2 space-y-2">
                {queue.slice(0, 3).map((t) => (
                  <li key={t} className="flex items-start gap-2 text-[11px] text-white/65">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Blockers */}
            <div className="os-card">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Interview Blockers</p>
              <ul className="mt-2 space-y-2">
                {blockers.map((b) => (
                  <li key={b.text} className="text-[11px]">
                    <span className="text-white/35">{b.tag}: </span>
                    <span className="text-white/70">{b.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weekly draft - wide */}
            <div
              className={`os-card ${
                compact ? 'col-span-2' : 'col-span-1 sm:col-span-2 lg:col-span-2'
              }`}
            >
              <p className="text-[10px] uppercase tracking-wider text-white/40">
                Weekly Interview Summary
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-white/55">
                Lumora pulled context from completed interviews, resume skills, and confidence
                analytics. 14 candidates processed; 6 shortlisted for technical round 2.
              </p>
              <button type="button" className="mt-3 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] hover:bg-white/5">
                Review
              </button>
            </div>

            {/* Calendar */}
            <div className="os-card">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Calendar</p>
              <ul className="mt-2 space-y-1.5 text-[11px] text-white/60">
                <li className="flex gap-2">
                  <Calendar className="h-3 w-3 shrink-0 text-white/30" />
                  10:00 Technical — Priya S.
                </li>
                <li className="flex gap-2">
                  <Calendar className="h-3 w-3 shrink-0 text-white/30" />
                  14:30 HR Final — Alex M.
                </li>
                <li className="flex gap-2">
                  <Calendar className="h-3 w-3 shrink-0 text-white/30" />
                  16:00 Coding round
                </li>
              </ul>
            </div>

            {/* Browser / AI task */}
            <div className="os-card">
              <p className="text-[10px] uppercase tracking-wider text-white/40">AI Task Runner</p>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-amber-300/90">
                <AlertCircle className="h-3 w-3" /> Awaiting approval
              </p>
              <p className="mt-1 text-[10px] text-white/45">
                Generate personalized questions from uploaded resume
              </p>
            </div>

            {/* Alerts */}
            <div className="os-card">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Alerts</p>
              <ul className="mt-2 space-y-1.5 text-[11px]">
                <li className="flex items-center gap-2 text-red-400/90">
                  <TrendingUp className="h-3 w-3" /> 3 anti-cheat flags today
                </li>
                <li className="text-white/55">2 reports ready to download</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom AI bar */}
      <form
        className="shrink-0 border-t border-white/[0.06] p-3 md:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.target.querySelector('input');
          onPromptSubmit?.(input?.value);
          if (input) input.value = '';
        }}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/40 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Sparkles className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Ask Lumora to schedule an interview or analyze a candidate..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white/80 outline-none placeholder:text-white/30"
          />
          <Mic className="h-4 w-4 shrink-0 text-white/40" />
          <button
            type="submit"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
