---
title: Requirement writes carry a complete ledger bound to the exact source text
status: open
semantic_text: Current requirement writes must reject any omitted assertive proposition. Ledger entries must bind to the exact semantic source field, SHA-256 hash, and UTF-8 span. Duplicate claim keys or spans must be rejected. Ambiguity, ontology gaps, or missing interpretations remain explicit unresolved states rather than evidence of consistency. Every modeled proposition must have exactly one logical grounding fact with the same claim key.
semantic_clauses:
  - Current requirement writes must reject any omitted assertive proposition
  - Ledger entries must bind to the exact semantic source field, SHA-256 hash, and UTF-8 span
  - Duplicate claim keys or spans must be rejected
  - Ambiguity, ontology gaps, or missing interpretations remain explicit unresolved states rather than evidence of consistency
  - Every modeled proposition must have exactly one logical grounding fact with the same claim key
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e19aedce5d274461db105aaf5eaa1330512f8930737a9648a1aef7ec4ff8dec5
semantic_inventory:
  - claim_key: CLAIM-7B8BE5762245E3D2
    claim_text: Current requirement writes must reject any omitted assertive proposition
    role: normative
    status: modeled
    span:
      start: 0
      end: 72
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-8F21AE06ED7D0517
    claim_text: Ledger entries must bind to the exact semantic source field, SHA-256 hash, and UTF-8 span
    role: normative
    status: modeled
    span:
      start: 74
      end: 163
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-A726E6BF7D36D2A3
    claim_text: Duplicate claim keys or spans must be rejected
    role: normative
    status: modeled
    span:
      start: 165
      end: 211
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-B779C65EAA6C2BC9
    claim_text: Ambiguity, ontology gaps, or missing interpretations remain explicit unresolved states rather than evidence of consistency
    role: descriptive
    status: modeled
    span:
      start: 213
      end: 335
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-F694202A3C339660
    claim_text: Every modeled proposition must have exactly one logical grounding fact with the same claim key
    role: normative
    status: modeled
    span:
      start: 337
      end: 431
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-7B8BE5762245E3D2
  - CLAIM-8F21AE06ED7D0517
  - CLAIM-A726E6BF7D36D2A3
  - CLAIM-B779C65EAA6C2BC9
  - CLAIM-F694202A3C339660
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T05:25:46.496Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - requirements
  - semantic-inventory
  - ingestion
  - prolog
  - sync
id: REQ-kibi-complete-proposition-ledgers
type: req
---
Current requirement writes must reject any omitted assertive proposition. Ledger entries must bind to the exact semantic source field, SHA-256 hash, and UTF-8 span. Duplicate claim keys or spans must be rejected. Ambiguity, ontology gaps, or missing interpretations remain explicit unresolved states rather than evidence of consistency. Every modeled proposition must have exactly one logical grounding fact with the same claim key.

## Context

Every assertive sentence is either modeled with exactly one grounding fact or left explicitly unresolved, and the ledger names the exact bytes it was taken from.

Proposition ledgers are what lets Kibi prove a requirement from its own words, so a ledger that skips or rebinds a sentence would let a requirement look proved while saying something else.

## Why this changed

Split from REQ-kibi-proposition-complete-ingestion, which held two behaviors: complete, source-bound proposition ledgers on every current requirement write, and the one-time legacy baseline that sync takes before enforcing them. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
