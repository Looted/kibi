---
title: Paid SkillOpt model launches must fail closed unless the external trust boundary
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: req.req_skillopt_paid_launch_accounting
property_key: clause_01_paid_skillopt_model_launches_must_fail_closed_un
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_skillopt_paid_launch_accounting.clause_01_paid_skillopt_model_launches_must_fail_closed_un.eq.true
claim_key: CLAIM-576BF8BC10A10142
claim_text: Paid SkillOpt model launches must fail closed unless the external trust boundary validates immutable authority and supervisor-parent bindings; binds each one-use capability to the exact request ID, request hash, approved pricing, model, and lease; enforces pinned TLS, CA, SNI, IP, egress, request, invoice, and authorization ceilings; and preserves same-request idempotency without cross-request attribution.\n\nEvery accepted launch must produce strict typed debit-subentry, final debit/reconciliation, and final-verdict receipts
id: FACT-PROP-REQ-SKILLOPT-PAID-LAUNCH-ACCOUNTING-C01
type: fact
---
