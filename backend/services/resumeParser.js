const fs = require('fs');
const pdf = require('pdf-parse');

async function parseResumePdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  let text = '';

  try {
    const data = await pdf(buffer);
    text = (data.text || '').toLowerCase();
  } catch (err) {
    // Fallback: allow interview to continue with basic extraction from raw bytes
    const raw = buffer.toString('latin1');
    const printable = raw.replace(/[^\x20-\x7E\n]/g, ' ');
    text = printable.toLowerCase();
    if (text.trim().length < 30) {
      throw new Error(
        'Could not read this PDF. Re-save it as PDF from Word/Google Docs, or start without resume.'
      );
    }
  }

  const skillKeywords = [
    'javascript',
    'react',
    'node',
    'python',
    'java',
    'mongodb',
    'sql',
    'typescript',
    'aws',
    'docker',
    'kubernetes',
    'css',
    'html',
    'angular',
    'vue',
    'express',
    'spring',
    'git',
    'api',
    'rest',
    'graphql',
  ];

  const skills = skillKeywords.filter((s) => text.includes(s));
  const education = [];
  if (text.includes('bachelor') || text.includes('b.sc') || text.includes('degree'))
    education.push("Bachelor's degree");
  if (text.includes('master') || text.includes('m.sc')) education.push("Master's degree");

  const projects = [];
  const projectMatches = text.match(/project[s]?:?\s*([^\n]{10,80})/gi) || [];
  projectMatches.slice(0, 5).forEach((p) => projects.push(p.replace(/project[s]?:?\s*/i, '').trim()));

  const experience = [];
  if (text.includes('intern')) experience.push('Internship experience');
  if (text.match(/\d+\+?\s*years?/)) {
    const yrs = text.match(/(\d+)\+?\s*years?/);
    if (yrs) experience.push(`${yrs[1]} years experience`);
  }

  return {
    skills: [...new Set(skills)],
    education,
    projects,
    experience,
    summary: text.slice(0, 400).replace(/\s+/g, ' ').trim(),
    rawText: text.slice(0, 6000),
  };
}

module.exports = { parseResumePdf };
