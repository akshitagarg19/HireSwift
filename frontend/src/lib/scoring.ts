import { Candidate, Job, ScoringWeights, ScoreBreakdown } from '@/types'

export interface MatchScoreResult {
  score: number;
  breakdown: ScoreBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  explanation: string;
  evidenceSnippets: string[];
  hardRequirementViolation?: string;
}

// Tokenize and clean text for semantic matching
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

// Compute cosine similarity between two text strings using term frequencies
export function computeSemanticSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const freq1: Record<string, number> = {};
  const freq2: Record<string, number> = {};

  tokens1.forEach((t) => {
    freq1[t] = (freq1[t] || 0) + 1;
  });
  tokens2.forEach((t) => {
    freq2[t] = (freq2[t] || 0) + 1;
  });

  const allWords = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  allWords.forEach((word) => {
    const v1 = freq1[word] || 0;
    const v2 = freq2[word] || 0;
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  });

  const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
  if (magnitude === 0) return 0;

  // Scale up slightly for realistic ATS ranges (usually 0.2-0.8 raw cosine)
  const rawSimilarity = dotProduct / magnitude;
  return Math.min(100, Math.round(rawSimilarity * 150));
}

// Check if candidate has skill, expanding with synonyms
export function hasSkillWithSynonyms(
  candidateSkills: string[],
  targetSkill: string,
  synonyms: Record<string, string[]> = {}
): boolean {
  const normTarget = targetSkill.toLowerCase().trim();
  const candidateLower = candidateSkills.map((s) => s.toLowerCase().trim());

  if (candidateLower.includes(normTarget)) {
    return true;
  }

  // Look up target in synonyms map
  for (const [canonical, synList] of Object.entries(synonyms)) {
    const lowerCanonical = canonical.toLowerCase().trim();
    const lowerSynList = synList.map((s) => s.toLowerCase().trim());

    const isTargetInGroup = lowerCanonical === normTarget || lowerSynList.includes(normTarget);
    if (isTargetInGroup) {
      if (candidateLower.includes(lowerCanonical)) return true;
      for (const syn of lowerSynList) {
        if (candidateLower.includes(syn)) return true;
      }
    }
  }

  return false;
}

// Normalize CGPA (on 10-point scale) and percentage (0-100)
export function normalizeCgpaToPercent(cgpa: number): number {
  if (cgpa <= 0) return 0;
  if (cgpa > 10) return Math.min(100, cgpa); // already percentage
  // Indian university standard conversion (e.g. CBSE / AICTE: CGPA * 9.5 or CGPA * 10)
  return Math.min(100, cgpa * 10);
}

export function matchScore(
  candidate: Candidate,
  job: Job,
  weights: ScoringWeights = { skills: 40, experience: 25, education: 20, semantic: 15 },
  synonyms: Record<string, string[]> = {}
): MatchScoreResult {
  const req = job.requirements;
  let hardViolation: string | undefined;

  // 1. Hard requirements checks
  if (req.minCgpa && candidate.cgpa != null && candidate.cgpa > 0 && candidate.cgpa < req.minCgpa) {
    hardViolation = `CGPA ${candidate.cgpa} is below required minimum ${req.minCgpa}`;
  }
  if (req.minTenth && candidate.tenthPercent != null && candidate.tenthPercent > 0 && candidate.tenthPercent < req.minTenth) {
    hardViolation = hardViolation || `10th score (${candidate.tenthPercent}%) below min (${req.minTenth}%)`;
  }
  if (req.minTwelfth && candidate.twelfthPercent != null && candidate.twelfthPercent > 0 && candidate.twelfthPercent < req.minTwelfth) {
    hardViolation = hardViolation || `12th score (${candidate.twelfthPercent}%) below min (${req.minTwelfth}%)`;
  }
  if (req.gradYears && req.gradYears.length > 0 && candidate.gradYear != null && candidate.gradYear > 0) {
    if (!req.gradYears.includes(candidate.gradYear)) {
      hardViolation = hardViolation || `Graduation year ${candidate.gradYear} not in target batch (${req.gradYears.join(', ')})`;
    }
  }

  // 2. Skills Score (0 - 100)
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  let skillsScore = 0;

  const requiredList = req.requiredSkills || [];
  const preferredList = req.preferredSkills || [];
  const totalSkillSlots = requiredList.length * 1.0 + preferredList.length * 0.5;

  let earnedSkillPoints = 0;

  requiredList.forEach((skill) => {
    if (hasSkillWithSynonyms(candidate.skills, skill, synonyms)) {
      matchedSkills.push(skill);
      earnedSkillPoints += 1.0;
    } else {
      missingSkills.push(skill);
    }
  });

  preferredList.forEach((skill) => {
    if (hasSkillWithSynonyms(candidate.skills, skill, synonyms)) {
      matchedSkills.push(skill);
      earnedSkillPoints += 0.5;
    } else {
      missingSkills.push(skill);
    }
  });

  if (totalSkillSlots > 0) {
    skillsScore = Math.min(100, Math.round((earnedSkillPoints / totalSkillSlots) * 100));
  } else {
    skillsScore = 80; // neutral if no skills specified
  }

  // 3. Experience Score (0 - 100)
  let expScore = 0;
  const minExp = req.minExperience || 0;
  const candExp = candidate.experienceYears || 0;

  if (minExp === 0) {
    // Fresher job: 0-1 years gets 100, higher gets good score
    expScore = candExp <= 1.5 ? 100 : Math.max(60, 100 - (candExp - 1) * 10);
  } else if (candExp >= minExp) {
    // Full points if candidate meets or exceeds minExp, with slight bonus for optimal range
    const overExp = candExp - minExp;
    if (overExp <= 3) {
      expScore = 100;
    } else {
      // Overqualified slightly capped at 90
      expScore = 90;
    }
  } else {
    // Partial credit
    expScore = Math.round((candExp / minExp) * 80);
  }

  // 4. Education Score (0 - 100)
  let eduScore = 0;
  let eduFactors = 0;
  let eduTotal = 0;

  // CGPA factor
  if (candidate.cgpa != null && candidate.cgpa > 0) {
    const cgpaPercent = normalizeCgpaToPercent(candidate.cgpa);
    eduTotal += cgpaPercent;
    eduFactors += 1;
  }

  // 12th percent factor
  if (candidate.twelfthPercent != null && candidate.twelfthPercent > 0) {
    eduTotal += candidate.twelfthPercent;
    eduFactors += 1;
  }

  // 10th percent factor
  if (candidate.tenthPercent != null && candidate.tenthPercent > 0) {
    eduTotal += candidate.tenthPercent;
    eduFactors += 1;
  }

  if (eduFactors > 0) {
    eduScore = Math.round(eduTotal / eduFactors);
  } else {
    eduScore = 75;
  }

  // Tier bonus if from Tier-1
  if (candidate.college.includes('IIT') || candidate.college.includes('BITS') || candidate.college.includes('NIT Trichy')) {
    eduScore = Math.min(100, eduScore + 5);
  }

  // 5. Semantic Score (0 - 100)
  const semanticScore = computeSemanticSimilarity(candidate.resumeText, job.jdText);

  // 6. Weighted Total Score
  const totalWeight = weights.skills + weights.experience + weights.education + weights.semantic || 100;
  let rawScore =
    (skillsScore * weights.skills +
      expScore * weights.experience +
      eduScore * weights.education +
      semanticScore * weights.semantic) /
    totalWeight;

  // Cap score if hard requirement violated
  if (hardViolation) {
    rawScore = Math.min(45, rawScore * 0.5);
  }

  const finalScore = Math.max(5, Math.min(99, Math.round(rawScore)));

  // Evidence Snippets
  const evidenceSnippets: string[] = [];
  if (matchedSkills.length > 0) {
    evidenceSnippets.push(`Matched skills: ${matchedSkills.slice(0, 4).join(', ')}`);
  }
  if (candidate.experienceYears != null && candidate.experienceYears > 0) {
    evidenceSnippets.push(`${candidate.experienceYears}y relevant industry experience`);
  }
  if (candidate.cgpa != null && candidate.cgpa > 0) {
    evidenceSnippets.push(`Academic CGPA: ${candidate.cgpa}/10 (${candidate.college})`);
  }
  if (candidate.projects && candidate.projects.length > 0) {
    evidenceSnippets.push(`Project: ${candidate.projects[0].title}`);
  }

  // Human-readable explanation
  let explanation = '';
  if (hardViolation) {
    explanation = `Flagged: ${hardViolation}. Overall fit reduced.`;
  } else if (finalScore >= 80) {
    explanation = `Strong match (${finalScore}%). Possesses ${matchedSkills.length} key skills with solid ${candidate.experienceYears}y experience from ${candidate.college}.`;
  } else if (finalScore >= 60) {
    explanation = `Moderate match (${finalScore}%). Good baseline fit with missing skills: ${missingSkills.slice(0, 2).join(', ') || 'none'}.`;
  } else {
    explanation = `Low match (${finalScore}%). Gaps in required background: missing ${missingSkills.slice(0, 3).join(', ')}.`;
  }

  return {
    score: finalScore,
    breakdown: {
      skills: skillsScore,
      experience: expScore,
      education: eduScore,
      semantic: semanticScore,
    },
    matchedSkills,
    missingSkills,
    explanation,
    evidenceSnippets,
    hardRequirementViolation: hardViolation,
  };
}
