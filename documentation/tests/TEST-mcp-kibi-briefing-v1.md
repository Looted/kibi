---
id: TEST-mcp-kibi-briefing-v1
title: "MCP-Owned Kibi Briefings v1 Automated Verification"
status: passing
created_at: 2026-04-20T00:00:00Z
updated_at: 2026-04-24T09:15:00Z
source: documentation/tests/TEST-mcp-kibi-briefing-v1.md
priority: must
tags:
  - test
  - mcp
  - briefing
  - start-task
links:
  - type: validates
    target: SCEN-mcp-kibi-briefing-v1
---

Automated verification for the MCP-owned Kibi Briefings v1 contract includes:

1. **Tool Registration Test**: Verify that `kb_briefing_generate` is registered on the public MCP surface with the documented input fields.
2. **Input Validation Test**: Verify that requests fail clearly when `taskText`, `sourceFiles`, and `seedIds` are all empty after normalization.
3. **Read-Only Guarantee Test**: Verify that `kb_briefing_generate` does not modify `.kb/`, documentation files, or any other workspace files.
4. **Determinism Test**: Verify that repeated calls with identical normalized inputs and identical workspace state return byte-stable ordering and briefing content.
5. **Ready-Path Test**: Verify that authoritative, fresh evidence returns cited briefing output suitable for start-task use.
6. **Fail-Closed Test**: Verify that stale, dirty, unsupported, or weak-evidence conditions return `briefingState: "no_briefing"` with no speculative output.
7. **Citation Omission Test**: Verify that uncited constraints or regression-risk statements are omitted rather than fabricated.
### Verified By
| Test File | Description |
|-----------|-------------|
| `packages/mcp/tests/tools/briefing-generate.test.ts` | Deterministic briefing generation tool logic |
| `packages/mcp/tests/server/tools-coverage.test.ts` | MCP tool surface registration and coverage |
