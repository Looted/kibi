---
title: symbol-coverage sits in the knowledge layer
status: active
fact_kind: property_value
subject_key: kibi.check.rule_selection
property_key: verification_layer_rules
operator: eq
value_type: set
value_set:
  - evidence-floor
  - must-positive-scenario
  - must-priority-coverage
  - proof-contract-claims
  - proof-contract-symbols
text_ref: packages/core/schema/rule-registry.json
tags:
  - negative-path
  - check
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T08:36:16.938Z'
id: FACT-NEG-kibi-check-rule-layers-PROOF-RULE-IN-KNOWLEDGE
type: fact
---
The failure case for rule layers: a rule that asks for tests, symbol-coverage, is left in the knowledge layer, so level Remember would still ask for tests.
