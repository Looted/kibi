---
title: Migration pin and acknowledgement codes
status: open
priority: must
firmness: firm
semantic_text: The missing context tag code shall be context_missing_tag. The semantic text pin code shall be semantic_text_pin. The evidence floor pin code shall be evidence_floor_pin. The firm supersede acknowledgement code shall be firm_supersede_acknowledge. The proof contract claims pin code shall be proof_contract_claims_pin. The proof contract claims review code shall be proof_contract_claims_review. The rederive with dropped grounding code shall be semantic_inventory_rederive_drop_grounding. The supersedes reason acknowledgement code shall be supersedes_reason_acknowledge. The legacy symbol link mark action id shall be symbol-legacy-link-mark. The legacy symbol link mark code shall be symbol_legacy_link_mark. A superseded requirement shall close with status closed. Derived symbol coordinates shall start at KB schema version 13.
semantic_clauses:
  - The missing context tag code shall be context_missing_tag.
  - The semantic text pin code shall be semantic_text_pin.
  - The evidence floor pin code shall be evidence_floor_pin.
  - The firm supersede acknowledgement code shall be firm_supersede_acknowledge.
  - The proof contract claims pin code shall be proof_contract_claims_pin.
  - The proof contract claims review code shall be proof_contract_claims_review.
  - The rederive with dropped grounding code shall be semantic_inventory_rederive_drop_grounding.
  - The supersedes reason acknowledgement code shall be supersedes_reason_acknowledge.
  - The legacy symbol link mark action id shall be symbol-legacy-link-mark.
  - The legacy symbol link mark code shall be symbol_legacy_link_mark.
  - A superseded requirement shall close with status closed.
  - Derived symbol coordinates shall start at KB schema version 13.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T20:29:36.383Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b094469c13dd6e69b50167b49dfcb96ea88fabe5f8a53f6f0c64126dbdfdc946
semantic_inventory:
  - claim_key: CLAIM-D062BE9E6D27EA1F
    claim_text: The missing context tag code shall be context_missing_tag
    role: normative
    status: modeled
    span:
      start: 0
      end: 57
  - claim_key: CLAIM-A8F6A8E66D766038
    claim_text: The semantic text pin code shall be semantic_text_pin
    role: normative
    status: modeled
    span:
      start: 59
      end: 112
  - claim_key: CLAIM-9EFFBF69BC9516AC
    claim_text: The evidence floor pin code shall be evidence_floor_pin
    role: normative
    status: modeled
    span:
      start: 114
      end: 169
  - claim_key: CLAIM-5E5165DB903B6897
    claim_text: The firm supersede acknowledgement code shall be firm_supersede_acknowledge
    role: normative
    status: modeled
    span:
      start: 171
      end: 246
  - claim_key: CLAIM-B00B92DBDAF79B88
    claim_text: The proof contract claims pin code shall be proof_contract_claims_pin
    role: normative
    status: modeled
    span:
      start: 248
      end: 317
  - claim_key: CLAIM-DE4BC3D13ADA09E6
    claim_text: The proof contract claims review code shall be proof_contract_claims_review
    role: normative
    status: modeled
    span:
      start: 319
      end: 394
  - claim_key: CLAIM-D37EB3FBA38FA2D5
    claim_text: The rederive with dropped grounding code shall be semantic_inventory_rederive_drop_grounding
    role: normative
    status: modeled
    span:
      start: 396
      end: 488
  - claim_key: CLAIM-9D285E495E7AAEE0
    claim_text: The supersedes reason acknowledgement code shall be supersedes_reason_acknowledge
    role: normative
    status: modeled
    span:
      start: 490
      end: 571
  - claim_key: CLAIM-AE6690A5E75ECDEF
    claim_text: The legacy symbol link mark action id shall be symbol-legacy-link-mark
    role: normative
    status: modeled
    span:
      start: 573
      end: 643
  - claim_key: CLAIM-8265F23C3E6C3DC2
    claim_text: The legacy symbol link mark code shall be symbol_legacy_link_mark
    role: normative
    status: modeled
    span:
      start: 645
      end: 710
  - claim_key: CLAIM-DD9D88701148517A
    claim_text: A superseded requirement shall close with status closed
    role: normative
    status: modeled
    span:
      start: 712
      end: 767
  - claim_key: CLAIM-6C377382E2EA545C
    claim_text: Derived symbol coordinates shall start at KB schema version 13
    role: normative
    status: modeled
    span:
      start: 769
      end: 831
logic_claims:
  - CLAIM-D062BE9E6D27EA1F
  - CLAIM-A8F6A8E66D766038
  - CLAIM-9EFFBF69BC9516AC
  - CLAIM-5E5165DB903B6897
  - CLAIM-B00B92DBDAF79B88
  - CLAIM-DE4BC3D13ADA09E6
  - CLAIM-D37EB3FBA38FA2D5
  - CLAIM-9D285E495E7AAEE0
  - CLAIM-AE6690A5E75ECDEF
  - CLAIM-8265F23C3E6C3DC2
  - CLAIM-DD9D88701148517A
  - CLAIM-6C377382E2EA545C
id: REQ-cli-migration-pin-codes
type: req
---
The missing context tag code shall be context_missing_tag. The semantic text pin code shall be semantic_text_pin. The evidence floor pin code shall be evidence_floor_pin. The firm supersede acknowledgement code shall be firm_supersede_acknowledge. The proof contract claims pin code shall be proof_contract_claims_pin. The proof contract claims review code shall be proof_contract_claims_review. The rederive with dropped grounding code shall be semantic_inventory_rederive_drop_grounding. The supersedes reason acknowledgement code shall be supersedes_reason_acknowledge. The legacy symbol link mark action id shall be symbol-legacy-link-mark. The legacy symbol link mark code shall be symbol_legacy_link_mark. A superseded requirement shall close with status closed. Derived symbol coordinates shall start at KB schema version 13.

## Context

REQ-cli-schema-migration has kibi migrate pin or acknowledge existing entities when a new check arrives, instead of failing a KB that was valid before. Every such step reports a stable code, superseded requirements close to a fixed status, and symbol coordinates left the manifest with KB schema 13. They are stated here so every value is proved against its constant.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"