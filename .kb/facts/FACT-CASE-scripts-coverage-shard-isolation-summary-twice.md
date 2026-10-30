---
title: The scripts coverage shard would include the root summary test twice
status: active
fact_kind: property_value
subject_key: kibi.testing.scripts_coverage_shard
property_key: root_summary_inclusions_after_script_tests
operator: eq
value_type: int
value_int: 2
origin:
  kind: agent
  recorded_at: '2026-10-30T15:01:25.354Z'
id: FACT-CASE-scripts-coverage-shard-isolation-summary-twice
type: fact
---
The attempt the shard contract test must catch: test/root-summary.test.ts listed more than once in the scripts shard.