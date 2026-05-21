const express = require('express');
const fs = require('fs');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { parseResumePdf } = require('../services/resumeParser');
const Resume = require('../models/Resume');

const router = express.Router();

router.post('/parse', protect, (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'PDF required' });
    }
    const data = await parseResumePdf(req.file.path);
    await Resume.create({
      candidateId: req.user._id,
      fileName: req.file.originalname,
      skills: data.skills || [],
      education: data.education || [],
      projects: data.projects || [],
      experience: data.experience || [],
    });
    fs.unlink(req.file.path, () => {});
    res.json(data);
  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    const msg = err.message || 'Failed to parse PDF';
    const isInvalidPdf = /invalid pdf|pdf structure/i.test(msg);
    res.status(isInvalidPdf ? 400 : 500).json({
      message: isInvalidPdf
        ? 'Could not read this PDF. Try exporting it again from Word/Google Docs as PDF.'
        : msg,
    });
  }
});

router.get('/mine', protect, async (req, res) => {
  const resumes = await Resume.find({ candidateId: req.user._id }).sort({ createdAt: -1 }).limit(10);
  res.json(resumes);
});

module.exports = router;
