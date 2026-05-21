import { useCallback, useRef, useState } from 'react';

const FILLERS = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'sort of', 'kind of'];

export function useConfidenceAnalysis() {
  const [scores, setScores] = useState({
    confidence: 72,
    communication: 75,
    speaking: 70,
  });
  const [history, setHistory] = useState([]);
  const startTimeRef = useRef(null);

  const analyzeAnswer = useCallback((text, responseTimeMs) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const lower = text.toLowerCase();
    const fillerCount = FILLERS.reduce(
      (acc, f) => acc + (lower.match(new RegExp(`\\b${f}\\b`, 'g'))?.length || 0),
      0
    );
    const wpm = responseTimeMs > 0 ? (wordCount / (responseTimeMs / 60000)) : 120;
    const hesitation = (text.match(/\.\.\.|—|-/g) || []).length;

    let confidence = 70;
    if (wordCount < 15) confidence -= 15;
    if (fillerCount > 3) confidence -= 10;
    if (wpm < 80 || wpm > 200) confidence -= 8;
    if (hesitation > 2) confidence -= 5;
    if (wordCount > 40 && fillerCount < 2) confidence += 12;
    confidence = Math.max(20, Math.min(98, confidence));

    const communication = Math.max(
      25,
      Math.min(98, confidence + (wordCount > 25 ? 5 : -8) - fillerCount * 2)
    );
    const speaking = Math.max(25, Math.min(98, 100 - fillerCount * 4 - hesitation * 3));

    const point = {
      confidence,
      communication,
      speaking,
      wpm: Math.round(wpm),
      fillers: fillerCount,
      at: Date.now(),
    };

    setScores({
      confidence: Math.round(confidence),
      communication: Math.round(communication),
      speaking: Math.round(speaking),
    });
    setHistory((h) => [...h.slice(-19), point]);
    return point;
  }, []);

  const startTimer = () => {
    startTimeRef.current = Date.now();
  };

  const getElapsed = () =>
    startTimeRef.current ? Date.now() - startTimeRef.current : 0;

  return { scores, history, analyzeAnswer, startTimer, getElapsed };
}
