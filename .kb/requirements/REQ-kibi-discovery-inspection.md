---
title: Read-only status, gaps, coverage and graph inspection through MCP and the CLI
status: open
semantic_text: Kibi must provide a curated read-only discovery surface through both MCP and the CLI. The discovery surface must offer freshness and snapshot inspection with kb_status and kibi status. The discovery surface must offer gap analysis with kb_find_gaps and kibi gaps. The discovery surface must offer coverage reporting with kb_coverage and kibi coverage. The discovery surface must offer bounded relationship traversal with kb_graph and kibi graph.
semantic_clauses:
  - Kibi must provide a curated read-only discovery surface through both MCP and the CLI.
  - The discovery surface must offer freshness and snapshot inspection with kb_status and kibi status.
  - The discovery surface must offer gap analysis with kb_find_gaps and kibi gaps.
  - The discovery surface must offer coverage reporting with kb_coverage and kibi coverage.
  - The discovery surface must offer bounded relationship traversal with kb_graph and kibi graph.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 92eb1cd783058ba22cf13b545b16b35727984fe5e4addfee6d827bad946259d9
semantic_inventory:
  - claim_key: CLAIM-22095215C677EF51
    claim_text: Kibi must provide a curated read-only discovery surface through both MCP and the CLI
    role: normative
    status: modeled
    span:
      start: 0
      end: 84
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-4A03C560B5A16652
    claim_text: The discovery surface must offer freshness and snapshot inspection with kb_status and kibi status
    role: normative
    status: modeled
    span:
      start: 86
      end: 183
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-F7BE38ED576A3C7E
    claim_text: The discovery surface must offer gap analysis with kb_find_gaps and kibi gaps
    role: normative
    status: modeled
    span:
      start: 185
      end: 262
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-85DE8086A2F011E3
    claim_text: The discovery surface must offer coverage reporting with kb_coverage and kibi coverage
    role: normative
    status: modeled
    span:
      start: 264
      end: 350
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-E82B1FCCDE8DC303
    claim_text: The discovery surface must offer bounded relationship traversal with kb_graph and kibi graph
    role: normative
    status: modeled
    span:
      start: 352
      end: 444
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-22095215C677EF51
  - CLAIM-4A03C560B5A16652
  - CLAIM-F7BE38ED576A3C7E
  - CLAIM-85DE8086A2F011E3
  - CLAIM-E82B1FCCDE8DC303
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T06:41:18.202Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - mcp
  - cli
  - discovery
  - search
id: REQ-kibi-discovery-inspection
type: req
---
Kibi must provide a curated read-only discovery surface through both MCP and the CLI. The discovery surface must offer freshness and snapshot inspection with kb_status and kibi status. The discovery surface must offer gap analysis with kb_find_gaps and kibi gaps. The discovery surface must offer coverage reporting with kb_coverage and kibi coverage. The discovery surface must offer bounded relationship traversal with kb_graph and kibi graph.

## Context

Each inspection tool has an MCP name and a matching CLI command, and none of them writes to the KB.



## Why this changed

Split from REQ-mcp-search-discovery, which held two behaviors: free-text search beside exact query, and the read-only inspection tools. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"
