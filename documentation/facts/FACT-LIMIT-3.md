---
id: FACT-LIMIT-3
title: Maximum of Three
status: active
created_at: 2026-02-20T13:00:00.000Z
updated_at: 2026-04-21T10:00:00.000Z
source: documentation/facts/FACT-LIMIT-3.md
tags:
  - cardinality
fact_kind: property_value
subject_key: user.role_assignment
property_key: max_roles
operator: lte
value_type: int
value_int: 3
claim_key: CLAIM-98894A8EFEF6D61C
claim_text: allowing the new constraint (maximum of 3 roles) to take precedence while maintaining a clear audit trail
claim_span_start: 238
claim_span_end: 343
type: fact
---

A strict upper bound of at most 3 items.
As a `property_value` fact in the strict lane, it provides machine-interpretable
semantics for requirements that must enforce specific limits on the `user.role_assignment` subject.
