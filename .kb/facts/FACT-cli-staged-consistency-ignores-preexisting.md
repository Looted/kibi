---
title: The staged check must not block a staged change for a consistency violation that already exists at the base commit
status: active
text_ref: REQ-cli-staged-consistency
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
fact_kind: property_value
subject_key: kibi.cli.check.staged
property_key: blocks_preexisting_consistency_violations
operator: eq
value_type: bool
value_bool: false
claim_key: CLAIM-A303F373E6C1CCCD
claim_text: The staged check must not block a staged change for a consistency violation that already exists at the base commit
origin:
  kind: agent
  recorded_at: '2026-10-06T18:18:36.458Z'
id: FACT-cli-staged-consistency-ignores-preexisting
type: fact
---
