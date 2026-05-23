import { useCallback, useRef, useState } from 'react';

const FILLERS = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'sort of', 'kind of'];

function computeMetrics(text, responseTimeMs) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lower = text.toLowerCase();
  const fillerCount = FILLERS.reduce(
    (acc, f) => acc + (lower.match(new RegExp(`\\b${f}\\b`, 'g'))?.length || 0),
    0
  );
  const wpm = responseTimeMs > 0 ? wordCount / (responseTimeMs / 60000) : wordCount > 0 ? 110 : 0;
  const hesitation = (text.match(/\.\.\.|—|-/g) || []).length;

  let confidence = 70;
  if (wordCount < 15) confidence -= 15;
  if (fillerCount > 3) confidence -= 10;
  if (wpm > 0 && (wpm < 80 || wpm > 200)) confidence -= 8;
  if (hesitation > 2) confidence -= 5;
  if (wordCount > 40 && fillerCount < 2) confidence += 12;
  if (wordCount === 0) confidence = 68;
  confidence = Math.max(20, Math.min(98, confidence));

  const communication = Math.max(
    25,
    Math.min(98, confidence + (wordCount > 25 ? 5 : wordCount > 0 ? -8 : 0) - fillerCount * 2)
  );
  const speaking = Math.max(25, Math.min(98, 100 - fillerCount * 4 - hesitation * 3));
  const clarity = Math.max(25, Math.min(98, communication - Math.max(0, fillerCount - 1) * 3));

  return {
    confidence: Math.round(confidence),
    communication: Math.round(communication),
    speaking: Math.round(speaking),
    clarity: Math.round(clarity),
    wpm: Math.round(wpm),
    fillers: fillerCount,
    wordCount,
    hesitation,
    responseMs: Math.round(responseTimeMs),
  };
}

export function useConfidenceAnalysis() {
  const [scores, setScores] = useState({
    confidence: 68,
    communication: 70,
    speaking: 68,
    clarity: 70,
  });
  const [live, setLive] = useState({
    wpm: 0,
    fillers: 0,
    wordCount: 0,
    responseMs: 0,
    hesitation: 0,
  });
  const [history, setHistory] = useState([]);
  const startTimeRef = useRef(null);

  const analyzeLive = useCallback((text, responseTimeMs = 0) => {
    const m = computeMetrics(text, responseTimeMs);
    setScores({
      confidence: m.confidence,
      communication: m.communication,
      speaking: m.speaking,
      clarity: m.clarity,
    });
    setLive({
      wpm: m.wpm,
      fillers: m.fillers,
      wordCount: m.wordCount,
      responseMs: m.responseMs,
      hesitation: m.hesitation,
    });
    return m;
  }, []);

  const analyzeAnswer = useCallback((text, responseTimeMs) => {
    const m = computeMetrics(text, responseTimeMs);
    const point = { ...m, at: Date.now() };

    setScores({
      confidence: m.confidence,
      communication: m.communication,
      speaking: m.speaking,
      clarity: m.clarity,
    });
    setLive({
      wpm: m.wpm,
      fillers: m.fillers,
      wordCount: m.wordCount,
      responseMs: m.responseMs,
      hesitation: m.hesitation,
    });
    setHistory((h) => [...h.slice(-19), point]);
    return point;
  }, []);

  const hydrateHistory = useCallback((serverHistory = []) => {
    if (!serverHistory.length) return;
    const points = serverHistory.map((h) => ({
      confidence: h.confidence ?? 70,
      communication: h.communication ?? 70,
      speaking: h.speaking ?? 70,
      clarity: h.communication ?? 70,
      wpm: h.wpm ?? 0,
      fillers: h.fillers ?? 0,
      wordCount: 0,
      score: h.score,
      at: h.at ? new Date(h.at).getTime() : Date.now(),
    }));
    setHistory(points);
    const last = points[points.length - 1];
    if (last) {
      setScores({
        confidence: last.confidence,
        communication: last.communication,
        speaking: last.speaking,
        clarity: last.clarity,
      });
      setLive({
        wpm: last.wpm,
        fillers: last.fillers,
        wordCount: last.wordCount,
        responseMs: 0,
        hesitation: 0,
      });
    }
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
  }, []);

  const getElapsed = useCallback(
    () => (startTimeRef.current ? Date.now() - startTimeRef.current : 0),
    []
  );

  return {
    scores,
    live,
    history,
    analyzeLive,
    analyzeAnswer,
    hydrateHistory,
    startTimer,
    getElapsed,
  };
}
