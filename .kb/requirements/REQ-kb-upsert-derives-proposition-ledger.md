---
title: kb_upsert derives a requirement's ledger from its prose and takes only the writer's judgment
status: open
priority: must
required_evidence: tested
tags:
  - mutation
  - modeling
  - mcp
semantic_text: kb_upsert must derive a requirement's ledger from its prose when the inventory check would refuse the write and the write sends none of semantic_inventory_version, semantic_source_field, semantic_source_hash and logic_claims. A derived claim must be modeled only when a grounding link of the write targets a fact with its claim key. An unlinked derived claim must keep the status and subjects the write's semantic_inventory gives its claim key, otherwise those the stored ledger gives it. An assertive claim that neither classifies must be recorded as missing. A semantic_inventory entry whose claim key the prose does not state must be refused. A write that sends any of those four fields must be checked exactly as sent. A write the inventory check accepts must not be changed. The kb_upsert result must list each recorded claim's key, role, status and text. A committed kb_upsert must report the semantic advisor's verdict without its per-clause analysis.
semantic_clauses:
  - kb_upsert must derive a requirement's ledger from its prose when the inventory check would refuse the write and the write sends none of semantic_inventory_version, semantic_source_field, semantic_source_hash and logic_claims.
  - A derived claim must be modeled only when a grounding link of the write targets a fact with its claim key.
  - An unlinked derived claim must keep the status and subjects the write's semantic_inventory gives its claim key, otherwise those the stored ledger gives it.
  - An assertive claim that neither classifies must be recorded as missing.
  - A semantic_inventory entry whose claim key the prose does not state must be refused.
  - A write that sends any of those four fields must be checked exactly as sent.
  - A write the inventory check accepts must not be changed.
  - The kb_upsert result must list each recorded claim's key, role, status and text.
  - A committed kb_upsert must report the semantic advisor's verdict without its per-clause analysis.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c67178a30bc1cf1c373a7b4ec5f209f3cd385468edc102049bbd336cee4bbed4
semantic_inventory:
  - claim_key: CLAIM-DFAD8D2664586FA4
    claim_text: kb_upsert must derive a requirement's ledger from its prose when the inventory check would refuse the write and the write sends none of semantic_inventory_version, semantic_source_field, semantic_source_hash and logic_claims
    role: normative
    status: modeled
    span:
      start: 0
      end: 224
  - claim_key: CLAIM-320FA9B472C8536C
    claim_text: A derived claim must be modeled only when a grounding link of the write targets a fact with its claim key
    role: normative
    status: modeled
    span:
      start: 226
      end: 331
  - claim_key: CLAIM-792E2230970DA3EA
    claim_text: An unlinked derived claim must keep the status and subjects the write's semantic_inventory gives its claim key, otherwise those the stored ledger gives it
    role: normative
    status: modeled
    span:
      start: 333
      end: 487
  - claim_key: CLAIM-74D484FCBBD1C6AE
    claim_text: An assertive claim that neither classifies must be recorded as missing
    role: normative
    status: modeled
    span:
      start: 489
      end: 559
  - claim_key: CLAIM-01E7AD7D17C4A5B9
    claim_text: A semantic_inventory entry whose claim key the prose does not state must be refused
    role: normative
    status: modeled
    span:
      start: 561
      end: 644
  - claim_key: CLAIM-1167F83F7F0C32E7
    claim_text: A write that sends any of those four fields must be checked exactly as sent
    role: normative
    status: modeled
    span:
      start: 646
      end: 721
  - claim_key: CLAIM-F3BBBE3D1887163C
    claim_text: A write the inventory check accepts must not be changed
    role: normative
    status: modeled
    span:
      start: 723
      end: 778
  - claim_key: CLAIM-3AD3F86F4349CD65
    claim_text: The kb_upsert result must list each recorded claim's key, role, status and text
    role: normative
    status: modeled
    span:
      start: 780
      end: 859
  - claim_key: CLAIM-2204E041726276CF
    claim_text: A committed kb_upsert must report the semantic advisor's verdict without its per-clause analysis
    role: normative
    status: modeled
    span:
      start: 861
      end: 957
logic_claims:
  - CLAIM-DFAD8D2664586FA4
  - CLAIM-320FA9B472C8536C
  - CLAIM-792E2230970DA3EA
  - CLAIM-74D484FCBBD1C6AE
  - CLAIM-01E7AD7D17C4A5B9
  - CLAIM-1167F83F7F0C32E7
  - CLAIM-F3BBBE3D1887163C
  - CLAIM-3AD3F86F4349CD65
  - CLAIM-2204E041726276CF
origin:
  kind: agent
  approved_by: maintainer
  recorded_at: '2026-11-15T20:20:32.420Z'
rationale: Agents sent requirement writes without the ledger, were refused with the derived contract, and resent the whole payload; echoing the claim keys, spans and hash was copying, not judgment.
id: REQ-kb-upsert-derives-proposition-ledger
type: req
---
kb_upsert must derive a requirement's ledger from its prose when the inventory check would refuse the write and the write sends none of semantic_inventory_version, semantic_source_field, semantic_source_hash and logic_claims. A derived claim must be modeled only when a grounding link of the write targets a fact with its claim key. An unlinked derived claim must keep the status and subjects the write's semantic_inventory gives its claim key, otherwise those the stored ledger gives it. An assertive claim that neither classifies must be recorded as missing. A semantic_inventory entry whose claim key the prose does not state must be refused. A write that sends any of those four fields must be checked exactly as sent. A write the inventory check accepts must not be changed. The kb_upsert result must list each recorded claim's key, role, status and text. A committed kb_upsert must report the semantic advisor's verdict without its per-clause analysis.

## Context

A requirement write had to carry its whole proposition ledger. When it did not, kb_upsert computed the correct contract, refused the write and printed the contract, so the agent resent the entire payload with the contract pasted in. That round trip was a top cause of failed kb_upsert calls and of their cost. The claim keys, spans, source hash and logic claims follow from the prose, so echoing them was copying, not judgment. Kibi now derives that part, and the writer supplies only its judgment: a claim's status and subjects. A claim the writer links is modeled; a claim nobody classified is recorded as missing rather than as the advisor's guess, so the KB still says no one has looked at it and the rules that block unmodeled claims still apply. The advisor's reading is returned as a hint. A write that sends the contract keeps the strict check, which still catches a stale view of the prose.

## Source

Maintainer-approved statement (2026-11-15): "kb_upsert must derive a requirement's ledger from its prose when the inventory check would refuse the write and the write sends none of semantic_inventory_version, semantic_source_field, semantic_source_hash and logic_claims. A derived claim must be modeled only when a grounding link of the write targets a fact with its claim key. An unlinked derived claim must keep the status and subjects the write's semantic_inventory gives its claim key, otherwise those the stored ledger gives it. An assertive claim that neither classifies must be recorded as missing. A semantic_inventory entry whose claim key the prose does not state must be refused. A write that sends any of those four fields must be checked exactly as sent. A write the inventory check accepts must not be changed. The kb_upsert result must list each recorded claim's key, role, status and text. A committed kb_upsert must report the semantic advisor's verdict without its per-clause analysis."