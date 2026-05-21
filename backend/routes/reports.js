const express = require('express');
const Report = require('../models/Report');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/:id', protect, async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report || report.candidateId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ message: 'Report not found' });
  }
  res.json(report);
});

module.exports = router;
