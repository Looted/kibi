---
title: Kibi rejects a proof contract, proof bindings or proof run artifact that does not match its published schema, naming each error
status: open
semantic_text: Kibi must reject a proof contract, proof bindings document or proof run artifact that does not match its published schema, naming each error.
semantic_clauses:
  - Kibi must reject a proof contract, proof bindings document or proof run artifact that does not match its published schema, naming each error
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 09198fbe08d54a13ab4f1dcc36f5ae31de7c570796a1cad5b65a39c3d3c99b0d
semantic_inventory:
  - claim_key: CLAIM-86144353209FD2C5
    claim_text: Kibi must reject a proof contract, proof bindings document or proof run artifact that does not match its published schema, naming each error
    role: normative
    status: modeled
    span:
      start: 0
      end: 140
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-86144353209FD2C5
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T11:19:53.537Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - proof
  - schema
id: REQ-kibi-proof-protocol-schemas
type: req
---
Kibi must reject a proof contract, proof bindings document or proof run artifact that does not match its published schema, naming each error.

## Context

Sync validates a test's proof_contract and proof_bindings against the published kibi.proof-contract.v1 and bindings schemas and reports the schema errors; kibi prove validates each producer's artifact against kibi.proof-run.v1 before evaluating it, so a malformed document can never yield a receipt.

Carved out of REQ-kibi-verification-evidence-contract, which keeps the proof receipt contract as a whole; each child names one decision around it.

## Source

> Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"
