const OpenAI = require('openai');
const { categorizeCandidate } = require('./recommendationEngine');

let openai = null;
function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

const LANG_NAMES = { en: 'English', ta: 'Tamil', si: 'Sinhala' };

const PERSONALITY_PROMPTS = {
  friendly_hr:
    'You are a warm, encouraging HR interviewer. Use supportive tone and natural transitions like "That is helpful" or "Interesting."',
  strict_corporate:
    'You are a strict corporate interviewer. Be formal, direct, and demand specifics.',
  senior_engineer:
    'You are a senior software engineer. Ask deep technical questions about architecture, trade-offs, and debugging.',
  startup_founder:
    'You are a startup founder. Focus on ownership, speed, impact, and scrappy problem-solving.',
  technical_lead:
    'You are a technical lead. Evaluate system design, collaboration, and technical leadership.',
};

async function chatJson(system, user, language = 'en') {
  const client = getClient();
  if (!client) return null;
  const langNote = `Respond in ${LANG_NAMES[language] || 'English'}.`;
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: `${system}\n${langNote}` },
      { role: 'user', content: user },
    ],
    temperature: 0.65,
    response_format: { type: 'json_object' },
  });
  const text = res.choices[0]?.message?.content?.trim();
  if (!text) return null;
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return null;
  }
}

/** Coerce AI resume fields to string arrays for MongoDB [String] schema */
function normalizeCvExtracted(data) {
  const toStrings = (items) => {
    if (!Array.isArray(items)) {
      if (typeof items === 'string') return [items.trim()].filter(Boolean);
      return [];
    }
    return items
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          return Object.entries(item)
            .filter(([, v]) => v != null && v !== '')
            .map(([k, v]) => `${k}: ${v}`)
            .join(' — ');
        }
        return String(item || '').trim();
      })
      .filter(Boolean);
  };

  return {
    skills: toStrings(data?.skills),
    education: toStrings(data?.education),
    experience: toStrings(data?.experience),
    projects: toStrings(data?.projects),
    certifications: toStrings(data?.certifications),
    technologies: toStrings(data?.technologies),
    summary: typeof data?.summary === 'string' ? data.summary : String(data?.summary || ''),
    rawText: typeof data?.rawText === 'string' ? data.rawText.slice(0, 6000) : '',
  };
}

async function extractCvData(cvText, jobRole, language = 'en') {
  const parsed = await chatJson(
    'You extract resume data accurately. Only include items clearly supported by the resume text.',
    `Extract structured data from this resume for a ${jobRole} role. Return JSON:
{"skills":["string"],"education":["string - one line per item"],"experience":["string"],"projects":["string - one line per project"],"certifications":["string"],"technologies":["string"],"summary":"2-3 sentences"}
Each array item MUST be a plain string, not an object.
Resume:\n${cvText.slice(0, 6000)}`,
    language
  );
  if (parsed) return normalizeCvExtracted(parsed);
  return normalizeCvExtracted(fallbackExtract(cvText));
}

function fallbackExtract(cvText) {
  const text = cvText.toLowerCase();
  const keywords = [
    'javascript', 'react', 'node', 'python', 'java', 'mongodb', 'sql', 'typescript',
    'aws', 'docker', 'css', 'html', 'express', 'spring', 'git', 'api', 'rest',
  ];
  const skills = keywords.filter((k) => text.includes(k));
  return {
    skills: [...new Set(skills)],
    education: text.includes('degree') ? ["Bachelor's degree"] : ['Education from resume'],
    experience: ['Professional experience'],
    projects: skills.slice(0, 3).map((s) => `${s} project`),
    certifications: [],
    technologies: skills,
    summary: 'Candidate profile extracted from uploaded resume.',
  };
}

const VALID_BASED_ON = new Set([
  'cv_skill',
  'cv_project',
  'cv_experience',
  'cv_education',
  'cv_technologies',
  'cv_certification',
  'followup',
]);

function normalizeBasedOn(value) {
  const key = String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
  const aliases = {
    cv_technology: 'cv_technologies',
    cv_technologies: 'cv_technologies',
    technologies: 'cv_technologies',
    cv_certifications: 'cv_certification',
    certification: 'cv_certification',
    skill: 'cv_skill',
    skills: 'cv_skill',
    project: 'cv_project',
    projects: 'cv_project',
    experience: 'cv_experience',
    education: 'cv_education',
    follow_up: 'followup',
  };
  const mapped = aliases[key] || key;
  return VALID_BASED_ON.has(mapped) ? mapped : 'cv_skill';
}

function normalizeDifficulty(value) {
  const d = String(value || 'medium').toLowerCase();
  return ['easy', 'medium', 'hard'].includes(d) ? d : 'medium';
}

async function generateCvQuestions(cvData, jobRole, count = 5, language = 'en', round = 'technical') {
  const ctx = JSON.stringify(cvData, null, 0).slice(0, 4000);
  const parsed = await chatJson(
    'You are a senior interviewer. Generate personalized questions referencing specific resume items.',
    `Job role: ${jobRole}. Round: ${round}.
Resume: ${ctx}
Generate exactly ${count} questions as JSON:
{"questions":[{"text":"...","basedOn":"cv_skill|cv_project|cv_experience|cv_education|cv_technologies|cv_certification","difficulty":"easy|medium|hard"}]}
Example style: "I noticed you built a React project. Explain how state management works."`,
    language
  );

  if (parsed?.questions?.length) {
    return parsed.questions.slice(0, count).map((q) => ({
      questionText: q.text || q.questionText,
      basedOn: normalizeBasedOn(q.basedOn),
      difficulty: normalizeDifficulty(q.difficulty),
    }));
  }
  return fallbackCvQuestions(cvData, jobRole, count);
}

function fallbackCvQuestions(cvData, jobRole, count) {
  const questions = [];
  (cvData.skills || []).slice(0, 2).forEach((skill) => {
    questions.push({
      questionText: `I noticed ${skill} on your resume. How did you use it in a recent ${jobRole} project?`,
      basedOn: 'cv_skill',
      difficulty: 'medium',
    });
  });
  while (questions.length < count) {
    questions.push({
      questionText: `Why are you interested in this ${jobRole} role?`,
      basedOn: 'cv_education',
      difficulty: 'easy',
    });
  }
  return questions.slice(0, count);
}

async function evaluateAnswer(questionText, answerText, options = {}) {
  const {
    jobRole = 'Professional',
    language = 'en',
    personality = 'friendly_hr',
    difficulty = 'medium',
    round = 'technical',
    metrics = {},
  } = options;

  const personalityPrompt = PERSONALITY_PROMPTS[personality] || PERSONALITY_PROMPTS.friendly_hr;

  const parsed = await chatJson(
    `${personalityPrompt} Evaluate fairly for a ${round} interview. Difficulty: ${difficulty}.`,
    `Job: ${jobRole}
Question: ${questionText}
Answer: ${answerText}
Live metrics — confidence: ${metrics.confidence || 'n/a'}, communication: ${metrics.communication || 'n/a'}, WPM: ${metrics.wpm || 'n/a'}, fillers: ${metrics.fillers || 0}

Return JSON:
{
  "score":0-10,
  "feedback":"constructive feedback in interview language",
  "conversationalComment":"natural HR transition e.g. Interesting answer. Can you elaborate...",
  "needsFollowUp":false,
  "followUpQuestion":"",
  "nextDifficulty":"easy|medium|hard"
}
Raise nextDifficulty if score>=8, lower if score<5. needsFollowUp if vague or under 25 words.`,
    language
  );

  if (parsed) {
    return {
      score: Math.min(10, Math.max(0, Number(parsed.score) || 0)),
      feedback: parsed.feedback || 'Thank you for your answer.',
      conversationalComment: parsed.conversationalComment || '',
      needsFollowUp: !!parsed.needsFollowUp,
      followUpQuestion: parsed.followUpQuestion || '',
      nextDifficulty: ['easy', 'medium', 'hard'].includes(parsed.nextDifficulty)
        ? parsed.nextDifficulty
        : difficulty,
    };
  }

  const wordCount = answerText.trim().split(/\s+/).length;
  let score = wordCount < 15 ? 4 : wordCount < 40 ? 6 : 8;
  let nextDifficulty = difficulty;
  if (score >= 8) nextDifficulty = 'hard';
  else if (score < 5) nextDifficulty = 'easy';

  return {
    score,
    feedback: score >= 7 ? 'Good depth in your response.' : 'Please provide more specific examples.',
    conversationalComment: score >= 7 ? 'Interesting answer.' : 'Can you tell me more about that?',
    needsFollowUp: wordCount < 25,
    followUpQuestion: wordCount < 25 ? 'What design pattern or approach did you use in that project?' : '',
    nextDifficulty,
  };
}

async function evaluateCode(code, jobRole, language = 'en') {
  const parsed = await chatJson(
    'You evaluate coding interview submissions.',
    `Job: ${jobRole}\nEvaluate code. Return JSON: {"score":0-100,"feedback":"...","quality":"good|average|poor","output":"simulated stdout"}\n\nCode:\n${code.slice(0, 8000)}`,
    language
  );
  if (parsed) return parsed;
  return {
    score: 70,
    feedback: 'Solid approach. Consider edge cases and time complexity.',
    quality: 'average',
    output: '[program output]',
  };
}

async function generateFinalReport({ interview, candidate, answers }) {
  const lang = candidate.language || interview.language || 'en';
  const avgAnswer =
    answers.length > 0
      ? answers.reduce((s, a) => s + (a.aiScore || 0), 0) / answers.length
      : 5;
  const avgConf =
    answers.length > 0
      ? answers.reduce((s, a) => s + (a.metrics?.confidence || 70), 0) / answers.length
      : 70;
  const avgComm =
    answers.length > 0
      ? answers.reduce((s, a) => s + (a.metrics?.communication || 70), 0) / answers.length
      : 70;
  const avgSpeak =
    answers.length > 0
      ? answers.reduce((s, a) => s + (a.metrics?.speaking || 70), 0) / answers.length
      : 70;

  const summary = answers
    .map((a) => `Q: ${a.questionText}\nA: ${a.candidateAnswer}\nScore: ${a.aiScore}/10`)
    .join('\n\n');

  const parsed = await chatJson(
    'You are an expert HR manager and career coach.',
    `Job: ${interview.jobRole}. Round: ${interview.round || 'technical'}. Personality mode: ${interview.personality}.
Candidate: ${candidate.name}
CV: ${candidate.cvSummary || 'N/A'}
Cheat warnings: ${candidate.cheatEvents?.length || 0}
Coding score: ${candidate.codingScore ?? 'N/A'}
Answers:\n${summary.slice(0, 7500)}

Return JSON:
{
  "overallScore":0-100,
  "technicalScore":0-100,
  "communicationScore":0-100,
  "confidenceScore":0-100,
  "speakingScore":0-100,
  "strengths":["..."],
  "weaknesses":["..."],
  "recommendation":"Selected|Shortlisted|Needs Improvement|Rejected",
  "finalFeedback":"HR summary paragraph",
  "careerCoach":"personalized coaching paragraph",
  "learningRoadmap":["skill1","skill2"],
  "suggestedCareerPath":"career path",
  "aiComments":"additional notes"
}`,
    lang
  );

  const technicalScore = Math.round(avgAnswer * 10);
  const confidenceScore = Math.round(avgConf);
  const communicationScore = Math.round(avgComm);
  const speakingScore = Math.round(avgSpeak);
  const overallScore = parsed?.overallScore
    ? Math.round(parsed.overallScore)
    : Math.round(technicalScore * 0.5 + confidenceScore * 0.25 + communicationScore * 0.25);

  const recMap = {
    selected: 'Selected',
    shortlisted: 'Shortlisted',
    needs_improvement: 'Needs Improvement',
    rejected: 'Rejected',
  };
  let recommendation = parsed?.recommendation;
  if (!['Selected', 'Shortlisted', 'Needs Improvement', 'Rejected'].includes(recommendation)) {
    const raw = categorizeCandidate(overallScore, confidenceScore, technicalScore);
    recommendation = recMap[raw] || 'Needs Improvement';
  }

  return {
    overallScore,
    technicalScore: parsed?.technicalScore ?? technicalScore,
    communicationScore: parsed?.communicationScore ?? communicationScore,
    confidenceScore: parsed?.confidenceScore ?? confidenceScore,
    speakingScore: parsed?.speakingScore ?? speakingScore,
    strengths: parsed?.strengths || ['Communication', 'Motivation'],
    weaknesses: parsed?.weaknesses || ['Technical depth'],
    recommendation,
    finalFeedback: parsed?.finalFeedback || `Completed ${interview.jobRole} interview.`,
    careerCoach:
      parsed?.careerCoach ||
      'You show promise. Focus on structured answers with metrics and concrete examples.',
    learningRoadmap: parsed?.learningRoadmap || ['System design', 'API development'],
    suggestedCareerPath: parsed?.suggestedCareerPath || `${interview.jobRole} → Senior ${interview.jobRole}`,
    aiComments: parsed?.aiComments || '',
    language: lang,
    personality: interview.personality,
    round: interview.round,
  };
}

module.exports = {
  normalizeCvExtracted,
  normalizeBasedOn,
  normalizeDifficulty,
  extractCvData,
  generateCvQuestions,
  evaluateAnswer,
  evaluateCode,
  generateFinalReport,
  LANG_NAMES,
  PERSONALITY_PROMPTS,
};
