import { useCallback, useEffect, useRef, useState } from 'react';
import pinApi from '../lib/pinApi';
import { isMobileDevice, unlockAudioPlayback } from '../lib/deviceUtils';
import { getSpeechRecognition, isSpeechRecognitionSupported, speechLangCode } from '../lib/speech';

function buildTranscriptFromResults(results) {
  if (!results || !results.length) return '';
  const parts = [];
  for (let i = 0; i < results.length; i += 1) {
    const alt = results[i]?.[0] ?? (typeof results[i]?.item === 'function' ? results[i].item(0) : null);
    if (alt?.transcript) parts.push(alt.transcript);
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function blobExtension(blob) {
  const type = blob.type || '';
  if (type.includes('mp4') || type.includes('m4a')) return 'mp4';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('wav')) return 'wav';
  return 'webm';
}

/** Desktop: browser SR first (reliable on laptop). Mobile + ta/si: Whisper recording first. */
function pickVoiceStrategy(language, serverTranscription, browserSr) {
  if (!serverTranscription) {
    return browserSr ? 'browser' : 'none';
  }
  if (language === 'ta' || language === 'si') {
    return 'whisper';
  }
  if (isMobileDevice()) {
    return 'whisper';
  }
  if (browserSr) {
    return 'browser';
  }
  return 'whisper';
}

export function useVoiceInput(language = 'en') {
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [recording, setRecording] = useState(false);
  const [serverTranscription, setServerTranscription] = useState(false);
  const [inputMode, setInputMode] = useState('browser');
  const recognitionRef = useRef(null);
  const serverTranscriptionRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const transcriptRef = useRef('');
  const lastHeardRef = useRef('');
  const callbacksRef = useRef({ onFinal: null, onInterim: null });
  const endTimerRef = useRef(null);
  const startBrowserRecognitionRef = useRef(null);
  const triedEnglishSrRef = useRef(false);

  const speechLang = speechLangCode(language);
  const browserSr = isSpeechRecognitionSupported();

  const refreshCapabilities = useCallback(async () => {
    try {
      const { data } = await pinApi.get('/voice/capabilities');
      const whisper = Boolean(data.openaiTranscription);
      serverTranscriptionRef.current = whisper;
      setServerTranscription(whisper);
      setInputMode(pickVoiceStrategy(language, whisper, browserSr));
      return { whisper, message: data.message };
    } catch {
      serverTranscriptionRef.current = false;
      setServerTranscription(false);
      setInputMode(browserSr ? 'browser' : 'none');
      return { whisper: false, message: null };
    }
  }, [language, browserSr]);

  useEffect(() => {
    refreshCapabilities();
  }, [refreshCapabilities]);

  useEffect(() => {
    return () => {
      if (endTimerRef.current) window.clearTimeout(endTimerRef.current);
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
      if (mediaRecorderRef.current?.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stopBrowserRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      try {
        rec.abort();
      } catch {
        // ignore
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const transcribeBlob = useCallback(
    async (blob, onTranscript, onInterim) => {
      setVoiceError('');
      onInterim?.('Transcribing your speech…');
      const ext = blobExtension(blob);
      const fd = new FormData();
      fd.append('audio', blob, `answer.${ext}`);
      fd.append('language', language);
      try {
        const { data } = await pinApi.post('/voice/transcribe', fd);
        if (data.transcript) {
          onTranscript(data.transcript);
          setVoiceError('');
        } else {
          setVoiceError(data.message || 'Could not transcribe. Type your answer instead.');
        }
      } catch (err) {
        const msg = err.response?.data?.message;
        if (err.response?.data?.code === 'OPENAI_NOT_CONFIGURED') {
          setVoiceError(
            'Replace OPENAI_API_KEY in backend/.env with your real key (not sk-your-openai-key), then restart npm run dev.'
          );
        } else {
          setVoiceError(msg || 'Transcription failed. Type your answer instead.');
        }
      }
    },
    [language]
  );

  const startMediaRecorder = useCallback(
    async (onTranscript, onInterim, { allowWithoutOpenAi = false } = {}) => {
      const canTranscribe = serverTranscriptionRef.current || serverTranscription;
      if (!canTranscribe && !allowWithoutOpenAi) {
        setVoiceError(
          'Add OPENAI_API_KEY in backend/.env (or your hosting dashboard), restart the server, then try again. Chrome/Edge can use free browser voice meanwhile.'
        );
        return;
      }
      if (!canTranscribe) {
        setVoiceError('Server transcription is not configured yet.');
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setVoiceError('Microphone not available. Please type your answer.');
        return;
      }

      setVoiceError('');
      onInterim?.('🎤 Recording… speak your answer, then click Stop listening.');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        streamRef.current = stream;
        chunksRef.current = [];

        const mobile = isMobileDevice();
        const mimeCandidates = mobile
          ? ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', '']
          : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', ''];
        const mime = mimeCandidates.find((m) => !m || MediaRecorder.isTypeSupported(m)) || '';

        const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          setRecording(false);
          setListening(false);
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          chunksRef.current = [];
          if (blob.size > 300) await transcribeBlob(blob, onTranscript, onInterim);
          else setVoiceError('Recording too short. Speak for 2–3 seconds, then click Stop listening.');
        };

        recorder.start(150);
        setRecording(true);
        setListening(true);
      } catch (err) {
        setVoiceError(
          err.name === 'NotAllowedError'
            ? 'Microphone blocked. Allow microphone in browser settings (address bar lock icon on laptop, or Settings → Safari on iPhone).'
            : 'Could not access microphone. Type your answer instead.'
        );
      }
    },
    [serverTranscription, transcribeBlob]
  );

  const finishBrowserSession = useCallback(
    (onTranscript) => {
      if (endTimerRef.current) window.clearTimeout(endTimerRef.current);
      endTimerRef.current = window.setTimeout(() => {
        const text = (transcriptRef.current || lastHeardRef.current).trim();
        transcriptRef.current = '';
        lastHeardRef.current = '';

        if (text) {
          setVoiceError('');
          onTranscript(text);
          return;
        }

        if (
          serverTranscription &&
          (language === 'ta' || language === 'si') &&
          !triedEnglishSrRef.current
        ) {
          triedEnglishSrRef.current = true;
          setVoiceError('Switching to microphone recording for Tamil/Sinhala…');
          startMediaRecorder(onTranscript, callbacksRef.current.onInterim);
          return;
        }

        setVoiceError(
          serverTranscription
            ? 'No speech heard. Click Voice input again — we will record with your microphone.'
            : 'No speech heard. Allow microphone, speak clearly, wait 2 seconds after speaking, then click Stop.'
        );
      }, 450);
    },
    [serverTranscription, language, startMediaRecorder]
  );

  const startBrowserRecognition = useCallback(
    (onTranscript, onInterim, langOverride) => {
      const SR = getSpeechRecognition();
      if (!SR) return false;

      transcriptRef.current = '';
      lastHeardRef.current = '';

      const rec = new SR();
      rec.lang = langOverride || speechLang;
      rec.continuous = language === 'ta' || language === 'si';
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      recognitionRef.current = rec;
      setListening(true);
      setVoiceError('');

      rec.onstart = () => {
        onInterim?.('🎤 Listening… speak now (click Stop when finished).');
      };

      rec.onspeechstart = () => setVoiceError('');

      rec.onresult = (e) => {
        const text = buildTranscriptFromResults(e.results);
        if (text) {
          transcriptRef.current = text;
          lastHeardRef.current = text;
          onInterim?.(text);
        }
      };

      rec.onerror = (event) => {
        if (event.error === 'aborted') return;

        if (event.error === 'language-not-supported' && !langOverride && speechLang !== 'en-US') {
          try {
            rec.abort();
          } catch {
            // ignore
          }
          recognitionRef.current = null;
          setListening(false);
          if (serverTranscription) {
            setVoiceError('Browser does not support this language. Using microphone recording…');
            startMediaRecorder(onTranscript, onInterim);
            return;
          }
          return startBrowserRecognitionRef.current?.(onTranscript, onInterim, 'en-US') || false;
        }

        if (event.error === 'network' && serverTranscription) {
          setVoiceError('Browser speech unavailable. Switching to microphone recording…');
          try {
            rec.abort();
          } catch {
            // ignore
          }
          recognitionRef.current = null;
          setListening(false);
          startMediaRecorder(onTranscript, onInterim);
          return;
        }

        const messages = {
          'not-allowed': 'Microphone blocked. Allow mic access in browser settings.',
          'no-speech': 'No speech detected. Speak louder or move closer to the mic.',
          'audio-capture': 'No microphone found.',
          network: 'Speech service blocked. Add OPENAI_API_KEY for reliable voice, or check internet.',
        };
        setVoiceError(messages[event.error] || `Voice error (${event.error}). Type your answer.`);
      };

      rec.onend = () => {
        recognitionRef.current = null;
        setListening(false);
        finishBrowserSession(onTranscript);
      };

      try {
        rec.start();
        return true;
      } catch {
        recognitionRef.current = null;
        setListening(false);
        return false;
      }
    },
    [speechLang, language, finishBrowserSession, serverTranscription, startMediaRecorder]
  );

  useEffect(() => {
    startBrowserRecognitionRef.current = startBrowserRecognition;
  }, [startBrowserRecognition]);

  const toggleListening = useCallback(
    async (onTranscript, onInterim) => {
      callbacksRef.current = { onFinal: onTranscript, onInterim };
      triedEnglishSrRef.current = false;

      if (recognitionRef.current || recording) {
        stopBrowserRecognition();
        stopRecording();
        return;
      }

      setVoiceError('');
      await unlockAudioPlayback();

      if (!window.isSecureContext) {
        setVoiceError('Voice input needs https:// or http://localhost. Open the site via localhost, not a raw IP address.');
        return;
      }

      await refreshCapabilities();

      const onFinal = onTranscript || callbacksRef.current.onFinal;
      const onLive = onInterim || callbacksRef.current.onInterim;
      const whisper = serverTranscriptionRef.current;
      const strategy = pickVoiceStrategy(language, whisper, browserSr);

      if (strategy === 'whisper' && whisper) {
        startMediaRecorder(onFinal, onLive);
        return;
      }

      if (browserSr) {
        const started = startBrowserRecognition(onFinal, onLive);
        if (started) return;
      }

      if (whisper) {
        startMediaRecorder(onFinal, onLive);
        return;
      }

      if (browserSr) {
        startBrowserRecognition(onFinal, onLive);
        return;
      }

      if (navigator.mediaDevices?.getUserMedia) {
        setVoiceError(
          'Checking microphone… If this fails, set OPENAI_API_KEY in backend/.env and restart npm run dev (or add it on Render/hosting env vars).'
        );
        startMediaRecorder(onFinal, onLive);
        return;
      }

      setVoiceError(
        'Voice unavailable. Use Chrome or Edge, allow microphone access, and set OPENAI_API_KEY in backend/.env then restart the server.'
      );
    },
    [
      refreshCapabilities,
      language,
      browserSr,
      recording,
      stopBrowserRecognition,
      stopRecording,
      startBrowserRecognition,
      startMediaRecorder,
    ]
  );

  return {
    listening: listening || recording,
    recording,
    voiceError,
    setVoiceError,
    toggleListening,
    speechSupported: browserSr || serverTranscription,
    mode: inputMode,
    serverTranscription,
  };
}
