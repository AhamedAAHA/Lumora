import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import AppShell from '../layouts/AppShell';
import OSDashboard from '../components/os/OSDashboard';
import { Play, Download } from 'lucide-react';
import jsPDF from 'jspdf';

export default function CandidateDashboard() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/interviews/history'),
      api.get('/analytics/candidate'),
    ])
      .then(([h, a]) => {
        setHistory(h.data);
        setAnalytics(a.data);
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  const downloadReport = async (reportId) => {
    const { data } = await api.get(`/reports/${reportId}`);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Lumora OS — Interview Report', 14, 20);
    doc.setFontSize(10);
    let y = 32;
    [
      `Candidate: ${user?.name}`,
      `Score: ${data.overallScore}%`,
      `Recommendation: ${data.recommendation}`,
      data.summary,
    ].forEach((line) => {
      doc.text(String(line), 14, y);
      y += 8;
    });
    doc.save(`lumora-report-${reportId}.pdf`);
  };

  const stats = {
    pulse: String(history.length || analytics?.avgScore || 0),
    pulseUnit: history.length ? '' : '%',
    onTrack: analytics?.avgScore ?? 68,
    queue: [
      'Review latest interview feedback',
      ...(history[0]
        ? [`Follow up: ${history[0].round} round — ${history[0].recommendation || 'pending'}`]
        : ['Start your first AI interview']),
    ],
    blockers: (analytics?.weakAreas || []).slice(0, 2).map((w) => ({
      tag: 'Focus',
      text: w,
    })),
  };

  return (
    <AppShell
      title={`Welcome, ${user?.name}`}
      subtitle="Your interview command center"
      actions={
        <Link to="/interview/setup" className="btn-primary inline-flex items-center gap-2 text-sm">
          <Play className="h-4 w-4" /> New Interview
        </Link>
      }
    >
      {loadError && (
        <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {loadError}
        </p>
      )}

      <div className="w-full max-w-full">
        <OSDashboard stats={stats} />
      </div>

      <section id="history" className="mt-8 w-full">
        <div className="os-card overflow-hidden p-0">
          <div className="border-b border-white/[0.06] px-4 py-3 font-semibold">
            Interview History
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-white/45">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Round</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h._id} className="border-t border-white/[0.06]">
                    <td className="px-4 py-3">{new Date(h.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 capitalize">{h.round}</td>
                    <td className="px-4 py-3">{h.overallScore ?? '—'}%</td>
                    <td className="px-4 py-3">
                      <span className="pill-tag capitalize">
                        {h.recommendation?.replace('_', ' ') || h.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {h.reportId && (
                        <button
                          type="button"
                          onClick={() => downloadReport(h.reportId)}
                          className="inline-flex items-center gap-1 text-white/70 hover:text-white"
                        >
                          <Download className="h-3 w-3" /> Report
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length === 0 && !loadError && (
              <p className="px-4 py-10 text-center text-white/40">
                No interviews yet.{' '}
                <Link to="/interview/setup" className="text-white underline">
                  Start one
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
