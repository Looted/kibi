---
id: FACT-LEGACY-MIGRATION-READY-SCOPE
title: Migration previews select complete ready repair batches
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
tags:
  - lane:ontology
  - requirements
  - migration
  - repair
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.migration.legacy_plan
  - complete_dependency_ordered_repair_scope
  - select_only_ready_semantic_inventory_batches
canonical_key: logical_requirement_rule(kibi.migration.legacy_plan,complete_dependency_ordered_repair_scope,select_only_ready_semantic_inventory_batches)
polarity: assert
claim_key: CLAIM-1A7A84D3AE9AAA9B
claim_text: The planner must select only ready semantic_inventory batches from a complete dependency-ordered repair-plan scope
claim_span_start: 117
claim_span_end: 231
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of safe repair-batch selection.
