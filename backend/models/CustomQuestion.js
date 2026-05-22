const mongoose = require('mongoose');

const customQuestionSchema = new mongoose.Schema(
  {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true },
    questionText: { type: String, required: true, trim: true },
    orderNumber: { type: Number, required: true, default: 1 },
    type: { type: String, default: 'admin_custom' },
    isEditable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

customQuestionSchema.index({ interviewId: 1, orderNumber: 1 });

module.exports = mongoose.model('CustomQuestion', customQuestionSchema, 'customquestions');
