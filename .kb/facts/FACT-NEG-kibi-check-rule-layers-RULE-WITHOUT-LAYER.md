---
title: A check rule in the registry declares no layer
status: active
fact_kind: property_value
subject_key: kibi.check.rule_selection
property_key: rules_without_layer
operator: eq
value_type: int
value_int: 1
text_ref: packages/core/schema/rule-registry.json
tags:
  - negative-path
  - check
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T08:36:14.803Z'
id: FACT-NEG-kibi-check-rule-layers-RULE-WITHOUT-LAYER
type: fact
---
The failure case for rule layers: a registry rule declares no layer, which the requirement forbids.
