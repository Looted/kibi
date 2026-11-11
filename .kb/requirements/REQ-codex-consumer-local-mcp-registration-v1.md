---
title: Codex Plugin Registers Consumer-Local MCP
status: open
priority: must
owner: codex-team
tags:
  - kibi
  - codex
  - plugin
  - mcp
  - consumer-local
semantic_text: The kibi-codex plugin registers consumer-local MCP startup behavior for Codex.
logic_claims:
  - CLAIM-387DE160D72D606F
semantic_clauses:
  - The kibi-codex plugin registers consumer-local MCP startup behavior for Codex.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c5c16f5deace6a847e1aa95d237cd6808ed5383afef31dcda88314e5f3430497
semantic_inventory:
  - claim_key: CLAIM-387DE160D72D606F
    claim_text: The kibi-codex plugin registers consumer-local MCP startup behavior for Codex
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 77
id: REQ-codex-consumer-local-mcp-registration-v1
type: req
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 5): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
---
The kibi-codex plugin registers consumer-local MCP startup behavior for Codex.

## Why
The Codex plugin should resolve the MCP server from the active project, so it never runs a cached plugin copy or downloads a package at startup. Source: Changeset "quiet-codex-cwd".
