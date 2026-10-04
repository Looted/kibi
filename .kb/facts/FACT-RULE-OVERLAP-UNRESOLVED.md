---
id: FACT-RULE-OVERLAP-UNRESOLVED
title: Unproved rule overlap remains unresolved
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/facts/FACT-RULE-OVERLAP-UNRESOLVED.md
tags:
  - lane:ontology
  - requirements
  - rules
  - contradictions
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.proof.requirement
  - not_proved_or_excluded
  - unresolved_requirement_proof
canonical_key: logical_requirement_rule(kibi.proof.requirement,not_proved_or_excluded,unresolved_requirement_proof)
polarity: assert
claim_key: CLAIM-3D6B9481D6460349
claim_text: Rule overlap that cannot be proved or excluded must remain unresolved in requirement proof
claim_span_start: 310
claim_span_end: 400
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of conservative bounded rule analysis.
