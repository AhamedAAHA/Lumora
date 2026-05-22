const mongoose = require('mongoose');

const candidateAnswerSchema = new mongoose.Schema(
  {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    /** ObjectId string for custom/ai questions, or stable key e.g. followup-<id> */
    questionId: { type: String, required: true },
    questionType: { type: String, enum: ['custom', 'ai', 'followup'], required: true },
    questionText: { type: String, required: true },
    candidateAnswer: { type: String, required: true },
    aiScore: { type: Number, min: 0, max: 10 },
    aiFeedback: { type: String },
    metrics: {
      confidence: Number,
      communication: Number,
      speaking: Number,
      wpm: Number,
      fillers: Number,
      responseTimeMs: Number,
    },
  },
  { timestamps: true }
);

candidateAnswerSchema.index({ interviewId: 1, candidateId: 1 });

module.exports = mongoose.model('CandidateAnswer', candidateAnswerSchema, 'candidateanswers');
