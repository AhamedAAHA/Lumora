import { useCallback, useEffect, useRef } from 'react';
import pinApi from '../lib/pinApi';
import { isMobileDevice, unlockAudioPlayback } from '../lib/deviceUtils';
import { speakWithBrowser, stopBrowserSpeech, warmBrowserVoices } from '../lib/speech';

function resolveAudioUrl(audioUrl, apiBaseUrl) {
  if (/^https?:\/\//i.test(audioUrl) || !/^https?:\/\//i.test(apiBaseUrl || '')) {
    return audioUrl;
  }

  return new URL(audioUrl, new URL(apiBaseUrl).origin).toString();
}

function createAudioElement(url) {
  const audio = new Audio(url);
  audio.setAttribute('playsinline', 'true');
  audio.setAttribute('webkit-playsinline', 'true');
  audio.preload = 'auto';
  return audio;
}

/**
 * Read questions immediately in the browser and use generated MP3 only if local TTS fails.
 * This keeps free hosted API wake-ups out of the primary playback path.
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
    async (text, { userGesture = false } = {}) => {
      if (!text?.trim()) return { ok: false, source: 'none', needsUserGesture: false };

      if (userGesture) {
        await unlockAudioPlayback();
      }

      stop();

      if (isMobileDevice() && !userGesture) {
        return { ok: false, source: 'none', needsUserGesture: true };
      }

      const browserSpoke = await speakWithBrowser(text, language);
      if (browserSpoke) return { ok: true, source: 'browser', needsUserGesture: false };

      try {
        const { data } = await http.post(endpoint, {
          text: text.trim(),
          personality,
          language,
        });

        if (data.audioUrl && !data.fallback) {
          const url = resolveAudioUrl(data.audioUrl, http.defaults?.baseURL);
          const audio = createAudioElement(url);
          audioRef.current = audio;

          try {
            await new Promise((resolve, reject) => {
              audio.onended = () => resolve();
              audio.onerror = () => reject(new Error('audio-playback'));
              audio.play().catch(reject);
            });
            return { ok: true, source: 'api', needsUserGesture: false };
          } catch (playErr) {
            if (playErr?.name === 'NotAllowedError' || playErr?.message === 'audio-playback') {
              return { ok: false, source: 'api', needsUserGesture: true };
            }
          }
        }
      } catch {
        // fall through to browser TTS
      }

      return { ok: false, source: 'none', needsUserGesture: !userGesture };
    },
    [language, personality, stop, http, endpoint]
  );

  return { play, stop };
}
