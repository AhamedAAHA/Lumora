const LANG_BCP47 = { en: 'en-US', ta: 'ta-IN', si: 'si-LK' };

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

/**
 * Read question aloud using built-in browser TTS (works without ElevenLabs).
 * @returns {Promise<boolean>} true if playback started
 */
export function speakWithBrowser(text, language = 'en') {
  return new Promise((resolve) => {
    if (!isBrowserTtsSupported() || !text?.trim()) {
      resolve(false);
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = speechLangCode(language);
    utterance.rate = 0.95;
    utterance.pitch = 1;

    const voices = synth.getVoices();
    const preferred = voices.find((v) => v.lang.startsWith(speechLangCode(language).split('-')[0]));
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);

    synth.speak(utterance);
    if (!synth.speaking && !synth.pending) {
      window.setTimeout(() => resolve(synth.speaking || synth.pending), 120);
    }
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
