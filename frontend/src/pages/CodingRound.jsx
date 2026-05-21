import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import api from '../lib/api';
import { Play, CheckCircle } from 'lucide-react';

const DEFAULT_CODE = `// Write your solution
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) return [map.get(complement), i];
    map.set(nums[i], i);
  }
  return [];
}
`;

export default function CodingRound() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);

  const runCode = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/interviews/${sessionId}/coding/run`, { code });
      setOutput(data.output || data.error || 'No output');
    } catch (err) {
      setOutput(err.response?.data?.message || 'Execution failed');
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/interviews/${sessionId}/coding/evaluate`, { code });
      setEvaluation(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Evaluation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-lumora-black p-4 md:p-8">
      <Link to={`/interview/${sessionId}`} className="text-sm text-white/50">
        ← Back to interview
      </Link>
      <h1 className="mt-4 text-2xl font-bold">AI Technical Coding Round</h1>
      <p className="mt-2 text-white/55">
        Given an array of integers, return indices of the two numbers such that they add up to a
        specific target.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="glass-card overflow-hidden rounded-xl">
          <Editor
            height="400px"
            defaultLanguage="javascript"
            theme="vs-dark"
            value={code}
            onChange={(v) => setCode(v || '')}
            options={{ fontSize: 14, minimap: { enabled: false } }}
          />
        </div>
        <div className="space-y-4">
          <div className="flex gap-3">
            <button type="button" onClick={runCode} disabled={loading} className="btn-secondary inline-flex gap-2">
              <Play className="h-4 w-4" /> Run
            </button>
            <button type="button" onClick={submitCode} disabled={loading} className="btn-primary inline-flex gap-2">
              <CheckCircle className="h-4 w-4" /> AI Evaluate
            </button>
          </div>
          <pre className="glass-card min-h-[200px] overflow-auto p-4 text-sm text-emerald-300/90">
            {output || 'Output will appear here...'}
          </pre>
          {evaluation && (
            <div className="glass-card p-4 text-sm">
              <p>
                Score: <span className="font-bold text-indigo-300">{evaluation.score}/100</span>
              </p>
              <p className="mt-2 text-white/60">{evaluation.feedback}</p>
              <p className="mt-2 text-white/50">Quality: {evaluation.quality}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
