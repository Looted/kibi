---
title: An asynchronous plan apply must reject an approved plan hash that differs from the plan before it returns a job receipt
status: active
fact_kind: property_value
subject_key: kibi.bootstrap_apply
property_key: async_apply_hash_match_checked_before_receipt
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-1C7040E31515284C
claim_text: An asynchronous plan apply must reject an approved plan hash that differs from the plan before it returns a job receipt
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
An asynchronous plan apply must reject an approved plan hash that differs from the plan before it returns a job receipt.

Recorded as a strict boolean property of `kibi.bootstrap_apply` so REQ-mcp-apply-plan-async-preflight can be checked for contradictions.
