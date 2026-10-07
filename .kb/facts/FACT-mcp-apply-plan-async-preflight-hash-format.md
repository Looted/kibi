---
title: An asynchronous plan apply must reject a missing or malformed approved plan hash before it returns a job receipt
status: active
fact_kind: property_value
subject_key: kibi.bootstrap_apply
property_key: async_apply_hash_format_checked_before_receipt
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-608397CB34D0BA5C
claim_text: An asynchronous plan apply must reject a missing or malformed approved plan hash before it returns a job receipt
text_ref: REQ-mcp-apply-plan-async-preflight
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-mcp-apply-plan-async-preflight
origin:
  kind: agent
  recorded_at: '2026-10-07T19:01:21.342Z'
id: FACT-mcp-apply-plan-async-preflight-hash-format
type: fact
---
An asynchronous plan apply must reject a missing or malformed approved plan hash before it returns a job receipt.

Recorded as a strict boolean property of `kibi.bootstrap_apply` so REQ-mcp-apply-plan-async-preflight can be checked for contradictions.
