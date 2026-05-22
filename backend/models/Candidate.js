const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: '' },
    pinCode: { type: String, required: true },
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true },
    cvFileUrl: { type: String },
    cvText: { type: String },
    cvSummary: { type: String },
    extractedSkills: [String],
    extractedEducation: [String],
    extractedExperience: [String],
    extractedProjects: [String],
    extractedCertifications: [String],
    extractedTechnologies: [String],
    language: { type: String, enum: ['en', 'ta', 'si'], default: 'en' },
    personality: { type: String, default: 'friendly_hr' },
    round: { type: String, default: 'technical' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    status: {
      type: String,
      enum: ['pending', 'cv_uploaded', 'interview_started', 'completed'],
      default: 'pending',
    },
    currentQuestionIndex: { type: Number, default: 0 },
    plannedQuestionTotal: { type: Number, default: 0 },
    lastInterviewerComment: { type: String, default: '' },
    startedAt: { type: Date },
    liveMetrics: {
      confidence: { type: Number, default: 72 },
      communication: { type: Number, default: 72 },
      speaking: { type: Number, default: 70 },
      wpm: { type: Number, default: 0 },
      fillers: { type: Number, default: 0 },
    },
    metricsHistory: [
      {
        confidence: Number,
        communication: Number,
        speaking: Number,
        score: Number,
        at: { type: Date, default: Date.now },
      },
    ],
    cheatEvents: [
      {
        type: { type: String, required: true },
        message: { type: String, default: '' },
        at: { type: Date, default: Date.now },
      },
    ],
    followUpQueue: [
      {
        questionKey: { type: String, default: '' },
        questionText: String,
        parentQuestionId: { type: mongoose.Schema.Types.Mixed },
        questionType: { type: String, default: 'followup' },
      },
    ],
    codingScore: Number,
    codingFeedback: String,
    codingSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

candidateSchema.index({ pinCode: 1 });
candidateSchema.index({ interviewId: 1 });
candidateSchema.index({ email: 1 });

module.exports = mongoose.model('Candidate', candidateSchema, 'candidates');
