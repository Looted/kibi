---
id: FACT-PRED-A29952A9FDA9
title: Validation correlation requires an exact recent preflight
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/requirements/REQ-kibi-telemetry-acceptance-gate.md
tags: [lane:ontology, telemetry, validation]
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args: [validation_correlation, match_canonical_payload_and_recent_successful_preflight, eligible_upsert]
canonical_key: logical_requirement_rule(validation_correlation,match_canonical_payload_and_recent_successful_preflight,eligible_upsert)
polarity: assert
claim_key: CLAIM-A632F920AC680BA9
claim_text: Validation correlation must match the canonical payload and a successful preflight no more than one hour before the upsert
claim_span_start: 534
claim_span_end: 656
---

Ground representation of payload-bound validation correlation.
