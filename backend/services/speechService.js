const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { toFile } = require('openai');

let openai = null;

function isPlaceholderKey(key) {
  if (!key || typeof key !== 'string') return true;
  const k = key.trim().toLowerCase();
  const placeholderHints = [
    'your-openai',
    'your-full-key',
    'paste-your',
    'paste-what',
    'sk-your',
    'xxxxxxxx',
    'changeme',
    'example',
    'replace',
  ];
  if (placeholderHints.some((hint) => k.includes(hint))) return true;
  // Real OpenAI keys are long (typically 80+ chars for sk-proj-...)
  return k.length < 40;
}

function isOpenAiConfigured() {
  return !isPlaceholderKey(process.env.OPENAI_API_KEY);
}

function getClient() {
  if (!isOpenAiConfigured()) return null;
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY.trim() });
  return openai;
}

const KNOWN_SILENCE_TRANSCRIPTS = new Set([
  'வணக்கம் அனைவருக்கும் வாழ்த்துக்கள்',
  'thank you for watching',
]);

function isKnownSilenceTranscript(text) {
  const normalized = String(text || '')
    .toLowerCase()
    .replace(/[.,!?;:'"…]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return KNOWN_SILENCE_TRANSCRIPTS.has(normalized);
}

/** OpenAI TTS fallback when ElevenLabs is unavailable */
async function synthesizeOpenAI(text, language = 'en') {
  const client = getClient();
  if (!client || !text?.trim()) return null;

  try {
    const response = await client.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: text.trim().slice(0, 4096),
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    const outDir = path.join(__dirname, '../public/audio');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const filename = `${Date.now()}-${language}-openai.mp3`;
    fs.writeFileSync(path.join(outDir, filename), buffer);
    return `/audio/${filename}`;
  } catch {
    return null;
  }
}

/** Whisper transcription when browser SpeechRecognition is unavailable */
async function transcribeAudio(buffer, language = 'en', mimeType = 'audio/webm') {
  const client = getClient();
  if (!client) {
    return { text: '', error: 'OPENAI_NOT_CONFIGURED' };
  }
  if (!buffer?.length) {
    return { text: '', error: 'EMPTY_AUDIO' };
  }

  const ext =
    mimeType.includes('mpeg') || mimeType.includes('mp3')
      ? 'mp3'
      : mimeType.includes('mp4') || mimeType.includes('m4a')
        ? 'mp4'
        : mimeType.includes('ogg')
          ? 'ogg'
          : mimeType.includes('wav')
            ? 'wav'
            : 'webm';
  const languageCode = { en: 'en', ta: 'ta', si: 'si' }[language];

  try {
    const file = await toFile(buffer, `answer.${ext}`, { type: mimeType || `audio/${ext}` });
    const result = await client.audio.transcriptions.create({
      file,
      model: 'gpt-4o-mini-transcribe',
      ...(languageCode ? { language: languageCode } : {}),
      chunking_strategy: 'auto',
    });
    const text = String(result.text || '').trim();
    if (!text || isKnownSilenceTranscript(text)) return { text: '', error: 'NO_SPEECH' };
    return { text, error: null };
  } catch (err) {
    return { text: '', error: err.message || 'WHISPER_FAILED' };
  }
}

module.exports = {
  synthesizeOpenAI,
  transcribeAudio,
  isOpenAiConfigured,
  isPlaceholderKey,
};
