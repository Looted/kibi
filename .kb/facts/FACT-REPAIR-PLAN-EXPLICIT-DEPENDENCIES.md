---
id: FACT-REPAIR-PLAN-EXPLICIT-DEPENDENCIES
title: Downstream repair batches name dependencies
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/facts/FACT-REPAIR-PLAN-EXPLICIT-DEPENDENCIES.md
tags:
  - lane:ontology
  - requirements
  - repair
  - dependencies
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.coverage.repair_plan
  - dependency_declaration
  - explicit
canonical_key: logical_requirement_rule(kibi.coverage.repair_plan,dependency_declaration,explicit)
polarity: assert
claim_key: CLAIM-607ED4AD800C206F
claim_text: every downstream batch must name its dependencies
claim_span_start: 438
claim_span_end: 487
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of explicit downstream dependencies.
