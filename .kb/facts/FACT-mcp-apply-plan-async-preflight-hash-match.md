---
title: An asynchronous kb_apply_plan call must fail as a call error when the approved hash differs from the plan hash
status: active
fact_kind: property_value
subject_key: kibi.bootstrap_apply
property_key: async_apply_hash_match_checked_before_receipt
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-62B606DFCF9EC375
claim_text: An asynchronous kb_apply_plan call must fail as a call error when the approved hash differs from the plan hash
text_ref: REQ-mcp-apply-plan-async-preflight
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-mcp-apply-plan-async-preflight
origin:
  kind: agent
  recorded_at: '2026-10-07T19:01:22.761Z'
id: FACT-mcp-apply-plan-async-preflight-hash-match
type: fact
---
An asynchronous kb_apply_plan call must fail as a call error when the approved hash differs from the plan hash.

Recorded as a strict boolean property of `kibi.bootstrap_apply` so REQ-mcp-apply-plan-async-preflight can be checked for contradictions.
