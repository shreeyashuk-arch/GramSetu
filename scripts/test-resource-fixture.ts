import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

let assertions = 0;
let cases = 0;
let passedAssertions = 0;
let passedCases = 0;
let lastLabel = '';
const report = (line: string) => process.stdout.write(`${line}\n`);

function ok(value: unknown, label: string): asserts value {
  assertions++; lastLabel = label; assert.ok(value, label); passedAssertions++;
}
function equal(actual: unknown, expected: unknown, label: string) {
  assertions++; lastLabel = label; assert.equal(actual, expected, label); passedAssertions++;
}
async function test(name: string, fn: () => Promise<void>) {
  cases++;
  try { await fn(); passedCases++; report(`RESOURCE PASS: ${name}`); }
  catch (error) { report(`RESOURCE FAIL: ${name}: ${error instanceof assert.AssertionError ? lastLabel : 'fixture exception'}`); process.exitCode = 1; }
}

async function main() {
  const filename = process.env.GRAMSETU_API_TEST_DB;
  if (!filename?.startsWith('resource-regression-') || process.env.DATABASE_URL !== `file:./${filename}`) {
    throw new Error('Use the isolated resource wrapper');
  }
  const original = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = () => {};
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('network disabled'); };
  const { prisma } = await import('../src/lib/prisma');
  try {
    const { signToken, COOKIE_NAME } = await import('../src/lib/auth');
    const collection = await import('../src/app/api/resources/requests/route');
    const detail = await import('../src/app/api/resources/requests/[id]/route');
    const matching = await import('../src/lib/matching');

    const villageA = await prisma.village.create({ data: {
      id: 'resource-village-a', name: 'Resource Village A', block: 'Block', district: 'District', state: 'State', lat: 18.3164, lng: 73.8682,
    }});
    const villageB = await prisma.village.create({ data: {
      id: 'resource-village-b', name: 'Resource Village B', block: 'Block', district: 'District', state: 'State', lat: 19.3164, lng: 74.8682,
    }});
    const resident = await prisma.user.create({ data: { id: 'resource-resident', phone: '9000000001', name: 'Resident', role: 'RESIDENT', villageId: villageA.id, isVerified: true }});
    const providerA = await prisma.user.create({ data: { id: 'resource-provider-a', phone: '9000000002', name: 'Provider A', role: 'PROVIDER', providerCategory: 'TRACTOR_OWNER', villageId: villageA.id, isVerified: true, trustScore: 0.9 }});
    const providerB = await prisma.user.create({ data: { id: 'resource-provider-b', phone: '9000000003', name: 'Provider B', role: 'PROVIDER', providerCategory: 'TRACTOR_OWNER', villageId: villageA.id, isVerified: true, trustScore: 0.8 }});
    const foreignProvider = await prisma.user.create({ data: { id: 'resource-provider-x', phone: '9000000004', name: 'Foreign Provider', role: 'PROVIDER', providerCategory: 'TRACTOR_OWNER', villageId: villageB.id, isVerified: true, trustScore: 1 }});
    const tractorA = await prisma.resource.create({ data: { id: 'resource-tractor-a', villageId: villageA.id, ownerId: providerA.id, category: 'EQUIPMENT', name: 'Tractor A', description: 'Verified tractor', contactPhone: providerA.phone, lat: villageA.lat, lng: villageA.lng, availabilitySlots: '24x7 Emergency' }});
    await prisma.resource.create({ data: { id: 'resource-tractor-b', villageId: villageA.id, ownerId: providerB.id, category: 'EQUIPMENT', name: 'Tractor B', description: 'Second verified tractor', contactPhone: providerB.phone, lat: villageA.lat + 0.01, lng: villageA.lng + 0.01, availabilitySlots: 'Daytime' }});
    await prisma.resource.create({ data: { id: 'resource-vehicle-x', villageId: villageA.id, ownerId: providerB.id, category: 'VEHICLES', name: 'Tanker', description: 'Water tanker', contactPhone: providerB.phone, lat: villageA.lat, lng: villageA.lng }});
    await prisma.resource.create({ data: { id: 'resource-foreign', villageId: villageB.id, ownerId: foreignProvider.id, category: 'EQUIPMENT', name: 'Foreign Tractor', description: 'Other village tractor', contactPhone: foreignProvider.phone, lat: villageB.lat, lng: villageB.lng }});

    const users = { resident, providerA, providerB, foreignProvider };
    async function request(path: string, method = 'GET', body?: unknown, user?: typeof resident) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user) headers.Cookie = `${COOKIE_NAME}=${await signToken({ userId: user.id, phone: user.phone, name: user.name, role: user.role as any, villageId: user.villageId })}`;
      return collection[method === 'POST' ? 'POST' : 'GET'](new NextRequest(`http://fixture${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));
    }
    async function patch(id: string, action: string, user: typeof resident) {
      return detail.PATCH(new NextRequest(`http://fixture/api/resources/requests/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: `${COOKIE_NAME}=${await signToken({ userId: user.id, phone: user.phone, name: user.name, role: user.role as any, villageId: user.villageId })}` }, body: JSON.stringify({ action }),
      }), { params: { id } });
    }

    await test('guest request list is denied', async () => {
      const response = await request('/api/resources/requests');
      equal(response.status, 401, 'guest request list must require authentication');
    });
    await test('invalid category and date are rejected', async () => {
      const invalidCategory = await request('/api/resources/requests', 'POST', { category: 'WRONG', title: 'Need a thing', description: 'This is long enough.' }, resident);
      equal(invalidCategory.status, 400, 'invalid category');
      const invalidDate = await request('/api/resources/requests', 'POST', { category: 'EQUIPMENT', title: 'Need a tractor', description: 'This is long enough.', neededAt: 'not-a-date' }, resident);
      equal(invalidDate.status, 400, 'invalid date');
    });
    await test('category matching excludes incompatible resources', async () => {
      const ranked = matching.rankMatchingResources([
        { id: 't', name: 'Tractor', category: 'EQUIPMENT', priceType: 'FREE', contactPhone: '1', lat: 18.3164, lng: 73.8682, owner: { id: 'p', name: 'P', trustScore: 1, isVerified: true } },
        { id: 'v', name: 'Vehicle', category: 'VEHICLES', priceType: 'FREE', contactPhone: '2', lat: 18.3164, lng: 73.8682, owner: { id: 'p', name: 'P', trustScore: 1, isVerified: true } },
      ], { category: 'EQUIPMENT', title: 'Need tractor', neededAt: new Date(), durationHours: 2, urgency: 'HIGH', lat: 18.3164, lng: 73.8682 });
      equal(ranked.length, 1, 'only compatible resource is ranked');
      equal(ranked[0].resource.id, 't', 'tractor is selected');
    });
    await test('resident request is matched and visible only to its owner/provider', async () => {
      const response = await request('/api/resources/requests', 'POST', { category: 'EQUIPMENT', title: 'Need tractor for field', description: 'Need a tractor for field preparation tomorrow.', urgency: 'HIGH', lat: villageA.lat, lng: villageA.lng }, resident);
      equal(response.status, 200, 'request creation succeeds');
      const body = await response.json();
      equal(body.request.status, 'MATCHED', 'request is matched');
      equal(body.request.matchedProviderId, providerA.id, 'best provider is selected');
      ok(body.topMatches.length > 0, 'top matches returned');
      const residentList = await request('/api/resources/requests', 'GET', undefined, resident);
      equal((await residentList.json()).requests.length, 1, 'resident sees own request');
      const providerList = await request('/api/resources/requests', 'GET', undefined, providerA);
      equal((await providerList.json()).requests.length, 1, 'matched provider sees request');
      const otherList = await request('/api/resources/requests', 'GET', undefined, providerB);
      equal((await otherList.json()).requests.length, 0, 'unmatched provider does not see request');
    });
    await test('only matched provider can accept and complete', async () => {
      const requestRow = await prisma.resourceRequest.findFirstOrThrow({ where: { requesterId: resident.id, status: 'MATCHED' } });
      equal((await patch(requestRow.id, 'ACCEPT', foreignProvider)).status, 403, 'foreign provider denied');
      equal((await patch(requestRow.id, 'ACCEPT', providerB)).status, 403, 'unmatched provider denied');
      equal((await patch(requestRow.id, 'ACCEPT', providerA)).status, 200, 'matched provider accepts');
      equal((await patch(requestRow.id, 'COMPLETE', providerA)).status, 200, 'accepted provider completes');
      equal((await patch(requestRow.id, 'COMPLETE', providerA)).status, 409, 'completed request cannot be replayed');
    });
    await test('decline rematches and notifies next provider', async () => {
      const createResponse = await request('/api/resources/requests', 'POST', { category: 'EQUIPMENT', title: 'Need second tractor', description: 'Need another tractor for field work this week.' }, resident);
      const created = await createResponse.json();
      const requestId = created.request.id;
      equal((await patch(requestId, 'DECLINE', providerA)).status, 200, 'first provider declines');
      const rematched = await prisma.resourceRequest.findUniqueOrThrow({ where: { id: requestId } });
      equal(rematched.status, 'MATCHED', 'request remains matched after decline');
      equal(rematched.matchedProviderId, providerB.id, 'next compatible provider receives request');
      equal((await patch(requestId, 'ACCEPT', providerA)).status, 403, 'declined provider cannot accept again');
      equal((await patch(requestId, 'ACCEPT', providerB)).status, 200, 'next provider accepts');
      const notification = await prisma.notification.findFirst({ where: { recipientId: providerB.id, type: 'ASSIGNMENT' } });
      ok(notification, 'next provider receives assignment notification');
    });
    await test('no compatible resource remains pending', async () => {
      const response = await request('/api/resources/requests', 'POST', { category: 'FACILITIES', title: 'Need a community shelter', description: 'No shelter is currently listed for this village.' }, resident);
      const body = await response.json();
      equal(response.status, 200, 'pending request creation succeeds');
      equal(body.request.status, 'PENDING', 'no-match request remains pending');
      equal(body.topMatches.length, 0, 'no incompatible fallback is returned');
    });
    await test('cross-village zone is rejected', async () => {
      const zone = await prisma.zone.create({ data: { id: 'resource-zone-b', villageId: villageB.id, name: 'Other Zone', code: 'OB' } });
      const response = await request('/api/resources/requests', 'POST', { category: 'EQUIPMENT', title: 'Wrong village zone', description: 'This request points to another village zone.', zoneId: zone.id }, resident);
      equal(response.status, 400, 'foreign zone rejected');
    });
    await test('engine handles trust zero and duplicate vulnerabilities', async () => {
      const zeroTrust = matching.scoreResourceMatch({ id: 'z', name: 'Zero', category: 'EQUIPMENT', priceType: 'FREE', contactPhone: '1', lat: 18.3164, lng: 73.8682, owner: { id: 'z', name: 'Z', trustScore: 0, isVerified: false } }, { category: 'EQUIPMENT', title: 'x', neededAt: new Date(), durationHours: 1, urgency: 'LOW', lat: 18.3164, lng: 73.8682 });
      equal(zeroTrust.breakdown.reliabilityScore, 0, 'trust zero remains zero');
      const { calculatePriority } = await import('../src/lib/priority');
      equal(calculatePriority({ urgency: 3, peopleAffected: 2, vulnerabilities: ['elderly'], timeSensitivity: 3 }).score,
        calculatePriority({ urgency: 3, peopleAffected: 2, vulnerabilities: ['elderly', 'elderly'], timeSensitivity: 3 }).score,
        'duplicate vulnerabilities do not inflate score');
    });

    report(`RESOURCE RESULT: ${passedCases}/${cases} cases passed; ${passedAssertions}/${assertions} assertions passed.`);
    if (passedCases !== cases || passedAssertions !== assertions) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    console.log = original.log; console.warn = original.warn; console.error = original.error;
    globalThis.fetch = originalFetch;
    report('RESOURCE DISCONNECTED: application Prisma client');
  }
}

main().catch(error => {
  report(`RESOURCE FATAL: ${error instanceof Error ? error.message : 'fixture setup failed'}`);
  process.exitCode = 1;
});
