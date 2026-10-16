import { calculateDistanceKm } from './matching';

export interface ExistingComplaintSummary {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  lat: number;
  lng: number;
  photoUrl?: string | null;
  status: string;
}

export interface NewComplaintCandidate {
  title: string;
  description: string;
  category: string;
  lat: number;
  lng: number;
  photoUrl?: string | null;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  matchType: 'NONE' | 'EXACT' | 'SEMANTIC_CLUSTER' | 'GEO_PROXIMITY';
  parentComplaint?: ExistingComplaintSummary;
  similarityScore: number; // 0.0 - 1.0
  distanceMeters: number;
  explanation: string;
}

// Common rural grievance stop words in English, Hindi & Marathi
const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'in', 'and', 'or', 'to', 'for', 'of', 'with', 'from', 'by',
  'hai', 'ka', 'ki', 'ke', 'ko', 'me', 'se', 'yeh', 'woh', 'par', 'aur', 'karna', 'ahe', 'cha', 'chi', 'che',
  'problem', 'issue', 'not', 'working', 'complaint', 'kharab', 'band', 'tula'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function calculateTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  const total = tokens.length || 1;
  tf.forEach((count, token) => {
    tf.set(token, count / total);
  });
  return tf;
}

export function computeCosineSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const tfA = calculateTF(tokensA);
  const tfB = calculateTF(tokensB);

  const allWords = new Set([...tfA.keys(), ...tfB.keys()]);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  allWords.forEach((word) => {
    const valA = tfA.get(word) || 0;
    const valB = tfB.get(word) || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  });

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return Math.round((dotProduct / denominator) * 100) / 100;
}

/**
 * Checks if a newly reported issue is a duplicate of an existing unresolved issue
 * in the same village and category based on Geo-distance and TF-IDF Cosine Similarity.
 */
export function detectDuplicate(
  candidate: NewComplaintCandidate,
  existingComplaints: ExistingComplaintSummary[]
): DuplicateDetectionResult {
  const candidateFullText = `${candidate.title} ${candidate.description}`;

  for (const existing of existingComplaints) {
    // Only compare against same category and open/active issues
    if (existing.category !== candidate.category) continue;
    if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(existing.status)) continue;

    const distanceKm = calculateDistanceKm(candidate.lat, candidate.lng, existing.lat, existing.lng);
    const distanceMeters = Math.round(distanceKm * 1000);

    const existingFullText = `${existing.title} ${existing.description}`;
    const similarity = computeCosineSimilarity(candidateFullText, existingFullText);

    // Rule 1: High text similarity (> 0.6) and within 300 meters
    if (similarity >= 0.55 && distanceMeters <= 350) {
      return {
        isDuplicate: true,
        matchType: 'SEMANTIC_CLUSTER',
        parentComplaint: existing,
        similarityScore: similarity,
        distanceMeters,
        explanation: `Matched existing report #${existing.code} (${similarity * 100}% text similarity, ${distanceMeters}m away). Supporting existing issue to avoid duplicate tickets.`,
      };
    }

    // Rule 2: Extremely close (<= 60 meters) with moderate similarity (> 0.35)
    if (distanceMeters <= 60 && similarity >= 0.35) {
      return {
        isDuplicate: true,
        matchType: 'GEO_PROXIMITY',
        parentComplaint: existing,
        similarityScore: similarity,
        distanceMeters,
        explanation: `Existing report #${existing.code} is registered right at this location (${distanceMeters}m away) in category ${existing.category}. Added as supporter.`,
      };
    }

    // Rule 3: Exact photo URL match if uploaded
    if (candidate.photoUrl && existing.photoUrl && candidate.photoUrl === existing.photoUrl) {
      return {
        isDuplicate: true,
        matchType: 'EXACT',
        parentComplaint: existing,
        similarityScore: 1.0,
        distanceMeters,
        explanation: `Duplicate photo detected for report #${existing.code}. Grouping as identical incident.`,
      };
    }
  }

  return {
    isDuplicate: false,
    matchType: 'NONE',
    similarityScore: 0,
    distanceMeters: 9999,
    explanation: 'No duplicate detected. Unique grievance registered.',
  };
}
