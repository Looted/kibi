---
id: FACT-LOGICAL-COVERAGE-STAGED-PREDICATE-FIELDS
title: Staged overlays preserve every typed predicate field
status: active
created_at: 2026-08-04T00:00:00.000Z
updated_at: 2026-08-04T00:00:00.000Z
source: documentation/facts/FACT-LOGICAL-COVERAGE-STAGED-PREDICATE-FIELDS.md
tags:
  - lane:ontology
  - requirements
  - logical-coverage
  - staged-validation
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.cli.check.staged
  - every_typed_predicate_field
  - preserved
canonical_key: logical_requirement_rule(kibi.cli.check.staged,every_typed_predicate_field,preserved)
polarity: assert
claim_key: CLAIM-20FA89A0E6B17C19
claim_text: Staged validation overlays must preserve every typed predicate fact field
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of staged predicate-field fidelity.
