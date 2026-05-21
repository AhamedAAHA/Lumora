const OpenAI = require('openai');

let openai = null;
function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

const LANG_NAMES = { en: 'English', ta: 'Tamil', si: 'Sinhala' };

const PERSONALITY_PROMPTS = {
  friendly_hr:
    'You are a warm, encouraging HR interviewer. Use supportive tone and conversational transitions.',
  strict_corporate:
    'You are a strict corporate interviewer. Be formal, direct, and probe for specifics.',
  senior_engineer:
    'You are a senior software engineer. Ask deep technical questions about architecture and trade-offs.',
  startup_founder:
    'You are a startup founder. Focus on ownership, speed, impact, and problem-solving mindset.',
  technical_lead:
    'You are a technical lead. Evaluate system design, teamwork, and technical leadership.',
};

async function chat(system, user, language = 'en') {
  const client = getClient();
  const langNote = `Respond in ${LANG_NAMES[language] || 'English'}.`;
  if (!client) {
    return null;
  }
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: `${system}\n${langNote}` },
      { role: 'user', content: user },
    ],
    temperature: 0.7,
  });
  return res.choices[0]?.message?.content?.trim();
}

async function generateFirstQuestion(session) {
  const personality = PERSONALITY_PROMPTS[session.personality];
  const resumeCtx = session.resumeData?.skills?.length
    ? `Resume skills: ${session.resumeData.skills.join(', ')}. Projects: ${session.resumeData.projects?.join('; ')}`
    : '';

  const prompt = await chat(
    `${personality} Conduct a ${session.round} interview. ${resumeCtx}`,
    `Generate the opening interview question. If resume mentions React or similar, personalize like "I noticed you built a React project — explain how state management works." Return JSON: {"question":"...","comment":""}`,
    session.language
  );

  if (prompt) {
    try {
      const parsed = JSON.parse(prompt.replace(/```json|```/g, '').trim());
      return parsed;
    } catch (_) {}
  }

  return fallbackQuestion(session);
}

function fallbackQuestion(session) {
  const skill = session.resumeData?.skills?.[0];
  if (skill === 'react') {
    return {
      question:
        'I noticed you worked with React. Can you explain how you handle state management in a medium-sized application?',
      comment: '',
    };
  }
  const roundQs = {
    hr: 'Tell me about yourself and why you are interested in this role.',
    aptitude: 'If a train travels 60 km in 45 minutes, what is its average speed in km/h?',
    technical: 'Explain the difference between REST and GraphQL APIs. When would you choose each?',
    final: 'Summarize your biggest professional achievement and what you learned from it.',
  };
  return { question: roundQs[session.round] || roundQs.technical, comment: '' };
}

async function evaluateAndRespond(session, answer, metrics) {
  const lastQ = session.currentQuestion;
  const personality = PERSONALITY_PROMPTS[session.personality];

  const prompt = `Interview Q: ${lastQ}
Candidate answer: ${answer}
Metrics: confidence ${metrics.confidence}, communication ${metrics.communication}
Difficulty: ${session.difficulty}
Question index: ${session.questionIndex}

Evaluate answer 0-100. Decide next difficulty: "easy"|"medium"|"hard" (raise if score>75, lower if <50).
If answer incomplete, set needsFollowUp true and followUpQuestion.
Return JSON only:
{"score":0,"nextDifficulty":"medium","needsFollowUp":false,"followUpQuestion":"","nextQuestion":"","conversationalComment":"Interesting answer. Can you elaborate..."}`;

  const ai = await chat(personality, prompt, session.language);

  let result = {
    score: metrics.confidence,
    nextDifficulty: session.difficulty,
    needsFollowUp: false,
    followUpQuestion: '',
    nextQuestion: '',
    conversationalComment: 'Thank you for sharing.',
  };

  if (ai) {
    try {
      result = { ...result, ...JSON.parse(ai.replace(/```json|```/g, '').trim()) };
    } catch (_) {}
  } else {
    result.score = Math.round((metrics.confidence + metrics.communication) / 2);
    if (result.score > 75) result.nextDifficulty = 'hard';
    else if (result.score < 50) result.nextDifficulty = 'easy';
    result.nextQuestion = getFallbackNext(session);
    if (answer.split(' ').length < 20) {
      result.needsFollowUp = true;
      result.followUpQuestion = 'Can you provide more specific details or examples?';
    }
  }

  return result;
}

function getFallbackNext(session) {
  const pool = {
    easy: [
      'What is your understanding of version control with Git?',
      'Describe a simple project you enjoyed working on.',
    ],
    medium: [
      'How do you handle conflicting requirements from stakeholders?',
      'Explain how you would debug a slow API endpoint.',
    ],
    hard: [
      'Design a scalable notification system for 1M users.',
      'How would you migrate a monolith to microservices with zero downtime?',
    ],
  };
  const qs = pool[session.difficulty] || pool.medium;
  return qs[session.questionIndex % qs.length];
}

async function generateCareerCoach(session, scores, language) {
  const prompt = `Based on interview with scores: technical ${scores.technical}, communication ${scores.communication}.
Skills from resume: ${session.resumeData?.skills?.join(', ') || 'general'}
Provide career coaching in ${LANG_NAMES[language]}.
Return JSON: {"coach":"paragraph","roadmap":["skill1","skill2"],"careerPath":"suggested path","strengths":[""],"weaknesses":[""]}`;

  const ai = await chat('You are an expert career coach.', prompt, language);
  if (ai) {
    try {
      return JSON.parse(ai.replace(/```json|```/g, '').trim());
    } catch (_) {}
  }
  return {
    coach:
      'You are strong in frontend development but should improve backend API knowledge and system design.',
    roadmap: ['Node.js APIs', 'System design basics', 'Database optimization'],
    careerPath: 'Full-stack engineer → Senior developer',
    strengths: ['Communication', 'Frontend skills'],
    weaknesses: ['Backend depth', 'Advanced algorithms'],
  };
}

async function evaluateCode(code) {
  const ai = await chat(
    'You evaluate coding interview submissions.',
    `Evaluate this code for correctness, quality, efficiency. Return JSON: {"score":0,"feedback":"...","quality":"good|average|poor","output":"simulated output"}\n\nCode:\n${code}`
  );
  if (ai) {
    try {
      return JSON.parse(ai.replace(/```json|```/g, '').trim());
    } catch (_) {}
  }
  return {
    score: 70,
    feedback: 'Solid approach. Consider edge cases and time complexity.',
    quality: 'average',
    output: '[1, 2]',
  };
}

module.exports = {
  generateFirstQuestion,
  evaluateAndRespond,
  generateCareerCoach,
  evaluateCode,
  chat,
};
