---
id: SCEN-opencode-kibi-plugin-v1
title: "OpenCode Kibi Plugin v1: Core Behaviors"
type: scenario
status: active
created_at: 2026-04-13T10:00:00Z
updated_at: 2026-05-13T00:00:00Z
source: documentation/scenarios/SCEN-opencode-kibi-plugin-v1.md
links:
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
  - type: relates_to
    target: SCEN-opencode-guidance-injection
  - type: relates_to
    target: SCEN-opencode-background-sync
---

## Scenario: Core Plugin Behaviors

This doc covers the core non-blocking behaviors of the OpenCode Kibi plugin.

### Start-Task Briefing Cue
**Given** an OpenCode session is starting or an authoritative risky edit is detected
**When** the plugin decides a briefing cue fits within the smart-enforcement prompt budget
**Then** the guidance may mention `/brief-kibi` as a sanctioned slash command.
**And** the guidance may reference `kb_briefing_generate` as the public MCP briefing path behind that workflow.
