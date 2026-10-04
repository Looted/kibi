---
title: Numeric comparisons, strict bounds included, are decided exactly
status: active
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.checks.contradictions
  - numeric_comparison_with_strict_bounds
  - decided_exactly
canonical_key: logical_requirement_rule(kibi.checks.contradictions,numeric_comparison_with_strict_bounds,decided_exactly)
polarity: assert
claim_key: CLAIM-AF9ED781C6092797
claim_text: Contradiction checking must decide numeric comparisons exactly, including strict greater-than and less-than bounds
text_ref: .kb/requirements/REQ-kibi-truthful-consistency.md
tags:
  - lane:ontology
  - truthful-consistency
id: FACT-CONSISTENCY-NUMERIC-EXACT
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
