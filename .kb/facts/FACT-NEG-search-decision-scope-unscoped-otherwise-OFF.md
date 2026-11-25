---
title: 'Forbidden: a decision outside every tier is dropped'
status: active
fact_kind: property_value
subject_key: kibi.search.decision_scope
property_key: unscoped_otherwise
operator: eq
value_type: bool
value_bool: false
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-25T14:35:16.488Z'
id: FACT-NEG-search-decision-scope-unscoped-otherwise-OFF
type: fact
---
A decision with no scope evidence, such as a freshly recorded rule, must still have a tier so it can be ranked.