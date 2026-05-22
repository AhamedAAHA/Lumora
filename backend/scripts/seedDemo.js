/**
 * Demo data for admin dashboard tabs + sample PIN interviews
 * Run: npm run seed:demo
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const JobRole = require('../models/JobRole');
const Question = require('../models/Question');
const InterviewSession = require('../models/InterviewSession');
const Report = require('../models/Report');
const Interview = require('../models/Interview');
const Candidate = require('../models/Candidate');
const CustomQuestion = require('../models/CustomQuestion');
const AIQuestion = require('../models/AIQuestion');
const CandidateAnswer = require('../models/CandidateAnswer');
const InterviewResult = require('../models/InterviewResult');
const Notification = require('../models/Notification');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lumora';

const DEMO_PINS = {
  active: '482910',
  ready: '573821',
};

async function ensureUser({ name, email, password, role }) {
  let user = await User.findOne({ email });
  if (!user) user = await User.create({ name, email, password, role });
  return user;
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Seeding demo data...');

  const admin = await ensureUser({
    name: 'Lumora Admin',
    email: process.env.ADMIN_EMAIL || 'admin@lumora.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    role: 'admin',
  });

  const candidates = await Promise.all(
    [
      ['Verity Chen', 'verity@demo.com'],
      ['Ahamed Khan', 'ahamed@demo.com'],
      ['Priya Nair', 'priya@demo.com'],
      ['James Miller', 'james@demo.com'],
      ['Nina Brooks', 'nina@demo.com'],
    ].map(([name, email]) => ensureUser({ name, email, password: 'demo1234', role: 'candidate' }))
  );

  await JobRole.deleteMany({ title: { $in: ['Full Stack Developer', 'HR Associate', 'Data Engineer', 'Product Designer'] } });
  const roles = await JobRole.insertMany([
    {
      title: 'Full Stack Developer',
      department: 'Engineering',
      description: 'React, Node, MongoDB',
      skills: ['React', 'Node.js', 'MongoDB', 'REST'],
      rounds: ['hr', 'technical', 'final'],
      createdBy: admin._id,
    },
    {
      title: 'HR Associate',
      department: 'People',
      description: 'Campus hiring and culture fit',
      skills: ['Communication', 'HR policies'],
      rounds: ['hr', 'aptitude'],
      createdBy: admin._id,
    },
    {
      title: 'Data Engineer',
      department: 'Data',
      description: 'Pipelines and SQL',
      skills: ['Python', 'SQL', 'ETL'],
      rounds: ['aptitude', 'technical'],
      createdBy: admin._id,
    },
    {
      title: 'Product Designer',
      department: 'Design',
      description: 'UX for SaaS products',
      skills: ['Figma', 'UX research'],
      rounds: ['hr', 'final'],
      createdBy: admin._id,
    },
  ]);

  await Question.deleteMany({ text: { $regex: /^DEMO:/ } });
  const questionTexts = [
    ['DEMO: Tell me about yourself and why you chose software engineering.', 'hr', 'easy', 'manual'],
    ['DEMO: Explain how state management works in a React project you built.', 'technical', 'medium', 'manual'],
    ['DEMO: How would you design RESTful APIs for a multi-tenant SaaS?', 'technical', 'hard', 'ai'],
    ['DEMO: Describe a time you resolved a conflict in a team.', 'hr', 'medium', 'manual'],
    ['DEMO: What is the difference between SQL and NoSQL databases?', 'aptitude', 'easy', 'manual'],
    ['DEMO: Walk through your approach to debugging a production outage.', 'technical', 'hard', 'ai'],
    ['DEMO: How do you prioritize tasks when deadlines overlap?', 'hr', 'medium', 'manual'],
  ];
  for (const [text, round, difficulty, source] of questionTexts) {
    await Question.create({
      text,
      round,
      difficulty,
      source,
      jobRoleId: roles[0]._id,
      createdBy: admin._id,
    });
  }

  // Legacy interview sessions + reports
  for (let i = 0; i < 4; i++) {
    const cand = candidates[i];
    const session = await InterviewSession.create({
      candidateId: cand._id,
      jobRoleId: roles[i % roles.length]._id,
      language: 'en',
      personality: ['friendly_hr', 'senior_engineer', 'technical_lead', 'strict_corporate'][i],
      round: ['hr', 'technical', 'technical', 'final'][i],
      totalQuestions: 6,
      questionIndex: 6,
      status: 'completed',
      overallScore: [78, 85, 62, 91][i],
      recommendation: ['shortlisted', 'selected', 'needs_improvement', 'selected'][i],
      answers: [
        { question: 'Intro question', candidateAnswer: 'Sample answer', aiScore: 7, metrics: { confidence: 75, communication: 80 } },
        { question: 'Technical question', candidateAnswer: 'Sample answer', aiScore: 8, metrics: { confidence: 82, communication: 78 } },
      ],
    });
    const report = await Report.create({
      sessionId: session._id,
      candidateId: cand._id,
      overallScore: session.overallScore,
      technicalScore: session.overallScore - 5,
      communicationScore: 74 + i * 3,
      confidenceScore: 70 + i * 4,
      recommendation: session.recommendation,
      summary: `DEMO: Completed ${session.round} interview.`,
      strengths: ['Clear communication', 'Strong fundamentals'],
      weaknesses: ['Could improve system design depth'],
      careerCoach: 'Focus on backend APIs and system design practice.',
    });
    session.reportId = report._id;
    await session.save();
  }

  for (let i = 0; i < 3; i++) {
    const cand = candidates[i];
    const session = await InterviewSession.create({
      candidateId: cand._id,
      jobRoleId: roles[i % roles.length]._id,
      round: i === 0 ? 'hr' : 'technical',
      personality: 'friendly_hr',
      status: 'active',
      totalQuestions: 6,
      questionIndex: 0,
      introQuestion: `DEMO: ${cand.name}, introduce yourself and your background.`,
      currentQuestion: `DEMO: ${cand.name}, introduce yourself and your background.`,
      resumeUploaded: false,
      language: 'en',
    });
    await Notification.create({
      userId: cand._id,
      type: 'scheduled',
      message: `A ${session.round} interview is ready for you.`,
      relatedSessionId: session._id,
    });
  }

  // PIN interviews
  const pinSpecs = [
    {
      pin: DEMO_PINS.active,
      name: 'Demo Candidate Active',
      email: 'pin.active@demo.com',
      title: 'DEMO: Full Stack Interview',
      status: 'active',
      candStatus: 'pending',
    },
    {
      pin: DEMO_PINS.ready,
      name: 'Demo Candidate Ready',
      email: 'pin.ready@demo.com',
      title: 'DEMO: Technical Screen',
      status: 'active',
      candStatus: 'cv_uploaded',
    },
    {
      pin: '691204',
      name: 'Verity',
      email: 'verity@demo.com',
      title: 'DEMO: Completed — Verity',
      status: 'completed',
      candStatus: 'completed',
      score: 88,
      rec: 'Selected',
    },
  ];

  for (const spec of pinSpecs) {
    let iv = await Interview.findOne({ pinCode: spec.pin });
    if (!iv) {
      iv = await Interview.create({
        title: spec.title,
        jobRole: 'Full Stack Developer',
        candidateName: spec.name,
        candidateEmail: spec.email,
        status: spec.status === 'completed' ? 'completed' : 'active',
        pinCode: spec.pin,
        pinExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        language: 'en',
        personality: 'senior_engineer',
        round: 'technical',
        difficulty: 'medium',
        includeCoding: true,
        createdBy: admin._id,
      });
      await CustomQuestion.create({
        interviewId: iv._id,
        questionText: 'DEMO: Introduce yourself briefly.',
        orderNumber: 1,
        type: 'admin_custom',
      });
      await CustomQuestion.create({
        interviewId: iv._id,
        questionText: 'DEMO: Why do you want to join our team?',
        orderNumber: 2,
        type: 'admin_custom',
      });
      await AIQuestion.create({
        interviewId: iv._id,
        questionText: 'DEMO: Explain how you used React state in a recent project.',
        orderNumber: 1,
        difficulty: 'medium',
      });
    }

    let cand = await Candidate.findOne({ interviewId: iv._id });
    if (!cand) {
      cand = await Candidate.create({
        name: spec.name,
        email: spec.email,
        pinCode: spec.pin,
        interviewId: iv._id,
        status: spec.candStatus,
        cvSummary: 'DEMO: Full stack developer with React and Node experience.',
        extractedSkills: ['React', 'JavaScript', 'Node.js'],
        language: 'en',
        personality: 'senior_engineer',
      });
    }

    if (spec.candStatus === 'completed') {
      const cq = await CustomQuestion.findOne({ interviewId: iv._id }).sort({ orderNumber: 1 });
      await CandidateAnswer.create({
        interviewId: iv._id,
        candidateId: cand._id,
        questionId: cq?._id || iv._id,
        questionType: 'custom',
        questionText: 'DEMO: Introduce yourself briefly.',
        candidateAnswer: 'DEMO answer with clear structure.',
        aiScore: 8,
        aiFeedback: 'Strong introduction.',
      });
      await InterviewResult.findOneAndUpdate(
        { interviewId: iv._id },
        {
          interviewId: iv._id,
          candidateId: cand._id,
          overallScore: spec.score,
          technicalScore: 86,
          communicationScore: 90,
          confidenceScore: 84,
          speakingScore: 82,
          recommendation: spec.rec,
          finalFeedback: 'DEMO: Strong frontend skills; continue backend depth.',
          strengths: ['React', 'Communication'],
          weaknesses: ['API design'],
          careerCoach: 'Practice Node.js APIs and system design.',
          learningRoadmap: ['Node.js APIs', 'System design basics'],
          suggestedCareerPath: 'Frontend → Full Stack Engineer',
        },
        { upsert: true }
      );
    }
  }

  console.log('\n--- Demo ready ---');
  console.log('Admin: admin@lumora.com / admin123');
  console.log('Candidates (login): verity@demo.com / demo1234');
  console.log(`PIN (active): ${DEMO_PINS.active}`);
  console.log(`PIN (CV uploaded): ${DEMO_PINS.ready}`);
  console.log('Open admin: http://localhost:5173/admin');
  console.log('Open PIN:    http://localhost:5173/pin\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
