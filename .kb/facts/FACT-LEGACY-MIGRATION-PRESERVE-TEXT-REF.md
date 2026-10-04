---
id: FACT-LEGACY-MIGRATION-PRESERVE-TEXT-REF
title: Conflicting text references block migration writes
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
source: documentation/facts/FACT-LEGACY-MIGRATION-PRESERVE-TEXT-REF.md
tags:
  - lane:ontology
  - requirements
  - migration
  - evidence
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.migration.legacy_plan
  - differs_from_authored_prose
  - block_preview_application_and_preserve_evidence
canonical_key: logical_requirement_rule(kibi.migration.legacy_plan,differs_from_authored_prose,block_preview_application_and_preserve_evidence)
polarity: assert
claim_key: CLAIM-FA34ACD6A598DD0E
claim_text: An existing text_ref that differs from authored prose must block migration preview application without overwriting the code evidence
claim_span_start: 382
claim_span_end: 514
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of code-evidence preservation.
