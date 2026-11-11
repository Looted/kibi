---
title: A remediation report built without complete coverage evidence returns an empty event list for the gap
status: active
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.telemetry.remediation
  - remediation_report
  - explicit_report_level_item
polarity: deny
predicate_namespace: kibi.requirements
canonical_key: logical_requirement_rule(kibi.telemetry.remediation,remediation_report,explicit_report_level_item)
origin:
  kind: agent
  recorded_at: '2026-11-05T07:20:00.000Z'
id: FACT-NEG-kibi-telemetry-remediation-evidence-COVERAGE-GAP-DROPPED
type: fact
---
The usage log holds no complete requirement coverage event, and the remediation report leaves the missing proof-gap evidence out instead of listing it.
