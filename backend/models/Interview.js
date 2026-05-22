const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    jobRole: { type: String, required: true, trim: true },
    candidateName: { type: String, required: true, trim: true },
    candidateEmail: { type: String, required: true, trim: true, lowercase: true },
    pinCode: { type: String, sparse: true, unique: true },
    pinExpiresAt: { type: Date },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'completed', 'expired'],
      default: 'scheduled',
    },
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
    includeCoding: { type: Boolean, default: false },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Interview', interviewSchema, 'interviews');
