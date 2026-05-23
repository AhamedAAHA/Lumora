const mongoose = require('mongoose');

const interviewResultSchema = new mongoose.Schema(
  {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    overallScore: { type: Number, default: 0 },
    technicalScore: { type: Number, default: 0 },
    communicationScore: { type: Number, default: 0 },
    confidenceScore: { type: Number, default: 0 },
    speakingScore: { type: Number, default: 0 },
    codingScore: { type: Number },
    codingFeedback: { type: String },
    careerCoach: { type: String },
    learningRoadmap: [String],
    suggestedCareerPath: { type: String },
    aiComments: { type: String },
    language: { type: String },
    personality: { type: String },
    round: { type: String },
    strengths: [String],
    weaknesses: [String],
    recommendation: {
      type: String,
      enum: ['Selected', 'Shortlisted', 'Needs Improvement', 'Rejected'],
      default: 'Needs Improvement',
    },
    finalFeedback: { type: String },
    cvSummary: { type: String },
    answersSummary: [mongoose.Schema.Types.Mixed],
    /** Snapshot from interview live analytics */
    liveMetrics: {
      confidence: { type: Number, default: 0 },
      communication: { type: Number, default: 0 },
      speaking: { type: Number, default: 0 },
      wpm: { type: Number, default: 0 },
      fillers: { type: Number, default: 0 },
    },
    metricsHistory: [
      {
        confidence: Number,
        communication: Number,
        speaking: Number,
        score: Number,
        wpm: Number,
        fillers: Number,
        at: { type: Date, default: Date.now },
      },
    ],
    sessionQuality: {
      avgSubstance: { type: Number, default: 0 },
      avgAiScore: { type: Number, default: 0 },
      insufficientCount: { type: Number, default: 0 },
      validCount: { type: Number, default: 0 },
      sessionInvalid: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

interviewResultSchema.index({ interviewId: 1 }, { unique: true });

module.exports = mongoose.model('InterviewResult', interviewResultSchema, 'interview_results');
