---
id: TEST-opencode-kibi-briefing-v3
title: "OpenCode Kibi Briefings v3 Verification"
status: pending
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
source: documentation/tests/TEST-opencode-kibi-briefing-v3.md
priority: must
tags:
  - test
  - opencode
  - briefing
  - reconcile
links:
  - type: validates
    target: SCEN-opencode-kibi-briefing-v3
---

Verification plan for the Session-Local Reconcile briefing architecture:

1.  **Current-Session Coverage Test**: Verify that the briefing generator correctly includes all dirty files in the **current-session** fingerprinting logic.
2.  **Reconcile Accuracy Test**: Verify that editing a second file correctly triggers a **reconcile** and updates the briefing if the combined context changes.
3.  **Baseline Reset Test**: Verify that switching git branches triggers an immediate **revert-to-baseline** and cache clear, preventing branch-to-branch context leakage.
4.  **Multi-file Fingerprint Stability**: Verify that the context fingerprint remains stable when edits are made across multiple files that are already part of the session scope.
5.  **Manual Refresh Guarantee**: Verify that `/brief-kibi` forces a full **reconcile** even when an auto-briefing is already present.
- MCP-only guidance must reference `kb_briefing_generate` for briefing operations

6.  **MCP Isolation Test**: Verify that no forbidden CLI commands (sync, init, check) are used or suggested in the v3 implementation or guidance.
7.  **Performance Check**: Verify that the reconcile cycle (fingerprint + fetch) completes within the latency budget for `file.edited` events.
8.  **Config Split Test**: Verify that TUI channel respects both shared `briefs.channels.tui` from `.kb/config.json` and `ux.briefs.autoSubmit` from `.opencode/kibi.json`.
9.  **AutoSubmit Override Test**: Verify that when `ux.briefs.autoSubmit: false`, TUI auto-delivery is suppressed and `/brief-kibi` remains the functional retrieval path.
10. **Canonical Command Test**: Verify that `/brief-kibi` always works regardless of `autoSubmit` setting.

### Verified By

| Test File | Description |
|-----------|-------------|
| `packages/opencode/tests/briefing-reconcile.test.ts` | Session-local reconciliation logic |
| `packages/opencode/tests/briefing-cache-reset.test.ts` | Cache clearing on branch switch |
| `packages/opencode/tests/briefing-fingerprint.test.ts` | Multi-file fingerprinting correctness |
| `packages/opencode/tests/agent-surface-policy.test.ts` | Surface policy compliance check |
