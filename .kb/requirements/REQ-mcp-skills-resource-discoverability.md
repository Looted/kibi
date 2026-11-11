---
id: REQ-mcp-skills-resource-discoverability
title: MCP exposes bundled skill resources through discovery
status: open
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
priority: high
tags:
  - mcp
  - skills
  - discoverability
links:
  - type: specified_by
    target: SCEN-mcp-skills-resource-discoverability
  - type: verified_by
    target: TEST-mcp-skills-resource-discoverability
type: req
semantic_text: MCP skill resource handlers must expose declared bundled skill resources through deterministic discovery and reject undeclared resource paths.
logic_claims:
  - CLAIM-E11F064B53E0BBCC
semantic_clauses:
  - MCP skill resource handlers must expose declared bundled skill resources through deterministic discovery and reject undeclared resource paths
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3cc5a375f890fd7c494768b7ff9fba86af173b32b6cd7ca14e7fc37f61d3eb64
semantic_inventory:
  - claim_key: CLAIM-E11F064B53E0BBCC
    claim_text: MCP skill resource handlers must expose declared bundled skill resources through deterministic discovery and reject undeclared resource paths
    role: normative
    status: modeled
    span:
      start: 0
      end: 141
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-11, approving entity context that was inferred (not recorded in history) in the KB gold-standard review (context batch 9, inferred): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
---

MCP skill resource handlers must expose declared bundled skill resources through deterministic discovery and reject undeclared resource paths.

## Why
Hosts without the CLI need to reach the same skills through MCP. Exposing only declared resources keeps the server from serving arbitrary files. Inferred from: the requirement's own text; REQ-reusable-skill-subsystem.
