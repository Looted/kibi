---
id: TEST-opencode-kibi-briefing-v4
title: "OpenCode Kibi Briefings v4 Verification Plan"
status: pending
created_at: 2026-04-29T10:00:00Z
updated_at: 2026-04-29T10:00:00Z
source: documentation/tests/TEST-opencode-kibi-briefing-v4.md
priority: must
tags:
  - test
  - opencode
  - briefing
  - render-first
links:
  - type: validates
    target: SCEN-opencode-kibi-briefing-v4
---

Verification plan for the Render-First Idle Briefing contract:

1.  **Render-First Append Test**: Verify that the presence of an `IdleBriefEnvelope` in `.kb/briefs/` causes the `promptBlock` to be injected into the next `system.transform` payload without manual intervention.
2.  **Toast Deprecation Test**: Verify that no toast notifications are required or emitted for briefing delivery when following the v4 contract.
3.  **Config Gating Test**: Verify that setting `briefs.channels.tui: false` in `.kb/config.json` successfully suppresses the auto-append behavior.
4.  **Auto-Submit Ignored Test**: Verify that the system ignores the legacy `ux.briefs.autoSubmit` setting and always appends the brief when the TUI channel is enabled.
5.  **Manual Command Stability**: Verify that `/brief-kibi` remains functional and provides the full briefing on-demand, bypassing any cached idle envelopes if necessary.
6.  **Envelope Clean-up Test**: Verify that branch switches or session closures result in an empty `.kb/briefs/` directory.
7.  **Schema Compliance Test**: Verify that the persisted JSON files in `.kb/briefs/` strictly adhere to the `IdleBriefEnvelope` interface defined in `packages/opencode/src/idle-brief-store.ts`.

### Verified By

| Test File | Description |
|-----------|-------------|
| `packages/opencode/tests/briefing-v4-render.test.ts` | Render-first injection logic |
| `packages/opencode/tests/briefing-v4-gating.test.ts` | Channel gating and config deprecation |
| `packages/opencode/tests/briefing-v4-cleanup.test.ts` | Directory cleanup on branch switch |
