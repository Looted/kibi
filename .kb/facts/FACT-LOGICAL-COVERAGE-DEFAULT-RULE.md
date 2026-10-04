---
id: FACT-LOGICAL-COVERAGE-DEFAULT-RULE
title: Declared logical manifests are validated by default
status: active
created_at: 2026-08-04T00:00:00.000Z
updated_at: 2026-08-04T00:00:00.000Z
tags:
  - lane:ontology
  - requirements
  - logical-coverage
  - validation
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.logic.coverage
  - default_validation
  - gradual_backfill_without_manifest
canonical_key: logical_requirement_rule(kibi.logic.coverage,default_validation,gradual_backfill_without_manifest)
polarity: assert
claim_key: CLAIM-ECAE7557CD5C48F8
claim_text: The logic-coverage rule must run by default for explicitly manifested requirements while requirements without manifests remain gradual-backfill debt
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of default structural enforcement without forcing incomplete legacy manifests.
