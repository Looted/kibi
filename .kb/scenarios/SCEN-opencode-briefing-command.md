---
id: SCEN-opencode-briefing-command
title: OpenCode Briefing Command Cue
type: scenario
status: closed
created_at: 2026-05-13T00:00:00Z
source: documentation/scenarios/SCEN-opencode-briefing-command.md
priority: must
tags:
  - opencode
  - briefing
links:
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
---

## Scenario: Briefing Command Surfacing

**Given** an OpenCode session enters a risky task
**When** the plugin decides a briefing cue is warranted
**Then** it must surface `/brief-kibi` as the sanctioned command
**And** it may reference `kb_briefing_generate` as the MCP workflow behind it.
