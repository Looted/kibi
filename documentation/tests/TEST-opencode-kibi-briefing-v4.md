---
id: TEST-opencode-kibi-briefing-v4
title: "OpenCode Kibi Briefings v4 Verification Plan"
status: pending
created_at: 2026-04-29T10:00:00Z
updated_at: 2026-04-30T10:00:00Z
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

1.  **Idle Generation Test**: Verify that a brief is correctly generated and persisted as an `IdleBriefEnvelope` in `.kb/briefs/` at `session.idle`.
22#JW|2.  **Prompt-Time Replay Test**: Verify that an unread brief is correctly replayed and appended to the prompt during the `system.transform` cycle.
23#SB|3.  **Read-State Transition Test**: Verify that successful delivery marks the brief `unread: false`, while failed or skipped delivery leaves it `unread: true`.
24#VN|4.  **Duplicate Suppression Test**: Verify that a brief marked as read is not replayed in subsequent cycles.
25#PS|5.  **Channel Gating Test**: Verify that setting `briefs.channels.tui: false` suppresses the auto-append and replay behavior.
26#VJ|6.  **Branch Filter Test**: Verify that only briefs belonging to the current branch are selected for replay.
27#KS|7.  **Manual Command Stability**: Verify that `/brief-kibi` remains functional regardless of the presence or state of idle envelopes.
28#HQ|8.  **Schema Compliance Test**: Verify that persisted JSON files strictly adhere to the `IdleBriefEnvelope` interface.

### Verified By

| Test File | Description |
32#MT||-----------|-------------|
33#BN|| `packages/opencode/tests/idle-brief-reader.test.ts` | Replay selection and branch filtering |
34#BX|| `packages/opencode/tests/idle-brief-audit.test.ts` | Read-state management and selection audit |
35#KY|| `packages/opencode/tests/tui-brief-delivery.test.ts` | TUI append and delivery logic |
36#KY|| `packages/opencode/tests/index.test.ts` | Plugin entry and lifecycle |
37#KY|| `packages/opencode/tests/hook-contract.test.ts` | OpenCode hook integration |
