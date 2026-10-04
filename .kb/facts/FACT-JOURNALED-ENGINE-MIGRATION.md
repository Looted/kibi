---
id: FACT-JOURNALED-ENGINE-MIGRATION
title: Legacy migration validates before publication
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
source: packages/cli/src/engine.ts
tags:
  - lane:ontology
  - engine
  - migration
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.engine.journal
  - guarded_staging_migration
  - validate_before_publish
canonical_key: logical_requirement_rule(kibi.engine.journal,guarded_staging_migration,validate_before_publish)
polarity: assert
claim_key: CLAIM-3D88BEFE8838940D
claim_text: Opening a legacy branch MUST perform one guarded migration into a staging generation and verify canonical digests counts audit preservation required fields and relationships before publishing
claim_span_start: 425
claim_span_end: 616
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of guarded legacy migration publication.
