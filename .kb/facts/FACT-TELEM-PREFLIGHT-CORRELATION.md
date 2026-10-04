---
id: FACT-TELEM-PREFLIGHT-CORRELATION
title: Preflight evidence cannot cross explicit correlation boundaries
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/requirements/REQ-kibi-telemetry-remediation-evidence.md
tags:
  - lane:ontology
  - telemetry
  - validation
  - correlation
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.telemetry.remediation
  - explicit_session_and_actor
  - must_match_upsert
canonical_key: logical_requirement_rule(kibi.telemetry.remediation,explicit_session_and_actor,must_match_upsert)
polarity: assert
claim_key: CLAIM-A5586B623795B679
claim_text: Correlation for preflight evidence must require matching session and actor identifiers when both records expose them
claim_span_start: 441
claim_span_end: 557
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of conservative mutation-preflight correlation.
