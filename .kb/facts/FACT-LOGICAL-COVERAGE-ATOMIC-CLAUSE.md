---
id: FACT-LOGICAL-COVERAGE-ATOMIC-CLAUSE
title: Every atomic normative clause has a keyed ground fact
status: active
created_at: 2026-08-04T00:00:00.000Z
updated_at: 2026-08-04T00:00:00.000Z
source: documentation/facts/FACT-LOGICAL-COVERAGE-ATOMIC-CLAUSE.md
tags:
  - lane:ontology
  - requirements
  - logical-coverage
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.logic.coverage
  - every_atomic_clause
  - keyed_ground_fact
canonical_key: logical_requirement_rule(kibi.logic.coverage,every_atomic_clause,keyed_ground_fact)
polarity: assert
claim_key: CLAIM-B7EDA6002F1B38E1
claim_text: Every atomic normative clause in a requirement must have a stable claim key and a linked ground property or predicate fact
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of the clause-completeness invariant.
