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
semantic_text: Rule, state_machine and regex must each be certificate proof kinds. Kibi must re-evaluate the code's predicate tables, transition relation or pattern before it accepts a rule, state_machine or regex certificate. A rule proof must hold for every assignment of the rule's variables over the finite domains Kibi reads from the code. A state_machine proof must establish exactly the transitions, initial states, terminal states or reachable states a set fact names. A regex proof must establish that the code's pattern accepts exactly the strings the fact's pattern describes. Kibi must refuse a pattern outside the regular subset of JavaScript and Python with the reason.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 91bc5dd656bfa25f2c7bf6995837c943c704f1d9f058920a7568927d7de7428b
semantic_inventory:
  - claim_key: CLAIM-289608FF49F0F9C6
    claim_text: Rule, state_machine and regex must each be certificate proof kinds
    role: normative
    status: modeled
    span:
      start: 0
      end: 66
  - claim_key: CLAIM-A8CF0DAB38939C0B
    claim_text: Kibi must re-evaluate the code's predicate tables, transition relation or pattern before it accepts a rule, state_machine or regex certificate
    role: normative
    status: modeled
    span:
      start: 68
      end: 210
  - claim_key: CLAIM-E1C279058CF5FCC5
    claim_text: A rule proof must hold for every assignment of the rule's variables over the finite domains Kibi reads from the code
    role: normative
    status: modeled
    span:
      start: 212
      end: 328
  - claim_key: CLAIM-720C6C0BB97B89F0
    claim_text: A state_machine proof must establish exactly the transitions, initial states, terminal states or reachable states a set fact names
    role: normative
    status: modeled
    span:
      start: 330
      end: 460
  - claim_key: CLAIM-0F30DA40393E530F
    claim_text: A regex proof must establish that the code's pattern accepts exactly the strings the fact's pattern describes
    role: normative
    status: modeled
    span:
      start: 462
      end: 571
  - claim_key: CLAIM-AE11D0AF415B97E7
    claim_text: Kibi must refuse a pattern outside the regular subset of JavaScript and Python with the reason
    role: normative
    status: modeled
    span:
      start: 573
      end: 667
logic_claims:
  - CLAIM-289608FF49F0F9C6
  - CLAIM-A8CF0DAB38939C0B
  - CLAIM-E1C279058CF5FCC5
  - CLAIM-720C6C0BB97B89F0
  - CLAIM-0F30DA40393E530F
  - CLAIM-AE11D0AF415B97E7
origin:
  kind: agent
  recorded_at: '2026-10-26T09:46:30.041Z'
id: REQ-kibi-non-numeric-proof-kinds
type: req
---
Rule, state_machine and regex must each be certificate proof kinds. Kibi must re-evaluate the code's predicate tables, transition relation or pattern before it accepts a rule, state_machine or regex certificate. A rule proof must hold for every assignment of the rule's variables over the finite domains Kibi reads from the code. A state_machine proof must establish exactly the transitions, initial states, terminal states or reachable states a set fact names. A regex proof must establish that the code's pattern accepts exactly the strings the fact's pattern describes. Kibi must refuse a pattern outside the regular subset of JavaScript and Python with the reason.

## Context

Formal proofs reached proved only for set and numeric claims: a set fact through an exhaustive or typecheck certificate, a numeric fact through arithmetic or smt. Claims about decisions, state machines and string formats could only be attested, although most requirements in a product are of that shape. The rule kind model checks a pure function against a rule, predicate or every-member fact over the finite domains the code exports; the state_machine kind reads a transition table or next-state function and checks the transitions, initial, terminal and reachable states a set fact names; the regex kind decides whether the code's pattern accepts exactly the strings a fact's pattern describes. Kibi reads each model from the code itself at ingest, so a certificate re-checks only when it is the code's own model, and every decision is exact: nothing is sampled. String facts gain the matches operator, and typecheck proves required fields of a type.

## Source

Asking for proofs beyond numbers: "For the formal proofs, can we do more than numeric checks?" Approving the recommended set: "Ok, implement the reccomended set."
