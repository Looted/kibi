---
title: The numeric decision procedure is proved exact in Lean and checked against the shipped code
status: open
required_evidence: tested
priority: should
tags:
  - proof
  - lean
  - contradictions
firmness: default
semantic_text: Kibi must decide whether one-variable numeric comparisons are satisfiable exactly, for real and for integer variables. Kibi must decide that numeric premises entail a comparison exactly when no admissible value satisfies the premises and breaks the comparison. Kibi must keep a Lean 4 model of the interval and integer-range folds whose soundness and completeness proofs build in CI without sorry. The Lean model, intervals.pl and a CLP(Q) and CLP(FD) oracle must agree on every generated differential case.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bccea9691abc41ec63443aec17a181f742c84c644775d967e7e9bb5c2bdf0820
semantic_inventory:
  - claim_key: CLAIM-78AA4F24B55F43BC
    claim_text: Kibi must decide whether one-variable numeric comparisons are satisfiable exactly, for real and for integer variables
    role: normative
    status: modeled
    span:
      start: 0
      end: 117
  - claim_key: CLAIM-56DB85C6D231673E
    claim_text: Kibi must decide that numeric premises entail a comparison exactly when no admissible value satisfies the premises and breaks the comparison
    role: normative
    status: modeled
    span:
      start: 119
      end: 259
  - claim_key: CLAIM-3BDD27B179107027
    claim_text: Kibi must keep a Lean 4 model of the interval and integer-range folds whose soundness and completeness proofs build in CI without sorry
    role: normative
    status: modeled
    span:
      start: 261
      end: 396
  - claim_key: CLAIM-DC6A3FB8B3FD84DF
    claim_text: The Lean model, intervals.pl and a CLP(Q) and CLP(FD) oracle must agree on every generated differential case
    role: normative
    status: modeled
    span:
      start: 398
      end: 506
logic_claims:
  - CLAIM-78AA4F24B55F43BC
  - CLAIM-56DB85C6D231673E
  - CLAIM-3BDD27B179107027
  - CLAIM-DC6A3FB8B3FD84DF
origin:
  kind: agent
  recorded_at: '2026-10-24T20:31:49.266Z'
id: REQ-kibi-intervals-verified
type: req
failure_side_waiver: "The claims are exactness and agreement properties proved in Lean and checked differentially; an unsatisfiable answer is correct output, not a refusal."
failure_side_waiver_approved_by: Piotr Franczyk
---
Kibi must decide whether one-variable numeric comparisons are satisfiable exactly, for real and for integer variables. Kibi must decide that numeric premises entail a comparison exactly when no admissible value satisfies the premises and breaks the comparison. Kibi must keep a Lean 4 model of the interval and integer-range folds whose soundness and completeness proofs build in CI without sorry. The Lean model, intervals.pl and a CLP(Q) and CLP(FD) oracle must agree on every generated differential case.

## Context

Kibi answers whether numeric requirements contradict each other (a limit of at most 30 against a minimum of 31, an integer count strictly between 1 and 2) with intervals.pl, which folds the comparisons on each variable into an interval or an integer range and checks that it is non-empty. An answer of consistent or contradictory is only as trustworthy as that fold, and tests can only sample it. The fold is small enough to prove: the Lean 4 model in proof/lean defines the same folds, and its theorems show they decide satisfiability and entailment exactly over any dense order without endpoints that embeds the integers, which covers the rationals and the reals. The proofs rest on the standard axioms only. A proof about a model says nothing about the shipped code unless the two agree, so a differential run decides generated cases with intervals.pl, the Lean model's executable and an independent CLP(Q) and CLP(FD) oracle and requires all three to match.

## Source

Choosing the remaining formal-proof phases: "I'd like to do all the remaining phases."