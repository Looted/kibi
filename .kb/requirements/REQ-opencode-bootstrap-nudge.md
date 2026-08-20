---
id: REQ-opencode-bootstrap-nudge
title: "OpenCode Bootstrap Nudge"
status: open
created_at: 2026-05-13T00:00:00Z
source: packages/opencode/src/init-kibi-capability.ts
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - bootstrap
links:
  - type: specified_by
    target: SCEN-opencode-bootstrap-nudge
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
---

The plugin must assist with initializing Kibi in new repositories:

1. Detect uninitialized or weakly bootstrapped repos that declare Kibi intent.
2. Nudge the agent toward the `/init-kibi` slash command.
3. Facilitate the Autopilot MCP workflow (`kb_autopilot_generate`) for initial entity mapping.
4. Escalate to the user/operator if environmental setup (e.g., Prolog installation) is required.
