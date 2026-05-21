import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, BookOpen, TrendingUp } from 'lucide-react';
import AppShell from '../layouts/AppShell';
import api from '../lib/api';

export default function ReportPage() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      api
        .get(`/reports/${reportId}`)
        .then((res) => setReport(res.data))
        .catch((err) => setError(err.response?.data?.message || err.message));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reportId]);

  return (
    <AppShell title="Interview Report" subtitle="Your score, feedback, and career guidance.">
      <Link to="/dashboard#history" className="mb-5 inline-flex items-center gap-2 text-sm text-white/55 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to reports
      </Link>

      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
      {!report && !error && (
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {report && (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <section className="os-card p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Overall Score</p>
            <p className="mt-3 text-6xl font-semibold text-white">{report.overallScore ?? 0}%</p>
            <span className="pill-tag mt-4 capitalize">{formatLabel(report.recommendation)}</span>
            <div className="mt-6 space-y-3">
              <Score label="Technical" value={report.technicalScore} />
              <Score label="Communication" value={report.communicationScore} />
              <Score label="Confidence" value={report.confidenceScore} />
            </div>
          </section>

          <section className="space-y-5">
            <Panel icon={BadgeCheck} title="Feedback">
              <p className="text-sm leading-6 text-white/65">{report.summary || report.aiComments || 'No written feedback yet.'}</p>
            </Panel>
            <div className="grid gap-5 md:grid-cols-2">
              <Panel icon={TrendingUp} title="Strengths">
                <List items={report.strengths} fallback="Strengths will appear after evaluation." />
              </Panel>
              <Panel icon={BookOpen} title="Focus Areas">
                <List items={report.weaknesses} fallback="Improvement areas will appear after evaluation." />
              </Panel>
            </div>
            <Panel icon={BookOpen} title="Career Coach">
              <p className="text-sm leading-6 text-white/65">{report.careerCoach || report.aiComments}</p>
              <List items={report.learningRoadmap} fallback="No roadmap yet." />
              {report.suggestedCareerPath && (
                <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/60">
                  Suggested path: {report.suggestedCareerPath}
                </p>
              )}
            </Panel>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function Panel({ icon: Icon, title, children }) {
  return (
    <div className="os-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-white/55" />
        <h2 className="font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Score({ label, value = 0 }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-white/45">
        <span>{label}</span>
        <span>{value ?? 0}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-white" style={{ width: `${value ?? 0}%` }} />
      </div>
    </div>
  );
}

function List({ items = [], fallback }) {
  if (!items.length) return <p className="text-sm text-white/45">{fallback}</p>;
  return (
    <ul className="space-y-2 text-sm text-white/65">
      {items.map((item) => (
        <li key={item} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          {item}
        </li>
      ))}
    </ul>
  );
}

function formatLabel(value) {
  return String(value || 'pending').replace(/_/g, ' ');
}
