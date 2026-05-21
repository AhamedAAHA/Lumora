function categorizeCandidate(overallScore, confidence, technical) {
  const composite = overallScore * 0.5 + confidence * 0.25 + technical * 0.25;

  if (composite >= 85) return 'selected';
  if (composite >= 70) return 'shortlisted';
  if (composite >= 50) return 'needs_improvement';
  return 'rejected';
}

module.exports = { categorizeCandidate };
