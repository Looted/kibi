---
id: SCEN-opencode-kibi-briefing-v1
title: "OpenCode surfaces a cue for /brief-kibi without executing it"
status: closed
created_at: 2026-04-20T00:00:00Z
updated_at: 2026-04-20T00:00:00Z
source: documentation/scenarios/SCEN-opencode-kibi-briefing-v1.md
tags:
  - scenario
  - opencode
  - briefing
  - guidance
links:
  - type: relates_to
    target: REQ-opencode-kibi-briefing-v1
  - type: relates_to
    target: REQ-mcp-kibi-briefing-v1
---


> **Note**: This scenario is DEPRECATED and superseded by SCEN-opencode-kibi-briefing-v2. 
> It documents the historical v1 cue-driven behavior.
**Scenario: Authoritative risky edit gets a start-task cue**

**GIVEN** an OpenCode session is in an authoritative, non-degraded posture
**AND** the current work is a risky code-edit context where a start-task briefing would help
**WHEN** the plugin injects guidance
**THEN** it may surface a compact cue to run `/brief-kibi`
**AND** the cue remains advisory text only
**AND** the actual briefing is produced only if the user or agent explicitly requests the sanctioned command.

**Scenario: Degraded or unsupported briefing path stays fail-closed**

**GIVEN** a user or agent follows the cue and requests `/brief-kibi`
**AND** the underlying briefing request resolves to stale, dirty, unsupported, or weak evidence
**WHEN** the MCP briefing workflow responds
**THEN** the result must degrade to `no_briefing`
**AND** the OpenCode surface must not pretend a live briefing was generated inside the hook
**AND** the plugin must remain a cue surface rather than an execution surface.
