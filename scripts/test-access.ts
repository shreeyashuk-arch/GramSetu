import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import type { NextRequest } from 'next/server';
import {
  canConfirmComplaint,
  canReadPrivateComplaint,
  canViewComplaint,
  canWorkComplaint,
  serializeComplaint,
} from '../src/lib/complaint-access';
import {
  canManageComplaint,
  COOKIE_NAME,
  getSessionUserFromRequest,
  signToken,
  verifyToken,
} from '../src/lib/auth';
import type { TokenPayload } from '../src/lib/auth';

let passed = 0;
let total = 0;

async function test(name: string, check: () => void | Promise<void>) {
  total++;
  try {
    await check();
    passed++;
    console.log(`  PASS: ${name}`);
  } catch (error) {
    console.error(`  FAIL: ${name}`, error);
    process.exitCode = 1;
  }
}

const owner: TokenPayload = {
  userId: 'owner', villageId: 'village-1', role: 'RESIDENT',
  name: 'Fixture Resident', phone: '0000000000',
};
const peer = { ...owner, userId: 'peer' };
const sarpanch: TokenPayload = { ...owner, userId: 'admin', role: 'SARPANCH' };
const org: TokenPayload = {
  ...owner, userId: 'org', role: 'ORGANIZATION', organizationType: 'JAL_SHAKTI',
};
const provider: TokenPayload = { ...owner, userId: 'provider', role: 'PROVIDER' };
const createdAt = new Date('2026-01-01T00:00:00Z');
const complaint = {
  id: 'complaint-1', code: 'CMP-FIXTURE', villageId: 'village-1',
  residentId: 'owner', assignedProviderId: 'provider', assignedOrgType: 'JAL_SHAKTI',
  isAnonymous: false, isSpam: false, moderationStatus: 'APPROVED', status: 'RESOLVED',
  category: 'WATER', title: 'Broken public water pipe', description: 'Repair required near the tank.',
  lat: 18.316456, lng: 73.868245, coarseLat: 18.316, coarseLng: 73.868,
  address: 'PRIVATE_HOME_ADDRESS', priorityScore: 60, priorityBand: 'HIGH',
  priorityFactors: JSON.stringify({ explanation: 'Water supply affects many homes.' }),
  proofPhotoUrl: 'https://example.test/proof.jpg', photoUrl: 'https://example.test/before.jpg',
  slaHours: 48, slaExpiresAt: createdAt, escalationLevel: 1,
  supporterCount: 4, residentConfirmed: null, residentRating: 5, residentFeedback: 'Repaired.',
  createdAt, updatedAt: createdAt,
  anonymousTrackingCode: 'NEVER_EXPOSE_TRACKING_SECRET',
  proxyFiledBy: 'PRIVATE_PROXY_NAME', proxyPhone: 'PRIVATE_PROXY_PHONE',
  voiceTranscription: 'PRIVATE_TRANSCRIPTION', spamReason: 'PRIVATE_SPAM_REASON',
  unknownFutureSecret: 'FUTURE_PRIVATE_COLUMN',
  zone: { id: 'zone-1', name: 'North Ward', code: 'ZA', villageId: 'village-1', privateNote: 'PRIVATE_ZONE' },
  resident: { id: 'owner', name: 'PRIVATE_RESIDENT_NAME', phone: 'PRIVATE_RESIDENT_PHONE', trustScore: 1, extra: 'PRIVATE_RESIDENT_EXTRA' },
  assignedProvider: { id: 'provider', name: 'Provider', phone: 'PRIVATE_PROVIDER_PHONE', providerCategory: 'PLUMBER', extra: 'PRIVATE_PROVIDER_EXTRA' },
  supporters: [{ userId: 'PRIVATE_SUPPORTER_ID', user: { name: 'PRIVATE_SUPPORTER_NAME' } }],
  auditLogs: [{ action: 'STATUS_CHANGE_TO_RESOLVED', createdAt, userId: 'PRIVATE_AUDIT_USER_ID', role: 'ORGANIZATION', details: 'PRIVATE_AUDIT_DETAILS', user: { name: 'PRIVATE_AUDIT_ACTOR' } }],
};

async function accessTests() {
  const matrix: [string, TokenPayload | null, boolean[]][] = [
    ['guest', null, [true, false, false, false]],
    ['owner', owner, [true, true, false, true]],
    ['peer', peer, [true, false, false, false]],
    ['Sarpanch', sarpanch, [true, true, true, false]],
    ['matching department', org, [true, true, true, false]],
    ['wrong department', { ...org, organizationType: 'PWD_ROADS' }, [true, false, false, false]],
    ['organization without department', { ...org, organizationType: undefined }, [true, false, false, false]],
    ['assigned provider', provider, [true, true, true, false]],
    ['unassigned provider', { ...provider, userId: 'other-provider' }, [true, false, false, false]],
    ['recorded staff filer', { ...org, userId: 'owner', organizationType: undefined }, [true, true, false, true]],
  ];
  for (const [name, user, expected] of matrix) {
    await test(`${name} access [view, private, work, confirm]`, () => {
      assert.deepEqual([
        canViewComplaint(user, complaint), canReadPrivateComplaint(user, complaint),
        canWorkComplaint(user, complaint), canConfirmComplaint(user, complaint),
      ], expected);
    });
  }
  for (const user of [owner, sarpanch, org, provider]) {
    await test(`cross-village ${user.role} has no access`, () => {
      const foreign = { ...complaint, villageId: 'village-2' };
      assert.equal(canViewComplaint(user, foreign), false);
      assert.equal(canReadPrivateComplaint(user, foreign), false);
      assert.equal(canWorkComplaint(user, foreign), false);
      assert.equal(canConfirmComplaint(user, foreign), false);
      assert.equal(serializeComplaint(user, foreign), null);
      assert.equal(canManageComplaint(user, foreign), false);
    });
  }
  const hidden = [
    { isAnonymous: true }, { isSpam: true }, { moderationStatus: 'FLAGGED' },
    { moderationStatus: 'PENDING' }, { moderationStatus: 'REJECTED' },
    { moderationStatus: undefined }, { isSpam: undefined }, { isAnonymous: undefined },
  ];
  for (const change of hidden) {
    const label = Object.entries(change).map(([key, value]) => `${key}=${String(value)}`).join(', ');
    await test(`public visibility fails closed for ${label}`, () => {
      const record = { ...complaint, ...change };
      assert.equal(canViewComplaint(null, record), false);
      assert.equal(canViewComplaint(peer, record), false);
      assert.equal(serializeComplaint(null, record), null);
      assert.equal(serializeComplaint(peer, record), null);
      assert.equal(canReadPrivateComplaint(org, record), true);
    });
  }
  for (const villageId of [undefined, '', '   ']) {
    await test(`new policy rejects missing/blank village (${String(villageId)})`, () => {
      const record = { ...complaint, villageId: villageId as unknown as string };
      assert.equal(canViewComplaint(null, record), false);
      assert.equal(canReadPrivateComplaint(sarpanch, record), false);
      assert.equal(canWorkComplaint(sarpanch, record), false);
      assert.equal(canConfirmComplaint(owner, record), false);
    });
  }
  await test('blank user identity and blank matching department fail closed', () => {
    assert.equal(canReadPrivateComplaint({ ...owner, userId: '' }, { ...complaint, residentId: '' }), false);
    assert.equal(canWorkComplaint({ ...org, organizationType: '  ' }, { ...complaint, assignedOrgType: '  ' }), false);
    assert.equal(canWorkComplaint(org, { ...complaint, assignedOrgType: null }), false);
  });
  await test('provider cannot work an unassigned VERIFIED complaint', () => {
    assert.equal(canWorkComplaint(provider, { ...complaint, status: 'VERIFIED', assignedProviderId: null }), false);
  });
  for (const status of ['VERIFIED', 'IN_PROGRESS', 'CLOSED', 'REOPENED']) {
    await test(`owner cannot confirm while ${status}`, () => {
      assert.equal(canConfirmComplaint(owner, { ...complaint, status }), false);
    });
  }
  await test('anonymous rows never acquire owner access or confirmation', () => {
    const record = { ...complaint, isAnonymous: true };
    assert.equal(canReadPrivateComplaint(owner, record), false);
    assert.equal(canConfirmComplaint(owner, record), false);
    assert.equal(canConfirmComplaint(sarpanch, record), false);
  });
  await test('legacy resident-owner fixtures remain compatible', () => {
    assert.equal(canManageComplaint(owner, { residentId: owner.userId, category: 'WATER' }), true);
    assert.equal(canManageComplaint(owner, { residentId: peer.userId }), false);
    assert.equal(canManageComplaint(owner, { residentId: owner.userId, villageId: '' }), false);
  });
  for (const user of [sarpanch, org, provider]) {
    await test(`legacy helper requires village scope for ${user.role}`, () => {
      const { villageId: _omitted, ...unscoped } = complaint;
      assert.equal(canManageComplaint(user, unscoped), false);
      assert.equal(canManageComplaint(user, complaint), true);
    });
  }
  await test('legacy helper denies unrelated and missing departments', () => {
    assert.equal(canManageComplaint({ ...org, organizationType: 'PWD_ROADS' }, complaint), false);
    assert.equal(canManageComplaint({ ...org, organizationType: undefined }, complaint), false);
  });
  await test('legacy management does not mistake staff filing ownership for assignment', () => {
    assert.equal(canManageComplaint({ ...org, userId: owner.userId, organizationType: 'PWD_ROADS' }, complaint), false);
    assert.equal(canManageComplaint({ ...provider, userId: owner.userId }, complaint), false);
  });
}

async function serializerTests() {
  for (const [name, user] of [['guest', null], ['peer', peer]] as const) {
    await test(`${name} serialization is coarse and contains no structured PII`, () => {
      const result = serializeComplaint(user, complaint);
      assert.ok(result);
      assert.equal(result.lat, complaint.coarseLat);
      assert.equal(result.lng, complaint.coarseLng);
      assert.equal(result.address, complaint.zone.name);
      for (const key of ['residentId', 'resident', 'assignedProviderId', 'assignedProvider', 'supporters', 'anonymousTrackingCode', 'proxyFiledBy', 'proxyPhone', 'voiceTranscription', 'spamReason', 'unknownFutureSecret']) {
        assert.equal(Object.hasOwn(result, key), false, `unexpected public key ${key}`);
      }
      const json = JSON.stringify(result);
      assert.equal(/PRIVATE_|NEVER_EXPOSE|FUTURE_PRIVATE/.test(json), false);
      assert.deepEqual(result.permissions, { canReadPrivate: false, canWork: false, canConfirm: false });
    });
  }
  await test('public projection retains priority, proof, timeline, and feedback fields', () => {
    const result = serializeComplaint(null, complaint);
    assert.ok(result);
    for (const key of ['id', 'code', 'title', 'description', 'priorityScore', 'priorityBand', 'priorityFactors', 'proofPhotoUrl', 'status', 'slaHours', 'slaExpiresAt', 'escalationLevel', 'createdAt', 'updatedAt', 'residentConfirmed', 'residentRating', 'residentFeedback'] as const) {
      assert.deepEqual(result[key], complaint[key], `missing UI field ${key}`);
    }
    assert.deepEqual(result.zone, { id: 'zone-1', name: 'North Ward', code: 'ZA' });
    assert.deepEqual(result.auditLogs, [{ action: 'STATUS_CHANGE_TO_RESOLVED', createdAt }]);
  });
  for (const user of [owner, sarpanch, org, provider]) {
    await test(`${user.role} private projection has exact GPS but no tracking/proxy/audit secrets`, () => {
      const result = serializeComplaint(user, complaint);
      assert.ok(result);
      assert.equal(result.lat, complaint.lat);
      assert.equal(result.lng, complaint.lng);
      assert.equal(result.residentId, owner.userId);
      assert.equal(result.resident?.phone, complaint.resident.phone);
      assert.equal(result.permissions.canReadPrivate, true);
      for (const key of ['anonymousTrackingCode', 'proxyFiledBy', 'proxyPhone', 'supporters', 'voiceTranscription', 'spamReason', 'unknownFutureSecret']) {
        assert.equal(Object.hasOwn(result, key), false);
      }
      assert.equal(/PRIVATE_AUDIT|PRIVATE_ZONE|PRIVATE_RESIDENT_EXTRA|PRIVATE_PROVIDER_EXTRA|NEVER_EXPOSE/.test(JSON.stringify(result)), false);
    });
  }
  await test('privileged anonymous projection hides corrupt resident identity and tracking secret', () => {
    const result = serializeComplaint(sarpanch, { ...complaint, isAnonymous: true });
    assert.ok(result);
    assert.equal(result.residentId, null);
    assert.equal(result.resident, null);
    assert.equal(Object.hasOwn(result, 'anonymousTrackingCode'), false);
  });
  await test('missing coarse GPS never falls back to exact coordinates or raw address', () => {
    const result = serializeComplaint(null, { ...complaint, coarseLat: undefined, coarseLng: undefined, zone: null });
    assert.ok(result);
    assert.equal(result.lat, null);
    assert.equal(result.lng, null);
    assert.equal(result.address, null);
  });
  await test('nonfinite coordinates are not serialized as usable GPS', () => {
    const result = serializeComplaint(null, { ...complaint, coarseLat: NaN, coarseLng: Infinity });
    assert.ok(result);
    assert.equal(result.lat, null);
    assert.equal(result.lng, null);
  });
  await test('unloaded optional relations are safe and count fallback is retained', () => {
    const result = serializeComplaint(null, {
      villageId: 'village-1', isAnonymous: false, isSpam: false,
      moderationStatus: 'APPROVED', _count: { supporters: 3 },
    });
    assert.ok(result);
    assert.equal(result.zone, null);
    assert.equal(result.supporterCount, 3);
    assert.equal(result.auditLogs, undefined);
  });
  await test('serializer does not mutate input or alias nested relation objects', () => {
    const before = JSON.stringify(complaint);
    const result = serializeComplaint(sarpanch, complaint);
    assert.ok(result);
    assert.notEqual(result.zone, complaint.zone);
    assert.notEqual(result.auditLogs?.[0], complaint.auditLogs[0]);
    assert.notEqual(result.resident, complaint.resident);
    assert.equal(JSON.stringify(complaint), before);
  });
}

async function tokenTests() {
  const originalSecret = process.env.JWT_SECRET;
  try {
    process.env.JWT_SECRET = 'test-only-secret-'.repeat(3);
    const token = await signToken(owner);
    await test('valid JWT round-trips with an explicitly configured secret', async () => {
      const result = await verifyToken(token);
      assert.equal(result?.userId, owner.userId);
      assert.equal(result?.role, owner.role);
    });
    for (const [name, secret] of [
      ['missing', undefined], ['empty', ''], ['short', 'x'.repeat(31)],
      ['whitespace', ' '.repeat(40)], ['padding-only length', `${'x'.repeat(31)} `],
    ] as const) {
      await test(`${name} secret refuses signing and fails verification closed`, async () => {
        if (secret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = secret;
        await assert.rejects(signToken(owner), /JWT_SECRET/);
        assert.equal(await verifyToken(token), null);
      });
    }
    await test('secret is read lazily and a changed secret rejects prior tokens', async () => {
      process.env.JWT_SECRET = 'other-test-secret-'.repeat(3);
      assert.equal(await verifyToken(token), null);
      const replacement = await signToken(owner);
      assert.equal((await verifyToken(replacement))?.userId, owner.userId);
    });
    await test('exactly 32 non-padding secret characters are accepted', async () => {
      process.env.JWT_SECRET = 'x'.repeat(32);
      assert.ok(await verifyToken(await signToken(owner)));
    });
    const key = new TextEncoder().encode(process.env.JWT_SECRET);
    const rawToken = (payload: Record<string, unknown>, alg = 'HS256') =>
      new SignJWT(payload).setProtectedHeader({ alg }).setIssuedAt().setExpirationTime('1h').sign(key);
    await test('malformed and tampered JWTs fail closed', async () => {
      assert.equal(await verifyToken('not-a-jwt'), null);
      const currentToken = await signToken(owner);
      const parts = currentToken.split('.');
      parts[2] = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1);
      assert.equal(await verifyToken(parts.join('.')), null);
    });
    await test('signed malformed identity/role claims are rejected', async () => {
      for (const change of [{ userId: '' }, { villageId: '' }, { role: 'ADMIN' }, { organizationType: 42 }, { isVerified: 'true' }]) {
        assert.equal(await verifyToken(await rawToken({ ...owner, ...change })), null);
      }
    });
    await test('wrong algorithm, expiry, and missing expiry are rejected', async () => {
      assert.equal(await verifyToken(await rawToken({ ...owner }, 'HS384')), null);
      const expired = await new SignJWT({ ...owner }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(1).sign(key);
      const noExpiry = await new SignJWT({ ...owner }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().sign(key);
      assert.equal(await verifyToken(expired), null);
      assert.equal(await verifyToken(noExpiry), null);
    });
  } finally {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
}

async function sessionTests() {
  const originalSecret = process.env.JWT_SECRET;
  const shared = globalThis as unknown as { prisma?: unknown };
  const originalPrisma = shared.prisma;
  let lookups = 0;
  let failLookup = false;
  const current = {
    id: 'owner', phone: '1111111111', name: 'Current Name', role: 'RESIDENT',
    villageId: 'village-2', village: { name: 'Current Village' }, zoneId: null,
    organizationType: null, providerCategory: null, language: 'hi', isVerified: false,
  };
  let account: typeof current | null = current;
  // Installed Prisma module sees this read-only in-memory client before first import.
  // No real database is opened and no mutation methods exist on this fixture.
  shared.prisma = { user: { findUnique: async (query: { where: { id: string } }) => {
    lookups++;
    assert.equal(query.where.id, owner.userId);
    if (failLookup) throw new Error('Fixture lookup failure');
    return account;
  } } };
  try {
    process.env.JWT_SECRET = 'session-fixture-secret-'.repeat(3);
    const token = await signToken({
      ...owner, role: 'SARPANCH', organizationType: 'JAL_SHAKTI',
      providerCategory: 'VOLUNTEER', isVerified: true,
    });
    const request = (value?: string) => ({ cookies: { get: (name: string) => {
      assert.equal(name, COOKIE_NAME);
      return value ? { value } : undefined;
    } } }) as unknown as NextRequest;
    await test('request session reloads identity, village, role, department and verification', async () => {
      assert.deepEqual(await getSessionUserFromRequest(request(token)), {
        userId: current.id, phone: current.phone, name: current.name, role: current.role,
        villageId: current.villageId, villageName: current.village.name, zoneId: undefined,
        organizationType: undefined, providerCategory: undefined, language: 'hi', isVerified: false,
      });
    });
    await test('copied JWT no longer authorizes a deleted account', async () => {
      account = null;
      assert.equal(await getSessionUserFromRequest(request(token)), null);
    });
    await test('invalid current account roles and lookup failures fail closed', async () => {
      account = { ...current, role: 'ADMIN' };
      assert.equal(await getSessionUserFromRequest(request(token)), null);
      failLookup = true;
      assert.equal(await getSessionUserFromRequest(request(token)), null);
    });
    await test('absent/invalid cookies never query account storage', async () => {
      const before = lookups;
      assert.equal(await getSessionUserFromRequest(request()), null);
      assert.equal(await getSessionUserFromRequest(request('invalid')), null);
      assert.equal(lookups, before);
    });
  } finally {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalPrisma === undefined) delete shared.prisma;
    else shared.prisma = originalPrisma;
  }
}

async function main() {
  await accessTests();
  await serializerTests();
  await tokenTests();
  await sessionTests();
  console.log(`\nResults: ${passed} / ${total} access cases PASSED`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
