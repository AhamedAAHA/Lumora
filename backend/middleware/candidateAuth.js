const jwt = require('jsonwebtoken');
const Candidate = require('../models/Candidate');

async function protectCandidate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Candidate session required' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'candidate') {
      return res.status(401).json({ message: 'Invalid candidate session' });
    }
    const candidate = await Candidate.findById(decoded.candidateId);
    if (!candidate) return res.status(401).json({ message: 'Candidate not found' });
    req.candidate = candidate;
    req.interviewId = decoded.interviewId;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired session' });
  }
}

module.exports = { protectCandidate };
