import { useCallback, useRef, useState } from 'react';

const FILLERS = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'sort of', 'kind of'];

const PLACEHOLDER_RE =
  /^(test|fake|asdf|qwerty|nothing|idk|n\/a|ok|okay|yes|no|hello|hi|skip|pass|blah|dummy|random|sample|fake thing)$/i;

function isLowQualityAnswer(text) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 8) return true;
  if (PLACEHOLDER_RE.test(trimmed.replace(/[^\w\s]/g, '').trim())) return true;
  if (/^(\w+)\s+\1\s+\1/i.test(trimmed.toLowerCase())) return true;
  return false;
}

function computeMetrics(text, responseTimeMs) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lower = text.toLowerCase();
  const lowQuality = isLowQualityAnswer(text);
  const fillerCount = FILLERS.reduce(
    (acc, f) => acc + (lower.match(new RegExp(`\\b${f}\\b`, 'g'))?.length || 0),
    0
  );
  const wpm = responseTimeMs > 0 ? wordCount / (responseTimeMs / 60000) : wordCount > 0 ? 110 : 0;
  const hesitation = (text.match(/\.\.\.|—|-/g) || []).length;

  let confidence = 70;
  if (wordCount === 0) confidence = 5;
  else if (lowQuality) confidence = 12;
  else if (wordCount < 15) confidence = 28;
  else if (wordCount < 25) confidence = 45;
  if (!lowQuality && fillerCount > 3) confidence -= 10;
  if (!lowQuality && wpm > 0 && (wpm < 80 || wpm > 200)) confidence -= 8;
  if (!lowQuality && hesitation > 2) confidence -= 5;
  if (!lowQuality && wordCount > 40 && fillerCount < 2) confidence += 12;
  confidence = Math.max(5, Math.min(98, confidence));

  let communication = Math.max(
    5,
    Math.min(98, confidence + (wordCount > 25 ? 5 : wordCount > 0 ? -8 : 0) - fillerCount * 2)
  );
  let speaking = Math.max(5, Math.min(98, 100 - fillerCount * 4 - hesitation * 3));
  if (lowQuality) {
    communication = Math.min(communication, 18);
    speaking = Math.min(speaking, 22);
  }
  const clarity = Math.max(5, Math.min(98, communication - Math.max(0, fillerCount - 1) * 3));

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
