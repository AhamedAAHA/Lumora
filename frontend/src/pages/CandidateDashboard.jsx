import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, Download, FileUp, Play, Trophy } from 'lucide-react';
import jsPDF from 'jspdf';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import AppShell from '../layouts/AppShell';
import OSDashboard from '../components/os/OSDashboard';

export default function CandidateDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assigned, setAssigned] = useState([]);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [uploading, setUploading] = useState('');
  const [liveDash, setLiveDash] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  const load = async () => {
    try {
      setLoadError('');
      const [assignedRes, historyRes, liveRes] = await Promise.all([
        api.get('/interviews/assigned'),
        api.get('/interviews/history'),
        api.get('/analytics/live'),
      ]);
      setAssigned(assignedRes.data);
      setHistory(historyRes.data);
      setLiveDash(liveRes.data);
    } catch (err) {
      setLoadError(err.response?.data?.message || err.message);
    }
  };

  const refreshLive = async () => {
    setDashLoading(true);
    try {
      const { data } = await api.get('/analytics/live');
      setLiveDash(data);
    } catch {
      // Live dashboard refresh is best-effort.
    } finally {
      setDashLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(refreshLive, 15000);
    return () => clearInterval(id);
  }, []);

  const uploadResume = async (sessionId, file) => {
    if (!file) return;
    setUploading(sessionId);
    setMessage('');
    try {
      const form = new FormData();
      form.append('resume', file, file.name);
      const parsed = await api.post('/resume/parse', form);
      await api.patch(`/interviews/${sessionId}/resume`, { resumeData: parsed.data });
      setMessage(
        'Resume uploaded and analyzed. Attend when ready — introduction first, then questions from your CV.'
      );
      await load();
    } catch (err) {
      setLoadError(err.response?.data?.message || err.message);
    } finally {
      setUploading('');
    }
  };

  const downloadReport = async (reportId) => {
    try {
    const { data } = await api.get(`/reports/${reportId}`);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Lumora OS - Interview Report', 14, 20);
    doc.setFontSize(10);
    let y = 32;
    [
      `Candidate: ${user?.name}`,
      `Score: ${data.overallScore}%`,
      `Recommendation: ${data.recommendation}`,
      data.summary,
    ].forEach((line) => {
      doc.text(String(line || ''), 14, y);
      y += 8;
    });
    doc.save(`lumora-report-${reportId}.pdf`);
    } catch (err) {
      setLoadError(err.response?.data?.message || err.message);
    }
  };

  return (
    <AppShell title={`Welcome, ${user?.name}`} subtitle="Attend assigned interviews and review your own reports.">
      {(loadError || message) && (
        <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
          {loadError || message}
        </p>
      )}

      <div className="w-full max-w-full">
        <OSDashboard stats={liveDash || {}} loading={dashLoading} />
      </div>

      <section id="assigned" className="mt-8">
        <SectionTitle icon={CalendarClock} title="Assigned Interviews" />
        <div className="grid gap-4 lg:grid-cols-2">
          {assigned.map((session) => (
            <article key={session._id} className="os-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold capitalize text-white">
                    {formatLabel(session.round)} round
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    {session.totalQuestions} questions - {formatLabel(session.personality)}
                  </p>
                </div>
                <span
                  className={`pill-tag ${session.hasResume ? 'text-emerald-200' : 'text-amber-200/90'}`}
                >
                  {session.hasResume ? 'Resume added' : 'Resume required'}
                </span>
              </div>

              <p className="mt-4 line-clamp-2 text-sm leading-6 text-white/60">
                {session.previewQuestion ||
                  session.introQuestion ||
                  (session.hasResume
                    ? session.currentQuestion
                    : 'Upload your resume (PDF) to unlock this interview.')}
              </p>
              {session.hasResume && (
                <p className="mt-2 text-xs text-white/40">
                  Step 1: Introduction (admin question) · Step 2+: AI questions from your resume
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <label
                  className={`btn-secondary inline-flex cursor-pointer items-center gap-2 ${session.hasResume ? 'opacity-70' : ''}`}
                >
                  <FileUp className="h-4 w-4" />
                  {uploading === session._id
                    ? 'Uploading...'
                    : session.hasResume
                      ? 'Replace resume'
                      : 'Upload resume (required)'}
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="sr-only"
                    disabled={uploading === session._id}
                    onChange={(event) => uploadResume(session._id, event.target.files?.[0])}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => navigate(`/interview/${session._id}`)}
                  disabled={!session.canAttend && !session.hasResume}
                  className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
                  title={
                    session.hasResume
                      ? 'Start with the introduction question'
                      : 'Upload your resume (PDF) before attending'
                  }
                >
                  <Play className="h-4 w-4" />{' '}
                  {session.hasResume ? 'Attend interview' : 'Upload resume to attend'}
                </button>
              </div>
            </article>
          ))}
        </div>
        {assigned.length === 0 && (
          <EmptyState text="No interviews have been published to your account yet." />
        )}
      </section>

      <section id="history" className="mt-8 w-full">
        <SectionTitle icon={Trophy} title="Scores and Reports" />
        <div className="os-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-white/45">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Round</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item._id} className="border-t border-white/[0.06]">
                    <td className="px-4 py-3">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 capitalize">{formatLabel(item.round)}</td>
                    <td className="px-4 py-3">{item.overallScore ?? '-'}%</td>
                    <td className="px-4 py-3">
                      <span className="pill-tag capitalize">
                        {formatLabel(item.recommendation || item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.reportId && (
                        <div className="flex justify-end gap-3">
                          <Link to={`/reports/${item.reportId}`} className="text-white/70 hover:text-white">
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => downloadReport(item.reportId)}
                            className="inline-flex items-center gap-1 text-white/70 hover:text-white"
                          >
                            <Download className="h-3 w-3" /> PDF
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length === 0 && !loadError && (
              <EmptyState text="Your completed interview scores will appear here." />
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-white">
      <Icon className="h-5 w-5 text-white/60" />
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/45">
      {text}
    </p>
  );
}

function formatLabel(value) {
  return String(value || '').replace(/_/g, ' ');
}
