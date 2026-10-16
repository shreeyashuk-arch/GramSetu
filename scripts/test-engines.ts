import { calculatePriority } from '../src/lib/priority';
import { scoreResourceMatch, rankMatchingResources, calculateDistanceKm } from '../src/lib/matching';
import { computeCosineSimilarity, detectDuplicate } from '../src/lib/duplicate-detector';
import { evaluateSpamAndFake } from '../src/lib/spam-filter';
import { canAccessRole, canManageComplaint } from '../src/lib/auth';

console.log('🧪 Running GramSetu Core Engines & RBAC Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

// ==========================================
// Test 1: Priority Scoring Engine
// ==========================================
console.log('--- Test 1: Priority Scoring Engine ---');

const criticalCase = calculatePriority({
  urgency: 5,
  peopleAffected: 5,
  vulnerabilities: ['pregnant', 'elderly', 'children'],
  timeSensitivity: 5,
  daysOpen: 4,
  category: 'HEALTH',
});

assert(criticalCase.band === 'CRITICAL', `Band should be CRITICAL, got ${criticalCase.band} (Score: ${criticalCase.score})`);
assert(criticalCase.score >= 80, `Score should be >= 80, got ${criticalCase.score}`);
assert(criticalCase.factors.vulnerabilities.includes('pregnant'), 'Vulnerabilities should include pregnant');
assert(criticalCase.factors.explanation.length > 20, 'Factor explanation should be generated');

const lowCase = calculatePriority({
  urgency: 1,
  peopleAffected: 1,
  vulnerabilities: [],
  timeSensitivity: 1,
  daysOpen: 0,
  category: 'OTHER',
});

assert(lowCase.band === 'LOW', `Band should be LOW, got ${lowCase.band} (Score: ${lowCase.score})`);
assert(lowCase.score <= 30, `Score should be <= 30, got ${lowCase.score}`);

// ==========================================
// Test 2: Resource Matching Engine
// ==========================================
console.log('\n--- Test 2: Resource Matching Engine ---');

const distance = calculateDistanceKm(18.3164, 73.8682, 18.3175, 73.8695);
assert(distance > 0 && distance < 1.0, `Haversine distance should be ~0.2km, got ${distance}km`);

const candidateTractor = {
  id: 'res-1',
  name: 'Mahindra 45HP Tractor',
  category: 'EQUIPMENT',
  capacity: '45 HP',
  serviceArea: 'Zone B & C',
  availabilitySlots: '24x7 Emergency',
  priceType: 'SUBSIDIZED',
  priceAmount: 600,
  contactPhone: '9876543230',
  lat: 18.3164,
  lng: 73.8682,
  owner: {
    id: 'user-prov-1',
    name: 'Ramesh Shinde',
    trustScore: 0.98,
    isVerified: true,
  },
};

const candidateFarTractor = {
  id: 'res-2',
  name: 'Far Tractor in another taluka',
  category: 'EQUIPMENT',
  capacity: '35 HP',
  priceType: 'COMMERCIAL',
  contactPhone: '9876543999',
  lat: 18.6000,
  lng: 74.2000,
  owner: {
    id: 'user-prov-2',
    name: 'Remote Vendor',
    trustScore: 0.7,
    isVerified: false,
  },
};

const request = {
  category: 'EQUIPMENT',
  title: 'Need 45HP tractor for ploughing',
  neededAt: new Date(),
  durationHours: 6,
  urgency: 'HIGH',
  lat: 18.3166,
  lng: 73.8684,
};

const ranked = rankMatchingResources([candidateFarTractor, candidateTractor], request);
assert(ranked.length === 2, 'Should return ranked candidates');
assert(ranked[0].resource.id === 'res-1', 'Local verified tractor should rank #1');
assert(ranked[0].totalScore > ranked[1].totalScore, `Top score (${ranked[0].totalScore}) should beat far score (${ranked[1].totalScore})`);
assert(ranked[0].summaryReason.length > 5, 'Match reason summary should be descriptive');

// ==========================================
// Test 3: Duplicate & Semantic Cluster Engine
// ==========================================
console.log('\n--- Test 3: Duplicate & Semantic Cluster Engine ---');

const text1 = 'Main drinking water pipeline ruptured leaking dirty water near north tank';
const text2 = 'Drinking water pipeline burst and leaking water at north tank';
const text3 = 'Streetlight broken near temple street light not working';

const sim1 = computeCosineSimilarity(text1, text2);
const sim2 = computeCosineSimilarity(text1, text3);

assert(sim1 >= 0.5, `High similarity expected for pipe leak texts, got ${sim1}`);
assert(sim2 < 0.2, `Low similarity expected between pipe leak and streetlight, got ${sim2}`);

const existingComplaints = [
  {
    id: 'cmp-101',
    code: 'CMP-2026-001',
    title: 'Main drinking water pipeline ruptured near north tank',
    description: 'Flooding road, zero pressure in Zone A houses.',
    category: 'WATER',
    lat: 18.3164,
    lng: 73.8682,
    status: 'IN_PROGRESS',
  },
];

const duplicateCheck = detectDuplicate(
  {
    title: 'Drinking water pipeline ruptured and leaking',
    description: 'Water spilling near north tank road.',
    category: 'WATER',
    lat: 18.3165,
    lng: 73.8683, // 15 meters away
  },
  existingComplaints
);

assert(duplicateCheck.isDuplicate === true, 'Should detect duplicate issue');
assert(duplicateCheck.parentComplaint?.code === 'CMP-2026-001', 'Should identify parent complaint');

// ==========================================
// Test 4: Spam & Gibberish Filter
// ==========================================
console.log('\n--- Test 4: Spam & Fake Grievance Filter ---');

const spamCheck = evaluateSpamAndFake({
  title: 'Earn money casino lottery prize aaaaaaaa',
  description: 'Instant loan win prize fast bakwas test ignore.',
  lat: 18.3164,
  lng: 73.8682,
  userTrustScore: 0.5,
});

assert(spamCheck.isSpam === true, 'Spam keywords and repetitive pattern should be flagged as spam');
assert(spamCheck.requiresModeration === true, 'Spam should require Sarpanch moderation');
assert(spamCheck.flaggedReasons.length >= 2, 'Multiple spam reasons should be identified');

const legitimateCheck = evaluateSpamAndFake({
  title: 'Handpump handle broken at Zone C',
  description: 'The community handpump iron chain has snapped. Villagers need drinking water.',
  lat: 18.3164,
  lng: 73.8682,
  userTrustScore: 0.95,
});

assert(legitimateCheck.isSpam === false, 'Legitimate grievance should not be spam');
assert(legitimateCheck.requiresModeration === false, 'Legitimate grievance should not require moderation');

// ==========================================
// Test 5: RBAC Authorization Rules
// ==========================================
console.log('\n--- Test 5: Role-Based Access Control (RBAC) ---');

assert(canAccessRole('SARPANCH', ['RESIDENT']), 'Sarpanch can access all views');
assert(canAccessRole('ORGANIZATION', ['ORGANIZATION', 'SARPANCH']), 'Org can access org views');
assert(!canAccessRole('RESIDENT', ['SARPANCH']), 'Resident cannot access Sarpanch only views');

const mockUser = {
  userId: 'usr-1',
  phone: '9876543250',
  name: 'Ananda Jadhav',
  role: 'RESIDENT' as const,
  villageId: 'v-1',
};

assert(
  canManageComplaint(mockUser, { residentId: 'usr-1', category: 'WATER' }),
  'Resident can manage own complaint'
);
assert(
  !canManageComplaint(mockUser, { residentId: 'other-user', category: 'WATER' }),
  'Resident cannot manage other resident complaint'
);

console.log(`\n🎉 Results: ${passedTests} / ${totalTests} tests PASSED!`);
