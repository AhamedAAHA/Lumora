import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AppShell from '../layouts/AppShell';
import api from '../lib/api';

export default function PinReportPage() {
  const { interviewId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/interviews/${interviewId}/report`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [interviewId]);

  const r = data?.result;
  const iv = data?.interview;
  const answers = data?.answers || [];

  return (
    <AppShell title="PIN Interview Report" subtitle={iv?.title || 'Interview results'}>
      <Link to="/admin" className="mb-5 inline-flex items-center gap-2 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to admin
      </Link>
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>
      )}
      {r && (
        <div className="space-y-5">
          <div className="os-card p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Overall</p>
            <p className="mt-2 text-5xl font-semibold">{r.overallScore ?? 0}%</p>
            <p className="mt-2 text-white/60 capitalize">{r.recommendation}</p>
            {data?.candidate && (
              <p className="mt-3 text-sm text-white/45">
                {data.candidate.name} · {data.candidate.email}
              </p>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="os-card p-4">Technical: {r.technicalScore}%</div>
            <div className="os-card p-4">Communication: {r.communicationScore}%</div>
            <div className="os-card p-4">Confidence: {r.confidenceScore}%</div>
          </div>

          <div className="os-card p-5">
            <h3 className="font-semibold text-white">Candidate answers ({answers.length})</h3>
            <p className="mt-1 text-sm text-white/45">
              Stored for admin review — includes introduction, AI, and follow-up questions.
            </p>
            {answers.length === 0 ? (
              <p className="mt-4 text-sm text-white/40">No answers recorded yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {answers.map((a, idx) => (
                  <li
                    key={a._id || `${a.questionId}-${idx}`}
                    className="rounded-xl border border-white/10 bg-black/25 p-4"
                  >
                    <p className="text-xs uppercase tracking-wide text-indigo-300/80">
                      Q{idx + 1} · {a.questionType}
                    </p>
                    <p className="mt-2 text-sm font-medium text-white/85">{a.questionText}</p>
                    <p className="mt-2 text-sm text-white/60">
                      <span className="text-white/40">Answer: </span>
                      {a.candidateAnswer}
                    </p>
                    {a.aiScore != null && (
                      <p className="mt-2 text-xs text-white/45">
                        AI score: {a.aiScore}/10
                        {a.aiFeedback ? ` — ${a.aiFeedback}` : ''}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {r.careerCoach && (
            <div className="os-card p-5">
              <h3 className="font-semibold">Career Coach</h3>
              <p className="mt-2 text-sm text-white/65">{r.careerCoach}</p>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
