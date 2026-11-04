---
title: Migration supersession codes
status: open
semantic_text: The firm supersede acknowledgement code shall be firm_supersede_acknowledge. The supersedes reason acknowledgement code shall be supersedes_reason_acknowledge. A superseded requirement shall close with status closed.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b5043138407d9097c05ef807650505abfa96c035b4c079cca71db366ae460db6
semantic_inventory:
  - claim_key: CLAIM-5E5165DB903B6897
    claim_text: The firm supersede acknowledgement code shall be firm_supersede_acknowledge
    role: normative
    status: modeled
    span:
      start: 0
      end: 75
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-9D285E495E7AAEE0
    claim_text: The supersedes reason acknowledgement code shall be supersedes_reason_acknowledge
    role: normative
    status: modeled
    span:
      start: 77
      end: 158
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-DD9D88701148517A
    claim_text: A superseded requirement shall close with status closed
    role: normative
    status: modeled
    span:
      start: 160
      end: 215
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-5E5165DB903B6897
  - CLAIM-9D285E495E7AAEE0
  - CLAIM-DD9D88701148517A
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:11:01.624Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - proof
id: REQ-cli-migration-supersession-codes
type: req
---
The firm supersede acknowledgement code shall be firm_supersede_acknowledge. The supersedes reason acknowledgement code shall be supersedes_reason_acknowledge. A superseded requirement shall close with status closed.

## Context

The firm supersede, supersedes reason and superseded closure migrations declare these values.

REQ-cli-schema-migration has kibi migrate pin or acknowledge existing entities when a new check arrives, instead of failing a KB that was valid before. Every such step reports a stable code, superseded requirements close to a fixed status, and symbol coordinates left the manifest with KB schema 13. They are stated here so every value is proved against its constant.

## Why this changed

Split from REQ-cli-migration-pin-codes, which held twelve codes declared by eight migration modules. Each child is the codes of one migration family, so a requirement names the code that owns it.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
