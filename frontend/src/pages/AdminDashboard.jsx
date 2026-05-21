import { useEffect, useState } from 'react';
import api from '../lib/api';
import AppShell from '../layouts/AppShell';
import OSDashboard from '../components/os/OSDashboard';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#a1a1aa', '#34d399', '#818cf8', '#f87171'];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/analytics/admin')
      .then((r) => setStats(r.data))
      .catch((err) => setError(err.message));
  }, []);

  const osStats = {
    pulse: String(stats?.totalInterviews ?? 0),
    pulseUnit: '',
    onTrack: stats?.successRate ?? 0,
    queue: [
      `${stats?.totalCandidates ?? 0} candidates in system`,
      `Success rate: ${stats?.successRate ?? 0}%`,
      'Review failed questions',
    ],
    blockers: (stats?.mostFailedQuestions || []).slice(0, 2).map((q) => ({
      tag: 'Question',
      text: q.question?.slice(0, 40) + '…',
    })),
  };

  return (
    <AppShell title="Admin Analytics" subtitle="Recruiter command center">
      {error && (
        <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </p>
      )}

      <OSDashboard stats={osStats} />

      {stats && (
        <div className="mt-8 grid w-full gap-6 lg:grid-cols-2">
          <div className="os-card min-h-[280px]">
            <h3 className="mb-4 font-semibold">Recommendations</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.recommendationBreakdown || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                >
                  {(stats.recommendationBreakdown || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#141416', border: '1px solid #333' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="os-card min-h-[280px]">
            <h3 className="mb-4 font-semibold">Top candidates</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.topCandidates || []}>
                <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#888' }} />
                <Tooltip contentStyle={{ background: '#141416', border: '1px solid #333' }} />
                <Bar dataKey="score" fill="#fff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </AppShell>
  );
}
