const mongoose = require('mongoose');

const jobRoleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    department: { type: String, trim: true, default: 'General' },
    description: { type: String, trim: true, default: '' },
    skills: [{ type: String, trim: true }],
    rounds: [
      {
        type: String,
        enum: ['hr', 'aptitude', 'technical', 'final', 'coding'],
      },
    ],
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobRole', jobRoleSchema);
