---
id: REQ-agent-kibi-interface-selection
title: Agent guidance selects between Kibi public surfaces without claiming exclusivity
status: open
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-07-21T00:00:00Z
source: documentation/requirements/REQ-agent-kibi-interface-selection.md
priority: must
owner: opencode-team
tags:
  - opencode
  - agent
  - mcp
  - cli
  - policy
links:
  - type: supersedes
    target: REQ-opencode-agent-mcp-only
  - type: relates_to
    target: ADR-022
  - type: specified_by
    target: SCEN-agent-kibi-interface-selection
  - type: verified_by
    target: TEST-agent-kibi-interface-selection
---

Agent-facing guidance must treat the Kibi public MCP and CLI surfaces as peers.

1. Guidance must not present MCP as the only public surface.
2. Guidance may name either public surface when that is the clearest route for the user.
3. Guidance must keep historical policy changes visible through supersession links, not rewritten prose.
