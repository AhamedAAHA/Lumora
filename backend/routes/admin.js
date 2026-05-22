const express = require('express');
const Answer = require('../models/Answer');
const InterviewSession = require('../models/InterviewSession');
const JobRole = require('../models/JobRole');
const Notification = require('../models/Notification');
const Question = require('../models/Question');
const Report = require('../models/Report');
const Resume = require('../models/Resume');
const Setting = require('../models/Setting');
const User = require('../models/User');
const Interview = require('../models/Interview');
const InterviewResult = require('../models/InterviewResult');
const Candidate = require('../models/Candidate');
const { protect, authorize } = require('../middleware/auth');
const { generateFirstQuestion } = require('../services/aiService');
const { normalizeScore } = require('../services/unifiedAnalytics');
const {
  hasResumeData,
  defaultIntroQuestion,
  ensureIntroQuestion,
} = require('../utils/sessionResume');
const { mapPinRecommendation } = require('../utils/validateInterview');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/job-roles', async (_req, res) => {
  const roles = await JobRole.find().sort({ createdAt: -1 });
  res.json(roles);
});

router.post('/job-roles', async (req, res) => {
  try {
    const role = await JobRole.create({
      title: req.body.title,
      department: req.body.department,
      description: req.body.description,
      skills: normalizeList(req.body.skills),
      rounds: req.body.rounds?.length ? req.body.rounds : ['hr', 'technical'],
      status: req.body.status || 'active',
      createdBy: req.user._id,
    });
    res.status(201).json(role);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch('/job-roles/:id', async (req, res) => {
  const role = await JobRole.findById(req.params.id);
  if (!role) return res.status(404).json({ message: 'Job role not found' });

  ['title', 'department', 'description', 'status'].forEach((field) => {
    if (req.body[field] !== undefined) role[field] = req.body[field];
  });
  if (req.body.skills !== undefined) role.skills = normalizeList(req.body.skills);
  if (req.body.rounds !== undefined) role.rounds = req.body.rounds;

  await role.save();
  res.json(role);
});

router.delete('/job-roles/:id', async (req, res) => {
  const role = await JobRole.findById(req.params.id);
  if (!role) return res.status(404).json({ message: 'Job role not found' });
  await InterviewSession.updateMany({ jobRoleId: role._id }, { $unset: { jobRoleId: 1 } });
  await Question.deleteMany({ jobRoleId: role._id });
  await role.deleteOne();
  res.json({ ok: true });
});

router.get('/questions', async (req, res) => {
  const query = {};
  if (req.query.jobRoleId) query.jobRoleId = req.query.jobRoleId;
  if (req.query.interviewId) query.interviewId = req.query.interviewId;
  const questions = await Question.find(query)
    .populate('jobRoleId', 'title')
    .sort({ createdAt: -1 });
  res.json(questions);
});

router.post('/questions', async (req, res) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'Question text is required' });

    const question = await Question.create({
      jobRoleId: req.body.jobRoleId || undefined,
      interviewId: req.body.interviewId || undefined,
      text,
      round: req.body.round || 'technical',
      difficulty: req.body.difficulty || 'medium',
      source: 'manual',
      createdBy: req.user._id,
    });
    if (question.interviewId) {
      await InterviewSession.findByIdAndUpdate(question.interviewId, {
        $addToSet: { manualQuestions: question._id },
        currentQuestion: question.text,
      });
    }
    res.status(201).json(question);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch('/questions/:id', async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) return res.status(404).json({ message: 'Question not found' });
  const previousInterviewId = question.interviewId ? String(question.interviewId) : '';

  ['text', 'round', 'difficulty', 'jobRoleId', 'interviewId'].forEach((field) => {
    if (req.body[field] !== undefined) question[field] = req.body[field] || undefined;
  });
  if (req.body.text !== undefined) {
    question.text = String(req.body.text || '').trim();
    if (!question.text) return res.status(400).json({ message: 'Question text is required' });
  }
  await question.save();

  const nextInterviewId = question.interviewId ? String(question.interviewId) : '';
  if (previousInterviewId && previousInterviewId !== nextInterviewId) {
    await InterviewSession.findByIdAndUpdate(previousInterviewId, {
      $pull: { manualQuestions: question._id },
    });
  }
  if (nextInterviewId) {
    await InterviewSession.findByIdAndUpdate(nextInterviewId, {
      $addToSet: { manualQuestions: question._id },
    });
  }
  if (question.interviewId && req.body.text) {
    await InterviewSession.findByIdAndUpdate(question.interviewId, { currentQuestion: question.text });
  }

  res.json(question);
});

router.delete('/questions/:id', async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) return res.status(404).json({ message: 'Question not found' });
  await InterviewSession.updateMany(
    { manualQuestions: question._id },
    { $pull: { manualQuestions: question._id } }
  );
  if (question.interviewId) {
    await InterviewSession.updateOne(
      { _id: question.interviewId, currentQuestion: question.text },
      { $unset: { currentQuestion: 1 } }
    );
  }
  await question.deleteOne();
  res.json({ ok: true });
});

router.get('/users', async (_req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  const sessionCounts = await InterviewSession.aggregate([
    { $group: { _id: '$candidateId', count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
  ]);

  const counts = new Map(sessionCounts.map((item) => [String(item._id), item]));
  res.json(
    users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      interviews: counts.get(String(user._id))?.count || 0,
      completedInterviews: counts.get(String(user._id))?.completed || 0,
    }))
  );
});

router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role = 'candidate' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    const user = await User.create({ name, email, password, role });
    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      interviews: 0,
      completedInterviews: 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/users/:id', async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (email && email !== user.email && (await User.findOne({ email }))) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (password) user.password = password;
    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (String(user._id) === String(req.user._id)) {
    return res.status(400).json({ message: 'You cannot delete your own admin account' });
  }

  const sessions = await InterviewSession.find({ candidateId: user._id }).select('_id reportId');
  const reportIds = sessions.map((session) => session.reportId).filter(Boolean);
  const sessionIds = sessions.map((session) => session._id);
  await Answer.deleteMany({ $or: [{ candidateId: user._id }, { sessionId: { $in: sessionIds } }] });
  await Report.deleteMany({ $or: [{ candidateId: user._id }, { _id: { $in: reportIds } }] });
  await InterviewSession.deleteMany({ candidateId: user._id });
  await Notification.deleteMany({ userId: user._id });
  await user.deleteOne();
  res.json({ ok: true });
});

router.get('/interviews', async (_req, res) => {
  const sessions = await InterviewSession.find()
    .populate('candidateId', 'name email')
    .sort({ createdAt: -1 })
    .select('candidateId language personality round includeCoding questionIndex totalQuestions currentQuestion status overallScore recommendation reportId createdAt');

  const reportIds = sessions.map((s) => s.reportId).filter(Boolean);
  const reports = reportIds.length
    ? await Report.find({ _id: { $in: reportIds } }).select('overallScore recommendation').lean()
    : [];
  const reportMap = new Map(reports.map((r) => [String(r._id), r]));

  res.json(
    sessions.map((session) => {
      const formatted = formatAdminSession(session);
      const report = session.reportId ? reportMap.get(String(session.reportId)) : null;
      const raw = session.overallScore ?? report?.overallScore;
      formatted.overallScore = normalizeScore(raw);
      if (!formatted.recommendation && report?.recommendation) {
        formatted.recommendation = report.recommendation;
      }
      return formatted;
    })
  );
});

router.post('/interviews', async (req, res) => {
  try {
    const {
      candidateId,
      jobRoleId,
      language = 'en',
      personality = 'friendly_hr',
      round = 'technical',
      includeCoding = false,
      totalQuestions = 8,
      currentQuestion = '',
      publish = false,
    } = req.body;

    const candidate = await User.findOne({ _id: candidateId, role: 'candidate' });
    if (!candidate) return res.status(400).json({ message: 'Select a valid candidate' });

    const intro =
      String(currentQuestion || '').trim() || defaultIntroQuestion({ round, personality });

    const session = await InterviewSession.create({
      candidateId,
      jobRoleId: jobRoleId || undefined,
      language,
      personality,
      round,
      includeCoding,
      totalQuestions,
      introQuestion: intro,
      currentQuestion: intro,
      status: publish ? 'active' : 'draft',
    });

    if (currentQuestion) {
      const question = await Question.create({
        jobRoleId: jobRoleId || undefined,
        interviewId: session._id,
        text: intro,
        round,
        difficulty: 'medium',
        source: 'manual',
        createdBy: req.user._id,
      });
      session.manualQuestions.addToSet(question._id);
      await session.save();
    }

    if (publish) {
      await publishSession(session);
    }

    const populated = await InterviewSession.findById(session._id).populate('candidateId', 'name email');
    res.status(201).json(formatAdminSession(populated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/interviews/:id', async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Interview not found' });
    if (session.status === 'completed') {
      return res.status(400).json({ message: 'Completed interviews cannot be changed' });
    }

    ['language', 'personality', 'round', 'totalQuestions', 'status', 'jobRoleId'].forEach((field) => {
      if (req.body[field] !== undefined) session[field] = req.body[field];
    });
    if (req.body.currentQuestion !== undefined) {
      const intro = String(req.body.currentQuestion || '').trim();
      session.introQuestion = intro || defaultIntroQuestion(session);
      if (session.questionIndex === 0) {
        session.currentQuestion = session.introQuestion;
      }
    }
    if (req.body.includeCoding !== undefined) {
      session.includeCoding = req.body.includeCoding === true
        || req.body.includeCoding === 'true'
        || req.body.includeCoding === 1
        || req.body.includeCoding === '1';
    }

    if (req.body.publish || session.status === 'active') {
      session.status = 'active';
      await publishSession(session);
    } else {
      await session.save();
    }

    const populated = await InterviewSession.findById(session._id).populate('candidateId', 'name email');
    res.json(formatAdminSession(populated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/questions/generate', async (req, res) => {
  try {
    const context = await getQuestionGenerationContext(req.body);
    if (req.body.requireResume && !hasResumeData(context.resumeData)) {
      return res.status(400).json({
        message:
          'Select a candidate or interview with an uploaded PDF before generating a resume-based AI question.',
      });
    }
    const existingQuestions = await Question.find({
      ...(req.body.jobRoleId ? { jobRoleId: req.body.jobRoleId } : {}),
      ...(req.body.interviewId ? { interviewId: req.body.interviewId } : {}),
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('text')
      .lean();
    const draftAvoidQuestions = [req.body.text, req.body.currentQuestion]
      .map((text) => String(text || '').trim())
      .filter(Boolean);
    const question = await generateFirstQuestion({
      language: req.body.language || 'en',
      personality: req.body.personality || 'friendly_hr',
      round: context.round,
      resumeData: context.resumeData,
      avoidQuestions: [...draftAvoidQuestions, ...existingQuestions.map((item) => item.text)],
    });
    if (req.body.save) {
      const saved = await Question.create({
        jobRoleId: req.body.jobRoleId || undefined,
        interviewId: req.body.interviewId || undefined,
        text: question.question,
        round: req.body.round || 'technical',
        difficulty: req.body.difficulty || 'medium',
        source: 'ai',
        createdBy: req.user._id,
      });
      return res.json({ ...question, savedQuestionId: saved._id });
    }
    res.json(question);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.get('/settings', async (_req, res) => {
  const settings = await Setting.find().sort({ key: 1 });
  res.json(settings);
});

router.put('/settings/:key', async (req, res) => {
  const setting = await Setting.findOneAndUpdate(
    { key: req.params.key },
    { value: req.body.value, updatedBy: req.user._id },
    { new: true, upsert: true, runValidators: true }
  );
  res.json(setting);
});

router.delete('/interviews/:id', async (req, res) => {
  const session = await InterviewSession.findById(req.params.id);
  if (!session) return res.status(404).json({ message: 'Interview not found' });
  await Answer.deleteMany({ sessionId: session._id });
  await Report.deleteMany({ $or: [{ sessionId: session._id }, { _id: session.reportId }] });
  await Notification.deleteMany({ relatedSessionId: session._id });
  await session.deleteOne();
  res.json({ ok: true });
});

router.get('/reports', async (_req, res) => {
  const reports = await Report.find()
    .populate('candidateId', 'name email')
    .populate('sessionId', 'round personality status')
    .sort({ createdAt: -1 });
  const legacy = reports.map(formatAdminReport);

  const pinResults = await InterviewResult.find().sort({ createdAt: -1 }).limit(100);
  const pinReports = await Promise.all(
    pinResults.map(async (r) => {
      const cand = await Candidate.findById(r.candidateId);
      const iv = await Interview.findById(r.interviewId);
      return {
        id: String(r._id),
        pinInterviewId: String(r.interviewId),
        source: 'pin',
        candidate: {
          name: cand?.name || iv?.candidateName || 'Candidate',
          email: cand?.email || iv?.candidateEmail,
        },
        session: { round: r.round || iv?.round || 'technical' },
        overallScore: normalizeScore(r.overallScore),
        technicalScore: r.technicalScore,
        communicationScore: r.communicationScore,
        confidenceScore: r.confidenceScore,
        recommendation: String(r.recommendation || 'needs_improvement')
          .toLowerCase()
          .replace(/\s+/g, '_'),
        summary: r.finalFeedback,
        strengths: r.strengths || [],
        weaknesses: r.weaknesses || [],
        createdAt: r.createdAt,
      };
    })
  );

  res.json([...legacy, ...pinReports]);
});

router.patch('/pin-results/:id', async (req, res) => {
  try {
    const result = await InterviewResult.findById(req.params.id);
    if (!result) return res.status(404).json({ message: 'PIN report not found' });

    if (req.body.recommendation !== undefined) {
      result.recommendation = mapPinRecommendation(req.body.recommendation);
    }
    if (req.body.overallScore !== undefined) {
      result.overallScore = normalizeScore(req.body.overallScore);
    }
    if (req.body.finalFeedback !== undefined) {
      result.finalFeedback = String(req.body.finalFeedback);
    }
    await result.save();

    const cand = await Candidate.findById(result.candidateId);
    const iv = await Interview.findById(result.interviewId);
    res.json({
      id: String(result._id),
      pinInterviewId: String(result.interviewId),
      source: 'pin',
      candidate: {
        name: cand?.name || iv?.candidateName,
        email: cand?.email || iv?.candidateEmail,
      },
      session: { round: result.round || iv?.round || 'technical' },
      overallScore: normalizeScore(result.overallScore),
      recommendation: String(result.recommendation || 'needs_improvement')
        .toLowerCase()
        .replace(/\s+/g, '_'),
      summary: result.finalFeedback,
      createdAt: result.createdAt,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/pin-results/:id', async (req, res) => {
  const result = await InterviewResult.findById(req.params.id);
  if (!result) return res.status(404).json({ message: 'PIN report not found' });
  await result.deleteOne();
  res.json({ ok: true });
});

router.patch('/reports/:id', async (req, res) => {
  try {
    const pinResult = await InterviewResult.findById(req.params.id);
    if (pinResult) {
      if (req.body.recommendation !== undefined) {
        pinResult.recommendation = mapPinRecommendation(req.body.recommendation);
      }
      await pinResult.save();
      const cand = await Candidate.findById(pinResult.candidateId);
      const iv = await Interview.findById(pinResult.interviewId);
      return res.json({
        id: String(pinResult._id),
        pinInterviewId: String(pinResult.interviewId),
        source: 'pin',
        candidate: { name: cand?.name, email: cand?.email },
        session: { round: pinResult.round || iv?.round },
        overallScore: normalizeScore(pinResult.overallScore),
        recommendation: String(pinResult.recommendation).toLowerCase().replace(/\s+/g, '_'),
        summary: pinResult.finalFeedback,
        createdAt: pinResult.createdAt,
      });
    }

    const allowed = [
      'technicalScore',
      'communicationScore',
      'confidenceScore',
      'overallScore',
      'recommendation',
      'summary',
      'strengths',
      'weaknesses',
      'careerCoach',
      'learningRoadmap',
      'suggestedCareerPath',
      'aiComments',
    ];
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) report[field] = req.body[field];
    });
    await report.save();

    if (report.sessionId) {
      await InterviewSession.findByIdAndUpdate(report.sessionId, {
        overallScore: normalizeScore(report.overallScore),
        recommendation: report.recommendation,
      });
    }

    const populated = await Report.findById(report._id)
      .populate('candidateId', 'name email')
      .populate('sessionId', 'round personality status');
    res.json(formatAdminReport(populated));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/reports/:id', async (req, res) => {
  const pinResult = await InterviewResult.findById(req.params.id);
  if (pinResult) {
    await pinResult.deleteOne();
    return res.json({ ok: true });
  }

  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ message: 'Report not found' });
  if (report.sessionId) {
    await InterviewSession.findByIdAndUpdate(report.sessionId, { $unset: { reportId: 1 } });
  }
  await report.deleteOne();
  res.json({ ok: true });
});

async function publishSession(session) {
  const intro = ensureIntroQuestion(session);
  if (session.questionIndex === 0) {
    session.currentQuestion = intro;
  }
  await session.save();
  await Notification.create({
    userId: session.candidateId,
    type: 'scheduled',
    message: `A ${session.round} interview is ready for you.`,
    relatedSessionId: session._id,
  });
}

async function getQuestionGenerationContext(body) {
  let session = null;
  if (body.interviewId) {
    session = await InterviewSession.findById(body.interviewId).select('candidateId round resumeData');
  }

  const candidateId = session?.candidateId || body.candidateId;
  const latestResume = await getLatestResumeData(candidateId);

  const sessionResume = session?.resumeData || {};
  const explicitResume = body.resumeData || {};
  const resumeData = hasResumeData(sessionResume)
    ? sessionResume
    : hasResumeData(latestResume)
      ? latestResume
      : explicitResume;

  return {
    round: body.round || session?.round || 'technical',
    resumeData,
  };
}

async function getLatestResumeData(candidateId) {
  if (!candidateId) return {};
  const resume = await Resume.findOne({ candidateId })
    .sort({ createdAt: -1 })
    .select('skills education projects experience')
    .lean();
  return resume || {};
}

function formatAdminSession(session) {
  return {
    id: session._id,
    candidate: session.candidateId
      ? {
          id: session.candidateId._id,
          name: session.candidateId.name,
          email: session.candidateId.email,
        }
      : null,
    jobRoleId: session.jobRoleId,
    language: session.language,
    personality: session.personality,
    round: session.round,
    includeCoding: session.includeCoding,
    progress: `${session.questionIndex || 0}/${session.totalQuestions || 0}`,
    currentQuestion: session.currentQuestion,
    status: session.status,
    overallScore: normalizeScore(session.overallScore),
    recommendation: session.recommendation,
    reportId: session.reportId,
    createdAt: session.createdAt,
  };
}

function formatAdminReport(report) {
  return {
    id: report._id,
    candidate: report.candidateId
      ? {
          id: report.candidateId._id,
          name: report.candidateId.name,
          email: report.candidateId.email,
        }
      : null,
    session: report.sessionId
      ? {
          id: report.sessionId._id,
          round: report.sessionId.round,
          personality: report.sessionId.personality,
          status: report.sessionId.status,
        }
      : null,
    technicalScore: report.technicalScore,
    communicationScore: report.communicationScore,
    confidenceScore: report.confidenceScore,
    overallScore: normalizeScore(report.overallScore),
    recommendation: report.recommendation,
    summary: report.summary,
    strengths: report.strengths || [],
    weaknesses: report.weaknesses || [],
    createdAt: report.createdAt,
  };
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

module.exports = router;
