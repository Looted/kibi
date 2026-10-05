---
id: FACT-REQ-PROOF-COMPLETE-LEDGER
title: Proven requirements have complete resolved ledgers
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
tags:
  - lane:ontology
  - requirements
  - proof
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.proof.requirement
  - proposition_ledger
  - complete_without_unresolved_assertions
canonical_key: logical_requirement_rule(kibi.proof.requirement,proposition_ledger,complete_without_unresolved_assertions)
polarity: assert
claim_key: CLAIM-FA450AC4EF93F78C
claim_text: A proven requirement must have a complete proposition ledger with no unresolved assertive entries
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of the semantic-inventory completeness gate.
