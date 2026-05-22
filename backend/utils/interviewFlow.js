const CustomQuestion = require('../models/CustomQuestion');
const AIQuestion = require('../models/AIQuestion');

async function buildQuestionQueue(interviewId) {
  const custom = await CustomQuestion.find({ interviewId }).sort({ orderNumber: 1 });
  const ai = await AIQuestion.find({ interviewId }).sort({ orderNumber: 1 });

  return [
    ...custom.map((q) => ({
      id: String(q._id),
      text: q.questionText,
      type: 'custom',
    })),
    ...ai.map((q) => ({
      id: String(q._id),
      text: q.questionText,
      type: 'ai',
    })),
  ];
}

function computePlannedTotal(queue, configuredTotal) {
  const total = Number(configuredTotal);
  if (!Number.isFinite(total) || total <= 0) return queue.length;
  return Math.min(Math.round(total), queue.length);
}

function sliceQueueToPlan(queue, plannedTotal) {
  if (!plannedTotal || plannedTotal <= 0) return queue;
  return queue.slice(0, plannedTotal);
}

function getCurrentQuestion(queue, index) {
  return queue[index] || null;
}

module.exports = {
  buildQuestionQueue,
  sliceQueueToPlan,
  getCurrentQuestion,
  computePlannedTotal,
};
