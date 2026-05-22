const InterviewSession = require('../models/InterviewSession');
const InterviewResult = require('../models/InterviewResult');
const CandidateAnswer = require('../models/CandidateAnswer');
const Report = require('../models/Report');
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const Interview = require('../models/Interview');

/** Normalize legacy 0–10 scores to 0–100 for display */
function normalizeScore(score) {
  if (score == null || Number.isNaN(Number(score))) return 0;
  const n = Number(score);
  if (n > 0 && n <= 10) return Math.round(n * 10);
  return Math.round(Math.min(100, Math.max(0, n)));
}

async function getUnifiedAdminAnalytics() {
  const [sessions, results, candidates, pinCandidates, interviews, sessionCount] = await Promise.all([
    InterviewSession.find({ status: 'completed' }).lean(),
    InterviewResult.find().lean(),
    User.find({ role: 'candidate' }).select('_id name email').lean(),
    Candidate.find().lean(),
    Interview.find().lean(),
    InterviewSession.countDocuments(),
  ]);

  const reports = await Report.find().select('candidateId sessionId overallScore recommendation').lean();
  const reportBySession = new Map(
    reports.filter((r) => r.sessionId).map((r) => [String(r.sessionId), r])
  );

  const pinById = new Map(pinCandidates.map((c) => [String(c._id), c]));
  const candidateScores = new Map();

  sessions.forEach((s) => {
    const id = String(s.candidateId);
    const report = reportBySession.get(String(s._id));
    const score = normalizeScore(s.overallScore ?? report?.overallScore);
    if (!candidateScores.has(id)) candidateScores.set(id, []);
    candidateScores.get(id).push(score);
  });

  results.forEach((r) => {
    const cand = pinById.get(String(r.candidateId));
    const key = cand?.email?.toLowerCase() || `pin-${r.candidateId}`;
    const score = normalizeScore(r.overallScore);
    if (!candidateScores.has(key)) candidateScores.set(key, []);
    candidateScores.get(key).push(score);
  });

  const userById = new Map(candidates.map((u) => [String(u._id), u]));
  const topEntries = [...candidateScores.entries()]
    .map(([id, scores]) => ({
      id,
      score: scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const topCandidates = topEntries.map(({ id, score }) => {
    if (id.includes('@')) {
      const cand = pinCandidates.find((c) => c.email?.toLowerCase() === id);
      return { name: cand?.name || id.split('@')[0], score };
    }
    if (id.startsWith('pin-')) {
      const cand = pinById.get(id.replace('pin-', ''));
      return { name: cand?.name || 'Candidate', score };
    }
    const u = userById.get(id);
    return { name: u?.name || 'Candidate', score };
  });

  const questionFails = {};
  const addFail = (q, score) => {
    if ((score || 0) < 5) {
      const key = (q || 'Unknown').slice(0, 120);
      questionFails[key] = (questionFails[key] || 0) + 1;
    }
  };

  sessions.forEach((s) => (s.answers || []).forEach((a) => addFail(a.question, a.aiScore)));
  const pinAnswers = await CandidateAnswer.find().select('questionText aiScore').lean();
  pinAnswers.forEach((a) => addFail(a.questionText, a.aiScore));

  const totalCompleted = sessions.length + results.length;
  const mostFailedQuestions = Object.entries(questionFails)
    .map(([question, count]) => ({
      question,
      failRate: totalCompleted
        ? Math.min(100, Math.round((count / totalCompleted) * 100) || count * 15)
        : 0,
    }))
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, 5);

  const allScores = [
    ...sessions.map((s) =>
      normalizeScore(s.overallScore ?? reportBySession.get(String(s._id))?.overallScore)
    ),
    ...results.map((r) => normalizeScore(r.overallScore)),
  ].filter((s) => s > 0);

  const avgPerformance = allScores.length
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;

  const recCounts = {};
  sessions.forEach((s) => {
    const r = String(s.recommendation || 'needs_improvement').toLowerCase();
    recCounts[r] = (recCounts[r] || 0) + 1;
  });
  results.forEach((r) => {
    const key = String(r.recommendation || 'needs_improvement')
      .toLowerCase()
      .replace(/\s+/g, '_');
    recCounts[key] = (recCounts[key] || 0) + 1;
  });

  const selected = (recCounts.selected || 0) + (recCounts.Selected || 0);
  const successRate = totalCompleted ? Math.round((selected / totalCompleted) * 100) : 0;

  const recommendationBreakdown = Object.entries(recCounts).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  const scoreTrend = [
    ...sessions.map((s) => ({
      at: new Date(s.createdAt),
      score: normalizeScore(s.overallScore ?? reportBySession.get(String(s._id))?.overallScore),
    })),
    ...results.map((r) => ({
      at: new Date(r.createdAt),
      score: normalizeScore(r.overallScore),
    })),
  ]
    .sort((a, b) => a.at - b.at)
    .slice(-12)
    .map((item, i) => ({ label: `#${i + 1}`, score: item.score }));

  return {
    avgPerformance,
    successRate,
    totalInterviews: interviews.length + sessionCount,
    totalCandidates: candidates.length,
    completedCount: totalCompleted,
    mostFailedQuestions,
    topCandidates,
    recommendationBreakdown,
    scoreTrend,
  };
}

module.exports = { getUnifiedAdminAnalytics, normalizeScore };
