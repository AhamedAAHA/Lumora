const User = require('../models/User');
const InterviewSession = require('../models/InterviewSession');
const Interview = require('../models/Interview');
const InterviewResult = require('../models/InterviewResult');
const Candidate = require('../models/Candidate');
const Notification = require('../models/Notification');
const { getUnifiedAdminAnalytics, normalizeScore } = require('./unifiedAnalytics');

function weekAgo() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

function growthLabel(current, previous) {
  if (!previous) return current > 0 ? '+100% vs last week' : 'No activity last week';
  const pct = Math.round(((current - previous) / previous) * 100);
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct}% vs last week`;
}

function chartFromScores(scores, fallback = [20, 35, 30, 45, 40, 55, 50]) {
  if (!scores.length) return fallback;
  const slice = scores.slice(-7);
  while (slice.length < 7) slice.unshift(slice[0] || 30);
  return slice.map((s) => Math.min(100, Math.max(8, s)));
}

async function getCandidateLiveDashboard(userId) {
  const [assigned, completed, notifications] = await Promise.all([
    InterviewSession.find({ candidateId: userId, status: 'active' }).sort({ createdAt: -1 }),
    InterviewSession.find({ candidateId: userId, status: 'completed' }).sort({ createdAt: -1 }),
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(5),
  ]);

  const scores = completed.map((s) => normalizeScore(s.overallScore)).filter((s) => s > 0);
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const thisWeek = completed.filter((s) => new Date(s.createdAt) >= weekAgo()).length;
  const lastWeek = completed.filter((s) => {
    const d = new Date(s.createdAt);
    return d >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) && d < weekAgo();
  }).length;

  const weakAreas = [];
  const strengths = [];
  completed.forEach((s) => {
    const score = normalizeScore(s.overallScore);
    if (score < 60) weakAreas.push(`${s.round} round — improve practice`);
    else strengths.push(`Strong ${s.round} round (${score}%)`);
  });

  const queue = [
    ...assigned.map(
      (s) => `Attend ${s.round} interview — ${s.totalQuestions - s.questionIndex} questions left`
    ),
    ...notifications.slice(0, 2).map((n) => n.message),
  ].slice(0, 4);

  const blockers = weakAreas.slice(0, 3).map((text) => ({
    tag: 'Focus',
    text,
  }));
  if (!blockers.length && assigned.length) {
    blockers.push({ tag: 'Ready', text: `${assigned.length} interview(s) waiting for you` });
  }

  const calendar = assigned.slice(0, 4).map((s) => ({
    time: new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    label: `${s.round} round — ${s.personality?.replace(/_/g, ' ') || 'AI interview'}`,
  }));

  const alerts = notifications
    .filter((n) => !n.read)
    .slice(0, 3)
    .map((n) => n.message);

  const pendingResume = assigned.find((s) => !s.resumeUploaded);
  const aiTask = pendingResume
    ? `Upload resume before starting ${pendingResume.round} interview`
    : assigned[0]
      ? 'Your AI interviewer is ready when you are'
      : 'No pending AI tasks';

  return {
    pulse: String(assigned.length || scores.length || 0),
    pulseSuffix: assigned.length ? ' active' : scores.length ? ' done' : '',
    onTrack: avgScore || (assigned.length ? 50 : 0),
    growthText: growthLabel(thisWeek, lastWeek),
    chartBars: chartFromScores(scores),
    queue: queue.length ? queue : ['No action items — check back after admin assigns an interview'],
    blockers: blockers.length ? blockers : [{ tag: 'Tip', text: 'Complete interviews to unlock insights' }],
    summary: `You have ${assigned.length} active and ${completed.length} completed interviews. ${
      scores.length ? `Average score ${avgScore}%.` : 'Start your first interview to build your track record.'
    } ${strengths[0] ? strengths[0] + '.' : ''}`,
    calendar: calendar.length ? calendar : [{ time: '—', label: 'No scheduled sessions' }],
    alerts: alerts.length ? alerts : ['No new alerts'],
    aiTask,
    live: true,
    updatedAt: new Date().toISOString(),
  };
}

async function getAdminLiveDashboard(userId) {
  const analytics = await getUnifiedAdminAnalytics();
  const [interviews, notifications, activeSessions] = await Promise.all([
    Interview.find().sort({ createdAt: -1 }).limit(12),
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(5),
    InterviewSession.find({ status: 'active' }).populate('candidateId', 'name'),
  ]);

  const needsPin = interviews.filter((i) => i.status === 'scheduled' && !i.pinCode);
  const chartBars = chartFromScores(
    (analytics.scoreTrend || []).map((p) => p.score),
    [30, 45, 40, 55, 50, 65, analytics.avgPerformance || 45]
  );

  const queue = [
    ...needsPin.slice(0, 2).map((i) => `Generate PIN for ${i.candidateName} — ${i.title}`),
    ...(analytics.mostFailedQuestions || []).slice(0, 1).map((q) => `Review failing question: ${q.question.slice(0, 50)}…`),
    ...notifications.slice(0, 2).map((n) => n.message),
  ].slice(0, 4);

  const blockers = (analytics.mostFailedQuestions || []).slice(0, 2).map((q) => ({
    tag: 'Risk',
    text: `${q.failRate}% fail — ${q.question.slice(0, 60)}`,
  }));

  const calendar = [
    ...activeSessions.slice(0, 3).map((s) => ({
      time: 'Live',
      label: `${s.candidateId?.name || 'Candidate'} — ${s.round} round`,
    })),
    ...interviews
      .filter((i) => i.status === 'active' && i.pinCode)
      .slice(0, 2)
      .map((i) => ({
        time: i.pinCode,
        label: `${i.candidateName} — PIN interview`,
      })),
  ].slice(0, 4);

  const completed = analytics.completedCount || 0;
  const total = analytics.totalInterviews || 1;

  return {
    pulse: String(analytics.completedCount || analytics.activeInterviews || 0),
    pulseSuffix: ' done',
    onTrack: analytics.successRate ?? analytics.avgPerformance ?? 0,
    growthText: growthLabel(analytics.completedCount, Math.max(0, completed - 2)),
    chartBars,
    queue: queue.length ? queue : ['All caught up — create a new PIN interview'],
    blockers: blockers.length ? blockers : [{ tag: 'OK', text: 'No critical question failures' }],
    summary: `${completed} interviews completed across the platform. Average performance ${analytics.avgPerformance}%. ${analytics.successRate}% selection rate. ${analytics.totalCandidates} candidates in system.`,
    calendar: calendar.length ? calendar : [{ time: '—', label: 'No live sessions' }],
    alerts: notifications.length
      ? notifications.map((n) => n.message)
      : [`${needsPin.length} interviews need PIN generation`],
    aiTask: needsPin[0]
      ? `Generate PIN for ${needsPin[0].candidateName}`
      : 'Monitor candidate completion rates',
    live: true,
    updatedAt: new Date().toISOString(),
  };
}

async function getPublicPreviewDashboard() {
  const analytics = await getUnifiedAdminAnalytics();
  const active = await InterviewSession.countDocuments({ status: 'active' });
  const candidateCount = await User.countDocuments({ role: 'candidate' });

  return {
    pulse: String(analytics.completedCount || active || 0),
    pulseSuffix: '',
    onTrack: analytics.avgPerformance || 0,
    growthText: `+${analytics.successRate || 0}% selection rate`,
    chartBars: chartFromScores((analytics.scoreTrend || []).map((p) => p.score)),
    queue: (analytics.topCandidates || []).slice(0, 3).map(
      (c) => `${c.name} — ${c.score}% average`
    ),
    blockers: (analytics.mostFailedQuestions || []).slice(0, 2).map((q) => ({
      tag: 'Risk',
      text: q.question.slice(0, 70),
    })),
    summary: `Lumora processed ${analytics.completedCount || 0} interviews with ${candidateCount} candidates. ${analytics.successRate || 0}% shortlisted or selected.`,
    calendar: [
      { time: 'Live', label: `${active} active interview sessions` },
      { time: 'PIN', label: 'Candidate access at /pin' },
    ],
    alerts: [`${analytics.completedCount || 0} reports available`, 'Real-time AI analytics enabled'],
    aiTask: 'Sign in to manage interviews',
    live: true,
    updatedAt: new Date().toISOString(),
  };
}

module.exports = {
  getCandidateLiveDashboard,
  getAdminLiveDashboard,
  getPublicPreviewDashboard,
};
