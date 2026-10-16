# GramSetu — Decisions and Workflow Log

Last updated: 2026-10-16

## Goal and scope

- Deliver a reliable five-minute live demo and pitch for PS 08: connecting residents, organizations, and service providers around village needs.
- Deadline: today, as stated in this session. Team size: five; the user subsequently clarified that they built the project themselves with assistant support.
- Prioritize a complete, testable core journey over new features or technical complexity.
- Maintain this file after each implementation step, including failures and unresolved work.
- This document records work from this session; it is not a reconstruction of all earlier project development.

## Approval and safety boundaries

- The initial audit was read-only. The user has now explicitly authorized creating this workflow document.
- Application implementation was approved by the user's `approved` reply on 2026-10-16. The audit-only gate is now satisfied; destructive actions and new dependencies still require separate confirmation.
- Before each application fix: state the intended change and why it is needed.
- After each fix: record tests, lint, typecheck, and build results separately. Never label an unrun check as passed.
- Keep changes small and make focused conventional commits once implementation is authorized. Record actual commit hashes, not intended ones.
- Do not reset or delete existing data, delete features, or add dependencies without separate confirmation. Prefer hiding unfinished demo controls over deleting features.
- Do not include credentials, environment values, session tokens, raw server logs, or personal data in this file.

## Repository baseline

- Branch: `master`.
- HEAD at inspection: `72e4a26` — `feat: initial GramSetu implementation - complete rural coordination PWA`.
- The working tree already contained changes to 71 tracked files and an untracked `package-lock.json` before this document was created. These pre-existing changes are not attributed to the current audit and must be preserved.
- Stack: Next.js App Router, TypeScript, Tailwind, Prisma with SQLite, SSE, and PWA/offline support.
- A server responded at Windows `http://localhost:3000`; it was reached using Windows `node.exe` from WSL. This was an existing server, not one started by the audit.
- Prior results below describe the inspected working tree and server during this session, not a clean checkout of HEAD. Re-run them after setup or code changes; server availability is not guaranteed in a later session.

## Checks already performed

| Check | Command or method | Actual result | Limit |
| --- | --- | --- | --- |
| Standard test command | `npm test` from the repository root in Linux/WSL | FAILED before assertions: installed esbuild binary targets Windows, not Linux | Environment failure, not an assertion failure; dependencies were not changed |
| Existing test suite on Windows | `node.exe node_modules/tsx/dist/cli.mjs scripts/test-engines.ts` | PASSED: 25/25 assertions | Engine/helper examples only; not full API or browser coverage |
| Existing suite via TypeScript transpilation | One-off inline Node runner using installed TypeScript and the original `scripts/test-engines.ts` | PASSED: 25/25 assertions | Same suite, not 25 additional distinct tests; runner was not saved |
| Typecheck | `node node_modules/typescript/bin/tsc --noEmit --incremental false` | PASSED with no diagnostics | Does not establish runtime or production-build correctness |
| Live API smoke checks | One-off Windows Node fetch runner against `http://localhost:3000` | 2 passed, 14 failed | No persistent mutations requested; no browser interaction; runner was not saved |
| Isolated route-handler regression checks | One-off inline Node runner; actual handlers and JWT helpers, in-memory Prisma fixtures | 5 passed, 7 failed | Mutations confined to memory; not SQLite or network E2E; runner was not saved |
| Extra scoring edge cases | One-off inline Node runner against `src/lib/priority.ts` and `src/lib/matching.ts` | 3 failed | Synthetic inputs; runner was not saved |
| Database preflight | Windows Node: instantiate Prisma, call `village.count()`, then disconnect | FAILED: `PrismaClientInitializationError`; `DATABASE_URL` missing or invalid | Separate CLI process; does not establish the running server's exact environment or error |
| Lint | Inspected `package.json` scripts | MISSING: no lint script configured | No lint pass claimed; no lint dependency installed |
| Production build | Not run | NOT RUN during read-only audit | Build emits artifacts; verify once implementation/setup is authorized |
| Browser/mobile/offline | Code inspection only | NOT VERIFIED end to end | Requires real browser, permissions, IndexedDB, and reconnect tests |

### Live API observations

- Passed: guest `/api/auth/me` response and the initial `/api/events` SSE connection frame. Neither establishes that database-backed features work.
- Failed with HTTP 500: all four demo-role logins; board reads for English, Hindi, and Marathi; the resource catalog; vehicle, facility, and equipment filters; analytics; and SOS reads.
- Unknown anonymous tracking code returned HTTP 500 rather than the expected 404.
- No live complaint, post, resource request, or SOS record was created or modified by these tests.
- The live complaint-list GET was deliberately not used: it updates overdue complaint status on read (`src/app/api/complaints/route.ts:80–92`).

### Limits of existing test claims

- The 25 existing assertions really passed on Windows, but they do not prove department isolation, anonymous privacy, or a usable end-to-end demo.
- The existing walkthrough script performs persistent mutations and prints offline success statements without executing offline tests (`scripts/test-live-e2e.ts:128–134`). It was inspected, not executed.
- The full repository audit originally requested is not complete; work was narrowed to urgent feature testing after the deadline was clarified.

## Prioritized issues and acceptance criteria

All issues below are open unless a later change entry explicitly records a verified fix.

| ID | Priority | Issue and evidence | Acceptance criterion |
| --- | --- | --- | --- |
| DB-01 | MUST | Database-backed APIs return 500; CLI Prisma initialization reports missing/invalid configuration. `prisma/schema.prisma:1–4` requires a database URL. | A separately initialized demo database supports all four demo logins, board, resources, and analytics without resetting another database. |
| CMP-01 | MUST | Fresh complaints become `VERIFIED`, but the UI only exposes proof submission from `IN_PROGRESS`. `src/app/api/complaints/route.ts:283`; `src/app/complaints/track/page.tsx:390–400`. | A newly filed complaint completes start-work, proof, and resident verification through the UI. |
| SEC-01 | MUST | Complaint PATCH and resource-request actions lack authorization. Isolated tests accepted guest and wrong-department writes. | Guest, wrong-village, wrong-department, and unassigned-provider mutations fail without changing data. |
| PRIV-01 | MUST | Public complaint detail exposes exact location/contact data; anonymous creation links the session in audit logs. | Public responses are explicitly sanitized; anonymous entries and their audits retain no account link; confidential content is not publicly broadcast. |
| MAT-01 | MUST | Cross-category matching can rank a tractor above an ambulance for a vehicle request. `src/lib/matching.ts:98–103,142–150`. | Incompatible categories are excluded before scoring; no compatible supply produces a pending request. |
| MAT-02 | MUST | Zero trust defaults to full trust; repeated vulnerabilities inflate priority. `src/lib/matching.ts:106`; `src/lib/priority.ts:41–44`. | Zero trust remains zero and duplicate vulnerability entries have no additional effect. |
| UI-01 | MUST | Resource-listing button sets state but renders no form. `src/app/resources/page.tsx:42–50,163–169,359–471`. | Complete the existing flow or hide the unfinished control without deleting its feature code. |
| OFF-01 | MUST | Resource requests do not enqueue; queued SOS is displayed as transmitted. | Resource requests can be stored for replay and queued SOS explicitly says it has not been delivered. |
| OFF-02 | SHOULD | Queue count is stale, overlapping sync can duplicate writes, and replay is not bound to the submitting account. | Queue count updates, same-page sync is single-flight, and account-bound entries are not replayed as another user. |
| DOC-01 | MUST | README overstates end-to-end testing, anonymity, and compliance. | Documentation distinguishes implemented, tested, unverified, and prototype-only claims. |

## Decisions

- D-001: Preserve all pre-existing working-tree changes. A whitespace-insensitive diff inspection found no substantive tracked-file differences at implementation start; avoid incidental line-ending rewrites when making focused changes.
- D-002: Use the existing Windows dependency installation for native-tool checks. Do not reinstall dependencies merely to make the WSL shell work.
- D-003: Restore database startup first, then complaint/access/privacy, then resource matching/actions, then offline/demo hardening. Do not expand chatbot, schemes, maps, or deployment scope today.
- D-004: Prefer a separate local demo database and non-destructive setup. The current seed deletes records at `prisma/seed.ts:9–21`; never run it blindly against an existing database.
- D-005: Keep security and lifecycle changes aligned between server handlers and UI. Passing engine tests is not sufficient acceptance evidence.
- D-006: Two bounded read-only implementation investigations were completed: one for complaint/auth/privacy/SOS, one for resources/scoring/offline. Neither agent edited files; their findings informed the issue list and next steps.

## Change log

### C-001 — Workflow record and implementation approval

- Status: documentation updated; no application fix completed yet; not committed.
- Changed: `decision.md` — captured scope, safety boundaries, baseline checks, issues, approval, and decisions.
- Preserved: pre-existing source changes and `package-lock.json`; no dependencies or database records changed.
- Checks: re-read the document after writing; inspect the final documentation diff. Application tests/build/lint are not rerun for this documentation-only entry.
- Initial commit blocker resolved: the user supplied a name and email; Git identity was configured locally in this repository only. No remote was added and nothing was pushed.

### C-002 — DB-01: safe demo initialization and verified startup

- Status: implemented and verified; committed as `3f523bd` (`fix: initialize demo database without resetting existing data`).
- Cause: the workspace had no usable local database configuration or initialized SQLite schema/data.
- Changed: `scripts/setup-demo.mjs`, `package.json`, `prisma/seed.ts`, `.gitignore`, `next.config.mjs`, `tsconfig.json`, `README.md`, `scripts/test-smoke.mjs`.
- Setup creates ignored local configuration with a random secret and a separate demo database, preserves existing configuration, refuses destructive schema flags, and skips seeding populated databases. Reset behavior is retained behind explicit opt-in but is never enabled by setup.
- Production verification uses `.next-build` via `GRAMSETU_DIST_DIR`, leaving the existing dev server's `.next` output intact. Next added the alternate generated-types directory to `tsconfig.json`.
- `node.exe scripts/setup-demo.mjs`: PASSED twice; the second run left existing data unchanged. Verified counts: 2 villages, 41 users, 63 complaints, 12 resources.
- `git check-ignore .env prisma/gramsetu-demo.db`: PASSED; configuration and data are ignored and will not be committed.
- Tests: `cmd.exe /d /c "npm test"` PASSED 25/25; `node.exe scripts/test-smoke.mjs` PASSED 14/14 against the existing Windows server on port 3000, including four role sessions, board languages, resource categories, analytics, and unknown-code handling.
- Typecheck: `node.exe node_modules/typescript/bin/tsc --noEmit --incremental false` PASSED.
- Lint: `cmd.exe /d /c "npm run lint"` FAILED because no lint script/dependency is configured. No lint pass is claimed; no dependency was added.
- Build: `cmd.exe /d /c "set GRAMSETU_DIST_DIR=.next-build&& npm run build"` PASSED; all routes compiled and production pages generated.
- Remaining: successful smoke reads do not establish secure mutations or browser/offline behavior; the other MUST issues remain open.

### C-003 — CMP-01 and complaint portions of SEC-01/PRIV-01

- Status: implemented and verified; awaiting focused commit. Resource/SOS security and offline issues remain open.
- Changed: complaint collection/detail/support/tracking routes; `src/lib/auth.ts`, `src/lib/complaint-access.ts`, `src/lib/complaint-update.ts`, `src/lib/spam-filter.ts`; tracker, anonymous page, Header, and DemoBar; new access/API regression scripts; `package.json`; `scripts/ensure-prisma.mjs`.
- Complaint actions now require a current account, matching village/department/assignment, one valid action, legal status transitions, and proof for resolution. Only the recorded filer can confirm a resolved report; guarded transactional updates reject stale/replayed changes.
- The tracker exposes authorized start-work/proof/confirmation controls, shows action failures, and refreshes after SSE/reconnect. Demo role switching reloads client identity instead of leaving stale role-specific state.
- Standard list/detail responses use an allowlist, hide anonymous reports from public/peer views, coarsen public GPS, and omit tracking secrets/proxy/audit identities. Anonymous creation removes account/proxy audit linkage, uses cryptographic tracking codes, and broadcasts minimal invalidation only.
- Support requires authentication and is idempotent. Duplicate support is transactional; list GET no longer escalates or modifies records as a side effect. The proof feed selects resident-confirmed closed reports.
- JWT secrets no longer use a known fallback; request sessions reload current account authority and reject deleted accounts. Rate-limit hashes use a process-random salt with bounded expiring in-memory entries. Privacy copy no longer guarantees absolute anonymity.
- Tests: `cmd.exe /d /c "npm test"` PASSED: 25 engine assertions, 65 access-policy cases, 57 SQLite-backed handler cases with 245 assertions. Four cross-action-field regressions initially failed, then passed after action-specific field validation.
- Test isolation: `scripts/test-api.mjs` exclusively creates a UUID-named database, disconnects, and removes only its own fixture file; it never points tests at the populated demo database.
- Typecheck: `node.exe node_modules/typescript/bin/tsc --noEmit --incremental false` PASSED. Live smoke: `node.exe scripts/test-smoke.mjs` PASSED 14/14.
- Lint: `cmd.exe /d /c "npm run lint"` remains unavailable (missing script); no dependency added.
- Build: original generation failed on a Windows DLL lock. Added schema/version-aware client reuse in `scripts/ensure-prisma.mjs`; a first byte-comparison retry also failed because Prisma formats its schema copy. Token-aware comparison preserving quoted values fixed that check. Final `cmd.exe /d /c "set GRAMSETU_DIST_DIR=.next-build&& npm run build"` PASSED without stopping the dev server.
- Browser limitation: UI compiled successfully but actual mobile clicks, microphone/GPS permissions, IndexedDB, and reconnect behavior are not yet browser-verified. Demo auth/OTP bypass hardening, sensitive SOS delivery, and resource-action protection remain to be addressed.

### C-004 — MAT-01/MAT-02 and resource request workflow

- Status: implemented and verified; awaiting focused commit. Offline queue/SOS and OTP/demo-auth hardening remain open.
- Changed: resource request GET/POST/PATCH routes, resource page, TopTicker, package test scripts, and isolated resource test wrapper/fixture. Existing matching/priority helpers are included in the resource scoring slice because their working-tree fixes are now covered by regression tests.
- Matching now filters by exact resource category before ranking, clamps finite trust scores without turning `0` into `1`, deduplicates known vulnerability groups before priority calculation, validates request category/date/location/duration/urgency/zone, and leaves no-compatible-resource requests pending rather than matching an incompatible listing.
- Request reads/writes require a current authenticated resident/Sarpanch or provider session. Queries are village-scoped; residents see their own requests, providers see only requests assigned to them, and provider actions require the current matched provider.
- Provider transitions are guarded and conditional: `MATCHED -> ACCEPTED`, `MATCHED -> DECLINE/rematch or PENDING`, and `ACCEPTED -> COMPLETED`. Declined providers are excluded, next-provider notifications are written transactionally, and SSE sends minimal update events after commit.
- The UI now restricts actions to the assigned provider, exposes completion, reports API errors, handles zero matches honestly, includes `HUMAN_RESOURCES`, refreshes on resource SSE events, and hides the unfinished listing button behind `SHOW_RESOURCE_LISTING = false` without deleting the server listing code.
- Resource regression: `node.exe scripts/test-resource.mjs` PASSED 9/9 cases and 29/29 assertions using an exclusively created and removed SQLite database. It covers guest/foreign access, invalid input, category filtering, match/accept/complete, decline/rematch/notification, pending no-match, and scoring edges.
- Full tests: `cmd.exe /d /c "npm test"` PASSED: 25 engine assertions, 65 access-policy cases, 57 API cases/245 assertions, and 9 resource cases/29 assertions.
- Typecheck: `node.exe node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false` PASSED.
- Build: `cmd.exe /d /c "set GRAMSETU_DIST_DIR=.next-build&& npm run build"` PASSED; Prisma client was reused safely while the dev server was active.
- Lint: `cmd.exe /d /c "npm run lint"` remains unavailable because no lint script is configured. No dependency was added.

## Rules for subsequent change entries

For each fix, append its issue ID, cause, changed paths, behavior change, exact test/lint/typecheck/build commands and outcomes, remaining limitations, and successful commit hash. Mark work completed only after the relevant check actually passes; otherwise record the blocker and next step.

## Next action

Commit C-004 using only its intended changes, then fix offline queue/SOS delivery wording and synchronization. Keep the populated demo database intact and use isolated fixtures for regression writes.
