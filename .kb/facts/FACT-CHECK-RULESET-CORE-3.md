---
id: FACT-CHECK-RULESET-CORE-3
title: Core Check Ruleset Has Ten Categories
status: active
created_at: 2026-02-20T14:40:00Z
updated_at: 2026-04-24T08:22:00Z
tags: [validation, rules]
fact_kind: property_value
subject_key: kibi.consistency.checking
property_key: check_rule_count
operator: eq
value_type: int
value_int: 10
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The baseline check rules are must-priority-coverage, no-dangling-refs, and no-cycles.
