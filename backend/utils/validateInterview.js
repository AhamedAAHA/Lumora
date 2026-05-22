/** Validate and apply Interview / Candidate enum fields before Mongoose save */

const INTERVIEW_ENUMS = {
  status: ['scheduled', 'active', 'completed', 'expired'],
  language: ['en', 'ta', 'si'],
  personality: [
    'friendly_hr',
    'strict_corporate',
    'senior_engineer',
    'startup_founder',
    'technical_lead',
  ],
  round: ['hr', 'aptitude', 'technical', 'final'],
  difficulty: ['easy', 'medium', 'hard'],
};

const PERSONALITIES = new Set(INTERVIEW_ENUMS.personality);
const ROUNDS = new Set(INTERVIEW_ENUMS.round);

function pickEnum(field, value, fallback) {
  const allowed = INTERVIEW_ENUMS[field];
  if (!allowed) return value ?? fallback;
  const v = String(value || '').trim();
  return allowed.includes(v) ? v : fallback;
}

function applyInterviewFields(interview, body, sanitize) {
  const stringFields = ['title', 'jobRole', 'candidateName'];
  stringFields.forEach((field) => {
    if (body[field] !== undefined) {
      interview[field] = sanitize(body[field]);
    }
  });
  if (body.candidateEmail !== undefined) {
    interview.candidateEmail = sanitize(body.candidateEmail).toLowerCase();
  }
  if (body.status !== undefined) {
    interview.status = pickEnum('status', body.status, interview.status);
  }
  if (body.language !== undefined) {
    interview.language = pickEnum('language', body.language, interview.language);
  }
  if (body.personality !== undefined) {
    interview.personality = pickEnum('personality', body.personality, interview.personality);
  }
  if (body.round !== undefined) {
    interview.round = pickEnum('round', body.round, interview.round);
  }
  if (body.difficulty !== undefined) {
    interview.difficulty = pickEnum('difficulty', body.difficulty, interview.difficulty);
  }
}

function applyCandidatePrefs(candidate, body) {
  if (body.language !== undefined) {
    candidate.language = pickEnum('language', body.language, candidate.language);
  }
  if (body.personality !== undefined && PERSONALITIES.has(body.personality)) {
    candidate.personality = body.personality;
  }
  if (body.round !== undefined && ROUNDS.has(body.round)) {
    candidate.round = body.round;
  }
}

function safeOrderNumber(value, fallback = 1) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function mapPinRecommendation(rec) {
  const m = {
    selected: 'Selected',
    shortlisted: 'Shortlisted',
    needs_improvement: 'Needs Improvement',
    rejected: 'Rejected',
    Selected: 'Selected',
    Shortlisted: 'Shortlisted',
    'Needs Improvement': 'Needs Improvement',
    Rejected: 'Rejected',
  };
  return m[rec] || 'Needs Improvement';
}

module.exports = {
  INTERVIEW_ENUMS,
  pickEnum,
  applyInterviewFields,
  applyCandidatePrefs,
  safeOrderNumber,
  mapPinRecommendation,
};
