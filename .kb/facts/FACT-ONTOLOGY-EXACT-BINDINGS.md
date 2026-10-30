---
id: FACT-ONTOLOGY-EXACT-BINDINGS
title: Unbound predicate arguments never produce an applicable plan
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
tags:
  - lane:ontology
  - requirements
  - predicates
  - bindings
fact_kind: property_value
subject_key: kibi.modeling.predicates
property_key: unbound_ordered_arguments_in_applicable_plan
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-5D43551AD833A708
claim_text: It must not emit an applicable predicate plan until every ordered argument has an exact binding
claim_span_start: 87
claim_span_end: 182
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of the exact binding gate.
