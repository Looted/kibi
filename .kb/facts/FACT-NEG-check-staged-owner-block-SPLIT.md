---
title: An unowned declaration is reported as several staged findings
status: active
fact_kind: property_value
subject_key: kibi.check
property_key: staged_blocks_per_unowned_declaration
operator: gt
value_type: int
value_int: 1
tags:
  - negative-path
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T16:50:00.000Z'
id: FACT-NEG-check-staged-owner-block-SPLIT
type: fact
---
The failure side of the rule: one declaration that no requirement owns is printed as separate manifest, impact-evidence, semantic-review and traceability findings.