---
id: REQ-mcp-semantic-advisor-preflight
title: MCP upsert preflight surfaces semantic advisor receipts
status: open
created_at: 2026-06-07T00:00:00.000Z
updated_at: 2026-06-07T00:00:00.000Z
source: packages/mcp/src/semantic-advisor/analyze-prose.ts
priority: high
tags:
  - mcp
  - semantic-advisor
  - modeling
links:
  - type: specified_by
    target: SCEN-mcp-semantic-advisor-preflight
  - type: verified_by
    target: TEST-mcp-semantic-advisor-preflight
semantic_text: The MCP server must analyze raw requirement prose and requirement upsert payloads for deterministic semantic modeling signals and return advisory receipts that guide agents toward strict facts, ontology predicates, ambiguity review, or ontology-gap observations before prose is treated as contradiction-checkable knowledge.
logic_claims:
  - CLAIM-72978BB264F763EB
semantic_clauses:
  - The MCP server must analyze raw requirement prose and requirement upsert payloads for deterministic semantic modeling signals and return advisory receipts that guide agents toward strict facts, ontology predicates, ambiguity review, or ontology-gap observations before prose is treated as contradiction-checkable knowledge
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 86a79b1bb2f28c15ac539ea800a8e74b66d1891a05824ad76106b0cff7a8f510
semantic_inventory:
  - claim_key: CLAIM-72978BB264F763EB
    claim_text: The MCP server must analyze raw requirement prose and requirement upsert payloads for deterministic semantic modeling signals and return advisory receipts that guide agents toward strict facts, ontology predicates, ambiguity review, or ontology-gap observations before prose is treated as contradiction-checkable knowledge
    role: normative
    status: modeled
    span:
      start: 0
      end: 322
type: req
---

The MCP server must analyze raw requirement prose and requirement upsert payloads for deterministic semantic modeling signals and return advisory receipts that guide agents toward strict facts, ontology predicates, ambiguity review, or ontology-gap observations before prose is treated as contradiction-checkable knowledge.
