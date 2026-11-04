---
title: State machine claims are proved against the transition relation Kibi reads from the code
status: open
semantic_text: Kibi must re-evaluate the code's transition relation before it accepts a state_machine certificate. A state_machine proof must establish exactly the transitions, initial states, terminal states or reachable states a set fact names.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 84106457bb9fbcc7d080d85867a777e8c0166fb7987cd5fe5dc486d74f967759
semantic_inventory:
  - claim_key: CLAIM-08F5B8702C5AE6C9
    claim_text: Kibi must re-evaluate the code's transition relation before it accepts a state_machine certificate
    role: normative
    status: modeled
    span:
      start: 0
      end: 98
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-720C6C0BB97B89F0
    claim_text: A state_machine proof must establish exactly the transitions, initial states, terminal states or reachable states a set fact names
    role: normative
    status: modeled
    span:
      start: 100
      end: 230
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-08F5B8702C5AE6C9
  - CLAIM-720C6C0BB97B89F0
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:22:22.640Z'
priority: should
firmness: default
required_evidence: tested
tags:
  - proof
  - certificate
  - evidence-levels
id: REQ-kibi-state-machine-proofs
type: req
---
Kibi must re-evaluate the code's transition relation before it accepts a state_machine certificate. A state_machine proof must establish exactly the transitions, initial states, terminal states or reachable states a set fact names.

## Context

The state machine certificate checker evaluates the transition table the code declares.

Formal proofs reached proved only for set and numeric claims: a set fact through an exhaustive or typecheck certificate, a numeric fact through arithmetic or smt. Claims about decisions, state machines and string formats could only be attested, although most requirements in a product are of that shape. The rule kind model checks a pure function against a rule, predicate or every-member fact over the finite domains the code exports; the state_machine kind reads a transition table or next-state function and checks the transitions, initial, terminal and reachable states a set fact names; the regex kind decides whether the code's pattern accepts exactly the strings a fact's pattern describes. Kibi reads each model from the code itself at ingest, so a certificate re-checks only when it is the code's own model, and every decision is exact: nothing is sampled. String facts gain the matches operator, and typecheck proves required fields of a type.

## Why this changed

Split from REQ-kibi-non-numeric-proof-kinds, which held the rules for three proof kinds. Each child is one kind, with its share of the re-evaluation rule that covered all three.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
