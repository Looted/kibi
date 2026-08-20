---
id: SCEN-mcp-tool-check-coverage
title: MCP check reports filtered integrity violations
type: scenario
status: active
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-07-21T00:00:00Z
source: documentation/scenarios/SCEN-mcp-tool-check-coverage.md
priority: must
links:
  - type: relates_to
    target: REQ-mcp-tool-check
  - type: verified_by
    target: TEST-mcp-tool-check-coverage
---

Given a branch KB with an integrity violation, when an operator invokes the MCP check tool with a selected rule, then the tool returns clear violation details and can be run again after the mutation to confirm the repaired state.
