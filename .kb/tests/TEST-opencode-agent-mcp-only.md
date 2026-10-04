---
id: TEST-opencode-agent-mcp-only
title: OpenCode agent guidance avoids direct Kibi CLI instructions
type: test
status: pending
created_at: 2026-03-22T00:00:00.000Z
updated_at: 2026-04-20T00:00:00.000Z
source: .kb/tests/TEST-opencode-agent-mcp-only.md
priority: must
tags:
  - opencode
  - agent
  - mcp
  - policy
  - test
links:
  - type: validates
    target: SCEN-opencode-agent-mcp-only
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Verify that OpenCode agent guidance uses the approved host-visible MCP surface, routes bootstrap to kibi-bootstrap and kb_plan_bootstrap, and does not teach direct .kb edits or ad-hoc mutation steps.
