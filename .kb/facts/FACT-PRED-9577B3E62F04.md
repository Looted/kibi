---
id: FACT-PRED-9577B3E62F04
title: Advisor correlation is requirement and source bound
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/requirements/REQ-kibi-telemetry-acceptance-gate.md
tags: [lane:ontology, telemetry, semantic-advisor]
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args: [advisor_correlation, match_requirement_source_hash_within_24_hours, eligible_requirement_write]
canonical_key: logical_requirement_rule(advisor_correlation,match_requirement_source_hash_within_24_hours,eligible_requirement_write)
polarity: assert
claim_key: CLAIM-81D951F7E8ADFDDB
claim_text: Advisor correlation must match the requirement and, when both events expose it, the semantic source hash, within 24 hours before the write
claim_span_start: 658
claim_span_end: 796
---

Ground representation of source-bound advisor correlation.
