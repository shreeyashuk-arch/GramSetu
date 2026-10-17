import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
let current = false;
// Prisma formats its schema copy. Ignore formatting/comments, but retain entire
// quoted literals so a changed default, provider, or datasource still regenerates.
function schemaContent(text) {
  return (text.match(/"(?:\\.|[^"\\])*"|\/\/[^\r\n]*|[^\s"]/g) || [])
    .filter(token => !token.startsWith('//')).join('');
}
try {
  const source = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const generated = readFileSync(require.resolve('.prisma/client/schema.prisma'), 'utf8').replace(/\r\n/g, '\n');
  const { Prisma } = require('@prisma/client');
  current = schemaContent(source) === schemaContent(generated) &&
    Prisma.prismaVersion.client === require('@prisma/client/package.json').version;
} catch {
  // Missing or stale generated client must be generated using installed tools.
}

if (current) {
  console.log('Prisma client matches schema/version; reusing it without replacing a loaded engine.');
} else {
  const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'generate'], {
    cwd: root, stdio: 'inherit', env: process.env,
  });
  if (result.error || result.status !== 0) {
    console.error('Prisma generation failed. If Windows reports a DLL lock, stop the app using this client and retry.');
    process.exit(result.status || 1);
  }
}
