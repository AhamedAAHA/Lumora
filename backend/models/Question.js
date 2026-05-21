const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    jobRoleId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobRole' },
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession' },
    text: { type: String, required: true, trim: true },
    round: {
      type: String,
      enum: ['hr', 'aptitude', 'technical', 'final', 'coding'],
      default: 'technical',
    },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    source: { type: String, enum: ['manual', 'ai'], default: 'manual' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Question', questionSchema);
