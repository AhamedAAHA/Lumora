const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question: String,
  answer: String,
  metrics: {
    confidence: Number,
    communication: Number,
    speaking: Number,
    wpm: Number,
    fillers: Number,
  },
  aiScore: Number,
  timestamp: { type: Date, default: Date.now },
});

const interviewSessionSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    jobRoleId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobRole' },
    language: { type: String, enum: ['en', 'ta', 'si'], default: 'en' },
    personality: {
      type: String,
      enum: [
        'friendly_hr',
        'strict_corporate',
        'senior_engineer',
        'startup_founder',
        'technical_lead',
      ],
      default: 'friendly_hr',
    },
    round: {
      type: String,
      enum: ['hr', 'aptitude', 'technical', 'final'],
      default: 'technical',
    },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    includeCoding: { type: Boolean, default: false },
    resumeData: {
      skills: [String],
      education: [String],
      projects: [String],
      experience: [String],
    },
    questionIndex: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 8 },
    currentQuestion: String,
    manualQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    lastComment: String,
    answers: [answerSchema],
    cheatEvents: [{ type: String, message: String, at: Date }],
    codingScore: Number,
    codingFeedback: String,
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'archived'],
      default: 'active',
    },
    overallScore: Number,
    recommendation: {
      type: String,
      enum: ['selected', 'shortlisted', 'needs_improvement', 'rejected'],
    },
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
