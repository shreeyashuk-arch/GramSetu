// Invoke through test-api.mjs so imports can only connect to its isolated DB.
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import type { Prisma, User } from '@prisma/client';
import type { TokenPayload } from '../src/lib/auth';

let assertions = 0;
let passedAssertions = 0;
let cases = 0;
let passedCases = 0;
let lastAssertion = '';
const report = (line: string) => process.stdout.write(`${line}\n`);

function equal(actual: unknown, expected: unknown, label: string) {
  assertions++;
  lastAssertion = label;
  assert.strictEqual(actual, expected, label);
  passedAssertions++;
}

function same(actual: unknown, expected: unknown, label: string) {
  assertions++;
  lastAssertion = label;
  assert.deepStrictEqual(actual, expected, label);
  passedAssertions++;
}

function ok(value: unknown, label: string): asserts value {
  assertions++;
  lastAssertion = label;
  assert.ok(value, label);
  passedAssertions++;
}

function diagnostic(error: unknown) {
  // Assertion labels are authored here, never populated from response bodies.
  if (error instanceof assert.AssertionError) return lastAssertion;
  return 'unexpected handler, database, or fixture exception (details suppressed)';
}

async function test(name: string, check: () => Promise<void>) {
  cases++;
  try {
    await check();
    passedCases++;
    report(`API PASS: ${name}`);
  } catch (error) {
    report(`API FAIL: ${name}: ${diagnostic(error)}`);
    process.exitCode = 1;
  }
}

async function main() {
  const filename = process.env.GRAMSETU_API_TEST_DB;
  if (!filename || !/^regression-[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.db$/.test(filename) ||
      process.env.DATABASE_URL !== `file:./${filename}` ||
      (process.env.JWT_SECRET?.trim().length ?? 0) < 32) {
    throw new Error('Use the isolated wrapper');
  }

  // Silence application logging throughout the fixture; only controlled report
  // lines above are emitted. Direct handler calls never contact a live server.
  const originalConsole = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = () => {};
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Network is disabled in route tests'); };

  const { prisma } = await import('../src/lib/prisma');
  try {
    const { signToken, COOKIE_NAME, getSessionUserFromRequest } = await import('../src/lib/auth');
    const collection = await import('../src/app/api/complaints/route');
    const detail = await import('../src/app/api/complaints/[id]/route');
    const support = await import('../src/app/api/complaints/[id]/support/route');
    const anonymous = await import('../src/app/api/complaints/anonymous/[code]/route');

    // Stable synthetic identifiers and timestamps make behavior reproducible.
    const village = await prisma.village.create({ data: {
      id: 'regression-village-a', name: 'Fixture Village A', block: 'Fixture Block',
      district: 'Fixture District', state: 'Fixture State', lat: 18.316, lng: 73.868,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    } });
    const foreign = await prisma.village.create({ data: {
      id: 'regression-village-b', name: 'Fixture Village B', block: 'Fixture Block',
      district: 'Fixture District', state: 'Fixture State', lat: 19.316, lng: 74.868,
      createdAt: new Date('2026-01-02T00:00:00Z'),
    } });
    const zone = await prisma.zone.create({ data: {
      id: 'regression-zone-a', villageId: village.id, name: 'Fixture North Ward', code: 'FA',
    } });
    const foreignZone = await prisma.zone.create({ data: {
      id: 'regression-zone-b', villageId: foreign.id, name: 'Fixture South Ward', code: 'FB',
    } });

    async function account(key: string, suffix: string, role: string, extra: Partial<User> = {}) {
      return prisma.user.create({ data: {
        id: `regression-user-${key}`, phone: `00000000${suffix}`, name: `Synthetic ${key}`,
        role, villageId: village.id, zoneId: zone.id, isVerified: true, ...extra,
      } });
    }
    const owner = await account('owner', '11', 'RESIDENT');
    const peer = await account('peer', '12', 'RESIDENT');
    const sarpanch = await account('sarpanch', '13', 'SARPANCH');
    const water = await account('water', '14', 'ORGANIZATION', { organizationType: 'JAL_SHAKTI' });
    const power = await account('power', '15', 'ORGANIZATION', { organizationType: 'MSEDCL_ELECTRICITY' });
    const assigned = await account('assigned', '16', 'PROVIDER', { providerCategory: 'PLUMBER' });
    const unassigned = await account('unassigned', '17', 'PROVIDER', { providerCategory: 'PLUMBER' });

    async function cookie(user: User, overrides: Partial<TokenPayload> = {}) {
      const token = await signToken({
        userId: user.id, phone: user.phone, name: user.name, role: user.role as TokenPayload['role'],
        villageId: user.villageId, zoneId: user.zoneId || undefined,
        organizationType: user.organizationType || undefined,
        providerCategory: user.providerCategory || undefined, ...overrides,
      });
      return `${COOKIE_NAME}=${token}`;
    }
    const cookies = new Map<string, string>();
    for (const user of [owner, peer, sarpanch, water, power, assigned, unassigned]) {
      cookies.set(user.id, await cookie(user));
    }
    function request(path: string, method = 'GET', body?: Record<string, unknown>, session?: string) {
      return new NextRequest(`http://regression.invalid${path}`, {
        method,
        headers: {
          ...(body ? { 'content-type': 'application/json' } : {}),
          ...(session ? { cookie: session } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    }

    const exact = { lat: 18.316457, lng: 73.868249 };
    const coarse = { lat: Math.round(exact.lat * 500) / 500, lng: Math.round(exact.lng * 500) / 500 };
    let sequence = 0;
    async function complaint(overrides: Partial<Prisma.ComplaintUncheckedCreateInput> = {}) {
      const n = ++sequence;
      return prisma.complaint.create({ data: {
        id: `regression-complaint-${n}`, code: `CMP-REGRESSION-${n}`,
        villageId: village.id, zoneId: zone.id, residentId: owner.id,
        category: 'WATER', title: 'Public water pipe needs repair',
        description: 'The public pipe near the tank has leaked since morning.',
        ...exact, coarseLat: coarse.lat, coarseLng: coarse.lng,
        address: 'SENSITIVE_ADDRESS_MARKER', voiceTranscription: 'SENSITIVE_VOICE_MARKER',
        proxyFiledBy: 'SENSITIVE_PROXY_MARKER', proxyPhone: '0000000099',
        anonymousTrackingCode: `SENSITIVE_TRACKING_MARKER_${n}`,
        status: 'VERIFIED', assignedOrgType: 'JAL_SHAKTI', assignedProviderId: assigned.id,
        slaExpiresAt: new Date('2020-01-01T00:00:00Z'), escalationLevel: 0,
        ...overrides,
      } });
    }
    const createBody = {
      category: 'WATER', title: 'Drinking water tank outlet is leaking',
      description: 'The outlet valve beside the village tank needs a lasting repair.',
      ...exact, zoneId: zone.id, urgency: 3, peopleAffected: 2, timeSensitivity: 3,
    };

    async function json(response: Response | Promise<Response>, expected: number) {
      const value = await response;
      equal(value.status, expected, `HTTP expected ${expected}, received ${value.status}`);
      return value.json();
    }
    async function snapshot(id: string) {
      return {
        row: await prisma.complaint.findUniqueOrThrow({ where: { id } }),
        auditCount: await prisma.auditLog.count({ where: { complaintId: id } }),
        notificationCount: await prisma.notification.count(),
      };
    }
    async function patch(id: string, body: Record<string, unknown>, user?: User, expected = 200, session?: string) {
      const before = expected >= 400 ? await snapshot(id) : null;
      const result = await json(detail.PATCH(
        request(`/api/complaints/${id}`, 'PATCH', body, session || (user && cookies.get(user.id))),
        { params: { id } },
      ), expected);
      if (before) same(await snapshot(id), before, 'rejected PATCH leaves row, audits and notifications unchanged');
      return result;
    }
    async function getDetail(id: string, user?: User, expected = 200) {
      return json(detail.GET(request(`/api/complaints/${id}`, 'GET', undefined, user && cookies.get(user.id)),
        { params: { id } }), expected);
    }
    async function list(user?: User, query = '') {
      const result = await json(collection.GET(request(`/api/complaints${query}`, 'GET', undefined,
        user && cookies.get(user.id))), 200);
      ok(Array.isArray(result.complaints), 'list returns a complaints array');
      return result.complaints as Record<string, unknown>[];
    }
    async function post(body: Record<string, unknown>, user?: User, expected = 200) {
      const before = expected >= 400 ? {
        complaints: await prisma.complaint.count(), audits: await prisma.auditLog.count(),
        notifications: await prisma.notification.count(),
      } : null;
      const result = await json(collection.POST(request('/api/complaints', 'POST', body,
        user && cookies.get(user.id))), expected);
      if (before) same({
        complaints: await prisma.complaint.count(), audits: await prisma.auditLog.count(),
        notifications: await prisma.notification.count(),
      }, before, 'rejected creation writes no complaints, audits or notifications');
      return result;
    }

    await test('owner identified creation is VERIFIED and routed to water department', async () => {
      const result = await post(createBody, owner);
      equal(result.success, true, 'creation succeeds');
      equal(result.complaint?.status, 'VERIFIED', 'created report is VERIFIED');
      equal(result.complaint?.assignedOrgType, 'JAL_SHAKTI', 'created report routes to water department');
      ok(typeof result.complaint?.id === 'string', 'creation returns an identifier');
      const row = await prisma.complaint.findUniqueOrThrow({ where: { id: result.complaint.id } });
      equal(row.residentId, owner.id, 'created report belongs to authenticated account');
      equal(row.villageId, village.id, 'created report uses current account village');
      equal(row.zoneId, zone.id, 'created report uses valid village zone');
      equal(row.status, 'VERIFIED', 'VERIFIED persists');
      equal(row.assignedOrgType, 'JAL_SHAKTI', 'department routing persists');
      equal(row.isAnonymous, false, 'identified report is not anonymous');
      equal(result.trackingCode, null, 'identified creation returns no tracking code');
    });
    await test('guest identified creation requires authentication', async () => {
      await post(createBody, undefined, 401);
    });
    for (const [label, change] of [
      ['latitude above range', { lat: 91 }], ['latitude below range', { lat: -91 }],
      ['longitude above range', { lng: 181 }], ['longitude below range', { lng: -181 }],
      ['null coordinate', { lat: null }], ['string coordinate', { lng: '73.868249' }],
    ] as const) {
      await test(`invalid coordinates: ${label}`, async () => {
        await post({ ...createBody, ...change }, owner, 400);
      });
    }
    await test('zone from another village is rejected', async () => {
      await post({ ...createBody, zoneId: foreignZone.id }, owner, 400);
    });

    const privacy = await complaint();
    await prisma.auditLog.create({ data: {
      complaintId: privacy.id, userId: owner.id, role: 'RESIDENT', action: 'CREATED',
      details: JSON.stringify({ marker: 'SENSITIVE_AUDIT_MARKER', phone: owner.phone }),
    } });
    const forbiddenPublicKeys = new Set([
      'residentId', 'resident', 'assignedProviderId', 'assignedProvider', 'supporters',
      'anonymousTrackingCode', 'trackingCode', 'proxyFiledBy', 'proxyPhone', 'voiceTranscription',
      'spamReason', 'phone', 'userId', 'user', 'details',
    ]);
    function publicProjection(value: unknown) {
      let privateFieldFound = false;
      function walk(node: unknown): void {
        if (!node || typeof node !== 'object') return;
        for (const [key, child] of Object.entries(node)) {
          if (forbiddenPublicKeys.has(key)) privateFieldFound = true;
          walk(child);
        }
      }
      walk(value);
      equal(privateFieldFound, false, 'public projection omits structured private fields');
      const encoded = JSON.stringify(value);
      const secrets = [
        ...[owner, peer, sarpanch, water, power, assigned, unassigned].flatMap(user => [user.id, user.name, user.phone]),
        'SENSITIVE_', String(exact.lat), String(exact.lng),
      ];
      equal(secrets.some(secret => encoded.includes(secret)), false,
        'public projection contains no identity, tracking, proxy, audit or exact GPS values');
    }
    for (const [label, user] of [['guest', undefined], ['resident peer', peer]] as const) {
      await test(`${label} detail is sanitized and GPS is coarse`, async () => {
        const result = await getDetail(privacy.id, user);
        publicProjection(result);
        equal(result.complaint.lat, coarse.lat, 'public latitude is coarse');
        equal(result.complaint.lng, coarse.lng, 'public longitude is coarse');
        equal(result.complaint.address, zone.name, 'public address exposes only ward');
        same(result.complaint.auditLogs.map((log: object) => Object.keys(log).sort()),
          [['action', 'createdAt']], 'public audit entries contain only safe fields');
      });
      await test(`${label} list is sanitized and GPS is coarse`, async () => {
        const rows = await list(user);
        publicProjection(rows);
        const row = rows.find(row => row.id === privacy.id);
        ok(row, 'public list includes ordinary approved report');
        equal(row.lat, coarse.lat, 'listed public latitude is coarse');
        equal(row.lng, coarse.lng, 'listed public longitude is coarse');
      });
    }
    for (const [label, user] of [['owner', owner], ['Sarpanch', sarpanch], ['assigned department', water], ['assigned provider', assigned]] as const) {
      await test(`${label} private detail uses actual JWT cookie and exact GPS`, async () => {
        const result = await getDetail(privacy.id, user);
        equal(result.complaint.lat, exact.lat, 'authorized latitude is exact');
        equal(result.complaint.lng, exact.lng, 'authorized longitude is exact');
        equal(result.complaint.permissions.canReadPrivate, true, 'authorized current account can read private detail');
        equal(Object.hasOwn(result.complaint, 'anonymousTrackingCode'), false, 'private detail still hides tracking secret');
      });
    }

    for (const [label, user, status] of [
      ['guest', undefined, 401], ['owner', owner, 403],
      ['other department', power, 403], ['unassigned provider', unassigned, 403],
    ] as const) {
      await test(`${label} cannot start work`, async () => {
        const row = await complaint();
        await patch(row.id, { status: 'IN_PROGRESS' }, user, status);
      });
    }
    await test('current-account role overrides stale privileged JWT claims', async () => {
      const row = await complaint();
      const staleCookie = await cookie(peer, { role: 'SARPANCH' });
      await patch(row.id, { status: 'IN_PROGRESS' }, undefined, 403, staleCookie);
    });
    await test('current-account department overrides stale JWT department', async () => {
      const row = await complaint();
      const staleCookie = await cookie(power, { organizationType: 'JAL_SHAKTI' });
      await patch(row.id, { status: 'IN_PROGRESS' }, undefined, 403, staleCookie);
    });
    for (const [label, user] of [['water organization', water], ['assigned provider', assigned]] as const) {
      await test(`${label} can start VERIFIED work`, async () => {
        const row = await complaint();
        const result = await patch(row.id, { status: 'IN_PROGRESS' }, user);
        equal(result.complaint?.status, 'IN_PROGRESS', 'start returns IN_PROGRESS');
        equal((await prisma.complaint.findUniqueOrThrow({ where: { id: row.id } })).status,
          'IN_PROGRESS', 'start persists IN_PROGRESS');
        equal(await prisma.auditLog.count({ where: { complaintId: row.id } }), 1, 'start records one audit event');
      });
    }
    await test('RESOLVED without proof is rejected', async () => {
      const row = await complaint({ status: 'IN_PROGRESS' });
      await patch(row.id, { status: 'RESOLVED' }, water, 400);
    });
    await test('RESOLVED with proof succeeds and persists proof', async () => {
      const row = await complaint({ status: 'IN_PROGRESS' });
      const proofPhotoUrl = 'https://proof.example.test/fixture-repaired.jpg';
      const result = await patch(row.id, { status: 'RESOLVED', proofPhotoUrl }, water);
      equal(result.complaint?.status, 'RESOLVED', 'proof resolution returns RESOLVED');
      const saved = await prisma.complaint.findUniqueOrThrow({ where: { id: row.id } });
      equal(saved.status, 'RESOLVED', 'proof resolution persists RESOLVED');
      equal(saved.proofPhotoUrl, proofPhotoUrl, 'resolution proof persists');
      equal(saved.residentConfirmed, null, 'resolution awaits resident confirmation');
    });
    for (const [label, user] of [
      ['other resident', peer], ['assigned organization', water],
      ['assigned provider', assigned], ['unassigned provider', unassigned], ['Sarpanch', sarpanch],
    ] as const) {
      await test(`${label} cannot confirm another resident report`, async () => {
        const row = await complaint({ status: 'RESOLVED', proofPhotoUrl: '/fixture-proof.jpg' });
        await patch(row.id, { residentConfirmed: true, residentRating: 5 }, user, 403);
      });
    }
    await test('owner reopens, organization restarts and resolves, owner closes, replay is rejected', async () => {
      const row = await complaint({
        status: 'RESOLVED', proofPhotoUrl: '/fixture-first-proof.jpg', escalationLevel: 0,
      });
      const reopened = await patch(row.id, {
        residentConfirmed: false, residentFeedback: 'The pipe still leaks after repair.',
      }, owner);
      equal(reopened.complaint?.status, 'REOPENED', 'owner can reopen resolved complaint');
      let saved = await prisma.complaint.findUniqueOrThrow({ where: { id: row.id } });
      equal(saved.status, 'REOPENED', 'reopen persists');
      equal(saved.residentConfirmed, false, 'negative confirmation persists');
      equal(saved.escalationLevel, 1, 'reopen increments escalation once');
      const restarted = await patch(row.id, { status: 'IN_PROGRESS' }, water);
      equal(restarted.complaint?.status, 'IN_PROGRESS', 'organization restarts reopened work');
      const resolved = await patch(row.id, { status: 'RESOLVED', proofPhotoUrl: '/fixture-second-proof.jpg' }, water);
      equal(resolved.complaint?.status, 'RESOLVED', 'organization resolves reopened report');
      saved = await prisma.complaint.findUniqueOrThrow({ where: { id: row.id } });
      equal(saved.residentConfirmed, null, 'new resolution clears previous negative confirmation');
      equal(saved.residentRating, null, 'new resolution clears previous rating');
      equal(saved.residentFeedback, null, 'new resolution clears previous feedback');
      const closed = await patch(row.id, {
        residentConfirmed: true, residentRating: 4, residentFeedback: 'The outlet is repaired now.',
      }, owner);
      equal(closed.complaint?.status, 'CLOSED', 'owner closes resolved report');
      saved = await prisma.complaint.findUniqueOrThrow({ where: { id: row.id } });
      equal(saved.status, 'CLOSED', 'owner closure persists');
      equal(saved.residentConfirmed, true, 'positive confirmation persists');
      equal(saved.residentRating, 4, 'owner rating persists');
      await patch(row.id, { residentConfirmed: true, residentRating: 4 }, owner, 403);
      equal(await prisma.auditLog.count({ where: { complaintId: row.id } }), 4, 'replay adds no fifth audit event');
    });

    const mixed = [
      ['status and confirmation', { status: 'RESOLVED', residentConfirmed: true, proofPhotoUrl: '/fixture-proof.jpg' }],
      ['status and assignment', { status: 'IN_PROGRESS', assignedProviderId: assigned.id }],
      ['status and moderation', { status: 'IN_PROGRESS', moderationStatus: 'APPROVED' }],
      ['confirmation and assignment', { residentConfirmed: true, assignedProviderId: assigned.id }],
      ['confirmation and moderation', { residentConfirmed: true, moderationStatus: 'APPROVED' }],
      ['assignment and moderation', { assignedProviderId: assigned.id, moderationStatus: 'APPROVED' }],
    ] as const;
    for (const [label, body] of mixed) {
      await test(`mixed actions rejected: ${label}`, async () => {
        const row = await complaint({ status: 'IN_PROGRESS' });
        await patch(row.id, body, sarpanch, 400);
      });
    }
    for (const [label, body, status, user] of [
      ['work action with resident rating', { status: 'IN_PROGRESS', residentRating: 5 }, 'VERIFIED', water],
      ['confirmation with proof upload', { residentConfirmed: true, proofPhotoUrl: '/fixture-proof.jpg' }, 'RESOLVED', owner],
      ['assignment with resident feedback', { assignedProviderId: assigned.id, residentFeedback: 'Fixture feedback.' }, 'VERIFIED', sarpanch],
      ['moderation with proof upload', { moderationStatus: 'APPROVED', proofPhotoUrl: '/fixture-proof.jpg' }, 'SUBMITTED', sarpanch],
    ] as const) {
      await test(`cross-action fields rejected: ${label}`, async () => {
        const row = await complaint({ status, moderationStatus: status === 'SUBMITTED' ? 'FLAGGED' : 'APPROVED' });
        await patch(row.id, body, user, 400);
      });
    }

    await test('support requires authentication and does not mutate on guest rejection', async () => {
      const row = await complaint();
      const before = await snapshot(row.id);
      await json(support.POST(request(`/api/complaints/${row.id}/support`, 'POST'), { params: { id: row.id } }), 401);
      same(await snapshot(row.id), before, 'guest support leaves complaint and audit state unchanged');
      equal(await prisma.complaintSupporter.count({ where: { complaintId: row.id } }), 0, 'guest creates no supporter row');
    });
    await test('support is idempotent once per account and counts distinct accounts', async () => {
      const row = await complaint();
      async function add(user: User) {
        return json(support.POST(request(`/api/complaints/${row.id}/support`, 'POST', undefined, cookies.get(user.id)),
          { params: { id: row.id } }), 200);
      }
      equal((await add(peer)).count, 1, 'first account increases support to one');
      equal((await add(peer)).count, 1, 'repeated support stays at one');
      equal((await add(owner)).count, 2, 'second account increases support to two');
      equal((await add(owner)).count, 2, 'second account replay stays at two');
      equal(await prisma.complaintSupporter.count({ where: { complaintId: row.id } }), 2, 'exactly two distinct supporter rows persist');
      equal((await prisma.complaint.findUniqueOrThrow({ where: { id: row.id } })).supporterCount,
        2, 'stored supporter count agrees with persisted supporter rows');
    });

    await test('logged-in anonymous creation returns high-entropy tracking without filer linkage', async () => {
      const trackingCodes: string[] = [];
      for (const title of ['Footpath lighting needs attention', 'Drain cover requires maintenance']) {
        const result = await post({
          ...createBody, category: 'OTHER', title,
          description: 'A public facility needs a confidential maintenance review.',
          isAnonymous: true, proxyFiledBy: owner.name, proxyPhone: owner.phone,
        }, owner);
        equal(result.success, true, 'anonymous creation succeeds');
        ok(typeof result.trackingCode === 'string' && /^GS-ANON-[0-9A-F]{32,}$/.test(result.trackingCode),
          'anonymous tracking code has at least 128 bits of random-format material');
        trackingCodes.push(result.trackingCode);
        const row = await prisma.complaint.findFirstOrThrow({ where: { anonymousTrackingCode: result.trackingCode } });
        equal(row.isAnonymous, true, 'anonymous flag persists');
        equal(row.residentId, null, 'anonymous report has no resident linkage despite logged-in cookie');
        equal(row.proxyFiledBy, null, 'anonymous report drops supplied proxy name');
        equal(row.proxyPhone, null, 'anonymous report drops supplied proxy phone');
        const logs = await prisma.auditLog.findMany({ where: { complaintId: row.id } });
        equal(logs.length, 1, 'anonymous creation produces one audit event');
        equal(logs[0].userId, null, 'anonymous audit actor is null');
        equal(logs[0].role, 'ANONYMOUS', 'anonymous audit role is ANONYMOUS');
        equal(logs[0].action, 'CREATED', 'anonymous proxy input does not produce proxy audit action');
        const encoded = JSON.stringify({ response: result.complaint, logs });
        equal([owner.id, owner.phone, owner.name].some(value => encoded.includes(value)),
          false, 'anonymous response and audit details do not identify logged-in filer');
      }
      equal(new Set(trackingCodes).size, 2, 'separate anonymous creations receive distinct tracking codes');
    });

    // Seed independent privacy/lookup cases so creation regressions do not hide
    // leaks in read handlers. Raw actor/details are intentionally sensitive.
    const anonymousCode = `GS-ANON-${'0123456789ABCDEF'.repeat(2)}`;
    const hidden = await complaint({
      isAnonymous: true, residentId: null, anonymousTrackingCode: anonymousCode,
      proxyFiledBy: null, proxyPhone: null,
    });
    await prisma.auditLog.createMany({ data: [
      { complaintId: hidden.id, userId: null, role: 'ANONYMOUS', action: 'CREATED',
        details: JSON.stringify({ marker: 'SENSITIVE_ANONYMOUS_AUDIT_MARKER' }) },
      { complaintId: hidden.id, userId: water.id, role: 'ORGANIZATION', action: 'STATUS_CHANGE_TO_VERIFIED',
        details: JSON.stringify({ marker: 'SENSITIVE_STAFF_AUDIT_MARKER', phone: water.phone }) },
    ] });
    for (const [label, user] of [['guest', undefined], ['resident peer', peer], ['logged-in filer', owner]] as const) {
      await test(`${label} public list excludes anonymous reports`, async () => {
        const rows = await list(user);
        equal(rows.some(row => row.id === hidden.id), false, 'anonymous fixture is absent from list');
        equal(rows.some(row => row.isAnonymous === true), false, 'no anonymous report appears in resident or guest list');
        equal(JSON.stringify(rows).includes(anonymousCode), false, 'list never exposes anonymous tracking code');
      });
      await test(`${label} cannot open anonymous public detail`, async () => {
        await getDetail(hidden.id, user, 404);
      });
    }
    await test('resident my-list excludes logged-in anonymous submissions', async () => {
      const rows = await list(owner, '?my=true');
      equal(rows.some(row => row.isAnonymous === true), false, 'my-list contains no anonymous submissions');
    });
    await test('anonymous tracking lookup exposes only safe timeline fields', async () => {
      const result = await json(anonymous.GET(request(`/api/complaints/anonymous/${anonymousCode}`),
        { params: { code: anonymousCode } }), 200);
      ok(result.complaint, 'anonymous lookup returns a report');
      equal(result.complaint.code, hidden.code, 'tracking code finds intended report');
      publicProjection(result);
      const allowed = new Set([
        'code', 'category', 'title', 'status', 'priorityBand', 'createdAt', 'updatedAt', 'proofPhotoUrl', 'timeline',
      ]);
      equal(Object.keys(result.complaint).every(key => allowed.has(key)), true, 'lookup uses a safe field allowlist');
      equal(result.complaint.timeline.length, 2, 'lookup preserves both audit events');
      for (const log of result.complaint.timeline) {
        same(Object.keys(log).sort(), ['action', 'createdAt'], 'lookup audit entry exposes action and timestamp only');
      }
    });
    await test('unknown anonymous tracking code returns 404', async () => {
      const code = `GS-ANON-${'FEDCBA9876543210'.repeat(2)}`;
      await json(anonymous.GET(request(`/api/complaints/anonymous/${code}`), { params: { code } }), 404);
    });

    await test('list reads do not mutate overdue SLA, status, audit or notification state', async () => {
      const overdue = await complaint({ status: 'IN_PROGRESS', escalationLevel: 0 });
      const before = {
        rows: await prisma.complaint.findMany({ orderBy: { id: 'asc' } }),
        audits: await prisma.auditLog.count(), notifications: await prisma.notification.count(),
      };
      equal((await prisma.complaint.findUniqueOrThrow({ where: { id: overdue.id } })).slaExpiresAt!.getTime() < Date.now(),
        true, 'SLA fixture is overdue before reads');
      for (const user of [undefined, owner, peer, sarpanch, water, power, assigned, unassigned]) await list(user);
      same({
        rows: await prisma.complaint.findMany({ orderBy: { id: 'asc' } }),
        audits: await prisma.auditLog.count(), notifications: await prisma.notification.count(),
      }, before, 'GET collection is read-only even for overdue reports and privileged viewers');
    });
    await test('deleted-account signed session is denied by current-account authentication and mutation handlers', async () => {
      const deleted = await account('deleted', '18', 'RESIDENT');
      const session = await cookie(deleted);
      const row = await complaint();
      await prisma.user.delete({ where: { id: deleted.id } });
      equal(await getSessionUserFromRequest(request('/api/complaints', 'GET', undefined, session)),
        null, 'deleted account no longer has a session');
      await patch(row.id, { status: 'IN_PROGRESS' }, undefined, 401, session);
      await json(collection.POST(request('/api/complaints', 'POST', createBody, session)), 401);
      await json(support.POST(request(`/api/complaints/${row.id}/support`, 'POST', undefined, session),
        { params: { id: row.id } }), 401);
    });

    report(`API RESULT: ${passedCases}/${cases} cases passed; ${passedAssertions}/${assertions} assertions passed.`);
  } finally {
    try {
      await prisma.$disconnect();
      report('API DISCONNECTED: application Prisma client');
    } finally {
      Object.assign(console, originalConsole);
      globalThis.fetch = originalFetch;
    }
  }
}

main().catch(() => {
  report('API FATAL: fixture setup or disconnect failed (details suppressed).');
  process.exitCode = 1;
});
