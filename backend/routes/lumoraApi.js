const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const Interview = require('../models/Interview');
const Candidate = require('../models/Candidate');
const CustomQuestion = require('../models/CustomQuestion');
const AIQuestion = require('../models/AIQuestion');
const CandidateAnswer = require('../models/CandidateAnswer');
const InterviewResult = require('../models/InterviewResult');
const User = require('../models/User');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const { protectCandidate } = require('../middleware/candidateAuth');
const { parseResumePdf } = require('../services/resumeParser');
const { synthesizeSpeech } = require('../services/elevenLabsService');
const {
  extractCvData,
  normalizeCvExtracted,
  generateCvQuestions,
  evaluateAnswer,
  evaluateCode,
  generateFinalReport,
  normalizeBasedOn,
  normalizeDifficulty,
  LANG_NAMES,
} = require('../services/interviewAiService');
const { getPinAdminAnalytics, getCandidateHistory } = require('../services/pinAnalytics');
const Notification = require('../models/Notification');
const { generateUniquePin } = require('../utils/pinCode');
const { buildQuestionQueue, getCurrentQuestion } = require('../utils/interviewFlow');
const {
  applyInterviewFields,
  applyCandidatePrefs,
  safeOrderNumber,
  pickEnum,
  mapPinRecommendation,
} = require('../utils/validateInterview');

function sendRouteError(res, err) {
  if (err.name === 'ValidationError') {
    const msg = Object.values(err.errors || {})
      .map((e) => e.message)
      .join('; ');
    return res.status(400).json({ message: msg || err.message });
  }
  return res.status(500).json({ message: err.message });
}

const router = express.Router();

const signAdminToken = (id) =>
  jwt.sign({ id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });

const signCandidateToken = (candidateId, interviewId) =>
  jwt.sign({ candidateId, interviewId, type: 'candidate' }, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });

function sanitize(text) {
  return String(text || '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 5000);
}

function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'on', 'yes'].includes(value.toLowerCase());
  return Boolean(value);
}

// ─── Admin Auth ───────────────────────────────────────────────────────────────

router.post('/admin/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email, role: 'admin' });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }
    res.json({
      token: signAdminToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Interview CRUD (Admin) ───────────────────────────────────────────────────

router.post('/interviews/create', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, jobRole, candidateName, candidateEmail, questions = [], pinExpiryHours = 72 } = req.body;
    if (!title || !jobRole || !candidateName || !candidateEmail) {
      return res.status(400).json({ message: 'Title, job role, candidate name and email are required' });
    }

    const interview = await Interview.create({
      title: sanitize(title),
      jobRole: sanitize(jobRole),
      candidateName: sanitize(candidateName),
      candidateEmail: sanitize(candidateEmail).toLowerCase(),
      status: 'scheduled',
      language: pickEnum('language', req.body.language, 'en'),
      personality: pickEnum('personality', req.body.personality, 'friendly_hr'),
      round: pickEnum('round', req.body.round, 'technical'),
      includeCoding: toBool(req.body.includeCoding),
      difficulty: pickEnum('difficulty', req.body.difficulty, 'medium'),
      createdBy: req.user._id,
    });

    const qList = Array.isArray(questions) ? questions : [];
    for (let i = 0; i < qList.length; i++) {
      const text = sanitize(qList[i]);
      if (text) {
        await CustomQuestion.create({
          interviewId: interview._id,
          questionText: text,
          orderNumber: i + 1,
          type: 'admin_custom',
          isEditable: true,
        });
      }
    }

    const customQuestions = await CustomQuestion.find({ interviewId: interview._id }).sort({ orderNumber: 1 });
    res.status(201).json({ interview: formatInterview(interview), questions: customQuestions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/interviews', protect, authorize('admin'), async (_req, res) => {
  const interviews = await Interview.find().sort({ createdAt: -1 });
  const withMeta = await Promise.all(
    interviews.map(async (iv) => {
      const candidate = await Candidate.findOne({ interviewId: iv._id });
      const questionCount = await CustomQuestion.countDocuments({ interviewId: iv._id });
      const aiCount = await AIQuestion.countDocuments({ interviewId: iv._id });
      const result = await InterviewResult.findOne({ interviewId: iv._id });
      return {
        ...formatInterview(iv),
        candidateStatus: candidate?.status || 'pending',
        questionCount,
        aiQuestionCount: aiCount,
        hasResult: !!result,
        resultId: result?._id,
      };
    })
  );
  res.json(withMeta);
});

router.get('/interviews/:id', protect, async (req, res, next) => {
  if (['history', 'assigned', 'start'].includes(req.params.id)) return next('router');
  if (req.user.role !== 'admin') return next('router');
  const interview = await Interview.findById(req.params.id);
  if (!interview) return res.status(404).json({ message: 'Interview not found' });

  const customQuestions = await CustomQuestion.find({ interviewId: interview._id }).sort({ orderNumber: 1 });
  const aiQuestions = await AIQuestion.find({ interviewId: interview._id }).sort({ orderNumber: 1 });
  const candidate = await Candidate.findOne({ interviewId: interview._id });
  const result = await InterviewResult.findOne({ interviewId: interview._id });
  const storedAnswers = await CandidateAnswer.find({ interviewId: interview._id }).sort({
    createdAt: 1,
  });

  res.json({
    interview: formatInterview(interview),
    customQuestions,
    aiQuestions,
    candidate: candidate ? formatCandidate(candidate) : null,
    answers: storedAnswers,
    result,
  });
});

router.put('/interviews/:id', protect, authorize('admin'), async (req, res) => {
  try {
  const interview = await Interview.findById(req.params.id);
  if (!interview) return res.status(404).json({ message: 'Interview not found' });
  if (interview.status === 'completed') {
    return res.status(400).json({ message: 'Completed interviews cannot be edited' });
  }

  const candidate = await Candidate.findOne({ interviewId: interview._id });
  if (candidate?.status === 'interview_started' || candidate?.status === 'completed') {
    return res.status(400).json({
      message: 'Cannot edit after the candidate has started or completed this interview',
    });
  }

  applyInterviewFields(interview, req.body, sanitize);
  if (req.body.includeCoding !== undefined) {
    interview.includeCoding = toBool(req.body.includeCoding);
  }
  if (interview.status === 'active' && !interview.pinCode) {
    return res.status(400).json({
      message: 'Generate a PIN before setting interview status to active',
    });
  }
  await interview.save();

  if (candidate && req.body.candidateName) candidate.name = sanitize(req.body.candidateName);
  if (candidate && req.body.candidateEmail) candidate.email = sanitize(req.body.candidateEmail).toLowerCase();
  if (candidate) await candidate.save();

  if (Array.isArray(req.body.customQuestions)) {
    for (const item of req.body.customQuestions) {
      if (!item.id) continue;
      const q = await CustomQuestion.findOne({ _id: item.id, interviewId: interview._id });
      if (!q) continue;
      if (item.questionText !== undefined) {
        q.questionText = sanitize(item.questionText);
        if (q.questionText) await q.save();
      }
    }
  }

  const customQuestions = await CustomQuestion.find({ interviewId: interview._id }).sort({ orderNumber: 1 });
  res.json({ interview: formatInterview(interview), customQuestions });
  } catch (err) {
    return sendRouteError(res, err);
  }
});

router.delete('/interviews/:id', protect, authorize('admin'), async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) return res.status(404).json({ message: 'Interview not found' });

  await CustomQuestion.deleteMany({ interviewId: interview._id });
  await AIQuestion.deleteMany({ interviewId: interview._id });
  await CandidateAnswer.deleteMany({ interviewId: interview._id });
  await Candidate.deleteMany({ interviewId: interview._id });
  await InterviewResult.deleteMany({ interviewId: interview._id });
  await interview.deleteOne();
  res.json({ ok: true });
});

// ─── Custom Questions (Admin) ─────────────────────────────────────────────────

router.post('/interviews/:id/questions', protect, authorize('admin'), async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) return res.status(404).json({ message: 'Interview not found' });
  if (interview.status === 'completed') {
    return res.status(400).json({ message: 'Cannot modify completed interview' });
  }

  const text = sanitize(req.body.questionText);
  if (!text) return res.status(400).json({ message: 'Question text is required' });

  const maxOrder = await CustomQuestion.findOne({ interviewId: interview._id })
    .sort({ orderNumber: -1 })
    .select('orderNumber');
  const orderNumber =
    req.body.orderNumber != null
      ? safeOrderNumber(req.body.orderNumber, (maxOrder?.orderNumber || 0) + 1)
      : (maxOrder?.orderNumber || 0) + 1;

  const question = await CustomQuestion.create({
    interviewId: interview._id,
    questionText: text,
    orderNumber,
    type: 'admin_custom',
    isEditable: true,
  });
  res.status(201).json(question);
});

router.put('/questions/:id', protect, authorize('admin'), async (req, res) => {
  const question = await CustomQuestion.findById(req.params.id);
  if (!question) return res.status(404).json({ message: 'Question not found' });

  const interview = await Interview.findById(question.interviewId);
  if (interview?.status === 'completed') {
    return res.status(400).json({ message: 'Cannot modify completed interview' });
  }

  if (req.body.questionText !== undefined) {
    question.questionText = sanitize(req.body.questionText);
    if (!question.questionText) return res.status(400).json({ message: 'Question text required' });
  }
  if (req.body.orderNumber !== undefined) {
    question.orderNumber = safeOrderNumber(req.body.orderNumber, question.orderNumber);
  }
  await question.save();
  res.json(question);
});

router.delete('/questions/:id', protect, authorize('admin'), async (req, res) => {
  const question = await CustomQuestion.findById(req.params.id);
  if (!question) return res.status(404).json({ message: 'Question not found' });

  const check = await assertInterviewEditable(question.interviewId);
  if (check.error) return res.status(check.error.status).json({ message: check.error.message });

  await question.deleteOne();
  await reorderCustomQuestions(question.interviewId);
  res.json({ ok: true });
});

router.post('/interviews/:id/questions/reorder', protect, authorize('admin'), async (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ message: 'orderedIds array required' });
  }
  const interviewId = req.params.id;
  for (let i = 0; i < orderedIds.length; i++) {
    await CustomQuestion.findOneAndUpdate(
      { _id: orderedIds[i], interviewId },
      { orderNumber: i + 1 }
    );
  }
  const questions = await CustomQuestion.find({ interviewId: req.params.id }).sort({ orderNumber: 1 });
  res.json(questions);
});

// ─── PIN Generation ───────────────────────────────────────────────────────────

router.post('/interviews/:id/generate-pin', protect, authorize('admin'), async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) return res.status(404).json({ message: 'Interview not found' });
  if (interview.status === 'completed') {
    return res.status(400).json({ message: 'Cannot generate PIN for a completed interview' });
  }

  const hours = Number(req.body.pinExpiryHours) || 72;
  const pinCode = await generateUniquePin();
  const pinExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  interview.pinCode = pinCode;
  interview.pinExpiresAt = pinExpiresAt;
  interview.status = 'active';
  await interview.save();

  let candidate = await Candidate.findOne({ interviewId: interview._id });
  if (candidate) {
    candidate.pinCode = pinCode;
    candidate.status = 'pending';
    candidate.language = interview.language;
    candidate.personality = interview.personality;
    candidate.round = interview.round;
    candidate.difficulty = interview.difficulty;
    await candidate.save();
  } else {
    candidate = await Candidate.create({
      name: interview.candidateName,
      email: interview.candidateEmail,
      pinCode,
      interviewId: interview._id,
      status: 'pending',
      language: interview.language,
      personality: interview.personality,
      round: interview.round,
      difficulty: interview.difficulty,
    });
  }

  await Notification.create({
    userId: req.user._id,
    type: 'scheduled',
    message: `Interview scheduled for ${interview.candidateName} — PIN ${pinCode}`,
  });

  res.json({
    pinCode,
    pinExpiresAt,
    interview: formatInterview(interview),
    candidateId: candidate._id,
  });
});

// ─── Admin Report ─────────────────────────────────────────────────────────────

router.get('/interviews/:id/report', protect, authorize('admin'), async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) return res.status(404).json({ message: 'Interview not found' });

  const candidate = await Candidate.findOne({ interviewId: interview._id });
  const customQuestions = await CustomQuestion.find({ interviewId: interview._id }).sort({ orderNumber: 1 });
  const aiQuestions = await AIQuestion.find({ interviewId: interview._id }).sort({ orderNumber: 1 });
  const answers = await CandidateAnswer.find({ interviewId: interview._id }).sort({ createdAt: 1 });
  const result = await InterviewResult.findOne({ interviewId: interview._id });

  if (!result) {
    return res.status(404).json({ message: 'Report not available yet. Candidate must complete the interview.' });
  }

  res.json({
    interview: formatInterview(interview),
    candidate: candidate ? formatCandidate(candidate) : null,
    cvSummary: candidate?.cvSummary,
    extractedSkills: candidate?.extractedSkills,
    customQuestions,
    aiQuestions,
    answers,
    result,
  });
});

// ─── Candidate: PIN ───────────────────────────────────────────────────────────

router.post('/candidate/verify-pin', async (req, res) => {
  try {
    const pinCode = String(req.body.pinCode || '').trim();
    if (!/^\d{6}$/.test(pinCode)) {
      return res.status(400).json({ message: 'Enter a valid 6-digit PIN' });
    }

    const interview = await Interview.findOne({ pinCode });
    if (!interview) {
      return res.status(404).json({ message: 'Invalid PIN. Please check the 6-digit code from your recruiter.' });
    }

    if (interview.status === 'completed' || interview.status === 'expired') {
      return res.status(403).json({
        message: 'This interview is no longer available. The PIN has expired or the interview was already completed.',
      });
    }

    if (interview.pinExpiresAt && new Date() > interview.pinExpiresAt) {
      interview.status = 'expired';
      await interview.save();
      return res.status(403).json({ message: 'PIN has expired. Contact your recruiter for a new PIN.' });
    }

    let candidate = await Candidate.findOne({ interviewId: interview._id });
    if (!candidate) {
      candidate = await Candidate.create({
        name: interview.candidateName,
        email: interview.candidateEmail,
        pinCode,
        interviewId: interview._id,
        status: 'pending',
      });
    } else if (candidate.pinCode !== pinCode) {
      candidate.pinCode = pinCode;
      await candidate.save();
    }

    if (candidate.status === 'completed') {
      return res.status(403).json({ message: 'You have already completed this interview.' });
    }

    const token = signCandidateToken(candidate._id, interview._id);
    res.json({
      token,
      interview: {
        id: interview._id,
        title: interview.title,
        jobRole: interview.jobRole,
        candidateName: interview.candidateName,
        status: interview.status,
      },
      candidate: formatCandidate(candidate),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/candidate/interview/:pinCode', async (req, res) => {
  const pinCode = String(req.params.pinCode || '').trim();
  const interview = await Interview.findOne({ pinCode });
  if (!interview) return res.status(404).json({ message: 'Interview not found' });

  const candidate = await Candidate.findOne({ interviewId: interview._id });
  res.json({
    interview: formatInterview(interview),
    candidate: candidate ? formatCandidate(candidate) : null,
    pinValid: interview.status === 'active' && (!interview.pinExpiresAt || new Date() <= interview.pinExpiresAt),
  });
});

// ─── Candidate: CV Upload ─────────────────────────────────────────────────────

function sanitizeFollowUpQueue(candidate) {
  const queue = candidate.followUpQueue || [];
  candidate.followUpQueue = queue.map((item, i) => ({
    questionKey: item.questionKey || `followup-${i}-${Date.now()}`,
    questionText: item.questionText || '',
    parentQuestionId: item.parentQuestionId,
    questionType: item.questionType || 'followup',
  }));
  candidate.markModified('followUpQueue');
}

async function rejectIfInterviewClosed(req, res) {
  const interview = await Interview.findById(req.candidate.interviewId);
  if (!interview) return res.status(404).json({ message: 'Interview not found' });
  if (interview.status === 'completed' || interview.status === 'expired') {
    return res.status(403).json({
      message: 'This interview is closed. You cannot continue with this PIN.',
    });
  }
  if (req.candidate.status === 'completed') {
    return res.status(403).json({
      message: 'You have already completed this interview. This PIN cannot be reused.',
    });
  }
  return null;
}

router.post('/candidate/upload-cv', protectCandidate, (req, res, next) => {
  upload.single('cv')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
    next();
  });
}, async (req, res) => {
  try {
    const closed = await rejectIfInterviewClosed(req, res);
    if (closed) return;
    if (!req.file) return res.status(400).json({ message: 'CV file required (PDF, DOC, or DOCX, max 5MB)' });

    const interview = await Interview.findById(req.candidate.interviewId);
    if (!interview) return res.status(404).json({ message: 'Interview not found' });
    if (req.candidate.status === 'completed') {
      return res.status(400).json({ message: 'Interview already completed' });
    }

    let cvText = '';
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === '.pdf') {
      const parsed = await parseResumePdf(req.file.path);
      cvText = parsed.rawText || [
        ...(parsed.skills || []),
        ...(parsed.projects || []),
        ...(parsed.experience || []),
      ].join(' ');
    } else {
      cvText = fs.readFileSync(req.file.path, 'utf8').slice(0, 8000);
    }

    const lang = req.body.language || interview.language || 'en';
    const extracted = await extractCvData(cvText, interview.jobRole, lang);
    const baseUrl = process.env.SERVER_URL || 'http://localhost:5173';
    const cvFileUrl = `${baseUrl}/uploads/${path.basename(req.file.path)}`;

    req.candidate.cvFileUrl = cvFileUrl;
    req.candidate.cvText = cvText.slice(0, 15000);
    req.candidate.cvSummary = extracted.summary || '';
    const normalized = normalizeCvExtracted(extracted);
    req.candidate.extractedSkills = normalized.skills;
    req.candidate.extractedEducation = normalized.education;
    req.candidate.extractedExperience = normalized.experience;
    req.candidate.extractedProjects = normalized.projects;
    req.candidate.extractedCertifications = normalized.certifications;
    req.candidate.extractedTechnologies = normalized.technologies;
    req.candidate.status = 'cv_uploaded';
    await req.candidate.save();

    res.json({
      candidate: formatCandidate(req.candidate),
      cvSummary: req.candidate.cvSummary,
      extracted: {
        skills: req.candidate.extractedSkills,
        education: req.candidate.extractedEducation,
        experience: req.candidate.extractedExperience,
        projects: req.candidate.extractedProjects,
        certifications: req.candidate.extractedCertifications,
        technologies: req.candidate.extractedTechnologies,
      },
    });
  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    res.status(500).json({ message: err.message });
  }
});

// ─── Candidate: Generate CV Questions ───────────────────────────────────────

router.post('/candidate/generate-cv-questions', protectCandidate, async (req, res) => {
  try {
    const closed = await rejectIfInterviewClosed(req, res);
    if (closed) return;
    const closed = await rejectIfInterviewClosed(req, res);
    if (closed) return;
    if (req.candidate.status === 'pending') {
      return res.status(400).json({ message: 'Upload your CV before generating questions' });
    }
    if (req.candidate.status === 'interview_started') {
      return res.status(400).json({
        message: 'Cannot regenerate AI questions while the interview is in progress',
      });
    }
    if (req.candidate.status === 'completed') {
      return res.status(400).json({ message: 'Interview already completed' });
    }

    const interview = await Interview.findById(req.candidate.interviewId);
    const cvData = {
      skills: req.candidate.extractedSkills,
      education: req.candidate.extractedEducation,
      experience: req.candidate.extractedExperience,
      projects: req.candidate.extractedProjects,
      certifications: req.candidate.extractedCertifications,
      technologies: req.candidate.extractedTechnologies,
      summary: req.candidate.cvSummary,
    };

    await AIQuestion.deleteMany({ interviewId: interview._id });
    const lang = req.candidate.language || interview.language || 'en';
    const generated = await generateCvQuestions(
      cvData,
      interview.jobRole,
      5,
      lang,
      interview.round || 'technical'
    );

    const saved = [];
    for (let i = 0; i < generated.length; i++) {
      const q = await AIQuestion.create({
        interviewId: interview._id,
        questionText: generated[i].questionText,
        basedOn: normalizeBasedOn(generated[i].basedOn),
        difficulty: normalizeDifficulty(generated[i].difficulty),
        orderNumber: i + 1,
      });
      saved.push(q);
    }

    res.json({ questions: saved, count: saved.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Candidate preferences (language / personality) ───────────────────────────

router.post('/candidate/configure', protectCandidate, async (req, res) => {
  const closed = await rejectIfInterviewClosed(req, res);
  if (closed) return;
  const interview = await Interview.findById(req.candidate.interviewId);
  applyCandidatePrefs(req.candidate, req.body);
  req.candidate.language = req.candidate.language || interview.language;
  req.candidate.personality = req.candidate.personality || interview.personality;
  req.candidate.round = req.candidate.round || interview.round;
  req.candidate.difficulty = interview.difficulty;
  await req.candidate.save();
  res.json({
    candidate: formatCandidate(req.candidate),
    interview: formatInterview(interview),
    languages: LANG_NAMES,
  });
});

router.post('/candidate/cheat-event', protectCandidate, async (req, res) => {
  if (req.candidate.status !== 'interview_started') {
    return res.status(400).json({ message: 'Interview not active' });
  }
  req.candidate.cheatEvents.push({
    type: req.body.type || 'warning',
    message: sanitize(req.body.message) || 'Suspicious activity',
    at: new Date(),
  });
  await req.candidate.save();
  res.json({ ok: true, warnings: req.candidate.cheatEvents.length });
});

router.post('/candidate/coding/evaluate', protectCandidate, async (req, res) => {
  try {
    const closed = await rejectIfInterviewClosed(req, res);
    if (closed) return;
    const interview = await Interview.findById(req.candidate.interviewId);
    if (!interview.includeCoding) {
      return res.status(400).json({ message: 'Coding round not enabled for this interview' });
    }
    const result = await evaluateCode(
      req.body.code || '',
      interview.jobRole,
      req.candidate.language || interview.language
    );
    req.candidate.codingScore = result.score;
    req.candidate.codingFeedback = result.feedback;
    req.candidate.codingSubmitted = true;
    await req.candidate.save();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/candidate/history', protectCandidate, async (req, res) => {
  const data = await getCandidateHistory(req.candidate.email);
  res.json(data);
});

// ─── Admin analytics (PIN system) ─────────────────────────────────────────────

router.get('/analytics/pin-admin', protect, authorize('admin'), async (_req, res) => {
  res.json(await getPinAdminAnalytics());
});

// ─── Candidate: Interview Session ─────────────────────────────────────────────

router.get('/candidate/session', protectCandidate, async (req, res) => {
  const closed = await rejectIfInterviewClosed(req, res);
  if (closed) return;
  const interview = await Interview.findById(req.candidate.interviewId);
  const aiCount = await AIQuestion.countDocuments({ interviewId: interview._id });
  const queue = await buildQuestionQueue(interview._id, req.candidate);
  const current = getCurrentQuestion(queue, req.candidate.currentQuestionIndex);
  const total = queue.length;
  const cvRequired = !req.candidate.cvFileUrl || req.candidate.status === 'pending';

  res.json({
    interview: formatInterview(interview),
    candidate: formatCandidate(req.candidate),
    cvRequired,
    aiQuestionsReady: aiCount > 0,
    aiQuestionCount: aiCount,
    currentQuestion: cvRequired ? null : current,
    interviewerComment: req.candidate.lastInterviewerComment || '',
    liveMetrics: req.candidate.liveMetrics,
    metricsHistory: req.candidate.metricsHistory || [],
    cheatWarnings: req.candidate.cheatEvents?.length || 0,
    includeCoding: interview.includeCoding,
    codingDone: req.candidate.codingSubmitted,
    progress: {
      current: req.candidate.currentQuestionIndex + 1,
      total,
      percent: total ? Math.round((req.candidate.currentQuestionIndex / total) * 100) : 0,
    },
    completed: req.candidate.status === 'completed',
  });
});

router.post('/candidate/start-interview', protectCandidate, async (req, res) => {
  const closed = await rejectIfInterviewClosed(req, res);
  if (closed) return;
  if (req.candidate.status === 'pending' || !req.candidate.cvFileUrl) {
    return res.status(400).json({ message: 'Upload your CV before starting the interview' });
  }
  if (req.candidate.status !== 'cv_uploaded') {
    return res.status(400).json({ message: 'Complete CV upload and generate AI questions first' });
  }
  const aiCount = await AIQuestion.countDocuments({ interviewId: req.candidate.interviewId });
  if (aiCount === 0) {
    return res.status(400).json({ message: 'Generate CV questions before starting' });
  }

  const interview = await Interview.findById(req.candidate.interviewId);
  req.candidate.status = 'interview_started';
  req.candidate.currentQuestionIndex = 0;
  req.candidate.startedAt = new Date();
  req.candidate.language = req.candidate.language || interview.language;
  req.candidate.personality = req.candidate.personality || interview.personality;
  req.candidate.round = req.candidate.round || interview.round;
  req.candidate.difficulty = interview.difficulty || 'medium';
  await req.candidate.save();

  const queue = await buildQuestionQueue(req.candidate.interviewId, req.candidate);
  res.json({
    started: true,
    currentQuestion: getCurrentQuestion(queue, 0),
    totalQuestions: queue.length,
  });
});

router.post('/candidate/submit-answer', protectCandidate, async (req, res) => {
  try {
    const closed = await rejectIfInterviewClosed(req, res);
    if (closed) return;
    const answerText = sanitize(req.body.answer);
    if (!answerText) return res.status(400).json({ message: 'Answer is required' });

    if (req.candidate.status !== 'interview_started') {
      return res.status(400).json({ message: 'Start the interview first' });
    }
    if (!req.candidate.cvFileUrl) {
      return res.status(400).json({ message: 'Upload your CV before answering questions' });
    }

    const interview = await Interview.findById(req.candidate.interviewId);
    const queue = await buildQuestionQueue(interview._id, req.candidate);
    const current = getCurrentQuestion(queue, req.candidate.currentQuestionIndex);
    if (!current) return res.status(400).json({ message: 'No active question' });

    const metrics = req.body.metrics || {};
    let evaluation;
    try {
      evaluation = await evaluateAnswer(current.text, answerText, {
        jobRole: interview.jobRole,
        language: req.candidate.language || interview.language,
        personality: req.candidate.personality || interview.personality,
        difficulty: req.candidate.difficulty,
        round: req.candidate.round || interview.round,
        metrics,
      });
    } catch (evalErr) {
      console.warn('[submit-answer] evaluateAnswer failed:', evalErr.message);
      const words = answerText.trim().split(/\s+/).filter(Boolean).length;
      evaluation = {
        score: words < 15 ? 4 : words < 40 ? 6 : 8,
        feedback: 'Answer recorded.',
        conversationalComment: 'Thank you. Let us continue.',
        needsFollowUp: words < 25,
        followUpQuestion: words < 25 ? 'Can you elaborate with a specific example?' : '',
        nextDifficulty: req.candidate.difficulty || 'medium',
      };
    }

    req.candidate.difficulty = evaluation.nextDifficulty || req.candidate.difficulty;
    req.candidate.lastInterviewerComment = evaluation.conversationalComment || '';
    if (metrics.confidence != null) {
      req.candidate.liveMetrics = {
        confidence: metrics.confidence,
        communication: metrics.communication,
        speaking: metrics.speaking,
        wpm: metrics.wpm,
        fillers: metrics.fillers,
      };
      req.candidate.metricsHistory = req.candidate.metricsHistory || [];
      req.candidate.metricsHistory.push({
        confidence: metrics.confidence,
        communication: metrics.communication,
        speaking: metrics.speaking,
        score: evaluation.score,
        at: new Date(),
      });
    }

    await CandidateAnswer.create({
      interviewId: interview._id,
      candidateId: req.candidate._id,
      questionId: String(current.id),
      questionType: current.type,
      questionText: current.text,
      candidateAnswer: answerText,
      aiScore: evaluation.score,
      aiFeedback: evaluation.feedback,
      metrics,
    });

    if (evaluation.needsFollowUp && evaluation.followUpQuestion) {
      req.candidate.followUpQueue = req.candidate.followUpQueue || [];
      req.candidate.followUpQueue.push({
        questionKey: `followup-${new mongoose.Types.ObjectId()}`,
        questionText: evaluation.followUpQuestion,
        parentQuestionId: String(current.id),
        questionType: 'followup',
      });
    }

    if (req.candidate.metricsHistory?.length > 30) {
      req.candidate.metricsHistory = req.candidate.metricsHistory.slice(-30);
    }

    req.candidate.currentQuestionIndex += 1;
    sanitizeFollowUpQueue(req.candidate);
    const updatedQueue = await buildQuestionQueue(interview._id, req.candidate);
    const nextQ = getCurrentQuestion(updatedQueue, req.candidate.currentQuestionIndex);
    const done = !nextQ;
    const total = updatedQueue.length;
    const progressPercent = total
      ? Math.min(100, Math.round((req.candidate.currentQuestionIndex / total) * 100))
      : 0;

    try {
      await req.candidate.save();
    } catch (saveErr) {
      console.error('[submit-answer] save failed:', saveErr.message);
      return res.status(400).json({
        message: saveErr.message || 'Could not save progress. Please try again.',
      });
    }

    if (done) {
      return res.json({
        completed: false,
        finalize: true,
        evaluation,
        interviewerComment: req.candidate.lastInterviewerComment,
        includeCoding: interview.includeCoding && !req.candidate.codingSubmitted,
      });
    }
    res.json({
      completed: false,
      evaluation,
      interviewerComment: req.candidate.lastInterviewerComment,
      nextQuestion: nextQ,
      liveMetrics: req.candidate.liveMetrics,
      metricsHistory: req.candidate.metricsHistory || [],
      progress: {
        current: req.candidate.currentQuestionIndex + 1,
        total,
        percent: progressPercent,
      },
    });
  } catch (err) {
    return sendRouteError(res, err);
  }
});

router.post('/candidate/complete-interview', protectCandidate, async (req, res) => {
  try {
    const closed = await rejectIfInterviewClosed(req, res);
    if (closed) return;
    if (req.candidate.status === 'completed') {
      return res.status(400).json({ message: 'Interview already completed' });
    }
    if (req.candidate.status !== 'interview_started') {
      return res.status(400).json({
        message: 'Start the interview and answer questions before completing',
      });
    }

    const interview = await Interview.findById(req.candidate.interviewId);
    const answers = await CandidateAnswer.find({
      interviewId: interview._id,
      candidateId: req.candidate._id,
    }).sort({ createdAt: 1 });

    const report = await generateFinalReport({ interview, candidate: req.candidate, answers });

    const result = await InterviewResult.findOneAndUpdate(
      { interviewId: interview._id },
      {
        interviewId: interview._id,
        candidateId: req.candidate._id,
        overallScore: report.overallScore,
        technicalScore: report.technicalScore,
        communicationScore: report.communicationScore,
        confidenceScore: report.confidenceScore,
        speakingScore: report.speakingScore,
        strengths: report.strengths || [],
        weaknesses: report.weaknesses || [],
        recommendation: report.recommendation,
        finalFeedback: report.finalFeedback,
        careerCoach: report.careerCoach,
        learningRoadmap: report.learningRoadmap || [],
        suggestedCareerPath: report.suggestedCareerPath,
        aiComments: report.aiComments,
        language: report.language,
        personality: report.personality,
        round: report.round,
        cvSummary: req.candidate.cvSummary,
        answersSummary: answers.map((a) => ({
          question: a.questionText,
          answer: a.candidateAnswer,
          score: a.aiScore,
          feedback: a.aiFeedback,
          type: a.questionType,
        })),
      },
      { upsert: true, new: true }
    );

    req.candidate.status = 'completed';
    await req.candidate.save();

    interview.status = 'completed';
    interview.pinExpiresAt = new Date();
    interview.pinCode = null;
    await interview.save();
    await Interview.updateOne({ _id: interview._id }, { $unset: { pinCode: 1 } });

    const admin = await User.findById(interview.createdBy);
    if (admin) {
      await Notification.create({
        userId: admin._id,
        type: 'completion',
        message: `${req.candidate.name} completed interview — ${report.recommendation}`,
      });
      await Notification.create({
        userId: admin._id,
        type: 'result',
        message: `Report ready: ${req.candidate.name} scored ${report.overallScore}%`,
      });
    }

    res.json({ completed: true, result, careerCoach: report.careerCoach });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Admin profile ────────────────────────────────────────────────────────────

router.get('/admin/me', protect, authorize('admin'), (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    createdAt: req.user.createdAt,
  });
});

router.put('/admin/change-password', protect, authorize('admin'), async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    const user = await User.findById(req.user._id);
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ ok: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── AI question admin CRUD (before interview starts) ─────────────────────────

async function assertInterviewEditable(interviewId) {
  const interview = await Interview.findById(interviewId);
  if (!interview) return { error: { status: 404, message: 'Interview not found' } };
  if (interview.status === 'completed') {
    return { error: { status: 400, message: 'Cannot modify a completed interview' } };
  }
  const candidate = await Candidate.findOne({ interviewId });
  if (candidate?.status === 'interview_started' || candidate?.status === 'completed') {
    return {
      error: {
        status: 400,
        message: 'Cannot edit AI questions after the candidate has started the interview',
      },
    };
  }
  return { interview, candidate };
}

router.put('/ai-questions/:id', protect, authorize('admin'), async (req, res) => {
  const question = await AIQuestion.findById(req.params.id);
  if (!question) return res.status(404).json({ message: 'AI question not found' });

  const check = await assertInterviewEditable(question.interviewId);
  if (check.error) return res.status(check.error.status).json({ message: check.error.message });

  if (req.body.questionText !== undefined) {
    question.questionText = sanitize(req.body.questionText);
    if (!question.questionText) return res.status(400).json({ message: 'Question text required' });
  }
  if (req.body.difficulty !== undefined) {
    question.difficulty = normalizeDifficulty(req.body.difficulty);
  }
  await question.save();
  res.json(question);
});

router.delete('/ai-questions/:id', protect, authorize('admin'), async (req, res) => {
  const question = await AIQuestion.findById(req.params.id);
  if (!question) return res.status(404).json({ message: 'AI question not found' });

  const check = await assertInterviewEditable(question.interviewId);
  if (check.error) return res.status(check.error.status).json({ message: check.error.message });

  await question.deleteOne();
  res.json({ ok: true });
});

// ─── AI Routes ────────────────────────────────────────────────────────────────

router.post('/ai/extract-cv', protectCandidate, async (req, res) => {
  if (!req.candidate.cvText) return res.status(400).json({ message: 'No CV uploaded' });
  const interview = await Interview.findById(req.candidate.interviewId);
  const extracted = await extractCvData(req.candidate.cvText, interview.jobRole);
  res.json(extracted);
});

router.post('/ai/generate-questions', protect, authorize('admin'), async (req, res) => {
  const { interviewId, cvData, jobRole } = req.body;
  const generated = await generateCvQuestions(cvData || {}, jobRole || 'Software Engineer', 5);
  res.json({ questions: generated });
});

router.post('/ai/evaluate-answer', protectCandidate, async (req, res) => {
  const { question, answer } = req.body;
  const interview = await Interview.findById(req.candidate.interviewId);
  const result = await evaluateAnswer(sanitize(question), sanitize(answer), {
    jobRole: interview?.jobRole || 'Professional',
    language: req.candidate.language || interview?.language || 'en',
    personality: req.candidate.personality || interview?.personality || 'friendly_hr',
    difficulty: req.candidate.difficulty || interview?.difficulty || 'medium',
    round: req.candidate.round || interview?.round || 'technical',
  });
  res.json(result);
});

router.post('/ai/final-report', protect, authorize('admin'), async (req, res) => {
  const result = await InterviewResult.findOne({ interviewId: req.body.interviewId });
  if (!result) return res.status(404).json({ message: 'Report not found' });
  res.json(result);
});

// ─── Voice ────────────────────────────────────────────────────────────────────

router.post('/voice/generate-question-audio', async (req, res) => {
  try {
    const text = sanitize(req.body.text);
    if (!text) return res.status(400).json({ message: 'Question text required' });

    const personality = req.body.personality || 'friendly_hr';
    const language = req.body.language || 'en';
    const audioPath = await synthesizeSpeech(text, personality, language);
    if (!audioPath) {
      return res.json({ audioUrl: null, fallback: true, message: 'Voice unavailable — read the question on screen' });
    }
    const base = process.env.SERVER_URL || 'http://localhost:5173';
    res.json({ audioUrl: `${base}${audioPath}`, fallback: false });
  } catch (err) {
    res.json({ audioUrl: null, fallback: true, message: err.message });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function reorderCustomQuestions(interviewId) {
  const questions = await CustomQuestion.find({ interviewId }).sort({ orderNumber: 1 });
  for (let i = 0; i < questions.length; i++) {
    questions[i].orderNumber = i + 1;
    await questions[i].save();
  }
}

function formatInterview(iv) {
  return {
    id: iv._id,
    title: iv.title,
    jobRole: iv.jobRole,
    candidateName: iv.candidateName,
    candidateEmail: iv.candidateEmail,
    pinCode: iv.pinCode,
    pinExpiresAt: iv.pinExpiresAt,
    status: iv.status,
    language: iv.language,
    personality: iv.personality,
    round: iv.round,
    includeCoding: iv.includeCoding,
    difficulty: iv.difficulty,
    createdAt: iv.createdAt,
  };
}

function formatCandidate(c) {
  return {
    id: c._id,
    name: c.name,
    email: c.email,
    status: c.status,
    language: c.language,
    personality: c.personality,
    round: c.round,
    difficulty: c.difficulty,
    cvFileUrl: c.cvFileUrl,
    cvSummary: c.cvSummary,
    extractedSkills: c.extractedSkills,
    currentQuestionIndex: c.currentQuestionIndex,
    liveMetrics: c.liveMetrics,
    metricsHistory: c.metricsHistory,
    cheatEvents: c.cheatEvents,
    codingSubmitted: c.codingSubmitted,
    codingScore: c.codingScore,
  };
}

module.exports = router;
