const LANG_BCP47 = { en: 'en-US', ta: 'ta-IN', si: 'si-LK' };

/** Alternate BCP-47 tags when OS has no exact voice */
const LANG_FALLBACKS = {
  ta: ['ta-IN', 'ta-LK', 'ta'],
  si: ['si-LK', 'si'],
  en: ['en-US', 'en-GB', 'en'],
};

export function speechLangCode(language) {
  return LANG_BCP47[language] || 'en-US';
}

/** Web Speech API recognition (Chrome, Edge, Safari 14.1+) */
export function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognition()) && (window.isSecureContext ?? true);
}

export function isBrowserTtsSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function waitForVoices(timeoutMs = 2500) {
  return new Promise((resolve) => {
    if (!isBrowserTtsSupported()) {
      resolve([]);
      return;
    }
    const synth = window.speechSynthesis;
    let voices = synth.getVoices();
    if (voices.length) {
      resolve(voices);
      return;
    }
    const done = () => {
      voices = synth.getVoices();
      if (voices.length) {
        synth.removeEventListener?.('voiceschanged', onChange);
        clearTimeout(timer);
        resolve(voices);
      }
    };
    const onChange = () => done();
    const timer = window.setTimeout(() => {
      synth.removeEventListener?.('voiceschanged', onChange);
      resolve(synth.getVoices());
    }, timeoutMs);
    synth.addEventListener?.('voiceschanged', onChange);
    synth.getVoices();
  });
}

function pickVoice(voices, language) {
  const tags = LANG_FALLBACKS[language] || [speechLangCode(language)];
  for (const tag of tags) {
    const prefix = tag.split('-')[0];
    const exact = voices.find((v) => v.lang === tag || v.lang.replace('_', '-') === tag);
    if (exact) return exact;
    const partial = voices.find((v) => v.lang.startsWith(prefix));
    if (partial) return partial;
  }
  return null;
}

/**
 * Read question aloud using built-in browser TTS (works without ElevenLabs).
 * @returns {Promise<boolean>} true if playback started
 */
export async function speakWithBrowser(text, language = 'en') {
  if (!isBrowserTtsSupported() || !text?.trim()) return false;

  const synth = window.speechSynthesis;
  synth.cancel();

  const voices = await waitForVoices();
  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.lang = speechLangCode(language);
  utterance.rate = language === 'en' ? 0.95 : 0.9;
  utterance.pitch = 1;

  const preferred = pickVoice(voices, language);
  if (preferred) utterance.voice = preferred;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    utterance.onend = () => finish(true);
    utterance.onerror = () => finish(false);

    synth.speak(utterance);

    window.setTimeout(() => {
      if (synth.speaking || synth.pending) return;
      finish(false);
    }, 400);
  });
}

export function stopBrowserSpeech() {
  window.speechSynthesis?.cancel();
}

/** Prime voice list (Chrome loads voices async) */
export function warmBrowserVoices() {
  if (!isBrowserTtsSupported()) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}
