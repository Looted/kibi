---
id: FACT-LOGICAL-COVERAGE-POLARITY-CONFLICT
title: Opposite polarity on one ground term is a blocking contradiction
status: active
created_at: 2026-08-04T00:00:00.000Z
updated_at: 2026-08-04T00:00:00.000Z
source: .kb/facts/FACT-LOGICAL-COVERAGE-POLARITY-CONFLICT.md
tags:
  - lane:ontology
  - requirements
  - contradictions
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.checks.contradictions
  - opposite_polarity_same_ground_term
  - blocking_violation
canonical_key: logical_requirement_rule(kibi.checks.contradictions,opposite_polarity_same_ground_term,blocking_violation)
polarity: assert
claim_key: CLAIM-AB495994E2FB1C33
claim_text: Current requirements with opposite polarities over the same ground predicate term must produce a blocking contradiction
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of the generic exact-polarity contradiction invariant.
