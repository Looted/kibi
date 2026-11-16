---
title: Kibi must report a Prolog permission error that is not a branch-store lock with its operation, resource and context
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T09:59:28.210Z'
subject_key: kibi.prolog.permission_errors
property_key: named_refusals_shown_as_access_denied
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-4B9E5C0184D9B32E
claim_text: Kibi must report a Prolog permission error that is not a branch-store lock with its operation, resource and context, instead of "Access denied or KB locked"
text_ref: REQ-prolog-permission-error-names-refusal
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-prolog-permission-error-names-refusal
id: FACT-prolog-permission-error-names-refusal
type: fact
---
Counts permission errors with a plain operation and resource kind that are still shown only as "Access denied or KB locked"; zero means each names what Prolog refused.