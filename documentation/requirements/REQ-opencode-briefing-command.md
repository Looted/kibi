---
id: REQ-opencode-briefing-command
title: "OpenCode Briefing Command"
status: superseded
created_at: 2026-05-13T00:00:00Z
source: packages/opencode/src/brief-intent.ts
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - briefing
links:
  - type: specified_by
    target: SCEN-opencode-briefing-command
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
---

The plugin must support focused knowledge briefings:

1. Provide a `/brief-kibi` slash command to invoke the MCP briefing workflow (`kb_briefing_generate`).
2. Surface the command when session starts or authoritative risky work is detected.
3. Discovery cues for the briefing must fit within the prompt guidance token budget.
