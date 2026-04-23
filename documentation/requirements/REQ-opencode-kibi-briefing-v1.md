---
id: REQ-opencode-kibi-briefing-v1
title: "OpenCode Kibi Briefings v1: Cue-Driven Discovery Through /brief-kibi"
status: deprecated
created_at: 2026-04-20T00:00:00Z
updated_at: 2026-04-20T00:00:00Z
source: documentation/requirements/REQ-opencode-kibi-briefing-v1.md
priority: must
tags:
  - opencode
  - briefing
  - guidance
  - start-task
links:
  - type: depends_on
    target: REQ-mcp-kibi-briefing-v1
  - type: specified_by
    target: SCEN-opencode-kibi-briefing-v1
  - type: verified_by
    target: TEST-opencode-kibi-briefing-v1
  - type: relates_to
    target: REQ-opencode-kibi-plugin-v1
  - type: relates_to
    target: REQ-opencode-agent-mcp-only
  - type: relates_to
    target: REQ-opencode-smart-enforcement-v1
  - type: relates_to
    target: ADR-018
---


31#YT|> **Note**: This requirement is DEPRECATED and superseded by REQ-opencode-kibi-briefing-v2. 
32#YT|> It remains here for historical context and to document the v1 cue-driven contract.
The OpenCode briefing experience must expose Kibi Briefings v1 as a sanctioned, cue-driven start-task workflow rather than an automatic runtime fetch.

1. **Sanctioned Command**: `/brief-kibi` must be the sanctioned start-task command for requesting a Kibi briefing in OpenCode.
2. **Cue-Driven Discovery**: The plugin may surface a compact cue that points the user or agent to `/brief-kibi` in relevant risky edit contexts.
3. **No Live Hook Execution**: The plugin hook surface must remain text-only guidance. It must not perform live MCP execution while composing prompt guidance.
4. **No Hidden Mutation Path**: The OpenCode briefing surface must not introduce background KB mutation, repair, or auto-application behavior.
5. **MCP-Only Boundary**: Agent-visible wording for briefing generation must stay on sanctioned slash-command or MCP-owned surfaces consistent with ADR-018.
6. **Degraded-Mode Honesty**: When posture or freshness is not authoritative enough for briefing use, the experience must degrade cleanly to `no_briefing` rather than imply a successful live briefing.
7. **Prompt-Budget Compatibility**: Any cue that points to `/brief-kibi` must remain compact enough to coexist with existing OpenCode guidance budgeting rules.
