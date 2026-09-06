---
id: REQ-mcp-suggest-predicates
title: Suggest ontology predicates from requirement prose
status: open
created_at: 2026-05-30T00:00:00.000Z
updated_at: 2026-06-01T00:00:00.000Z
source: packages/mcp/src/tools/suggest-predicates.ts
priority: high
tags:
  - mcp
  - ontology
  - predicates
links:
  - type: specified_by
    target: SCEN-mcp-suggest-predicates
  - type: verified_by
    target: TEST-mcp-suggest-predicates
semantic_text: The MCP server must suggest matching ontology predicate schemas for requirement prose, return safe predicate fact apply plans when a schema fits, and report ontology-gap observations when no candidate is suitable. Suggestions must preserve deontic polarity (`deny` for prohibition cues such as “must not” or “never”) and bind declared project-local argument names when the claim supplies them; they must not silently turn a prohibition into an assertion or invent unbound values.
logic_claims:
  - CLAIM-35C07B949BBA2AD5
semantic_clauses:
  - The MCP server must suggest matching ontology predicate schemas for requirement prose, return safe predicate fact apply plans when a schema fits, and report ontology-gap observations when no candidate is suitable
  - Suggestions must preserve deontic polarity (`deny` for prohibition cues such as “must not” or “never”) and bind declared project-local argument names when the claim supplies them; they must not silently turn a prohibition into an assertion or invent unbound values
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c4054dd2aa7bcf4ed460feb0ccc41bf34ce0c805fe4d0fcfa323b2bc04b3db03
semantic_inventory:
  - claim_key: CLAIM-35C07B949BBA2AD5
    claim_text: The MCP server must suggest matching ontology predicate schemas for requirement prose, return safe predicate fact apply plans when a schema fits, and report ontology-gap observations when no candidate is suitable
    role: normative
    status: modeled
    span:
      start: 0
      end: 212
  - claim_key: CLAIM-2B147E8D7CDA5B58
    claim_text: Suggestions must preserve deontic polarity (`deny` for prohibition cues such as “must not” or “never”) and bind declared project-local argument names when the claim supplies them; they must not silently turn a prohibition into an assertion or invent unbound values
    role: example
    status: nonlogical
    span:
      start: 214
      end: 486
type: req
---

The MCP server must suggest matching ontology predicate schemas for requirement prose, return safe predicate fact apply plans when a schema fits, and report ontology-gap observations when no candidate is suitable. Suggestions must preserve deontic polarity (`deny` for prohibition cues such as “must not” or “never”) and bind declared project-local argument names when the claim supplies them; they must not silently turn a prohibition into an assertion or invent unbound values.
