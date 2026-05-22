const axios = require('axios');
const fs = require('fs');
const path = require('path');

const VOICE_MAP = {
  friendly_hr: process.env.VOICE_FRIENDLY_HR,
  strict_corporate: process.env.VOICE_STRICT_CORPORATE,
  senior_engineer: process.env.VOICE_SENIOR_ENGINEER,
  startup_founder: process.env.VOICE_STARTUP_FOUNDER,
  technical_lead: process.env.VOICE_TECHNICAL_LEAD,
};

async function synthesizeSpeech(text, personality = 'friendly_hr', language = 'en') {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  const voiceId =
    process.env.ELEVENLABS_VOICE_ID ||
    VOICE_MAP[personality] ||
    VOICE_MAP.friendly_hr;
  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
      }
    );

    const outDir = path.join(__dirname, '../public/audio');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const filename = `${Date.now()}-${language}.mp3`;
    const filepath = path.join(outDir, filename);
    fs.writeFileSync(filepath, response.data);
    return `/audio/${filename}`;
  } catch (err) {
    const detail = err.response?.data
      ? Buffer.from(err.response.data).toString().slice(0, 200)
      : err.message;
    console.error('ElevenLabs error:', detail);
    return null;
  }
}

module.exports = { synthesizeSpeech };
