const express = require('express');
const InterviewSession = require('../models/InterviewSession');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/candidate', protect, async (req, res) => {
  const sessions = await InterviewSession.find({
    candidateId: req.user._id,
    status: 'completed',
  }).sort({ createdAt: 1 });

  const scoreHistory = sessions.map((s) => ({
    overall: s.overallScore,
    confidence:
      s.answers.reduce((a, x) => a + (x.metrics?.confidence || 0), 0) /
        Math.max(s.answers.length, 1) || 0,
    date: s.createdAt,
  }));

  const avgScore = sessions.length
    ? Math.round(sessions.reduce((a, s) => a + s.overallScore, 0) / sessions.length)
    : 0;

  const weakAreas = [];
  const strengths = [];
  sessions.forEach((s) => {
    if (s.overallScore < 60) weakAreas.push(`${s.round} round performance`);
    else strengths.push(`Strong ${s.round} interview`);
  });

  res.json({
    avgScore,
    scoreHistory,
    weakAreas:
      [...new Set(weakAreas)].slice(0, 5).length > 0
        ? [...new Set(weakAreas)].slice(0, 5)
        : ['Complete more interviews'],
    strengths:
      [...new Set(strengths)].slice(0, 5).length > 0
        ? [...new Set(strengths)].slice(0, 5)
        : ['Getting started'],
  });
});

router.get('/admin', protect, authorize('admin'), async (req, res) => {
  const sessions = await InterviewSession.find({ status: 'completed' });
  const candidates = await User.find({ role: 'candidate' });

  const avgPerformance = sessions.length
    ? Math.round(sessions.reduce((a, s) => a + s.overallScore, 0) / sessions.length)
    : 0;

  const selected = sessions.filter((s) => s.recommendation === 'selected').length;
  const successRate = sessions.length ? Math.round((selected / sessions.length) * 100) : 0;

  const questionFails = {};
  sessions.forEach((s) => {
    s.answers.forEach((a) => {
      if ((a.aiScore || 0) < 50) {
        questionFails[a.question] = (questionFails[a.question] || 0) + 1;
      }
    });
  });

  const mostFailedQuestions = Object.entries(questionFails)
    .map(([question, count]) => ({
      question,
      failRate: Math.round((count / sessions.length) * 100) || count * 10,
    }))
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, 5);

  const candidateScores = {};
  sessions.forEach((s) => {
    const id = s.candidateId.toString();
    if (!candidateScores[id]) candidateScores[id] = [];
    candidateScores[id].push(s.overallScore);
  });

  const topCandidates = await Promise.all(
    Object.entries(candidateScores)
      .map(([id, scores]) => ({
        id,
        score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(async ({ id, score }) => {
        const u = await User.findById(id);
        return { name: u?.name || 'Candidate', score };
      })
  );

  const recCounts = {};
  sessions.forEach((s) => {
    const r = s.recommendation || 'needs_improvement';
    recCounts[r] = (recCounts[r] || 0) + 1;
  });

  const recommendationBreakdown = Object.entries(recCounts).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  res.json({
    avgPerformance,
    successRate,
    totalInterviews: sessions.length,
    totalCandidates: candidates.length,
    mostFailedQuestions,
    topCandidates,
    recommendationBreakdown,
  });
});

module.exports = router;
