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

async function generateNextAiQuestion(session) {
  const personality = PERSONALITY_PROMPTS[session.personality];
  const resumeCtx = buildResumeContext(session.resumeData);
  if (!resumeCtx) {
    return fallbackQuestion(session);
  }

  const answered = (session.answers || []).map((a) => a.question).filter(Boolean);
  const avoid = [session.introQuestion, session.currentQuestion, ...answered].filter(Boolean);

  const prompt = await chat(
    `${personality} Conduct a ${session.round} interview.\n\nCANDIDATE RESUME (only use facts from here):\n${resumeCtx}`,
    `Generate ONE follow-up interview question strictly based on the candidate's actual resume above. ` +
      `Reference a specific skill, project, or experience line that appears in the resume text. ` +
      `Do NOT mention technologies, tools, or projects that are not listed in the resume. ` +
      `Do NOT ask a generic introduction or "tell me about yourself". ` +
      `Avoid repeating: ${avoid.slice(0, 10).join(' | ')}. ` +
      `Return JSON: {"question":"...","comment":""}`,
    session.language
  );

  if (prompt) {
    try {
      const parsed = JSON.parse(prompt.replace(/```json|```/g, '').trim());
      if (parsed.question) return parsed;
    } catch (_) {}
  }

  const resumeQuestion = pickFreshQuestion(
    buildResumeFallbackQuestions(session.resumeData),
    avoid
  );
  if (resumeQuestion) return { question: resumeQuestion, comment: '' };
  return fallbackQuestion(session);
}

async function generateFirstQuestion(session) {
  const personality = PERSONALITY_PROMPTS[session.personality];
  const resumeCtx = buildResumeContext(session.resumeData);
  const avoidCtx = Array.isArray(session.avoidQuestions) && session.avoidQuestions.length
    ? `Do not repeat or closely paraphrase these existing questions: ${session.avoidQuestions
        .slice(0, 12)
        .join(' | ')}.`
    : '';

  const prompt = await chat(
    `${personality} Conduct a ${session.round} interview. ${resumeCtx}`,
    `Generate one fresh opening interview question. ${avoidCtx} If resume context is provided, personalize it to a specific project, skill, or experience from that resume. If no resume context is provided, ask a role-appropriate general interview question without naming technologies that were not provided. Return JSON: {"question":"...","comment":""}`,
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
  const resumeQuestion = pickFreshQuestion(
    buildResumeFallbackQuestions(session.resumeData),
    session.avoidQuestions
  );
  if (resumeQuestion) return { question: resumeQuestion, comment: '' };

  const roundQs = {
    hr: [
      'Tell me about yourself and why you are interested in this role.',
      'Describe a time you handled feedback and changed how you worked afterward.',
      'What kind of team environment helps you do your best work?',
    ],
    aptitude: [
      'If a train travels 60 km in 45 minutes, what is its average speed in km/h?',
      'A product price increases by 20% and then decreases by 20%. Is the final price higher, lower, or the same as the original?',
      'If five people complete five tasks in five days, how many days would ten people take to complete ten similar tasks?',
    ],
    technical: [
      'Explain the difference between REST and GraphQL APIs. When would you choose each?',
      'How would you debug a slow API endpoint from the browser to the database?',
      'Describe how you would design a feature so it remains maintainable as requirements change.',
    ],
    final: [
      'Summarize your biggest professional achievement and what you learned from it.',
      'What would you focus on in your first 30 days if selected for this role?',
      'Which strength would you bring to this team immediately, and where would you still need support?',
    ],
  };
  return {
    question: pickFreshQuestion(roundQs[session.round] || roundQs.technical, session.avoidQuestions),
    comment: '',
  };
}

function buildResumeContext(resumeData = {}) {
  const parts = [];
  if (resumeData.summary) parts.push(`Summary: ${resumeData.summary}`);
  if (resumeData.skills?.length) parts.push(`Skills: ${resumeData.skills.join(', ')}`);
  if (resumeData.projects?.length) parts.push(`Projects: ${resumeData.projects.join('; ')}`);
  if (resumeData.experience?.length) parts.push(`Experience: ${resumeData.experience.join('; ')}`);
  if (resumeData.education?.length) parts.push(`Education: ${resumeData.education.join('; ')}`);
  const raw = String(resumeData.rawText || '').trim();
  if (raw.length > 0) {
    parts.push(`Resume excerpt: ${raw.slice(0, 2500)}`);
  }
  return parts.length ? `${parts.join('\n')}` : '';
}

function buildResumeFallbackQuestions(resumeData = {}) {
  const skills = (resumeData.skills || []).filter(Boolean).slice(0, 4);
  const projects = (resumeData.projects || []).filter(Boolean).slice(0, 3);
  const experience = (resumeData.experience || []).filter(Boolean).slice(0, 3);
  const questions = [];

  if (skills.length && (projects.length || experience.length)) {
    const skill = skills[0];
    questions.push(
      `Your resume lists ${skill}. Describe a real project or role where you applied it and what outcome you achieved.`
    );
  }
  projects.forEach((project) => {
    questions.push(`Your resume mentions ${project}. What was the hardest technical decision in that project?`);
    questions.push(`For ${project}, how did you measure whether the implementation was successful?`);
  });
  experience.forEach((item) => {
    questions.push(`In your experience with ${item}, what responsibility had the most impact and why?`);
  });

  return questions;
}

function pickFreshQuestion(candidates = [], avoidQuestions = []) {
  if (!candidates.length) return '';
  const normalizedAvoid = new Set((avoidQuestions || []).map(normalizeQuestion));
  const fresh = candidates.find((question) => question && !normalizedAvoid.has(normalizeQuestion(question)));
  if (fresh) return fresh;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function normalizeQuestion(question = '') {
  return String(question).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function evaluateAndRespond(session, answer, metrics) {
  const lastQ = session.currentQuestion;
  const personality = PERSONALITY_PROMPTS[session.personality];
  const resumeCtx = session.questionIndex > 0 ? buildResumeContext(session.resumeData) : '';

  const prompt = `Interview Q: ${lastQ}
Candidate answer: ${answer}
Metrics: confidence ${metrics.confidence}, communication ${metrics.communication}
Difficulty: ${session.difficulty}
Question index: ${session.questionIndex}
${resumeCtx ? `${resumeCtx} Next questions should stay relevant to this resume when not using a follow-up.` : 'This was the introduction question — keep the next question resume-based if index advances.'}

Evaluate answer 0-100. Decide next difficulty: "easy"|"medium"|"hard" (raise if score>75, lower if <50).
Do not create follow-up questions. Keep needsFollowUp false and followUpQuestion empty.
Return JSON only:
{"score":0,"nextDifficulty":"medium","needsFollowUp":false,"followUpQuestion":"","nextQuestion":"","conversationalComment":"Thank you. Let us continue."}`;

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
  }

  result.needsFollowUp = false;
  result.followUpQuestion = '';
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
  generateNextAiQuestion,
  evaluateAndRespond,
  generateCareerCoach,
  evaluateCode,
  chat,
};
