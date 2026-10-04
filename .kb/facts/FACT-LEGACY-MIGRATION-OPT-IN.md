---
id: FACT-LEGACY-MIGRATION-OPT-IN
title: Coverage migration preview is explicit and versioned
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
source: documentation/facts/FACT-LEGACY-MIGRATION-OPT-IN.md
tags:
  - lane:ontology
  - requirements
  - migration
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.coverage.requirement
  - includeMigrationPreview_true
  - versioned_deterministic_legacy_migration_plan
canonical_key: logical_requirement_rule(kibi.coverage.requirement,includeMigrationPreview_true,versioned_deterministic_legacy_migration_plan)
polarity: assert
claim_key: CLAIM-DFB228EE043C9A35
claim_text: Requirement coverage must emit a versioned deterministic legacy migration plan when includeMigrationPreview is true
claim_span_start: 0
claim_span_end: 115
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of opt-in legacy migration preview emission.
