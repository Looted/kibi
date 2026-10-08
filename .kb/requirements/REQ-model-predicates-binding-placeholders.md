---
title: Predicate bindings that repeat a name or a stop word stay unbound
status: open
priority: must
tags:
  - modeling
  - predicates
  - bindings
semantic_text: Predicate modeling must leave an argument unbound when its binding only repeats an argument name or a stop word. Predicate modeling must list the type and example values of each unbound argument.
semantic_clauses:
  - Predicate modeling must leave an argument unbound when its binding only repeats an argument name or a stop word.
  - Predicate modeling must list the type and example values of each unbound argument.
logic_claims:
  - CLAIM-8E73C114EF014D5E
  - CLAIM-73D2B4426A75A923
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 840c9146140e730261e32f82a760816ba23a803f4a4ad6d246b813bde7f3e553
semantic_inventory:
  - claim_key: CLAIM-8E73C114EF014D5E
    claim_text: Predicate modeling must leave an argument unbound when its binding only repeats an argument name or a stop word
    role: normative
    status: modeled
    span:
      start: 0
      end: 111
  - claim_key: CLAIM-73D2B4426A75A923
    claim_text: Predicate modeling must list the type and example values of each unbound argument
    role: normative
    status: modeled
    span:
      start: 113
      end: 194
origin:
  kind: agent
  recorded_at: '2026-10-08T08:34:26.736Z'
id: REQ-model-predicates-binding-placeholders
type: req
---
Predicate modeling must leave an argument unbound when its binding only repeats an argument name or a stop word. Predicate modeling must list the type and example values of each unbound argument.

## Context

An external agent onboarding a test project passed `before_event: "before_event"`, `after_event: "after_event"` and `action: "be"` as argument bindings and got `binding_status: complete` with a full `replace_grounding` plan; applying it would have written a temporal-order predicate whose two events were the literal argument names. Seven of eleven replacement plans in that run came from such bindings. A value that repeats a field name or is a bare stop word is not a reviewed value, and the `provide_argument_bindings` answer gave the agent nothing but argument names to work from, so it copied them.

## Source

Onboarding evaluation round 6 analysis (2026-10-08), finding K10.