---
title: domain-contradictions sits in the verification layer
status: active
fact_kind: property_value
subject_key: kibi.check.rule_selection
property_key: verification_layer_rules
operator: includes
value_type: set
value_set:
  - domain-contradictions
text_ref: packages/core/schema/rule-registry.json
tags:
  - negative-path
  - check
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T08:36:19.051Z'
id: FACT-CASE-kibi-check-rule-layers-KNOWLEDGE-RULE-IN-VERIFICATION
type: fact
---
The failure case for rule layers: a knowledge rule, domain-contradictions, is placed in the verification layer, so level Remember would stop checking contradictions.
