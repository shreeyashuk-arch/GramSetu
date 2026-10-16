import assert from 'node:assert/strict';

const base = process.env.BASE_URL || 'http://localhost:3000';
let failed = 0;
let passed = 0;

async function json(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  return { response, data };
}

async function test(name, run) {
  try {
    await run();
    console.log(`PASS ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    failed++;
  }
}

console.log(`Read-only database/API smoke checks against ${base}. Login cookies stay in memory.`);
await test('Guest session', async () => {
  const { data } = await json('/api/auth/me');
  assert.equal(data.user, null);
});

for (const role of ['RESIDENT', 'SARPANCH', 'ORGANIZATION', 'PROVIDER']) {
  await test(`${role} demo login and session`, async () => {
    const { response, data } = await json('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    assert.equal(data.user?.role, role);
    const cookie = response.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie, 'Missing session cookie');
    const session = await json('/api/auth/me', { headers: { Cookie: cookie } });
    assert.equal(session.data.user?.role, role);
  });
}

for (const lang of ['en', 'hi', 'mr']) {
  await test(`Village board: ${lang}`, async () => {
    const { data } = await json(`/api/posts?lang=${lang}`);
    assert.ok(data.posts.length > 0);
    assert.ok(data.posts.every(post => typeof post.displayTitle === 'string'));
  });
}

for (const category of ['ALL', 'VEHICLES', 'FACILITIES', 'EQUIPMENT']) {
  await test(`Resource catalog: ${category}`, async () => {
    const { data } = await json(`/api/resources?category=${category}`);
    assert.ok(data.resources.length > 0);
    assert.ok(data.resources.every(resource => category === 'ALL' || resource.category === category));
  });
}

await test('Analytics has seeded complaints', async () => {
  const { data } = await json('/api/analytics');
  assert.ok(data.summary.totalComplaints > 0);
});

await test('Unknown anonymous tracking code is 404', async () => {
  const response = await fetch(`${base}/api/complaints/anonymous/GS-AUDIT-NONEXISTENT`, {
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, 404);
});

console.log(`Smoke results: ${passed} passed, ${failed} failed.`);
if (failed) process.exitCode = 1;
