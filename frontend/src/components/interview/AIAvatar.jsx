const colors = {
  friendly_hr: 'from-emerald-500 to-teal-600',
  strict_corporate: 'from-slate-500 to-zinc-700',
  senior_engineer: 'from-blue-500 to-indigo-600',
  startup_founder: 'from-orange-500 to-rose-600',
  technical_lead: 'from-violet-500 to-purple-700',
};

export default function AIAvatar({ speaking = false, personality = 'friendly_hr' }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br ${
          colors[personality] || colors.friendly_hr
        } ${speaking ? 'avatar-speaking' : ''}`}
      >
        <div className="absolute inset-2 rounded-full bg-lumora-black/50" />
        <div className="relative flex items-end gap-1 h-6">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`avatar-bar w-1.5 rounded-full bg-white/90 ${speaking ? '' : 'h-3'}`}
            />
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-white/50">AI Interviewer</p>
    </div>
  );
}
