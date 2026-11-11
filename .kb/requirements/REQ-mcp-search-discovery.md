---
id: REQ-mcp-search-discovery
title: Curated discovery and reporting tools are available through MCP and CLI
status: closed
created_at: 2026-03-22T00:00:00.000Z
updated_at: 2026-03-22T18:30:00.000Z
priority: must
tags:
  - mcp
  - cli
  - discovery
  - search
links:
  - type: specified_by
    target: SCEN-mcp-search-discovery
  - type: verified_by
    target: TEST-mcp-search-discovery
semantic_text: Kibi must provide a curated read-only discovery surface through both MCP and the CLI. The discovery surface must offer free-text discovery with kb_search and kibi search. The discovery surface must offer freshness and snapshot inspection with kb_status and kibi status. The discovery surface must offer gap analysis with kb_find_gaps and kibi gaps. The discovery surface must offer coverage reporting with kb_coverage and kibi coverage. The discovery surface must offer bounded relationship traversal with kb_graph and kibi graph. kb_query must remain exact and deterministic and must not be turned into fuzzy search.
logic_claims:
  - CLAIM-22095215C677EF51
  - CLAIM-72D8537F4A41017D
  - CLAIM-4A03C560B5A16652
  - CLAIM-F7BE38ED576A3C7E
  - CLAIM-85DE8086A2F011E3
  - CLAIM-E82B1FCCDE8DC303
  - CLAIM-C366C52CD08BBDBC
semantic_clauses:
  - Kibi must provide a curated read-only discovery surface through both MCP and the CLI.
  - The discovery surface must offer free-text discovery with kb_search and kibi search.
  - The discovery surface must offer freshness and snapshot inspection with kb_status and kibi status.
  - The discovery surface must offer gap analysis with kb_find_gaps and kibi gaps.
  - The discovery surface must offer coverage reporting with kb_coverage and kibi coverage.
  - The discovery surface must offer bounded relationship traversal with kb_graph and kibi graph.
  - kb_query must remain exact and deterministic and must not be turned into fuzzy search.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bbabf4bdcf29a308ace21d334f6c8739fc14ea6d849c761497746dbe44241c9e
semantic_inventory:
  - claim_key: CLAIM-22095215C677EF51
    claim_text: Kibi must provide a curated read-only discovery surface through both MCP and the CLI
    role: normative
    status: modeled
    span:
      start: 0
      end: 84
  - claim_key: CLAIM-72D8537F4A41017D
    claim_text: The discovery surface must offer free-text discovery with kb_search and kibi search
    role: normative
    status: modeled
    span:
      start: 86
      end: 169
  - claim_key: CLAIM-4A03C560B5A16652
    claim_text: The discovery surface must offer freshness and snapshot inspection with kb_status and kibi status
    role: normative
    status: modeled
    span:
      start: 171
      end: 268
  - claim_key: CLAIM-F7BE38ED576A3C7E
    claim_text: The discovery surface must offer gap analysis with kb_find_gaps and kibi gaps
    role: normative
    status: modeled
    span:
      start: 270
      end: 347
  - claim_key: CLAIM-85DE8086A2F011E3
    claim_text: The discovery surface must offer coverage reporting with kb_coverage and kibi coverage
    role: normative
    status: modeled
    span:
      start: 349
      end: 435
  - claim_key: CLAIM-E82B1FCCDE8DC303
    claim_text: The discovery surface must offer bounded relationship traversal with kb_graph and kibi graph
    role: normative
    status: modeled
    span:
      start: 437
      end: 529
  - claim_key: CLAIM-C366C52CD08BBDBC
    claim_text: kb_query must remain exact and deterministic and must not be turned into fuzzy search
    role: normative
    status: modeled
    span:
      start: 531
      end: 616
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6). Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok" Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 7): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:34:18.000Z'
firmness: default
required_evidence: tested
rationale: "Agents and people should find the same answers whether they use MCP or the CLI, through one curated read-only set of discovery commands."
---
- Kibi must provide a curated read-only discovery surface through both MCP and the CLI.
- The discovery surface must offer free-text discovery with kb_search and kibi search.
- The discovery surface must offer freshness and snapshot inspection with kb_status and kibi status.
- The discovery surface must offer gap analysis with kb_find_gaps and kibi gaps.
- The discovery surface must offer coverage reporting with kb_coverage and kibi coverage.
- The discovery surface must offer bounded relationship traversal with kb_graph and kibi graph.
- kb_query must remain exact and deterministic and must not be turned into fuzzy search.

## Why
Users needed exploratory analysis without falling back to grep or raw KB internals. `kb_query` stays exact, and the product exposes curated answers rather than raw inference. Source: ADR "Discovery tools expand the public read surface".
