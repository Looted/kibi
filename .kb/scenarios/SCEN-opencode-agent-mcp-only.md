---
id: SCEN-opencode-agent-mcp-only
title: OpenCode agent guidance routes through the approved peer surface
type: scenario
status: draft
created_at: 2026-03-22T00:00:00.000Z
updated_at: 2026-04-20T00:00:00.000Z
priority: must
tags:
  - opencode
  - agent
  - mcp
  - guidance
links:
  - REQ-opencode-agent-mcp-only
  - type: verified_by
    target: TEST-opencode-agent-mcp-only
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
OpenCode guidance uses the host-visible approved Kibi peer surface and follows typed status and next actions. Bootstrap routes to kibi-bootstrap and the exact plan returned by kb_plan_bootstrap; no direct .kb editing or manual mutation sequence is allowed.
