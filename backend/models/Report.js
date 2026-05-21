const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession' },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    technicalScore: Number,
    communicationScore: Number,
    confidenceScore: Number,
    overallScore: Number,
    recommendation: String,
    summary: String,
    strengths: [String],
    weaknesses: [String],
    careerCoach: String,
    learningRoadmap: [String],
    suggestedCareerPath: String,
    aiComments: String,
    language: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema, 'results');
