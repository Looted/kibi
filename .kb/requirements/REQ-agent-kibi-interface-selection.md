---
id: REQ-agent-kibi-interface-selection
title: Agent guidance selects between Kibi public surfaces without claiming exclusivity
status: open
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-07-21T00:00:00.000Z
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
semantic_text: Agent-facing guidance must treat the Kibi public MCP and CLI surfaces as peers. Guidance must not present MCP as the only public surface. Guidance may name either public surface when that is the clearest route for the user. Guidance must keep historical policy changes visible through supersession links, not rewritten prose.
semantic_clauses:
  - Agent-facing guidance must treat the Kibi public MCP and CLI surfaces as peers
  - Guidance must not present MCP as the only public surface
  - Guidance may name either public surface when that is the clearest route for the user
  - Guidance must keep historical policy changes visible through supersession links, not rewritten prose
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9d2ebc0267c4e29f1a9abe87102d1dace6aeb6b22fc78ec79b12522eab235a4d
logic_claims:
  - CLAIM-C1862263F103BE07
  - CLAIM-83CB27CE535B006D
  - CLAIM-B2AE424C29508FFF
  - CLAIM-954E745065BDCD3D
semantic_inventory:
  - claim_key: CLAIM-C1862263F103BE07
    claim_text: Agent-facing guidance must treat the Kibi public MCP and CLI surfaces as peers
    role: normative
    status: modeled
    span:
      start: 0
      end: 78
  - claim_key: CLAIM-83CB27CE535B006D
    claim_text: Guidance must not present MCP as the only public surface
    role: normative
    status: modeled
    span:
      start: 80
      end: 136
  - claim_key: CLAIM-B2AE424C29508FFF
    claim_text: Guidance may name either public surface when that is the clearest route for the user
    role: normative
    status: modeled
    span:
      start: 138
      end: 222
  - claim_key: CLAIM-954E745065BDCD3D
    claim_text: Guidance must keep historical policy changes visible through supersession links, not rewritten prose
    role: normative
    status: modeled
    span:
      start: 224
      end: 324
type: req
---

Agent-facing guidance must treat the Kibi public MCP and CLI surfaces as peers.

1. Guidance must not present MCP as the only public surface.
2. Guidance may name either public surface when that is the clearest route for the user.
3. Guidance must keep historical policy changes visible through supersession links, not rewritten prose.
