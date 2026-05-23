import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Award, CheckCircle2, Sparkles } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import ReportAnalytics from '../../components/interview/ReportAnalytics';
import pinApi, { clearPinAuth, getPinToken } from '../../lib/pinApi';
import { langFontClass, LANG_LABELS } from '../../lib/langUtils';

function ScoreRing({ label, value, color }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-center">
      <p className="text-[10px] uppercase tracking-wide text-white/45">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value ?? 0}%</p>
    </div>
  );
}

export default function PinReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(location.state?.reviewData || null);
  const [loading, setLoading] = useState(!location.state?.reviewData);
  const [error, setError] = useState('');

  const loadReview = useCallback(async () => {
    if (!getPinToken()) {
      navigate('/pin', { replace: true });
      return;
    }
    setLoading(true);
    try {
      const { data: review } = await pinApi.get('/candidate/review');
      setData(review);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!location.state?.reviewData) loadReview();
  }, [loadReview, location.state?.reviewData]);

  const result = data?.result;
  const answers = data?.answers || [];
  const lang = data?.candidate?.language || data?.interview?.language || 'en';
  const font = langFontClass(lang);

  const finish = () => {
    clearPinAuth();
    navigate('/', { replace: true });
  };

  if (loading && !data) {
    return (
      <AuthLayout title="Loading results…" showCta={false}>
        <div className="flex justify-center py-12">
          <div className="loading-spinner" />
        </div>
      </AuthLayout>
    );
  }

  if (error && !data) {
    return (
      <AuthLayout title="Results unavailable" showCta={false}>
        <p className="text-sm text-red-300">{error}</p>
        <Link to="/pin" className="btn-primary mt-6 inline-block">
          Back to PIN
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Your interview results"
      subtitle={data?.interview?.title || 'AI evaluation summary'}
      showCta={false}
    >
      <div className="slide-up mt-2 space-y-5">
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          <p className="mt-3 text-sm text-white/55">
            Interview complete · {LANG_LABELS[lang] || 'English'}
          </p>
        </div>

        {result ? (
          <div className="glass-card glow-border p-6 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Overall score</p>
            <p className="mt-2 text-5xl font-semibold text-cyan-100">{result.overallScore ?? 0}%</p>
            <span className="pill-tag mt-3 inline-block capitalize">{result.recommendation}</span>
          </div>
        ) : (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Final scores are being generated. Refresh in a moment.
          </p>
        )}

        {result && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <ScoreRing label="Technical" value={result.technicalScore} color="text-cyan-300" />
            <ScoreRing label="Communication" value={result.communicationScore} color="text-emerald-400" />
            <ScoreRing label="Confidence" value={result.confidenceScore} color="text-indigo-300" />
            <ScoreRing label="Speaking" value={result.speakingScore} color="text-violet-400" />
          </div>
        )}

        <ReportAnalytics
          liveMetrics={data?.liveMetrics}
          metricsHistory={data?.metricsHistory}
          result={result}
          partial={data?.partial}
        />

        {result?.strengths?.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="flex items-center gap-2 font-semibold text-emerald-300">
              <Award className="h-4 w-4" /> Strengths
            </h3>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-white/70">
              {result.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {result?.weaknesses?.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="font-semibold text-amber-200/90">Areas to improve</h3>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-white/70">
              {result.weaknesses.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {result?.finalFeedback && (
          <div className={`glass-card p-5 ${font}`}>
            <h3 className="font-semibold">Final feedback</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">{result.finalFeedback}</p>
          </div>
        )}

        {(result?.careerCoach || data?.careerCoach) && (
          <div className={`glass-card p-5 ${font}`}>
            <h3 className="flex items-center gap-2 font-semibold text-indigo-200">
              <Sparkles className="h-4 w-4" /> Career coach
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              {result?.careerCoach || data?.careerCoach}
            </p>
          </div>
        )}

        {answers.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="font-semibold">Your answers ({answers.length})</h3>
            <ul className="mt-4 space-y-3">
              {answers.map((a, idx) => (
                <li key={a._id || idx} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-cyan-300/70">
                    Q{idx + 1} · {a.questionType}
                    {a.aiScore != null ? ` · Score ${a.aiScore}/10` : ''}
                  </p>
                  <p className={`mt-1 text-sm font-medium text-white/85 ${font}`}>{a.questionText}</p>
                  <p className={`mt-2 text-sm text-white/60 ${font}`}>{a.candidateAnswer}</p>
                  {a.metrics && (
                    <p className="mt-2 text-[11px] text-white/40">
                      Live: {a.metrics.confidence}% conf · {a.metrics.wpm || '—'} WPM · {a.metrics.fillers ?? 0}{' '}
                      fillers · {a.metrics.responseTimeMs ? `${Math.round(a.metrics.responseTimeMs / 1000)}s` : '—'}{' '}
                      response
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button type="button" onClick={finish} className="btn-primary btn-3d w-full !rounded-xl">
          Done — exit interview
        </button>
      </div>
    </AuthLayout>
  );
}
