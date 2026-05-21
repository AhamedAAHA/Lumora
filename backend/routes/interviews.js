const express = require('express');
const Answer = require('../models/Answer');
const InterviewSession = require('../models/InterviewSession');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');
const {
  generateFirstQuestion,
  evaluateAndRespond,
  generateCareerCoach,
  evaluateCode,
} = require('../services/aiService');
const { categorizeCandidate } = require('../services/recommendationEngine');

const router = express.Router();

router.post('/start', protect, authorize('candidate'), async (req, res) => {
  try {
    const { language, personality, round, includeCoding, resumeData } = req.body;
    const session = await InterviewSession.create({
      candidateId: req.user._id,
      language: language || 'en',
      personality: personality || 'friendly_hr',
      round: round || 'technical',
      includeCoding: !!includeCoding,
      resumeData: resumeData || {},
    });

    const first = await generateFirstQuestion(session);
    session.currentQuestion = first.question;
    session.lastComment = first.comment || '';
    await session.save();

    await Notification.create({
      userId: req.user._id,
      type: 'scheduled',
      message: `Your ${round} interview has started. Good luck!`,
      relatedSessionId: session._id,
    });

    res.status(201).json({ sessionId: session._id, session: formatSession(session) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/history', protect, authorize('candidate'), async (req, res) => {
  const sessions = await InterviewSession.find({
    candidateId: req.user._id,
    status: 'completed',
  })
    .sort({ createdAt: -1 })
    .select('round overallScore recommendation status createdAt reportId');
  res.json(sessions);
});

router.get('/assigned', protect, authorize('candidate'), async (req, res) => {
  const sessions = await InterviewSession.find({
    candidateId: req.user._id,
    status: 'active',
  })
    .sort({ createdAt: -1 })
    .select(
      'language personality round includeCoding totalQuestions questionIndex currentQuestion status createdAt resumeData'
    );

  res.json(
    sessions.map((session) => ({
      ...formatSession(session),
      createdAt: session.createdAt,
      hasResume: Boolean(
        session.resumeData?.skills?.length ||
          session.resumeData?.education?.length ||
          session.resumeData?.projects?.length ||
          session.resumeData?.experience?.length
      ),
    }))
  );
});

router.patch('/:id/resume', protect, authorize('candidate'), async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.id);
    if (!session || session.candidateId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (session.status !== 'active' || session.questionIndex > 0) {
      return res.status(400).json({ message: 'Resume can only be added before the interview starts' });
    }

    session.resumeData = req.body.resumeData || {};
    const first = await generateFirstQuestion(session);
    session.currentQuestion = first.question;
    session.lastComment = first.comment || '';
    await session.save();

    res.json(formatSession(session));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', protect, authorize('candidate'), async (req, res) => {
  const session = await InterviewSession.findById(req.params.id);
  if (!session || session.candidateId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ message: 'Session not found' });
  }
  if (session.status === 'draft' || session.status === 'archived') {
    return res.status(404).json({ message: 'Session not found' });
  }
  res.json(formatSession(session));
});

router.post('/:id/cheat', protect, async (req, res) => {
  const session = await InterviewSession.findById(req.params.id);
  if (!session || session.candidateId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ message: 'Not found' });
  }
  session.cheatEvents.push(req.body);
  await session.save();
  res.json({ ok: true });
});

router.post('/:id/answer', protect, authorize('candidate'), async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.id);
    if (!session || session.candidateId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Not found' });
    }
    if (session.status === 'completed') {
      return res.status(400).json({ message: 'Interview already completed' });
    }
    if (session.status !== 'active') {
      return res.status(400).json({ message: 'Interview is not available yet' });
    }

    const { answer, metrics, cheatEvents } = req.body;
    const evaluation = await evaluateAndRespond(session, answer, metrics);

    session.answers.push({
      question: session.currentQuestion,
      answer,
      metrics,
      aiScore: evaluation.score,
    });
    await Answer.create({
      sessionId: session._id,
      candidateId: req.user._id,
      question: session.currentQuestion,
      answer,
      metrics,
      aiScore: evaluation.score,
    });

    if (cheatEvents?.length) {
      session.cheatEvents.push(...cheatEvents);
    }

    session.difficulty = evaluation.nextDifficulty || session.difficulty;
    session.lastComment = evaluation.conversationalComment;

    let nextQ = evaluation.needsFollowUp
      ? evaluation.followUpQuestion
      : evaluation.nextQuestion;

    if (!nextQ) nextQ = evaluation.followUpQuestion;

    session.questionIndex += 1;

    const completed = session.questionIndex >= session.totalQuestions;

    if (completed) {
      const avgScore =
        session.answers.reduce((s, a) => s + (a.aiScore || 0), 0) / session.answers.length;
      const avgConf =
        session.answers.reduce((s, a) => s + (a.metrics?.confidence || 0), 0) /
        session.answers.length;
      const avgComm =
        session.answers.reduce((s, a) => s + (a.metrics?.communication || 0), 0) /
        session.answers.length;

      session.overallScore = Math.round(avgScore);
      session.recommendation = categorizeCandidate(avgScore, avgConf, avgScore);
      session.status = 'completed';

      const coach = await generateCareerCoach(
        session,
        { technical: avgScore, communication: avgComm, confidence: avgConf },
        session.language
      );

      const report = await Report.create({
        sessionId: session._id,
        candidateId: req.user._id,
        technicalScore: Math.round(avgScore),
        communicationScore: Math.round(avgComm),
        confidenceScore: Math.round(avgConf),
        overallScore: Math.round(avgScore),
        recommendation: session.recommendation,
        summary: `Completed ${session.round} interview with ${session.personality.replace(/_/g, ' ')}.`,
        strengths: coach.strengths,
        weaknesses: coach.weaknesses,
        careerCoach: coach.coach,
        learningRoadmap: coach.roadmap,
        suggestedCareerPath: coach.careerPath,
        aiComments: coach.coach,
        language: session.language,
      });

      session.reportId = report._id;
      await session.save();

      await Notification.create({
        userId: req.user._id,
        type: 'result',
        message: `Interview complete! Recommendation: ${session.recommendation.replace(/_/g, ' ')}`,
        relatedSessionId: session._id,
      });
      await Notification.create({
        userId: req.user._id,
        type: 'completion',
        message: 'Your AI career coach report is ready to download.',
        relatedSessionId: session._id,
      });

      return res.json({ completed: true, reportId: report._id, session: formatSession(session) });
    }

    session.currentQuestion = nextQ;
    await session.save();

    res.json({ completed: false, session: formatSession(session) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/coding/run', protect, authorize('candidate'), async (req, res) => {
  try {
    const { code } = req.body;
    const result = await evaluateCode(code);
    res.json({ output: result.output || '[1, 2]', error: null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/coding/evaluate', protect, authorize('candidate'), async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.id);
    if (!session || session.candidateId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Not found' });
    }
    const result = await evaluateCode(req.body.code);
    session.codingScore = result.score;
    session.codingFeedback = result.feedback;
    await session.save();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function formatSession(s) {
  return {
    _id: s._id,
    language: s.language,
    personality: s.personality,
    round: s.round,
    difficulty: s.difficulty,
    includeCoding: s.includeCoding,
    questionIndex: s.questionIndex,
    totalQuestions: s.totalQuestions,
    currentQuestion: s.currentQuestion,
    lastComment: s.lastComment,
    status: s.status,
    recommendation: s.recommendation,
    overallScore: s.overallScore,
  };
}

module.exports = router;
