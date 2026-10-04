---
id: FACT-REPAIR-PLAN-PAGINATION
title: Paginated repair plans fail closed as partial
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
tags:
  - lane:ontology
  - requirements
  - repair
  - pagination
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.coverage.repair_plan
  - omitted_actionable_requirements
  - partial_with_excluded_count
canonical_key: logical_requirement_rule(kibi.coverage.repair_plan,omitted_actionable_requirements,partial_with_excluded_count)
polarity: assert
claim_key: CLAIM-EF6932ED52025677
claim_text: Pagination that omits actionable requirements must produce a partial plan with the excluded count
claim_span_start: 833
claim_span_end: 930
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of pagination completeness behavior.
