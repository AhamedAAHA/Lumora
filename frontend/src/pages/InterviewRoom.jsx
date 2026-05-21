import { useCallback, useEffect, useRef, useState, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import AIAvatar from '../components/interview/AIAvatar';
import LiveAnalytics from '../components/interview/LiveAnalytics';
import InterviewTimer from '../components/interview/InterviewTimer';
import { useAntiCheat } from '../hooks/useAntiCheat';
import { useConfidenceAnalysis } from '../hooks/useConfidenceAnalysis';
import { Mic, MicOff, Send, AlertTriangle } from 'lucide-react';

const AnswerForm = memo(function AnswerForm({
  answer,
  setAnswer,
  listening,
  onListen,
  onSubmit,
  showCoding,
  onCoding,
}) {
  return (
    <div className="glass-card p-6">
      <label className="text-sm text-white/50">Your answer</label>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={5}
        className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-4 outline-none focus:border-indigo-500"
        placeholder="Type or use voice input..."
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onListen}
          className={`btn-secondary inline-flex items-center gap-2 ${listening ? 'ring-2 ring-indigo-500' : ''}`}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {listening ? 'Listening...' : 'Voice input'}
        </button>
        <button type="button" onClick={onSubmit} className="btn-primary inline-flex items-center gap-2">
          <Send className="h-4 w-4" />
          Submit answer
        </button>
        {showCoding && (
          <button type="button" onClick={onCoding} className="btn-secondary text-sm">
            Coding round →
          </button>
        )}
      </div>
    </div>
  );
});

export default function InterviewRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [answer, setAnswer] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [cheatLog, setCheatLog] = useState([]);
  const voicePlayedRef = useRef('');
  const audioRef = useRef(null);
  const { scores, history, analyzeAnswer, startTimer, getElapsed } = useConfidenceAnalysis();

  const reportCheat = useCallback(
    async (w) => {
      setCheatLog((prev) => [...prev, w]);
      try {
        await api.post(`/interviews/${sessionId}/cheat`, w);
      } catch (_) {}
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
      try {
        const { data } = await api.post('/voice/speak', {
          text: q,
          personality: session.personality,
          language: session.language,
        });
        if (cancelled || !data.audioUrl) return;
        setSpeaking(true);
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;
        audio.onended = () => setSpeaking(false);
        await audio.play();
      } catch {
        if (!cancelled) setSpeaking(false);
      }
    })();

    return () => {
      cancelled = true;
      audioRef.current?.pause();
    };
  }, [session?.currentQuestion, session?.personality, session?.language]);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    const rec = new SR();
    rec.lang =
      session?.language === 'ta' ? 'ta-IN' : session?.language === 'si' ? 'si-LK' : 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    setListening(true);
    startTimer();
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setAnswer((a) => (a ? `${a} ${transcript}` : transcript));
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return;
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
    } catch (err) {
      alert(err.response?.data?.message || 'Submit failed');
    }
  };

  const progress = session
    ? Math.round((session.questionIndex / Math.max(session.totalQuestions, 1)) * 100)
    : 0;

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-lumora-black">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lumora-black">
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

      <div className="mx-auto grid max-w-7xl gap-6 p-4 md:grid-cols-3 md:p-8">
        <div className="space-y-6 md:col-span-2">
          <div className="glass-card flex flex-col items-center p-8 md:flex-row md:gap-8">
            <AIAvatar speaking={speaking} personality={session.personality} />
            <div className="mt-6 flex-1 md:mt-0">
              <p className="text-xs text-white/40">AI Interviewer says</p>
              <p className="mt-2 text-lg leading-relaxed">{session.currentQuestion}</p>
              {session.lastComment && (
                <p className="mt-3 text-sm italic text-indigo-300/80">{session.lastComment}</p>
              )}
            </div>
          </div>

          <AnswerForm
            answer={answer}
            setAnswer={setAnswer}
            listening={listening}
            onListen={startListening}
            onSubmit={submitAnswer}
            showCoding={session.includeCoding && session.questionIndex >= 3}
            onCoding={() => navigate(`/interview/${sessionId}/coding`)}
          />
        </div>

        <LiveAnalytics scores={scores} history={history} progress={progress} />
      </div>
    </div>
  );
}
