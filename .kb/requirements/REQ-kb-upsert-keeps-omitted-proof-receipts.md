---
title: A test update that omits its proof receipts keeps them
status: open
required_evidence: tested
priority: must
tags:
  - kb
  - upsert
firmness: default
semantic_text: Kibi kb_upsert must keep the stored proof_receipts, verification_scope and verification_perspective of a test when an update of that test omits them.
semantic_clauses:
  - Kibi kb_upsert must keep the stored proof_receipts, verification_scope and verification_perspective of a test when an update of that test omits them
logic_claims:
  - CLAIM-7157142B426B6A8F
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e993718aefc94e898d1ea413a5349509a760df3f07d707ff66aa79440911d9d7
semantic_inventory:
  - claim_key: CLAIM-7157142B426B6A8F
    claim_text: Kibi kb_upsert must keep the stored proof_receipts, verification_scope and verification_perspective of a test when an update of that test omits them
    role: normative
    status: modeled
    span:
      start: 0
      end: 148
origin:
  kind: agent
  recorded_at: '2026-10-14T17:11:12.686Z'
id: REQ-kb-upsert-keeps-omitted-proof-receipts
type: req
---
Kibi kb_upsert must keep the stored proof_receipts, verification_scope and verification_perspective of a test when an update of that test omits them.

## Context

In a benchmark on Kibi's own repository, agents that sent a partial kb_upsert for an existing test (a title or link change) were refused because the update omitted proof_receipts, and the append-only check read the omission as removal. Every other property an update leaves out is kept, so the refusal contradicted the documented update contract and cost each agent a retry. Requested by the project owner after the benchmark report.
