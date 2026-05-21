const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['scheduled', 'result', 'completion', 'warning'],
      default: 'result',
    },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    relatedSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
