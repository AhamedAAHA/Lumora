const express = require('express');
const { protect } = require('../middleware/auth');
const { synthesizeSpeech } = require('../services/elevenLabsService');

const router = express.Router();

router.post('/speak', protect, async (req, res) => {
  try {
    const { text, personality, language } = req.body;
    const audioUrl = await synthesizeSpeech(text, personality, language);
    if (!audioUrl) {
      return res.json({ audioUrl: null, fallback: true });
    }
    const base = process.env.SERVER_URL || 'http://localhost:5173';
    res.json({ audioUrl: `${base}${audioUrl}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
