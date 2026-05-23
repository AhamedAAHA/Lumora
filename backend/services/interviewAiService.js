const OpenAI = require('openai');
const { categorizeCandidate } = require('./recommendationEngine');
const { assessAnswerQuality, summarizeSessionQuality } = require('../utils/answerQuality');

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

async function chatJson(system, user, language = 'en', timeoutMs = 22000) {
  const client = getClient();
  if (!client) return null;
  const langNote = `Respond in ${LANG_NAMES[language] || 'English'}.`;
  try {
    const res = await Promise.race([
      client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `${system}\n${langNote}` },
          { role: 'user', content: user },
        ],
        temperature: 0.65,
        response_format: { type: 'json_object' },
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI request timed out')), timeoutMs);
      }),
    ]);
    const text = res.choices[0]?.message?.content?.trim();
    if (!text) return null;
    try {
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      return null;
    }
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

async function translateToEnglish(text, sourceLanguage = 'en') {
  const trimmed = String(text || '').trim();
  if (!trimmed || sourceLanguage === 'en') return trimmed;
  const parsed = await chatJson(
    'You translate interview content accurately for HR review. Return JSON only.',
    `Translate the following ${LANG_NAMES[sourceLanguage] || 'text'} to clear English. Preserve meaning.\nReturn JSON: {"english":"..."}\n\nText:\n${trimmed.slice(0, 4500)}`,
    'en',
    18000
  );
  return parsed?.english?.trim() || trimmed;
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
  if (count <= 0) return [];
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
    if (questions.length >= count) return;
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

  const quality = assessAnswerQuality(answerText, questionText);
  const personalityPrompt = PERSONALITY_PROMPTS[personality] || PERSONALITY_PROMPTS.friendly_hr;

  if (quality.isInsufficient) {
    let nextDifficulty = difficulty;
    if (quality.maxScore10 <= 2) nextDifficulty = 'easy';
    return {
      score: quality.maxScore10,
      feedback: quality.feedback,
      conversationalComment: 'Please provide a substantive answer on the next question.',
      needsFollowUp: false,
      followUpQuestion: '',
      nextDifficulty,
      qualityFlags: quality.flags,
    };
  }

  const parsed = await chatJson(
    `${personalityPrompt} Evaluate strictly for a ${round} interview. Difficulty: ${difficulty}.
Penalize heavily: placeholder text, "test/fake/asdf", gibberish, one-word answers, or answers that ignore the question.
Only score 7+ for specific, relevant examples with clear reasoning.`,
    `Job: ${jobRole}
Question: ${questionText}
Answer: ${answerText}
Answer quality flags (system): ${quality.flags.join(', ') || 'none'}
Live metrics — confidence: ${metrics.confidence || 'n/a'}, communication: ${metrics.communication || 'n/a'}, WPM: ${metrics.wpm || 'n/a'}, fillers: ${metrics.fillers || 0}

Return JSON:
{
  "score":0-10,
  "feedback":"constructive feedback in interview language",
  "conversationalComment":"brief feedback transition only; do not ask another question",
  "needsFollowUp":false,
  "followUpQuestion":"",
  "nextDifficulty":"easy|medium|hard"
}
Raise nextDifficulty if score>=8, lower if score<5. Do not create follow-up questions; keep needsFollowUp false and followUpQuestion empty.`,
    language
  );

  if (parsed) {
    const raw = Math.min(10, Math.max(0, Number(parsed.score) || 0));
    const score = Math.min(quality.maxScore10, raw);
    return {
      score,
      feedback:
        score <= 3 && raw > score
          ? `${parsed.feedback || ''} ${quality.feedback}`.trim()
          : parsed.feedback || quality.feedback,
      conversationalComment: parsed.conversationalComment || '',
      needsFollowUp: false,
      followUpQuestion: '',
      nextDifficulty: ['easy', 'medium', 'hard'].includes(parsed.nextDifficulty)
        ? parsed.nextDifficulty
        : difficulty,
      qualityFlags: quality.flags,
    };
  }

  const score = Math.min(quality.maxScore10, quality.substance < 55 ? 4 : 6);
  let nextDifficulty = difficulty;
  if (score >= 8) nextDifficulty = 'hard';
  else if (score < 5) nextDifficulty = 'easy';

  return {
    score,
    feedback: quality.feedback,
    conversationalComment: score >= 7 ? 'Interesting answer.' : 'Thank you. Let us continue.',
    needsFollowUp: false,
    followUpQuestion: '',
    nextDifficulty,
    qualityFlags: quality.flags,
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
  const sessionQ = summarizeSessionQuality(answers);

  const avgAnswer =
    answers.length > 0
      ? answers.reduce((s, a) => s + (a.aiScore || 0), 0) / answers.length
      : 0;

  const metricAnswers = answers.filter((a) => a.metrics?.confidence != null);
  const avgConf =
    metricAnswers.length > 0
      ? metricAnswers.reduce((s, a) => s + (a.metrics.confidence || 0), 0) / metricAnswers.length
      : Math.round(sessionQ.avgSubstance * 0.9);
  const avgComm =
    metricAnswers.length > 0
      ? metricAnswers.reduce((s, a) => s + (a.metrics.communication || 0), 0) / metricAnswers.length
      : Math.round(sessionQ.avgSubstance * 0.85);
  const avgSpeak =
    metricAnswers.length > 0
      ? metricAnswers.reduce((s, a) => s + (a.metrics.speaking || 0), 0) / metricAnswers.length
      : Math.round(sessionQ.avgSubstance * 0.8);

  const summary = answers
    .map((a) => {
      const q = assessAnswerQuality(a.candidateAnswer, a.questionText);
      return `Q: ${a.questionText}\nA: ${a.candidateAnswer}\nAI score: ${a.aiScore}/10\nQuality: ${q.flags.join(',') || 'ok'} (substance ${q.substance}/100)`;
    })
    .join('\n\n');

  const strictNote = sessionQ.sessionInvalid
    ? 'IMPORTANT: Most answers are placeholders, test text, gibberish, or too short. overallScore MUST be 0-15. recommendation MUST be Rejected.'
    : '';

  const parsed = await chatJson(
    'You are an expert HR manager and career coach. Score honestly — do not inflate scores for poor answers.',
    `Job: ${interview.jobRole}. Round: ${interview.round || 'technical'}. Personality mode: ${interview.personality}.
Candidate: ${candidate.name}
CV: ${candidate.cvSummary || 'N/A'}
Cheat warnings: ${candidate.cheatEvents?.length || 0}
Coding score: ${candidate.codingScore ?? 'N/A'}
Session quality: avg substance ${Math.round(sessionQ.avgSubstance)}/100, insufficient answers ${sessionQ.insufficientCount}/${answers.length}
${strictNote}
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

  let technicalScore = Math.round(avgAnswer * 10);
  let confidenceScore = Math.round(Math.min(avgConf, sessionQ.avgSubstance));
  let communicationScore = Math.round(Math.min(avgComm, sessionQ.avgSubstance));
  let speakingScore = Math.round(Math.min(avgSpeak, sessionQ.avgSubstance));
  let overallScore = parsed?.overallScore
    ? Math.round(parsed.overallScore)
    : Math.round(technicalScore * 0.5 + confidenceScore * 0.25 + communicationScore * 0.25);

  if (sessionQ.sessionInvalid) {
    technicalScore = Math.min(technicalScore, 15);
    confidenceScore = Math.min(confidenceScore, 20);
    communicationScore = Math.min(communicationScore, 20);
    speakingScore = Math.min(speakingScore, 25);
    overallScore = Math.min(overallScore, 15);
  } else if (sessionQ.avgSubstance < 50) {
    overallScore = Math.min(overallScore, 35);
    technicalScore = Math.min(technicalScore, 40);
  }

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

  if (sessionQ.sessionInvalid) {
    recommendation = 'Rejected';
  } else if (overallScore < 25) {
    recommendation = 'Rejected';
  } else if (overallScore < 45) {
    recommendation = 'Needs Improvement';
  }

  const defaultWeaknesses = sessionQ.sessionInvalid
    ? [
        'Answers were not substantive (placeholders, test text, or too brief)',
        'Did not demonstrate role-specific knowledge',
      ]
    : ['Technical depth'];
  const defaultStrengths = sessionQ.sessionInvalid ? [] : ['Communication', 'Motivation'];

  const defaultFeedback = sessionQ.sessionInvalid
    ? 'This interview did not include substantive answers. Most responses were too short, placeholder text, or unrelated to the questions. Please retake the interview with detailed, real examples from your experience.'
    : `Completed ${interview.jobRole} interview.`;
  const defaultCoach = sessionQ.sessionInvalid
    ? 'Before your next attempt, prepare STAR-format stories (Situation, Task, Action, Result) for projects on your CV. Answer each question in full sentences with measurable outcomes — avoid test words like "fake" or one-line replies.'
    : 'You show promise. Focus on structured answers with metrics and concrete examples.';

  return {
    overallScore,
    technicalScore: sessionQ.sessionInvalid
      ? Math.min(parsed?.technicalScore ?? technicalScore, 15)
      : (parsed?.technicalScore ?? technicalScore),
    communicationScore: sessionQ.sessionInvalid
      ? Math.min(parsed?.communicationScore ?? communicationScore, 20)
      : (parsed?.communicationScore ?? communicationScore),
    confidenceScore: sessionQ.sessionInvalid
      ? Math.min(parsed?.confidenceScore ?? confidenceScore, 20)
      : (parsed?.confidenceScore ?? confidenceScore),
    speakingScore: sessionQ.sessionInvalid
      ? Math.min(parsed?.speakingScore ?? speakingScore, 25)
      : (parsed?.speakingScore ?? speakingScore),
    strengths: sessionQ.sessionInvalid
      ? parsed?.strengths?.length
        ? parsed.strengths
        : ['Completed the interview session']
      : parsed?.strengths || defaultStrengths,
    weaknesses: parsed?.weaknesses?.length ? parsed.weaknesses : defaultWeaknesses,
    recommendation,
    finalFeedback: sessionQ.sessionInvalid
      ? defaultFeedback
      : (parsed?.finalFeedback || defaultFeedback),
    careerCoach: sessionQ.sessionInvalid ? defaultCoach : (parsed?.careerCoach || defaultCoach),
    learningRoadmap:
      parsed?.learningRoadmap ||
      (sessionQ.sessionInvalid
        ? ['Structured interview answers', 'STAR method', 'Role-specific examples']
        : ['System design', 'API development']),
    suggestedCareerPath: parsed?.suggestedCareerPath || `${interview.jobRole} → Senior ${interview.jobRole}`,
    aiComments: parsed?.aiComments || '',
    language: lang,
    personality: interview.personality,
    round: interview.round,
    sessionQuality: sessionQ,
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
  translateToEnglish,
  assessAnswerQuality,
  summarizeSessionQuality,
  LANG_NAMES,
  PERSONALITY_PROMPTS,
};
