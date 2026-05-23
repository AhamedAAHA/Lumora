import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Volume2 } from 'lucide-react';
import LumoraLogo from '../../components/LumoraLogo';
import AIAvatar from '../../components/interview/AIAvatar';
import LiveAnalytics from '../../components/interview/LiveAnalytics';
import VoiceAnswerControls from '../../components/interview/VoiceAnswerControls';
import InterviewTimer from '../../components/interview/InterviewTimer';
import { useAntiCheat } from '../../hooks/useAntiCheat';
import { useConfidenceAnalysis } from '../../hooks/useConfidenceAnalysis';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { useQuestionAudio } from '../../hooks/useQuestionAudio';
import pinApi, { getPinToken, clearPinAuth } from '../../lib/pinApi';
import LumoraBackground from '../../components/LumoraBackground';
import { langFontClass, LANG_LABELS } from '../../lib/langUtils';
import { isMobileDevice, unlockAudioPlayback } from '../../lib/deviceUtils';

export default function PinInterview() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitError, setSubmitError] = useState('');
  const submitLockRef = useRef(false);
  const plannedTotalRef = useRef(0);
  const answeredCountRef = useRef(0);
  const [submitting, setSubmitting] = useState(false);
  const [voiceHint, setVoiceHint] = useState('');
  const voicePlayedRef = useRef('');
  const mobileAudio = useMemo(() => isMobileDevice(), []);
  const { scores, live, history, analyzeLive, analyzeAnswer, hydrateHistory, startTimer, getElapsed } =
    useConfidenceAnalysis();
  const [lastScore, setLastScore] = useState(null);
  const metricsHydratedRef = useRef(false);
  const lang = session?.candidate?.language || session?.interview?.language || 'en';
  const personality = session?.interview?.personality || session?.candidate?.personality || 'friendly_hr';
  const { listening, voiceError, toggleListening, recording } = useVoiceInput(lang);
  const { play: playQuestionAudio, stop: stopQuestionAudio } = useQuestionAudio({
    language: lang,
    personality,
  });

  const reportCheat = useCallback(async (w) => {
    try {
      await pinApi.post('/candidate/cheat-event', { type: w.type, message: w.message });
    } catch {
      // Cheat reporting should not interrupt the candidate flow.
    }
  }, []);

  const { warnings } = useAntiCheat(reportCheat);

  const finishInterview = useCallback(async (includeCoding) => {
    if (includeCoding) {
      navigate('/pin/coding?finalize=1', { replace: true });
      return;
    }
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
  }, [navigate]);

  const loadSession = useCallback(async () => {
    const { data } = await pinApi.get('/candidate/session');
    if (data.completed) {
      navigate('/pin/review', { replace: true });
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
    const atQuestionLimit =
      data.interviewComplete ||
      (!data.currentQuestion &&
        data.progress?.total > 0 &&
        data.progress.current >= data.progress.total);

    if (atQuestionLimit) {
      await finishInterview(data.includeCoding && !data.codingDone);
      return;
    }
    const serverTotal = data.progress?.total || 0;
    const cappedTotal = serverTotal;
    if (!plannedTotalRef.current) {
      plannedTotalRef.current = cappedTotal;
    } else {
      plannedTotalRef.current = Math.min(plannedTotalRef.current, cappedTotal);
    }
    setSession({
      ...data,
      progress: data.progress
        ? {
            ...data.progress,
            total: plannedTotalRef.current,
            current: Math.min(data.progress.current, plannedTotalRef.current),
          }
        : data.progress,
    });
    setQuestion(data.currentQuestion);
    if (data.metricsHistory?.length && !metricsHydratedRef.current) {
      hydrateHistory(data.metricsHistory);
      metricsHydratedRef.current = true;
    }
  }, [navigate, finishInterview, hydrateHistory]);

  useEffect(() => {
    if (question?.text) {
      startTimer();
    }
  }, [question?.text, startTimer]);

  useEffect(() => {
    const trimmed = answer.trim();
    if (!trimmed) return undefined;
    const timer = window.setTimeout(() => {
      analyzeLive(trimmed, getElapsed());
    }, 200);
    return () => window.clearTimeout(timer);
  }, [answer, analyzeLive, getElapsed]);

  useEffect(() => {
    if (!getPinToken()) {
      navigate('/pin', { replace: true });
      return;
    }
    loadSession().catch(() => navigate('/pin/cv', { replace: true }));
  }, [navigate, loadSession]);

  const playVoice = useCallback(
    async (fromUserTap = false) => {
      if (!question?.text) return;
      if (fromUserTap) await unlockAudioPlayback();
      setSpeaking(true);
      if (!fromUserTap) setVoiceHint('');
      stopQuestionAudio();
      try {
        const result = await playQuestionAudio(question.text, { userGesture: fromUserTap || !mobileAudio });
        if (!result.ok) {
          setVoiceHint(
            result.needsUserGesture
              ? 'Tap "Play question" to hear the question (required on phones).'
              : 'Read the question below, or tap Play question again.'
          );
        } else {
          setVoiceHint('');
        }
      } catch {
        setVoiceHint('Tap "Play question" to hear the question, or read it below.');
      } finally {
        setSpeaking(false);
      }
    },
    [question?.text, playQuestionAudio, stopQuestionAudio, mobileAudio]
  );

  useEffect(() => {
    const q = question?.text;
    if (!q || voicePlayedRef.current === q) return;
    voicePlayedRef.current = q;
    if (mobileAudio) {
      setVoiceHint('Tap "Play question" to hear the question in your language.');
      return undefined;
    }
    playVoice(false);
    return () => stopQuestionAudio();
  }, [question?.text, playVoice, stopQuestionAudio, mobileAudio]);

  const submitAnswer = async () => {
    if (!answer.trim() || submitting || submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    const metrics = analyzeAnswer(answer, getElapsed());
    startTimer();
    try {
      const { data } = await pinApi.post('/candidate/submit-answer', { answer: answer.trim(), metrics });

      answeredCountRef.current += 1;
      const fixedTotal = plannedTotalRef.current || data.progress?.total || 0;
      plannedTotalRef.current = fixedTotal;
      const answeredSoFar = answeredCountRef.current;

      if (data.evaluation?.score != null) setLastScore(data.evaluation.score);
      setFeedback(
        data.evaluation?.feedback ? `Score ${data.evaluation.score}/10 - ${data.evaluation.feedback}` : ''
      );

      const limitReached =
        data.finalize ||
        answeredSoFar >= fixedTotal ||
        data.progress?.current >= fixedTotal ||
        !data.nextQuestion?.text;

      if (limitReached) {
        await finishInterview(data.includeCoding);
        return;
      }

      voicePlayedRef.current = '';
      setQuestion(data.nextQuestion);
      setAnswer('');
      setSession((s) => {
        const current = Math.min(data.progress?.current || 0, fixedTotal);
        return {
          ...s,
          interviewerComment: data.interviewerComment,
          liveMetrics: data.liveMetrics,
          metricsHistory: data.metricsHistory,
          progress: data.progress
            ? { ...data.progress, total: fixedTotal, current }
            : data.progress,
        };
      });
      setTimeout(() => setFeedback(''), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Submit failed';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const analyticsHistory = useMemo(
    () =>
      history.map((h, i) => ({
        confidence: h.confidence,
        communication: h.communication,
        speaking: h.speaking,
        score: h.score,
        label: `Q${i + 1}`,
      })),
    [history]
  );

  const progress = useMemo(() => {
    const p = session?.progress;
    if (p?.current && p?.total) {
      return Math.min(100, Math.round((p.current / p.total) * 100));
    }
    if (p?.percent != null && p.percent > 0) return p.percent;
    return 0;
  }, [session?.progress]);

  const displayQuestionNumber = session?.progress?.current || 0;

  const qFont = langFontClass(lang);

  if (!session || !question) {
    return (
      <LumoraBackground className="items-center justify-center">
        <div className="loading-spinner" />
      </LumoraBackground>
    );
  }

  return (
    <LumoraBackground>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 md:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <LumoraLogo to="/pin" size="sm" />
          <span className="pill-tag max-w-[200px] truncate sm:max-w-xs">
            {session.interview?.title || 'Interview'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <InterviewTimer />
          <span className="text-sm text-white/50">
            Q {displayQuestionNumber}/{session.progress?.total}
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
          <div className="glass-card card-3d flex flex-col items-center p-8 md:flex-row md:gap-8">
            <AIAvatar
              speaking={speaking}
              personality={session.candidate?.personality || session.interview?.personality}
            />
            <div className={`mt-6 flex-1 md:mt-0 ${qFont}`}>
              <p className="text-xs text-cyan-300/60 capitalize">
                {question.type} question · {LANG_LABELS[lang] || 'English'}
              </p>
              <p className="mt-2 text-lg leading-relaxed text-white/95">{question.text}</p>
              {voiceHint && (
                <p className="mt-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100/90">
                  {voiceHint}
                </p>
              )}
              {session.interviewerComment && (
                <p className={`mt-3 text-sm italic text-indigo-300/80 ${qFont}`}>{session.interviewerComment}</p>
              )}
              <button
                type="button"
                onClick={() => playVoice(true)}
                className="btn-secondary btn-3d mt-4 inline-flex items-center gap-2 text-sm"
              >
                <Volume2 className="h-4 w-4" />
                Play question
              </button>
            </div>
          </div>

          <VoiceAnswerControls
            answer={answer}
            onAnswerChange={setAnswer}
            onSubmit={submitAnswer}
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
            voiceError={[voiceError, submitError].filter(Boolean).join(' ')}
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

        <LiveAnalytics
          scores={scores}
          history={analyticsHistory}
          progress={progress}
          live={live}
          listening={listening || recording}
          avgScore={lastScore}
        />
      </div>
    </LumoraBackground>
  );
}
