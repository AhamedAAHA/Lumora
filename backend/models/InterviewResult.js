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
    answersSummary: [
      {
        question: String,
        answer: String,
        score: Number,
        feedback: String,
        type: String,
      },
    ],
  },
  { timestamps: true }
);

interviewResultSchema.index({ interviewId: 1 }, { unique: true });

module.exports = mongoose.model('InterviewResult', interviewResultSchema, 'interview_results');
