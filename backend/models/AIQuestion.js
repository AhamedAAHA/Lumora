const mongoose = require('mongoose');

const aiQuestionSchema = new mongoose.Schema(
  {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true },
    questionText: { type: String, required: true, trim: true },
    basedOn: {
      type: String,
      enum: [
        'cv_skill',
        'cv_project',
        'cv_experience',
        'cv_education',
        'cv_technologies',
        'cv_certification',
        'followup',
      ],
      default: 'cv_skill',
    },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    orderNumber: { type: Number, default: 0 },
  },
  { timestamps: true }
);

aiQuestionSchema.index({ interviewId: 1, orderNumber: 1 });

module.exports = mongoose.model('AIQuestion', aiQuestionSchema, 'aiquestions');
