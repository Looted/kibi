---
id: TEST-vscode-kibi-briefing-v3
title: "VS Code Kibi Briefings v3 Verification Plan"
status: pending
created_at: 2026-05-06T04:48:00Z
updated_at: 2026-05-06T04:48:00Z
source: documentation/tests/TEST-vscode-kibi-briefing-v3.md
priority: must
tags:
  - test
  - vscode
  - briefing
  - deterministic-ordering
links:
  - type: validates
    target: SCEN-vscode-kibi-briefing-v3
---

Verification plan for Schema-2.0 and Deterministic Ordering in VS Code:

1. **Deterministic Selection Test**: Verify that the extension correctly sorts brief files by filename and selects the latest one regardless of `mtime`.
2. **Schema-2.0 Integration Test**: Verify that the brief editor correctly renders the `changeNarrative` array and `counts` fields from a Schema-2.0 envelope.
3. **Auto-Open Regression Test**: Verify that unread Schema-2.0 briefs are automatically opened in a document tab when detected.
4. **Filename Pattern Validation**: Verify that the extension correctly handles the `brief-YYYYMMDD-HHMMSS.json` filename pattern.

### Verified By

| Test File | Description |
|-----------|-------------|
| `packages/vscode/tests/activation/briefs.test.ts` | Activation and auto-open behavior with new schema |
| `packages/vscode/tests/brief-ordering.test.ts` | Deterministic filename-based selection logic |

