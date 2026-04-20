---
id: TEST-opencode-kibi-briefing-v1
title: "OpenCode Kibi Briefings v1 Verification"
status: pending
created_at: 2026-04-20T00:00:00Z
updated_at: 2026-04-20T00:00:00Z
source: documentation/tests/TEST-opencode-kibi-briefing-v1.md
priority: must
tags:
  - test
  - opencode
  - briefing
  - guidance
links:
  - type: validates
    target: SCEN-opencode-kibi-briefing-v1
---

Automated verification for the OpenCode Kibi Briefings v1 contract includes:

1. **Sanctioned Command Policy Test**: Verify that agent-facing OpenCode guidance treats `/brief-kibi` as a sanctioned start-task command.
2. **Cue-Only Prompt Test**: Verify that risky-edit guidance may mention `/brief-kibi` while remaining advisory text only.
3. **No Live Hook Execution Test**: Verify that prompt-hook behavior does not execute briefing generation while composing guidance.
4. **Single-Block Budget Test**: Verify that any `/brief-kibi` cue remains within the existing OpenCode prompt-budget limits.
5. **Authoritative-Only Cue Test**: Verify that the cue appears only in contexts where briefing discovery is supported by authoritative posture rules.
6. **Fail-Closed Regression Test**: Verify that stale or unsupported briefing responses surface `no_briefing` rather than a fabricated start-task summary.
7. **MCP-Only Surface Test**: Verify that briefing guidance stays on sanctioned slash-command and MCP-owned surfaces without introducing direct maintenance instructions.
