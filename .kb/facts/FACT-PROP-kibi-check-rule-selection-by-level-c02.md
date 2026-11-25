---
title: A plain kibi check runs the canonical and advisory rules of the verification layer only at Kibi level test
status: active
fact_kind: property_value
subject_key: kibi.check.rule_selection
property_key: verification_rules_run_only_at_level_test
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-8DAC8A9FD5263C20
claim_text: A plain kibi check must run the canonical and advisory rules of the verification layer only when the project's Kibi level is test
text_ref: packages/cli/src/utils/rule-registry.ts
tags:
  - check
  - rules
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T09:44:43.233Z'
id: FACT-PROP-kibi-check-rule-selection-by-level-c02
type: fact
---
A plain kibi check must run the canonical and advisory rules of the verification layer only when the project's Kibi level is test.
