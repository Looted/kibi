---
title: An autonomous agent retries the same mutation target three times in a row and fails each time
status: active
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.telemetry.acceptance
  - fail_after_three_consecutive_target_failures
  - failed_metric
polarity: deny
canonical_key: logical_requirement_rule(kibi.telemetry.acceptance,fail_after_three_consecutive_target_failures,failed_metric)
origin:
  kind: agent
  recorded_at: '2026-10-29T21:16:28.273Z'
id: FACT-NEG-kibi-telemetry-acceptance-gate-v2-REPEATED-FAILURES
type: fact
---
