import { randomBytes, randomUUID } from 'node:crypto';
import { closeSync, existsSync, openSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const filename = `resource-regression-${randomUUID()}.db`;
const database = fileURLToPath(new URL(`../prisma/${filename}`, import.meta.url));
const env = {
  ...process.env,
  DATABASE_URL: `file:./${filename}`,
  JWT_SECRET: randomBytes(48).toString('hex'),
  GRAMSETU_API_TEST_DB: filename,
  NODE_ENV: 'test',
  NEXT_TELEMETRY_DISABLED: '1',
  PRISMA_HIDE_UPDATE_MESSAGE: '1',
};
let owned = false;
try {
  closeSync(openSync(database, 'wx', 0o600));
  owned = true;
  const push = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'db', 'push', '--skip-generate'], {
    cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8',
  });
  if (push.status !== 0) throw new Error('isolated Prisma schema setup failed');
  const fixture = spawnSync(process.execPath, [require.resolve('tsx/cli'), 'scripts/test-resource-fixture.ts'], {
    cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
  const output = `${fixture.stdout || ''}\n${fixture.stderr || ''}`;
  for (const line of output.split(/\r?\n/)) {
    if (/^RESOURCE (PASS|FAIL|RESULT|FATAL|DISCONNECTED): /.test(line)) console.log(line);
  }
  if (fixture.status !== 0) process.exitCode = fixture.status || 1;
} catch {
  console.error('Resource runner failed before fixture assertions.');
  process.exitCode = 1;
} finally {
  if (owned) {
    for (const suffix of ['', '-journal', '-shm', '-wal']) {
      const path = `${database}${suffix}`;
      if (existsSync(path)) {
        try { unlinkSync(path); } catch { process.exitCode = 1; }
      }
    }
  }
}
