---
title: No catalog operation lacks a budget declaration
status: active
fact_kind: property_value
subject_key: kibi.operation_result
property_key: undeclared_catalog_operations
operator: eq
value_type: int
value_int: 0
tags:
  - lane:strict
  - fact:property_value
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
claim_key: CLAIM-65ED34B69518029E
claim_text: Every operation in the catalog must declare how its result is kept to the size budget
text_ref: REQ-result-budget-declared
id: FACT-result-budget-declared
type: fact
---
Each operation in the catalog has a result budget declaration, and a fitted or bounded one states its reason. Grounds the clause of REQ-result-budget-declared.