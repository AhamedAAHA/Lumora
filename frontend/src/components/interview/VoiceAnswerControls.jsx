import { memo } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';

function VoiceAnswerControls({
  answer,
  onAnswerChange,
  onSubmit,
  onListen,
  listening,
  recording = false,
  voiceError,
  submitting,
  submitLabel = 'Submit answer',
  extraActions,
}) {
  return (
    <div className="glass-card p-6">
      <label className="text-sm text-white/50">
        Your answer {listening ? <span className="text-cyan-400">(listening…)</span> : '(type or voice)'}
      </label>
      <textarea
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        rows={5}
        disabled={submitting}
        className={`mt-2 w-full resize-none rounded-xl border bg-black/40 p-4 outline-none focus:border-cyan-500/50 disabled:opacity-60 ${
          listening ? 'border-cyan-500/40 ring-1 ring-cyan-500/20' : 'border-white/10'
        }`}
        placeholder={
          recording
            ? 'Recording… speak now, then click Stop listening'
            : 'Click Voice input and speak (pauses auto-stop in Chrome) — or type here'
        }
      />
      {voiceError && <p className="mt-3 text-sm text-amber-200">{voiceError}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onListen}
          disabled={submitting}
          className={`btn-secondary inline-flex items-center gap-2 ${listening ? 'ring-2 ring-indigo-500' : ''}`}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {recording ? 'Stop recording' : listening ? 'Stop listening' : 'Voice input'}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !answer.trim()}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Submitting…' : submitLabel}
        </button>
        {extraActions}
      </div>
    </div>
  );
}

export default memo(VoiceAnswerControls);
