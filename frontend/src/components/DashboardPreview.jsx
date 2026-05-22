import { useEffect, useState } from 'react';
import axios from 'axios';
import OSDashboard from './os/OSDashboard';

export default function DashboardPreview() {
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLive = async () => {
    try {
      const { data } = await axios.get('/api/analytics/preview');
      setLive(data);
    } catch {
      setLive({
        pulse: '0',
        onTrack: 0,
        growthText: 'Connect MongoDB for live stats',
        queue: ['Run npm run dev', 'Run npm run seed:demo'],
        blockers: [{ tag: 'Setup', text: 'Start backend to see real data' }],
        summary: 'Sign in as admin or candidate for your personal live dashboard.',
        calendar: [],
        alerts: ['API offline'],
        aiTask: 'Start the Lumora server',
        live: false,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLive();
    const id = setInterval(fetchLive, 20000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full max-w-full overflow-hidden">
      <OSDashboard compact stats={live || {}} loading={loading} />
    </div>
  );
}
