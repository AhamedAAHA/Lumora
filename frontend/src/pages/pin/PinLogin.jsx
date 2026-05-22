import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import pinApi, { getPinToken, routeByPinStatus, setPinAuth } from '../../lib/pinApi';

export default function PinLogin() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getPinToken();
    if (token) {
      pinApi.get('/candidate/session').then(({ data }) => routeByPinStatus(data.candidate, navigate)).catch(() => navigate('/pin/cv'));
    }
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await pinApi.post('/candidate/verify-pin', { pinCode: pin });
      setPinAuth(data);
      routeByPinStatus(data.candidate, navigate);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Candidate interview" subtitle="Enter the 6-digit PIN from your recruiter">
      {error && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm text-white/70">
          Interview PIN
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-white outline-none focus:border-white/30"
            placeholder="000000"
            required
          />
        </label>
        <p className="text-center text-xs text-white/40">{pin.length} / 6 digits</p>
        <button type="submit" disabled={loading || pin.length !== 6} className="btn-primary w-full !rounded-xl">
          {loading ? 'Verifying...' : 'Start interview'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-white/45">
        Admin? <Link to="/login" className="text-white underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
