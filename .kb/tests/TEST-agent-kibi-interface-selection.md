---
id: TEST-agent-kibi-interface-selection
title: Agent guidance surface selection verification plan
type: test
status: pending
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-07-21T00:00:00Z
source: documentation/tests/TEST-agent-kibi-interface-selection.md
priority: must
tags:
  - opencode
  - agent
  - mcp
  - cli
  - policy
  - test
links:
  - type: validates
    target: SCEN-agent-kibi-interface-selection
  - type: relates_to
    target: ADR-022
---

## Test Coverage

### Policy Checks

- The new requirement supersedes the older MCP-only guidance by link, not by rewriting history.
- Agent-facing docs keep both public surfaces available in the traceability graph.
- The scenario proves guidance can point to a peer surface without claiming exclusivity.
