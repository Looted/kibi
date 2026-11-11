---
title: kibi.skillopt.paid_launch clause 1
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: kibi.skillopt.paid_launch
property_key: paid_launch_fails_closed
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_skillopt_paid_launch_accounting.paid_launch_fails_closed.eq.true
claim_key: CLAIM-4645F4BEC193D483
claim_text: Paid SkillOpt model launches must fail closed unless the external trust boundary validates immutable authority and supervisor-parent bindings; binds the one-use capability to the exact request ID, request hash, approved pricing, model, and lease; enforces pinned TLS, CA, SNI, IP, egress, request, invoice, and authorization ceilings; and preserves same-request idempotency without cross-request attribution
id: FACT-PROP-REQ-SKILLOPT-PAID-LAUNCH-ACCOUNTING-C01
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
