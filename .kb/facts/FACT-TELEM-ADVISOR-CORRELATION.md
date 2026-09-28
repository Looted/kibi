---
id: FACT-TELEM-ADVISOR-CORRELATION
title: Advisor evidence cannot cross explicit correlation boundaries
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/requirements/REQ-kibi-telemetry-remediation-evidence.md
tags:
  - lane:ontology
  - telemetry
  - advisor
  - correlation
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.telemetry.remediation
  - explicit_session_and_actor
  - must_match_requirement_write
canonical_key: logical_requirement_rule(kibi.telemetry.remediation,explicit_session_and_actor,must_match_requirement_write)
polarity: assert
claim_key: CLAIM-F103B7734DDF4FD9
claim_text: Correlation for advisor evidence must require matching session and actor identifiers when both records expose them
claim_span_start: 325
claim_span_end: 439
type: fact
---

Ground representation of conservative advisor correlation.
