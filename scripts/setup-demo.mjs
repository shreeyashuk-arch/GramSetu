import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const envFile = new URL('../.env', import.meta.url);

// Exclusive creation preserves existing configuration and never prints secrets.
if (!existsSync(envFile)) {
  writeFileSync(envFile, [
    '# Local demo configuration. Never commit this file.',
    'DATABASE_URL="file:./gramsetu-demo.db"',
    `JWT_SECRET="${randomBytes(32).toString('hex')}"`,
    'NEXT_PUBLIC_DEMO_MODE="true"',
    'NEXT_PUBLIC_MAPS_API_KEY=""',
    'NEXT_PUBLIC_CHATBOT_URL=""',
    '',
  ].join('\n'), { flag: 'wx', mode: 0o600 });
  console.log('Created ignored local demo configuration with a random session secret.');
} else {
  console.log('Preserving existing local configuration.');
}

const { loadEnvConfig } = require('@next/env');
loadEnvConfig(root, true);
if (!process.env.DATABASE_URL?.startsWith('file:')) {
  throw new Error('Demo setup requires a configured SQLite file database. Existing configuration was not changed.');
}

function run(module, args) {
  const result = spawnSync(process.execPath, [require.resolve(module), ...args], {
    cwd: root,
    env: { ...process.env, GRAMSETU_ALLOW_SEED_RESET: 'false' },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// No reset, force-reset, or accept-data-loss flags are permitted here.
run('prisma/build/index.js', ['db', 'push', '--skip-generate']);
run('tsx/cli', ['prisma/seed.ts']);
console.log('Demo setup complete. Start with npm run dev; existing populated data was preserved.');
