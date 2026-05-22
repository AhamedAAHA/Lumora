import { useCallback, useEffect, useRef, useState } from 'react';

export function useVoiceInput(language = 'en') {
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const speechLang =
    language === 'ta' ? 'ta-IN' : language === 'si' ? 'si-LK' : 'en-US';

  const toggleListening = useCallback(
    (onTranscript) => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        return;
      }

      setVoiceError('');

      if (!window.isSecureContext) {
        setVoiceError('Voice input needs HTTPS or localhost.');
        return;
      }

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        setVoiceError('Speech recognition is not supported. Try Chrome or Edge.');
        return;
      }

      const rec = new SR();
      rec.lang = speechLang;
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      recognitionRef.current = rec;
      setListening(true);

      rec.onresult = (e) => {
        const transcript = Array.from(e.results)
          .map((result) => result[0]?.transcript)
          .filter(Boolean)
          .join(' ')
          .trim();
        if (transcript) onTranscript(transcript);
      };

      rec.onerror = (event) => {
        const messages = {
          'not-allowed': 'Microphone permission was blocked.',
          'no-speech': 'No speech detected. Try again.',
          'audio-capture': 'No microphone found.',
          network: 'Speech service unavailable.',
        };
        setVoiceError(messages[event.error] || 'Voice input stopped. Try again.');
      };

      rec.onend = () => {
        recognitionRef.current = null;
        setListening(false);
      };

      try {
        rec.start();
      } catch {
        recognitionRef.current = null;
        setListening(false);
        setVoiceError('Could not start voice input.');
      }
    },
    [speechLang]
  );

  return { listening, voiceError, setVoiceError, toggleListening };
}
