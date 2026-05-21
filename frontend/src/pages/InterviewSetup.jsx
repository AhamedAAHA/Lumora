import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import AppShell from '../layouts/AppShell';
import { Upload, Globe, UserCircle } from 'lucide-react';

const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'ta', label: 'Tamil' },
  { id: 'si', label: 'Sinhala' },
];

const PERSONALITIES = [
  { id: 'friendly_hr', label: 'Friendly HR' },
  { id: 'strict_corporate', label: 'Strict Corporate' },
  { id: 'senior_engineer', label: 'Senior Software Engineer' },
  { id: 'startup_founder', label: 'Startup Founder' },
  { id: 'technical_lead', label: 'Technical Lead' },
];

const ROUNDS = [
  { id: 'hr', label: 'HR Round' },
  { id: 'aptitude', label: 'Aptitude Round' },
  { id: 'technical', label: 'Technical Round' },
  { id: 'final', label: 'Final Assessment' },
];

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('en');
  const [personality, setPersonality] = useState('friendly_hr');
  const [round, setRound] = useState('technical');
  const [includeCoding, setIncludeCoding] = useState(false);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(false);

  const startInterview = async () => {
    setLoading(true);
    try {
      let resumeData = null;
      if (resume) {
        const fd = new FormData();
        fd.append('resume', resume, resume.name);
        try {
          const res = await api.post('/resume/parse', fd);
          resumeData = res.data;
        } catch (parseErr) {
          const msg = parseErr.response?.data?.message || parseErr.message;
          if (msg === 'PDF required') {
            alert(msg);
            setLoading(false);
            return;
          }
          const proceed = window.confirm(
            `${msg}\n\nStart interview without resume-based questions?`
          );
          if (!proceed) {
            setLoading(false);
            return;
          }
        }
      }

      const { data } = await api.post('/interviews/start', {
        language,
        personality,
        round,
        includeCoding,
        resumeData,
      });
      navigate(`/interview/${data.sessionId}`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to start interview';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Configure Interview" subtitle="Choose language, personality, and round">
      <div className="mx-auto w-full max-w-2xl space-y-6">
          <section className="os-card p-6">
            <div className="flex items-center gap-2 text-indigo-400">
              <Globe className="h-5 w-5" />
              <h2 className="font-semibold">Language</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLanguage(l.id)}
                  className={`rounded-xl px-4 py-2 text-sm ${
                    language === l.id
                      ? 'bg-indigo-500 text-white'
                      : 'border border-white/10 bg-white/5'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </section>

          <section className="os-card p-6">
            <div className="flex items-center gap-2 text-violet-400">
              <UserCircle className="h-5 w-5" />
              <h2 className="font-semibold">Interviewer Personality</h2>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {PERSONALITIES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersonality(p.id)}
                  className={`rounded-xl px-4 py-3 text-left text-sm ${
                    personality === p.id
                      ? 'bg-violet-600/40 border border-violet-400/50'
                      : 'border border-white/10 bg-white/5'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          <section className="os-card p-6">
            <h2 className="font-semibold">Interview Round</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {ROUNDS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRound(r.id)}
                  className={`rounded-xl px-4 py-2 text-sm ${
                    round === r.id ? 'bg-indigo-500' : 'border border-white/10 bg-white/5'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeCoding}
                onChange={(e) => setIncludeCoding(e.target.checked)}
              />
              Include optional coding round
            </label>
          </section>

          <section className="os-card p-6">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-cyan-400" />
              <h2 className="font-semibold">Resume (PDF)</h2>
            </div>
            <p className="mt-2 text-sm text-white/50">
              Optional — upload a PDF for personalized questions from your skills and projects.
            </p>
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="mt-4 w-full text-sm text-white/70 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:text-white"
              onChange={(e) => setResume(e.target.files?.[0] || null)}
            />
            {resume && (
              <p className="mt-2 text-sm text-emerald-400/90">Selected: {resume.name}</p>
            )}
          </section>

          <button
            type="button"
            onClick={startInterview}
            disabled={loading}
            className="btn-primary w-full py-4 text-lg"
          >
            {loading ? 'Starting...' : 'Start AI Interview'}
          </button>
      </div>
    </AppShell>
  );
}
