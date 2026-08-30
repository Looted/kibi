---
title: Check failure exits non-zero with violation logs
status: active
tags:
  - strict-modeling
  - cli
  - check
text_ref: .kb/requirements/REQ-cli-check.md
fact_kind: property_value
subject_key: kibi.check
property_key: failure_exit_code
operator: gte
value_type: int
value_int: 1
unit: exit_code
polarity: require
claim_key: CLAIM-F0BB0D90E442DB1A
claim_text: Failure results in a non-zero exit code and descriptive violation logs
id: FACT-PROP-CHECK-FAILURE-EXIT-CODE
type: fact
---
