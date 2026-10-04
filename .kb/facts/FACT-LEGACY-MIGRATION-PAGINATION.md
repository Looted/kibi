---
id: FACT-LEGACY-MIGRATION-PAGINATION
title: Migration preview defaults to one deterministic batch
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
source: documentation/facts/FACT-LEGACY-MIGRATION-PAGINATION.md
tags:
  - lane:ontology
  - requirements
  - migration
  - pagination
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.migration.legacy_plan
  - default_pagination
  - one_batch_with_explicit_next_offset
canonical_key: logical_requirement_rule(kibi.migration.legacy_plan,default_pagination,one_batch_with_explicit_next_offset)
polarity: assert
claim_key: CLAIM-7F8A85CA806B465C
claim_text: The default preview must return one requirement batch with deterministic pagination and an explicit next offset
claim_span_start: 907
claim_span_end: 1018
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of bounded deterministic pagination.
