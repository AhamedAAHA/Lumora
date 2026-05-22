/**
 * One-time: fix completed sessions with null or 0–10 scale overallScore
 * Run: node scripts/backfillScores.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const InterviewSession = require('../models/InterviewSession');
const Report = require('../models/Report');
const { normalizeScore } = require('../services/unifiedAnalytics');

async function main() {
  await connectDB();
  const sessions = await InterviewSession.find({ status: 'completed' });
  let updated = 0;

  for (const session of sessions) {
    const n = Math.max(session.answers?.length || 0, 1);
    let overall = session.overallScore;

    if (overall == null && session.reportId) {
      const report = await Report.findById(session.reportId);
      overall = report?.overallScore;
    }

    if (overall == null && session.answers?.length) {
      const avgAi10 = session.answers.reduce((s, a) => s + (a.aiScore || 0), 0) / n;
      const avgConf =
        session.answers.reduce((s, a) => s + (a.metrics?.confidence || 0), 0) / n;
      const avgComm =
        session.answers.reduce((s, a) => s + (a.metrics?.communication || 0), 0) / n;
      const technicalPct = Math.round(avgAi10 * 10);
      overall = Math.round(technicalPct * 0.5 + avgConf * 0.25 + avgComm * 0.25);
    }

    const normalized = normalizeScore(overall);
    if (normalized !== session.overallScore) {
      session.overallScore = normalized;
      await session.save();
      if (session.reportId) {
        await Report.findByIdAndUpdate(session.reportId, { overallScore: normalized });
      }
      updated += 1;
    }
  }

  console.log(`Backfill complete. Updated ${updated} of ${sessions.length} sessions.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
