import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Sparkles } from 'lucide-react';
import PinShell from '../../layouts/PinShell';
import pinApi, { getPinToken, routeByPinStatus } from '../../lib/pinApi';

export default function PinCvUpload() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState('');
  const [ready, setReady] = useState(false);
  const [interviewTitle, setInterviewTitle] = useState('');
  const [language, setLanguage] = useState('en');
  const [personality, setPersonality] = useState('friendly_hr');

  useEffect(() => {
    if (!getPinToken()) {
      navigate('/pin', { replace: true });
      return;
    }
    pinApi
      .get('/candidate/session')
      .then(({ data }) => {
        if (data.completed) {
          navigate('/pin/done', { replace: true });
          return;
        }
        if (data.interview?.title) setInterviewTitle(data.interview.title);
        if (data.candidate?.language) setLanguage(data.candidate.language);
        if (data.candidate?.personality) setPersonality(data.candidate.personality);
        if (data.candidate?.status === 'cv_uploaded') {
          setSummary(data.candidate.cvSummary || '');
          setSkills((data.candidate.extractedSkills || []).join(', '));
        }
        if (data.candidate?.status === 'interview_started' && data.candidate?.cvFileUrl) {
          navigate('/pin/interview', { replace: true });
          return;
        }
        if (data.aiQuestionsReady) setReady(true);
      })
      .catch(() => navigate('/pin', { replace: true }));
  }, [navigate]);

  const savePrefs = async () => {
    try {
      await pinApi.post('/candidate/configure', { language, personality });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    }
  };

  const upload = async (file) => {
    if (!file) return setError('Select a CV file (PDF, DOC, DOCX)');
    setBusy('upload');
    setError('');
    try {
      await savePrefs();
      const fd = new FormData();
      fd.append('cv', file);
      const { data } = await pinApi.post('/candidate/upload-cv', fd);
      sessionStorage.setItem('lumora_candidate_status', data.candidate.status);
      setSummary(data.cvSummary || 'Profile extracted.');
      setSkills((data.extracted?.skills || []).join(', ') || '—');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy('');
    }
  };

  const generateQuestions = async () => {
    setBusy('gen');
    try {
      const { data } = await pinApi.post('/candidate/generate-cv-questions');
      sessionStorage.setItem('lumora_candidate_status', 'cv_uploaded');
      setReady(true);
      setError('');
      if (data.count) setSummary((s) => `${s}\n\n${data.count} AI questions ready.`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy('');
    }
  };

  const startInterview = async () => {
    setBusy('start');
    try {
      await pinApi.post('/candidate/start-interview');
      sessionStorage.setItem('lumora_candidate_status', 'interview_started');
      navigate('/pin/interview', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <PinShell title="Upload your CV" subtitle={interviewTitle || 'Personalized questions from your resume'}>
      {error && (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="os-panel space-y-4 p-5">
          <h3 className="font-semibold">Preferences</h3>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mono-select h-11 w-full"
          >
            <option value="en">English</option>
            <option value="ta">Tamil</option>
            <option value="si">Sinhala</option>
          </select>
          <select
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            className="mono-select h-11 w-full"
          >
            <option value="friendly_hr">Friendly HR</option>
            <option value="strict_corporate">Strict Corporate</option>
            <option value="senior_engineer">Senior Engineer</option>
            <option value="startup_founder">Startup Founder</option>
            <option value="technical_lead">Technical Lead</option>
          </select>
        </div>

        <div className="os-panel space-y-4 p-5">
          <h3 className="font-semibold">Resume</h3>
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-4 py-8">
            <Upload className="h-8 w-8 text-white/40" />
            <span className="text-sm text-white/50">PDF, DOC, DOCX — max 5MB</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
          {busy === 'upload' && <p className="text-sm text-white/50">Analyzing CV...</p>}
          {summary && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/70">
              <p>{summary}</p>
              {skills && <p className="mt-2 text-white/50">Skills: {skills}</p>}
            </div>
          )}
          <button
            type="button"
            onClick={generateQuestions}
            disabled={!summary || busy === 'gen'}
            className="btn-secondary inline-flex w-full items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {busy === 'gen' ? 'Generating...' : 'Generate AI questions'}
          </button>
          {summary && !ready && (
            <p className="text-sm text-amber-200/90">
              Upload complete. Click <strong>Generate AI questions</strong> before starting.
            </p>
          )}
          {ready && (
            <button
              type="button"
              onClick={startInterview}
              disabled={busy === 'start'}
              className="btn-primary w-full"
            >
              {busy === 'start' ? 'Starting...' : 'Start interview →'}
            </button>
          )}
        </div>
      </div>
    </PinShell>
  );
}
