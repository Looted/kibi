---
id: TEST-opencode-kibi-briefing-v5
title: "OpenCode Kibi Briefings v5 Verification Plan"
status: pending
created_at: 2026-04-30T12:00:00Z
updated_at: 2026-04-30T12:00:00Z
source: documentation/tests/TEST-opencode-kibi-briefing-v5.md
priority: must
tags:
  - test
  - opencode
  - briefing
  - session-local
links:
  - type: validates
    target: SCEN-opencode-kibi-briefing-v5
---

Verification plan for Session-Local Reconcile and Semantic Dedupe:

1.  **Baseline Reset Test**: Verify that starting a new session ignores the unread brief backlog from previous sessions.
2.  **Semantic Dedupe Test**: Verify that briefings with identical normalized content (ignoring transient metadata) are suppressed within the same session.
3.  **Multi-File Fingerprint Test**: Verify that the reconciliation logic correctly combines fingerprints from all dirty session files.
4.  **TUI Delivery Regression Test**: Verify that new session-local briefs are still correctly replayed via the render-first TUI path.
5.  **Normalization Verification**: Verify that the normalization algorithm correctly handles whitespace, line endings, and timestamp variations.

### Verified By

| Test File | Description |
|-----------|-------------|
| `packages/opencode/tests/reconcile-engine.test.ts` | Session-local reconciliation and baseline logic |
| `packages/opencode/tests/semantic-dedupe.test.ts` | Normalized content hashing and suppression |
| `packages/opencode/tests/session-fingerprint.test.ts` | Multi-file fingerprint calculation |
