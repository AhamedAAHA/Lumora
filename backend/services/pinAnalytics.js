const Interview = require('../models/Interview');
const { normalizeScore } = require('./unifiedAnalytics');
const Candidate = require('../models/Candidate');
const CandidateAnswer = require('../models/CandidateAnswer');
const InterviewResult = require('../models/InterviewResult');

async function getPinAdminAnalytics() {
  const interviews = await Interview.find();
  const results = await InterviewResult.find();
  const answers = await CandidateAnswer.find();

  const completed = interviews.filter((i) => i.status === 'completed');
  const avgPerformance = results.length
    ? Math.round(results.reduce((s, r) => s + r.overallScore, 0) / results.length)
    : 0;

  const selected = results.filter((r) => r.recommendation === 'Selected').length;
  const successRate = results.length ? Math.round((selected / results.length) * 100) : 0;

  const questionFails = {};
  answers.forEach((a) => {
    if ((a.aiScore || 0) < 5) {
      const q = a.questionText?.slice(0, 80) || 'Unknown';
      questionFails[q] = (questionFails[q] || 0) + 1;
    }
  });

  const mostFailedQuestions = Object.entries(questionFails)
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recCounts = {};
  results.forEach((r) => {
    const key = r.recommendation || 'Needs Improvement';
    recCounts[key] = (recCounts[key] || 0) + 1;
  });

  const recommendationBreakdown = Object.entries(recCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const topCandidates = results
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 6)
    .map(async (r) => {
      const c = await Candidate.findById(r.candidateId);
      const iv = await Interview.findById(r.interviewId);
      return {
        name: c?.name || 'Candidate',
        score: normalizeScore(r.overallScore),
        jobRole: iv?.jobRole,
        recommendation: r.recommendation,
      };
    });

  const scoreTrend = results
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-12)
    .map((r, i) => ({ label: `#${i + 1}`, score: r.overallScore }));

  return {
    totalInterviews: interviews.length,
    completedInterviews: completed.length,
    activeInterviews: interviews.filter((i) => i.status === 'active').length,
    avgPerformance,
    successRate,
    mostFailedQuestions,
    recommendationBreakdown,
    topCandidates: await Promise.all(topCandidates),
    scoreTrend,
  };
}

async function getCandidateHistory(email) {
  const candidates = await Candidate.find({ email: email.toLowerCase(), status: 'completed' })
    .sort({ createdAt: -1 })
    .limit(20);

  const history = await Promise.all(
    candidates.map(async (c) => {
      const iv = await Interview.findById(c.interviewId);
      const result = await InterviewResult.findOne({ interviewId: c.interviewId });
      return {
        title: iv?.title,
        jobRole: iv?.jobRole,
        completedAt: c.updatedAt,
        overallScore: result?.overallScore,
        technicalScore: result?.technicalScore,
        communicationScore: result?.communicationScore,
        confidenceScore: result?.confidenceScore,
        recommendation: result?.recommendation,
        strengths: result?.strengths || [],
        weaknesses: result?.weaknesses || [],
        metricsHistory: c.metricsHistory || [],
      };
    })
  );

  const scores = history.map((h) => h.overallScore).filter(Boolean);
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  return { avgScore, history, interviewCount: history.length };
}

module.exports = { getPinAdminAnalytics, getCandidateHistory };
