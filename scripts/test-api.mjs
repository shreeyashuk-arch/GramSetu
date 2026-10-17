// Run with the Node installation matching node_modules (here: node.exe).
// No server, seed/reset command, generated client, or existing database is used.
import { randomBytes, randomUUID } from 'node:crypto';
import { closeSync, openSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const filename = `regression-${randomUUID()}.db`;
const database = fileURLToPath(new URL(`../prisma/${filename}`, import.meta.url));
const env = {
  ...process.env,
  DATABASE_URL: `file:./${filename}`,
  JWT_SECRET: randomBytes(48).toString('hex'),
  GRAMSETU_API_TEST_DB: filename,
  NODE_ENV: 'test',
  NEXT_TELEMETRY_DISABLED: '1',
  CHECKPOINT_DISABLE: '1',
  PRISMA_HIDE_UPDATE_MESSAGE: '1',
};
let owned = false;

function run(module, args, showFixtureOutput = false) {
  // Synchronous children have exited before finally can unlink the database.
  // The fixture also awaits the actual application's Prisma $disconnect().
  const result = spawnSync(process.execPath, [require.resolve(module), ...args], {
    cwd: root,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 8 * 1024 * 1024,
  });
  if (showFixtureOutput) {
    // Only replay our controlled report lines, never application error objects,
    // stack traces, environment variables, JWTs, or raw HTTP/database bodies.
    const report = `${result.stdout || ''}\n${result.stderr || ''}`;
    for (const line of report.split(/\r?\n/)) {
      if (/^API (PASS|FAIL|RESULT|FATAL|DISCONNECTED): /.test(line)) console.log(line);
    }
  }
  if (result.error || result.status !== 0) {
    const phase = showFixtureOutput ? 'fixture' : 'Prisma db push --skip-generate';
    console.error(`API runner: ${phase} failed (exit ${result.status ?? 'unavailable'}).`);
    process.exitCode = result.status && result.status > 0 ? result.status : 1;
    return false;
  }
  return true;
}

try {
  // Exclusive creation claims ONLY this UUID path. A collision never becomes
  // owned, and therefore can never be passed to Prisma or removed by cleanup.
  closeSync(openSync(database, 'wx', 0o600));
  owned = true;
  console.log(`API runner: isolated prisma/${filename}`);
  if (run('prisma/build/index.js', ['db', 'push', '--skip-generate'])) {
    run('tsx/cli', ['scripts/test-api-fixture.ts'], true);
  }
} catch {
  console.error('API runner: setup or installed-tool launch failed.');
  process.exitCode = 1;
} finally {
  if (owned) {
    // Exact path only: no glob, recursive removal, reset, or unrelated sidecars.
    let removed = false;
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        unlinkSync(database);
        removed = true;
        break;
      } catch (error) {
        if (error.code === 'ENOENT') {
          removed = true;
          break;
        }
        if (!['EBUSY', 'EPERM'].includes(error.code)) break;
        await delay(100 * (attempt + 1));
      }
    }
    if (removed) console.log('API runner: own test database removed after child exit.');
    else {
      console.error(`API runner: cleanup failed for prisma/${filename}.`);
      process.exitCode = 1;
    }
  }
}
