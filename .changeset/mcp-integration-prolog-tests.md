---
"kibi-mcp": patch
---

MCP integration tests that exercise kb.pl directly now reuse one persistent SWI-Prolog session instead of spawning a new process on every query under Bun. That cuts wall-clock time for the heaviest suites (for example `check.test.ts`) without changing test semantics.

- Add `packages/mcp/tests/helpers/integration-prolog.ts` with `startIntegrationProlog` / `stopIntegrationProlog` helpers.
- Migrate check, CRUD, upsert, and transaction-integrity integration tests to the shared-session fixture.
