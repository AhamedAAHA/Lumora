import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import AppShell from '../layouts/AppShell';
import ReportAnalytics from '../components/interview/ReportAnalytics';
import api from '../lib/api';
import { langFontClass, LANG_LABELS } from '../lib/langUtils';

function AnswerBlock({ answer, lang }) {
  const font = langFontClass(answer.answerLanguage || lang);
  const showTranslation =
    answer.answerLanguage && answer.answerLanguage !== 'en' && answer.answerEnglish;
  const m = answer.metrics;

  return (
    <li className="rounded-xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-wide text-cyan-300/80">
        Q · {answer.questionType}
        {answer.answerLanguage ? ` · ${LANG_LABELS[answer.answerLanguage] || answer.answerLanguage}` : ''}
      </p>
      <p className={`mt-2 text-sm font-medium text-white/85 ${font}`}>{answer.questionText}</p>
      <p className={`mt-2 text-sm text-white/70 ${font}`}>
        <span className="text-white/40">Answer: </span>
        {answer.candidateAnswer}
      </p>
      {showTranslation && (
        <p className="mt-2 text-sm text-white/55">
          <span className="text-white/35">English: </span>
          {answer.answerEnglish}
        </p>
      )}
      {m && (
        <p className="mt-2 text-[11px] text-cyan-200/70">
          Live metrics: {m.confidence}% confidence · {m.communication}% communication · {m.wpm || '—'} WPM ·{' '}
          {m.fillers ?? 0} fillers
          {m.responseTimeMs ? ` · ${Math.round(m.responseTimeMs / 1000)}s response` : ''}
        </p>
      )}
      {answer.aiScore != null && (
        <p className={`mt-2 text-xs text-white/45 ${font}`}>
          AI score: {answer.aiScore}/10
          {answer.aiFeedback ? ` — ${answer.aiFeedback}` : ''}
        </p>
      )}
      {answer.aiFeedbackEnglish && answer.answerLanguage !== 'en' && (
        <p className="mt-1 text-xs text-white/40">
          <span className="text-white/30">Feedback (EN): </span>
          {answer.aiFeedbackEnglish}
        </p>
      )}
    </li>
  );
}

export default function PinReportPage() {
  const { interviewId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadReport = useCallback(async () => {
    try {
      const res = await api.get(`/interviews/${interviewId}/report`);
      setData(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }, [interviewId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (!data?.partial) return undefined;
    const timer = window.setInterval(loadReport, 5000);
    return () => window.clearInterval(timer);
  }, [data?.partial, loadReport]);

  const manualRefresh = async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  };

  const r = data?.result;
  const iv = data?.interview;
  const answers = data?.answers || [];
  const reportLang = data?.candidate?.language || iv?.language || 'en';

  return (
    <AppShell title="Interview Report" subtitle={iv?.title || 'PIN interview results'}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>
        {data?.partial && (
          <button
            type="button"
            onClick={manualRefresh}
            disabled={refreshing}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh live
          </button>
        )}
      </div>

      {error && !data && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>
      )}

      {data?.partial && !r && (
        <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Interview in progress — live analytics refresh every 5 seconds. Full AI scores appear after completion.
        </p>
      )}

      {(r || answers.length > 0 || data?.metricsHistory?.length > 0) && (
        <div className="page-fade space-y-5">
          <ReportAnalytics
            liveMetrics={data?.liveMetrics}
            metricsHistory={data?.metricsHistory}
            result={r}
            partial={data?.partial}
          />

          {r && (
            <div className="os-card card-3d p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">Overall</p>
              <p className="mt-2 text-5xl font-semibold text-cyan-100">{r.overallScore ?? 0}%</p>
              <p className="mt-2 capitalize text-white/60">{r.recommendation}</p>
              {data?.candidate && (
                <p className="mt-3 text-sm text-white/45">
                  {data.candidate.name} · {data.candidate.email}
                  {reportLang !== 'en' ? ` · ${LANG_LABELS[reportLang]}` : ''}
                </p>
              )}
            </div>
          )}

          {r && (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="os-card p-4">Technical: {r.technicalScore}%</div>
              <div className="os-card p-4">Communication: {r.communicationScore}%</div>
              <div className="os-card p-4">Confidence: {r.confidenceScore}%</div>
              <div className="os-card p-4">Speaking: {r.speakingScore}%</div>
            </div>
          )}

          {r?.strengths?.length > 0 && (
            <div className="os-card p-5">
              <h3 className="font-semibold text-emerald-300">Strengths</h3>
              <ul className="mt-2 list-inside list-disc text-sm text-white/65">
                {r.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {r?.weaknesses?.length > 0 && (
            <div className="os-card p-5">
              <h3 className="font-semibold text-amber-200/90">Weaknesses</h3>
              <ul className="mt-2 list-inside list-disc text-sm text-white/65">
                {r.weaknesses.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {r?.codingScore != null && (
            <div className="os-card p-5">
              <h3 className="font-semibold text-white">Coding review</h3>
              <p className="mt-2 text-sm text-white/65">Score: {r.codingScore}/100</p>
              {r.codingFeedback && <p className="mt-2 text-sm text-white/60">{r.codingFeedback}</p>}
            </div>
          )}

          <div className="os-card p-5">
            <h3 className="font-semibold text-white">Candidate answers ({answers.length})</h3>
            <p className="mt-1 text-sm text-white/45">
              Includes per-answer live metrics captured during the interview.
            </p>
            {answers.length === 0 ? (
              <p className="mt-4 text-sm text-white/40">No answers recorded yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {answers.map((a, idx) => (
                  <AnswerBlock key={a._id || `${a.questionId}-${idx}`} answer={a} lang={reportLang} />
                ))}
              </ul>
            )}
          </div>

          {r?.finalFeedback && (
            <div className={`os-card p-5 ${langFontClass(reportLang)}`}>
              <h3 className="font-semibold">Final feedback</h3>
              <p className="mt-2 text-sm text-white/65">{r.finalFeedback}</p>
            </div>
          )}

          {r?.careerCoach && (
            <div className={`os-card p-5 ${langFontClass(reportLang)}`}>
              <h3 className="font-semibold">Career Coach</h3>
              <p className="mt-2 text-sm text-white/65">{r.careerCoach}</p>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
