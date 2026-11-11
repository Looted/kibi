---
title: Failing usage telemetry turns kb_check into a blocking failure instead of ranked advisory diagnostics
status: active
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.telemetry.acceptance
  - surface_ranked_nonblocking_telemetry_diagnostics
  - quality_diagnostics
polarity: deny
canonical_key: logical_requirement_rule(kibi.telemetry.acceptance,surface_ranked_nonblocking_telemetry_diagnostics,quality_diagnostics)
origin:
  kind: agent
  recorded_at: '2026-11-10T19:30:00.000Z'
id: FACT-NEG-kibi-telemetry-check-diagnostics-BLOCKING
type: fact
---
