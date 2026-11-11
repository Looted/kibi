---
title: Pattern claims are proved against the pattern Kibi reads from the code
status: open
semantic_text: Kibi must re-evaluate the code's pattern before it accepts a regex certificate. A regex proof must establish that the code's pattern accepts exactly the strings the fact's pattern describes. Kibi must refuse a pattern outside the regular subset of JavaScript and Python with the reason.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 11ca5576296ccb2f7ab0308efac6b908154c2616c16a9df49c3898345aca9296
semantic_inventory:
  - claim_key: CLAIM-2A9980E1B4868577
    claim_text: Kibi must re-evaluate the code's pattern before it accepts a regex certificate
    role: normative
    status: modeled
    span:
      start: 0
      end: 78
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-0F30DA40393E530F
    claim_text: A regex proof must establish that the code's pattern accepts exactly the strings the fact's pattern describes
    role: normative
    status: modeled
    span:
      start: 80
      end: 189
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-AE11D0AF415B97E7
    claim_text: Kibi must refuse a pattern outside the regular subset of JavaScript and Python with the reason
    role: normative
    status: modeled
    span:
      start: 191
      end: 285
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-2A9980E1B4868577
  - CLAIM-0F30DA40393E530F
  - CLAIM-AE11D0AF415B97E7
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"'
  approved_by: maintainer
  recorded_at: '2026-11-04T18:22:39.119Z'
priority: should
firmness: default
required_evidence: tested
tags:
  - proof
  - certificate
  - evidence-levels
id: REQ-kibi-regex-proofs
type: req
---
Kibi must re-evaluate the code's pattern before it accepts a regex certificate. A regex proof must establish that the code's pattern accepts exactly the strings the fact's pattern describes. Kibi must refuse a pattern outside the regular subset of JavaScript and Python with the reason.

## Context

The regex certificate checker compiles both patterns to automata and compares their languages.

Formal proofs reached proved only for set and numeric claims: a set fact through an exhaustive or typecheck certificate, a numeric fact through arithmetic or smt. Claims about decisions, state machines and string formats could only be attested, although most requirements in a product are of that shape. The rule kind model checks a pure function against a rule, predicate or every-member fact over the finite domains the code exports; the state_machine kind reads a transition table or next-state function and checks the transitions, initial, terminal and reachable states a set fact names; the regex kind decides whether the code's pattern accepts exactly the strings a fact's pattern describes. Kibi reads each model from the code itself at ingest, so a certificate re-checks only when it is the code's own model, and every decision is exact: nothing is sampled. String facts gain the matches operator, and typecheck proves required fields of a type.

## Why this changed

Split from REQ-kibi-non-numeric-proof-kinds, which held the rules for three proof kinds. Each child is one kind, with its share of the re-evaluation rule that covered all three.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 2): "Approved"
