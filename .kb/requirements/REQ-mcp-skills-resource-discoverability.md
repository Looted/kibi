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
  - review:context-missing
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
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
---

MCP skill resource handlers must expose declared bundled skill resources through deterministic discovery and reject undeclared resource paths.
