---
title: Rule claims are proved against the predicate tables Kibi reads from the code
status: open
semantic_text: Kibi must re-evaluate the code's predicate tables before it accepts a rule certificate. A rule proof must hold for every assignment of the rule's variables over the finite domains Kibi reads from the code.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c6fbdbe1514d046d6e58e40fbf32bb5448edee33c6f354452f1228be8ab8a40d
semantic_inventory:
  - claim_key: CLAIM-ECCB27F563AA653D
    claim_text: Kibi must re-evaluate the code's predicate tables before it accepts a rule certificate
    role: normative
    status: modeled
    span:
      start: 0
      end: 86
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-E1C279058CF5FCC5
    claim_text: A rule proof must hold for every assignment of the rule's variables over the finite domains Kibi reads from the code
    role: normative
    status: modeled
    span:
      start: 88
      end: 204
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-ECCB27F563AA653D
  - CLAIM-E1C279058CF5FCC5
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:21:58.881Z'
priority: should
firmness: default
required_evidence: tested
tags:
  - proof
  - certificate
  - evidence-levels
id: REQ-kibi-rule-proofs
type: req
---
Kibi must re-evaluate the code's predicate tables before it accepts a rule certificate. A rule proof must hold for every assignment of the rule's variables over the finite domains Kibi reads from the code.

## Context

The rule certificate checker evaluates the predicate tables the code declares.

Formal proofs reached proved only for set and numeric claims: a set fact through an exhaustive or typecheck certificate, a numeric fact through arithmetic or smt. Claims about decisions, state machines and string formats could only be attested, although most requirements in a product are of that shape. The rule kind model checks a pure function against a rule, predicate or every-member fact over the finite domains the code exports; the state_machine kind reads a transition table or next-state function and checks the transitions, initial, terminal and reachable states a set fact names; the regex kind decides whether the code's pattern accepts exactly the strings a fact's pattern describes. Kibi reads each model from the code itself at ingest, so a certificate re-checks only when it is the code's own model, and every decision is exact: nothing is sampled. String facts gain the matches operator, and typecheck proves required fields of a type.

## Why this changed

Split from REQ-kibi-non-numeric-proof-kinds, which held the rules for three proof kinds. Each child is one kind, with its share of the re-evaluation rule that covered all three.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
