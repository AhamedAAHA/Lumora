import { useCallback, useEffect, useRef, useState } from 'react';

export function useAntiCheat(onViolation) {
  const [warnings, setWarnings] = useState([]);
  const onViolationRef = useRef(onViolation);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  const addWarning = useCallback((type, message) => {
    const w = { type, message, at: new Date().toISOString() };
    setWarnings((prev) => {
      if (prev.some((p) => p.type === type && Date.now() - new Date(p.at).getTime() < 5000)) {
        return prev;
      }
      return [...prev, w];
    });
    onViolationRef.current?.(w);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        addWarning('tab_switch', 'Tab switch detected. Stay on the interview window.');
      }
    };

    const handleCopy = (e) => {
      e.preventDefault();
      addWarning('copy_paste', 'Copy/paste is disabled during the interview.');
    };

    const handlePaste = (e) => {
      e.preventDefault();
      addWarning('copy_paste', 'Paste is disabled during the interview.');
    };

    let idleTimer;
    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        addWarning('inactivity', 'Inactivity detected. Please continue the interview.');
      }, 120000);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    const events = ['mousemove', 'keydown', 'click'];
    events.forEach((ev) => document.addEventListener(ev, resetIdle, { passive: true }));
    resetIdle();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      events.forEach((ev) => document.removeEventListener(ev, resetIdle));
      clearTimeout(idleTimer);
    };
  }, [addWarning]);

  return { warnings };
}
