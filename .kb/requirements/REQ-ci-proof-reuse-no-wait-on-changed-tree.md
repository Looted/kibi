---
title: The proof reuse check runs the full proof at once when the merge changes snapshot files
status: open
priority: should
required_evidence: tested
tags:
  - proof
  - ci
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-17, approving the merge train quick-fix statements: "Ok, also approve for the requirements."'
  approved_by: maintainer
  recorded_at: '2026-11-17T10:51:21.042Z'
rationale: 'A pull request refreshed while develop''s own proof run was still going waited the whole 900-second budget for that run and then ran the full proof anyway, because its changes meant the snapshots could never match; that wait was about 15 of a typical 32-minute pull request proof and made the develop merge train take most of a day for ten pull requests. Comparing the committed snapshots first removes a wait that can never pay off, and it changes no trust decision: reuse still requires an attested develop proof of an identical snapshot.'
semantic_text: The CI proof reuse check runs the full proof without waiting for develop's proof when the committed files of the merge and of the proven commit have different snapshots.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4c5c937faeaf0e08f49ac1046e422248fd06480bfea3935820ef68ad0187b9ea
semantic_inventory:
  - claim_key: CLAIM-4C25FFFAE75B032A
    claim_text: The CI proof reuse check runs the full proof without waiting for develop's proof when the committed files of the merge and of the proven commit have different snapshots
    role: normative
    status: modeled
    span:
      start: 0
      end: 168
logic_claims:
  - CLAIM-4C25FFFAE75B032A
id: REQ-ci-proof-reuse-no-wait-on-changed-tree
type: req
---
The CI proof reuse check runs the full proof without waiting for develop's proof when the committed files of the merge and of the proven commit have different snapshots.

## Context

A pull request refreshed while develop's own proof run was still going waited the whole 900-second budget for that run and then ran the full proof anyway, because its changes meant the snapshots could never match; that wait was about 15 of a typical 32-minute pull request proof and made the develop merge train take most of a day for ten pull requests. Comparing the committed snapshots first removes a wait that can never pay off, and it changes no trust decision: reuse still requires an attested develop proof of an identical snapshot.

## Source

> Maintainer decision, 2026-11-17, approving the merge train quick-fix statements: "Ok, also approve for the requirements."
