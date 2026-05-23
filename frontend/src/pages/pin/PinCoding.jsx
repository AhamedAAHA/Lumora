import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PinShell from '../../layouts/PinShell';
import pinApi, { getPinToken } from '../../lib/pinApi';

export default function PinCoding() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const finalize = params.get('finalize') === '1';
  const [code, setCode] = useState('function reverseString(s) {\n  return s.split("").reverse().join("");\n}');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!getPinToken()) {
    navigate('/pin', { replace: true });
    return null;
  }

  const evaluate = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await pinApi.post('/candidate/coding/evaluate', { code });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    try {
      const { data } = await pinApi.post('/candidate/complete-interview');
      sessionStorage.setItem('lumora_candidate_status', 'completed');
      navigate('/pin/review', {
        replace: true,
        state: {
          reviewData: {
            completed: true,
            result: data.result,
            careerCoach: data.careerCoach,
            liveMetrics: data.liveMetrics,
            metricsHistory: data.metricsHistory,
            answers: data.answers,
          },
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PinShell title="Coding round" subtitle="Optional technical assessment">
      {error && (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="os-panel p-5">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={14}
          className="w-full rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-sm text-cyan-100 outline-none"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={evaluate} disabled={busy} className="btn-secondary">
            {busy ? 'Evaluating...' : 'Submit for AI review'}
          </button>
          {(finalize || result) && (
            <button type="button" onClick={finish} disabled={busy} className="btn-primary">
              Finish interview
            </button>
          )}
          <button type="button" onClick={() => navigate('/pin/interview')} className="btn-ghost text-sm">
            Back to interview
          </button>
        </div>
        {result && (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-lg font-semibold text-indigo-300">Score: {result.score}/10</p>
            <p className="mt-2 text-sm text-white/60">{result.feedback}</p>
          </div>
        )}
      </div>
    </PinShell>
  );
}
