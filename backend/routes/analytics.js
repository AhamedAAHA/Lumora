const express = require('express');
const InterviewSession = require('../models/InterviewSession');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { getUnifiedAdminAnalytics, normalizeScore } = require('../services/unifiedAnalytics');
const {
  getCandidateLiveDashboard,
  getAdminLiveDashboard,
  getPublicPreviewDashboard,
} = require('../services/dashboardLive');

const router = express.Router();

/** Live OS dashboard widgets (poll every 15–30s) */
router.get('/live', protect, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.json(await getAdminLiveDashboard(req.user._id));
    }
    return res.json(await getCandidateLiveDashboard(req.user._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** Public preview on marketing page */
router.get('/preview', async (_req, res) => {
  try {
    res.json(await getPublicPreviewDashboard());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/candidate', protect, async (req, res) => {
  const sessions = await InterviewSession.find({
    candidateId: req.user._id,
    status: 'completed',
  }).sort({ createdAt: 1 });

  const scoreHistory = sessions.map((s) => ({
    overall: normalizeScore(s.overallScore),
    confidence:
      s.answers.reduce((a, x) => a + (x.metrics?.confidence || 0), 0) /
        Math.max(s.answers.length, 1) || 0,
    date: s.createdAt,
  }));

  const scores = sessions.map((s) => normalizeScore(s.overallScore)).filter((s) => s > 0);
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const weakAreas = [];
  const strengths = [];
  sessions.forEach((s) => {
    const score = normalizeScore(s.overallScore);
    if (score < 60) weakAreas.push(`${s.round} round performance`);
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

router.get('/admin', protect, authorize('admin'), async (_req, res) => {
  const data = await getUnifiedAdminAnalytics();
  res.json({
    avgPerformance: data.avgPerformance,
    successRate: data.successRate,
    totalInterviews: data.totalInterviews,
    totalCandidates: data.totalCandidates,
    completedCount: data.completedCount,
    mostFailedQuestions: data.mostFailedQuestions,
    topCandidates: data.topCandidates,
    recommendationBreakdown: data.recommendationBreakdown,
    scoreTrend: data.scoreTrend,
  });
});

module.exports = router;
