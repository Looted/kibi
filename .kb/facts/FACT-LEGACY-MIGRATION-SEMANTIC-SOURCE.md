---
id: FACT-LEGACY-MIGRATION-SEMANTIC-SOURCE
title: Semantic prose persists independently from evidence references
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
tags:
  - lane:ontology
  - requirements
  - migration
  - source-binding
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.migration.legacy_plan
  - persisted_in_semantic_text
  - preserve_independent_text_ref
canonical_key: logical_requirement_rule(kibi.migration.legacy_plan,persisted_in_semantic_text,preserve_independent_text_ref)
polarity: assert
claim_key: CLAIM-82F2F30D20875802
claim_text: Authored requirement prose must be persisted in requirement-only semantic_text while an independent text_ref remains unchanged
claim_span_start: 382
claim_span_end: 508
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of independent semantic prose and evidence fields.
