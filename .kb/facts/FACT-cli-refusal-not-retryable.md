---
title: The CLI JSON error envelope must report retryable false when Kibi refuses the call's input or the workspace state, including every KB rejection
status: active
fact_kind: property_value
subject_key: kibi.cli.error_envelope
property_key: refusals_marked_retryable
operator: eq
value_type: int
value_int: 0
claim_text: The CLI JSON error envelope must report retryable false when Kibi refuses the call's input or the workspace state, including every KB rejection
claim_key: CLAIM-FAC6A1BBCF1FCE25
text_ref: REQ-cli-rejection-not-retryable
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-cli-rejection-not-retryable
origin:
  kind: agent
  recorded_at: '2026-11-16T14:40:01.423Z'
id: FACT-cli-refusal-not-retryable
type: fact
---
