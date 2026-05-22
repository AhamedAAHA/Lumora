import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Volume2 } from 'lucide-react';
import AIAvatar from '../../components/interview/AIAvatar';
import LiveAnalytics from '../../components/interview/LiveAnalytics';
import VoiceAnswerControls from '../../components/interview/VoiceAnswerControls';
import InterviewTimer from '../../components/interview/InterviewTimer';
import { useAntiCheat } from '../../hooks/useAntiCheat';
import { useConfidenceAnalysis } from '../../hooks/useConfidenceAnalysis';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import pinApi, { getPinToken, clearPinAuth } from '../../lib/pinApi';

export default function PinInterview() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const audioRef = useRef(null);
  const voicePlayedRef = useRef('');
  const { scores, history, analyzeAnswer, startTimer, getElapsed } = useConfidenceAnalysis();
  const lang = session?.candidate?.language || session?.interview?.language || 'en';
  const { listening, voiceError, setVoiceError, toggleListening } = useVoiceInput(lang);

  const reportCheat = useCallback(async (w) => {
    try {
      await pinApi.post('/candidate/cheat-event', { type: w.type, message: w.message });
    } catch (_) {}
  }, []);

  const { warnings } = useAntiCheat(reportCheat);

  const loadSession = useCallback(async () => {
    const { data } = await pinApi.get('/candidate/session');
    if (data.completed) {
      navigate('/pin/done', { replace: true });
      return;
    }
    if (data.cvRequired || data.candidate?.status === 'pending' || !data.candidate?.cvFileUrl) {
      navigate('/pin/cv', { replace: true });
      return;
    }
    if (data.candidate.status !== 'interview_started') {
      navigate('/pin/cv', { replace: true });
      return;
    }
    if (!data.aiQuestionsReady) {
      navigate('/pin/cv', { replace: true });
      return;
    }
    setSession(data);
    setQuestion(data.currentQuestion);
  }, [navigate]);

  useEffect(() => {
    if (!getPinToken()) {
      navigate('/pin', { replace: true });
      return;
    }
    loadSession().catch(() => navigate('/pin/cv', { replace: true }));
  }, [navigate, loadSession]);

  const playVoice = useCallback(async () => {
    if (!question?.text) return;
    setSpeaking(true);
    try {
      const { data } = await pinApi.post('/voice/generate-question-audio', {
        text: question.text,
        personality: session?.interview?.personality || session?.candidate?.personality,
        language: lang,
      });
      if (data.audioUrl) {
        audioRef.current?.pause();
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;
        audio.onended = () => setSpeaking(false);
        await audio.play();
      } else setSpeaking(false);
    } catch {
      setSpeaking(false);
    }
  }, [question?.text, session, lang]);

  useEffect(() => {
    const q = question?.text;
    if (!q || voicePlayedRef.current === q) return;
    voicePlayedRef.current = q;
    playVoice();
    return () => audioRef.current?.pause();
  }, [question?.text, playVoice]);

  const submitAnswer = async () => {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    const metrics = analyzeAnswer(answer, getElapsed());
    startTimer();
    try {
      const { data } = await pinApi.post('/candidate/submit-answer', { answer, metrics });
      setFeedback(
        data.evaluation?.feedback ? `Score ${data.evaluation.score}/10 — ${data.evaluation.feedback}` : ''
      );
      if (data.finalize) {
        if (data.includeCoding) {
          navigate('/pin/coding?finalize=1', { replace: true });
          return;
        }
        await pinApi.post('/candidate/complete-interview');
        sessionStorage.setItem('lumora_candidate_status', 'completed');
        navigate('/pin/done', { replace: true });
        return;
      }
      voicePlayedRef.current = '';
      setQuestion(data.nextQuestion);
      setAnswer('');
      setSession((s) => ({
        ...s,
        interviewerComment: data.interviewerComment,
        liveMetrics: data.liveMetrics,
        metricsHistory: data.metricsHistory,
        progress: data.progress,
      }));
      setTimeout(() => setFeedback(''), 4000);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const analyticsScores = useMemo(
    () => ({
      confidence: session?.liveMetrics?.confidence ?? scores.confidence ?? 72,
      communication: session?.liveMetrics?.communication ?? scores.communication ?? 72,
      speaking: session?.liveMetrics?.speaking ?? scores.speaking ?? 70,
    }),
    [session?.liveMetrics, scores]
  );

  const analyticsHistory = useMemo(
    () => (session?.metricsHistory?.length ? session.metricsHistory : history),
    [session?.metricsHistory, history]
  );

  const progress = session?.progress?.percent ?? 0;

  if (!session || !question) {
    return (
      <div className="mountain-bg flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mountain-bg min-h-screen">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-4 md:px-8">
        <span className="pill-tag">{session.interview?.title || 'Interview'}</span>
        <div className="flex items-center gap-4">
          <InterviewTimer />
          <span className="text-sm text-white/50">
            Q {session.progress?.current}/{session.progress?.total}
          </span>
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => {
              clearPinAuth();
              navigate('/pin');
            }}
          >
            Exit
          </button>
        </div>
      </header>

      {warnings.length > 0 && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 md:mx-8">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {warnings[warnings.length - 1]?.message}
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-6 p-4 md:grid-cols-3 md:p-8">
        <div className="space-y-6 md:col-span-2">
          <div className="glass-card flex flex-col items-center p-8 md:flex-row md:gap-8">
            <AIAvatar
              speaking={speaking}
              personality={session.candidate?.personality || session.interview?.personality}
            />
            <div className="mt-6 flex-1 md:mt-0">
              <p className="text-xs text-white/40 capitalize">{question.type} question</p>
              <p className="mt-2 text-lg leading-relaxed">{question.text}</p>
              {session.interviewerComment && (
                <p className="mt-3 text-sm italic text-indigo-300/80">{session.interviewerComment}</p>
              )}
              <button
                type="button"
                onClick={playVoice}
                className="btn-secondary mt-4 inline-flex items-center gap-2 text-sm"
              >
                <Volume2 className="h-4 w-4" />
                Play question audio
              </button>
            </div>
          </div>

          <VoiceAnswerControls
            answer={answer}
            onAnswerChange={setAnswer}
            onSubmit={submitAnswer}
            onListen={() =>
              toggleListening((transcript) => {
                setAnswer((a) => (a ? `${a} ${transcript}` : transcript));
                startTimer();
              })
            }
            listening={listening}
            voiceError={voiceError || submitError}
            submitting={submitting}
            extraActions={
              session.includeCoding ? (
                <button
                  type="button"
                  onClick={() => navigate('/pin/coding')}
                  className="btn-secondary text-sm"
                  disabled={submitting}
                >
                  Coding round
                </button>
              ) : null
            }
          />
          {feedback && <p className="text-sm text-indigo-200">{feedback}</p>}
        </div>

        <LiveAnalytics scores={analyticsScores} history={analyticsHistory} progress={progress} />
      </div>
    </div>
  );
}
