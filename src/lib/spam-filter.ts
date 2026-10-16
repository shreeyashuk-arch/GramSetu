import { createHash } from 'crypto';

export interface SpamCheckInput {
  title: string;
  description: string;
  lat: number;
  lng: number;
  villageBounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  userTrustScore?: number;
  recentSubmissionCount?: number;
}

export interface SpamCheckResult {
  isSpam: boolean;
  requiresModeration: boolean;
  moderationReason?: string;
  scorePenalty: number;
  flaggedReasons: string[];
}

// In-memory rate limiter cache for abuse control
const rateLimitMap = new Map<string, { count: number; firstSeen: number }>();

export function generateAnonymousSaltedHash(identifier: string): string {
  const salt = 'gramsetu-privacy-salt-2026';
  return createHash('sha256').update(`${identifier}:${salt}`).digest('hex').substring(0, 16);
}

export function checkRateLimit(hash: string, limit: number = 5, windowMinutes: number = 10): boolean {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const entry = rateLimitMap.get(hash);

  if (!entry || now - entry.firstSeen > windowMs) {
    rateLimitMap.set(hash, { count: 1, firstSeen: now });
    return true; // allowed
  }

  if (entry.count >= limit) {
    return false; // exceeded rate limit
  }

  entry.count++;
  return true;
}

// Abusive or spam words
const SPAM_KEYWORDS = [
  'casino', 'lottery', 'crypto', 'loan offer', 'earn money', 'viagra', 'win prize',
  'fake complaint', 'test ignore', 'asdfgh', 'qwerty', 'bakwas'
];

function containsGibberish(text: string): boolean {
  // Check for repeated single characters (e.g., "aaaaaaa", "xxxxxx")
  if (/(.)\1{5,}/.test(text)) return true;

  // Check for very long word without spaces
  const words = text.split(/\s+/);
  for (const word of words) {
    if (word.length > 35) return true;
  }

  return false;
}

export function evaluateSpamAndFake(input: SpamCheckInput): SpamCheckResult {
  const flaggedReasons: string[] = [];
  let scorePenalty = 0;
  const fullText = `${input.title} ${input.description}`.toLowerCase();

  // 1. Text Length check
  if (input.title.trim().length < 5 || input.description.trim().length < 10) {
    flaggedReasons.push('Complaint description too brief or vague');
    scorePenalty += 0.2;
  }

  // 2. Gibberish / keyboard mash check
  if (containsGibberish(fullText)) {
    flaggedReasons.push('Repetitive character pattern or unnatural keyboard mash');
    scorePenalty += 0.4;
  }

  // 3. Spam keywords
  for (const word of SPAM_KEYWORDS) {
    if (fullText.includes(word)) {
      flaggedReasons.push(`Suspicious/unrelated promotional keyword: "${word}"`);
      scorePenalty += 0.5;
      break;
    }
  }

  // 4. Location plausibility check
  if (input.villageBounds) {
    const { minLat, maxLat, minLng, maxLng } = input.villageBounds;
    if (
      input.lat < minLat - 0.2 ||
      input.lat > maxLat + 0.2 ||
      input.lng < minLng - 0.2 ||
      input.lng > maxLng + 0.2
    ) {
      flaggedReasons.push('Location reported is far outside village jurisdictional bounds (>20km)');
      scorePenalty += 0.3;
    }
  }

  // 5. User Trust Score check
  const trustScore = input.userTrustScore !== undefined ? input.userTrustScore : 1.0;
  if (trustScore < 0.6) {
    flaggedReasons.push(`Reporting user has a low community trust score (${Math.round(trustScore * 100)}%)`);
  }

  // 6. Recent submission flood
  if ((input.recentSubmissionCount || 0) >= 4) {
    flaggedReasons.push('Rapid burst submissions from this user in a short window');
    scorePenalty += 0.3;
  }

  const isSpam = scorePenalty >= 0.7;
  const requiresModeration = isSpam || flaggedReasons.length > 0 || trustScore < 0.7;

  return {
    isSpam,
    requiresModeration,
    moderationReason: flaggedReasons.length > 0 ? flaggedReasons.join('; ') : undefined,
    scorePenalty,
    flaggedReasons,
  };
}
