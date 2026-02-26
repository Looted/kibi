---
id: FACT-011
title: Test suite has flaky integration tests
status: active
created_at: 2026-02-25T16:30:00Z
updated_at: 2026-02-25T16:30:00Z
source: bun test output and analysis
tags:
  - testing
  - flakiness
  - test-pollution
---

The kibi test suite has flaky integration tests that fail when run together but pass when run in isolation:

**Passing in isolation:**
- `gc.test.ts` (4 pass, 0 fail)
- `crud.test.ts` (7 pass, 0 fail)
- `idempotency.test.ts` (10 pass, 0 fail)
- `check.test.ts` (8 pass, 0 fail)

**Failing in full suite:**
- `server.test.js` - multiple timeout errors (5 second timeout insufficient)
- `stdio-protocol.test.js` - timeout errors
- `branch.test.ts` - execSync errors (test pollution from git state)
- `crud.test.ts` - timeout errors in full suite
- `check.test.ts` - timeout errors in full suite

**Root causes:**
1. Test pollution - tests share state (git branches, KB paths) when run together
2. Timeout issues - 5 second timeout insufficient for Prolog initialization in server tests
3. Process startup time - MCP server takes time to start

**Fix applied:**
- `gc.test.ts` - added `.kb/branches/keep-branch` directory creation to match git state

**Remaining issues:**
- Server/stdio tests need longer timeout or better cleanup
- Branch tests need better git state isolation
