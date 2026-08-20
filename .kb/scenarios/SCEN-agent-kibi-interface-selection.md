---
id: SCEN-agent-kibi-interface-selection
title: Agent guidance treats MCP and CLI as peer public surfaces
type: scenario
status: active
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-07-21T00:00:00Z
source: documentation/scenarios/SCEN-agent-kibi-interface-selection.md
priority: must
tags:
  - opencode
  - agent
  - mcp
  - cli
  - policy
links:
  - type: relates_to
    target: REQ-agent-kibi-interface-selection
  - type: relates_to
    target: ADR-022
---

## Scenario

An OpenCode agent reads Kibi guidance while working in a repo.

### Steps

1. The agent reads public Kibi guidance.
2. The guidance names MCP and CLI as peer public surfaces.
3. The guidance avoids saying that only one surface is public.

### Expected Outcomes

- The agent can choose the clearest public surface for the task.
- The guidance stays consistent with parity.
- No exclusive MCP-only claim appears.
