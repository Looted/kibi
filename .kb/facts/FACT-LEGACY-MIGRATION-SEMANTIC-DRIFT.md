---
id: FACT-LEGACY-MIGRATION-SEMANTIC-DRIFT
title: Semantic source drift blocks migration preview application
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
source: documentation/facts/FACT-LEGACY-MIGRATION-SEMANTIC-DRIFT.md
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
  - differs_from_current_authored_markdown
  - block_preview_as_source_drift
canonical_key: logical_requirement_rule(kibi.migration.legacy_plan,differs_from_current_authored_markdown,block_preview_as_source_drift)
polarity: assert
claim_key: CLAIM-9FE58D102925298C
claim_text: An existing semantic_text that differs from current normalized authored Markdown must block preview application as semantic source drift
claim_span_start: 510
claim_span_end: 646
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of semantic source drift protection.
