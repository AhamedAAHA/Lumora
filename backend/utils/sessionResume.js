/** Shared resume / intro helpers for assigned (account) interviews */

function hasResumeData(data = {}) {
  const nonEmpty = (arr) => Array.isArray(arr) && arr.some((item) => String(item || '').trim());
  const raw = String(data.rawText || '').trim();
  return Boolean(
    nonEmpty(data.skills) ||
      nonEmpty(data.education) ||
      nonEmpty(data.projects) ||
      nonEmpty(data.experience) ||
      String(data.summary || '').trim().length > 20 ||
      raw.length > 80
  );
}

function normalizeCheatEvent(event) {
  if (!event || typeof event !== 'object') return null;
  return {
    type: String(event.type || 'unknown').slice(0, 64),
    message: String(event.message || '').slice(0, 500),
    at: event.at ? new Date(event.at) : new Date(),
  };
}

function sessionResumeUploaded(session) {
  return Boolean(session?.resumeUploaded) && hasResumeData(session?.resumeData);
}

function defaultIntroQuestion(session = {}) {
  const round = session.round || 'technical';
  const intros = {
    hr: 'Tell me about yourself and what motivated you to apply for this role.',
    aptitude:
      'Welcome. Before we begin the aptitude section, briefly introduce yourself and how you approach logical problems.',
    technical:
      'Please introduce yourself — your background, key strengths, and what you hope to contribute in this role.',
    final:
      'Thank you for joining. Start with a short introduction about yourself and your career goals.',
  };
  return intros[round] || intros.technical;
}

function ensureIntroQuestion(session) {
  const intro = String(session.introQuestion || session.currentQuestion || '').trim();
  if (intro) {
    session.introQuestion = intro;
    return intro;
  }
  const fallback = defaultIntroQuestion(session);
  session.introQuestion = fallback;
  return fallback;
}

module.exports = {
  hasResumeData,
  sessionResumeUploaded,
  defaultIntroQuestion,
  ensureIntroQuestion,
  normalizeCheatEvent,
};
