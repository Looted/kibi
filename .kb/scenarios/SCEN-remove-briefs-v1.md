---
id: SCEN-remove-briefs-v1
title: Briefing surfaces are retired across MCP, OpenCode, and VS Code
status: closed
created_at: 2026-05-28T00:00:00.000Z
updated_at: 2026-05-28T00:00:00.000Z
source: documentation/scenarios/SCEN-remove-briefs-v1.md
tags:
  - removal
  - briefing
  - mcp
  - opencode
  - vscode
links:
  - type: relates_to
    target: REQ-remove-briefs-v1
type: scenario
---

**Scenario: Removed briefing surface stays absent**

**GIVEN** a workspace using Kibi MCP, OpenCode, or VS Code integrations
**WHEN** the user inspects available tools, prompts, commands, notifications, configuration, and generated artifacts
**THEN** the briefing-specific surfaces are absent
**AND** generic Kibi discovery, query, sync, validation, and traceability workflows remain available.
