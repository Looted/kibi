---
title: Predicate participant bindings are short names, not clauses of the claim
status: open
priority: must
tags:
  - modeling
  - predicates
  - bindings
semantic_text: Predicate modeling must leave a participant argument unbound when its value taken from the claim text has more than three words. Predicate modeling must keep a participant argument bound when its value taken from the claim text has at most three words.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6a64de4362d5296c271445fb575492aa8a1726fd65445243f971272a9e706961
semantic_inventory:
  - claim_key: CLAIM-62C58B45D5A1729A
    claim_text: Predicate modeling must leave a participant argument unbound when its value taken from the claim text has more than three words
    role: normative
    span:
      start: 0
      end: 127
    status: modeled
  - claim_key: CLAIM-8E858DE64B082EF4
    claim_text: Predicate modeling must keep a participant argument bound when its value taken from the claim text has at most three words
    role: normative
    span:
      start: 129
      end: 251
    status: modeled
logic_claims:
  - CLAIM-62C58B45D5A1729A
  - CLAIM-8E858DE64B082EF4
origin:
  kind: agent
  recorded_at: '2026-10-08T21:05:30.909Z'
id: REQ-model-predicates-binding-clauses
type: req
---
Predicate modeling must leave a participant argument unbound when its value taken from the claim text has more than three words. Predicate modeling must keep a participant argument bound when its value taken from the claim text has at most three words.

## Context

Round 8 of the external onboarding evaluation received a complete permission_rule candidate whose actor argument held a six-word fragment of the claim, extracted from the text before the modal verb. An entity, actor or resource argument names a participant, so a long clause is not a binding; it stays unbound with a hint, like the name and stop-word placeholders. Requested by the project owner after the evaluation report.

## Source

> Onboarding evaluation round 8, finding K16 item 4: an extracted value longer than three words for an entity or actor argument is not a binding.
