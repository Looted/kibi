---
title: Strict pairing accepts a predicate about the constrained subject
status: open
priority: must
tags:
  - check
  - modeling
  - predicates
semantic_text: Strict pairing checks must accept a requirement that constrains a subject fact and requires a predicate fact whose first argument is that subject key.
semantic_clauses:
  - Strict pairing checks must accept a requirement that constrains a subject fact and requires a predicate fact whose first argument is that subject key.
logic_claims:
  - CLAIM-5115545DFB73E4EC
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a19cfaeaceb0cf4d81a7dd74ae4edc46da027a4f629ca0583929888e97d71eb5
semantic_inventory:
  - claim_key: CLAIM-5115545DFB73E4EC
    claim_text: Strict pairing checks must accept a requirement that constrains a subject fact and requires a predicate fact whose first argument is that subject key
    role: normative
    status: modeled
    span:
      start: 0
      end: 149
origin:
  kind: agent
  recorded_at: '2026-10-08T15:34:23.505Z'
id: REQ-check-strict-pairing-predicate-grounding
type: req
---
Strict pairing checks must accept a requirement that constrains a subject fact and requires a predicate fact whose first argument is that subject key.

## Context

After an agent applied a `replace_grounding` plan from `kb_model` mode `predicates` on a test project, `kb_check` reported `strict-req-fact-pairing` on every replaced requirement: the rule only counted a `requires_property` fact as the partner of a `constrains` subject fact, while the replacement plan deliberately removes that link. Following the rule's suggestion would restore the double grounding that `proposition-complete` rejects, so the pairing rule and `proposition-complete` gave opposite advice. The `strict-readiness` migration diagnostic had the same gap and also reported every requirement at every lower level.

## Source

Onboarding evaluation round 7 analysis (2026-10-08), finding K11. The claim is modeled as semantic facts through the strict lane.