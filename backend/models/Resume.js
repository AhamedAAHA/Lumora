const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession' },
    fileName: { type: String, trim: true },
    skills: [String],
    education: [String],
    projects: [String],
    experience: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resume', resumeSchema);
