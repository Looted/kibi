---
title: Proof needs a scenario-backed passing end-to-end test that covers the requirement's located code
status: open
semantic_text: Proof requires a requirement-specified scenario with passing end-to-end test evidence. Every qualifying end-to-end test must have executable test symbols linked through executable_for. Every proof-bearing production symbol must implement the requirement. Every proof-bearing production symbol must be covered by a qualifying end-to-end test. Every proof-bearing symbol must resolve to exact current source coordinates.
semantic_clauses:
  - Proof requires a requirement-specified scenario with passing end-to-end test evidence
  - Every qualifying end-to-end test must have executable test symbols linked through executable_for
  - Every proof-bearing production symbol must implement the requirement
  - Every proof-bearing production symbol must be covered by a qualifying end-to-end test
  - Every proof-bearing symbol must resolve to exact current source coordinates
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5a3e3ba10c70d6980d9cada0fa5c9e6e358b48bd79e058d769837d6b775e192a
semantic_inventory:
  - claim_key: CLAIM-BE38830D1474567E
    claim_text: Proof requires a requirement-specified scenario with passing end-to-end test evidence
    role: normative
    status: modeled
    span:
      start: 0
      end: 85
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-C87C17E9A5586B23
    claim_text: Every qualifying end-to-end test must have executable test symbols linked through executable_for
    role: normative
    status: modeled
    span:
      start: 87
      end: 183
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-C716C2DA63A93BDF
    claim_text: Every proof-bearing production symbol must implement the requirement
    role: normative
    status: modeled
    span:
      start: 185
      end: 253
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-540E9376529E8B19
    claim_text: Every proof-bearing production symbol must be covered by a qualifying end-to-end test
    role: normative
    status: modeled
    span:
      start: 255
      end: 340
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-6D6D5B50042B3F58
    claim_text: Every proof-bearing symbol must resolve to exact current source coordinates
    role: normative
    status: modeled
    span:
      start: 342
      end: 417
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-BE38830D1474567E
  - CLAIM-C87C17E9A5586B23
  - CLAIM-C716C2DA63A93BDF
  - CLAIM-540E9376529E8B19
  - CLAIM-6D6D5B50042B3F58
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T08:17:35.017Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - requirements
  - proof
  - e2e
  - traceability
id: REQ-kibi-proof-e2e-evidence-chain
type: req
---
Proof requires a requirement-specified scenario with passing end-to-end test evidence. Every qualifying end-to-end test must have executable test symbols linked through executable_for. Every proof-bearing production symbol must implement the requirement. Every proof-bearing production symbol must be covered by a qualifying end-to-end test. Every proof-bearing symbol must resolve to exact current source coordinates.

## Context

Every link from scenario to test to executable test symbol to located production code must hold, so a unit-only chain or an unlocated symbol can never stand in for end-to-end evidence.

Proof status is what other repositories read to trust a requirement, so it must never be granted on structure alone or on evidence that does not reach the requirement's own words and code.

## Why this changed

Split from REQ-kibi-conservative-requirement-proof, which held three behaviors: the ledger, grounding and contradiction stages; the end-to-end evidence chain; and reporting the proof outcome apart from structural coverage with ranked repairs. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
