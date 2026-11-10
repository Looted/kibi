---
title: A proof receipt records an effective fingerprint of the proof contract and the integration's command, bindings and producer, with a separate canonical environment hash
status: open
semantic_text: A proof receipt must record an effective fingerprint of the proof contract and the integration's command, bindings and producer, together with a hash of the canonical environment.
semantic_clauses:
  - A proof receipt must record an effective fingerprint of the proof contract and the integration's command, bindings and producer, together with a hash of the canonical environment
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d67defa6f6b0165540bb46f7fd96899e9bd6388442eb6c3aa20fdfaa2b58a508
semantic_inventory:
  - claim_key: CLAIM-7E35FBA26A82501A
    claim_text: A proof receipt must record an effective fingerprint of the proof contract and the integration's command, bindings and producer, together with a hash of the canonical environment
    role: normative
    status: modeled
    span:
      start: 0
      end: 178
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-7E35FBA26A82501A
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-10, approving the reworded children in the KB gold-standard review (batch 5 rewordings): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T14:42:33.243Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - proof
  - receipts
id: REQ-kibi-proof-fingerprint
type: req
---
A proof receipt must record an effective fingerprint of the proof contract and the integration's command, bindings and producer, together with a hash of the canonical environment.

## Context

The effective fingerprint hashes the proof contract, the integration's execution projection, the exact command, the normalized bindings and the producer, and keeps each component digest so a later run can tell which one changed. Cosmetic metadata is left out, so editing a description never stales proof. The canonical environment (runtime, platform and tool versions Kibi inspects itself) is hashed separately as environment_hash next to the fingerprint, not inside it. A receipt missing either is not a valid receipt.

Carved out of REQ-kibi-verification-evidence-contract, which keeps how proof obligations, test symbols and fresh receipts fit together; this child names what a receipt records about the execution it came from.

## Source

> Maintainer decision, 2026-11-10, approving the reworded children in the KB gold-standard review (batch 5 rewordings): "Ok"
