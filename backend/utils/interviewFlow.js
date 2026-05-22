const CustomQuestion = require('../models/CustomQuestion');
const AIQuestion = require('../models/AIQuestion');

async function buildQuestionQueue(interviewId, candidate) {
  const custom = await CustomQuestion.find({ interviewId }).sort({ orderNumber: 1 });
  const ai = await AIQuestion.find({ interviewId }).sort({ orderNumber: 1 });

  const queue = [
    ...custom.map((q) => ({
      id: q._id,
      text: q.questionText,
      type: 'custom',
    })),
    ...ai.map((q) => ({
      id: q._id,
      text: q.questionText,
      type: 'ai',
    })),
    ...(candidate.followUpQueue || []).map((q, i) => ({
      id: q.questionKey || `followup-${i}`,
      text: q.questionText,
      type: 'followup',
      parentQuestionId: q.parentQuestionId,
    })),
  ];

  return queue;
}

function getCurrentQuestion(queue, index) {
  return queue[index] || null;
}

module.exports = { buildQuestionQueue, getCurrentQuestion };
