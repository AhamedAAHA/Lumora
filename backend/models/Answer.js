const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    metrics: {
      confidence: Number,
      communication: Number,
      speaking: Number,
      wpm: Number,
      fillers: Number,
    },
    aiScore: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Answer', answerSchema);
