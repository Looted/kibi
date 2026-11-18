---
title: The staged gate keeps its scratch store in memory and judges only staged proofs
status: open
priority: must
required_evidence: tested
semantic_text: kibi check --staged must not save its temporary knowledge base to disk after each write while it projects the staged entities, and must evaluate the evidence floor only for the requirements the commit stages.
tags:
  - check
  - staged
  - performance
origin:
  kind: agent
  recorded_at: '2026-11-16T18:30:00.000Z'
  ref: 'Measured on Kibi''s own repository, 2026-11-16: kibi check --staged on a one-function change took 7m17s, 419s of it projecting the staged KB into a scratch store saved to disk after every batch. Maintainer decision, 2026-11-16, approving this statement as worded.'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 477875d3b0d5e93e0364251072351bf8fcdcc668b4ffa1d421ef0117f1a71fda
semantic_inventory:
  - claim_key: CLAIM-2FF198CFDA282705
    claim_text: kibi check --staged must not save its temporary knowledge base to disk after each write while it projects the staged entities, and must evaluate the evidence floor only for the requirements the commit stages
    role: normative
    status: modeled
    span:
      start: 0
      end: 207
logic_claims:
  - CLAIM-2FF198CFDA282705
id: REQ-staged-gate-scratch-store
type: req
---
kibi check --staged must not save its temporary knowledge base to disk after each write while it projects the staged entities, and must evaluate the evidence floor only for the requirements the commit stages.

## Why

On Kibi's own repository kibi check --staged took 7m17s on a one-function change, 419s of it projecting the staged knowledge base into a temporary store: every batch of 128 writes was followed by a save that rewrote the whole store, so the cost grew with the square of the store's size (8,457 entities, 21,518 relationships). The staged evidence floor then evaluated every requirement's proof in a cold copy and hit the 120 s query timeout. The gate is only useful in the loop if it answers in under a minute.

## Context

The temporary stores are created with saveAfterWrites: false, so writes stay in the process that queries them; an explicit kb_save still saves. The evidence floor takes the staged requirement ids and evaluates only those (discovery:evidence_floor_json/7 with ids([...])). The same one-function change now takes 47.7s with an identical verdict.

## Source

> Measured on Kibi's own repository, 2026-11-16: kibi check --staged on a one-function change took 7m17s, 419s of it projecting the staged KB into a scratch store saved to disk after every batch.