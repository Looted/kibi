---
title: ADR temporal inference and missing-successor enforcement
status: active
tags:
  - lane:ontology
  - adr
  - temporal
  - inference
  - validation
fact_kind: predicate
predicate_name: adr_temporal_inference_contract
predicate_namespace: kibi.adr
predicate_args:
  - current_adr_1
  - adr_chain_2
  - superseded_by_2
  - flag_superseded_or_deprecated_adr_without_successor
canonical_key: adr_temporal_inference_contract(current_adr_1,adr_chain_2,superseded_by_2,flag_superseded_or_deprecated_adr_without_successor)
polarity: assert
claim_key: CLAIM-A5530CE3058B5AB6
claim_text: Inference rules expose current_adr/1, adr_chain/2, and superseded_by/2. kibi check flags superseded/deprecated ADRs with no successor
text_ref: documentation/requirements/REQ-016.md
id: FACT-PRED-ADR-TEMPORAL-INFERENCE-CONTRACT
type: fact
---
