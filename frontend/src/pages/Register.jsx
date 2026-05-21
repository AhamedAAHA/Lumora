import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../layouts/AuthLayout';
import api from '../lib/api';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'candidate',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverOk, setServerOk] = useState(null);

  useEffect(() => {
    api
      .get('/health')
      .then(() => setServerOk(true))
      .catch(() => setServerOk(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await register(form);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Start your AI interview workspace">
      {serverOk === false && (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Backend not reachable. Run: <code className="text-xs">cd backend && npm run dev</code>
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {['name', 'email', 'password'].map((field) => (
          <label key={field} className="block text-sm capitalize text-white/70">
            {field}
            <input
              type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
              required
              minLength={field === 'password' ? 6 : undefined}
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/30"
            />
          </label>
        ))}
        <label className="block text-sm text-white/70">
          Role
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#141416] px-4 py-3 text-white"
          >
            <option value="candidate">Candidate</option>
            <option value="admin">Admin / Recruiter</option>
          </select>
        </label>
        <button type="submit" disabled={loading} className="btn-primary w-full !rounded-xl">
          {loading ? 'Creating...' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-white/45">
        Have an account?{' '}
        <Link to="/login" className="text-white underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
