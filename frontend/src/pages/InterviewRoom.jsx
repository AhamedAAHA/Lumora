import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import AIAvatar from '../components/interview/AIAvatar';
import LiveAnalytics from '../components/interview/LiveAnalytics';
import VoiceAnswerControls from '../components/interview/VoiceAnswerControls';
import InterviewTimer from '../components/interview/InterviewTimer';
import { useAntiCheat } from '../hooks/useAntiCheat';
import { useConfidenceAnalysis } from '../hooks/useConfidenceAnalysis';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useQuestionAudio } from '../hooks/useQuestionAudio';
import { FileUp, AlertTriangle } from 'lucide-react';

export default function InterviewRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [answer, setAnswer] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [cheatLog, setCheatLog] = useState([]);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const voicePlayedRef = useRef('');
  const { scores, live, history, analyzeLive, analyzeAnswer, startTimer, getElapsed } = useConfidenceAnalysis();
  const lang = session?.language || 'en';
  const { listening, voiceError, setVoiceError, recording, toggleListening } = useVoiceInput(lang);
  const { play: playQuestionAudio, stop: stopQuestionAudio } = useQuestionAudio({
    language: lang,
    personality: session?.personality || 'friendly_hr',
    http: api,
    endpoint: '/voice/speak',
  });

  const reportCheat = useCallback(
    async (w) => {
      setCheatLog((prev) => [...prev, w]);
      try {
        await api.post(`/interviews/${sessionId}/cheat`, w);
      } catch (err) {
        console.warn('Could not report anti-cheat event', err);
      }
    },
    [sessionId]
  );

  const { warnings } = useAntiCheat(reportCheat);

  useEffect(() => {
    api
      .get(`/interviews/${sessionId}`)
      .then((r) => setSession(r.data))
      .catch(() => navigate('/dashboard'));
  }, [sessionId, navigate]);

  useEffect(() => {
    const q = session?.currentQuestion;
    if (!q || voicePlayedRef.current === q) return;

    voicePlayedRef.current = q;
    let cancelled = false;

    (async () => {
      setSpeaking(true);
      await playQuestionAudio(q);
      if (!cancelled) setSpeaking(false);
    })();

    return () => {
      cancelled = true;
      stopQuestionAudio();
    };
  }, [session?.currentQuestion, playQuestionAudio, stopQuestionAudio]);

  useEffect(() => {
    if (session?.currentQuestion) startTimer();
  }, [session?.currentQuestion, startTimer]);

  useEffect(() => {
    const trimmed = answer.trim();
    if (!trimmed) return undefined;
    const timer = window.setTimeout(() => analyzeLive(trimmed, getElapsed()), 200);
    return () => window.clearTimeout(timer);
  }, [answer, analyzeLive, getElapsed]);

  const uploadResume = async (file) => {
    if (!file) return;
    setUploadingCv(true);
    setVoiceError('');
    try {
      const form = new FormData();
      form.append('resume', file, file.name);
      const parsed = await api.post('/resume/parse', form);
      const { data } = await api.patch(`/interviews/${sessionId}/resume`, { resumeData: parsed.data });
      setSession(data);
    } catch (err) {
      setVoiceError(err.response?.data?.message || 'Could not upload resume');
    } finally {
      setUploadingCv(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    const metrics = analyzeAnswer(answer, getElapsed());

    try {
      const { data } = await api.post(`/interviews/${sessionId}/answer`, {
        answer,
        metrics,
        cheatEvents: cheatLog,
      });

      if (data.completed) {
        navigate('/dashboard', { state: { reportId: data.reportId } });
        return;
      }

      voicePlayedRef.current = '';
      setSession(data.session);
      setAnswer('');
      setCheatLog([]);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = useMemo(
    () =>
      session
        ? Math.round((session.questionIndex / Math.max(session.totalQuestions, 1)) * 100)
        : 0,
    [session]
  );

  if (!session) {
    return (
      <div className="lumora-bg flex min-h-screen items-center justify-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="lumora-bg min-h-screen page-fade">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-4 md:px-8">
        <div className="flex items-center gap-4">
          <span className="pill-tag capitalize">{session.round} round</span>
          <InterviewTimer />
        </div>
        <span className="text-sm text-white/50">
          Difficulty: <span className="text-indigo-300 capitalize">{session.difficulty}</span>
        </span>
      </header>

      {warnings.length > 0 && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 md:mx-8">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Anti-cheat: {warnings[warnings.length - 1]?.message}
        </div>
      )}

      <div className="mx-auto max-w-3xl p-4 md:p-8">
        {session.cvRequired ? (
          <div className="glass-card space-y-6 p-8 text-center">
            <AIAvatar speaking={false} personality={session.personality} />
            <h2 className="text-xl font-semibold">Upload your resume first</h2>
            <p className="text-sm text-white/55">
              Upload a PDF on your dashboard before attending. You will begin with an introduction
              question, then AI questions based on your resume.
            </p>
            <label className="btn-primary inline-flex cursor-pointer items-center gap-2">
              <FileUp className="h-4 w-4" />
              {uploadingCv ? 'Uploading…' : 'Upload resume (PDF)'}
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                disabled={uploadingCv}
                onChange={(e) => uploadResume(e.target.files?.[0])}
              />
            </label>
            {voiceError && <p className="text-sm text-amber-200">{voiceError}</p>}
            <button type="button" className="btn-secondary text-sm" onClick={() => navigate('/dashboard')}>
              Back to dashboard
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-6 md:col-span-2">
              <div className="glass-card flex flex-col items-center p-8 md:flex-row md:gap-8">
                <AIAvatar speaking={speaking} personality={session.personality} />
                <div className="mt-6 flex-1 md:mt-0">
                  <p className="text-xs text-white/40">
                    {session.questionIndex === 0 ? 'Introduction' : 'AI interviewer (from your resume)'}
                  </p>
                  <p className="mt-2 text-lg leading-relaxed">{session.currentQuestion}</p>
                  {session.lastComment && (
                    <p className="mt-3 text-sm italic text-indigo-300/80">{session.lastComment}</p>
                  )}
                </div>
              </div>

              <VoiceAnswerControls
                answer={answer}
                onAnswerChange={setAnswer}
                onListen={() =>
                  toggleListening(
                    (transcript) => {
                      const next = transcript.trim();
                      if (next) {
                        setAnswer(next);
                        analyzeLive(next, getElapsed());
                      }
                      startTimer();
                    },
                    (liveText) => {
                      if (
                        liveText &&
                        !liveText.startsWith('🎤') &&
                        !liveText.startsWith('Recording') &&
                        !liveText.startsWith('Transcribing')
                      ) {
                        setAnswer(liveText);
                        analyzeLive(liveText, getElapsed());
                      }
                    }
                  )
                }
                listening={listening}
                recording={recording}
                voiceError={voiceError || submitError}
                onSubmit={submitAnswer}
                submitting={submitting}
                extraActions={
                  session.includeCoding && session.questionIndex >= 3 ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/interview/${sessionId}/coding`)}
                      className="btn-secondary text-sm"
                    >
                      Coding round
                    </button>
                  ) : null
                }
              />
            </div>

            <LiveAnalytics
              scores={scores}
              history={history}
              progress={progress}
              live={live}
              listening={listening || recording}
            />
          </div>
        )}
      </div>
    </div>
  );
}
