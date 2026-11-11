---
title: Migration context and semantic text codes
status: open
semantic_text: The missing context tag code shall be context_missing_tag. The semantic text pin code shall be semantic_text_pin. The rederive with dropped grounding code shall be semantic_inventory_rederive_drop_grounding.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f0cadc1055469d3ab2858c08338a87981af3d544a874a76e69e3970aaf604780
semantic_inventory:
  - claim_key: CLAIM-D062BE9E6D27EA1F
    claim_text: The missing context tag code shall be context_missing_tag
    role: normative
    status: modeled
    span:
      start: 0
      end: 57
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-A8F6A8E66D766038
    claim_text: The semantic text pin code shall be semantic_text_pin
    role: normative
    status: modeled
    span:
      start: 59
      end: 112
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-D37EB3FBA38FA2D5
    claim_text: The rederive with dropped grounding code shall be semantic_inventory_rederive_drop_grounding
    role: normative
    status: modeled
    span:
      start: 114
      end: 206
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-D062BE9E6D27EA1F
  - CLAIM-A8F6A8E66D766038
  - CLAIM-D37EB3FBA38FA2D5
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:10:15.258Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - proof
id: REQ-cli-migration-context-codes
type: req
---
The missing context tag code shall be context_missing_tag. The semantic text pin code shall be semantic_text_pin. The rederive with dropped grounding code shall be semantic_inventory_rederive_drop_grounding.

## Context

The entity body context and schema 6 migrations declare these codes.

REQ-cli-schema-migration has kibi migrate pin or acknowledge existing entities when a new check arrives, instead of failing a KB that was valid before. Every such step reports a stable code, superseded requirements close to a fixed status, and symbol coordinates left the manifest with KB schema 13. They are stated here so every value is proved against its constant.

## Why this changed

Split from REQ-cli-migration-pin-codes, which held twelve codes declared by eight migration modules. Each child is the codes of one migration family, so a requirement names the code that owns it.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
