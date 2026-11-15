---
title: Requirement writes carry a complete ledger bound to the exact source text
status: open
semantic_text: A current requirement must not be stored with an assertive proposition of its prose missing from its ledger. Ledger entries must bind to the exact semantic source field, SHA-256 hash, and UTF-8 span. Duplicate claim keys or spans must be rejected. Ambiguity, ontology gaps, or missing interpretations remain explicit unresolved states rather than evidence of consistency. Every modeled proposition must have exactly one logical grounding fact with the same claim key.
semantic_clauses:
  - A current requirement must not be stored with an assertive proposition of its prose missing from its ledger
  - Ledger entries must bind to the exact semantic source field, SHA-256 hash, and UTF-8 span
  - Duplicate claim keys or spans must be rejected
  - Ambiguity, ontology gaps, or missing interpretations remain explicit unresolved states rather than evidence of consistency
  - Every modeled proposition must have exactly one logical grounding fact with the same claim key
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ebcb8e032c1b3ba88252a71920ae8628dd8655285f643cdd0bfe553fdeffccaf
semantic_inventory:
  - claim_key: CLAIM-E3946CB82D15A42A
    claim_text: A current requirement must not be stored with an assertive proposition of its prose missing from its ledger
    role: normative
    status: modeled
    span:
      start: 0
      end: 107
  - claim_key: CLAIM-8F21AE06ED7D0517
    claim_text: Ledger entries must bind to the exact semantic source field, SHA-256 hash, and UTF-8 span
    role: normative
    status: modeled
    span:
      start: 109
      end: 198
  - claim_key: CLAIM-A726E6BF7D36D2A3
    claim_text: Duplicate claim keys or spans must be rejected
    role: normative
    status: modeled
    span:
      start: 200
      end: 246
  - claim_key: CLAIM-B779C65EAA6C2BC9
    claim_text: Ambiguity, ontology gaps, or missing interpretations remain explicit unresolved states rather than evidence of consistency
    role: descriptive
    status: modeled
    span:
      start: 248
      end: 370
  - claim_key: CLAIM-F694202A3C339660
    claim_text: Every modeled proposition must have exactly one logical grounding fact with the same claim key
    role: normative
    status: modeled
    span:
      start: 372
      end: 466
logic_claims:
  - CLAIM-E3946CB82D15A42A
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
A current requirement must not be stored with an assertive proposition of its prose missing from its ledger. Ledger entries must bind to the exact semantic source field, SHA-256 hash, and UTF-8 span. Duplicate claim keys or spans must be rejected. Ambiguity, ontology gaps, or missing interpretations remain explicit unresolved states rather than evidence of consistency. Every modeled proposition must have exactly one logical grounding fact with the same claim key.

## Context

Every assertive sentence is either modeled with exactly one grounding fact or left explicitly unresolved, and the ledger names the exact bytes it was taken from.

Proposition ledgers are what lets Kibi prove a requirement from its own words, so a ledger that skips or rebinds a sentence would let a requirement look proved while saying something else.

## Why this changed

Split from REQ-kibi-proposition-complete-ingestion, which held two behaviors: complete, source-bound proposition ledgers on every current requirement write, and the one-time legacy baseline that sync takes before enforcing them. Each child is one of them, and only the functions that decide each behavior keep their implements links.

The first sentence now says what the store must hold rather than what a write must do: kb_upsert derives the ledger of a requirement written without one, recording claims nobody classified as missing, so a write is refused only when it sends a ledger that does not match its prose. A current requirement still never lands with a proposition left out of its ledger.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"

> Maintainer approval, 2026-11-15, of the reworded first sentence ("A current requirement must not be stored with an assertive proposition of its prose missing from its ledger."): "Approve"
