---
id: TEST-opencode-kibi-briefing-v6
title: "OpenCode Kibi Briefings v6 Verification Plan"
status: closed
created_at: 2026-05-06T04:38:00Z
updated_at: 2026-05-06T04:38:00Z
source: documentation/tests/TEST-opencode-kibi-briefing-v6.md
priority: must
tags:
  - test
  - opencode
  - briefing
  - schema-2.0
links:
  - type: validates
    target: SCEN-opencode-kibi-briefing-v6
---

Verification plan for Schema-2.0 and Session-Delta migration:

1. **Schema Validation Test**: Verify that generated briefing envelopes strictly follow the Schema-2.0 structure (counts, changes, changeNarrative, schemaVersion).
2. **Session-Delta Accuracy Test**: Verify that entities added, modified, or removed during a session are correctly identified and counted against the session-start baseline.
3. **Relationship Delta Test**: Verify that link changes are captured in the `relationshipsChanged` count and `changes.relationships.changed` list.
4. **Narrative Ordering Test**: Verify that `changeNarrative` prioritize MCP-cited entities over audited side-effects.
5. **Legacy Suppression Test**: Verify that legacy flat count fields (e.g., `requirementsAdded`) are absent from Schema-2.0 briefs.

### Verified By

| Test File | Description |
|-----------|-------------|
| `packages/opencode/tests/briefing-auto-render.test.ts` | End-to-end briefing generation and schema compliance |
| `packages/opencode/tests/reconcile-engine.test.ts` | Session-delta logic and baseline reconciliation |
| `packages/opencode/tests/narrative-priority.test.ts` | Cited-first narrative ordering logic |
