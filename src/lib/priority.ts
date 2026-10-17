export type PriorityBand = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface PriorityInput {
  urgency: number; // 1 to 5
  peopleAffected: number; // 1 to 5 scale (1: individual, 2: small group, 3: street/ward, 4: zone, 5: whole village)
  vulnerabilities: string[]; // e.g. ['elderly', 'pregnant', 'disabled', 'children']
  timeSensitivity: number; // 1 to 5 (1: low, 5: immediate danger/seasonal deadline)
  daysOpen?: number;
  category?: string;
}

export interface PriorityResult {
  score: number; // 0 - 100
  band: PriorityBand;
  factors: {
    urgency: number;
    peopleAffected: number;
    vulnerabilityScore: number;
    timeSensitivity: number;
    daysOpenPenalty: number;
    vulnerabilities: string[];
    explanation: string;
    details: string[];
  };
}

/**
 * Priority Scoring Algorithm for Rural Needs:
 * Formula:
 * Urgency Weight: 35% (Base urgency of the failure / danger)
 * People Affected Weight: 25% (Scale of impact)
 * Vulnerability Weight: 20% (Presence of pregnant women, elderly, infants, disabled)
 * Time Sensitivity Weight: 15% (Agricultural cutoff, health camp window, storm season)
 * Aging Penalty: +1.5 points per day open (capped at 15 points)
 */
export function calculatePriority(input: PriorityInput): PriorityResult {
  const urgency = Math.min(Math.max(input.urgency || 2, 1), 5);
  const peopleAffected = Math.min(Math.max(input.peopleAffected || 1, 1), 5);
  const timeSensitivity = Math.min(Math.max(input.timeSensitivity || 2, 1), 5);
  const daysOpen = Math.max(input.daysOpen || 0, 0);
  const knownVulnerabilities = ['elderly', 'pregnant', 'disabled', 'children'];
  const vulnerabilities = [...new Set(
    (Array.isArray(input.vulnerabilities) ? input.vulnerabilities : [])
      .filter(value => knownVulnerabilities.includes(value))
  )];

  // Vulnerability score: 0 to 5 based on flagged vulnerable groups
  const vulnerabilityScore = Math.min(vulnerabilities.length * 1.5, 5);

  // Normalize components to a 100-point scale
  const urgencyPoints = (urgency / 5) * 35;
  const peoplePoints = (peopleAffected / 5) * 25;
  const vulnerabilityPoints = (vulnerabilityScore / 5) * 20;
  const timePoints = (timeSensitivity / 5) * 15;
  const daysOpenPenalty = Math.min(daysOpen * 1.5, 15);

  // Category boost for critical life/safety areas
  let categoryBoost = 0;
  if (input.category === 'WOMEN_SAFETY' || input.category === 'HEALTH') {
    categoryBoost = 5;
  }

  const rawScore = urgencyPoints + peoplePoints + vulnerabilityPoints + timePoints + daysOpenPenalty + categoryBoost;
  const score = Math.round(Math.min(Math.max(rawScore, 5), 100));

  let band: PriorityBand = 'LOW';
  if (score >= 75) band = 'CRITICAL';
  else if (score >= 50) band = 'HIGH';
  else if (score >= 30) band = 'MEDIUM';

  const details: string[] = [];
  if (urgency >= 4) details.push(`High Hazard/Urgency Level: ${urgency}/5`);
  if (peopleAffected >= 3) details.push(`Widespread Impact: ~${peopleAffected === 5 ? 'Whole Village' : peopleAffected === 4 ? 'Entire Zone' : 'Multiple Families'} affected`);
  if (vulnerabilities.length > 0) details.push(`Vulnerable Groups: ${vulnerabilities.join(', ')}`);
  if (timeSensitivity >= 4) details.push(`Time-Critical Window: ${timeSensitivity}/5`);
  if (daysOpen > 2) details.push(`Aging escalation: Unresolved for ${daysOpen} days`);

  const explanation =
    details.length > 0
      ? details.join(' • ')
      : `Standard priority issue based on category severity and localized impact.`;

  return {
    score,
    band,
    factors: {
      urgency,
      peopleAffected,
      vulnerabilityScore,
      timeSensitivity,
      daysOpenPenalty,
      vulnerabilities,
      explanation,
      details,
    },
  };
}
