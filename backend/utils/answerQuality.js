/** Detect placeholder, gibberish, or non-substantive interview answers */

const PLACEHOLDER_EXACT = new Set([
  'test',
  'fake',
  'asdf',
  'qwerty',
  'xxx',
  'nothing',
  'idk',
  'n/a',
  'na',
  'no',
  'yes',
  'ok',
  'okay',
  'fine',
  'good',
  'bad',
  'maybe',
  'hello',
  'hi',
  'skip',
  'pass',
  'none',
  'blah',
  'random',
  'dummy',
  'sample',
]);

const PLACEHOLDER_PATTERNS = [
  /^test(ing)?\s*$/i,
  /^fake\s*(answer|thing|data)?\s*$/i,
  /^asdf+h?$/i,
  /^lorem\s+ipsum/i,
  /^no\s+idea\s*$/i,
  /^don'?t\s+know\s*$/i,
  /^not\s+sure\s*$/i,
  /^\.+$/,
  /^x+$/i,
];

function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function uniqueWordRatio(words) {
  if (!words.length) return 0;
  const unique = new Set(words.map((w) => w.toLowerCase().replace(/[^\w]/g, '')));
  return unique.size / words.length;
}

function alphaRatio(text) {
  const s = String(text || '');
  if (!s.length) return 0;
  const alpha = (s.match(/[\p{L}\p{N}]/gu) || []).length;
  return alpha / s.length;
}

/**
 * @returns {{ wordCount: number, flags: string[], substance: number, maxScore10: number, isInsufficient: boolean, feedback: string }}
 */
function assessAnswerQuality(answerText, questionText = '') {
  const text = String(answerText || '').trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wc = words.length;
  const lower = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const flags = [];

  if (!text) flags.push('empty');
  if (wc > 0 && wc < 8) flags.push('too_short');
  if (wc > 0 && wc < 20) flags.push('brief');

  const normalized = lower.replace(/[^\w\s]/g, '').trim();
  if (PLACEHOLDER_EXACT.has(normalized) || PLACEHOLDER_PATTERNS.some((p) => p.test(lower))) {
    flags.push('placeholder');
  }

  if (/(.)\1{5,}/.test(text) || /^[^a-zA-Z\u0B80-\u0BFF\u0D80-\u0DFF]{8,}$/.test(text)) {
    flags.push('gibberish');
  }

  if (wc >= 2 && alphaRatio(text) < 0.45) flags.push('non_verbal');

  if (wc >= 4 && uniqueWordRatio(words) < 0.3) flags.push('repetitive');

  if (/^(\w+)( \1){2,}$/i.test(normalized)) flags.push('repetitive');

  const qWords = new Set(
    String(questionText || '')
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 4)
  );
  const answerWords = words.map((w) => w.toLowerCase().replace(/[^\w]/g, '')).filter((w) => w.length > 3);
  const overlap = answerWords.filter((w) => qWords.has(w)).length;
  if (wc >= 5 && qWords.size > 2 && overlap === 0 && flags.includes('brief')) {
    flags.push('off_topic');
  }

  let substance = 85;
  if (flags.includes('empty')) substance = 0;
  else if (flags.includes('placeholder')) substance = 5;
  else if (flags.includes('gibberish') || flags.includes('non_verbal')) substance = 8;
  else if (flags.includes('repetitive')) substance = 15;
  else if (flags.includes('too_short')) substance = 18;
  else if (flags.includes('off_topic')) substance = 25;
  else if (flags.includes('brief')) substance = 35;
  else if (wc < 25) substance = 55;
  else if (wc < 40) substance = 70;

  let maxScore10 = 10;
  if (substance <= 8) maxScore10 = 1;
  else if (substance <= 18) maxScore10 = 2;
  else if (substance <= 25) maxScore10 = 3;
  else if (substance <= 35) maxScore10 = 4;
  else if (substance <= 55) maxScore10 = 6;
  else if (substance <= 70) maxScore10 = 7;

  const isInsufficient = substance < 40;

  let feedback = 'Thank you for your answer.';
  if (flags.includes('empty')) {
    feedback = 'No answer was provided. Please give a complete response with examples.';
  } else if (flags.includes('placeholder') || flags.includes('gibberish')) {
    feedback =
      'This does not appear to be a real interview answer. Please respond with specific experience and examples.';
  } else if (flags.includes('too_short') || flags.includes('repetitive')) {
    feedback = 'Answer is too short or vague. Expand with concrete details related to the question.';
  } else if (flags.includes('off_topic')) {
    feedback = 'Answer does not address the question. Focus on what was asked.';
  } else if (flags.includes('brief')) {
    feedback = 'Add more depth: situation, actions you took, and outcomes.';
  }

  return {
    wordCount: wc,
    flags,
    substance,
    maxScore10,
    isInsufficient,
    feedback,
  };
}

function summarizeSessionQuality(answers) {
  if (!answers?.length) {
    return {
      avgSubstance: 0,
      avgAiScore: 0,
      insufficientCount: 0,
      validCount: 0,
      sessionInvalid: true,
    };
  }

  let substanceSum = 0;
  let scoreSum = 0;
  let insufficientCount = 0;

  for (const a of answers) {
    const q = assessAnswerQuality(a.candidateAnswer, a.questionText);
    substanceSum += q.substance;
    if (q.isInsufficient) insufficientCount += 1;
    scoreSum += Number(a.aiScore) || 0;
  }

  const n = answers.length;
  const avgSubstance = substanceSum / n;
  const avgAiScore = scoreSum / n;
  const sessionInvalid = insufficientCount / n >= 0.5 || avgSubstance < 35 || avgAiScore < 3.5;

  return {
    avgSubstance,
    avgAiScore,
    insufficientCount,
    validCount: n - insufficientCount,
    sessionInvalid,
  };
}

module.exports = { assessAnswerQuality, summarizeSessionQuality };
