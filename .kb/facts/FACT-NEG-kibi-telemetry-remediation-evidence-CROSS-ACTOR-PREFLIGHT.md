---
title: An upsert is preceded only by a successful preflight recorded under another actor identifier
status: active
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.telemetry.remediation
  - explicit_session_and_actor
  - must_match_upsert
polarity: deny
canonical_key: logical_requirement_rule(kibi.telemetry.remediation,explicit_session_and_actor,must_match_upsert)
origin:
  kind: agent
  recorded_at: '2026-10-29T21:16:43.694Z'
id: FACT-NEG-kibi-telemetry-remediation-evidence-CROSS-ACTOR-PREFLIGHT
type: fact
---
