import { useCallback, useEffect, useRef } from 'react';
import pinApi from '../lib/pinApi';
import { speakWithBrowser, stopBrowserSpeech, warmBrowserVoices } from '../lib/speech';

function resolveAudioUrl(audioUrl, apiBaseUrl) {
  if (/^https?:\/\//i.test(audioUrl) || !/^https?:\/\//i.test(apiBaseUrl || '')) {
    return audioUrl;
  }

  return new URL(audioUrl, new URL(apiBaseUrl).origin).toString();
}

/**
 * Play interview question: ElevenLabs/OpenAI MP3 via API, then browser TTS fallback.
 */
export function useQuestionAudio({
  language = 'en',
  personality = 'friendly_hr',
  http = pinApi,
  endpoint = '/voice/generate-question-audio',
} = {}) {
  const audioRef = useRef(null);

  useEffect(() => {
    warmBrowserVoices();
    return () => {
      audioRef.current?.pause();
      stopBrowserSpeech();
    };
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    stopBrowserSpeech();
  }, []);

  const play = useCallback(
    async (text) => {
      if (!text?.trim()) return { ok: false, source: 'none' };

      stop();

      try {
        const { data } = await http.post(endpoint, {
          text: text.trim(),
          personality,
          language,
        });

        if (data.audioUrl && !data.fallback) {
          const url = resolveAudioUrl(data.audioUrl, http.defaults?.baseURL);

          const audio = new Audio(url);
          audioRef.current = audio;

          await new Promise((resolve, reject) => {
            audio.onended = () => resolve();
            audio.onerror = () => reject(new Error('audio-playback'));
            audio.play().catch(reject);
          });
          return { ok: true, source: 'api' };
        }
      } catch {
        // fall through to browser TTS
      }

      const spoke = await speakWithBrowser(text, language);
      if (spoke) return { ok: true, source: 'browser' };

      return { ok: false, source: 'none' };
    },
    [language, personality, stop, http, endpoint]
  );

  return { play, stop };
}
