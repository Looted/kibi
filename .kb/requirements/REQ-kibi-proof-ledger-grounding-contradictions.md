---
title: A proven requirement has a complete ledger, one grounding per proposition and no contradictions
status: open
semantic_text: A proven requirement must have a complete proposition ledger with no unresolved assertive entries. Every modeled proposition must have exactly one valid logical grounding. Contradiction analysis must not report a clear outcome while logical grounding is incomplete. Every detected contradiction must block proof.
semantic_clauses:
  - A proven requirement must have a complete proposition ledger with no unresolved assertive entries
  - Every modeled proposition must have exactly one valid logical grounding
  - Contradiction analysis must not report a clear outcome while logical grounding is incomplete
  - Every detected contradiction must block proof
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 22a2bfb75044ba8594a846681b90436efe19e48b6a5f2de437319c49516068ef
semantic_inventory:
  - claim_key: CLAIM-FA450AC4EF93F78C
    claim_text: A proven requirement must have a complete proposition ledger with no unresolved assertive entries
    role: normative
    status: modeled
    span:
      start: 0
      end: 97
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-AFD4D2B6803EA1B3
    claim_text: Every modeled proposition must have exactly one valid logical grounding
    role: normative
    status: modeled
    span:
      start: 99
      end: 170
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-F98FF1D58B960443
    claim_text: Contradiction analysis must not report a clear outcome while logical grounding is incomplete
    role: normative
    status: modeled
    span:
      start: 172
      end: 264
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-78DCDEACB0D210A3
    claim_text: Every detected contradiction must block proof
    role: normative
    status: modeled
    span:
      start: 266
      end: 311
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-FA450AC4EF93F78C
  - CLAIM-AFD4D2B6803EA1B3
  - CLAIM-F98FF1D58B960443
  - CLAIM-78DCDEACB0D210A3
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T08:17:13.583Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - requirements
  - proof
  - semantic-inventory
  - contradictions
id: REQ-kibi-proof-ledger-grounding-contradictions
type: req
---
A proven requirement must have a complete proposition ledger with no unresolved assertive entries. Every modeled proposition must have exactly one valid logical grounding. Contradiction analysis must not report a clear outcome while logical grounding is incomplete. Every detected contradiction must block proof.

## Context

A requirement whose words are not fully modeled, or whose model contradicts itself, has nothing sound to prove, so those stages gate everything after them.

Proof status is what other repositories read to trust a requirement, so it must never be granted on structure alone or on evidence that does not reach the requirement's own words and code.

## Why this changed

Split from REQ-kibi-conservative-requirement-proof, which held three behaviors: the ledger, grounding and contradiction stages; the end-to-end evidence chain; and reporting the proof outcome apart from structural coverage with ranked repairs. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
