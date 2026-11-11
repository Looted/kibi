---
title: Migration proof codes
status: open
semantic_text: The evidence floor pin code shall be evidence_floor_pin. The proof contract claims pin code shall be proof_contract_claims_pin. The proof contract claims review code shall be proof_contract_claims_review.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 991873e67928a4c9b2bd622fe173dc97b260e92f75f1281c0e0481fde93c4f51
semantic_inventory:
  - claim_key: CLAIM-9EFFBF69BC9516AC
    claim_text: The evidence floor pin code shall be evidence_floor_pin
    role: normative
    status: modeled
    span:
      start: 0
      end: 55
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-B00B92DBDAF79B88
    claim_text: The proof contract claims pin code shall be proof_contract_claims_pin
    role: normative
    status: modeled
    span:
      start: 57
      end: 126
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-DE4BC3D13ADA09E6
    claim_text: The proof contract claims review code shall be proof_contract_claims_review
    role: normative
    status: modeled
    span:
      start: 128
      end: 203
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-9EFFBF69BC9516AC
  - CLAIM-B00B92DBDAF79B88
  - CLAIM-DE4BC3D13ADA09E6
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:10:38.611Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - proof
id: REQ-cli-migration-proof-codes
type: req
---
The evidence floor pin code shall be evidence_floor_pin. The proof contract claims pin code shall be proof_contract_claims_pin. The proof contract claims review code shall be proof_contract_claims_review.

## Context

The evidence floor and proof contract claims migrations declare these codes.

REQ-cli-schema-migration has kibi migrate pin or acknowledge existing entities when a new check arrives, instead of failing a KB that was valid before. Every such step reports a stable code, superseded requirements close to a fixed status, and symbol coordinates left the manifest with KB schema 13. They are stated here so every value is proved against its constant.

## Why this changed

Split from REQ-cli-migration-pin-codes, which held twelve codes declared by eight migration modules. Each child is the codes of one migration family, so a requirement names the code that owns it.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
