---
id: FACT-JOURNALED-ENGINE-SINGLE-WRITER
title: One Node engine owns each workspace and branch
status: active
fact_kind: property_value
subject_key: kibi.engine.journal
property_key: writer_engines_per_workspace_branch
operator: eq
value_type: int
value_int: 1
canonical_key: kibi.engine.journal:writer_engines_per_workspace_branch:eq:1
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
source: packages/cli/src/engine.ts
tags:
  - lane:ontology
  - engine
  - concurrency
claim_key: CLAIM-D1C9836C4BA9898F
claim_text: Kibi MUST run one Node.js 18+ single-writer engine for each canonical workspace and branch
claim_span_start: 0
claim_span_end: 90
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of the branch-local single-writer engine boundary.
