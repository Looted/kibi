---
title: Rule, state machine and pattern claims are proved against the model Kibi reads from the code
status: open
priority: should
required_evidence: tested
firmness: default
tags:
  - proof
  - certificate
  - evidence-levels
semantic_text: Kibi must re-evaluate the code's predicate tables, transition relation or pattern before it accepts a rule, state_machine or regex certificate. A rule proof must hold for every assignment of the rule's variables over the finite domains Kibi reads from the code. A state_machine proof must establish exactly the transitions, initial states, terminal states or reachable states a set fact names. A regex proof must establish that the code's pattern accepts exactly the strings the fact's pattern describes. Kibi must refuse a pattern outside the regular subset of JavaScript and Python with the reason.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ae4c37f349066451325ee33ee45f4a1c2a99e697c069a45309ddc5ecaea6b3ea
semantic_inventory:
  - claim_key: CLAIM-A8CF0DAB38939C0B
    claim_text: Kibi must re-evaluate the code's predicate tables, transition relation or pattern before it accepts a rule, state_machine or regex certificate
    role: normative
    status: modeled
    span:
      start: 0
      end: 142
  - claim_key: CLAIM-E1C279058CF5FCC5
    claim_text: A rule proof must hold for every assignment of the rule's variables over the finite domains Kibi reads from the code
    role: normative
    status: modeled
    span:
      start: 144
      end: 260
  - claim_key: CLAIM-720C6C0BB97B89F0
    claim_text: A state_machine proof must establish exactly the transitions, initial states, terminal states or reachable states a set fact names
    role: normative
    status: modeled
    span:
      start: 262
      end: 392
  - claim_key: CLAIM-0F30DA40393E530F
    claim_text: A regex proof must establish that the code's pattern accepts exactly the strings the fact's pattern describes
    role: normative
    status: modeled
    span:
      start: 394
      end: 503
  - claim_key: CLAIM-AE11D0AF415B97E7
    claim_text: Kibi must refuse a pattern outside the regular subset of JavaScript and Python with the reason
    role: normative
    status: modeled
    span:
      start: 505
      end: 599
logic_claims:
  - CLAIM-A8CF0DAB38939C0B
  - CLAIM-E1C279058CF5FCC5
  - CLAIM-720C6C0BB97B89F0
  - CLAIM-0F30DA40393E530F
  - CLAIM-AE11D0AF415B97E7
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T13:45:56.604Z'
id: REQ-kibi-non-numeric-proof-kinds
type: req
semantic_clauses:
  - Kibi must re-evaluate the code's predicate tables, transition relation or pattern before it accepts a rule, state_machine or regex certificate.
  - A rule proof must hold for every assignment of the rule's variables over the finite domains Kibi reads from the code.
  - A state_machine proof must establish exactly the transitions, initial states, terminal states or reachable states a set fact names.
  - A regex proof must establish that the code's pattern accepts exactly the strings the fact's pattern describes.
  - Kibi must refuse a pattern outside the regular subset of JavaScript and Python with the reason.
---
Kibi must re-evaluate the code's predicate tables, transition relation or pattern before it accepts a rule, state_machine or regex certificate. A rule proof must hold for every assignment of the rule's variables over the finite domains Kibi reads from the code. A state_machine proof must establish exactly the transitions, initial states, terminal states or reachable states a set fact names. A regex proof must establish that the code's pattern accepts exactly the strings the fact's pattern describes. Kibi must refuse a pattern outside the regular subset of JavaScript and Python with the reason.

## Context

Formal proofs reached proved only for set and numeric claims: a set fact through an exhaustive or typecheck certificate, a numeric fact through arithmetic or smt. Claims about decisions, state machines and string formats could only be attested, although most requirements in a product are of that shape. The rule kind model checks a pure function against a rule, predicate or every-member fact over the finite domains the code exports; the state_machine kind reads a transition table or next-state function and checks the transitions, initial, terminal and reachable states a set fact names; the regex kind decides whether the code's pattern accepts exactly the strings a fact's pattern describes. Kibi reads each model from the code itself at ingest, so a certificate re-checks only when it is the code's own model, and every decision is exact: nothing is sampled. String facts gain the matches operator, and typecheck proves required fields of a type.

## Source

Asking for proofs beyond numbers: "For the formal proofs, can we do more than numeric checks?" Approving the recommended set: "Ok, implement the reccomended set."
