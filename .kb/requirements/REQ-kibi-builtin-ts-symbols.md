---
title: The builtin TypeScript provider extracts declaration symbols with ts-morph, names methods Class.method and skips private members
status: open
semantic_text: The builtin TypeScript provider must extract declaration symbols with ts-morph, name class methods as Class.method and skip private class members.
semantic_clauses:
  - The builtin TypeScript provider must extract declaration symbols with ts-morph, name class methods as Class.method and skip private class members
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7af54592e92b459278076886e9e599dcb062a7eb23ff6a170a4159e01928d166
semantic_inventory:
  - claim_key: CLAIM-8A55EE874D400859
    claim_text: The builtin TypeScript provider must extract declaration symbols with ts-morph, name class methods as Class.method and skip private class members
    role: normative
    status: modeled
    span:
      start: 0
      end: 145
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-8A55EE874D400859
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T10:41:26.058Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - plugins
  - symbols
  - typescript
id: REQ-kibi-builtin-ts-symbols
type: req
---
The builtin TypeScript provider must extract declaration symbols with ts-morph, name class methods as Class.method and skip private class members.

## Context

The provider parses each file with ts-morph, reports exported functions, classes and their public methods, names a method after its class, and leaves out members marked private or named with a # prefix, so symbol ids stay stable and private helpers never become traceability anchors.

Carved out of REQ-capability-plugin-builtin-parity-v1, which keeps the rule that the host uses only the builtin providers when kibi.plugins is absent; each child names what one builtin provider decides.

## Source

> Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"
