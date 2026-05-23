const express = require('express');
const { protect } = require('../middleware/auth');
const { synthesizeSpeech } = require('../services/elevenLabsService');
const { synthesizeOpenAI } = require('../services/speechService');

const router = express.Router();

router.post('/speak', protect, async (req, res) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'Question text required' });

    const personality = req.body.personality || 'friendly_hr';
    const language = req.body.language || 'en';

    let audioPath = await synthesizeSpeech(text, personality, language);
    if (!audioPath) audioPath = await synthesizeOpenAI(text, language);

    if (!audioPath) {
      return res.json({
        audioUrl: null,
        fallback: true,
        useBrowserTts: true,
        message: 'Using browser voice — click Play question if needed.',
      });
    }

    res.json({ audioUrl: audioPath, fallback: false, useBrowserTts: false });
  } catch (err) {
    res.status(500).json({
      audioUrl: null,
      fallback: true,
      useBrowserTts: true,
      message: err.message,
    });
  }
});

module.exports = router;
