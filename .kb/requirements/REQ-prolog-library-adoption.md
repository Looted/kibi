---
id: REQ-prolog-library-adoption
title: Adopt maintained Prolog libraries for bounded graph capabilities
status: open
created_at: 2026-06-02T00:00:00.000Z
updated_at: 2026-06-02T00:00:00.000Z
source: docs/mcp-reference.md
priority: should
owner: core-team
tags:
  - prolog
  - mcp
  - sparql
  - traceability
links:
  - type: specified_by
    target: SCEN-prolog-library-adoption
  - type: verified_by
    target: TEST-prolog-library-adoption-core
  - type: verified_by
    target: TEST-prolog-library-adoption-mcp
semantic_text: Kibi should adopt maintained SWI-Prolog libraries where they clarify bounded graph behavior without replacing the local branch KB model.\n\nThe implementation must keep CHR-derived facts isolated from the existing validation path, keep SPARQL support remote-only and opt-in, and expose the remote SPARQL capability through the curated MCP surface with validation for endpoint safety and SELECT-only queries.
logic_claims:
  - CLAIM-6B1DA061279DDD72
semantic_clauses:
  - Kibi should adopt maintained SWI-Prolog libraries where they clarify bounded graph behavior without replacing the local branch KB model.\n\nThe implementation must keep CHR-derived facts isolated from the existing validation path, keep SPARQL support remote-only and opt-in, and expose the remote SPARQL capability through the curated MCP surface with validation for endpoint safety and SELECT-only queries
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 631b63bbb0e18b613f03cce8dbfc1001f5b599cfe704e021cb1b16f8519c6c3d
semantic_inventory:
  - claim_key: CLAIM-6B1DA061279DDD72
    claim_text: Kibi should adopt maintained SWI-Prolog libraries where they clarify bounded graph behavior without replacing the local branch KB model.\n\nThe implementation must keep CHR-derived facts isolated from the existing validation path, keep SPARQL support remote-only and opt-in, and expose the remote SPARQL capability through the curated MCP surface with validation for endpoint safety and SELECT-only queries
    role: normative
    status: modeled
    span:
      start: 0
      end: 406
type: req
---

Kibi should adopt maintained SWI-Prolog libraries where they clarify bounded graph behavior without replacing the local branch KB model.

The implementation must keep CHR-derived facts isolated from the existing validation path, keep SPARQL support remote-only and opt-in, and expose the remote SPARQL capability through the curated MCP surface with validation for endpoint safety and SELECT-only queries.
